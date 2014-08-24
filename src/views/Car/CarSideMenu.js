define(function(require, exports, module) {
    // Famous Modules
    var Surface    = require('famous/core/Surface');
    var Modifier   = require('famous/core/Modifier');
    var Transform  = require('famous/core/Transform');
    var View       = require('famous/core/View');
    var GridLayout = require('famous/views/GridLayout');

    var ScrollView = require('famous/views/Scrollview');

    var EventHandler = require('famous/core/EventHandler');
    var DriverModel    = require('models/driver');

    function SideView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        if(this.options.model){
            this.model = this.options.model;
        }

        this.open = false;

        // Background surface
        this.bgSurface = new Surface({
            size: [undefined, undefined],
            content: "",
            properties: {
                backgroundColor: "white",
                zIndex: "-1"
            }
        });
        this.bgSurface.on('swipe', (function(){
            this._eventOutput.emit("menuToggle");
        }).bind(this));
        this.bgSurface.on('click', (function(){
            this._eventOutput.emit("menuToggle");
        }).bind(this));

        this.hinge = new Modifier({
            transform: Transform.thenMove(Transform.identity, [window.innerWidth + 100, 0, 0]) // rotateY(-Math.PI/2.5)
        });

        // Create ScrollView
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];
        this.modelSurfaces = {};
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);


        // Surfaces
        this.model.populated().then(function(){
            that.updateSurfaces();
            that.model.on('change', that.updateSurfaces.bind(that));
        });

        // Add modifiers
        var hingeNode = this._add(new Modifier({size : [200, undefined]})).add(new Modifier({origin : [0,0]})).add(this.hinge)
        hingeNode.add(this.bgSurface);
        hingeNode.add(this.contentScrollView);

    }

    SideView.prototype = Object.create(View.prototype);
    SideView.prototype.constructor = SideView;

    SideView.prototype.refreshData = function(Model) { 
        
    };

    SideView.prototype.updateSurfaces = function() {
        var that = this;

        this.scrollSurfaces = [];

        var menuOptions = [];

        // coowner
        // - most of the stats
        if(this.model.get('CarPermission.coowner')){
            // Make sure it exists in the Sequence (in the right place)

            menuOptions.push({
                title: 'Change Driver',
                special: 'driver'
            });

            menuOptions.push({
                title: 'Permissions',
                href: 'car/permission/' + that.model.get('_id')
            });

            menuOptions.push({
                title: 'Name and Color',
                href: 'car/edit/' + that.model.get('_id')
            });

        }

        menuOptions.forEach(function(menuOption){
            var surface = new Surface({
                content: menuOption.title,
                size: [undefined, 50],
                classes: ["car-menu-list-item"],
                properties: {
                    padding: '5px',
                    lineHeight: "50px",
                    borderBottom: '1px solid #ddd'
                }
            });
            surface.MenuOption = menuOption;
            surface.on('click', function(){
                // alert('clicked!');
                // alert(this.Setting.href);
                that._eventOutput.emit("menuToggle");
                if(this.MenuOption.special === 'driver'){
                    that.change_driver();
                } else {
                    App.history.navigate(this.MenuOption.href, {trigger: true});
                }
            });
            that.scrollSurfaces.push(surface);
        });

        // Resequence
        this.contentScrollView.sequenceFrom(that.scrollSurfaces);

    };

    SideView.prototype.change_driver = function(){
        var that = this;

        // Slide to the change screen for the driver
        that.previousPage = window.location.hash;

        // Slide page
        App.Cache.DriverSelectOptions = {
            selected_drivers: this.model.get('riders') ? this.model.get('riders') : [],
            on_choose: that.driver_changed.bind(this),
            on_cancel: that.driver_canceled.bind(this),
            title: 'Choose Driver',
            back_to_default_hint: false,
            car_id: this.model.get('_id')
        };

        // Change history (must)
        App.history.navigate('driverselect', {trigger: true});

        return false;
    };

    SideView.prototype.driver_canceled = function(ev){
        var that = this;
        // App.slider.slidePage(App.slider.lastPage);
        App.history.navigate(that.previousPage, {trigger: true});
    };

    SideView.prototype.driver_changed = function(selected_drivers_list){
        var that = this;

        // Expected to have at least 1 driver
        // - this is a completed trip, so who actually drove (must be SOMEBODY)
        if(selected_drivers_list.length > 0){
            that.model.save({'driver_id' : selected_drivers_list[0]._id, 'riders' : selected_drivers_list}, {patch: true})
                .done(function(){
                    // done?
                    that.model.trigger('change');
                    window.history.go(-1);
                    // App.history.navigate(that.previousPage, {trigger: true, replace: true});
                });
        }


        // // // Re-display this page
        // // App.slider.slidePage(this.options.parent.$el);
        // // this.options.parent.render();
        // App.history.navigate(that.previousPage, {trigger: true, replace: true});
        // // this.model.fetch();
    };

    SideView.prototype.flipOut = function() {
        this.refreshData();
        this.hinge.setTransform(Transform.translate(window.innerWidth, 0, 0), { duration: 500, curve: 'easeOut' });
    }

    SideView.prototype.flipIn = function() {
        this.hinge.setTransform(Transform.thenMove(Transform.identity, [window.innerWidth + 100, 0, 0]), { duration: 500, curve: 'easeOut' });
    };


    module.exports = SideView;
});