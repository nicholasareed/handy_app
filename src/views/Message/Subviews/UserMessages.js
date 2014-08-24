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

    // Mouse/touch
    var GenericSync = require('famous/inputs/GenericSync');
    var MouseSync = require('famous/inputs/MouseSync');
    var TouchSync = require('famous/inputs/TouchSync');
    GenericSync.register({'mouse': MouseSync, 'touch': TouchSync});

    var Easing = require('famous/transitions/Easing');

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Backbone = require('backbone-adapter');

    // Models
    var UserMessageModel = require("models/user_message");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');

    // Subviews
    var DragOverView = require('views/common/DragOverView');
    var MessagesView      = require('./Messages');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/UserMessage.html');
    var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Showing a list of the Messages per-User
        // - complete list of users, with lastMessage and other details

        this._cachedViews = {};

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // this.contentLayout = new SequentialLayout();
        this.contentLayout = new ScrollView(App.Defaults.ScrollView);
        this.contentLayout.Views = [];
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        // Lightboxes/RenderControllers
        this.lightboxContent = new RenderController();
        // Create LightboxButtons for Render Infinity Buttons (refreshing, etc.)
        this.lightboxButtons = new RenderController({
            size: [undefined, true]
        });

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

        // this.contentLayout.Views.push(this.lightboxButtons); // not using Lightbox buttons when loading everybody! 

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

        this.contentLayout.ZMod = new Modifier({
            transform: function(){
                return Transform.identity;
            }
        });
        this.add(this.contentLayout.ZMod).add(this.contentLayout); // ADDING TO LAYOUT


        // Now add our Dragged-over view

        this.DraggedOverView = new View();
        this.DraggedOverView._position = window.innerWidth;
        this.DraggedOverView.position = new Transitionable(this.DraggedOverView._position);
        this.DraggedOverView.Controller = new RenderController({
            inTransition: false,
            outTransition: false
        });
        this.DraggedOverView.PositionMod = new Modifier({
            transform: function(){
                // console.log(that.DraggedOverView.position);
                var currentPosition = that.DraggedOverView.position.get();
                return Transform.translate(currentPosition, 0, 0); // currentPosition[1]

                // return Transform.translate(that.DraggedOverView.position, 0, 0, {
                //     curve: Easing.easeIn,
                //     duration: 550
                // });
            }
        });
        this.DraggedOverView.ZMod = new Modifier({
            transform: function(){
                // this.contentLayout.ZMod
                // console.log(this.contentLayout.ZMod);
                // debugger;
                return Transform.translate(0,0,0.0001);
            }
        });
        this.DraggedOverView.add(this.DraggedOverView.ZMod).add(this.DraggedOverView.PositionMod).add(this.DraggedOverView.Controller);


        // this.DraggedOverView.Controller.show(this.blankRenderable); // nothing shown by default
        this.add(this.DraggedOverView); // ADDING TO LAYOUT



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

        // Gathering a list of users
        // - no pagination
        this.collection = new UserMessageModel.UserMessageCollection();
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

        this.collection.fetch({prefill: true});

    }

    SubView.prototype.addOne = function(UserMessage) { 
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

        // var other_person_id;
        // // console.info(Message.get('from_user_id'), App.Data.User.get('_id'));
        // if(Message.get('from_user_id') == App.Data.User.get('_id')){
        //     console.info('to', Message.get('from_user_id'), App.Data.User.get('_id'));
        //     console.info('to', Message.get('to_user_id'));
        //     other_person_id = Message.get('to_user_id');
        // } else {
        //     console.info('from', Message.get('from_user_id'), App.Data.User.get('_id'));
        //     other_person_id = Message.get('from_user_id');
        // }
        
        messageView.Surface = new Surface({
            content: template({
                UserMessage: UserMessage.toJSON(),
                ago: moment(UserMessage.get('created')).format('h:mma - MMM Do')
            }),
            size: [undefined, true],
            classes: ['message-text-default'],
            properties: {
                // backgroundColor: "red"
            }

        });
        UserMessage.on('change', function(){
            messageView.Surface.setContent(template({
                UserMessage: UserMessage.toJSON(),
                ago: moment(UserMessage.get('created')).format('h:mma - MMM Do')
            }));
            Utils.dataModelReplaceOnSurface(messageView.Surface);
        });
        // messageView.Surface = new Surface({
        //     content: UserMessage.toJSON(),
        //     size: [undefined, true],
        //     classes: ['message-text-default']
        // });
        // messageView.Surface.on('click', function(){
        //     UserMessage.fetch();
        // });

        // Different sync for each messageView! (instead of a Sequentail/ScrollView-wide one)
        messageView.sync = new GenericSync(['mouse', 'touch']);

        messageView.Surface.pipe(messageView.sync);

        // this.sync.on('start', _handleStart.bind(this));
        messageView.sync.on('start', function(e){
            // Create (or get cached) MessageView

            var id = messageView.Surface.Model.get('_id');
            // console.log(id);

            if(!that._cachedViews[id]){
                that._cachedViews[id] = new View();
                that._cachedViews[id].Bg = new Surface({
                    size: [undefined, undefined],
                    properties: {
                        backgroundColor: "#f8f8f8",
                        borderLeft: "1px solid #ddd"
                    }
                });
                that._cachedViews[id].MessagesView = new MessagesView({
                    filter: {
                        '$or' : [{
                            to_user_id: id
                        },{
                            from_user_id: id
                        }]
                    }
                });


                var ZMod = new Modifier({
                    transform: function(){
                        return Transform.translate(0,0,0.0001);
                    }
                });
                that._cachedViews[id].add(that._cachedViews[id].Bg);
                that._cachedViews[id].add(ZMod).add(that._cachedViews[id].MessagesView);
                
                // blank renderable, for now
                that._cachedViews[id].sync = new GenericSync(['mouse', 'touch']);
                that._cachedViews[id].sync.on('update', function(e){
                    that.DraggedOverView._position += e.delta[0];
                    if(that.DraggedOverView._position < 0){
                        that.DraggedOverView._position = 0;
                    }
                    that.DraggedOverView.position.set(that.DraggedOverView._position); 
                });
                that._cachedViews[id].sync.on('end', function(e){
                    // Update position of other renderable
                    // - showing/hiding?
                    if(e.velocity[0] > 0.05 || that.DraggedOverView._position > window.innerWidth/2){
                        // that.DraggedOverView.position = 0;
                        that.DraggedOverView._position = window.innerWidth;
                    } else {
                        that.DraggedOverView._position = 0;
                    }
                    that.DraggedOverView.position.set(that.DraggedOverView._position, {
                        method : 'spring',
                        period : 150,
                        dampingRatio: 0.9,
                        velocity : e.velocity
                    });
                });
                that._cachedViews[id].Bg.pipe(that._cachedViews[id].sync);
                that._cachedViews[id].MessagesView.pipe(that._cachedViews[id].sync);
            } else {
                console.log(that._cachedViews[id]);
            }

            that.DraggedOverView.Controller.show(that._cachedViews[id]);

        });
        messageView.sync.on('update', function(e){
            // console.log('update');
            // console.log(e);
            // Update position of other renderable
            // that.DraggedOverView.position += e.delta[0];
            // if(that.DraggedOverView.position > window.innerWidth){
            //     that.DraggedOverView.position = window.innerWidth;
            // }
            that.DraggedOverView._position += e.delta[0];
            if(that.DraggedOverView._position > window.innerWidth){
                that.DraggedOverView._position = window.innerWidth;
            }
            // console.log
            that.DraggedOverView.position.set(that.DraggedOverView._position); 
            // , {
            //     method : 'spring',
            //     period : 150,
            //     dampingRatio: 0.9,
            //     velocity : e.velocity
            // });
        });
        messageView.sync.on('end', function(e){
            // Update position of other renderable
            // - showing/hiding?
            if(e.velocity[0] < -0.05 || that.DraggedOverView._position < window.innerWidth/2){
                // that.DraggedOverView.position = 0;
                that.DraggedOverView._position = 0;
            } else {
                that.DraggedOverView._position = window.innerWidth;
            }
            that.DraggedOverView.position.set(that.DraggedOverView._position, {
                method : 'spring',
                period : 150,
                dampingRatio: 0.9,
                velocity : e.velocity
            });
        });

        Utils.dataModelReplaceOnSurface(messageView.Surface);
        messageView.Surface.pipe(this._eventOutput);
        messageView.Surface.pipe(this.contentLayout);
        messageView.Surface.Model = UserMessage;
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
