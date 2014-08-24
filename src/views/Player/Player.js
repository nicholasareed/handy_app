
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
    var numeral = require('lib2/numeral.min');
    var crypto = require('lib2/crypto');

    // Models
    var PlayerModel = require('models/player');
    var GameModel = require('models/game');

    // Subviews

    // Side menu of list of cars
    var DashPlayerMenuView      = require('views/Player/DashPlayerMenu');

    // Player Stories
    var PlayerStoryListView      = require('views/Player/PlayerStoryList');

    // Game Blocks
    var PlayerGameBlocksView      = require('views/Player/PlayerGameBlocks');
    // Game List
    var PlayerGameListView      = require('views/Player/PlayerGameList');

    // Media Blocks
    var PlayerMediaBlocksView      = require('views/Player/PlayerMediaBlocks');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Are we getting a player_id, or do we need to get the current user's player_id?
        this.KnowPlayerId = $.Deferred();
        var player_id; 
        if(this.options.args.length > 0 && this.options.args[0]){
            // It is set
            // - resolve now
            player_id = this.options.args[0];
            this.player_id = player_id;
        } else {
            // Trying to go to the ond "Dash" (the current user)
            // Sometimes we don't immediately know the current owner's ID
            // this.KnowPlayerId = $.Deferred();
            player_id = localStorage.getItem('home_player_id');
            this.player_id = player_id && player_id.length == 24 ? player_id : false;
        }

        // If player_id is set, then use it, otherwise get the user's player_id)
        if(this.player_id){
            // Resolve the KnowPlayerId right away
            // - might use it later in a Deferred context
            this.KnowPlayerId.resolve(this.player_id);
        } else {
            // Determine Player.id
            $.ajax({
                url: Credentials.server_root + 'me',
                cache: false,
                success: function(player){
                    // Save and resolve my player_id
                    localStorage.setItem('home_player_id', player._id);
                    that.player_id = player._id;
                    that.KnowPlayerId.resolve(player._id);
                },
                error: function(){
                    // alert("Failed finding player");
                    console.error('Failed finding player');
                }
            });
        }

        // Create the mainTransforms for shifting the entire view over on menu open
        this.mainTransform = new Modifier({
            transform: Transform.identity
        });
        this.mainTransitionable = new Transitionable(0);
        this.mainTransform.transformFrom(function() {
            // Called every frame of the animation
            return Transform.translate(this.mainTransitionable.get() * -1, 0, 0);
        }.bind(this));

        // Create the CarList menu that swings out
        this.sideView = new DashPlayerMenuView();
        this.sideView.OpacityModifier = new StateModifier();


        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        // this.createFooter();

        // // create the header
        // this.header = new NavigationBar({
        //     content: "",
        //     classes: ["normal-header"],
        //     backClasses: ["normal-header"],
        //     moreClasses: ["normal-header"],
        //     moreContent: "Players"
        // }); 
        // this.header._eventOutput.on('back',function(){
        //     window.history.go(-1);
        // });
        // this.header._eventOutput.on('more',function(){
        //     // rewrite the event
        //     this._eventOutput.emit('menutoggle');
        // });
        // this.header.title.on('click',function(){
        //     // rewrite the event
        //     that.PlayerGameListView.collection.requestNextPage();
        // });
        // this.header.pipe(this._eventInput);
        // this._eventInput.on('menutoggle', this.menuToggle.bind(this));

        // // Header StateModifier
        // this.header.StateModifier = new StateModifier();

        this.createContent();

        this.createHeader();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.mainTransform).add(this.layout);

        // Events

        this._eventInput.on('menuToggle', this.menuToggle.bind(this))

        // Models
        this.tmpModel = $.Deferred();

        this.KnowPlayerId.promise().then(function(player_id){

            // Create footer, if necessary
            // that.createFooter();

            // Get Player (Me)
            that.model = new PlayerModel.Player({
                _id: player_id
            });
            that.model.fetch({prefill: true});

            that.model.populated().then(function(){

                // Show user information
                that.contentLightbox.show(that.contentScrollView);

                // The following is only run once
                that.is_me = true;

                // Show Edit or Connect
                // - determine is_me
                if(that.model.get('is_me') == true && that.model.get('user_id') == App.Data.User.get('_id')){
                    console.error('is_me!');
                    that.profileRight.Layout.show(that.profileRight.EditProfile);
                } else if (_.intersection(that.model.get('related_player_ids'),App.Data.Players.findMe().get('related_player_ids')).length > 0){
                    console.error('is_me!');
                    that.profileRight.Layout.show(that.profileRight.EditProfile);
                } else if (that.model.get('connected_user_id') == App.Data.User.get('_id')){
                    console.error('is_me!');
                    that.profileRight.Layout.show(that.profileRight.EditProfile);
                } else {
                    that.is_me = false;
                    console.error('Not is_me!');
                    // console.log(that.model.toJSON());

                    // Connected to this person?
                    // console.log(that.model.get('related_player_ids'));
                    // console.log(App.Data.Players.findMe().get('related_player_ids'));
                    // console.log(_.intersection(that.model.get('related_player_ids'),App.Data.Players.findMe().get('related_player_ids')));
                    // console.log(that.model.toJSON());
                    var my_friend_player_ids = _.pluck(App.Data.Players.toJSON(), '_id');
                    // console.log(my_friend_player_ids);
                    if(_.intersection(that.model.get('related_player_ids'),my_friend_player_ids).length > 0){
                        that.profileRight.Layout.show(that.profileRight.Connected);
                    } else {
                        that.profileRight.Layout.show(that.profileRight.Connect);
                    }
                }

                if(that.is_me === true){
                    // that.createFooter();
                }

                // compare/against
                // only do this one time
                if(that.is_me === false){

                    that.tabBar.defineSection('compare', {
                        content: '<i class="icon ion-android-contacts"></i><div>Compare</div>',
                        onClasses: ['profile-tabbar-default', 'on'],
                        offClasses: ['profile-tabbar-default', 'off']
                    });

                }

                // update going forward
                that.update_content();
                that.model.on('change', that.update_content.bind(that));

            });

            // Get my stats
            that.stats_collection = new GameModel.GameCollection([],{
                player_id: player_id
            });
            // that.stats_collection.
            that.stats_collection.fetch({prefill: true, limit: 0});
            that.stats_collection.populated().then(function(){
                that.update_content();
                that.stats_collection.on('sync', that.update_content.bind(that));
            });

            // Player list
            that.player_collection = new PlayerModel.PlayerCollection([],{
                player_id: player_id
            });
            that.player_collection.on("sync", function(collection){
                // console.info(that.player_collection.toJSON().length);
                var tmpCount = that.player_collection.toJSON().length - 1;
                if(tmpCount < 0){
                    tmpCount = 0;
                }
                that.profileRight.OverallRecord.Right.setContent('<div>'+tmpCount.toString()+'</div><div>Nemeses</div>');
            });
            that.player_collection.listenTo(App.Events, 'player_collection_fetch', function(){
                that.player_collection.fetch();
            });
            that.player_collection.fetch({prefill: true});

        });

        // window.setTimeout(function(){
        //     KnowPlayerId.resolve("529c02f00705435badb1dff5");
        // },3000);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;


    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // -- settings (lightbox)
        this.headerContent = new View();
        this.headerContent.Lightbox = new RenderController();
        this.headerContent.SizeMod = new StateModifier({
            size: [60, 50]
        });
        this.headerContent.add(this.headerContent.SizeMod).add(this.headerContent.Lightbox);
        this.headerContent.Settings = new Surface({
            content: '<i class="icon ion-gear-a"></i><div>Settings</div>',
            size: [60, undefined],
            classes: ['header-tab-icon-text']
        });
        this.headerContent.Settings.on('click', function(){
            App.history.navigate('settings');
        });
        // - spacer1
        this.headerContent.spacer1 = new Surface({
            content: '<span></span>',
            size: [16, undefined],
            classes: ['header-tab-spacer-default']
        });

        // - search (always visible)
        this.headerContent.Search = new Surface({
            content: '<i class="icon ion-search"></i><div>Search</div>',
            size: [60, undefined],
            classes: ['header-tab-icon-text']
        });
        this.headerContent.Search.on('click', function(){
            App.history.navigate('players/search');
        });

        // create the header
        this.header = new StandardHeader({
            content: '', //App.Data.User.get('email').split('@')[0].split('+')[0],
            classes: ["normal-header", "profile-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            // moreContent: "Players",
            // backContent: "+Game"
            // moreContent: false,
            moreSurfaces: [
                this.headerContent,
                this.headerContent.spacer1,
                this.headerContent.Search
            ],
            backContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
            // App.history.navigate('game/add',{history: false});
        });
        this.header.navBar.title.on('click',function(){
            // rewrite the event
            // that.PlayerGameListView.collection.requestNextPage();
            if(that.is_me){
                // App.history.navigate('settings');
            } else {
                App.history.back();
            }
        });
        this.header.pipe(this._eventInput);

        this._eventInput.on('menutoggle', this.menuToggle.bind(this));
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


    PageView.prototype.createFooter = function(){
        var that = this;
        
        // create the footer
        this.footer = new StandardTabBar();  

        // combine the following 2 into "events" ? ("Stories" would be the default view, with a link inside the "Actions" (because they are a subset, really)
        this.footer.defineSection('story', {
            content: '<i class="icon ion-ios7-photos"></i><div>Highlights</div>',
            onClasses: ['footer-tabbar-default', 'on'],
            offClasses: ['footer-tabbar-default', 'off']
        });
        // this.footer.defineSection('news', {
        //     content: "Actions",
        //     onClasses: ['footer-tabbar-default', 'on'],
        //     offClasses: ['footer-tabbar-default', 'off']
        // });
        this.footer.defineSection('explore', {
            content: '<i class="icon ion-play"></i><div>Explore</div>',
            onClasses: ['footer-tabbar-default', 'on'],
            offClasses: ['footer-tabbar-default', 'off']
        });

        this.footer.defineSection('new', {
            content: '<i class="icon ion-ios7-plus-outline big-icon"></i>',
            onClasses: ['footer-tabbar-default', 'footer-tabbar-withbackground', 'on'],
            offClasses: ['footer-tabbar-default', 'footer-tabbar-withbackground', 'off']
        });

        // console.log(this.footer.buttons);
        // debugger;

        // this.footer.defineSection('ranking', {
        //     content: '<i class="icon ion-calculator"></i><div>Rank</div>',
        //     onClasses: ['footer-tabbar-default', 'on'],
        //     offClasses: ['footer-tabbar-default', 'off']
        // });
        // this.footer.defineSection('inbox', {
        //     content: '<i class="icon ion-android-inbox"></i><div>Inbox</div>',
        //     onClasses: ['footer-tabbar-default', 'on'],
        //     offClasses: ['footer-tabbar-default', 'off']
        // });
        this.footer.defineSection('news', {
            content: '<i class="icon ion-android-note"></i><div>News</div>',
            onClasses: ['footer-tabbar-default', 'on'],
            offClasses: ['footer-tabbar-default', 'off']
        });
        this.footer.defineSection('profiles', {
            content: '<i class="icon ion-person"></i><div>Profiles</div>',
            onClasses: ['footer-tabbar-default', 'on'],
            offClasses: ['footer-tabbar-default', 'off']
        });


        this.footer.on('select', function(result){
            switch(result.id){
                case 'profiles':
                    // already here
                    App.history.navigate('dash');
                    break;

                case 'ranking':
                    App.history.navigate('ranking/overall/friends/' + App.Data.Players.findMe().get('_id') + '/all');
                    break;

                case 'inbox':
                    App.history.navigate('inbox');
                    break;

                case 'story':
                    App.history.navigate('story/all');
                    break;

                case 'new':
                    // App.history.navigate('game/add');
                    App.history.navigate('game/add',{history: false});
                    break;

                case 'news':
                    App.history.navigate('actions/all');
                    break;

                case 'explore':
                    App.history.navigate('explore/home');
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });


        // Attach header to the layout 
        var frontMod = new StateModifier({
            transform: Transform.inFront
        });
        this.layout.footer.add(frontMod).add(this.footer);

    };

    PageView.prototype.createContent = function(){
        var that = this;

        // create the content
        this.contentScrollView = new ModifiedScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Pipe edgeHit (bottom) to next_page
        this.contentScrollView.on('edgeHit', function(data){
            var position = parseInt(this.getPosition(), 10);
            if(that.lastEdgeHit == position){
                return;
            }
            that.lastEdgeHit = position;

            // At beginning?
            if(position <= 0){
                return;
            }

            // // Probably all good to try and update
            // that.PlayerGameListView.next_page.call(that.PlayerGameListView);
        });

        // top of profile
        // - profile stuff
        // - basic win/loss details
        this.profileLayout = new View();
        this.profileLayout.SizeMod = new StateModifier({
            size: [undefined, 140]
        });
        this.profileLayout.SeqLayout = new FlexibleLayout({
            ratios: [true, 4, 200, 4]
        });
        this.profileLayout.SeqLayout.Views = [];
        this.profileLayout.add(this.profileLayout.SizeMod).add(this.profileLayout.SeqLayout);

        // Left Side
        // - image and profile name
        this.profileLeft = new View();
        this.profileLeft.SizeMod = new StateModifier({
            size: [100, undefined]
        });
        this.profileLeft.SeqLayout = new SequentialLayout();
        this.profileLeft.SeqLayout.Views = [];

        // Spacer
        this.profileLeft.topSpacer1 = new Surface({
            content: '',
            size: [undefined, 10]
        });
        this.profileLeft.SeqLayout.Views.push(this.profileLeft.topSpacer1);

        // Profile Image
        this.profileLeft.ProfileImage = new View();
        this.profileLeft.ProfileImage.StateModifier = new StateModifier({
            origin: [0.5,0],
            // size: [undefined, 100]
        });
        this.profileLeft.ProfileImage.Surface = new ImageSurface({
            content: 'img/generic-profile.png',
            size: [80,80],
            properties: {
                borderRadius: "50%",
                border: "1px solid #444"
            }
        });
        this.profileLeft.ProfileImage.add(this.profileLeft.ProfileImage.StateModifier).add(this.profileLeft.ProfileImage.Surface);
        this.profileLeft.ProfileImage.Surface.on('click', function(){
            // Refresh, easy to do
            that.model.fetch();
            if(that.is_me){
                // Launch options for photo

                // Slide to the change screen for the player
                // that.previousPage = window.location.hash;

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
                                Utils.takePicture('camera', {}, that.uploadProfileImage.bind(that), function(message){
                                    // failed taking a picture
                                });
                                break;
                            case 'gallery':
                                Utils.takePicture('gallery', {}, that.uploadProfileImage.bind(that), function(message){
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

            }
        });
        this.profileLeft.ProfileImage.pipe(this.contentScrollView);
        this.profileLeft.SeqLayout.Views.push(this.profileLeft.ProfileImage);

        // Spacer
        this.profileLeft.topSpacer3 = new Surface({
            content: '',
            size: [undefined, 10]
        });
        this.profileLeft.SeqLayout.Views.push(this.profileLeft.topSpacer3);

        // Profile Name
        this.profileLeft.ProfileName = new View();
        this.profileLeft.ProfileName.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.profileLeft.ProfileName.Surface = new Surface({
            content: '',
            size: [undefined, 40],
            // size: [undefined,80],
            // classes: ['ellipsis'],
            properties: {
                backgroundColor: 'white',
                color: '#333',
                fontSize: "12px",
                fontWeight: "bold",
                textAlign: "center"
            }
        });
        this.profileLeft.ProfileName.add(this.profileLeft.ProfileName.StateModifier).add(this.profileLeft.ProfileName.Surface);
        this.profileLeft.SeqLayout.Views.push(this.profileLeft.ProfileName);

        this.profileLeft.SeqLayout.sequenceFrom(this.profileLeft.SeqLayout.Views);

        this.profileLeft.add(this.profileLeft.SizeMod).add(this.profileLeft.SeqLayout);
        this.profileLayout.SeqLayout.Views.push(this.profileLeft);

        // Left-spacer
        this.profileLeft.SpacerMidLeft = new Surface({
            content: '',
            size: [undefined, 1]
        });
        this.profileLayout.SeqLayout.Views.push(this.profileLeft.SpacerMidLeft);

        // Right
        // - overall score, etc.
        this.profileRight = new View();
        this.profileRight.SeqLayout = new SequentialLayout();
        this.profileRight.SeqLayout.Views = [];

        // Spacer
        this.profileRight.topSpacer2 = new Surface({
            content: '',
            size: [undefined, 20]
        });
        this.profileRight.SeqLayout.Views.push(this.profileRight.topSpacer2);

        // Overall Record
        this.profileRight.OverallRecord = new View();
        this.profileRight.OverallRecord.SizeMod = new StateModifier({
            size: [undefined, 40]
        });
        this.profileRight.OverallRecord.Grid = new GridLayout({
            dimensions: [4,1]
        });
        this.profileRight.OverallRecord.add(this.profileRight.OverallRecord.SizeMod).add(this.profileRight.OverallRecord.Grid);
        this.profileRight.OverallRecord.Grid.Views = [];

        // Surfaces for Overall Record
        this.profileRight.OverallRecord.Left = new Surface({
            // size: [100, 40],
            content: '<div>&nbsp;</div><div>wins</div>',
            classes: ['profile-overall-record-grid-item']
        });
        this.profileRight.OverallRecord.LeftMiddle = new Surface({
            // size: [100, 40],
            content: '<div>&nbsp;</div><div>Win %</div>',
            classes: ['profile-overall-record-grid-item']
        });
        this.profileRight.OverallRecord.Middle = new Surface({
            // size: [100, 40],
            content: '<div>&nbsp;</div><div>1st</div>',
            classes: ['profile-overall-record-grid-item']
        });

        this.profileRight.OverallRecord.Left.on('click', function(){
            App.history.navigate('ranking/overall/none/' + App.Data.Players.findMe().get('_id') + '/all');
        });
        this.profileRight.OverallRecord.LeftMiddle.on('click', function(){
            App.history.navigate('ranking/overall/none/' + App.Data.Players.findMe().get('_id') + '/all');
        });
        this.profileRight.OverallRecord.Middle.on('click', function(){
            App.history.navigate('ranking/overall/none/' + App.Data.Players.findMe().get('_id') + '/all');
        });

        this.profileRight.OverallRecord.Right = new Surface({
            // size: [100, 40],
            content: '<div>&nbsp;</div><div>Nemeses</div>',
            classes: ['profile-overall-record-grid-item','profile-overall-record-nemeses-count']
        });
        this.profileRight.OverallRecord.Right.on('click', function(){
            console.log(that.player_id);
            // debugger;
            App.history.navigate('player/list/' + that.player_id, {history: false});
        });
        this.profileRight.OverallRecord.Grid.Views.push(this.profileRight.OverallRecord.Left);
        this.profileRight.OverallRecord.Grid.Views.push(this.profileRight.OverallRecord.LeftMiddle);
        this.profileRight.OverallRecord.Grid.Views.push(this.profileRight.OverallRecord.Middle);
        this.profileRight.OverallRecord.Grid.Views.push(this.profileRight.OverallRecord.Right);

        this.profileRight.OverallRecord.Grid.sequenceFrom(this.profileRight.OverallRecord.Grid.Views);

        this.profileRight.SeqLayout.Views.push(this.profileRight.OverallRecord);

        // Spacer3
        this.profileRight.topSpacer4 = new Surface({
            content: '',
            size: [undefined, 20]
        });
        this.profileRight.SeqLayout.Views.push(this.profileRight.topSpacer4);


        // Edit Your Profile
        // Connect with the person (or are connected already)
        this.profileRight.Layout = new RenderController();

        // - Edit Your Profile
        this.profileRight.EditProfile = new View();
        this.profileRight.EditProfile.StateModifier = new StateModifier({
            // origin: [0, 0]
        });
        this.profileRight.EditProfile.Surface = new Surface({
            size: [undefined, 32],
            content: "EDIT YOUR PROFILE",
            properties: {
                textAlign: 'center',
                lineHeight: '32px',
                fontSize: '14px',
                color: "white",
                backgroundColor: "#07b40c",
                borderRadius: "3px"
            }
        });
        this.profileRight.EditProfile.Surface.on('click', function(){
            App.history.navigate('profile/edit');
        });
        this.profileRight.EditProfile.add(this.profileRight.EditProfile.StateModifier).add(this.profileRight.EditProfile.Surface);

        // - Connect with the person
        this.profileRight.Connect = new View();
        this.profileRight.Connect.Surface = new Surface({
            size: [undefined, 32],
            content: "Not you!",
            properties: {
                textAlign: 'center',
                lineHeight: '32px',
                fontSize: '14px',
                color: "#555",
                backgroundColor: "#f9f9f9",
                borderRadius: "3px"
            }
        });
        // this.profileRight.Connect.Surface.on('click', function(){
        //     App.history.navigate('profile/edit');
        // });
        this.profileRight.Connect.add(this.profileRight.Connect.Surface);

        // - Connected with the person
        this.profileRight.Connected = new View();
        this.profileRight.Connected.Surface = new Surface({
            size: [undefined, 32],
            content: "You are Nemeses!",
            properties: {
                textAlign: 'center',
                lineHeight: '32px',
                fontSize: '14px',
                color: "white",
                backgroundColor: "#E87B0C",
                borderRadius: "3px"
            }
        });
        // this.profileRight.Connect.Surface.on('click', function(){
        //     App.history.navigate('profile/edit');
        // });
        this.profileRight.Connected.add(this.profileRight.Connected.Surface);

        // this.profileRight.Layout will .show() the correct one, after the model is loaded

        this.profileRight.SeqLayout.Views.push(this.profileRight.Layout);


        // Spacer
        this.profileRight.Spacer = new Surface({
            content: '',
            size: [undefined, 1]
        });
        this.profileRight.SeqLayout.Views.push(this.profileRight.Spacer);

        this.profileRight.SeqLayout.sequenceFrom(this.profileRight.SeqLayout.Views);

        this.profileRight.add(this.profileRight.SeqLayout);
        this.profileLayout.SeqLayout.Views.push(this.profileRight);

        // Far-right spacer
        this.profileRight.SpacerFarRight = new Surface({
            content: '',
            size: [undefined, 1]
        });
        this.profileLayout.SeqLayout.Views.push(this.profileRight.SpacerFarRight);

        this.profileLayout.SeqLayout.sequenceFrom(this.profileLayout.SeqLayout.Views);

        this.contentScrollView.Views.push(this.profileLayout);

        // Tab Bar
        this.tabs = new View();
        this.tabs.SizeMod = new StateModifier({
            size: [undefined, 48]
        });
        
        this.tabBar = new TabBar(); 
        this.tabs.add(this.tabs.SizeMod).add(this.tabBar);

        // this.tabBar.defineSection('stories', {
        //     content: '<i class="icon ion-ios7-photos"></i><div>Highlights</div>',
        //     onClasses: ['profile-tabbar-default', 'on'],
        //     offClasses: ['profile-tabbar-default', 'off']
        // });
        this.tabBar.defineSection('games', {
            content: '<i class="icon ion-game-controller-a"></i><div>Games</div>', // Game Blocks
            onClasses: ['profile-tabbar-default', 'on'],
            offClasses: ['profile-tabbar-default', 'off']
        });
        // this.tabBar.defineSection('game_blocks', {
        //     content: '<i class="icon ion-grid"></i><div>Blocks</div>', // Game Blocks
        //     onClasses: ['profile-tabbar-default', 'on'],
        //     offClasses: ['profile-tabbar-default', 'off']
        // });
        // this.tabBar.defineSection('game_list', {
        //     content: '<i class="icon ion-navicon"></i><div>List</div>', // Game List
        //     onClasses: ['profile-tabbar-default', 'on'],
        //     offClasses: ['profile-tabbar-default', 'off']
        // });

        // this.tabBar.defineSection('stats', {
        //     content: '<i class="icon ion-arrow-graph-up-right"></i><div>Stats</div>', // Game List
        //     onClasses: ['profile-tabbar-default', 'on'],
        //     offClasses: ['profile-tabbar-default', 'off']
        // });
        this.tabBar.defineSection('media', {
            content: '<i class="icon ion-images"></i><div>Media</div>',
            onClasses: ['profile-tabbar-default', 'on'],
            offClasses: ['profile-tabbar-default', 'off']
        });

        // this.tabBar.defineSection('compare', {
        //     content: '<i class="icon ion-ios7-photos"></i><div>Stories</div>',
        //     onClasses: ['profile-tabbar-default', 'on'],
        //     offClasses: ['profile-tabbar-default', 'off']
        // });

        this.contentScrollView.Views.push(this.tabs);

        // tabBar RenderController
        this.tabBar.Layout = new View();
        this.tabBar.Layout.Lightbox = new RenderController();

        // // Stories
        // this.tabBar.Layout.Stories = new View();
        // // Add Stories Subview
        // // console.log(this.player_id);
        // this.tabBar.Layout.Stories.PlayerStoryListView = new PlayerStoryListView({
        //     // use player_id, or the promise
        //     player_id: this.player_id && this.player_id.length === 24 ? this.player_id : that.KnowPlayerId.promise()
        // });
        // this.tabBar.Layout.Stories.PlayerStoryListView._eventOutput.pipe(this.contentScrollView);
        // this.tabBar.Layout.Stories.add(this.tabBar.Layout.Stories.PlayerStoryListView);

        // Games
        // - a tabbar of Games and GameBlocks
        // Tab Bar
        this.tabBar.Layout.Games = new View();
        // this.tabBar.Layout.Games.SizeMod = new StateModifier({
        //     size: [undefined, 50]
        // });
        
        this.tabBar.Layout.Games.SeqLayout = new SequentialLayout();
        this.tabBar.Layout.Games.SeqLayout.Views = [];

        this.tabBar.Layout.Games.tabBar = new View();
        this.tabBar.Layout.Games.tabBar.Grid = new TabBar();
        this.tabBar.Layout.Games.tabBar.SizeMod = new StateModifier({
            size: [undefined, 44]
        });

        this.tabBar.Layout.Games.tabBar.Grid.defineSection('game_blocks', {
            content: '<i class="icon ion-grid"></i><div>Blocks</div>', // Game Blocks
            onClasses: ['profile-tabbar-default', 'on'],
            offClasses: ['profile-tabbar-default', 'off']
        });
        this.tabBar.Layout.Games.tabBar.Grid.defineSection('game_list', {
            content: '<i class="icon ion-navicon"></i><div>List</div>', // Game List
            onClasses: ['profile-tabbar-default', 'on'],
            offClasses: ['profile-tabbar-default', 'off']
        });

        this.tabBar.Layout.Games.tabBar.add(this.tabBar.Layout.Games.tabBar.SizeMod).add(this.tabBar.Layout.Games.tabBar.Grid);
        
        this.tabBar.Layout.Games.Lightbox = new RenderController();
        this.tabBar.Layout.Games.Lightbox.View = new View();
        this.tabBar.Layout.Games.Lightbox.SizeMod = new StateModifier({
            size: [undefined, undefined]
        });
        this.tabBar.Layout.Games.Lightbox.View.add(this.tabBar.Layout.Games.Lightbox.SizeMod).add(this.tabBar.Layout.Games.Lightbox);

        // this.tabBar.Layout.Games.SeqLayout.Views.push(this.tabBar.Layout.Games.tabBar);
        this.tabBar.Layout.Games.SeqLayout.Views.push(this.tabBar.Layout.Games.Lightbox.View);

        this.tabBar.Layout.Games.add(this.tabBar.Layout.Games.SeqLayout);
        this.tabBar.Layout.Games.SeqLayout.sequenceFrom(this.tabBar.Layout.Games.SeqLayout.Views);



        // GameBlocks
        this.tabBar.Layout.Games.GameBlocks = new View();

        // Add GameList subview of all Games for this player
        this.tabBar.Layout.Games.GameBlocks.PlayerGameBlocksView = new PlayerGameBlocksView({
            // use player_id, or the promise
            // player_id: this.player_id && this.player_id.length === 24 ? this.player_id : that.KnowPlayerId.promise()
            player_id: this.KnowPlayerId.promise()
        });
        this.tabBar.Layout.Games.GameBlocks.PlayerGameBlocksView._eventOutput.pipe(this.contentScrollView);

        this.tabBar.Layout.Games.GameBlocks.add(this.tabBar.Layout.Games.GameBlocks.PlayerGameBlocksView);

        // // default, show GameBlocks
        // this.tabBar.Layout.Games.Lightbox.show(this.tabBar.Layout.Games.GameBlocks);

        // Surface({
        //     content: 'game blocks',
        //     size: [undefined, undefined],
        //     properties: {
        //         backgroundColor: '#85c3f2'
        //     }
        // });
        // this.tabBar.Layout.GameBlocks.pipe(this.contentScrollView);

        // GameList
        this.tabBar.Layout.Games.GameList = new View();

        // Add GameList subview of all Games for this player
        this.tabBar.Layout.Games.GameList.PlayerGameListView = new PlayerGameListView({
            // use player_id, or the promise
            // player_id: this.player_id && this.player_id.length === 24 ? this.player_id : that.KnowPlayerId.promise()
            player_id: this.KnowPlayerId.promise()
        });
        this.tabBar.Layout.Games.GameList.PlayerGameListView._eventOutput.pipe(this.contentScrollView);

        this.tabBar.Layout.Games.GameList.add(this.tabBar.Layout.Games.GameList.PlayerGameListView);

        // Stats
        this.tabBar.Layout.Stats = new Surface({
            content: 'stats',
            size: [undefined, undefined],
            properties: {
                backgroundColor: '#85c3f2'
            }
        });
        this.tabBar.Layout.Stats.pipe(this.contentScrollView);


        // MediaBlocks
        this.tabBar.Layout.Media = new View();
        this.tabBar.Layout.Media.MediaBlocks = new View();

        // Add MediaList subview of all Media for this player
        this.tabBar.Layout.Media.MediaBlocks.PlayerMediaBlocksView = new PlayerMediaBlocksView({
            // use player_id, or the promise
            // player_id: this.player_id && this.player_id.length === 24 ? this.player_id : that.KnowPlayerId.promise()
            player_id: this.KnowPlayerId.promise()
        });
        this.tabBar.Layout.Media.MediaBlocks.PlayerMediaBlocksView._eventOutput.pipe(this.contentScrollView);

        this.tabBar.Layout.Media.MediaBlocks.add(this.tabBar.Layout.Media.MediaBlocks.PlayerMediaBlocksView);
        this.tabBar.Layout.Media.add(this.tabBar.Layout.Media.MediaBlocks);

        // Compare
        // - degrees of separation between me and this person
        // - head-to-head results
        this.tabBar.Layout.Compare = new View();
        this.tabBar.Layout.Compare.Surface = new Surface({
            content: 'You are <strong>2</strong> degrees away from this competitor',
            size: [undefined, undefined],
            properties: {
                padding: "20px",
                paddingTop: "40px",
                textAlign: "center",
                color: "#444"
            }
        });
        this.tabBar.Layout.Compare.add(this.tabBar.Layout.Compare.Surface);

        // // Default show stories
        // this.tabBar.Layout.Lightbox.show(this.tabBar.Layout.Stories);
        this.tabBar.Layout.add(this.tabBar.Layout.Lightbox);

        this.contentScrollView.Views.push(this.tabBar.Layout);

        this.tabBar.on('select', function(result){
            switch(result.id){
                case 'stories':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Stories);
                    that.tabBar.Layout.Stories.PlayerStoryListView.collection.pager();
                    break;

                case 'games':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Games);
                    break;

                // case 'game_blocks':
                //     that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.GameBlocks);
                //     break;

                // case 'game_list':
                //     that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.GameList);
                //     break;

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
        this.tabBar.select('games');


        this.tabBar.Layout.Games.tabBar.Grid.on('select', function(result){
            switch(result.id){
                // case 'stories':
                //     that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Stories);
                //     break;

                // case 'games':
                //     that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Games);
                //     break;

                case 'game_blocks':
                    that.tabBar.Layout.Games.Lightbox.show(that.tabBar.Layout.Games.GameBlocks);
                    break;

                case 'game_list':
                    that.tabBar.Layout.Games.Lightbox.show(that.tabBar.Layout.Games.GameList);
                    break;

                // case 'stats':
                //     that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Stats);
                //     break;

                // case 'media':
                //     that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Media);
                //     break;

                default:
                    alert('none chosen');
                    break;
            }
        });
        this.tabBar.Layout.Games.tabBar.Grid.select('game_blocks');



        // this.surface_PlayerInfo = new View();
        // this.surface_PlayerInfo.Surface = new Surface({
        //     content: App.Data.User.get('profile.name'),
        //     size: [150, 60],
        //     properties: {
        //         backgroundColor: "white",
        //         borderRadius: "8px",
        //         color: "black",
        //         lineHeight: "60px",
        //         fontSize: "22px",
        //         textAlign: "center"
        //     }
        // });
        // App.Data.User.on('change:profile.name', function(){
        //     that.surface_PlayerInfo.Surface.setContent(App.Data.User.get('profile.name'));
        // });
        // this.surface_PlayerInfo.SizeOpacityStateModifier = new StateModifier({
        //     size: [undefined, 80],
        //     opacity: 0.5
        // });
        // this.surface_PlayerInfo.OriginStateModifier = new StateModifier({
        //     origin: [0.5, 0.5]
        // });
        // this.surface_PlayerInfo.add(this.surface_PlayerInfo.SizeOpacityStateModifier).add(this.surface_PlayerInfo.OriginStateModifier).add(this.surface_PlayerInfo.Surface);
        // this.contentScrollView.Views.push(this.surface_PlayerInfo);
        // this.surface_PlayerInfo.Surface.on('click', function(){
        //     App.history.navigate('profile/edit');
        // });
        // this.surface_PlayerInfo.Surface.pipe(this.contentScrollView);

        // this.create_grid_total();
        // this.create_game_list();
        
        // // Tie the sideView and the main body together (why the fuck are we doing it like this?)
        // // - this means the origin of the SideView is at the top-left of the ContentBody, no the topLeft of the page (like I kinda expect)
        // this.mainNode = new RenderNode();
        // this.mainNode.add(this.contentScrollView);
        // this.mainNode.add(this.sideView.OpacityModifier).add(this.sideView);

        // this.sideView._eventOutput.on("menuToggle", (function(){
        //     this.menuToggle();
        // }).bind(this));

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

    PageView.prototype.refreshData = function() {
        try {
            this.model.fetch();

        }catch(err){};

        try {
            this.tabBar.Layout.Games.GameBlocks.PlayerGameBlocksView.collection.fetch();
        }catch(err){
            console.error(err);
        };
        try {
            this.tabBar.Layout.Media.MediaBlocks.PlayerMediaBlocksView.collection.fetch();
        }catch(err){
            console.error(err);
        };
    };


    // Upload image to server
    PageView.prototype.uploadProfileImage = function(imageURI){
        var that = this;

        console.log('uploading...');
        console.log(this.player_id);
        console.log({
            token : App.Data.UserToken,
            player_id : this.player_id,
            extra: {
                "description": "Uploaded from my phone testing 234970897"
            }
        });

        var ft = new FileTransfer(),
            options = new FileUploadOptions();

        options.fileKey = "file";
        options.fileName = 'filename.jpg'; // We will use the name auto-generated by Node at the server side.
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
        options.params = {
            token : App.Data.UserToken,
            player_id : this.player_id,
            extra: {
                "description": "Uploaded from my phone testing 193246"
            }
        };

        ft.onprogress = function(progressEvent) {
            
            if (progressEvent.lengthComputable) {
                // loadingStatus.setPercentage(progressEvent.loaded / progressEvent.total);
                // console.log('Percent:');
                // console.log(progressEvent.loaded);
                // console.log(progressEvent.total);
                console.log((progressEvent.loaded / progressEvent.total) * 100);
                Utils.Notification.Toast((Math.floor((progressEvent.loaded / progressEvent.total) * 1000) / 10).toString() + '%');
            } else {
                // Not sure what is going on here...
                // loadingStatus.increment();
                console.log('not computable?, increment');
            }
        };
        ft.upload(imageURI, Credentials.server_root + "/media/profilephoto",
            function (e) {
                // getFeed();
                // alert('complete');
                // alert('upload succeeded');
                Utils.Notification.Toast('Upload succeeded');

                Utils.Notification.Toast('Refreshing');

                // update collection
                Timer.setTimeout(function(){
                    Utils.Notification.Toast('Refreshing');
                    that.model.fetch();
                },5000);

            },
            function (e) {
                alert("Upload failed");
                Utils.Notification.Toast('Upload failed');
                // Utils.Notification.Toast(e);
            }, options);
    };

    PageView.prototype.update_content = function(){
        var that = this;

        if(that.model != undefined && that.model.hasFetched){
            // pass

            // name
            if(that.model.get('Profile.name')){
                this.profileLeft.ProfileName.Surface.setContent(that.model.get('Profile.name'));
            } else {
                // No profile
                this.profileLeft.ProfileName.Surface.setContent(that.model.get('name'));
            }

            // Profile Photo
            if(that.model.get('Profile.photo.urls')){
                that.profileLeft.ProfileImage.Surface.setContent(that.model.get('Profile.photo.urls.thumb100x100'));
            } else {
                that.profileLeft.ProfileImage.Surface.setContent('img/generic-profile.png');
            }

            // username (header)
            if(that.model.get('Profile.username') !== false){
                // this.profileLeft.ProfileName.setContent(that.model.get('Profile.name'));
                that.header.navBar.title.setContent(that.model.get('Profile.username') ? that.model.get('Profile.username') : '');
            } else {
                // not me
                // - no email set
                // - not showing any name for them
                that.header.navBar.title.setContent('');
                // that.header.navBar.title.setContent(that.model.get('Profile.email') ? that.model.get('email').split('@')[0].split('+')[0] : '');
            }

            // back button and "settings" link
            if(that.is_me === true){
                // no back button
                // - show settings
                that.headerContent.Lightbox.show(that.headerContent.Settings);

            } else {
                that.header.navBar.back.setSize([20,undefined]);
                that.header.navBar.back.setContent('<i class="icon ion-android-arrow-back"></i>');
                // that.header.navBar.title.setContent(that.model.get('email').split('@')[0].split('+')[0]);
            }

        }

        // Total results/places
        if(that.stats_collection != undefined && that.stats_collection.hasFetched){
            // Summary/stat surfaces (update)

            // wins
            that.profileRight.OverallRecord.Left.setContent('<div>'+that.stats_collection.summary[that.player_id].w+'</div><div>wins</div>');
            // winning percentage
            that.profileRight.OverallRecord.LeftMiddle.setContent('<div>'+numeral(that.stats_collection.summary[that.player_id].wp).format('.000')+'</div><div>Win %</div>');
            // 1st place
            that.profileRight.OverallRecord.Middle.setContent('<div>'+that.stats_collection.summary[that.player_id]['1']+'</div><div>1st</div>');


            // _.each(that.stats_collection.summary[that.player_id], function(value, key){
            //     var tmpKey = '';
            //     switch(key){
            //         case "1":
            //         case "2":
            //         case "3":
            //             tmpKey = numeral(key).format('0o');
            //             break;
            //         case "4":
            //             tmpKey = numeral(key).format('0o') + '+';
            //             break;

            //         case "w":
            //         case "l":
            //         case "t":
            //             tmpKey = key.toUpperCase();
            //             break;
            //     }
            //     that.GridSurfacesTotal[key].setContent(tmpKey + ': ' + value.toString());
            // });

        }

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

    PageView.prototype.create_game_list = function(){
        var that = this;
        
        // Title
        this.GameTitle = new View();
        this.GameTitle.Surface = new Surface({
            content: 'Games >',
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
        this.GameTitle.Surface.on('click', function(){
            // navigate to the normal games/summary view (that lists the games, scoreboard, filter, etc.)
            // - first set the parameters/flags that it will need to read
            App.Cache.NewSummary = {
                player_ids: [App.Data.Players.findMe().get('_id')] // just me
            };
            App.history.navigate('player/comparison/' + CryptoJS.SHA3(JSON.stringify(App.Cache.NewSummary)));
        });
        this.GameTitle.Surface.pipe(this.contentScrollView);
        this.GameTitle.add(this.GameTitle.Surface);
        this.contentScrollView.Views.push(this.GameTitle);

        // Add GameList subview of all Games for this player
        this.PlayerGameListView = new PlayerGameListView({
            // use player_id, or the promise
            player_id: this.player_id && this.player_id.length === 24 ? this.player_id : that.KnowPlayerId.promise()
        });
        this.PlayerGameListView._eventOutput.pipe(this.contentScrollView);

        this.contentScrollView.Views.push(this.PlayerGameListView);

    };

    PageView.prototype.menuToggle = function() {
        console.log("menuToggle'ing");
        if (!this.sideView.open) {
            console.log('opening');
            this.mainTransitionable.set(200, { duration: 500, curve: 'easeOut' });
            this.sideView.flipOut();
        } else {
            console.log('closing');
            this.mainTransitionable.set(0, { duration: 500, curve: 'easeOut' });
            this.sideView.flipIn();
        }
        this.sideView.open = !this.sideView.open;
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

                        // Hiding the sideView
                        this.sideView.OpacityModifier.setOpacity(0);

                        // Content
                        window.setTimeout(function(){
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

                        // SideView must be visible
                        this.sideView.OpacityModifier.setOpacity(1);

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
                        window.setTimeout(function(){

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
