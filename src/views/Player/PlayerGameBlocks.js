/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode')

    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Backbone = require('backbone-adapter');

    // Models
    var GameModel = require("models/game");
    var PlayerModel = require("models/player");

    // Extras
    var _ = require('underscore');
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/PlayerGameBlocks.html');
    var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.lightbox = new RenderController({
            // showOrigin: [0.5, 0]
        });

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: "Loading Highlights",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.emptyListSurface = new Surface({
            content: "No highlights to show!",
            size: [undefined, 100],
            classes: ['empty-list-surface-default']
        });


        // // Add Lightbox to page
        // this.add(this.lightbox);


        // Create LightboxButtons for Render Infinity Buttons (refreshing, etc.)
        this.lightboxButtons = new RenderController({
            // showOrigin: [0.5, 0]
        });

        // Add to view
        // this.add(this.lightboxButtons);

        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default']
        });

        // Loaded 'em all!
        // - shows "X total games"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default']
        });

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default']
        });
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });

        // Show loading surface
        this.lightboxButtons.show(this.infinityLoadingSurface);


        // Using a SequentialLayout
        // - blocks are all Square-ish
        // - last block
        this.layout = new SequentialLayout();

        this.gameLayout = new View();
        this.gameLayout.Dimensions = [3,500];
        this.gameLayout.Grid = new GridLayout({
            // size: [undefined, 300]
            dimensions: this.gameLayout.Dimensions
        });
        this.gameLayout.DefaultHeight = 80;
        this.gameLayout.SizeMod = new StateModifier({
            size: [undefined, undefined]
        });
        this.gameLayout.add(this.gameLayout.SizeMod).add(this.gameLayout.Grid);
        this.gameSurfaces = [];

        // Sequence main layout from the game surfaces, and the buttons
        // debugger;
        this.layout.sequenceFrom([
            this.gameLayout, // another SequentialLayout
            this.lightboxButtons
        ]);

        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error

        // this.add(this.layoutSizeMod).add(this.layout); 
        this.add(this.layout);

        // Wait for player_id promise to be resolved
        options.player_id.then(function(player_id){
            that.init_with_player(player_id);
        });

        // // Expecting a player_id in here
        // // - might be a promise that will eventually return a player_id on resolve
        // if(typeof(options.player_id) === "object"){
        //     // Promise or array?
        //     // - fuckstick

        //     if(typeof options.player_id == typeof []){
        //         // array
        //         this.init_with_player(options.player_id);

        //     } else {
        //         // Promise

        //         // Show the Loading page
        //         this.lightbox.show(this.loadingSurface);

        //         // After player_id resolves, display the Games
        //         options.player_id.then(this.init_with_player.bind(this));
        //     }


        // } else {
        //     // Already have the player_id
        //     this.init_with_player(options.player_id);
        // }

        // this.add(this.lightbox);

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;


    SubView.prototype.init_with_player = function(player_id){
        var that = this;

        // Waited for the player_id to have a valid value
        this.player_id = player_id;

        // Get this Player
        this.model = new PlayerModel.Player({
            _id: player_id
        });
        // if(!this.model.hasFetched){
        //     this.model.fetch({prefill: true});
        // }

        // Wait for model to be populated
        // - probably already populated
        this.model.populated().then((function(){
            // debugger;
            console.log(that.model.toJSON());
            // debugger;
            // // Need to wait for at least 1 item before showing the result?
            // // - otherwise, there is a Render error
            // this.add(this.layout); 

            // Clear loading, if it exists

            // Create collection of Games for player_id
            this.collection = new GameModel.GameCollection([], {
                player_id: player_id
            });

            this.collection.populated().then(function(){
                that.updateCollectionStatus();
            });
            this.collection.infiniteResults = 0;
            this.collection.on("sync", function(){
                console.log('synced');
                that.updateCollectionStatus();
            });
            this.collection.on("add", this.addOne, this);
            this.collection.on("error", function(err){
                console.error('Collection error');
                console.error(err);
                // // Already fetched successfully?
                // if(this.collection.hasFetched){
                //     Utils.Notification.Toast('Error when updating');
                // } else {
                //     Utils.Notification.Toast('Attempting to reload games');
                //     this.collection.pager({reset: true});
                // }
            });

            this.collection.on("request", function(){
                // todo

            });

            this.collection.pager({prefill: true});

        }).bind(this));



    }

    SubView.prototype.addOne = function(Game) { 
        var that = this;

        var GameIndex = this.gameSurfaces.length;

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
                s:  "s",
                m:  "m",
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

                // Player has all of the player_ids for themselves (that they "own" almost)
                var my_player_ids = that.model.get('related_player_ids');
                var matched_ids = _.intersection(game.player_ids, my_player_ids);
                if(matched_ids.length < 1){
                    // Unable to find any _id for this player that matches!
                    // - basically, they didn't participate
                    console.log(game.player_ids);
                    console.log(my_player_ids);
                    console.log(that.model.toJSON());
                    debugger;
                    return game;
                }

                // convert matched_ids into the first matching player_id
                var found_player_id = matched_ids[0];

                var myResult = game.player_results[found_player_id];
                if(!myResult){
                    // Uh-oh, player shouldn't own this game?
                    return game;
                }

                // Check "starred"
                var StarTotal = Game.get('StarTotal');
                if(_.pluck(Game.get('Star'),'user_id').indexOf(that.model.get('user_id')) !== -1){
                    game.tmp_extras.starred = true;
                } else {
                    game.tmp_extras.starred = false;
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

                switch(game.sport_id.result_type){
                    case '1v1':

                        // Determine winner/loser/tie
                        if(game.versus.tie === true){
                            game.tmp_extras.my_result = 't';

                            return game;
                        }

                        // // winner_id matches my driver_id?
                        // // App.Data.Players
                        // // debugger;
                        // if(App.Data.Players === null){
                        //     return game;
                        // }

                        if(found_player_id == game.versus.winner_id){
                            game.tmp_extras.my_result = 'w';
                            game.tmp_extras.won = true;
                            game.tmp_extras.opponent_id = game.versus.loser_id;
                        }
                        if(found_player_id == game.versus.loser_id){
                            game.tmp_extras.my_result = 'l';
                            game.tmp_extras.lost = true;
                            game.tmp_extras.opponent_id = game.versus.winner_id;
                        }
                        break;

                    case 'free-for-all':

                        // Always the possibility that I have multiple results!
                        // - which is bad, some way of preventing this? 
                        // - todo...

                        game.tmp_extras.players = game.player_ids.length;
                        game.tmp_extras.my_place = numeral(game.player_results[found_player_id].place).format('0o');
                        game.tmp_extras.my_result = game.player_results[found_player_id].place;
                        if(game.player_results[found_player_id].place > 3){
                            game.tmp_extras.my_result = '4plus';
                        }

                        break;

                    default:
                        console.error('not handling another type');
                        debugger;
                        break;
                }
            })();

            
            // Create content for View
            return {
                content: template({
                    game: game
                }),
                classes: ['game-block', 'game-block-' + game.tmp_extras.my_result],
                properties: {}

            };

            // template({
            //     model_type: 'player',
            //     model_id: that.collection.options.player_id,
            //     paginator: {
            //         currentPage: that.collection.currentPage + 1,
            //         firstPage: that.collection.firstPage,
            //         totalPages: that.collection.totalPages,
            //         totalResults: that.collection.totalResults
            //     },
            //     game: game
            // });

        };

        var gc = gameContent();
        var gameSurface = new Surface({
            size: [undefined, undefined],
            content: gc.content,
            classes: gc.classes,
            properties: gc.properties
        });
        gameSurface.Model = Game;
        Utils.dataModelReplaceOnSurface(gameSurface);
        Game.on('change', function(){
            var gc = gameContent();
            gameSurface.setContent(gc.content);
            console.log(gc);
            gameSurface.setClasses(gc.classes);
            gameSurface.setProperties(gc.properties);
            Utils.dataModelReplaceOnSurface(gameSurface);
        }, this);
        gameSurface.pipe(this._eventOutput);
        gameSurface.on('click', function(){
            App.history.navigate('game/' + Game.get('_id'), {trigger: true});
        });
        Game.on('change', function(){
            // should update the Surface's data
        }, this);



        // var gameSurface = new Surface({
        //     size: [undefined, 40],
        //     content: Game.attributes.miles + "mi | " + Utils.displayGameListTime(Game.attributes.start_time) + " - " + Utils.displayGameListTime(Game.attributes.end_time) ,
        //     properties: {
        //         color: "white",
        //         backgroundColor: "hsl(" + ((GameIndex + 21)* 360 / 40) + ", 100%, 50%)",
        //         lineHeight: "40px",
        //         textAlign: "center"
        //     }
        // });
        // gameSurface.pipe(this._eventOutput);
        // gameSurface.on('click', function(){
        //     App.history.navigate('game/' + Game.get('_id'), {trigger: true});
        // }, this);

        this.gameSurfaces.push(gameSurface);
        this.collection.infiniteResults += 1;

        if(!this.gameLayout.Grid.isSeq){
            this.gameLayout.Grid.isSeq = true;
            this.gameLayout.Grid.sequenceFrom(this.gameSurfaces);
        }

    };

    SubView.prototype.updateCollectionStatus = function() { 

        console.info('Collection status updated');

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent('Show More (' + amount_left + ')');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total Games');

        // Update size of GridLayout
        var rows = Math.ceil(this.gameSurfaces.length / 3);
        this.gameLayout.Grid.setOptions({dimensions: [3, rows]});
        this.gameLayout.SizeMod.setSize([undefined, this.gameLayout.DefaultHeight * rows]);


        // lightbox showing
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


        // // Resort the gameSurfaces
        // this.gameSurfaces = _.sortBy(this.gameSurfaces, function(surface){
        //     var m = moment(surface.Model.get('start_time'));
        //     return m.format('X') * -1;
        // });

        // Re-sequence
        if(this.gameSurfaces.length > 0){

            // sort correctly

            this.gameSurfaces = _.sortBy(this.gameSurfaces, function(tmpView){
                // console.log(tmpView.Model.get('created'));
                var tmpDate = moment(tmpView.Model.get('created')).format('X');
                // console.log(tmpDate);
                var tmpResult = parseInt(tmpDate, 10);
                return tmpResult * -1;
            });
            this.gameLayout.Grid.sequenceFrom(this.gameSurfaces);
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
        // Load more games
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
