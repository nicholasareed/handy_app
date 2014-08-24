/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode')

    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");
    var FlexibleLayout = require("famous/views/FlexibleLayout");

    var Backbone = require('backbone-adapter');
    var GameModel = require("models/game");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');
    var moment = require('moment');
    var Credentials         = JSON.parse(require('text!credentials.json'));

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/EventResultItem.html');
    var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.loadModels();

        // this.bg = new Surface({
        //     content: 'test',
        //     size: [undefined, undefined],
        //     properties: {
        //         backgroundColor: 'blue'
        //     }
        // });
        // this.bg.pipe(this._eventOutput);
        // this.add(new Modifier({transform: Transform.translate(0,0,-0.0001)})).add(this.bg);

        this.createDefaultSurfaces();
        this.createDefaultLightboxes();


        // Using a SequentialLayout
        this.layout = new SequentialLayout();

        this.contentLayout = new View();
        this.contentLayout.Grid = new SequentialLayout();
        this.contentLayout.Views = [];
        this.contentLayout.add(this.contentLayout.Grid);

        // this.createAddBar();
        // this.createResultSpacer();
        this.createResultButtons();

        // Sequence main layout from the event surfaces, and the buttons
        this.layout.sequenceFrom([
            // this.contentAddBar,
            // this.resultSpacer,
            this.lightbox, // rendercontroller holding a SequentialLayout
            this.lightboxButtons,
            this.optionButtons,
        ]);

        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error

        // this.add(this.layoutSizeMod).add(this.layout); 
        this.add(this.layout);

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;

    SubView.prototype.loadModels = function(){
        var that = this;

        this.EventModel = this.options.model;
        this.event_id = this.EventModel.get('_id');

        // Create collection of Events for event_id
        this.collection = new GameModel.GameCollection([], {
            event_id: this.event_id
        });

        this.collection.infiniteResults = 0;
        this.collection.on("add", this.addOne, this);
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("error", function(){
            console.error('Collection error');
        });
        this.collection.on("request", function(){
        });

        App.Data.Players.populated().then(function(){
            that.collection.pager({prefill: true});
        });

    };

    SubView.prototype.createDefaultSurfaces = function(){
        var that = this;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: "Loading",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.loadingSurface.pipe(this._eventOutput);
        this.emptyListSurface = new Surface({
            content: "None to Show",
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
                // backgroundColor: 'red'
            }
        });
        this.emptyListSurface.pipe(this._eventOutput);


        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default']
        });
        this.infinityLoadingSurface.pipe(this._eventOutput);

        // Loaded 'em all!
        // - shows "X total events"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default']
        });
        this.infinityLoadedAllSurface.pipe(this._eventOutput);

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default']
        });
        this.infinityShowMoreSurface.pipe(this._eventOutput);
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });
    };

    SubView.prototype.createDefaultLightboxes = function(){
        var that = this;

        // Content Lightbox
        this.lightbox = new RenderController();
        this.lightbox.show(this.loadingSurface);
        this.lightbox.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    return [undefined, s[1]];
                }
            }catch(err){}
            return [undefined, true];
        };

        // Buttons lightbox
        this.lightboxButtons = new RenderController();
        this.lightboxButtons.show(this.infinityLoadingSurface);
        this.lightboxButtons.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    return [undefined, s[1]];
                }
            }catch(err){}
            return [undefined, true];
        };

    };

    SubView.prototype.createResultSpacer = function() { 
        this.resultSpacer = new Surface({
            size: [undefined, 1]
        });
        this.resultSpacer.pipe(this._eventOutput);
    };

    SubView.prototype.createResultButtons = function() { 
        var that = this;

        this.optionButtons = new View();

        this.createButton = new Surface({
            content: '<div class="outward-button">Add a Game</div>',
            size: [undefined, 60],
            // classes: ['form-button-submit-default']
            classes: ['button-outwards-default']
        });
        this.createButton.on('click', function(){
            // anyone is allowed to create a Game Result in here?
            if(1==0){
                return;
            }

            // Go to the Create Page
            App.Cache.GameAddOptions = {
                new: true,
                type: 'event',
                id: that.event_id,
                event_id: that.event_id,
                // sport_id: '53c82c7c7988f90624c01061',
                // default_sport: null // could pass a default sport?
            };
            App.history.modifyLast({
                tag: 'StartGameAdd'
            });
            App.history.navigate('game/add',{history: false});

        });
        this.createButton.pipe(this._eventOutput);

        this.optionButtons.add(this.createButton);

    };

    SubView.prototype.createAddBar = function() { 
        var that = this;

        // Create Grid
        this.contentAddBar = new View();
        this.contentAddBar.Grid = new GridLayout({
            dimensions: [2,1]
        });
        this.contentAddBar.Grid.Views = [];
        this.contentAddBar.Grid.sequenceFrom(this.contentAddBar.Grid.Views);
        this.contentAddBar.SizeMod = new StateModifier({
            size: [undefined, 50]
        });
        this.contentAddBar.add(this.contentAddBar.SizeMod).add(this.contentAddBar.Grid);
        
        // Add Grid items
        // - gallery/camera
        // - text

        // Add Text (popup asking for text)
        this.contentAddBar.AddText = new View();
        this.contentAddBar.AddText.Surface = new Surface({
            content: '<i class="icon ion-ios7-photos"></i><div>Text</div>',
            size: [undefined, undefined],
            classes: ['event-games-tabbar-default', 'on']
        });
        this.contentAddBar.AddText.Surface.pipe(this._eventOutput);
        this.contentAddBar.AddText.Surface.on('click', function(){
            var t = prompt("Enter your text");
            if(t && t.length > 0){
                that.saveStory({
                    type: 'text',
                    text: t
                });
            }
        });
        this.contentAddBar.AddText.add(this.contentAddBar.AddText.Surface);
        this.contentAddBar.Grid.Views.push(this.contentAddBar.AddText);

        // Add Media (popover asking for camera/gallery)
        this.contentAddBar.AddText = new View();
        this.contentAddBar.AddText.Surface = new Surface({
            content: '<i class="icon ion-images"></i><div>Photo</div>',
            size: [undefined, undefined],
            classes: ['event-games-tabbar-default', 'on']
        });
        this.contentAddBar.AddText.Surface.pipe(this._eventOutput);
        this.contentAddBar.AddText.Surface.on('click', function(){
            
            // Options and details
            App.Cache.OptionModal = {
                list: [
                    {
                        text: "Take Photo with Camera",
                        value: "camera"
                    },
                    {
                        text: "Choose from Gallery",
                        value: "gallery"
                    }
                ],
                on_choose: function(chosen_type){
                    switch(chosen_type.value){
                        case 'camera':
                            Utils.takePicture('camera', {}, that.uploadImage.bind(that), function(message){
                                // failed taking a picture
                            });
                            break;
                        case 'gallery':
                            Utils.takePicture('gallery', {}, that.uploadImage.bind(that), function(message){
                                // failed taking a picture
                            });
                            break;
                        default:
                            return;
                    }
                    // App.history.navigate(that.previousPage);
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                },
                title: 'Set a Profile Picture'
            };

            // Change history (must)
            App.history.navigate('modal/list', {history: false});

        });
        this.contentAddBar.AddText.add(this.contentAddBar.AddText.Surface);
        this.contentAddBar.Grid.Views.push(this.contentAddBar.AddText);


        //     content: '<i class="icon ion-ios7-photos"></i><div>Highlights</div>',
        //     onClasses: ['profile-tabbar-default', 'on'],
        //     offClasses: ['profile-tabbar-default', 'off']

    };

    SubView.prototype.addOne = function(Game) { 
        var that = this;

        var GameIndex = this.contentLayout.Views.length;

        // Add a header if date changes
        var thisGameDatetime = moment(Game.get('created'));
        // if(this.lastGameDate != thisGameDatetime.format('L')){
        //     this.lastGameDate = thisGameDatetime.format('L');

        //     // Add header
        //     var headerSurface = new Surface({
        //         content: Utils.displayGameListDate(Game.get('created')),
        //         size: [undefined, undefined],
        //         properties: {
        //             lineHeight: "40px",
        //             backgroundColor: "#f8f8f8",
        //             color: "#222",
        //             fontWeight: "bold",
        //             padding: "0 8px"
        //         }
        //     });
        //     headerSurface.pipe(this._eventOutput);
        //     this.gameSurfaces.push(headerSurface);
        // }

        moment.lang('en', {
            relativeTime : {
                future: "in %s",
                past:   "%s ago",
                s:  "1s",
                m:  "1m",
                mm: "%dm",
                h:  "1h",
                hh: "%dh",
                d:  "1d",
                dd: "%dd",
                M:  "1m",
                MM: "%dm",
                y:  "1y",
                yy: "%dy"
            }
        });

        // gameContent creation function, created at runtime
        var gameContent = function(){
            // var tmp = Game.attributes.miles + "mi | " + Utils.displayGameListTime(Game.attributes.start_time) + " - " + Utils.displayGameListTime(Game.attributes.end_time);

            var game = Game.toJSON();

            (function(){
                game.tmp_extras = {};

                game.tmp_extras.datetime = moment(game.created).fromNow(true);
                game.tmp_extras.my_result = '';
                game.tmp_extras.to_certify = false;

                // Check "starred"
                var StarTotal = Game.get('StarTotal');
                if(_.pluck(Game.get('Star'),'user_id').indexOf(App.Data.Players.findMe().get('user_id')) !== -1){
                    game.tmp_extras.starred = true;
                } else {
                    game.tmp_extras.starred = false;
                }

                // Player has all of the player_ids for themselves (that they "own" almost)
                var my_player_ids = App.Data.Players.findMe().get('related_player_ids');
                var matched_ids = _.intersection(game.player_ids, my_player_ids);
                if(matched_ids.length < 1){
                    // Unable to find any _id for this player that matches!
                    // - basically, they didn't participate in this game
                    return game;
                }

                // convert matched_ids into the first matching player_id
                var found_player_id = matched_ids[0];

                var myResult = game.player_results[found_player_id];
                if(!myResult){
                    // participated in result?
                    return game;
                }

                // Certified?
                switch(myResult.certified){
                    case false:
                        game.tmp_extras.to_certify = false;
                        break;
                    case null:
                        game.tmp_extras.to_certify = null;
                        break;
                    case true:
                        game.tmp_extras.to_certify = true;
                        break;

                }

                switch(game.result_type){
                    case 'wlt':

                        switch(myResult.result){
                            case 'w':
                                game.tmp_extras.my_result = 'w';
                                break; 
                            case 'l':
                                game.tmp_extras.my_result = 'l';
                                break; 
                            case 't':
                                game.tmp_extras.my_result = 't';
                                break; 

                            default:
                                debugger;
                                return;
                                break;
                        }

                        break;

                    case 'places':

                        game.tmp_extras.my_result = myResult.result;
                        game.tmp_extras.my_result_text = numeral(myResult.result).format('0o');
                        if(myResult.result > 3){
                            game.tmp_extras.my_result = '4plus';
                        }

                        break;

                    default:
                        console.error('wrong result_type of result, not yet supported');
                        return;

                }

                return game;

            })();

            
            // Create content for View
            return {
                content: template({
                    game: game
                }),
                classes: ['event-result-default', 'event-result-default-' + game.tmp_extras.my_result],
                properties: {}

            };

        };

        var gc = gameContent();
        var gameSurface = new Surface({
            size: [undefined, 54],
            content: gc.content,
            classes: gc.classes,
            properties: gc.properties
        });
        gameSurface.Model = Game;
        Utils.dataModelReplaceOnSurface(gameSurface);
        Game.on('change', function(){
            var gc = gameContent();
            gameSurface.setContent(gc.content);
            // console.log(gc);
            gameSurface.setClasses(gc.classes);
            gameSurface.setProperties(gc.properties);
            Utils.dataModelReplaceOnSurface(gameSurface);
        }, this);
        gameSurface.pipe(this._eventOutput);
        gameSurface.on('click', function(){
            App.history.navigate('game/' + Game.get('_id'));
        });

        this.contentLayout.Views.push(gameSurface);
        this.collection.infiniteResults += 1;

    };

    SubView.prototype.updateCollectionStatus = function() { 

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent('Show More (' + amount_left + ')');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total');

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.contentLayout;
        }

        if(nextRenderable != this.lightbox.lastRenderable){
            this.lightbox.lastRenderable = nextRenderable;
            this.lightbox.show(nextRenderable);
        }


        // // Resort the contentLayout.Views
        // this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(surface){
        //     var m = moment(surface.Model.get('start_time'));
        //     return m.format('X') * -1;
        // });

        // Re-sequence
        if(this.contentLayout.Views.length > 0){

            // Make sure the Views are in the correct order
            // var tmpModels = _.pluck(this.contentLayout.Views,'Model');
            // var tmpOrder = _.pluck(tmpModels, 'created');
            // console.log(this.contentLayout.Views);

            // this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(tmpView){
            //     // console.log(tmpView.Model.get('created'));
            //     var tmpDate = moment(tmpView.Model.get('created')).format('X');
            //     // console.log(tmpDate);
            //     var tmpResult = parseInt(tmpDate, 10);
            //     return tmpResult * -1;
            // });
            this.contentLayout.Grid.sequenceFrom(this.contentLayout.Views);
        }

        // Show correct infinity buttons (More, All, etc.)
        this.render_infinity_buttons();

    };

    SubView.prototype.render_infinity_buttons = function(){
        // Renders the correct infinity-list buttons (the "Show More" or "Is loading" button/hint) at the bottom of the page

        // // Hide all dat shit
        // // - unnecessary?
        // this.$('.load-list').addClass('nodisplay');

        if(this.collection.hasFetched){
            // at the end?
            if(this.collection.infiniteResults == this.collection.totalResults){
                // this.lightboxButtons.hide();
                this.lightboxButtons.show(this.infinityLoadedAllSurface);
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
        // Load more events
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');
        // debugger;

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
    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
