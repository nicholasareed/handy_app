
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var ModifiedScrollView = require('views/common/ModifiedScrollView');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Lightbox = require('famous/views/Lightbox');
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

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');

    var TabBar = require('famous/widgets/TabBar');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var EventHandler = require('famous/core/EventHandler');

    var $ = require('jquery');
    var Credentials = JSON.parse(require('text!credentials.json'));

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    var StandardTabBar = require('views/common/StandardTabBar');

    // Extras
    var Utils = require('utils');
    var _ = require('underscore');
    var numeral = require('lib2/numeral.min');
    var crypto = require('lib2/crypto');

    // Models
    var PlayerModel = require('models/player');
    var EventModel = require('models/event');

    // Subviews

    // event Results
    var EventResultsView      = require('views/Event/Subviews/EventResults');

    // event story/chat
    var EventStoryListView      = require('views/Event/Subviews/EventStoryList');

    // event story/chat
    var EventSpotListView      = require('views/Event/Subviews/EventSpotList');

    // event Sharing
    var EventShareView      = require('views/Event/Subviews/EventShare');

    // // event Media (unused atm)
    // var PlayereventListView      = require('views/Player/PlayereventList');

    // // Media Blocks
    // var PlayerMediaBlocksView      = require('views/Player/PlayerMediaBlocks');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.event_id = that.options.args[0];
        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });


        this.createContent();
        this.createHeader();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

        this.model.populated().then(function(){

            // Show user information
            that.contentLightbox.show(that.contentScrollView);

            // // Show Certify, Certified, or Nothing
            // // - determine is_me
            // if(that.model.get('is_me') == true && that.model.get('user_id') == App.Data.User.get('_id')){
            //     console.error('is_me!');
            //     that.profileRight.Layout.show(that.profileRight.EditProfile);
            // } else if (that.model.get('connected_user_id') == App.Data.User.get('_id')){
            //     console.error('is_me!');
            //     that.profileRight.Layout.show(that.profileRight.EditProfile);
            // } else {
            //     that.is_me = false;
            //     console.error('Not is_me!');

            //     // Connected to this person?
            //     // console.log(that.model.get('related_player_ids'));
            //     // console.log(App.Data.Players.findMe().get('related_player_ids'));
            //     // console.log(_.intersection(that.model.get('related_player_ids'),App.Data.Players.findMe().get('related_player_ids')));
            //     // console.log(that.model.toJSON());
            //     var my_friend_player_ids = _.pluck(App.Data.Players.toJSON(), '_id');
            //     // console.log(my_friend_player_ids);
            //     if(_.intersection(that.model.get('related_player_ids'),my_friend_player_ids).length > 0){
            //         that.profileRight.Layout.show(that.profileRight.Connected);
            //     } else {
            //         that.profileRight.Layout.show(that.profileRight.Connect);
            //     }
            // }

            // update going forward
            that.update_content();
            that.model.on('change', that.update_content.bind(that));

        });


        // // Get my stats
        // that.stats_collection = new EventModel.eventCollection([],{
        //     player_id: player_id
        // });
        // // that.stats_collection.
        // that.stats_collection.fetch({prefill: true, limit: 0});
        // that.stats_collection.populated().then(function(){
        //     that.update_content();
        //     that.stats_collection.on('sync', that.update_content.bind(that));
        // });

        // // Player list
        // that.player_collection = new PlayerModel.PlayerCollection([],{
        //     player_id: player_id
        // });
        // that.player_collection.on("sync", function(collection){
        //     // console.info(that.player_collection.toJSON().length);
        //     var tmpCount = that.player_collection.toJSON().length - 1;
        //     if(tmpCount < 0){
        //         tmpCount = 0;
        //     }
        //     that.profileRight.OverallRecord.Right.setContent('<div>'+tmpCount.toString()+'</div><div>Nemeses</div>');
        // });
        // that.player_collection.fetch({prefill: true});

        // window.setTimeout(function(){
        //     KnowPlayerId.resolve("529c02f00705435badb1dff5");
        // },3000);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.loadModels = function(){
        var that = this;

        // Models
        this.model = new EventModel.Event({
            _id: this.event_id
        });

        // Event removed?
        this.model.on('error', function(model, resp){
            if(resp.status == 410){
                // Event deleted

                App.history.back();

                Timer.setTimeout(function(){
                    Utils.Popover.Buttons({
                        title: 'Event Removed',
                        text: null,
                        buttons: [{
                            text: 'OK'
                        }]
                    });
                },500);

                return;
            }
        });

        this.model.fetch({prefill: true});
    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // -- settings (lightbox)
        this.headerContent = new View();
        this.headerContent.SettingsLightbox = new RenderController();
        this.headerContent.SizeMod = new StateModifier({
            size: [60, 50]
        });
        this.headerContent.add(this.headerContent.SizeMod).add(this.headerContent.SettingsLightbox);
        this.headerContent.Settings = new Surface({
            content: '<i class="icon ion-gear-a"></i><div>Options</div>',
            size: [60, undefined],
            classes: ['header-tab-icon-text']
        });
        this.headerContent.Settings.on('click', function(){
            that.popover_options();
        });
        // - spacer1
        this.headerContent.spacer1 = new Surface({
            content: '<span></span>',
            size: [16, undefined],
            classes: ['header-tab-spacer-default']
        });

        // Updates?
        // - todo...

        // - spacer2
        this.headerContent.spacer2 = new Surface({
            content: '<span></span>',
            size: [16, undefined],
            classes: ['header-tab-spacer-default']
        });

        // - share (always visible)
        this.headerContent.Share = new Surface({
            content: '<i class="icon ion-android-share"></i><div>Share</div>',
            size: [60, undefined],
            classes: ['header-tab-icon-text']
        });
        this.headerContent.Share.on('click', function(){
            that.popover_share();
        });

        // create the header
        this.header = new StandardHeader({
            content: "Event",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            // moreContent: '<span class="icon ion-refresh"></span>'
            moreSurfaces: [
                this.headerContent,
                // this.headerContent.spacer1,
                // this.headerContent.spacer2,
                // this.headerContent.Share
            ]
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click',function(){
            // that.refreshData();
            App.history.back();
        });
        this.header._eventOutput.on('more',function(){
            that.refreshData();
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;

        // create the content
        this.contentScrollView = new ScrollView();
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // // Pipe edgeHit (bottom) to next_page
        // this.contentScrollView.on('edgeHit', function(data){
        //     var position = parseInt(this.getPosition(), 10);
        //     if(that.lastEdgeHit == position){
        //         return;
        //     }
        //     that.lastEdgeHit = position;

        //     // At beginning?
        //     if(position <= 0){
        //         return;
        //     }

        //     // // Probably all good to try and update
        //     // that.PlayereventListView.next_page.call(that.PlayereventListView);
        // });

        // top of event
        // - Sport Name
        // - if I have it starred (todo)
        // - if I need to certify

        this.createEventTop();
        this.createTabs();

        this.ContentStateModifier = new StateModifier();

        // Content Lightbox
        // - waiting for the user to load a bit
        this.contentLightbox = new RenderController();
        this.loadingUser = new View();
        this.loadingUser.StateModifier = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.loadingUser.Surface = new Surface({
            content: '<i class="icon ion-loading-c"></i>',
            size: [true, true],
            properties: {
                fontSize: "40px",
                textAlign: "center",
                color: "#444",
                lineHeight: "50px"
            }
        });
        this.loadingUser.add(this.loadingUser.StateModifier).add(this.loadingUser.Surface);
        this.contentLightbox.show(this.loadingUser);

        // this.layout.content.add(this.ContentStateModifier).add(this.mainNode);
        this.layout.content.add(this.ContentStateModifier).add(this.contentLightbox);

    };

    PageView.prototype.createEventTop = function(){
        var that = this;

        this.eventTopLayout = new View();
        this.eventTopLayout.SeqLayout = new SequentialLayout();
        this.eventTopLayout.SeqLayout.Views = [];
        this.eventTopLayout.add(this.eventTopLayout.SizeMod).add(this.eventTopLayout.SeqLayout);

        this.eventTopLayout.getSize = function(){
            var v = that.eventTopLayout.SeqLayout.getSize(true);
            // console.log(v);
            return v;
        };

        // Spacer
        this.eventTopLayout.topSpacer1 = new Surface({
            content: '',
            size: [undefined, 10]
        });
        this.eventTopLayout.SeqLayout.Views.push(this.eventTopLayout.topSpacer1);

        // Title / Name
        this.eventTopLayout.Title = new View();
        this.eventTopLayout.Title.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.eventTopLayout.Title.Surface = new Surface({
            content: '',
            size: [undefined, true],
            // size: [undefined,80],
            // classes: ['ellipsis'],
            properties: {
                backgroundColor: 'white',
                color: '#333',
                fontSize: "18px",
                lineHeight: "20px",
                padding: "4px",
                fontWeight: "bold",
                // textAlign: "center"
            }
        });
        this.eventTopLayout.Title.Surface.pipe(this.contentScrollView);
        this.eventTopLayout.Title.getSize = function(){
            var v = that.eventTopLayout.Title.Surface.getSize(true);
            if(!v){
                return [undefined, undefined];
            }
            return [undefined, v[1]]
        };
        this.eventTopLayout.Title.add(this.eventTopLayout.Title.StateModifier).add(this.eventTopLayout.Title.Surface);
        this.eventTopLayout.SeqLayout.Views.push(this.eventTopLayout.Title);

        // Description
        this.eventTopLayout.Description = new View();
        this.eventTopLayout.Description.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.eventTopLayout.Description.Surface = new Surface({
            content: '',
            size: [undefined, true],
            // size: [undefined,80],
            // classes: ['ellipsis'],
            properties: {
                backgroundColor: 'white',
                color: '#333',
                fontSize: "16px",
                lineHeight: "18px",
                padding: "4px"
                // fontWeight: "bold",
                // textAlign: "center"
            }
        });
        this.eventTopLayout.Description.Surface.pipe(this.contentScrollView);
        this.eventTopLayout.Description.getSize = function(){
            var v = that.eventTopLayout.Description.Surface.getSize(true);
            if(!v){
                return [undefined, undefined];
            }
            return [undefined, v[1]]
        };
        this.eventTopLayout.Description.add(this.eventTopLayout.Description.StateModifier).add(this.eventTopLayout.Description.Surface);
        this.eventTopLayout.SeqLayout.Views.push(this.eventTopLayout.Description);

        // Datetime
        this.eventTopLayout.EventDatetime = new View();
        this.eventTopLayout.EventDatetime.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.eventTopLayout.EventDatetime.Surface = new Surface({
            content: '',
            size: [undefined, 20],
            // size: [undefined,80],
            // classes: ['ellipsis'],
            properties: {
                backgroundColor: 'white',
                color: '#888',
                fontSize: "14px",
                lineHeight: "20px",
                padding: "0 0 0 4px"
            }
        });
        this.eventTopLayout.EventDatetime.Surface.pipe(this.contentScrollView);
        this.eventTopLayout.EventDatetime.add(this.eventTopLayout.EventDatetime.StateModifier).add(this.eventTopLayout.EventDatetime.Surface);
        this.eventTopLayout.SeqLayout.Views.push(this.eventTopLayout.EventDatetime);

        // Holder for Starred and Certifying
        this.eventTopLayout.StarJoinHolder = new View();
        this.eventTopLayout.StarJoinHolder.SizeMod = new StateModifier({
            size: [undefined, 40]
        });
        this.eventTopLayout.StarJoinHolder.Grid = new FlexibleLayout({
            direction: FlexibleLayout.DIRECTION_X,
            ratios: [1,1] //, 3, true] // content, spacer, content, spacer, content, spacer
        });
        this.eventTopLayout.StarJoinHolder.Grid.Views = [];
        this.eventTopLayout.StarJoinHolder.add(this.eventTopLayout.StarJoinHolder.SizeMod).add(this.eventTopLayout.StarJoinHolder.Grid);

        // Starred
        this.eventTopLayout.Starred = new View();
        this.eventTopLayout.Starred.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.eventTopLayout.Starred.Surface = new Surface({
            content: '',
            size: [undefined, 40],
            classes: ['event-starred-container-default']
        });
        this.eventTopLayout.Starred.Surface.pipe(this.contentScrollView);
        this.eventTopLayout.Starred.Surface.on('click', function(){
            // Shouldn't have to wait for confirmation... (what if offline!)

            var newStarValue = that.isStarred ? false : true;
            // alert(newStarValue);
            if(newStarValue === true){
                that.model.get('Star');
                // debugger;

                var newStarData = {
                    user_id: App.Data.User.get('_id'), // will get updated by the model when it updates
                    player_id: App.Data.Players.findMe().get('_id'),
                    active: true
                };
                var oldStar = that.model.get('Star');
                oldStar.push(newStarData);
                console.log(newStarData);
                that.model.set({
                    Star: oldStar,
                    StarTotal: that.model.get('StarTotal') + 1
                });
                console.log(that.model.get('Star'));
                // debugger;
            } else {
                console.log(that.model.get('Star'));
                // debugger;
                that.model.set({
                    Star: _.filter(that.model.get('Star'), function(StarModel){
                        if(StarModel.user_id == App.Data.User.get('_id')){
                            return false;
                        }
                        console.log(StarModel.user_id, App.Data.User.get('_id'));
                        return true;
                    }),
                    StarTotal: that.model.get('StarTotal') - 1
                });
            }

            that.update_content();

            // patch to server
            $.ajax({
                url: Credentials.server_root + 'event/star/' + that.model.get('_id'),
                method: 'PATCH',
                data: {
                    star: newStarValue // do the opposite of what it already is
                },
                error: function(){
                    Utils.Notification.Toast('Sorry, failed updating!');
                },
                success: function(result){
                    if(result !== true){
                        // Failed somehow
                        Utils.Notification.Toast('Sorry, unable to Star!');
                        return;
                    }

                    // Update the model
                    // - it triggers updates everywhere else, including to this Surface
                    that.model.fetch();

                }
            });


        });
        this.eventTopLayout.Starred.add(this.eventTopLayout.Starred.StateModifier).add(this.eventTopLayout.Starred.Surface);
        this.eventTopLayout.StarJoinHolder.Grid.Views.push(this.eventTopLayout.Starred);

        // Join/Joined
        this.eventTopLayout.Join = new View();
        this.eventTopLayout.Join.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.eventTopLayout.Join.Surface = new Surface({
            content: '',
            size: [undefined, 40],
            classes: ['event-joined-container-default']
        });
        this.eventTopLayout.Join.Surface.pipe(this.contentScrollView);
        this.eventTopLayout.Join.Surface.on('click', function(){
            // join/leave the event
            that.join_event();

        });
        this.eventTopLayout.Join.add(this.eventTopLayout.Join.StateModifier).add(this.eventTopLayout.Join.Surface);
        this.eventTopLayout.StarJoinHolder.Grid.Views.push(this.eventTopLayout.Join);

        // Sequence from FlexibleLayout (2 items)
        this.eventTopLayout.StarJoinHolder.Grid.sequenceFrom(this.eventTopLayout.StarJoinHolder.Grid.Views);

        // add to the SequentialLayout
        this.eventTopLayout.SeqLayout.Views.push(this.eventTopLayout.StarJoinHolder);


        // Spacer
        this.eventTopLayout.topSpacer3 = new Surface({
            content: '',
            size: [undefined, 10]
        });
        this.eventTopLayout.SeqLayout.Views.push(this.eventTopLayout.topSpacer3);

        this.eventTopLayout.SeqLayout.sequenceFrom(this.eventTopLayout.SeqLayout.Views);

        this.eventTopLayout.add(this.eventTopLayout.SeqLayout);

        // this.eventTopLayout.SeqLayout.Views.push(this.eventTopLayout);
        // this.eventTopLayout.SeqLayout.sequenceFrom(this.eventTopLayout.SeqLayout.Views);

        this.contentScrollView.Views.push(this.eventTopLayout);

    };

    PageView.prototype.join_event = function(){
        var that = this;

        if(that.iHaveJoined){
            return;
        }

        that.iHaveJoined = true;

        that.eventTopLayout.Join.Surface.setContent('<span class="ellipsis-all">Joining</span>');
        that.eventTopLayout.Join.Surface.setClasses(['event-joined-container-default','pleasewait']);

        // patch to server
        $.ajax({
            url: Credentials.server_root + 'event/join/' + that.model.get('_id'),
            method: 'PATCH',
            data: {
                join: true // do the opposite of what it already is
            },
            error: function(){
                Utils.Notification.Toast('Sorry, failed joining!');
            },
            success: function(result){
                if(result !== true){
                    // Failed somehow
                    Utils.Notification.Toast('Sorry, unable to join!');
                    return;
                }

                // Update the model
                // - it triggers updates everywhere else, including to this Surface
                that.model.fetch();

                Utils.Notification.Toast('Joined!');

            }
        });

    };

    PageView.prototype.createTabs = function(){
        var that = this;

        // Tab Bar
        this.tabs = new View();
        this.tabs.SizeMod = new StateModifier({
            size: [undefined, 48]
        });
        
        this.tabBar = new TabBar(); 
        this.tabBar.pipe(this.contentScrollView);
        this.tabs.add(this.tabs.SizeMod).add(this.tabBar);

        this.tabBar.defineSection('highlights', {
            content: '<i class="icon ion-flash"></i><div>Highlights</div>',
            onClasses: ['profile-tabbar-default', 'on'],
            offClasses: ['profile-tabbar-default', 'off']
        });
        this.tabBar.defineSection('results', {
            content: '<i class="icon ion-trophy"></i><div>Results</div>',
            onClasses: ['profile-tabbar-default', 'on'],
            offClasses: ['profile-tabbar-default', 'off']
        });
        this.tabBar.defineSection('feed', {
            content: '<i class="icon ion-android-forums"></i><div>Event Chat</div>',
            onClasses: ['profile-tabbar-default', 'on'],
            offClasses: ['profile-tabbar-default', 'off']
        });
        // this.tabBar.defineSection('share', {
        //     content: '<i class="icon ion-android-share"></i><div>Share</div>',
        //     onClasses: ['profile-tabbar-default', 'on'],
        //     offClasses: ['profile-tabbar-default', 'off']
        // });

        this.contentScrollView.Views.push(this.tabs);

        // tabBar RenderController
        this.tabBar.Layout = new View();
        this.tabBar.Layout.Lightbox = new RenderController();


        // Results
        this.tabBar.Layout.Results = new View();
        this.tabBar.Layout.Results.EventResultsView = new EventResultsView({
            // use player_id, or the promise
            model: this.model
        });
        this.tabBar.Layout.Results.EventResultsView._eventOutput.pipe(this.contentScrollView);
        this.tabBar.Layout.Results.add(this.tabBar.Layout.Results.EventResultsView);

        // Spots / Highlights
        this.tabBar.Layout.Spots = new View();
        this.tabBar.Layout.Spots.EventSpotListView = new EventSpotListView({
            // use player_id, or the promise
            event_id: this.event_id
        });
        this.tabBar.Layout.Spots.EventSpotListView._eventOutput.pipe(this.contentScrollView);
        this.tabBar.Layout.Spots.add(this.tabBar.Layout.Spots.EventSpotListView);

        // Stories
        this.tabBar.Layout.Stories = new View();
        this.tabBar.Layout.Stories.EventStoryListView = new EventStoryListView({
            // use player_id, or the promise
            event_id: this.event_id
        });
        this.tabBar.Layout.Stories.EventStoryListView._eventOutput.pipe(this.contentScrollView);
        this.tabBar.Layout.Stories.add(this.tabBar.Layout.Stories.EventStoryListView);

        // Share
        this.tabBar.Layout.Share = new View();
        this.tabBar.Layout.Share.EventShareView = new EventShareView({
            // use player_id, or the promise
            model: this.model
        });
        this.tabBar.Layout.Share.EventShareView._eventOutput.pipe(this.contentScrollView);
        this.tabBar.Layout.Share.add(this.tabBar.Layout.Share.EventShareView);


        this.tabBar.Layout.add(this.tabBar.Layout.Lightbox);
        this.contentScrollView.Views.push(this.tabBar.Layout);

        this.tabBar.on('select', function(result){
            if(!result || !result.id){
                // requires id
                return;
            }
            switch(result.id){

                case 'highlights': // "spots"
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Spots);

                    that.tabBar.Layout.Lightbox.getSize = function(){
                        return that.tabBar.Layout.Spots.EventSpotListView.getSize();
                    };

                    try {
                        App.Data.Players.populated().then(function(){
                            that.tabBar.Layout.Spots.EventSpotListView.collection.pager();
                        });
                    }catch(err){
                        console.error(err);
                    }
                    break;

                case 'results':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Results);

                    that.tabBar.Layout.Lightbox.getSize = function(){
                        // console.log(that.tabBar.Layout.Stories.eventStoryListView.contentLayout.getSize(true));
                        return that.tabBar.Layout.Results.EventResultsView.getSize();
                    };
                    try {
                        App.Data.Players.populated().then(function(){
                            that.tabBar.Layout.Results.EventResultsView.collection.fetch();
                        });
                    }catch(err){}

                    break;

                case 'feed':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Stories);

                    that.tabBar.Layout.Lightbox.getSize = function(){
                        // console.log(that.tabBar.Layout.Stories.eventStoryListView.contentLayout.getSize(true));
                        return that.tabBar.Layout.Stories.EventStoryListView.getSize();
                    };

                    that.tabBar.Layout.Stories.EventStoryListView.collection.pager();
                    break;

                case 'share':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Share);
                    break;

                case 'events':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.events);
                    break;

                case 'stats':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Stats);
                    break;

                case 'media':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Media);
                    break;

                case 'compare':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Compare);
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });
        this.tabBar.select('highlights');

    };

    PageView.prototype.refreshData = function() {
        try {
            this.model.fetch();
            this.tabBar.Layout.Stories.EventStoryListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.update_content = function(){
        var that = this;

        console.info('update_content');
        if(that.model != undefined && that.model.hasFetched){
            // pass

            // Settings lightbox
            // - who has permission to change/edit the event?
            // - ALWAYS SHOWING (for now), but hiding some events if not permissible
            if(that.model.get('user_id') == App.Data.User.get('_id') || 1==1){
                // if(that.
                that.headerContent.SettingsLightbox.show(that.headerContent.Settings);
                // }
            }

            // title
            this.eventTopLayout.Title.Surface.setContent(S(that.model.get('title')));

            // description
            this.eventTopLayout.Description.Surface.setContent(S(that.model.get('description')));

            // datetime
            this.eventTopLayout.EventDatetime.Surface.setContent(moment(that.model.get('created')).format('MMMM Do'));

            // starred
            // - is one of my Player_ids in the Stars ?
            // - also can check my user_id
            // console.log(_.pluck(this.model.get('Star'),'user_id'));
            // debugger;
            var StarTotal = that.model.get('StarTotal');
            that.isStarred = false;
            console.log(_.pluck(that.model.get('Star'),'user_id'));
            if(_.pluck(that.model.get('Star'),'user_id').indexOf(App.Data.User.get('_id')) !== -1){
                that.isStarred = true;
                // debugger;
                that.eventTopLayout.Starred.Surface.setContent('<i class="icon ion-ios7-star"></i><span>'+StarTotal+'</span>');
            } else {
                that.eventTopLayout.Starred.Surface.setContent('<i class="icon ion-ios7-star-outline"></i><span>'+StarTotal+'</span>');
            }

            // Joined?
            // - is one of my Player_ids in the Players ?
            var PlayerTotal = that.model.get('PlayerTotal');
            console.log(that.model.toJSON());
            console.log(that.model.toJSON().PlayerTotal);
            that.iHaveJoined = that.iHaveJoined === true ? true : false; // if set this.iHaveJoined at any point, keep them joined?
            console.log(_.pluck(that.model.get('Player'),'user_id'));
            if(_.pluck(that.model.get('Player'),'user_id').indexOf(App.Data.User.get('_id')) !== -1){
                that.iHaveJoined = true;
                that.eventTopLayout.Join.Surface.setContent('<span class="ellipsis-all">' + PlayerTotal + ' <i class="icon ion-person"></i></span>');
                that.eventTopLayout.Join.Surface.setClasses(['event-joined-container-default','joined']);
            } else {
                that.eventTopLayout.Join.Surface.setContent('<span class="ellipsis-all">Join '+PlayerTotal+' players</span>');
                that.eventTopLayout.Join.Surface.setClasses(['event-joined-container-default']);
            }

            // // Certified?
            // var myResult = that.GetMyResult();
            // if(myResult !== false){
            //     switch(myResult.certified){
            //         case false:
            //             this.eventTopLayout.CertifyLayout.show(this.eventTopLayout.CertifiedFalse);
            //             break;
            //         case null:
            //             this.eventTopLayout.CertifyLayout.show(this.eventTopLayout.CertifyNull);
            //             break;
            //         case true:
            //             this.eventTopLayout.CertifyLayout.show(this.eventTopLayout.CertifiedTrue);
            //             break;

            //     }
            // }
            
            // // Profile Photo
            // if(that.model.get('profilephoto.urls')){
            //     this.eventTopLayout.ProfileImage.Surface.setContent(that.model.get('profilephoto.urls.thumb100x100'));
            // } else {
            //     this.eventTopLayout.ProfileImage.Surface.setContent('img/generic-profile.png');
            // }

            // // username (header)
            // // - using "email" for now
            // if(that.model.get('Profile.email') !== false){
            //     // this.eventTopLayout.ProfileName.setContent(that.model.get('Profile.name'));
            //     that.header.navBar.title.setContent(that.model.get('Profile.email') ? that.model.get('Profile.email').split('@')[0].split('+')[0] : '');
            // } else {
            //     // not me
            //     // - no email set
            //     // - not showing any name for them
            //     that.header.navBar.title.setContent('');
            //     // that.header.navBar.title.setContent(that.model.get('Profile.email') ? that.model.get('email').split('@')[0].split('+')[0] : '');
            // }

            // // back button
            // if(that.is_me === true){
            //     // no back button
            // } else {
            //     that.header.navBar.back.setSize([20,undefined]);
            //     that.header.navBar.back.setContent('<i class="icon ion-android-arrow-back"></i>');
            //     // that.header.navBar.title.setContent(that.model.get('email').split('@')[0].split('+')[0]);
            // }

        }

        // // Total results/places
        // if(that.stats_collection != undefined && that.stats_collection.hasFetched){
        //     // Summary/stat surfaces (update)

        //     // wins
        //     that.profileRight.OverallRecord.Left.setContent('<div>'+that.stats_collection.summary[that.player_id].w+'</div><div>wins</div>');
        //     // winning percentage
        //     that.profileRight.OverallRecord.LeftMiddle.setContent('<div>'+numeral(that.stats_collection.summary[that.player_id].wp).format('.000')+'</div><div>Win %</div>');
        //     // 1st place
        //     that.profileRight.OverallRecord.Middle.setContent('<div>'+that.stats_collection.summary[that.player_id]['1']+'</div><div>1st</div>');


        //     // _.each(that.stats_collection.summary[that.player_id], function(value, key){
        //     //     var tmpKey = '';
        //     //     switch(key){
        //     //         case "1":
        //     //         case "2":
        //     //         case "3":
        //     //             tmpKey = numeral(key).format('0o');
        //     //             break;
        //     //         case "4":
        //     //             tmpKey = numeral(key).format('0o') + '+';
        //     //             break;

        //     //         case "w":
        //     //         case "l":
        //     //         case "t":
        //     //             tmpKey = key.toUpperCase();
        //     //             break;
        //     //     }
        //     //     that.GridSurfacesTotal[key].setContent(tmpKey + ': ' + value.toString());
        //     // });

        // }

    };

    PageView.prototype.popover_share = function(tempResultView, tempResultLayoutView) { 
        // Popover for sharing

        var that = this;

        // Get Teams
        var listData = [
            {
                text: 'View Online',
                value: 'online'
            },
            {
                text: 'Share by SMS',
                value: 'sms'
            }
        ];
        // Options and details
        App.Cache.OptionModal = {
            list: listData,
            on_choose: function(chosen_type){
                // Update player's team
                switch(chosen_type.value){
                    case 'online':
                        window.open('http://www.nemesisapp.net/event/public/' + that.model.get('_id'),'_system');
                        break;
                    case 'sms':
                        window.plugins.socialsharing.shareViaSMS('www.nemesisapp.net/event/public/' + that.model.get('_id'), null);
                        break;
                    default:
                        break;
                }

            },
            on_cancel: function(){
            }
        };

        // Change history (must)
        App.history.navigate('modal/list', {history: false});
    };


    PageView.prototype.create_grid_total = function(){
        var that = this;

        // GridLayout of results
        // - 2 grid layouts W/L/T and 1/2/3/4+
        
        this.GridSurfacesTotal = {};

        this.GridResults_1v1_WLT = new View();
        this.GridResults_1v1_WLT.Grid = new GridLayout({
            dimensions: [1,3]
        });
        // this.GridResults_1v1_WLT.HeightMod = new StateModifier({
        //     size: [window.innerWidth / 2, 300]
        // });

        // w
        this.GridSurfacesTotal.w = new Surface({
            content: '',
            // size: [undefined, 100],
            classes: ["stat-grid-number", "bg-win"]
        });
        this.GridSurfacesTotal.w.pipe(this.contentScrollView);

        // l
        this.GridSurfacesTotal.l = new Surface({
            content: '',
            // size: [undefined, 100],
            classes: ["stat-grid-number", "bg-lose"]
        });
        this.GridSurfacesTotal.l.pipe(this.contentScrollView);
        // t
        this.GridSurfacesTotal.t = new Surface({
            content: '',
            // size: [undefined, 100],
            classes: ["stat-grid-number", "bg-tie"]
        });
        this.GridSurfacesTotal.t.pipe(this.contentScrollView);

        this.GridResults_1v1_WLT.Grid.sequenceFrom([
            this.GridSurfacesTotal.w,
            this.GridSurfacesTotal.l,
            this.GridSurfacesTotal.t,
        ]);
        this.GridResults_1v1_WLT.add(this.GridResults_1v1_WLT.Grid);

        // 2nd grid (places)
        this.GridResults_FreeForAll_Places = new View();
        // this.GridResults_FreeForAll_Places.HeightMod = new StateModifier({
        //     size: [window.innerWidth / 2, 400]
        // });
        this.GridResults_FreeForAll_Places.Grid = new GridLayout({
            dimensions: [1,4]
        });


        // 1
        this.GridSurfacesTotal["1"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-gold"]
        });
        this.GridSurfacesTotal["1"].pipe(this.contentScrollView);
        // 2
        this.GridSurfacesTotal["2"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-silver"]
        });
        this.GridSurfacesTotal["2"].pipe(this.contentScrollView);
        // 3
        this.GridSurfacesTotal["3"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-bronze"]
        });
        this.GridSurfacesTotal["3"].pipe(this.contentScrollView);
        // 4
        this.GridSurfacesTotal["4"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-white"]
        });
        this.GridSurfacesTotal["4"].pipe(this.contentScrollView);

        this.GridResults_FreeForAll_Places.Grid.sequenceFrom([
            this.GridSurfacesTotal['1'],
            this.GridSurfacesTotal['2'],
            this.GridSurfacesTotal['3'],
            this.GridSurfacesTotal['4']
        ]);
        this.GridResults_FreeForAll_Places.add(this.GridResults_FreeForAll_Places.Grid);

        // Title
        this.GridResults_TotalTitle = new View();
        this.GridResults_TotalTitle.Surface = new Surface({
            content: 'Full Record',
            size: [undefined, 40],
            properties: {
                backgroundColor: "white",
                color: "#222",
                padding: "0 10px",
                lineHeight: "40px"
            }
        });
        this.GridResults_TotalTitle.add(this.GridResults_TotalTitle.Surface);

        // Add Grids to ScrollView

        // GridLayout for holding the two columns
        this.GridResults_Columns = new View();
        this.GridResults_Columns.Grid = new GridLayout({
            dimensions: [2, 1]
        });
        this.GridResults_Columns.SizeMod = new StateModifier({
            size: [undefined, 200]
        });
        this.GridResults_Columns.add(this.GridResults_Columns.SizeMod).add(this.GridResults_Columns.Grid);

        this.GridResults_Columns.Grid.sequenceFrom([
            this.GridResults_1v1_WLT,
            this.GridResults_FreeForAll_Places
        ]);

        // - with Title
        this.contentScrollView.Views.push(this.GridResults_TotalTitle);
        // this.contentScrollView.Views.push(this.GridResults_1v1_WLT);
        // this.contentScrollView.Views.push(this.GridResults_FreeForAll_Places);   
        this.contentScrollView.Views.push(this.GridResults_Columns); 
    };

    PageView.prototype.create_event_list = function(){
        var that = this;
        
        // Title
        this.eventTitle = new View();
        this.eventTitle.Surface = new Surface({
            content: 'events >',
            size: [undefined, 40],
            properties: {
                backgroundColor: "#f8f8f8",
                fontWeight: "bold",
                textDecoration: "underline",
                color: "#222",
                padding: "0 10px",
                lineHeight: "40px"
            }
        });
        this.eventTitle.Surface.on('click', function(){
            // navigate to the normal events/summary view (that lists the events, scoreboard, filter, etc.)
            // - first set the parameters/flags that it will need to read
            App.Cache.NewSummary = {
                player_ids: [App.Data.Players.findMe().get('_id')] // just me
            };
            App.history.navigate('player/comparison/' + CryptoJS.SHA3(JSON.stringify(App.Cache.NewSummary)));
        });
        this.eventTitle.Surface.pipe(this.contentScrollView);
        this.eventTitle.add(this.eventTitle.Surface);
        this.contentScrollView.Views.push(this.eventTitle);

        // Add eventList subview of all events for this player
        this.PlayereventListView = new PlayereventListView({
            // use player_id, or the promise
            player_id: this.player_id && this.player_id.length === 24 ? this.player_id : that.KnowPlayerId.promise()
        });
        this.PlayereventListView._eventOutput.pipe(this.contentScrollView);

        this.contentScrollView.Views.push(this.PlayereventListView);

    };

    PageView.prototype.GetMyResult = function(){

        // Player has all of the player_ids for themselves (that they "own" almost)
        var my_player_ids = App.Data.Players.findMe().get('related_player_ids');
        var matched_ids = _.intersection(this.model.get('player_ids'), my_player_ids);
        if(matched_ids.length < 1){
            // player didn't participate
            return false;
        }

        // convert matched_ids into the first matching player_id
        var found_player_id = matched_ids[0];
        var myResult = this.model.get('player_results')[found_player_id];

        return myResult;

    };

    PageView.prototype.popover_options = function(tempResultView, tempResultLayoutView) { 
        // Popover for sharing

        var that = this;

        // Get Teams
        var listData = [
            {
                text: 'Players',
                success: function(){
                    App.history.navigate('event/players/' + that.event_id);
                }
            },
            // {
            //     text: 'Push Notifications',
            //     success: function(){

            //     }
            // }
        ];

        // My Event, can I edit/delete it?
        if(that.model.get('user_id') == App.Data.User.get('_id')){
            // Edit link
            listData.push({
                text: 'Edit Event',
                success: function(){
                    App.history.navigate('event/edit/' + that.model.get('_id'));
                }

            });
            // Delete (with confirmation)
            listData.push({
                text: 'Delete Event',
                success: function(){
                    // Confirm
                    Timer.setTimeout(function(){
                        Utils.Popover.Buttons({
                            title: 'Delete Event',
                            text: 'Are you sure?',
                            buttons: [
                                {
                                    text: 'Back',
                                },
                                {
                                    text: "Yes, Delete",
                                    success: function(){
                                        that.model.save({
                                            active: false
                                        },{
                                            patch: true,
                                            success: function(){
                                                Utils.Notification.Toast('Removed Event');
                                            }
                                        });
                                        // Go back
                                        App.history.back();
                                    }
                                }
                            ]
                        });
                    },350);

                }

            });
        }

        // Can I remove this event?
        Utils.Popover.List(listData);

        // // Options and details
        // App.Cache.OptionModal = {
        //     list: listData,
        //     on_choose: function(chosen_type){
        //         // Update player's team
        //         switch(chosen_type.value){
        //             case 'delete':
        //                 // Save
        //                 that.model.save({
        //                     active: false
        //                 },{
        //                     patch: true,
        //                     success: function(){
        //                         Utils.Notification.Toast('Removed Event');
        //                     }
        //                 });
        //                 // Go back
        //                 App.history.back();
        //                 break;
        //             default:
        //                 break;
        //         }

        //     },
        //     on_cancel: function(){
        //     }
        // };

        // Change history (must)
        App.history.navigate('modal/list', {history: false});
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

                        // // Hiding the sideView
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Content
                        Timer.setTimeout(function(){
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide left
                            that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * -1) - 100,0,0), transitionOptions.outTransition);

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

                        // // SideView must be visible
                        // this.sideView.OpacityModifier.setOpacity(1);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.ContentStateModifier.setOpacity(0);
                        that.ContentStateModifier.setTransform(Transform.translate(0,0,0));

                        // // Header
                        // // - no extra delay
                        // window.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            // Bring map content back
                            that.ContentStateModifier.setOpacity(1, transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50]
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
