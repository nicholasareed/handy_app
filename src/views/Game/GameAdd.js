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

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var GameModel = require('models/game');


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

        // Create Model
        this.model = new GameModel.Game();
            
        // Start by choosing a sport
        this.choose_sport();

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

    // Sport
    PageView.prototype.choose_sport = function(){
        var that = this;

        // Slide to the change screen for the player
        that.previousPage = window.location.hash;

        // Slide page
        App.Cache.GameSportSelectOptions = {
            // selected_players: this.model.get('players') ? this.model.get('players') : [],
            on_choose: that.sport_changed.bind(this),
            on_cancel: that.sport_canceled.bind(this),
            title: 'Choose Sport',
            back_to_default_hint: false
        };

        // Change history (must)
        App.history.navigate('game/add/sport', {trigger: true});

        return false;
    };
    PageView.prototype.sport_canceled = function(ev){
        var that = this;
        // App.slider.slidePage(App.slider.lastPage);
        App.history.navigate(that.previousPage, {trigger: true});
    };
    PageView.prototype.sport_changed = function(selected_sport){
        var that = this;

        // Save to .summary
        this.summary = {};
        this.summary.sport = selected_sport;

        // Next
        this.choose_player();

    };

    // Players
    PageView.prototype.choose_player = function(){
        var that = this;

        // Slide to the change screen for the player
        that.previousPage = window.location.hash;

        // Multiple players to select?
        // - really, this should be combined with the next step (the entering of places/scores or win/loss)
        var useMultiple;
        switch(this.summary.sport.get('result_type')){
            case '1v1':
                useMultiple = false;
                break;
            case 'free-for-all':
                useMultiple = true;
                break;
            default:
                console.error('Missing');
                debugger;
                break;
        }

        // Slide page
        App.Cache.PlayerSelectOptions = {
            // selected_players: this.model.get('players') ? this.model.get('players') : [],
            on_choose: that.player_changed.bind(this),
            on_cancel: that.player_canceled.bind(this),
            title: 'Choose Player(s)',
            back_to_default_hint: false,
            multiple: useMultiple
        };

        // Change history (must)
        App.history.navigate('game/add/player', {trigger: true});

        return false;
    };
    PageView.prototype.player_canceled = function(ev){
        var that = this;
        // App.slider.slidePage(App.slider.lastPage);
        App.history.navigate(that.previousPage, {trigger: true});
    };
    PageView.prototype.player_changed = function(selected_players_list){
        var that = this;

        var that = this;

        // Save to .summary
        this.summary.player = selected_players_list;

        // Next
        this.choose_result();

    };

    // Result
    PageView.prototype.choose_result = function(){
        var that = this;

        // Slide to the change screen for the player
        that.previousPage = window.location.hash;

        console.log(that.summary);

        // Slide page
        App.Cache.ResultOptions = {
            // selected_players: this.model.get('players') ? this.model.get('players') : [],
            on_choose: that.result_changed.bind(this),
            on_cancel: that.result_canceled.bind(this),
            title: 'Enter Results',
            back_to_default_hint: false,
            sport: that.summary.sport, // Model
            player: that.summary.player
        };

        // Change history (must)
        App.history.navigate('game/add/result', {trigger: true});

        return false;
    };
    PageView.prototype.result_canceled = function(ev){
        var that = this;
        // App.slider.slidePage(App.slider.lastPage);
        App.history.navigate(that.previousPage, {trigger: true});
    };
    PageView.prototype.result_changed = function(selected_result){
        var that = this;

        var that = this;

        // Save to .summary
        this.summary.result = selected_result;

        // Next
        this.choose_details();

    };

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
            title: 'Confirm New Game!',
            back_to_default_hint: false,
            summary: that.summary
        };

        // Change history (must)
        App.history.navigate('game/add/detail', {trigger: true});

        return false;
    };
    PageView.prototype.details_canceled = function(ev){
        var that = this;
        // App.slider.slidePage(App.slider.lastPage);
        App.history.navigate(that.previousPage, {trigger: true});
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

        // Determine what data, and format, we'll send up to the server to store this Game
        formData.sport_id = this.summary.sport.get('_id');
        // formData.players = this.summary.player;

        switch(this.summary.sport.get('result_type')){
            case '1v1':
                formData.player_id = this.summary.player[0].get('_id'); // get the first/only player
                formData.result = this.summary.result;

                break;
            case 'free-for-all':
                // formData.player_details = this.summary.result; // get the first/only player
                formData.result = this.summary.result;

                break;
            default:
                alert('bad sport type');
                debugger;
                break;

        }
        
        // Get elements to save
        this.model.set(formData);

        this.model.save()
            .then(function(newModel){

                // console.log('newModel', newModel);
                // console.log('jsonModel', that.model.toJSON());

                // Create the new one
                // - causes a "populated" to be created that is valid
                var newGame = new GameModel.Game(newModel);

                // that.model.set(newModel);
                
                // // Enable submit
                // that.submitButtonSurface.setSize([undefined, 40]);

                // Clear player cache
                // - todo...

                // Clear history
                App.history.eraseUntilTag('StartGameAdd');

                // Redirect to the new Game
                App.history.navigate('game/' + newModel._id);
                

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
