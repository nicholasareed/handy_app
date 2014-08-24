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
    var FlexibleLayout = require("famous/views/FlexibleLayout");

    var Backbone = require('backbone-adapter');
    var StoryModel = require("models/story");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');
    var moment = require('moment');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/PlayerStoryList.html');
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
        this.layout = new SequentialLayout({
            // size: [undefined, 300]
        });

        this.contentLayout = new SequentialLayout({
            // size: [undefined, 300]
        });
        this.contentLayout.Views = [];

        // Sequence main layout from the game surfaces, and the buttons
        // debugger;
        this.layout.sequenceFrom([
            this.contentLayout, // another SequentialLayout
            this.lightboxButtons
        ]);

        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error

        // this.add(this.layoutSizeMod).add(this.layout); 
        this.add(this.layout);

        // Expecting a player_id in here
        // - might be a promise that will eventually return a player_id on resolve
        if(typeof(options.player_id) === "object"){
            // Promise or array?
            // - fuckstick

            if(typeof options.player_id == typeof []){
                // array
                this.init_with_player(options.player_id);

            } else {
                // Promise

                // Show the Loading page
                this.lightbox.show(this.loadingSurface);

                // After player_id resolves, display the Games
                options.player_id.then(this.init_with_player.bind(this));
            }


        } else {
            // Already have the player_id
            this.init_with_player(options.player_id);
        }

        // this.add(this.lightbox);

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

        // Create collection of Games for player_id
        this.collection = new StoryModel.StoryCollection([], {
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
            //     Utils.Notification.Toast('Attempting to reload games');
            //     this.collection.pager({reset: true});
            // }
        });

        this.collection.on("request", function(){
            // todo

        });

        this.collection.pager({prefill: true});



    }

    SubView.prototype.addOne = function(Story) { 
        var that = this;
        
        // console.log('Adding a Game Surface');
        // console.log(Game);

        var StoryIndex = this.contentLayout.Views.length;

        // gameContent creation function, created at runtime
        var storyFunc = function(){

            var tmpStory = Story.toJSON();

            var bgImage = '';
            if(tmpStory.template_data.bg_pattern){
                bgImage = 'url(img/transparenttextures/' + tmpStory.template_data.bg_pattern.toString() + '.png)';
            }

            return {
                // content: template({
                //     paginator: {
                //         currentPage: that.collection.currentPage + 1,
                //         firstPage: that.collection.firstPage,
                //         totalPages: that.collection.totalPages,
                //         totalResults: that.collection.totalResults
                //     },
                //     story: tmpStory
                // }),
                properties: {
                    backgroundColor: tmpStory.template_data.bg_color,
                    backgroundImage: bgImage,
                    color: tmpStory.template_data.text_color,
                }
            };

        };

        var storyView = new View();

        storyView.height = window.innerWidth;
        if(storyView.height > 400){
            storyView.height = 400;
        }
        // use media_id height if included? (scaled correctly)
        // -todo..

        storyView.SizeMod = new StateModifier({
            size: [undefined, storyView.height]
        });

        var sc = storyFunc();

        // Background surface (Image or Pattern Color)
        storyView.BgSurface = new Surface({
            size: [undefined, undefined],
            content: '',
            properties: sc.properties
        });

        // Create layout
        // - expands to size of container (using .SizeMod above)
        storyView.Layout = new HeaderFooterLayout({
            headerSize: 40,
            footerSize: 40
        });

        // header (name of sport and time)
        storyView.Layout._header = new View();
        storyView.Layout._header.Grid = new GridLayout({
            dimensions: [2,1]
        });
        storyView.Layout._header.add(storyView.Layout._header.Grid);
        // Player Name
        storyView.Layout._header.Player = new Surface({
            content: '<div data-replace-id="'+Story.get('player_id')+'" data-replace-model="Player" data-replace-field="Profile.name">&nbsp;</div>',
            size: [undefined,undefined],
            properties: {
                color: Story.get('template_data').text_color,
                fontWeight: "400",
                paddingLeft: "8px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderBottom: "1px solid #f8f8f8"
            }
        });
        Utils.dataModelReplaceOnSurface(storyView.Layout._header.Player);
        storyView.Layout._header.Player.pipe(this._eventOutput);
        // Datetime (ago)
        storyView.Layout._header.DateTime = new Surface({
            content: moment(Story.get('created')).fromNow(true),
            size: [undefined,undefined],
            properties: {
                color: Story.get('template_data').text_color,
                fontWeight: "100",
                textAlign: "right",
                paddingRight: "8px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderBottom: "1px solid #f8f8f8"
            }
        });
        storyView.Layout._header.DateTime.pipe(this._eventOutput);
        // SequenceFrom
        storyView.Layout._header.Grid.sequenceFrom([
            storyView.Layout._header.Player,
            storyView.Layout._header.DateTime
        ]);
        // Add header to local HeaderFooterLayout
        storyView.Layout.header.add(storyView.Layout._header)

        // content
        storyView.Layout._content = new View();
        storyView.Layout._content.BgSurface = new Surface({
            size: [undefined, undefined]
        });
        storyView.Layout._content.BgSurface.pipe(this._eventOutput);
        storyView.Layout._content.Surface = new Surface({
            content: Story.get('template_data').headline,
            size: [undefined,true],
            properties: {
                textAlign: "center",
                color: Story.get('template_data').text_color,
                fontWeight: "bold",
                fontSize: "21px",
                textShadow: "0px 0px 1px #555"
            }
        });
        storyView.Layout._content.Surface.pipe(this._eventOutput);
        storyView.Layout._content.BgSurface.on('click', function(){
            App.history.navigate('game/' + Story.get('game_id')._id);
        });
        storyView.Layout._content.Surface.on('click', function(){
            App.history.navigate('game/' + Story.get('game_id')._id);
        });
        var originMod = new StateModifier({
            origin: [0, 0.5]
        });
        var sizeMod = new StateModifier({
            size: [undefined, undefined],
        });
        storyView.Layout._content.add(storyView.Layout._content.BgSurface);
        storyView.Layout._content.add(originMod).add(storyView.Layout._content.Surface);
        storyView.Layout.content.add(storyView.Layout._content)


        // footer (likes and comments)
        storyView.Layout._footer = new View();
        // storyView.Layout._footer.BgSurface = new Surface({
        //     size: [undefined, undefined]
        // });
        // storyView.Layout._footer.BgSurface.pipe(this._eventOutput);
        storyView.Layout._footer.Grid = new FlexibleLayout({
            ratios: [1, true, true]
        });
        storyView.Layout._footer.add(storyView.Layout._footer.Grid);
        // Sport Name
        storyView.Layout._footer.Sport = new Surface({
            content: Story.get('sport_id').name,
            size: [undefined,undefined],
            properties: {
                color: Story.get('template_data').text_color,
                fontWeight: "400",
                paddingLeft: "8px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderTop: "1px solid #f8f8f8"
            }
        });
        storyView.Layout._footer.Sport.pipe(this._eventOutput);
        // Likes
        storyView.Layout._footer.Likes = new Surface({
            content: '', //'<i class="icon ion-heart"></i> 3',
            size: [70,undefined],
            properties: {
                color: Story.get('template_data').text_color,
                // fontWeight: "100",
                textAlign: "left",
                // paddingRight: "8px",
                fontSize: "18px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderTop: "1px solid #f8f8f8"
            }
        });
        storyView.Layout._footer.Likes.pipe(this._eventOutput);
        // Comments
        storyView.Layout._footer.Comments = new Surface({
            content: '', //'<i class="icon ion-chatbubble"></i> 2',
            size: [70,undefined],
            properties: {
                color: Story.get('template_data').text_color,
                // fontWeight: "100",
                textAlign: "left",
                // paddingRight: "8px",
                fontSize: "18px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderTop: "1px solid #f8f8f8"
            }
        });
        storyView.Layout._footer.Comments.pipe(this._eventOutput);
        // SequenceFrom
        storyView.Layout._footer.Grid.sequenceFrom([
            storyView.Layout._footer.Sport,
            storyView.Layout._footer.Likes,
            storyView.Layout._footer.Comments
        ]);
        // Add header to local HeaderFooterLayout
        storyView.Layout.footer.add(storyView.Layout._footer)

        storyView.Layout._footer.on('click', function(){
            App.history.navigate('game/' + Story.get('game_id')._id);
        });

        // Add layout and background to rendertree
        var sizeNode = storyView.add(storyView.SizeMod);
        sizeNode.add(storyView.BgSurface);
        sizeNode.add(storyView.Layout);


        // storyView.OriginMod = new StateModifier({
        //     // origin: [0.5, 0.5]
        // });
        // storyView.add(storyView.OriginMod).add(storyView.Surface);

        storyView.Layout.Model = Story;

        // Utils.dataModelReplaceOnSurface(storyView.Surface);

        Story.on('change', function(){
            // re-render the story...
            // - todo...
            // var sc = storyContent();
            // storyView.Surface.setContent(sc.content);
            // storyView.Surface.setProperties(sc.properties);

            // Utils.dataModelReplaceOnSurface(storyView.Surface);

            console.error('not yet re-rendering a story on "change" event');

        }, this);

        // storyView.Surface.pipe(this._eventOutput);
        // storyView.Layout.on('click', function(){
        //     App.history.navigate('game/' + Story.get('game_id')._id);
        // });
    

        storyView.getSize = function(){
            // debugger;
            return [undefined, storyView.height];
        };

        this.contentLayout.Views.push(storyView);
        this.collection.infiniteResults += 1;

        // if(!this.contentLayout.isSeq){
            // this.contentLayout.isSeq = true;
            this.contentLayout.sequenceFrom(this.contentLayout.Views);
        // }

    };

    SubView.prototype.updateCollectionStatus = function() { 

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent('Show More (' + amount_left + ')');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total Highlights');

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


        // // Resort the contentLayout.Views
        // this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(surface){
        //     var m = moment(surface.Model.get('start_time'));
        //     return m.format('X') * -1;
        // });

        // Re-sequence
        if(this.contentLayout.Views.length > 0){
            this.contentLayout.sequenceFrom(this.contentLayout.Views);
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
