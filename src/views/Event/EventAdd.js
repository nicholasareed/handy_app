/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
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

    // Extras
    var Utils = require('utils');
    var Credentials = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var crypto = require('lib2/crypto');

    var EventHandler = require('famous/core/EventHandler');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var EventModel = require('models/event');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.doNotShow = true;
        
        // Create Model
        this.model = new EventModel.Event();
        
        this.summary = {};

        this.wizard_hash = CryptoJS.SHA3(new Date().toString());
        this.wizard_startTag = 'StartEventAdd';

        // All the possible paths to use
        this.wizardPaths = {

            'title': {
                    cacheOptions: 'TitleOptions',
                    title: 'Title',
                    route: 'event/add/title',
                    summaryPath: 'title'
                },
            'description' : {
                    cacheOptions: 'DescriptionOptions',
                    title: 'Description',
                    route: 'event/add/description',
                    summaryPath: 'description',
                    // post: function(){
                    //     // handle after-save (for changing the route)

                    //     if(this.summary.text == ''){
                    //         // show Media
                    //         if(this.wizardRoute.indexOf('media') == -1){
                    //             // add after myself
                    //             this.wizardRoute.splice(this.wizard_current_route_index+1,0,'media');
                    //         }
                    //     } else {
                    //         // don't show media, just skip and save
                    //         this.wizardRoute = _.without(this.wizardRoute,'media');
                    //     }

                    // }
                },
            // 'media' : {
            //         cacheOptions: 'MediaOptions',
            //         title: 'Media',
            //         route: 'event/add/media',
            //         summaryPath: 'media'
            //     }
        };

        // Routing of the paths
        this.wizardRoute = [
            'title',
            'description',
            // 'media' // may be skipped! (see above)
        ];
        this.wizard_current_route_index = 0;

        // Start the Wizard
        this.run_wizard();

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;


    PageView.prototype.complete = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;

        Utils.Notification.Toast('Saving...');

        // Get elements to save
        this.model.set({
            title: this.summary.title,
            description: this.summary.description
        });

        console.log(this.model.toJSON());

        this.model.save()
            .then(function(newModel){
                this.checking = false;

                that.model.set(newModel);

                // Created OK
                Utils.Notification.Toast('Event Created!');


                // Going back to the Dash, or back somewhere else?
                App.history.eraseUntilTag('StartEventAdd');

                App.history.navigate('event/' + that.model.get('_id'));

            });

        return false;
    };


    PageView.prototype.run_wizard = function(){

        // Route exists?
        if(this.wizard_current_route_index >= this.wizardRoute.length){
            // finished
            this.complete();
            return;
        }

        // What route are we on? 
        this.currentRouteName = this.wizardRoute[this.wizard_current_route_index];
        this.currentRoute = this.wizardPaths[this.currentRouteName];

        App.Cache[this.currentRoute.cacheOptions] = {
            on_choose: this.on_choose.bind(this),
            on_cancel: this.on_cancel.bind(this),
            title: this.currentRoute.title
        };

        // Navigate
        App.history.navigate(this.currentRoute.route + '/' + this.wizard_hash);
        

    };

    PageView.prototype.on_cancel = function(){
        // Go backwards

        // first one, need to reset
        if(this.wizard_current_route_index == 0){
            App.history.backTo(this.wizard_startTag);
            return;
        }

        // Go back a page, don't really save anything
        this.wizard_current_route_index -= 1;

        // Run the wizard again
        this.run_wizard();

    };

    PageView.prototype.on_choose = function(data){
        // OK, moving forward (or saving)

        // Save to .summary
        this.summary[this.currentRoute.summaryPath] = data;

        // What do we do next?
        // - ask the "post" function, it may modify the routes
        if(this.currentRoute.post){
            this.currentRoute.post.apply(this);
        }

        // Increment our index
        this.wizard_current_route_index += 1;

        // continue running
        this.run_wizard();

    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Content
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.inTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // window.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth, 0, 0));

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };



    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
        },
        footer: {
            size: [undefined, 0]
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
