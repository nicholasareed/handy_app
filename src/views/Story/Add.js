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

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');

    var EventHandler = require('famous/core/EventHandler');

    // Extras
    var _ = require('underscore');
    var Utils = require('utils');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var GameModel = require('models/game');
    var StoryModel = require('models/story');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // This is the "main" controller for creating a new game
        // - goes through multiple "pages" to create the Game

        // sport
        // opponent(s)
        // result (W/L/T or list of places where you add the place for each user)
        // media+details (after created game)
        // save!!

        this.summary = {};

        // Create Models

        // Story (will be saving this later)
        this.model = new StoryModel.Story();

        // Get Game (and sport, etc.)
        this.game_model = new GameModel.Game({
            _id: this.params.args[0]
        });
        this.game_model.fetch({prefill: true});

        this.game_model.populated().then(function(){
            
            that.summary.game = that.game_model;

            // Start by choosing a sport
            that.choose_details();

        });

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

        // // Add surfaces
        // this.addSurfaces();

        // // // Footer
        // // // - bring it up
        // // this.layout.footer.add(quick_stats_grid);
        
        // // Attach the main transform and the comboNode to the renderTree
        // this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;


    // Details
    PageView.prototype.choose_details = function(){
        var that = this;

        // Slide to the change screen for the player
        that.previousPage = window.location.hash;

        // Slide page
        App.Cache.DetailOptions = {
            // selected_players: this.model.get('players') ? this.model.get('players') : [],
            on_choose: that.details_changed.bind(this),
            on_cancel: that.details_canceled.bind(this),
            title: 'Enter Details',
            back_to_default_hint: false,
            summary: that.summary
        };

        // Change history (must)
        App.history.navigate('story/add/detail');

        return false;
    };
    PageView.prototype.details_canceled = function(ev){
        var that = this;
        // App.slider.slidePage(App.slider.lastPage);
        App.history.navigate(that.previousPage);
    };
    PageView.prototype.details_changed = function(selected_detail){
        var that = this;

        // Save to .summary
        this.summary.detail = selected_detail;

        // Save the Game!
        this.save_game();
    };

    PageView.prototype.save_game = function(ev){
        var that = this;

        var formData = {};


        formData.story_template_id = "53a1f80f736770086231a930"; // default, standard
        formData.game_id = this.summary.game.get('_id');

        // Must be using a player in the game that we "own" ?
        formData.player_id = App.Data.Players.findMe().get('_id');

        formData.headline = this.summary.detail.headline;
        formData.media_id = this.summary.detail.media_id; // optional, bg_color would always be used otherwise
        formData.bg_color = this.summary.detail.bg_color; // media_id may be used instead
        formData.bg_pattern = this.summary.detail.bg_pattern;
        formData.text_color = this.summary.detail.text_color; // media_id may be used instead
        
        // Get elements to save
        this.model.set(formData);

        this.model.save()
            .then(function(newModel){

                // console.log('newModel', newModel);
                // console.log('jsonModel', that.model.toJSON());

                // Create the new one
                // - causes a "populated" to be created that is valid
                var newStory = new StoryModel.Story(newModel);

                // that.model.set(newModel);
                
                // // Enable submit
                // that.submitButtonSurface.setSize([undefined, 40]);

                // Clear player cache
                // - todo...

                // Redirect back to the game
                // - clear the history back to that though?
                // App.history.navigate();

                Utils.Notification.Toast('Saved Highlight!');

                // back to tag:Game
                App.history.backTo('Game');
                

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
