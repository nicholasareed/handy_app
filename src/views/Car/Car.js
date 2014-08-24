/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var ModifiedScrollView = require('views/common/ModifiedScrollView');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    // Helpers
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    var _ = require('underscore');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Subviews
    var CarTripListView = require('views/Car/CarTripList');
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var CarModel = require('models/car');
    var ErrorModel = require('models/error');
    var AlertTriggerModel = require('models/alert_trigger');

    var EventHandler = require('famous/core/EventHandler');

    // Side menu of list of options
    var CarSideMenuView      = require('views/Car/CarSideMenu');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Create the mainTransforms for shifting the entire view over on menu open
        this.mainTransform = new Modifier({
            transform: Transform.identity
        });
        this.mainTransitionable = new Transitionable(0);
        this.mainTransform.transformFrom(function() {
            // Called every frame of the animation
            return Transform.translate(this.mainTransitionable.get() * -1, 0, 0);
        }.bind(this));


        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        // create the header
        this.createHeader();

        // create the map/content area
        this.contentScrollView = new ModifiedScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // Pipe edgeHit (bottom) to next_page
        this.contentScrollView.on('edgeHit', function(data){
            var position = parseInt(this.getPosition(), 10);
            if(that.lastEdgeHit == position){
                return;
            }
            that.lastEdgeHit = position;

            // At beginning?
            if(position <= 0){
                return;
            }

            // Probably all good to try and update
            that.CarTripListView.next_page.call(that.CarTripListView);
        });


        // Add (pre)first item (Device Unreachable or Removed)
        this.node_DeviceUnreachable = new RenderNode();
        this.mod_DeviceUnreachable = new StateModifier();
        this.surface_DeviceUnreachable = new Surface({
            content: '<div>Device is Unreachable</div>',
            size: [undefined, undefined],
            classes: ["device-unreachable"],
            properties: {
                color: "white",
                fontWeight: "bold",
                background: "#f68484",
                lineHeight: "40px",
                textAlign: "center"
            }
        });
        this.node_DeviceUnreachable.add(this.mod_DeviceUnreachable).add(this.surface_DeviceUnreachable);
        this.mod_DeviceUnreachable.setOpacity(0);
        this.mod_DeviceUnreachable.setSize([undefined, 0]);

        this.surface_DeviceUnreachable.pipe(this.contentScrollView);
        this.scrollSurfaces.push(this.node_DeviceUnreachable);

        // Add first item (Map Surface)
        this.surfaceMap = new Surface({
            content: '<div id="map-canvas-car-'+this.options.args[0]+'" class="map-canvas"></div>', //<div id="map-canvas-car"></div>
            size: [undefined, 300],
            properties: {
                color: "black",
                background: "white",
                // lineHeight: "50px"
            }
        });
        this.surfaceMap.pipe(this.contentScrollView);

        // Surface Map Button (with Modifier)
        this.surfaceMapButton = new Surface({
            content: '<span class="icon ion-android-location"></span>',
            size: [40, 40],
            properties: {
                backgroundColor: "white",
                border: "1px solid #999",
                color: "#777",
                textAlign: "center",
                lineHeight: "40px",
                fontSize: "28px"

            }
        });
        this.surfaceMapButton.pipe(this._eventInput);
        this.surfaceMapButtonMod = new Modifier({
            transform: Transform.translate(20, 20)
        });

        // Map button event
        this.surfaceMapButton.on('click', function(){
           that.map_focus();
        });
        this.surfaceMapButton.on('doubletap', function(){
           that.map_redraw();
        });

        // Render Cover
        this.MapCoverModifier = new Modifier({
            opacity: 1,
        });
        this.surfaceMapCover = new Surface({
            content: "",
            size: [undefined, 300],
            // classes: ["map-area"],
            properties: {
                backgroundColor: "#444"
            }
        });

        // Create node for holding map and cover
        this.MapNode = new RenderNode();
        this.MapNodeSize = new Modifier({
            size: [undefined, 300]
        });
        this.MapNode = this.MapNode.add(this.MapNodeSize);

        // Add to this.MapNode
        this.MapNode.add(this.surfaceMap);
        this.MapNode.add(this.surfaceMapButtonMod).add(this.surfaceMapButton);
        this.MapNode.add(this.MapCoverModifier).add(this.surfaceMapCover);

        this.scrollSurfaces.push(this.MapNode);


        // Current city name
        // - todo...


        // Quick Stats Grid

        this.quick_stats_grid = new GridLayout({
            dimensions: [3,1]
        });
        this.quick_stats_grid.StateModifier = new StateModifier();

        // Create panel buttons
        // - trips
        // - alerts
        // - errors
        //      - these should all be Views, eventually
        var gridSurfaces = [];

        this.surface_MileCount = new Surface({
            content: "Today Mi. ",
            size: [undefined, undefined],
            properties: {
                lineHeight: "14px",
                textAlign: 'center'
            }
        });

        // Temporary Button Assignment!
        this.surface_MileCount.on('click', function(){
           that.map_focus();
        });
        this.surface_MileCount.on('doubletap', function(){
           that.map_redraw();
        });

        this.surface_MileCount.pipe(this.contentScrollView);
        gridSurfaces.push(this.surface_MileCount);

        this.surface_AlertCount = new Surface({
            content: "Alerts ",
            size: [undefined, undefined],
            properties: {
                lineHeight: "14px",
                textAlign: 'center'
            }
        });
        this.surface_AlertCount.pipe(this.contentScrollView);
        gridSurfaces.push(this.surface_AlertCount);

        this.surface_ErrorCount = new Surface({
            content: "Errors ",
            size: [undefined, undefined],
            properties: {
                lineHeight: "14px",
                textAlign: 'center'
            }
        });
        this.surface_ErrorCount.pipe(this.contentScrollView);
        gridSurfaces.push(this.surface_ErrorCount);

        this.quick_stats_grid.sequenceFrom(gridSurfaces);

        // Add grid layout next
        // - with a Size modifier
        this.gridSizeModRenderNode = new RenderNode();
        this.gridSizeModRenderNode.add(new Modifier({size: [undefined, 50]})).add(this.quick_stats_grid.StateModifier).add(this.quick_stats_grid);
        this.scrollSurfaces.push(this.gridSizeModRenderNode);

        // Add TripList subview of all Trips for this car
        this.CarTripListView = new CarTripListView({
            car_id: this.options.args[0]
        });
        // var renderNode2 = new RenderNode();
        // renderNode2.add(this.CarTripListView);
        // this.contentScrollView.subscribe(this.CarTripListView);
        this.CarTripListView._eventOutput.pipe(this.contentScrollView);

        // // Resequence
        // this.CarTripListView.on('views_updated', function(){
        //     // debugger;
        //     that.contentScrollView.sequenceFrom(that.scrollSurfaces);
        // });

        // // this.CarTripListView actually returns an array of surfaces to pipe!
        // _.each(this.CarTripListView.pushRenderables, function(renderable){
        //     that.scrollSurfaces.push(renderable);
        // });
        // CarTripListView

        this.CarTripListViewNode = new RenderNode();
        this.CarTripListView.StateModifier = new StateModifier();
        this.CarTripListViewNode.add(this.CarTripListView.StateModifier).add(this.CarTripListView);
        this.scrollSurfaces.push(this.CarTripListViewNode);

        // this.scrollSurfaces.push(this.CarTripListView);

        // this.lastScrollSurfaces = this.scrollSurfaces.concat([]);

        // window.setInterval(function(){
        //     if(that.lastScrollSurfaces != that.scrollSurfaces.concat([])){
        //         console.error('RESEQUENCE');
        //         console.log(that.lastScrollSurfaces);
        //         console.log(that.scrollSurfaces.concat([]));
        //         that.contentScrollView.sequenceFrom(that.scrollSurfaces);
        //         that.lastScrollSurfaces = that.scrollSurfaces.concat([]);
        //     }

        // },100);


        // Content
        this.ContentStateModifier = new StateModifier();
        // this.layout.content.add(this.ContentStateModifier).add(Transform.behind).add(this.contentScrollView);

        // Click events
        this.surface_MileCount.on('click',function(e){
            // App.history.navigate('fleet', {trigger: true}); 
        }.bind(this));
        this.surface_AlertCount.on('click',function(e){
            App.history.navigate('alerts/car/' + this.model.get('_id'), {trigger: true}); 
        }.bind(this));
        this.surface_ErrorCount.on('click',function(e){
            App.history.navigate('errors/car/' + this.model.get('_id'), {trigger: true}); 
        }.bind(this));


        // Models

        // Init and prefetch models here

        // Car
        // - should validate that args[0] is an _id! (todo)
        this.model = new CarModel.Car({
            _id: this.options.args[0]
        });
        this.model.fetch({ prefill: true });

        // Errors
        this.error_collection = new ErrorModel.ErrorCollection([],{car_id: this.model.get('_id')});
        this.error_collection.fetch({prefill: true});

        // Alerts/Notifications
        this.alert_collection = new AlertTriggerModel.AlertTriggerCollection([],{
            _id: this.model.get('_id'),
            modelType: 'car'
        });
        this.alert_collection.fetch({prefill: true});

        // Car Summary
        this.model_summary = new CarModel.CarSummary({
            _id: this.options.args[0]
        });
        this.model_summary.fetchSummary({prefill: true});


        // Process data for Models
        // - create listeners

        // Wait for Car model to get data, and then render the map (and listen for changes)
        this.model.populated().then(function(){
            
            that.header.navBar.setContent(that.model.get('name'));

            // Show map?
            that.render_permissions();

            // Actually render the map, if permission is allowed
            if(that.model.get('CarPermission.live_location')){
                that.render_map();
            }

            // Update content of "Device Unreachable" Surface to include "since...."
            if(that.model.get('device_unreachable') === true){
                that.surface_DeviceUnreachable.setContent('<div>Device Unreachable</div><div>Since '+moment(that.model.get('device_unreachable_lastdatapoint')).format('MMM Do h:mma')+'</div>');
            }

            // Wait for any changes
            that.model.on('change', function(model){

                this.header.navBar.setContent(this.model.get('name'));
                
                if(_.intersection(Object.keys(model.changed), ['name','color']).length){
                    console.error('INTERSECTED');
                    console.log(model.get('name'));
                    that.render_map(model);
                } else {
                    that.map_update_car(model);
                }


            }, that);

            that.model.on('change:device_unreachable', function(model){
                if(model.get('device_unreachable') === true){

                    // Update setContent
                    that.surface_DeviceUnreachable.setContent('<div>Device Unreachable</div><div>Since '+moment(model.get('device_unreachable_lastdatapoint')).format('MMM Do h:mma')+'</div>');

                    this.mod_DeviceUnreachable.setSize([undefined,80]);
                    this.mod_DeviceUnreachable.setOpacity(1);
                } else {
                    this.mod_DeviceUnreachable.setSize([undefined,0]);
                    this.mod_DeviceUnreachable.setOpacity(0);
                }
                this.contentScrollView.sequenceFrom(this.scrollSurfaces);
            }, that);

            // that.model.on('change:name', function(model){
            //     this.header.setContent(this.model.get('name'));
                
            //     // that.render_map(model);
            // }, that);
            // that.model.on('change:color', function(model){
            //     that.render_map(model);
            // });
        });

        // Fleet day summary
        // - miles driven today
        this.model_summary.populated().then(function(){

            that.update_counts();
            that.model_summary.on('change', that.update_counts, that);
        });


        // Error Counts
        this.error_collection.on("sync", function(collection){
            // Update
            that.update_counts();
        }, this);
        // this.error_collection.fetch({prefill: true});


        // Alerts/Notifications (unread)
        this.totalAlerts = 0;
        this.alert_collection.on("sync", function(){
            this.totalAlerts = 0;
            this.totalAlerts = _.reduce(_.map(this.alert_collection.toJSON(), function(model){
                return model.alert_count_unread;
            }), function(memo, num){
                return memo + num;
            });
            
            this.update_counts();

        }, this);


        // Create the CarList menu that swings out
        // - needs model
        this.sideView = new CarSideMenuView({
            model: this.model
        });
        this.sideView.OpacityModifier = new StateModifier();
        

        // Tie the sideView and the main body together (why the fuck are we doing it like this?)
        // - this means the origin of the SideView is at the top-left of the ContentBody, no the topLeft of the page (like I kinda expect)
        this.mainNode = new RenderNode();
        this.mainNode.add(this.ContentStateModifier).add(this.contentScrollView);
        this.mainNode.add(this.sideView);

        this.sideView._eventOutput.on("menuToggle", (function(){
            this.menuToggle();
        }).bind(this));
        
        this.layout.content.add(Transform.behind).add(this.mainNode);

        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.mainTransform).add(this.layout);


        // // Fetch models
        // // - should validate that args[0] is an _id! (todo)
        // this.model = new DriverModel.Driver({_id: this.options.args[0]});
        // this.model.on("reset change", function(Model){
        //     this.surface_DriverInfo.setContent(Model.get('name'));
        // }, this);
        // // Fetch the Driver Model
        // this.model.fetch({ prefill: true, cache: true });

        // // Attach the main transform and the comboNode to the renderTree
        // this.add(this.layout);

        // Global events
        // - redraw the map when I move
        App.Events.on('updated_user_current_location', this.map_update_person.bind(this));

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        this.header = new StandardHeader({
            content: "",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: '<span class="icon ion-navicon-round"></span>'
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header._eventOutput.on('more',function(){
            // if(that.model.get('CarPermission.coowner')){
            //     App.history.navigate('car/permission/' + that.model.get('_id'), {trigger: true});
            // }
            that.menuToggle();
        });
        this.header.navBar.title.on('click', function(){
            // that.CarTripListView.collection.requestNextPage();
            // App.history.navigate('car/permission/' + that.model.get('_id'), {trigger: true});
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })
        
        this.layout.header.add(this.header);

    };

    PageView.prototype.refreshData = function() {
        Utils.Notification.Toast('Refreshing');
        try {
            this.model.fetch();
            this.error_collection.fetch();
            this.alert_collection.fetch();
            this.CarTripListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.render_permissions = function(){
        var that = this;

        // Sometimes CarPermission won't be set immediately
        // - make sure it exists before showing/hiding elements on the page
        if(!this.model.get('CarPermission')){
            return;
        }

        // Read the model
        if(this.model.get('CarPermission.live_location') && 1===0){ // NEVER!
            // this.surfaceMap.setContent('Map should be displayed');
            // Make sure it exists in the Sequence (in the right place)
            if(this.scrollSurfaces.indexOf(this.MapNode) === -1){
                // does not exist in list, which it should
                this.scrollSurfaces.unshift(this.MapNode);
                // todo: render the map, and keep it updated if it is not already being updated
            }
        } else {
            // Remove it from the sequence of views (nicely?)
            if(this.scrollSurfaces.indexOf(this.MapNode) !== -1){
                // does exist, remove it
                this.scrollSurfaces = _.without(this.scrollSurfaces, this.MapNode);
                this.contentScrollView.sequenceFrom(this.scrollSurfaces)
            }
        }

        // coowner
        // - most of the stats
        if(this.model.get('CarPermission.coowner')){
            // Make sure it exists in the Sequence (in the right place)
            if(this.scrollSurfaces.indexOf(this.gridSizeModRenderNode) === -1){
                // does not exist in list
                this.scrollSurfaces.unshift(this.gridSizeModRenderNode);
            }

            // // Show Permissions
            // this.header.more.setContent('Perm');

            // Show if device unreachable
            if(this.model.get('device_unreachable') === true){
                this.mod_DeviceUnreachable.setSize([undefined,80]);
                this.mod_DeviceUnreachable.setOpacity(1);
            } else {
                this.mod_DeviceUnreachable.setSize([undefined,0]);
                this.mod_DeviceUnreachable.setOpacity(0);
            }
            this.contentScrollView.sequenceFrom(this.scrollSurfaces);


        } else {
            // Remove it from the sequence of views (nicely?)
            if(this.scrollSurfaces.indexOf(this.gridSizeModRenderNode) !== -1){
                // does exist, remove it
                this.scrollSurfaces = _.without(this.scrollSurfaces, this.gridSizeModRenderNode);
                this.contentScrollView.sequenceFrom(this.scrollSurfaces)
            }
        }
    };


    PageView.prototype.render_map = function() {
        var that = this;

        var model = this.model;

        // Make sure element exists
        if($('#map-canvas-car-'+this.model.get('_id')).length < 1){
            window.setTimeout(this.render_map.bind(this), 100);
            return;
        }

        if(this.map_rendered !== true){

            // // Start listening for touchmove events
            // document.getElementById('map-canvas-car-'+that.model.get('_id')).addEventListener('touchmove', function(){
            //     if(!App.Cache.touchmove){
            //         App.Cache.touchmove = 0;
            //     }
            //     App.Cache.touchmove += 1;

            //     window.setTimeout(function(){
            //         App.Cache.touchmove -= 1;
            //     },100);
            // }, true);
        }

        try {
            this.fleet_map = Utils.getGoogleMapsGetMapForFleet(this._eventInput, this.fleet_map, document.getElementById('map-canvas-car-'+that.model.get('_id')), [this.model.toJSON()]);

            // var x = document.getElementById('map-canvas-fleet');
            // console.log(x);
            // console.log($(x).width());
            // console.log($(x).height());

            // console.log(this.fleet_map);
            // debugger;

            // Cars without data points?
            // - shouldn't we handle this higher up?
            if(this.fleet_map === 'no_cars_with_datapoints'){
                this.fleet_map = null;
                throw Exception;
            }
        }catch(err){
            // Failed creating map
            // - just see if they are missing the lastWaypoint
            
            return;
        }

        // Get bounds after map has loaded
        if(this.map_rendered !== true){

            this.fleet_map.Events.once('load', function() {

                // Remove Map Hider
                that.MapCoverModifier.setOpacity(0, {duration: 500}, function(){
                    that.MapCoverModifier.setSize([1,1]);
                });

                // google.maps.event.removeListener(original_bounds);
                that.fleet_map_original_zoom = that.fleet_map.getZoom();
                that.fleet_map_original_bounds = that.fleet_map.getBounds();
                console.log('got bounds');
            });

            // try {
            //     var original_bounds = google.maps.event.addListener(this.fleet_map, 'idle', function() {

            //         // Remove Map Cover
            //         that.MapCoverModifier.setOpacity(0, {duration: 500}, function(){
            //             that.MapCoverModifier.setSize([1,1]);
            //         });

            //         google.maps.event.removeListener(original_bounds);
            //         that.fleet_map_original_zoom = that.fleet_map.getZoom();
            //         that.fleet_map_original_bounds = that.fleet_map.getBounds();
            //         console.log('got bounds');
            //     });
            // } catch(err){
            //     console.error(err);
            // }
        }

        // Mark as rendered this map
        this.map_rendered = true;

        return this;
    };

    PageView.prototype.map_update_person = function(){
        // Update the position of the mobile user on the map
        // - without Centering or fitBounds
        var that = this;

        // fleet_map created?
        if(!this.fleet_map){
            return;
        }

        var marker = _.findWhere(this.fleet_map.markerList, {me_marker : true});

        if(!marker){
            console.log('did not find me_marker');
            return false;
        }

        // Update marker's position
        // - animate it to a new position
        try {
            var latLng = [App.Cache.geolocation_coords.latitude, App.Cache.geolocation_coords.longitude];

            // Update marker with car's new location
            // console.log('setting new position');
            // console.log(latLng);
            // console.log(marker);
            Utils.animateMarker(marker, latLng);
            // marker.setPosition(latLng);

        } catch(err){
            console.error('Failed updating GPS coords for me_marker');
            console.error(err);
        }

    };

    PageView.prototype.map_update_car = function(carModel){
        // Update the position of the cars on the map
        // - without Centering or fitBounds
        // - if no cars are visible in the map, then do fitBounds?
        var that = this;

        // fleet_map created?
        if(!this.fleet_map || !carModel){
            return;
        }

        var marker = _.findWhere(this.fleet_map.markerList, {car_id : carModel.get('_id')});

        if(!marker){
            console.log('did not find marker');
            return false;
        }

        var Car = carModel.toJSON();

        // Update marker's position
        // - animate it to a new position
        try {
            var gps_position = Car.latest_data.lastWaypoint,
                latLng = [gps_position.latitude, gps_position.longitude];

            // Update marker with car's new location
            // console.log('setting new position');
            // console.log(latLng);
            // console.log(marker);
            Utils.animateMarker(marker, latLng);
            // marker.setPosition(latLng);

        } catch(err){
            console.error('Failed updating GPS coords for car');
            console.error(err);
        }

    };

    PageView.prototype.map_focus = function(){
        // Determines if any cars are in the viewport
        // - if not, redraw
        var that = this;

        if(!this.fleet_map){
            return;
        }

        var inView = false;
        _.each(this.fleet_map.markerList, function(marker){
            if(that.fleet_map.getBounds().contains(marker.getLatLng())){
                inView = true;
            }
        });

        if(inView == false){
            // None in view, redraw
            this.map_redraw();
        }

        // Also trigger a data refresh
        this.refreshData();

    };

    PageView.prototype.map_redraw = function(ev){
        // Re-center and re-focus the map on the existing points
        // - also does a refresh_data
        var that = this;

        if(!this.fleet_map){
            return;
        }

        // console.log(this.fleet_map_original_zoom);

        var bounds = [];
        _.each(this.fleet_map.markerList, function(marker){
            bounds.push(marker.getLatLng());
        });

        // Set bounds and zoom
        this.fleet_map.fitBounds(bounds, {
            maxZoom: 18,
            padding: [20,20]
        });

    };


    PageView.prototype.render_geocoded = function(){
        // Reverse geocode location
        var that = this;


        return;


        // Reverse geocode location
        // if(App.Data.usePg){
        var dist = null;
        try {
            var latlng = this.model.get('latest_data').lastWaypoint,
                lat = latlng.latitude,
                lon = latlng.longitude,
                latlngString = lat.toString() + ',' + lon.toString();


            try {
                var homelatlng = this.model.get('home_gps'),
                    homelat = homelatlng.latitude,
                    homelon = homelatlng.longitude,
                    homelatlngString = homelat.toString() + ',' + homelon.toString();

                dist = Utils.haversine(homelat, lat, homelon, lon);
            } catch(err){
                dist = 10000;
            }

        } catch(err){
            console.log(err);
        }

        if(dist !== null && App.Data.usePg){
            // error

            if(dist > 0.05){
                // Not at home

                // At home?
                // - within .05 kilometers = 164 feet
                $.ajax({
                    url: 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' +latlngString+ '&sensor=false',
                    headers: {},
                    cache: true,
                    success: function(result){
                        // console.info('maps results');
                        // console.log(result);
                        // console.log(JSON.stringify(result));
                        // alert($.trim(result.results[0].formatted_address));
                        that.$('.city_name .aname').text($.trim(result.results[2].formatted_address).split(',')[0]);
                        that.$('.city_name').removeClass('nodisplay');
                    }
                });
            } else {
                that.$('.city_name .aname').text('Home');
                that.$('.city_name').removeClass('nodisplay');
            }
        }


        return this;

    };

    PageView.prototype.update_counts = function() {
        // Update numbers
        // - alerts, errors
        // - reset classes (add blue-bg if > 0)

        // Daily mileage
        // - just faking this one!
        this.surface_MileCount.setContent('<div>Today Mi.</div><div>' + Utils.toFixedOrNone(this.model_summary.get('miles'),1) + '</div>');
        // this.surface_MileCount.setContent('<div>Today Mi.</div><div>' + '11.7' + '</div>');
        var mClasses = ['quick-stats'];
        this.surface_MileCount.setClasses(mClasses);

        // Alerts
        this.surface_AlertCount.setContent('<div>Alerts</div><div>' + this.totalAlerts + '</div>');
        var aClasses = this.totalAlerts ? ['quick-stats','red-bg'] : ['quick-stats'];
        this.surface_AlertCount.setClasses(aClasses);

        // Errors
        // console.log(this.error_collection);
        this.surface_ErrorCount.setContent('<div>Errors</div><div>' + this.error_collection.length + '</div>');
        var eClasses = this.error_collection.length ? ['quick-stats','red-bg'] : ['quick-stats'];
        this.surface_ErrorCount.setClasses(eClasses);

    };
        
    PageView.prototype.menuToggle = function() {
        console.log("menuToggle'ing");
        if (!this.sideView.open) {
            console.log('opening');
            this.mainTransitionable.set(200, { duration: 250, curve: 'easeOut' });
            this.sideView.flipOut();
        } else {
            console.log('closing');
            this.mainTransitionable.set(0, { duration: 250, curve: 'easeOut' });
            this.sideView.flipIn();
        }
        this.sideView.open = !this.sideView.open;
    };


    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':

                // Make sure sideView closes
                if (this.sideView.open) {
                    this.menuToggle();
                } 

                switch(otherViewName){
                    case 'Fleet':

                        // No animation by default
                        transitionOptions.outTransform = Transform.identity;

                        // Move the content to the left
                        // - not the footer
                        window.setTimeout(function(){

                            // Hide the sideView
                            that.sideView.OpacityModifier.setOpacity(0);

                            // Hide content from a direction
                            // if(goingBack){

                            that.ContentStateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);
                            // } else {
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);
                            // }

                        }, delayShowing);

                        break;

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;


                        window.setTimeout(function(){

                            // Hide the sideView
                            that.sideView.OpacityModifier.setOpacity(0);

                            // Slide left
                            that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;

            case 'showing':
                if(this._refreshData){
                    window.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // SideView must be visible
                        that.sideView.OpacityModifier.setOpacity(1);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.ContentStateModifier.setTransform(Transform.translate(0, 0, 0));
                        that.quick_stats_grid.StateModifier.setTransform(Transform.translate(0, -50, 0));
                        that.CarTripListView.StateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        // Move the content to final place
                        // - not the footer
                        // - with a "Content Delay" (waiting until the other "content" is removed before transitioning this one in)
                        window.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                            that.quick_stats_grid.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                            that.CarTripListView.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);

                        // //Fade out the header
                        // // var previousTransform = transitionOptions.outTransform;
                        // transitionOptions.outTransform = Transform.identity;

                        // // Move the content to the left
                        // // - not the footer
                        // // console.log(transitionOptions.outTransform);
                        // // debugger;
                        // window.setTimeout(function(){

                        //     // Bring map content back
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        //     // Bring Footer Up
                        //     that.layout.footer.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.outTransition);

                        // }, delayShowing);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
        },
        footer: {
            size: [0,0]
        },
        content: {
            size: [undefined, undefined],
            inTransition: true,
            outTransition: true,
            overlap: true
        }
    };

    module.exports = PageView;

});

