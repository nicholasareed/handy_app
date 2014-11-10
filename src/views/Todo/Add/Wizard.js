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
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Extras
    var Utils = require('utils');
    var Credentials = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var crypto = require('lib2/crypto');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    // var TodoModel = require('models/todo');
    // var EventModel = require('models/event');
    // var SportModel = require('models/sport');
    var TodoModel = require('models/todo');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.doNotShow = true;
        
        // Create Model
        this.model = new TodoModel.Todo();
        
        this.summary = {
            media_id: null
        };

        // Passed options?
        this.cacheOptions = {};
        this.loadDefaultsPromises = [];
        if(App.Cache.TodoAddOptions){
            this.cacheOptions = App.Cache.TodoAddOptions;

            // if(this.cacheOptions.group_id){
            //     this.summary.group_id = this.cacheOptions.group_id;

            //     var groupDef = $.Deferred();
            //     this.summary.group = new GroupModel.Group({
            //         _id: this.summary.group_id
            //     });
            //     this.summary.group.populated().then(function(){
            //         groupDef.resolve();
            //     });
            //     this.summary.group.fetch({prefill: true});
            //     this.loadDefaultsPromises.push(groupDef.promise());
            // }

            // if(this.cacheOptions.event_id){
            //     this.summary.event_id = this.cacheOptions.event_id;

            //     var eventDef = $.Deferred();
            //     this.summary.event = new EventModel.Event({
            //         _id: this.summary.event_id
            //     });
            //     this.summary.event.populated().then(function(){
            //         eventDef.resolve();
            //     });
            //     this.summary.event.fetch({prefill: true});
            //     this.loadDefaultsPromises.push(eventDef.promise());
            // }

            // if(this.cacheOptions.sport_id){
            //     var sportDef = $.Deferred();
            //     this.summary.sport = new SportModel.Sport({
            //         _id: this.cacheOptions.sport_id
            //     });
            //     this.summary.sport.populated().then(function(){
            //         sportDef.resolve();
            //     });
            //     this.summary.sport.fetch({prefill: true});
            //     this.loadDefaultsPromises.push(sportDef.promise());
            // }
        }

        this.wizard_hash = CryptoJS.SHA3(new Date().toString());
        this.wizard_startTag = 'StartAdd';

        // All the possible paths to use
        this.wizardPaths = {

            'detail': {
                    cacheOptions: 'TodoAddDetailOptions',
                    route: 'todo/add/detail',
                    summaryPath: 'detail'
                },

            // 'payment' : {
            //         cacheOptions: 'TodoAddPaymentOptions',
            //         title: 'Payment',
            //         route: 'todo/add/payment', // should pass the event_id as well?
            //         summaryPath: 'payment'
            //     },

            // 'players' : {
            //         cacheOptions: 'TodoAddPlayersOptions',
            //         title: 'Players',
            //         route: 'todo/add/player', // should pass the event_id as well?
            //         summaryPath: 'player_results'
            //     },
            // 'result' : {
            //         cacheOptions: 'TodoAddResultOptions',
            //         title: 'Result',
            //         route: 'todo/add/result',
            //         summaryPath: 'old_results'
            //     }
        };

        // Routing of the paths
        this.wizardRoute = null;
        this.wizardSummaryPath = '/todo/add/summary';
        this.wizard_current_route_index = 0;

        // Start the Wizard
        // - after finishing preloading
        $.when.apply(this, this.loadDefaultsPromises).then(function(){
            that.run_wizard();
        });

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
                Utils.Notification.Toast('Todo Created!');


                // Going back to the Dash, or back somewhere else?
                App.history.eraseUntilTag('StartAdd');
                App.history.navigate('event/' + that.model.get('_id'));

            });

        return false;
    };


    PageView.prototype.run_wizard = function(routeKey){

        // Using a centralized template?
        if(this.wizardRoute === null){
            // Display "summary" page, or the passed route
            if(routeKey){
                this.currentRouteName = routeKey;
                this.currentRoute = this.wizardPaths[this.currentRouteName];
            } else {
                // Displaying "summary" page
                this.summary_page();

                return;
            }

        } else {

            // Route exists?
            if(this.wizard_current_route_index >= this.wizardRoute.length){
                // finished
                this.complete();
                return;
            }

            // What route are we on? 
            this.currentRouteName = this.wizardRoute[this.wizard_current_route_index];
            this.currentRoute = this.wizardPaths[this.currentRouteName];
            
        }
        if(!this.currentRoute){
            debugger;
        }
        App.Cache[this.currentRoute.cacheOptions] = {
            on_choose: this.on_choose.bind(this),
            on_cancel: this.on_cancel.bind(this),
            summary: this.summary,
            title: this.currentRoute.title
        };

        // Navigate
        App.history.navigate(this.currentRoute.route + '/' + this.wizard_hash);
        

    };

    PageView.prototype.on_cancel = function(){
        // Go backwards

        if(this.wizardRoute === null){
            if(this.currentRouteName == 'summary'){
                //canceling, totally
                App.history.backTo(this.wizard_startTag);
            } else {
                // summary page
                this.summary_page();
            }
            return;
        }

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

    PageView.prototype.summary_page = function(){
        var that = this;

        this.currentRouteName = 'summary';

        App.Cache.TodoAddSummaryOptions = {
            on_choose: function(routeKey){
                // navigate accordingly
                that.run_wizard(routeKey);
            },
            on_cancel: this.on_cancel.bind(this),
            summary: this.summary
        };

        App.history.navigate(this.wizardSummaryPath + '/' + this.wizard_hash);

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
                        Timer.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.inTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // Timer.setTimeout(this.refreshData.bind(this), 1000);
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
                        Timer.setTimeout(function(){

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
