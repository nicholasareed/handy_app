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

    require('views/common/ScrollviewGoto');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // // Side menu of options
    // var GameMenuView      = require('views/Game/GameMenu');

    // // Notifications SubView
    // var ConnectedView      = require('./Subviews/Connected');
    // var RecommendedView      = require('./Subviews/Recommended');
    // var EmailOnlyListView      = require('./Subviews/EmailOnlyList');
    // var NewFriendView      = require('./Subviews/NewFriend');
    // var PotentialView      = require('./Subviews/Potential');
    // var IncomingView      = require('./Subviews/Incoming');
    // var OutgoingView      = require('./Subviews/Outgoing');
    
    // Models
    var MediaModel = require('models/media');
    var FriendModel = require('models/friend');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./Subviews/tpl/FriendEmailOnly.html');
    var template            = Handlebars.compile(tpl);

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // Load models
        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 0
        });

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.createHeader();

        this._subviews = [];
        this.createContent();

        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.loadModels = function(player_id){
        var that = this;

        // App.Data.User contains friends

        // Create collection of Games for player_id
        var options = {};
        // if(this.options && this.options.filter){
        //     options['$filter'] = this.options.filter;
        // }
        this.collection = new FriendModel.FriendCollection([],{
            type: 'emailonly'
        });
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addOne, this);
        // this.collection.on("remove", this.removeOne, this); // todo...
        this.collection.infiniteResults = 0;
        this.collection.totalResults = 0;

        this.collection.fetch();

        // this.prior_list = [];

        // Listen for 'showing' events
        this._eventInput.on('inOutTransition', function(args){
            // 0 = direction
            if(args[0] == 'showing'){
                that.collection.fetch();
            }
        });

    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // Invite somebody
        this.headerContent = new View();
        this.headerContent.Invite = new Surface({
            content: '<i class="icon ion-ios7-plus-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Invite.on('longtap', function(){
            Utils.Help('Friend/List/Invite');
        });
        this.headerContent.Invite.on('click', function(){
            // App.Cache.FriendListOptions = {
            //     default: 'outgoing'
            // };
            App.history.navigate('friend/add');
        });

        // Find Recommendations
        this.headerContent.GetRecommendation = new Surface({
            content: '<i class="icon ion-android-microphone"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.GetRecommendation.on('longtap', function(){
            Utils.Help('Friend/List/GetRecommendation');
        });
        this.headerContent.GetRecommendation.on('click', function(){
            // App.history.navigate('friend/potential');
            Utils.Notification.Toast('Concierge Service Unavailable');
        });

        // // Find Friends
        // this.headerContent.PotentialFriends = new Surface({
        //     content: '<i class="icon ion-earth"></i>',
        //     size: [App.Defaults.Header.Icon.w, undefined],
        //     classes: ['header-tab-icon-text-big']
        // });
        // this.headerContent.PotentialFriends.on('click', function(){
        //     App.history.navigate('friend/potential');
        // });


        // create the header
        this.header = new StandardHeader({
            content: "People",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // moreContent: false
            // backContent: false,
            // moreClasses: ["normal-header"],
            moreSurfaces: [
                // this.headerContent.PotentialFriends,
                // this.headerContent.GetRecommendation,
                this.headerContent.Invite
            ]
            // moreContent: "New", //'<span class="icon ion-navicon-round"></span>'
        });
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });

        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // // Node for Modifier and background
        // this.HeaderNode = new RenderNode();
        // this.HeaderNode.add(this.headerBg);
        // this.HeaderNode.add(this.header.StateModifier).add(this.header);

        // Attach header to the layout        
        this.layout.header.add(Utils.usePlane('header')).add(this.header);

    };
    
    PageView.prototype.createContent = function(){
        var that = this;

        this.contentScrollView = new ScrollView();
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        this.createDefaultSurfaces();
        this.createDefaultLightboxes();

        this.contentScrollView.Views.push(this.lightboxButtons);


        // Content
        this.ContentStateModifier = new StateModifier();

        this.layout.content.add(this.ContentStateModifier).add(Utils.usePlane('content')).add(this.contentScrollView);

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
            content: "None to Show",
            size: [undefined, 100],
            classes: ['empty-list-surface-default']
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

    PageView.prototype.addOne = function(Model){
        var that = this;

        var userView = new View(),
            name = Model.get('email') || '&nbsp;none';

        userView.Model = Model;
        userView.Surface = new Surface({
             content: template({
                User: Model.toJSON()
             }), //'<div><span class="ellipsis-all">' +name+'</span></div>',
             size: [undefined, true],
             classes: ['select-friends-list-item-default']
        });
        userView.getSize = function(){
            return [undefined, userView.Surface._size ? userView.Surface._size[1] : undefined]
        };
        userView.Surface.pipe(that.contentScrollView);
        userView.Surface.pipe(that._eventOutput);
        userView.Surface.on('click', function(){
            // App.history.navigate('user/' + Model.get('_id'));
            // Utils.Notification.Toast('Not tap-able');

            var type_name = that.options.args[0],
                type_id = that.options.args[1];
            switch(type_name){
                case 'todo':
                case 'invoice':

                    Utils.Notification.Toast('Saving...');
                    App.history.back();
                    $.ajax({
                        url: App.Credentials.server_root + type_name + '/emailonlyuser/' + type_id,
                        method: 'post',
                        data: {
                            user_friend_id: Model.get('_id')
                        },
                        error: function(err){
                            Utils.Notification.Toast('Failed adding email!');
                        },
                        success: function(result, status){
                            Utils.Notification.Toast('Email Added!');
                        }
                    });
                    break;
                default:
                    console.error('invalid type');
                    break;
            }

        });
        userView.add(userView.Surface);

        this.contentScrollView.Views.splice(this.contentScrollView.Views.length-1, 0, userView);
        this.collection.infiniteResults += 1;

    };

    PageView.prototype.updateCollectionStatus = function() { 
        console.info('updateCollectionStatus');

        this.collection.totalResults = this.collection.length; // App.Data.User.get('friends').length;

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent(amount_left + ' more');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' total');

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.contentScrollView;
            // debugger;
        }

        if(nextRenderable != this.lightboxContent.lastRenderable){
            this.lightboxContent.lastRenderable = nextRenderable;
            this.lightboxContent.show(nextRenderable);
        }

        // Splice out the lightboxButtons before sorting
        this.contentScrollView.Views = _.without(this.contentScrollView.Views, this.lightboxButtons);

        // Resort the contentScrollView.Views
        this.contentScrollView.Views = _.sortBy(this.contentScrollView.Views, function(v){
            console.log(v.Model.get('email').toLowerCase());
            return v.Model.get('email').toLowerCase();
        });

        // this.contentScrollView.Views.push(this.lightboxButtons);

        console.log(this.contentScrollView.Views);

        // Re-sequence?
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

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
            this.lightboxButtons.show(this.infinityLoadedAllSurface);
            // this.$('.loaded-all').removeClass('nodisplay');
        } else {
            // Show more
            // - also includes the number more to show :)
            this.lightboxButtons.show(this.infinityShowMoreSurface);
            // this.$('.show-more').removeClass('nodisplay');
        }

    };

    PageView.prototype.refreshData = function() {
        try {
        }catch(err){};
    };

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        console.log('RemoteRefresh - PageView');
        Utils.RemoteRefresh(this,snapshot);
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        var args = arguments;

        this._eventOutput.emit('inOutTransition', arguments);

        // emit on _subviews
        _.each(this._subviews, function(obj, index){
            obj._eventInput.emit('inOutTransition', args);
        });

        switch(direction){
            case 'hiding':

                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        Timer.setTimeout(function(){

                            that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? 1.5 : -1.5)),0,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;

            case 'showing':
                if(this._refreshData){
                    Timer.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;


                        that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? -1.5 : 1.5)),0,0));

                        // Content
                        // - extra delay
                        Timer.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);


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
