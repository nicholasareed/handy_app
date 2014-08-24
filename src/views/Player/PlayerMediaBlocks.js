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

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Backbone = require('backbone-adapter');
    var MediaModel = require("models/media");

    // Extras
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

        // Add to view
        // this.add(this.lightboxButtons);

        // Show loading surface
        this.lightboxButtons.show(this.infinityLoadingSurface);


        // Using a SequentialLayout
        // - blocks are all Square-ish
        // - last block
        this.layout = new SequentialLayout();

        this.mediaLayout = new View();
        this.mediaLayout.Dimensions = [3,500];
        this.mediaLayout.Grid = new GridLayout({
            // size: [undefined, 300]
            dimensions: this.mediaLayout.Dimensions
        });
        this.mediaLayout.DefaultHeight = innerWidth/3;
        this.mediaLayout.SizeMod = new StateModifier({
            size: [undefined, undefined]
        });
        this.mediaLayout.add(this.mediaLayout.SizeMod).add(this.mediaLayout.Grid);
        this.mediaSurfaces = [];

        // Sequence main layout from the media surfaces, and the buttons
        // debugger;
        this.layout.sequenceFrom([
            this.mediaLayout, // another SequentialLayout
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

        //         // After player_id resolves, display the Media
        //         options.player_id.then(this.init_with_player.bind(this));
        //     }


        // } else {
        //     // Already have the player_id
        //     this.init_with_player(options.player_id);
        // }

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;


    SubView.prototype.init_with_player = function(player_id){
        var that = this;

        // Waited for the player_id to have a valid value


        // // Need to wait for at least 1 item before showing the result?
        // // - otherwise, there is a Render error
        // this.add(this.layout); 

        // Clear loading, if it exists

        // Create collection of Media for player_id
        this.collection = new MediaModel.MediaCollection([], {
            player_id: player_id
        });
        this.collection.infiniteResults = 0;
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addOne, this);
        this.collection.on("error", function(){
            console.error('Collection error');
            // // Already fetched successfully?
            // if(this.collection.hasFetched){
            //     Utils.Notification.Toast('Error when updating');
            // } else {
            //     Utils.Notification.Toast('Attempting to reload media');
            //     this.collection.pager({reset: true});
            // }
        });

        this.collection.on("request", function(){
            // todo

        });

        this.collection.pager({prefill: true});

    }

    SubView.prototype.addOne = function(Media) { 
        var that = this;

        var mediaView = new View();
        mediaView.StateModifier = new StateModifier({
            size: [(window.innerWidth/3) - 2, (window.innerWidth/3) - 2] // 2px padding basically
        });
        mediaView.OriginMod = new StateModifier({
            origin: [0.5,0.5]
        });
        mediaView.Surface = new ImageSurface({
            content: Media.get('urls.thumb100x100'),
            size: [undefined, undefined],
            properties: {
                // border: "1px solid #555"
            }
        });
        mediaView.add(mediaView.OriginMod).add(mediaView.StateModifier).add(mediaView.Surface);
        mediaView.Model = Media;
        mediaView.Surface.pipe(this._eventOutput);
        mediaView.Surface.on('click', function(){
            // View game or image
            if(Media.get('game_id')){
                
                // Ask what they want to do
                App.Cache.OptionModal = {
                    list: [
                        {
                            text: 'View Image',
                            value: 'view'
                        },
                        {
                            text: 'View Game',
                            value: 'game'
                        }
                    ],
                    on_choose: function(chosen_type){
                        // that.PlayerFilterChanger.Data = chosen_type.value;

                        switch(chosen_type.value){
                            case 'view':
                                window.open(Media.get('urls.original'), '_system');
                                break;
                            case 'game':
                                App.history.navigate('game/' + Media.get('game_id'));
                                // window.plugins.socialsharing.share('',null,media.urls.original,'www.nemesisapp.net/game/public/' + Story.get('_id'));
                                break;
                            default:
                                break;
                        }

                    },
                    on_cancel: function(){
                        // App.history.navigate(that.previousPage);
                        // debugger;
                    },
                    // title: '',
                    back_to_default_hint: false
                };
                // Navigate
                App.history.navigate('modal/list', {history: false});

            } else {
                // View the image
                window.open(media.urls.original, '_system');
            }
        });
        // mediaSurface.on('click', function(){
        //     App.history.navigate('media/' + Media.get('_id'), {trigger: true});
        // });

        this.mediaSurfaces.push(mediaView);
        this.collection.infiniteResults += 1;

        if(!this.mediaLayout.Grid.isSeq){
            this.mediaLayout.Grid.isSeq = true;
            this.mediaLayout.Grid.sequenceFrom(this.mediaSurfaces);
        }

    };

    SubView.prototype.updateCollectionStatus = function() { 

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent('Show More (' + amount_left + ')');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total Media');

        // Update size of GridLayout
        var rows = Math.ceil(this.mediaSurfaces.length / 3);
        this.mediaLayout.Grid.setOptions({dimensions: [3, rows]});
        this.mediaLayout.SizeMod.setSize([undefined, this.mediaLayout.DefaultHeight * rows]);


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
        if(this.mediaSurfaces.length > 0){
            this.mediaLayout.Grid.sequenceFrom(this.mediaSurfaces);
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
        // Load more media
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');

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
