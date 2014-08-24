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
    var SportModel = require('models/sport');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.doNotShow = true;

        // // create the layout
        // this.layout = new HeaderFooterLayout({
        //     headerSize: App.Defaults.Header.size,
        //     footerSize: App.Defaults.Footer.size
        // });

        // this.createHeader();

        // // create the scrollView of content
        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        // this.scrollSurfaces = [];
        // this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // // link endpoints of layout to widgets

        // // Header/navigation
        // this.layout.header.add(this.header);

        // // Content
        // this.layout.content.StateModifier = new StateModifier();
        // this.layout.content.add(this.layout.content.StateModifier).add(Transform.behind).add(this.contentScrollView);

        this.wizard_hash = CryptoJS.SHA3(new Date().toString());

        // Choose the Sport
        this.choose_sport();        

        // // Add surfaces
        // this.addSurfaces();

        // // Footer
        // // - bring it up
        // this.layout.footer.add(quick_stats_grid);
        
        // // Attach the main transform and the comboNode to the renderTree
        // this.add(this.layout);

        // Create Model
        this.model = new SportModel.Sport();

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    // PageView.prototype.createHeader = function(){
    //     var that = this;
        
    //     // create the header
    //     this.header = new StandardHeader({
    //         content: "New Sport",
    //         classes: ["normal-header"],
    //         backClasses: ["normal-header"],
    //         moreContent: false
    //     }); 
    //     this.header._eventOutput.on('back',function(){
    //         App.history.back();//.history.go(-1);
    //     });
    //     this.header.pipe(this._eventInput);
    //     this._eventOutput.on('inOutTransition', function(args){
    //         this.header.inOutTransition.apply(this.header, args);
    //     })

    //     // Attach header to the layout        
    //     this.layout.header.add(this.header);

    // };

    // Sport
    PageView.prototype.choose_sport = function(){
        var that = this;

        // Slide to the change screen for the player
        
        that.previousPage = window.location.hash;

        // Slide page
        App.Cache.SportSelectOptions = {
            // selected_players: this.model.get('players') ? this.model.get('players') : [],
            on_choose: that.sport_changed.bind(this),
            on_cancel: that.sport_canceled.bind(this),
            title: '"Parent" Sport',
            back_to_default_hint: false
        };

        // Change history (must)
        App.history.navigate('sport/add/parent_sport/' + this.wizard_hash);

        return false;
    };
    PageView.prototype.sport_canceled = function(ev){
        var that = this;
        // App.slider.slidePage(App.slider.lastPage);
        App.history.navigate(that.previousPage);
    };
    PageView.prototype.sport_changed = function(selected_sport){
        var that = this;

        // Save to .summary
        this.summary = {};
        this.summary.sport = selected_sport;

        // Next
        this.choose_detail();

    };

    // Details
    PageView.prototype.choose_detail = function(){
        var that = this;

        // Slide to the change screen for the player
        that.previousPage = window.location.hash;

        // Slide page
        App.Cache.DetailOptions = {
            // selected_players: this.model.get('players') ? this.model.get('players') : [],
            on_choose: that.detail_changed.bind(this),
            on_cancel: that.detail_canceled.bind(this),
            title: 'Details',
            back_to_default_hint: false,
            summary: this.summary
        };

        // Change history (must)
        App.history.navigate('sport/add/details/' + this.wizard_hash);

        return false;
    };
    PageView.prototype.detail_canceled = function(ev){
        var that = this;
        // App.slider.slidePage(App.slider.lastPage);
        App.history.navigate(that.previousPage);
    };
    PageView.prototype.detail_changed = function(selected_detail){
        var that = this;

        // Save to .summary
        this.summary.detail = selected_detail;

        // Next
        this.save_sport();

    };

    // PageView.prototype.addSurfaces = function() {
    //     var that = this;

    //     // Build Surfaces
    //     // - add to scrollView
    //     this.inputNameSurface = new InputSurface({
    //         name: 'name',
    //         placeholder: 'Name',
    //         type: 'text',
    //         size: [200, 50],
    //         value: ''
    //     });
    //     this.scrollSurfaces.push(this.inputNameSurface);

    //     this.submitButtonSurface = new Surface({
    //         size: [undefined,40],
    //         classes: ['button-surface'],
    //         content: 'Save Sport',
    //         properties: {
    //             lineHeight : "20px"
    //         }
    //     });
    //     this.scrollSurfaces.push(this.submitButtonSurface);

    //     // Events for surfaces
    //     this.submitButtonSurface.on('click', this.save_sport.bind(this));


    // };

    PageView.prototype.save_sport = function(ev){
        var that = this;

        // // validate name
        // var name = $.trim(this.inputNameSurface.getValue().toString());
        // if(name.length === 0){
        //     return;
        // }

        // // Disable submit
        // this.submitButtonSurface.setSize([0,0]);

        // Example:         
        // "_id" : ObjectId("539210c45399dfc47bc702f8"),
        // "name" : "Chess",
        // "user_id" : ObjectId("5391389586b0a41158c45979"),
        // "parent_sport_id" : null,
        // "result_type" : "1v1",
        // "ties_allowed" : true,
        // team_game: "allowed",
        // team_game_default: false,
        // result_type: req.body.result_type,
        // result_subtype: req.body.result_subtype,
        // result_schema: {},
        // "details" : {
        //     "opponents" : 1,
        //     "result_type" : "single_option",
        //     "result_subtype" : "win_lose_tie",
        //     "result_options" : [ 
        //         "win", 
        //         "lose", 
        //         "tie"
        //     ],
        //     "detail_options" : [ 
        //         {
        //             "key" : "blackwhite",
        //             "question" : "Were you Black or White",
        //             "type" : "toggle",
        //             "default" : null,
        //             "answers" : [ 
        //                 "Black", 
        //                 "White"
        //             ]
        //         }
        //     ]
        // },
        // "game_schema" : {
        //     "winner_id" : null,
        //     "loser_id" : null,
        //     "tie" : 0,
        //     "black_id" : null,
        //     "white_id" : null
        // },
        // "created" : ISODate("2014-06-06T19:04:36.014Z"),
        // "modified" : ISODate("2014-06-06T19:04:36.014Z")

        Utils.Notification.Toast('Saving...');

        // Get elements to save
        this.model.set({
            parent_sport_id: this.summary.sport.get('_id'),
            name: this.summary.detail.name,
            result_type: this.summary.detail.result_type, // 1v1, free-for-all
            result_subtype: this.summary.detail.result_subtype, // places (1st, 2nd, 3rd)
            scoring_schema: this.summary.detail.scoring_schema,    
            result_schema: this.summary.detail.result_schema,

        });

        console.log(this.model.toJSON());

        this.model.save()
            .then(function(newModel){

                // Created OK
                Utils.Notification.Toast('Sport Created!');

                // // Enable submit
                // that.submitButtonSurface.setSize([undefined, 40]);

                // Clear sport cache
                // - todo...

                // Re-get sports
                this.collection = new SportModel.SportCollection();
                this.collection.fetch();

                // Erase the history until the start of the creation
                // - todo...

                // Redirect to the new user
                // that.$('.back-button').trigger('click');

                // Going back to the Dash, or back somewhere else?
                App.history.backTo('StartSportAdd');

            });

        return false;
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
