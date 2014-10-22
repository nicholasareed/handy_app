
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
    var UserModel = require('models/user');
    var FriendModel = require('models/friend');
    var InvoiceModel = require('models/invoice');

    // var GameModel = require('models/game');

    // Subviews

    // // Side menu of list of cars
    // var DashProfileMenuView      = require('views/Profile/DashProfileMenu');

    // // Profile Stories
    // var ProfileStoryListView      = require('views/Profile/ProfileStoryList');

    // // Game Blocks
    // var ProfileGameBlocksView      = require('views/Profile/ProfileGameBlocks');
    // // Game List
    // var ProfileGameListView      = require('views/Profile/ProfileGameList');

    // // Media Blocks
    // var ProfileMediaBlocksView      = require('views/Profile/ProfileMediaBlocks');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.profile_id = this.options.args[0];
        var profile_id = this.profile_id;

        App.history.modifyLast({
            tag: 'user'
        });

        // // Are we getting a profile_id, or do we need to get the current user's profile_id?
        // this.KnowProfileId = $.Deferred();
        // var profile_id; 
        // if(this.options.args.length > 0 && this.options.args[0]){
        //     // It is set
        //     // - resolve now
        //     profile_id = this.options.args[0];
        // } else {
        //     // Trying to go to the ond "Dash" (the current user)
        //     // Sometimes we don't immediately know the current owner's ID
        //     // this.KnowProfileId = $.Deferred();
        //     this.profile_id = App.Data.User.get('_id'); //localStorage.getItem('home_profile_id');
        //     // this.profile_id = profile_id && profile_id.length == 24 ? profile_id : false;
        // }

        // // If profile_id is set, then use it, otherwise get the user's profile_id)
        // if(this.profile_id){
        //     // Resolve the KnowProfileId right away
        //     // - might use it later in a Deferred context
        //     this.KnowProfileId.resolve(this.profile_id);
        // } else {
        //     // Determine my user._id
        //     App.Data.User.populated().then(function(){
        //         that.profile_id = App.Data.User.get('_id');
        //         that.KnowProfileId.resolve(App.Data.User.get('_id'));
        //     });
        // }

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });


        this.createContent();
        this.createHeader();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

        this.loadModels();

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;


    PageView.prototype.loadModels = function(){
        var that = this;

        // Get Profile (Me)
        that.model = new UserModel.User({
            profile_id: this.profile_id
        });
        that.model.fetch({prefill: true});

        // Get Friend relationship
        that.friend_model = new FriendModel.Friend({
            friend_id: this.profile_id
        });
        that.friend_model.fetch({prefill: true});

        // Listen for 'showing' events
        that._eventInput.on('inOutTransition', function(args){
            // 0 = direction
            if(args[0] == 'showing'){
                that.model.fetch();
            }
        });

        that.model.populated().then(function(){

            // Show user information
            that.contentLightbox.show(that.contentScrollView);

            // The following is only run once
            that.is_me = true;

            // Show Edit or Connect
            // - determine is_me
            if(that.model.get('_id') == App.Data.User.get('_id')){
                console.error('is_me!');
                // that.profileMiddle.Layout.show(that.profileMiddle.EditProfile);
                that.profileMiddle.Layout.hide();
            } else {
                that.is_me = false;
                console.error('Not is_me!');
                // var my_friend_profile_ids = _.pluck(App.Data.Profiles.toJSON(), '_id');
                
                // that.profileMiddle.Layout.show(that.profileMiddle.Connect);
                that.profileMiddle.Layout.hide();

                // // if(_.intersection(that.model.get('related_profile_ids'),my_friend_profile_ids).length > 0){
                // //     that.profileMiddle.Layout.show(that.profileMiddle.Connected);
                // // } else {
                //     that.profileMiddle.Layout.show(that.profileMiddle.Connect);
                // // }
            }

            // // compare/against
            // // only do this one time
            // if(that.is_me === false){

            //     that.tabBar.defineSection('compare', {
            //         content: '<i class="icon ion-android-contacts"></i><div>Compare</div>',
            //         onClasses: ['profile-tabbar-default', 'on'],
            //         offClasses: ['profile-tabbar-default', 'off']
            //     });

            // }

            // update going forward
            that.update_content();
            that.friend_model.on('change', that.update_content.bind(that));
            that.model.on('change', that.update_content.bind(that));

        });

    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // -- settings/message (lightbox)
        this.headerContent = new View();
        this.headerContent.Middle = new View();
        this.headerContent.Middle.Lightbox = new RenderController();
        this.headerContent.Middle.SizeMod = new StateModifier({
            size: [60, 60]
        });
        this.headerContent.Middle.add(this.headerContent.Middle.SizeMod).add(this.headerContent.Middle.Lightbox);

        this.headerContent.Right = new View();
        this.headerContent.Right.Lightbox = new RenderController();
        this.headerContent.Right.SizeMod = new StateModifier({
            size: [60, 60]
        });
        this.headerContent.Right.add(this.headerContent.Right.SizeMod).add(this.headerContent.Right.Lightbox);

        // settings
        this.headerContent.Settings = new Surface({
            content: '<i class="icon ion-gear-a"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Settings.on('longtap', function(){
            Utils.Help('User/View/Settings');
        });
        this.headerContent.Settings.on('click', function(){
            App.history.navigate('settings');
        });
        // message
        this.headerContent.Message = new Surface({
            content: '<i class="icon ion-ios7-chatboxes"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Message.on('longtap', function(){
            Utils.Help('User/View/Message');
        });
        this.headerContent.Message.on('click', function(){
            App.history.navigate('inbox/' + that.profile_id);
        });


        // - search (always visible)
        this.headerContent.Search = new Surface({
            content: '<i class="icon ion-search"></i><div>Search</div>',
            size: [60, undefined],
            classes: ['header-tab-icon-text']
        });
        this.headerContent.Search.on('click', function(){
            App.history.navigate('users/search');
        });

        // // - Invite a Connection
        // this.headerContent.Invite = new Surface({
        //     content: '<i class="icon ion-ios7-plus-outline"></i><div>Invite</div>',
        //     size: [App.Defaults.Header.Icon.w, undefined],
        //     classes: ['header-tab-icon-text']
        // });
        // this.headerContent.Invite.on('click', function(){
        //     // App.Cache.FriendListOptions = {
        //     //     default: 'outgoing'
        //     // };
        //     // App.history.navigate('friend/list');
        //     App.history.navigate('friend/add');
        // });


        // - Connections
        this.headerContent.Friends = new Surface({
            content: '<i class="icon ion-android-friends"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Friends.on('longtap', function(){
            Utils.Help('User/View/Friends');
        });
        this.headerContent.Friends.on('click', function(){
            // App.Cache.FriendListOptions = {
            //     default: 'outgoing'
            // };
            // App.history.navigate('friend/list');
            App.history.navigate('friend/list');
        });

        // // - Availability
        // this.headerContent.Availability = new Surface({
        //     content: '<i class="icon ion-android-friends"></i><div>People</div>',
        //     size: [App.Defaults.Header.Icon.w, undefined],
        //     classes: ['header-tab-icon-text']
        // });
        // this.headerContent.Availability.on('click', function(){
        //     // App.Cache.FriendListOptions = {
        //     //     default: 'outgoing'
        //     // };
        //     // App.history.navigate('friend/list');
        //     App.history.navigate('friend/list');
        // });


        // create the header
        this.header = new StandardHeader({
            content: '', //App.Data.User.get('email').split('@')[0].split('+')[0],
            classes: ["normal-header", "profile-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            // moreContent: "Profiles",
            // backContent: "+Game"
            // moreContent: false,
            moreSurfaces: [
                this.headerContent.Middle,
                this.headerContent.Right,
                // this.headerContent.Invite,
                // this.headerContent.Friends,
                // this.headerContent.spacer1,
                // this.headerContent.Search
            ],
            // backContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
            // App.history.navigate('game/add',{history: false});
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();

            // // rewrite the event
            // // that.ProfileGameListView.collection.requestNextPage();
            // if(that.is_me){
            //     // App.history.navigate('settings');
            // } else {
            //     App.history.back();
            // }
        });
        this.header.pipe(this._eventInput);

        // this._eventInput.on('menutoggle', this.menuToggle.bind(this));
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

        // create the content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // top of profile
        // - profile stuff
        // - basic win/loss details
        this.profileTop = new SequentialLayout();
        this.profileTop.Views = [];

        // Profile Image
        this.profileTop.ProfileImage = new View();
        this.profileTop.ProfileImage.getSize = function(){
            return [undefined,140];
        };
        this.profileTop.ProfileImage.OriginMod = new StateModifier({
            origin: [0.5, 0.5],
            // size: [undefined, 100]
        });
        this.profileTop.ProfileImage.SizeMod = new StateModifier({
            size: [undefined, 140]
            // size: [undefined, 100]
        });
        this.profileTop.ProfileImage.Surface = new ImageSurface({
            content: 'img/generic-profile.png',
            size: [120,120],
            properties: {
                borderRadius: "50%",
                border: "1px solid #444"
            }
        });
        this.profileTop.ProfileImage.add(this.profileTop.ProfileImage.SizeMod).add(this.profileTop.ProfileImage.OriginMod).add(this.profileTop.ProfileImage.Surface);
        this.profileTop.ProfileImage.Surface.on('click', function(){
            // Refresh, easy to do
            that.model.fetch();
            if(that.is_me){
                // Launch options for photo

                // Utils.Notification.Toast('Tap "Edit Your Profile"');

                // Slide to the change screen for the user
                // that.previousPage = window.location.hash;

                // // Options and details
                // Utils.Popover.Buttons({
                //     title: 'New Profile Photo',
                //     // text: 'text here',
                //     buttons: [
                //         {
                //             text: "Camera",
                //             value: "camera",
                //             success: function(){
                //                 Utils.takePicture('camera', {}, that.uploadProfileImage.bind(that), function(message){
                //                     // failed taking a picture
                //                     console.log(message);
                //                     console.log(JSON.stringify(message));
                //                     Utils.Notification.Toast('Failed picture');
                //                 });
                //             }
                //         },
                //         {
                //             text: "Gallery",
                //             value: "gallery",
                //             success: function(){
                //                 Utils.takePicture('gallery', {}, that.uploadProfileImage.bind(that), function(message){
                //                     // failed taking a picture
                //                     console.log(message);
                //                     console.log(JSON.stringify(message));
                //                     Utils.Notification.Toast('Failed picture');
                //                 });
                //             }
                //         }
                //     ]
                // });


                // // Options and details
                // App.Cache.OptionModal = {
                //     list: [
                //         {
                //             text: "Take Photo with Camera",
                //             value: "camera"
                //         },
                //         {
                //             text: "Choose from Gallery",
                //             value: "gallery"
                //         }
                //     ],
                //     on_choose: function(chosen_type){
                //         switch(chosen_type.value){
                //             case 'camera':
                //                 Utils.takePicture('camera', {}, that.uploadProfileImage.bind(that), function(message){
                //                     // failed taking a picture
                //                 });
                //                 break;
                //             case 'gallery':
                //                 Utils.takePicture('gallery', {}, that.uploadProfileImage.bind(that), function(message){
                //                     // failed taking a picture
                //                 });
                //                 break;
                //             default:
                //                 return;
                //         }
                //         // App.history.navigate(that.previousPage);
                //     },
                //     on_cancel: function(){
                //         // App.history.navigate(that.previousPage);
                //     },
                //     title: 'Set a Profile Picture'
                // };

                // // Change history (must)
                // App.history.navigate('modal/list', {history: false});

            }
        });
        this.profileTop.ProfileImage.Surface.pipe(this.contentScrollView);
        this.profileTop.Views.push(this.profileTop.ProfileImage);

        // Spacer
        this.profileTop.topSpacer3 = new Surface({
            content: '',
            size: [undefined, 10]
        });
        this.profileTop.Views.push(this.profileTop.topSpacer3);

        // Profile Name
        this.profileTop.ProfileName = new View();
        this.profileTop.ProfileName.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.profileTop.ProfileName.Surface = new Surface({
            content: '',
            size: [undefined, 40],
            // size: [undefined,80],
            // classes: ['ellipsis'],
            properties: {
                backgroundColor: 'white',
                color: '#333',
                fontSize: "24px",
                lineHeight: "40px",
                fontWeight: "bold",
                textAlign: "center"
            }
        });
        this.profileTop.ProfileName.Surface.pipe(this.contentScrollView);
        this.profileTop.ProfileName.getSize = function(){
            return [undefined, 50];
        };

        this.profileTop.ProfileName.add(this.profileTop.ProfileName.StateModifier).add(this.profileTop.ProfileName.Surface);
        this.profileTop.Views.push(this.profileTop.ProfileName);

        this.profileTop.sequenceFrom(this.profileTop.Views);

        this.contentScrollView.Views.push(this.profileTop);

        // meta options
        // - background_check
        // - recommended (by the viewing user)
        this.profileMeta = new View();

        this.profileMeta.Layout = new RenderController();
        this.profileMeta.Layout.getSize = function(){
            if(this._showing == -1){
                return [undefined, 1]; // 0 causes error
            }
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

        // BackgroundCheck
        this.profileMeta.BackgroundCheck = new View();
        this.profileMeta.BackgroundCheck.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.profileMeta.BackgroundCheck.Surface = new Surface({
            content: '<i class="icon ion-android-star"></i> Background Checked',
            size: [undefined, 80],
            classes: ['view-user-background-check-default']
        });
        this.profileMeta.BackgroundCheck.Surface.pipe(this.contentScrollView);
        this.profileMeta.BackgroundCheck.getSize = function(){
            return [undefined, 80];
        };

        this.profileMeta.BackgroundCheck.add(this.profileMeta.BackgroundCheck.StateModifier).add(this.profileMeta.BackgroundCheck.Surface);
        // this.profileMeta.Views.push(this.profileMeta.BackgroundCheck);

        this.contentScrollView.Views.push(this.profileMeta.Layout);


        // Profile Bio
        this.profileBio = new View();
        this.profileBio.StateModifier = new StateModifier({
            // origin: [0.5, 0]
        });
        this.profileBio.Surface = new Surface({
            content: '',
            size: [undefined, true],
            // size: [undefined,80],
            classes: ['view-user-bio-default'],
        });
        this.profileBio.Surface.pipe(this.contentScrollView);
        this.profileBio.getSize = function(){
            return [undefined, that.profileBio.Surface._size ? that.profileBio.Surface._size[1] : undefined];
        };

        this.profileBio.add(this.profileBio.StateModifier).add(this.profileBio.Surface);
        // this.profileTop.Views.push(this.profileBio);


        this.contentScrollView.Views.push(this.profileBio);



        // Middle RenderController
        // - Connect with the person (or are connected already)
        this.profileMiddle = new View();
        this.profileMiddle.Layout = new RenderController();
        this.profileMiddle.Layout.getSize = function(){
            if(this._showing == -1){
                return [undefined, 1]; // 0 causes error
            }
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

        // - Edit Your Profile
        this.profileMiddle.EditProfile = new View();
        this.profileMiddle.EditProfile.StateModifier = new StateModifier({
            // origin: [0, 0]
        });
        this.profileMiddle.EditProfile.Surface = new Surface({
            size: [undefined, 60],
            content: '<div class="outward-button">Edit Your Profile</div>',
            classes: ['button-outwards-default']
        });
        this.profileMiddle.EditProfile.Surface.pipe(this.contentScrollView);
        this.profileMiddle.EditProfile.Surface.on('click', function(){
            App.history.navigate('profile/edit');
        });
        this.profileMiddle.EditProfile.add(this.profileMiddle.EditProfile.StateModifier).add(this.profileMiddle.EditProfile.Surface);

        // - Connect with the person
        this.profileMiddle.Connect = new View();
        this.profileMiddle.Connect.Surface = new Surface({
            size: [undefined, 60],
            content: "Not you!",
            properties: {
                textAlign: 'center',
                lineHeight: '60px',
                fontSize: '14px',
                color: "#555",
                backgroundColor: "#f9f9f9",
                borderRadius: "3px"
            }
        });
        this.profileMiddle.Connect.Surface.pipe(this.contentScrollView);
        this.profileMiddle.Connect.add(this.profileMiddle.Connect.Surface);

        // - Connected with the person
        this.profileMiddle.Connected = new View();
        this.profileMiddle.Connected.Surface = new Surface({
            size: [undefined, 60],
            content: "You are Connected!",
            properties: {
                textAlign: 'center',
                lineHeight: '60px',
                fontSize: '14px',
                color: "white",
                backgroundColor: "#E87B0C",
                borderRadius: "3px"
            }
        });
        this.profileMiddle.Connected.Surface.pipe(this.contentScrollView);
        this.profileMiddle.Connected.add(this.profileMiddle.Connected.Surface);

        // this.profileMiddle.Layout will .show() the correct one, after the model is loaded

        // this.profileMiddle.SeqLayout.Views.push(this.profileMiddle.Layout);

        this.contentScrollView.Views.push(this.profileMiddle.Layout);


        // Send Invoice
        this.profileInvoice = new View();
        this.profileInvoice.Layout = new RenderController();
        this.profileInvoice.Layout.getSize = function(){
            if(this._showing == -1){
                return [undefined, 1]; // 0 causes error
            }
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

        // - Send an Invoice
        this.profileInvoice.SendInvoice = new View();
        this.profileInvoice.SendInvoice.StateModifier = new StateModifier({
            // origin: [0, 0]
        });
        this.profileInvoice.SendInvoice.Surface = new Surface({
            content: '<div class="outward-button with-icon"><i class="icon ion-card"></i> &nbsp; Send Invoice</div>',
            size: [undefined, 60],
            classes: ['button-outwards-default']
        });
        this.profileInvoice.SendInvoice.Surface.pipe(this.contentScrollView);
        this.profileInvoice.SendInvoice.Surface.on('click', function(){
            // App.history.navigate('profile/edit');

            Timer.setTimeout(function(){

                var a = prompt('Amount');
                if(!a){
                    return;
                }
                var p = prompt('Details');
                if(p && p.trim() != ''){

                    Utils.Notification.Toast('Create a new Invoice!');

                    var newModel = new InvoiceModel.Invoice({
                        friend_id: that.model.get('_id'),
                        amount: a,
                        details: p
                    });

                    newModel.save()
                    .then(function(){
                        // that.AllView.collection.fetch();
                        App.history.navigate('invoice/list');
                    });

                }

            },200);

        });
        this.profileInvoice.SendInvoice.add(this.profileInvoice.SendInvoice.StateModifier).add(this.profileInvoice.SendInvoice.Surface);

        this.contentScrollView.Views.push(this.profileInvoice.Layout);


        // Recommend this person
        // - must be a Friend
        this.recommendView = new View();
        this.recommendView.Layout = new RenderController();
        this.recommendView.Layout.getSize = function(){
            if(this._showing == -1){
                return [undefined, 1]; // 0 causes error
            }
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

        // Buttons for recommendation
        this.recommendView.NotRecommended = new View();
        this.recommendView.NotRecommended.StateModifier = new StateModifier({
            // origin: [0, 0]
        });
        this.recommendView.NotRecommended.Surface = new Surface({
            content: '<div class="outward-button with-icon"><i class="icon ion-thumbsup"></i> &nbsp; Recommend</div>',
            size: [undefined, 60],
            classes: ['button-outwards-default']
        });
        this.recommendView.NotRecommended.Surface.pipe(this.contentScrollView);
        this.recommendView.NotRecommended.Surface.on('click', function(){
            that.friend_model.save({
                recommend: true
            },{
                patch: true
            }).then(function(){
                that.friend_model.fetch();
            });
        });
        this.recommendView.NotRecommended.add(this.recommendView.NotRecommended.StateModifier).add(this.recommendView.NotRecommended.Surface);


        // Buttons for removing a recommendation
        this.recommendView.Recommended = new View();
        this.recommendView.Recommended.StateModifier = new StateModifier({
            // origin: [0, 0]
        });
        this.recommendView.Recommended.Surface = new Surface({
            content: '<div class="outward-button with-icon ellipsis-all"><i class="icon ion-thumbsup"></i> Recommended By You!</div>',
            size: [undefined, 60],
            classes: ['is-recommended-button-default','button-outwards-default']
        });
        this.recommendView.Recommended.getSize = function(){
            return [undefined, that.recommendView.Recommended.Surface._trueSize ? that.recommendView.Recommended.Surface._trueSize[1] : 60];
        }
        this.recommendView.Recommended.Surface.pipe(this.contentScrollView);
        this.recommendView.Recommended.Surface.on('click', function(){
            that.friend_model.save({
                recommend: false
            },{
                patch: true
            }).then(function(){
                that.friend_model.fetch();
            });
        });
        this.recommendView.Recommended.add(this.recommendView.Recommended.StateModifier).add(this.recommendView.Recommended.Surface);

        this.contentScrollView.Views.push(this.recommendView.Layout);





        // Content Lightbox
        // - waiting for the user to load a bit

        this.ContentStateModifier = new StateModifier();

        this.contentLightbox = new RenderController();
        this.loadingUser = new View();
        this.loadingUser.SizeMod = new StateModifier({
            size: [undefined, undefined]
        });
        this.loadingUser.OriginMod = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.loadingUser.Surface = new Surface({
            content: '<i class="icon ion-loading-c"></i>',
            size: [undefined, undefined],
            properties: {
                fontSize: "40px",
                textAlign: "center",
                color: "#444",
                lineHeight: "100px"
            }
        });
        this.loadingUser.add(this.loadingUser.SizeMod).add(this.loadingUser.OriginMod).add(this.loadingUser.Surface);
        this.contentLightbox.show(this.loadingUser);

        // this.layout.content.add(this.ContentStateModifier).add(this.mainNode);
        this.layout.content.add(this.ContentStateModifier).add(this.contentLightbox);

    };

    PageView.prototype.refreshData = function() {
        try {
            this.model.fetch();

        }catch(err){};

    };


    // Upload image to server
    PageView.prototype.uploadProfileImage = function(imageURI){
        var that = this;

        console.log('uploading...');
        console.log(this.profile_id);
        console.log({
            token : App.Data.UserToken,
            profile_id : this.profile_id,
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
            // profile_id : this.profile_id,
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
            if(that.model.get('profile.name')){
                this.profileTop.ProfileName.Surface.setContent('<span class="ellipsis-all">' + S(that.model.get('profile.name')) + '</span>');
            }

            // bio
            if(that.model.get('profile.bio')){
                this.profileBio.Surface.setContent('<div>' + S(that.model.get('profile.bio')) + '</div>');
            } else {
                this.profileBio.Surface.setContent('<div>&nbsp;</div>');
            }

            // Profile Photo
            if(that.model.get('profilephoto.urls')){
                that.profileTop.ProfileImage.Surface.setContent(that.model.get('profilephoto.urls.thumb300x300'));
            } else {
                that.profileTop.ProfileImage.Surface.setContent('img/generic-profile.png');
            }

            // Background Check
            if(that.model.get('profile.background_check')){
                this.profileMeta.Layout.show(this.profileMeta.BackgroundCheck);
            } else {
                this.profileMeta.Layout.hide();
            }

            // Send Invoice
            // - must be connected
            if(that.is_me !== true){
                console.log(App.Data.UserFriends.toJSON());
                this.profileInvoice.Layout.show(this.profileInvoice.SendInvoice);
            } else {
                this.profileInvoice.Layout.hide();
            }

            // // username (header)
            // if(that.model.get('username') !== false){
            //     // this.profileLeft.ProfileName.setContent(that.model.get('Profile.name'));
            //     that.header.navBar.title.setContent(that.model.get('username') ? that.model.get('username') : '');
            // } else {
            //     // not me
            //     // - no email set
            //     // - not showing any name for them
            //     that.header.navBar.title.setContent('');
            //     // that.header.navBar.title.setContent(that.model.get('Profile.email') ? that.model.get('email').split('@')[0].split('+')[0] : '');
            // }

            // back button and "settings" link
            if(that.is_me === true){
                // no back button
                // - show settings
                that.headerContent.Right.Lightbox.show(that.headerContent.Friends);
                that.headerContent.Middle.Lightbox.show(that.headerContent.Settings);

            } else {

                
                that.headerContent.Right.Lightbox.show(that.headerContent.Message);
                that.headerContent.Middle.Lightbox.hide();

                // that.header.navBar.back.setSize([20,undefined]);
                // that.header.navBar.back.setContent('<i class="icon ion-android-arrow-back"></i>');

                // that.header.navBar.title.setContent(that.model.get('email').split('@')[0].split('+')[0]);
            }

        }

        this.update_friend_content();

    };

    PageView.prototype.update_friend_content = function(){
        var that = this;

        // Everything ready
        if(this.model != undefined && this.model.hasFetched && this.friend_model != undefined && this.friend_model.get('_id')){

            // Recommended this person already?
            // - must be connected
            if(that.is_me !== true){
                if(that.friend_model.get('recommend') === true){
                    this.recommendView.Layout.show(this.recommendView.Recommended);
                } else {
                    this.recommendView.Layout.show(this.recommendView.NotRecommended);
                }
            } else {
                this.recommendView.Layout.hide();
            }

        }


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

                        that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? -1.5 : 1.5)),0,0));

                        // // Header
                        // // - no extra delay
                        // Timer.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.outTransition);

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
