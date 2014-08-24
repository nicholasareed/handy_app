/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Helpers
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    var Handlebars = require('lib2/handlebars-helpers');

    var TabBar = require('famous/widgets/TabBar');
    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Subviews
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // // Side menu of options
    // var GameMenuView      = require('views/Game/GameMenu');

    // // Notifications SubView
    // var NotificationsView      = require('./Notifications');
    var MessagesView      = require('./Subviews/Messages');
    // var UserMessagesView      = require('./Subviews/UserMessages');

    // Models
    // var GameModel = require('models/game');
    // var PlayerModel = require('models/player');
    var MediaModel = require('models/media');
    var MessageModel = require('models/message');
    var UserMessageModel = require("models/user_message");
    var ProfileModel = require("models/profile");

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./Subviews/tpl/Message.html');
    var template            = Handlebars.compile(tpl);

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();

        this._subviews = [];

        this.createContent();

        this.model.populated().then(function(){
            that.header.navBar.setContent(that.model.get('profile.name'));
        });


        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.loadModels = function(){
        var that = this;

        this.model = new ProfileModel.Profile({
            _id: this.options.args[0]
        });
        this.model.fetch({prefill: true});

        // Gathering a list of users
        // - no pagination
        this.collection = new MessageModel.MessageCollection([],{
            '$filter': {
                '$or' : [{
                    to_user_id: this.model.get('_id')
                },{
                    from_user_id: this.model.get('_id')
                }]
            }
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

        this.collection.fetch({prefill: true});

    }

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // Invite somebody
        this.headerContent = new View();
        this.headerContent.NewMessage = new Surface({
            content: '<i class="icon ion-ios7-plus-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.NewMessage.on('click', function(){
            // App.Cache.FriendListOptions = {
            //     default: 'outgoing'
            // };

            Timer.setTimeout(function(){

                var p = prompt('Your Message:');
                if(!p || p.trim() == ''){
                    return;
                }

                Utils.Notification.Toast('Saving...');

                // Get elements to save
                var Message = new MessageModel.Message({
                    to_user_id: that.model.get('_id'),
                    text: p
                    // media: this.summary.media
                });

                console.log(Message.toJSON());

                Message.save()
                    .then(function(newModel){

                        // console.log('----');
                        // console.log(newModel);
                        // console.log(that.model.toJSON());
                        // debugger;

                        that.model.set(newModel);
                        // console.log(that.model.toJSON());
                        // debugger;


                        // Created OK
                        Utils.Notification.Toast('Message Created!');

                        // // Enable submit
                        // that.submitButtonSurface.setSize([undefined, 40]);

                        // Clear sport cache
                        // - todo...

                        // Going back to the Dash, or back somewhere else?
                        // App.history.backTo('StartMessageAdd');

                        that.collection.fetch();

                    });

            },200);

            // App.history.navigate('friend/add');
        });

        // create the header
        this.header = new StandardHeader({
            content: "",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // backContent: false,
            moreClasses: ["normal-header"],
            // moreContent: false, //"New", //'<span class="icon ion-navicon-round"></span>'
            moreSurfaces: [
                this.headerContent.NewMessage
            ]
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        // this.header._eventOutput.on('more',function(){
        //     // if(that.model.get('CarPermission.coowner')){
        //     //     App.history.navigate('car/permission/' + that.model.get('_id'), {trigger: true});
        //     // }
        //     // that.menuToggle();

        //     // Modify Last
        //     App.history.modifyLast({
        //         tag: 'StartMessageAdd'
        //     });
        //     App.history.navigate('message/add',{history: false});

        // });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // // Node for Modifier and background
        // this.HeaderNode = new RenderNode();
        // this.HeaderNode.add(this.headerBg);
        // this.HeaderNode.add(this.header.StateModifier).add(this.header);

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };
    
    PageView.prototype.createContent = function(){
        var that = this;

        // this.createDefaultSurfaces();
        // this.createDefaultLightboxes();

        // this.contentLayout = new SequentialLayout();
        this.contentLayout = new ScrollView();
        this.contentLayout.Views = [];
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        this.createDefaultSurfaces();
        this.createDefaultLightboxes();

        this.contentLayout.Views.push(this.lightboxButtons);

        this.ContentStateModifier = new StateModifier();

        // Attach header to the layout        
        this.layout.content.add(this.ContentStateModifier).add(this.lightboxContent);

    };

    PageView.prototype.createDefaultSurfaces = function(){
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
            content: "No messages exchanged",
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
                // backgroundColor: 'red'
            }
        });
        this.emptyListSurface.pipe(this._eventOutput);
        this.emptyListSurfaceNoFriends = new Surface({
            // content: "You should add some friends to hang out with!",
            content: "You've invited all your friends on ulu!",
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
                // backgroundColor: 'red'
            }
        });
        this.emptyListSurfaceNoFriends.pipe(this._eventOutput);


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

        // // Select everybody
        // this.SelectAllButton = new Surface({
        //     size: [undefined, 60],
        //     content: '<div class="outward-button">' + 'Select Everybody' + '</div>',
        //     classes: ['button-outwards-default'],
        // });
        // this.SelectAllButton.pipe(this._eventOutput);
        // this.SelectAllButton.on('click', function(){
        //     // Clear the list
        //     that.collection.set([]);

        //     // Make the request
        //     var UserSelect = new UserSelectModel.UserSelect();
        //     UserSelect.select('all')
        //     .then(function(){
        //         // App.history.navigate('user/sentence_friends/' + CryptoJS.SHA3(new Date().toString()));
        //         that.collection.fetch();
        //     })
        //     .fail(function(){
        //         Utils.Notification.Toast('Failed inviting everybody');
        //         that.collection.fetch();
        //     });
        // });
    };

    PageView.prototype.createDefaultLightboxes = function(){
        var that = this;

        // Content Lightbox
        this.lightboxContent = new RenderController();
        this.lightboxContent.show(this.loadingSurface);
        this.lightboxContent.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    this.lastSize = [undefined, s[1]];
                    return [undefined, s[1]];
                }
            }catch(err){}
            // Last Size?
            if(this.lastSize){
                return this.lastSize;
            }
            return [undefined, true];
        };

        // Buttons lightbox
        this.lightboxButtons = new RenderController();
        this.lightboxButtons.show(this.infinityLoadingSurface);
        this.lightboxButtons.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    this.lastSize = [undefined, s[1]];
                    return [undefined, s[1]];
                }
            }catch(err){}
            // Last Size?
            if(this.lastSize){
                return this.lastSize;
            }
            return [undefined, true];
        };

    };

    PageView.prototype.addOne = function(Message) { 
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

        var messageView = new View();

        messageView.Model = Message;
            
        var classes = ['message-text-default'];
        if(Message.get('from_user_id') == App.Data.User.get('_id')){
            classes.push('from_me');
        }
        messageView.Surface = new Surface({
            content: template({
                Message: Message.toJSON(),
                ago: moment(Message.get('created')).format('h:mma - MMM Do')
            }),
            size: [undefined, true],
            classes: classes,
            properties: {
                // backgroundColor: "red"
            }

        });
        Message.on('change', function(){
            messageView.Surface.setContent(template({
                Message: Message.toJSON(),
                ago: moment(Message.get('created')).format('h:mma - MMM Do')
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


        Utils.dataModelReplaceOnSurface(messageView.Surface);
        // messageView.Surface.pipe(this._eventOutput);
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

    // PageView.prototype.removeOne = function(Model){
    //     var that = this;

    //     this.contentLayout.Views = _.filter(this.contentLayout.Views, function(tmpView){
    //         if(!tmpView.Model){
    //             return true;
    //         }
    //         return tmpView.Model.get('_id') === Model.get('_id') ? false: true;
    //     });

    //     this.updateCollectionStatus();

    // };

    PageView.prototype.updateCollectionStatus = function() { 
        console.info('updateCollectionStatus');

        this.collection.totalResults = this.collection.length;

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent(amount_left + ' more');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' total');

        var nextRenderable;
        if(this.collection.length == 0){
            nextRenderable = this.emptyListSurface;
            // if(this.friend_collection.length == 0){
            //     nextRenderable = this.emptyListSurfaceNoFriends;
            // }
        } else {
            nextRenderable = this.contentLayout;
        }

        if(nextRenderable != this.lightboxContent.lastRenderable){
            this.lightboxContent.lastRenderable = nextRenderable;
            this.lightboxContent.show(nextRenderable);
        }

        // Splice out the lightboxButtons before sorting
        var popped = this.contentLayout.Views.pop();
        // this.contentLayout.Views = _.without(this.contentLayout.Views, this.SelectAllButton);

        // Resort the contentLayout.Views
        this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(v){
            // console.log(v.Model.get('created'));
            return moment(v.Model.get('created')).format('X');
        });

        // re-add buttons
        // if(this.collection.length > 0){
        //     this.contentLayout.Views.unshift(this.SelectAllButton);
        // }
        this.contentLayout.Views.push(popped);

        console.log(this.contentLayout.Views);

        // Re-sequence?
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        // Show correct infinity buttons (More, All, etc.)
        this.render_infinity_buttons();

    };

    PageView.prototype.render_infinity_buttons = function(){
        // Renders the correct infinity-list buttons (the "Show More" or "Is loading" button/hint) at the bottom of the page

        // // Hide all dat shit
        // // - unnecessary?
        // this.$('.load-list').addClass('nodisplay');

        // at the end?
        if(this.collection.infiniteResults == this.collection.totalResults){
            // this.lightboxButtons.show(this.infinityLoadedAllSurface);
            this.lightboxButtons.hide();
        } else {
            // Show more
            // - also includes the number more to show :)
            // this.lightboxButtons.show(this.infinityShowMoreSurface);
            this.lightboxButtons.hide();
        }

    };

    PageView.prototype.refreshData = function() {
        try {
            // this.model.fetch();
            // this.media_collection.fetch();
            // this.errorList.fetch();
            // this.alert_collection.fetch();
            // this.CarTripListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        var args = arguments;

        this._eventOutput.emit('inOutTransition', arguments);

        // emit on subviews
        _.each(this._subviews, function(obj, index){
            obj._eventInput.emit('inOutTransition', args);
        });

        switch(direction){
            case 'hiding':

                switch(otherViewName){
                    case 'Fleet':

                        // No animation by default
                        transitionOptions.outTransform = Transform.identity;

                        // Wait for timeout of delay to hide
                        window.setTimeout(function(){

                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Hide content from a direction
                            // if(goingBack){

                            // that.ContentStateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);
                            // } else {
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);
                            // }

                        }, delayShowing);

                        break;

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        window.setTimeout(function(){

                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide down
                            // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

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

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        // Header
                        window.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);


                        }, delayShowing);

                        // Content
                        // - extra delay
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);

                        // //Fade out the header
                        // // var previousTransform = transitionOptions.outTransform;
                        // transitionOptions.outTransform = Transform.identity;

                        // // Move the content to the left
                        // // - not the footer
                        // // console.log(transitionOptions.outTransform);
                        // // debugger;
                        // window.setTimeout(function(){

                        //     // Bring map content back
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        //     // Bring Footer Up
                        //     that.layout.footer.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.outTransition);

                        // }, delayShowing);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
        },
        footer: {
            size: [0,0]
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