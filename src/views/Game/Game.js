
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
    var GameModel = require('models/game');

    // Subviews

    // Game Results
    var GameResultsView      = require('views/Game/Subviews/GameResults');

    // Game story/chat
    var GameStoryListView      = require('views/Game/Subviews/GameStoryList');

    // Game Sharing
    var GameShareView      = require('views/Game/Subviews/GameShare');

    // // Game Media (unused atm)
    // var PlayerGameListView      = require('views/Player/PlayerGameList');

    // // Media Blocks
    // var PlayerMediaBlocksView      = require('views/Player/PlayerMediaBlocks');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.game_id = that.options.args[0];
        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
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
        // that.stats_collection = new GameModel.GameCollection([],{
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
        this.model = new GameModel.Game({
            _id: this.game_id
        });
        this.model.fetch({prefill: true});
    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: "Game Overview",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: '<span class="icon ion-refresh"></span>'
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click',function(){
            // that.refreshData();
            App.history.back();
        });
        this.header._eventOutput.on('more',function(){
            // if(that.model.get('CarPermission.coowner')){
            //     App.history.navigate('car/permission/' + that.model.get('_id'), {trigger: true});
            // }
            // that.menuToggle();
            that.refreshData();
        });
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

        // create the content
        this.contentScrollView = new ModifiedScrollView(App.Defaults.ScrollView);
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
        //     // that.PlayerGameListView.next_page.call(that.PlayerGameListView);
        // });

        // top of game
        // - Sport Name
        // - if I have it starred (todo)
        // - if I need to certify

        this.gameLayout = new View();
        this.gameLayout.SizeMod = new StateModifier({
            size: [undefined, 110]
        });
        this.gameLayout.SeqLayout = new GridLayout({ //FlexibleLayout({
            dimensions: [1,1]
            // ratios: [true, 4, 200, 4] // content, spacer, content, spacer
        });
        this.gameLayout.SeqLayout.Views = [];
        this.gameLayout.add(this.gameLayout.SizeMod).add(this.gameLayout.SeqLayout);

        // Left side
        // - everything, there is no right side yet!
        this.gameLeft = new View();
        this.gameLeft.SizeMod = new StateModifier({
            size: [undefined, undefined]
        });
        this.gameLeft.SeqLayout = new SequentialLayout();
        this.gameLeft.SeqLayout.Views = [];

        // Spacer
        this.gameLeft.topSpacer1 = new Surface({
            content: '',
            size: [undefined, 10]
        });
        this.gameLeft.SeqLayout.Views.push(this.gameLeft.topSpacer1);

        // Sport Name
        this.gameLeft.SportName = new View();
        this.gameLeft.SportName.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.gameLeft.SportName.Surface = new Surface({
            content: '',
            size: [undefined, 40],
            // size: [undefined,80],
            // classes: ['ellipsis'],
            properties: {
                backgroundColor: 'white',
                color: '#333',
                fontSize: "20px",
                lineHeight: "40px",
                padding: "0 0 0 8px",
                fontWeight: "bold",
                // textAlign: "center"
            }
        });
        this.gameLeft.SportName.add(this.gameLeft.SportName.StateModifier).add(this.gameLeft.SportName.Surface);
        this.gameLeft.SeqLayout.Views.push(this.gameLeft.SportName);

        // Datetime
        this.gameLeft.GameDatetime = new View();
        this.gameLeft.GameDatetime.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.gameLeft.GameDatetime.Surface = new Surface({
            content: '',
            size: [undefined, 20],
            // size: [undefined,80],
            // classes: ['ellipsis'],
            properties: {
                backgroundColor: 'white',
                color: '#888',
                fontSize: "14px",
                lineHeight: "20px",
                padding: "0 0 0 8px"
            }
        });
        this.gameLeft.GameDatetime.add(this.gameLeft.GameDatetime.StateModifier).add(this.gameLeft.GameDatetime.Surface);
        this.gameLeft.SeqLayout.Views.push(this.gameLeft.GameDatetime);

        // Holder for Starred and Certifying
        this.gameLeft.StarCertifyHolder = new View();
        this.gameLeft.StarCertifyHolder.SizeMod = new StateModifier({
            size: [undefined, 40]
        });
        this.gameLeft.StarCertifyHolder.Grid = new FlexibleLayout({
            direction: FlexibleLayout.DIRECTION_X,
            ratios: [1, 4] // content, spacer, content, spacer
        });
        this.gameLeft.StarCertifyHolder.Grid.Views = [];
        this.gameLeft.StarCertifyHolder.add(this.gameLeft.StarCertifyHolder.SizeMod).add(this.gameLeft.StarCertifyHolder.Grid);

        // Starred
        this.gameLeft.Starred = new View();
        this.gameLeft.Starred.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.gameLeft.Starred.Surface = new Surface({
            content: '',
            size: [undefined, 40],
            classes: ['game-starred-container-default'],
            // size: [undefined,80],
            // classes: ['ellipsis'],
            properties: {
                backgroundColor: 'white',
                color: '#000',
                fontSize: "20px",
                lineHeight: "40px",
                padding: "0 0 0 8px"
            }
        });
        this.gameLeft.Starred.Surface.on('click', function(){
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
                url: Credentials.server_root + 'game/star/' + that.model.get('_id'),
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
        this.gameLeft.Starred.add(this.gameLeft.Starred.StateModifier).add(this.gameLeft.Starred.Surface);
        // this.gameLeft.SeqLayout.Views.push(this.gameLeft.Starred);
        this.gameLeft.StarCertifyHolder.Grid.Views.push(this.gameLeft.Starred);

        // // Spacer
        // this.spacer1 = new Surface({
        //     size: [10,undefined]
        // });
        // this.gameLeft.StarCertifyHolder.Grid.Views.push(this.spacer1);

        // Certify the game
        // Connect with the person (or are connected already)
        this.gameLeft.CertifyLayout = new RenderController();
        this.gameLeft.CertifyLayout.View = new View();
        this.gameLeft.CertifyLayout.SizeMod = new StateModifier({
            size: [undefined, 40]
        });
        this.gameLeft.CertifyLayout.View.add(this.gameLeft.CertifyLayout.SizeMod).add(this.gameLeft.CertifyLayout);

        // - Need to certify (is null)
        this.gameLeft.CertifyNull = new View();
        this.gameLeft.CertifyNull.StateModifier = new StateModifier({
            // origin: [0, 0]
        });
        this.gameLeft.CertifyNull.Surface = new Surface({
            size: [undefined, 32],
            content: "Tap to Certify Game",
            classes: ['form-button-submit-default'],
            properties: {
                lineHeight: "32px",
                backgroundColor: "#00B23F"
            }
        });
        this.gameLeft.CertifyNull.Surface.on('click', function(){
            // App.history.navigate('profile/edit');
            // alert('certify this game');
            Utils.Notification.Toast('Certifying...todo');
            // patch...
        });
        this.gameLeft.CertifyNull.add(this.gameLeft.CertifyNull.StateModifier).add(this.gameLeft.CertifyNull.Surface);

        // - Already certified
        this.gameLeft.CertifiedTrue = new View();
        this.gameLeft.CertifiedTrue.Surface = new Surface({
            size: [undefined, 32],
            content: "Game Certified by You",
            properties: {
                textAlign: 'center',
                lineHeight: '32px',
                fontSize: '14px',
                color: "#999",
                backgroundColor: "#f9f9f9",
                borderRadius: "3px"
            }
        });
        this.gameLeft.CertifiedTrue.add(this.gameLeft.CertifiedTrue.Surface);

        // - De-certified (refused to certify) this game
        this.gameLeft.CertifiedFalse = new View();
        this.gameLeft.CertifiedFalse.Surface = new Surface({
            size: [undefined, 32],
            content: "You Refused to Certify!",
            properties: {
                textAlign: 'center',
                lineHeight: '32px',
                fontSize: '14px',
                color: "white",
                backgroundColor: "#FF0900",
                borderRadius: "3px"
            }
        });
        // this.gameLeft.Connect.Surface.on('click', function(){
        //     App.history.navigate('profile/edit');
        // });
        this.gameLeft.CertifiedFalse.add(this.gameLeft.CertifiedFalse.Surface);

        // this.gameLeft.CertifyLayout will .show() the correct one, after the model is loaded

        // this.gameLeft.SeqLayout.Views.push(this.gameLeft.CertifyLayout.View);
        this.gameLeft.StarCertifyHolder.Grid.Views.push(this.gameLeft.CertifyLayout.View);
        // this.gameLeft.StarCertifyHolder.Grid.Views.push(new Surface({
        //     size: [undefined, undefined],
        //     properties: {
        //         background: 'blue'
        //     }
        // }));

        this.gameLeft.StarCertifyHolder.Grid.sequenceFrom(this.gameLeft.StarCertifyHolder.Grid.Views);

        this.gameLeft.SeqLayout.Views.push(this.gameLeft.StarCertifyHolder);


        // // Spacer
        // this.spacer2 = new Surface({
        //     size: [10,undefined]
        // });
        // this.gameLeft.StarCertifyHolder.Grid.Views.push(this.spacer2);


        // Spacer
        this.gameLeft.topSpacer3 = new Surface({
            content: '',
            size: [undefined, 10]
        });
        this.gameLeft.SeqLayout.Views.push(this.gameLeft.topSpacer3);

        this.gameLeft.SeqLayout.sequenceFrom(this.gameLeft.SeqLayout.Views);

        this.gameLeft.add(this.gameLeft.SizeMod).add(this.gameLeft.SeqLayout);
        this.gameLayout.SeqLayout.Views.push(this.gameLeft);

        // // Left-spacer
        // this.gameLeft.SpacerMidLeft = new Surface({
        //     content: '',
        //     size: [undefined, 1]
        // });
        // this.gameLayout.SeqLayout.Views.push(this.gameLeft.SpacerMidLeft);

        // // Right
        // // - overall score, etc.
        // this.profileRight = new View();
        // this.profileRight.SeqLayout = new SequentialLayout();
        // this.profileRight.SeqLayout.Views = [];

        // // Spacer
        // this.profileRight.topSpacer2 = new Surface({
        //     content: '',
        //     size: [undefined, 20]
        // });
        // this.profileRight.SeqLayout.Views.push(this.profileRight.topSpacer2);

        // // Overall Record
        // this.profileRight.OverallRecord = new View();
        // this.profileRight.OverallRecord.Grid = new GridLayout({
        //     dimensions: [4,1]
        // });
        // this.profileRight.OverallRecord.add(this.profileRight.OverallRecord.Grid);
        // this.profileRight.OverallRecord.Grid.Views = [];

        // // Surfaces for Overall Record
        // this.profileRight.OverallRecord.Left = new Surface({
        //     // size: [100, 40],
        //     content: '<div>&nbsp;</div><div>wins</div>',
        //     classes: ['profile-overall-record-grid-item']
        // });
        // this.profileRight.OverallRecord.LeftMiddle = new Surface({
        //     // size: [100, 40],
        //     content: '<div>&nbsp;</div><div>Win %</div>',
        //     classes: ['profile-overall-record-grid-item']
        // });
        // this.profileRight.OverallRecord.Middle = new Surface({
        //     // size: [100, 40],
        //     content: '<div>&nbsp;</div><div>1st</div>',
        //     classes: ['profile-overall-record-grid-item']
        // });

        // this.profileRight.OverallRecord.Left.on('click', function(){
        //     App.history.navigate('ranking/overall/none/' + App.Data.Players.findMe().get('_id') + '/all');
        // });
        // this.profileRight.OverallRecord.LeftMiddle.on('click', function(){
        //     App.history.navigate('ranking/overall/none/' + App.Data.Players.findMe().get('_id') + '/all');
        // });
        // this.profileRight.OverallRecord.Middle.on('click', function(){
        //     App.history.navigate('ranking/overall/none/' + App.Data.Players.findMe().get('_id') + '/all');
        // });

        // this.profileRight.OverallRecord.Right = new Surface({
        //     // size: [100, 40],
        //     content: '<div>&nbsp;</div><div>Nemeses</div>',
        //     classes: ['profile-overall-record-grid-item']
        // });
        // this.profileRight.OverallRecord.Right.on('click', function(){
        //     console.log(that.player_id);
        //     // debugger;
        //     App.history.navigate('player/list/' + that.player_id, {history: false});
        // });
        // this.profileRight.OverallRecord.Grid.Views.push(this.profileRight.OverallRecord.Left);
        // this.profileRight.OverallRecord.Grid.Views.push(this.profileRight.OverallRecord.LeftMiddle);
        // this.profileRight.OverallRecord.Grid.Views.push(this.profileRight.OverallRecord.Middle);
        // this.profileRight.OverallRecord.Grid.Views.push(this.profileRight.OverallRecord.Right);

        // this.profileRight.OverallRecord.Grid.sequenceFrom(this.profileRight.OverallRecord.Grid.Views);

        // this.profileRight.SeqLayout.Views.push(this.profileRight.OverallRecord);


        // // Edit Your Profile
        // // Connect with the person (or are connected already)
        // this.profileRight.Layout = new RenderController();

        // // - Edit Your Profile
        // this.profileRight.EditProfile = new View();
        // this.profileRight.EditProfile.StateModifier = new StateModifier({
        //     // origin: [0, 0]
        // });
        // this.profileRight.EditProfile.Surface = new Surface({
        //     size: [undefined, 32],
        //     content: "EDIT YOUR PROFILE",
        //     properties: {
        //         textAlign: 'center',
        //         lineHeight: '32px',
        //         fontSize: '14px',
        //         color: "white",
        //         backgroundColor: "#07b40c",
        //         borderRadius: "3px"
        //     }
        // });
        // this.profileRight.EditProfile.Surface.on('click', function(){
        //     App.history.navigate('profile/edit');
        // });
        // this.profileRight.EditProfile.add(this.profileRight.EditProfile.StateModifier).add(this.profileRight.EditProfile.Surface);

        // // - Connect with the person
        // this.profileRight.Connect = new View();
        // this.profileRight.Connect.Surface = new Surface({
        //     size: [undefined, 32],
        //     content: "Not you!",
        //     properties: {
        //         textAlign: 'center',
        //         lineHeight: '32px',
        //         fontSize: '14px',
        //         color: "#555",
        //         backgroundColor: "#f9f9f9",
        //         borderRadius: "3px"
        //     }
        // });
        // // this.profileRight.Connect.Surface.on('click', function(){
        // //     App.history.navigate('profile/edit');
        // // });
        // this.profileRight.Connect.add(this.profileRight.Connect.Surface);

        // // - Connected with the person
        // this.profileRight.Connected = new View();
        // this.profileRight.Connected.Surface = new Surface({
        //     size: [undefined, 32],
        //     content: "You are Nemeses!",
        //     properties: {
        //         textAlign: 'center',
        //         lineHeight: '32px',
        //         fontSize: '14px',
        //         color: "white",
        //         backgroundColor: "#E87B0C",
        //         borderRadius: "3px"
        //     }
        // });
        // // this.profileRight.Connect.Surface.on('click', function(){
        // //     App.history.navigate('profile/edit');
        // // });
        // this.profileRight.Connected.add(this.profileRight.Connected.Surface);

        // // this.profileRight.Layout will .show() the correct one, after the model is loaded

        // this.profileRight.SeqLayout.Views.push(this.profileRight.Layout);


        // // Spacer
        // this.profileRight.Spacer = new Surface({
        //     content: '',
        //     size: [undefined, 1]
        // });
        // this.profileRight.SeqLayout.Views.push(this.profileRight.Spacer);

        // this.profileRight.SeqLayout.sequenceFrom(this.profileRight.SeqLayout.Views);

        // this.profileRight.add(this.profileRight.SeqLayout);
        // this.gameLayout.SeqLayout.Views.push(this.profileRight);

        // // Far-right spacer
        // this.profileRight.SpacerFarRight = new Surface({
        //     content: '',
        //     size: [undefined, 1]
        // });
        // this.gameLayout.SeqLayout.Views.push(this.profileRight.SpacerFarRight);

        this.gameLayout.SeqLayout.sequenceFrom(this.gameLayout.SeqLayout.Views);

        this.contentScrollView.Views.push(this.gameLayout);


        // return;



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
        this.tabBar.defineSection('results', {
            content: '<i class="icon ion-game-controller-a"></i><div>Results</div>',
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
        this.tabBar.defineSection('feed', {
            content: '<i class="icon ion-android-forums"></i><div>Feed</div>',
            onClasses: ['profile-tabbar-default', 'on'],
            offClasses: ['profile-tabbar-default', 'off']
        });
        this.tabBar.defineSection('share', {
            content: '<i class="icon ion-android-share"></i><div>Share</div>',
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


        // Results
        this.tabBar.Layout.Results = new View();
        // Add Results Subview
        // console.log(this.player_id);
        this.tabBar.Layout.Results.GameResultsView = new GameResultsView({
            // use player_id, or the promise
            model: this.model
        });
        this.tabBar.Layout.Results.GameResultsView._eventOutput.pipe(this.contentScrollView);
        this.tabBar.Layout.Results.add(this.tabBar.Layout.Results.GameResultsView);

        // Share
        this.tabBar.Layout.Share = new View();
        // Add Results Subview
        // console.log(this.player_id);
        this.tabBar.Layout.Share.GameShareView = new GameShareView({
            // use player_id, or the promise
            model: this.model
        });
        this.tabBar.Layout.Share.GameShareView._eventOutput.pipe(this.contentScrollView);
        this.tabBar.Layout.Share.add(this.tabBar.Layout.Share.GameShareView);

        // Stories
        this.tabBar.Layout.Stories = new View();
        // Add Stories Subview
        // console.log(this.player_id);
        this.tabBar.Layout.Stories.GameStoryListView = new GameStoryListView({
            // use player_id, or the promise
            game_id: this.game_id
        });
        this.tabBar.Layout.Stories.GameStoryListView._eventOutput.pipe(this.contentScrollView);
        this.tabBar.Layout.Stories.add(this.tabBar.Layout.Stories.GameStoryListView);


        this.tabBar.Layout.add(this.tabBar.Layout.Lightbox);
        this.contentScrollView.Views.push(this.tabBar.Layout);

        this.tabBar.on('select', function(result){
            switch(result.id){

                case 'results':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Results);
                    break;

                case 'feed':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Stories);

                    that.tabBar.Layout.Lightbox.getSize = function(){
                        // console.log(that.tabBar.Layout.Stories.GameStoryListView.contentLayout.getSize(true));
                        return that.tabBar.Layout.Stories.GameStoryListView.getSize();
                    };

                    that.tabBar.Layout.Stories.GameStoryListView.collection.pager();
                    break;

                case 'share':
                    that.tabBar.Layout.Lightbox.show(that.tabBar.Layout.Share);
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
        this.tabBar.select('results');



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
        // this.contentLightbox.getSize = function(){
        //     return 
        // }
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
            this.tabBar.Layout.Stories.GameStoryListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.update_content = function(){
        var that = this;

        console.info('update_content');
        if(that.model != undefined && that.model.hasFetched){
            // pass

            // sport name
            this.gameLeft.SportName.Surface.setContent(that.model.get('sport_id.name'));

            // datetime
            this.gameLeft.GameDatetime.Surface.setContent(moment(that.model.get('created')).format('MMMM Do'));

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
                that.gameLeft.Starred.Surface.setContent('<i class="icon ion-ios7-star"></i><span>'+StarTotal+'</span>');
            } else {
                that.gameLeft.Starred.Surface.setContent('<i class="icon ion-ios7-star-outline"></i><span>'+StarTotal+'</span>');
            }

            // Certified?
            var myResult = that.GetMyResult();
            if(myResult !== false){
                switch(myResult.certified){
                    case false:
                        this.gameLeft.CertifyLayout.show(this.gameLeft.CertifiedFalse);
                        break;
                    case null:
                        this.gameLeft.CertifyLayout.show(this.gameLeft.CertifyNull);
                        break;
                    case true:
                        this.gameLeft.CertifyLayout.show(this.gameLeft.CertifiedTrue);
                        break;

                }
            }
            
            // // Profile Photo
            // if(that.model.get('profilephoto.urls')){
            //     this.gameLeft.ProfileImage.Surface.setContent(that.model.get('profilephoto.urls.thumb100x100'));
            // } else {
            //     this.gameLeft.ProfileImage.Surface.setContent('img/generic-profile.png');
            // }

            // // username (header)
            // // - using "email" for now
            // if(that.model.get('Profile.email') !== false){
            //     // this.gameLeft.ProfileName.setContent(that.model.get('Profile.name'));
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
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Content
                        window.setTimeout(function(){
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // // Slide left
                            // that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * -1) - 100,0,0), transitionOptions.outTransition);

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
                        // this.sideView.OpacityModifier.setOpacity(1);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.ContentStateModifier.setOpacity(0);
                        // that.ContentStateModifier.setTransform(Transform.translate(0,0,0));

                        // // Header
                        // // - no extra delay
                        // window.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // // Content
                        // // - extra delay for content to be gone
                        // window.setTimeout(function(){

                        //     // Bring map content back
                        //     that.ContentStateModifier.setOpacity(1, transitionOptions.inTransition);

                        // }, delayShowing + transitionOptions.outTransition.duration);


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
