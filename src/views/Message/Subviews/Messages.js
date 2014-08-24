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
    var MessageModel = require("models/message");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/Message.html');
    var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Load models
        this.loadModels();

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
        this.lightboxButtons.getSize = function(){
            var s = this._renderables[this._showing].getSize(true);
            if(!s){
                return [undefined, true];
            }
            return [undefined, s[1]];
        };

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: '<i class="icon ion-loading-c"></i>',
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.emptyListSurface = new Surface({
            content: 'None to show',
            size: [undefined, 100],
            classes: ['empty-list-surface-default']
        });

        // Show loading surface
        this.lightboxContent.show(this.loadingSurface);

        // Loading Button Renderables

        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default']
        });
        this.infinityLoadingSurface.pipe(this.contentLayout);

        // Loaded 'em all!
        // - shows "X total games"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default']
        });
        this.infinityLoadedAllSurface.pipe(this.contentLayout);

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default']
        });
        this.infinityShowMoreSurface.pipe(this.contentLayout);
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });

        // Show loading surface (in buttons lightbox)
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
        var options = {};
        if(this.options && this.options.filter){
            options['$filter'] = this.options.filter;
        }
        this.collection = new MessageModel.MessageCollection([],options);
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

        // Listen for 'showing' events
        this._eventInput.on('inOutTransition', function(args){
            // 0 = direction
            if(args[0] == 'showing'){
                that.collection.pager();
            }
        });

    }

    SubView.prototype.addOne = function(Message) { 
        var that = this;
        
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

        // var media = Message.get('media_id');
        // if(!media){
        //     return; // media not ready yet? or invalid?
        // }
        var messageView = new View();
        // var imageSrc = '';
        // try {
        //     imageSrc = media.urls.thumb300x300;
        // }catch(err){
        //     // Not yet assembled
        //     imageSrc = 'img/ajax-loader.gif'; // spinner
        //     Timer.setTimeout(function(){
        //         that.collection.once('sync', function(){
        //             media = Message.get('media_id');
        //             imageSrc = media.urls.thumb300x300;
        //             messageView.Surface.setContent(template({
        //                 player_id: Message.get('player_id'),
        //                 ago: moment(Message.get('created')).format('h:mma - MMM Do'),
        //                 image_src: imageSrc
        //             }));
        //         },2000);
        //         that.collection.fetch();
        //     }, 10000);
        // }

        var other_person_id;
        // console.info(Message.get('from_user_id'), App.Data.User.get('_id'));
        if(Message.get('from_user_id') == App.Data.User.get('_id')){
            console.info('to', Message.get('from_user_id'), App.Data.User.get('_id'));
            console.info('to', Message.get('to_user_id'));
            other_person_id = Message.get('to_user_id');
        } else {
            console.info('from', Message.get('from_user_id'), App.Data.User.get('_id'));
            other_person_id = Message.get('from_user_id');
        }

        var surfaceData = function(){
            
            var content = template({
                message: Message.toJSON(),
                other_person_id: other_person_id,
                show_other_person: that.options.show_other_person,
                ago: moment(Message.get('created')).format('h:mma - MMM Do'),
                // image_src: imageSrc
            })

            return {
                content: content
            };
        };
        
        messageView.Surface = new Surface({
            content: surfaceData().content,
            size: [undefined, true],
            classes: ['message-text-default']
        });
        Utils.dataModelReplaceOnSurface(messageView.Surface);

        Message.on('change', function(){
            messageView.Surface.setContent(surfaceData().content);
            Utils.dataModelReplaceOnSurface(messageView.Surface);
        });

        messageView.Surface.pipe(this._eventOutput);
        messageView.Surface.pipe(this.contentLayout);
        messageView.Surface.Model = Message;
        messageView.add(messageView.Surface);
        messageView.getSize = function(){
            if(messageView.Surface.getSize(true)){
                return [undefined, messageView.Surface.getSize(true)[1]];
            }
            return [undefined, undefined];
        };

        // Splice in
        this.contentLayout.Views.splice(this.contentLayout.Views.length-1,0,messageView);
        this.collection.infiniteResults += 1;

        // if(!this.contentLayout.isSeq){
            // this.contentLayout.isSeq = true;
            this.contentLayout.sequenceFrom(this.contentLayout.Views);
        // }

        console.log(this.contentLayout.Views);

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

        // // Splice out the lightboxButtons before sorting
        // this.contentLayout.Views.pop();

        // Resort the contentLayout.Views
        this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(v){
            try {
                var m = moment(v.Surface.Model.get('created'));
                return m.format('X') * -1;
            }catch(err){
                // normal view?
                if(v.Surface){
                    console.error('====', v);
                }
                return 1000000;
            }
        });

        // this.contentLayout.Views.push();

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
