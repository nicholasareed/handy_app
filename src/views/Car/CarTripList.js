/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var RenderController = require('famous/views/RenderController');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Backbone = require('backbone-adapter');
    var TripModel = require("models/trip");

    var Utils = require('lib2/utils');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/CarTripList.html');
    var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        console.log('CarTripList Options');
        console.log(options);

        // RenderController to switch between states of Loading / No Results
        this.lightbox = new RenderController({
            // showOrigin: [0.5, 0]
        });

        // Create Loading Renderable
        this.loadingSurface = new Surface({
            content: "Loading Trips",
            size: [undefined, 100],
            properties: {
                color: "black",
                backgroundColor: "#F8F8F8",
                textAlign: "center"
            }
        });
        // Create "No Results" Renderable
        this.emptyListSurface = new Surface({
            content: "No trips to show!",
            size: [undefined, 100],
            properties: {
                color: "black",
                backgroundColor: "#F8F8F8",
                textAlign: "center"
            }
        });

        // Show the Loading by default
        this.lightbox.show(this.loadingSurface);

        // Create LightboxButtons for Render Infinity Buttons (refreshing, etc.)
        this.lightboxButtons = new RenderController({
            // showOrigin: [0.5, 0]
        });

        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            properties: {
                color: "black",
                backgroundColor: "#F8F8F8",
                textAlign: "center",
                lineHeight: "50px"
            }
        });

        // Loaded 'em all!
        // - shows "X total trips"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            properties: {
                color: "blue",
                backgroundColor: "#F8F8F8",
                textAlign: "center",
                lineHeight: "50px"
            }
        });

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            properties: {
                color: "black",
                backgroundColor: "white",
                fontStyle: "italic",
                textAlign: "center",
                lineHeight: "50px"
            }
        });
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });

        // Add to view
        // this.add(this.lightboxButtons);

        // Show loading surface
        this.lightboxButtons.show(this.infinityLoadingSurface);

        // Models

        // Trip List
        this.collection = new TripModel.TripCollection([], {
            car_id: options.car_id
        });
        this.collection.infiniteResults = 0;
        this.collection.on("sync", this.updateCollectionStatus.bind(this));
        this.collection.on("add", this.addOne, this);
        this.collection.on("error", function(){
            console.error('Collection error');
            // // Already fetched successfully?
            // if(this.collection.hasFetched){
            //     Utils.Notification.Toast('Error when updating');
            // } else {
            //     Utils.Notification.Toast('Attempting to reload trips');
            //     this.collection.pager({reset: true});
            // }
        });
        this.collection.on("cachesync", function(){
        });
        this.collection.on("request", function(){
            // we should try to ignore the first one, otherwise it overwrites the "Building Dashboard" one...
            // Utils.Notification.Toast('Making request');
        });

        this.collection.pager({prefill: true});

        this.layout = new SequentialLayout({
            // size: [undefined, 300]
        });

        this.tripLayout = new SequentialLayout({
            // size: [undefined, 300]
        });
        this.tripSurfaces = [];

        // Sequence main layout from the trip surfaces, and the buttons
        this.layout.sequenceFrom([
            this.tripLayout, // another SequentialLayout
            this.lightboxButtons
        ]);

        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error

        // this.add(this.layoutSizeMod).add(this.layout); 
        this.add(this.layout);

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;

    SubView.prototype.addOne = function(Trip) { 
        var that = this;
        TripIndex = this.tripSurfaces.length;

        // increase infinity results
        this.collection.infiniteResults += 1;

        // Add a header if date changes
        var thisTripDatetime = moment(Trip.get('start_time'));
        if(this.lastTripDate != thisTripDatetime.format('L')){
            this.lastTripDate = thisTripDatetime.format('L');

            // Add header
            var headerSurface = new Surface({
                content: Utils.displayTripListDate(Trip.get('start_time')),
                size: [undefined, 40],
                properties: {
                    lineHeight: "40px",
                    backgroundColor: "#f8f8f8",
                    color: "#222",
                    fontWeight: "bold",
                    padding: "0 8px"
                }
            });
            headerSurface.pipe(this._eventOutput);
            this.tripSurfaces.push(headerSurface);
        }

        var tripContent = function(){
            var tmp = Trip.attributes.miles + "mi | " + Utils.displayTripListTime(Trip.attributes.start_time) + " - " + Utils.displayTripListTime(Trip.attributes.end_time);

            var trip = _.map([Trip.toJSON()],function(trip){
                // modify addresses
                var tmp = [],
                    ignore = [
                        'USA','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
                    ];

                var start_gps_address = trip.start_gps_address,
                    end_gps_address = trip.end_gps_address;

                // Get the correctly formatted address
                if(trip.start_gps_addresses_formatted && trip.start_gps_addresses_formatted.length > 2){
                    start_gps_address = trip.start_gps_addresses_formatted[2];
                }

                if(start_gps_address){
                    tmp = start_gps_address.split(',');
                    tmp = _.filter(tmp,function(t){
                        // console.log(t);
                        if(ignore.indexOf($.trim(t.toUpperCase())) !== -1){
                            // found it
                            return false;
                        }
                        return true;
                    });
                    trip.start_gps_address = tmp.join(',');
                }


                if(trip.end_gps_addresses_formatted && trip.end_gps_addresses_formatted.length > 2){
                    end_gps_address = trip.end_gps_addresses_formatted[2];
                }

                if(end_gps_address){
                    tmp = end_gps_address.split(',');
                    tmp = _.filter(tmp,function(t){
                        // console.log(t);
                        if(ignore.indexOf($.trim(t.toUpperCase())) !== -1){
                            // found it
                            return false;
                        }
                        return true;
                    });
                    trip.end_gps_address = tmp.join(',');
                }

                return trip;

            })[0];

            return template({
                model_type: that.collection.options.car_id ? 'car' : 'driver',
                model_id: that.collection.options.car_id ? that.collection.options.car_id : that.collection.options.driver_id,
                paginator: {
                    currentPage: that.collection.currentPage + 1,
                    firstPage: that.collection.firstPage,
                    totalPages: that.collection.totalPages,
                    totalResults: that.collection.totalResults
                },
                trip: trip
            });

            return tmp;
        };

        var tripSurface = new Surface({
            size: [undefined, 100],
            content: tripContent(),
            properties: {
                // color: "white",
                // backgroundColor: "hsl(" + ((TripIndex + 21) * 360 / 40) + ", 100%, 50%)",
                // backgroundColor: "#f8dd22"
                borderBottom: "1px solid #eee",
                backgroundColor: "white",
                overflow: "hidden"
            }
        });
        tripSurface.Model = Trip;
        Utils.dataModelReplaceOnSurface(tripSurface);
        Trip.on('change', function(){
            tripSurface.setContent(tripContent());
            Utils.dataModelReplaceOnSurface(tripSurface);
        }, this);
        tripSurface.pipe(this._eventOutput);
        tripSurface.on('click', function(){
            App.history.navigate('trip/' + Trip.get('_id'), {trigger: true});
        });

        // Adding to the back or the front?
        // - need to resort the list according to....something
        // - first, detect if this addOne is creater than that the current last one?
        this.tripSurfaces.push(tripSurface);

        // Sequence one time
        if(!this.tripLayout.isSeq){
            this.tripLayout.isSeq = true;
            this.tripLayout.sequenceFrom(this.tripSurfaces);
        }

    };

    SubView.prototype.updateCollectionStatus = function() { 


        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent('Show More (' + amount_left + ')');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total Trips');

        // this.$('.next-page').text('Show More (' + amount_left + ')');

        if(this.collection.totalResults){
            this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total Trips');
            // this.$('.loaded-all').text(this.collection.totalResults + ' Total Trips');
        }

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.layout;
        }

        if(nextRenderable != this.lightbox.lastRenderable){
            this.lightbox.lastRenderable = nextRenderable;
            this.lightbox.show(nextRenderable);
        }

        // // Update sizes
        // console.log(this.lightbox.getSize());
        // console.log(this.collection.infiniteResults);
        // this.layoutSizeMod.setSize(this.collection.infiniteResults * 120);
        // debugger;


        // // Resort the tripSurfaces
        // this.tripSurfaces = _.sortBy(this.tripSurfaces, function(surface){
        //     var m = moment(surface.Model.get('start_time'));
        //     return m.format('X') * -1;
        // });

        // Re-sequence
        if(this.tripSurfaces.length > 0){
            this.tripLayout.sequenceFrom(this.tripSurfaces);
        }

        // Show correct infinity buttons (More, All, etc.)
        this.render_infinity_buttons();

        // this.layoutSizeMod

        // // Update the Parent view
        // this._eventOutput.trigger('views_updated');

    };

    SubView.prototype.render_infinity_buttons = function(){
        // Renders the correct infinity-list buttons (the "Show More" or "Is loading" button/hint) at the bottom of the page

        // // Hide all dat shit
        // // - unnecessary?
        // this.$('.load-list').addClass('nodisplay');

        if(this.collection.hasFetched){
            // at the end?
            if(this.collection.infiniteResults == this.collection.totalResults){
                this.lightboxButtons.show(this.infinityLoadedAllSurface);
                // this.$('.loaded-all').removeClass('nodisplay');
            } else {
                // Show more
                // - also includes the number more to show :)
                this.lightboxButtons.show(this.infinityShowMoreSurface);
                // this.$('.show-more').removeClass('nodisplay');
            }
        } else {
            // not yet fetched, so display the "loading" one
            this.lightboxButtons.show(this.infinityLoadingSurface);
            // this.$('.loading-progress').removeClass('nodisplay');
        }

    };

    SubView.prototype.next_page = function(){
        // Load more trips
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;
        
        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
        return false;
    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
