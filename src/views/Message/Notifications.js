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
    var NotificationModel = require("models/notification");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    // var tpl                 = require('text!./tpl/PlayerGameList.html');
    // var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // this.contentLayout = new SequentialLayout();
        this.contentLayout = new ScrollView(App.Defaults.ScrollView);
        this.contentLayout.Views = [];
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        // Lightboxes/RenderControllers
        this.lightboxContent = new RenderController();
        // Create LightboxButtons for Render Infinity Buttons (refreshing, etc.)
        this.lightboxButtons = new RenderController();

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: '<i class="icon ion-loading-c"></i>',
            size: [undefined, 100],
            classes: ['loading-surface-default'],
            properties: {
                // backgroundColor: "red"
            }
        });
        this.emptyListSurface = new Surface({
            content: 'None to show',
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
            }
        });

        // Show loading surface
        this.lightboxContent.show(this.loadingSurface);

        // Loading Button Renderables

        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default'],
            properties: {
            }
        });
        this.infinityLoadingSurface.pipe(this.contentLayout);

        // Loaded 'em all!
        // - shows "X total games"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default'],
            properties: {
            }
        });
        this.infinityLoadedAllSurface.pipe(this.contentLayout);

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default'],
            properties: {
            }
        });
        this.infinityShowMoreSurface.pipe(this.contentLayout);
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });

        // Show loading surface
        this.lightboxButtons.show(this.infinityLoadingSurface);

        this.contentLayout.Views.push(this.lightboxButtons);

        // // this.lightboxButtons.setOptions({
        // //     size: [undefined, true]
        // // });

        // // Using a SequentialLayout
        // this.layout = new SequentialLayout({
        //     // size: [undefined, 300]
        // });

        // // this.lightboxContent.add(this.contentLayout);

        // // Sequence main layout from the game surfaces, and the buttons
        // this.layout.sequenceFrom([
        //     // this.contentLayout, // another SequentialLayout
        //     this.lightboxContent,
        //     this.lightboxButtons
        // ]);

        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error
        this.add(this.lightboxContent);

        // this.bgSurface = new Surface({
        //     size: [undefined, undefined],
        //     properties: {
        //         backgroundColor: 'blue'
        //     }
        // });
        // this.add(this.bgSurface);

        // Load models
        this.loadModels();

        // // Show the Loading page
        // this.lightboxContent.show(this.loadingSurface);

        // After

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;


    SubView.prototype.loadModels = function(player_id){
        var that = this;

        // Clear loading, if it exists

        // Create collection of Games for player_id
        this.collection = new NotificationModel.NotificationCollection();
        this.collection.infiniteResults = 0;
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addOne, this);
        this.collection.on("error", function(){
            console.error('Collection error');
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

    }

    SubView.prototype.addOne = function(Notification) { 
        var that = this;
        
        // console.log('Adding a Game Surface');
        // console.log(Game);

        var NotificationIndex = this.contentLayout.Views.length;
        // console.log(this.collection);
        // debugger;

        var tmpView = new View();
        // tmpView.StateModifier = new StateModifier();
        tmpView.Surface = new Surface({
            size: [undefined, 40],
            content: Notification.get('details.name'),
            properties: {
                color: "white",
                backgroundColor: "hsl(" + ((NotificationIndex + 21) * 360 / 40) + ", 100%, 50%)",
                // backgroundColor: "red",
                borderBottom: "1px solid #eee",
                // backgroundColor: "white",
                // overflow: "hidden"
            }
        });
        tmpView.add(tmpView.Surface);
        tmpView.Model = Notification;
        // Utils.dataModelReplaceOnSurface(gameSurface);
        // Game.on('change', function(){
        //     gameSurface.setContent(gameContent());
        //     Utils.dataModelReplaceOnSurface(gameSurface);
        // }, this);
        tmpView.Surface.pipe(this.contentLayout);
        tmpView.Surface.pipe(this._eventOutput);
        tmpView.Surface.on('click', function(){
            // App.history.navigate('game/' + Game.get('_id'), {trigger: true});
        });

        this.contentLayout.Views.splice(this.contentLayout.Views.length-1,0,tmpView);
        this.collection.infiniteResults += 1;

        // if(!this.contentLayout.isSeq){
        //     this.contentLayout.isSeq = true;
        //     this.contentLayout.sequenceFrom(this.contentLayout.Views);
        // }

    };

    SubView.prototype.updateCollectionStatus = function() { 

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent(amount_left + ' more');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' total');

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.contentLayout;
        }

        if(nextRenderable != this.lightboxContent.lastRenderable){
            this.lightboxContent.lastRenderable = nextRenderable;
            this.lightboxContent.show(nextRenderable);
        }


        // // Resort the contentLayout.Views
        // this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(surface){
        //     var m = moment(surface.Model.get('start_time'));
        //     return m.format('X') * -1;
        // });

        // Re-sequence?
        if(this.contentLayout.Views.length > 0){
            this.contentLayout.sequenceFrom(this.contentLayout.Views);
        }

        // this.layout.sequenceFrom([]);
        // this.layout.sequenceFrom([
        //     // this.contentLayout, // another SequentialLayout
        //     this.lightboxContent,
        //     this.lightboxButtons
        // ]);

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

    SubView.prototype.refresh_any_new = function(){
        // Load any newly-created (since we last loaded) models
        // - todo...

        // bascially like next_page, right?

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
