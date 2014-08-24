
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
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
    var TodoModel = require('models/todo');
    var TodoContentModel = require('models/todo_content');

    // Subviews

    // TodoContent
    var TodoContentView      = require('./Subviews/TodoContent');

    // // Game story/chat
    // var GameStoryListView      = require('views/Game/Subviews/GameStoryList');

    // // Game Sharing
    // var GameShareView      = require('views/Game/Subviews/GameShare');

    // // Game Media (unused atm)
    // var PlayerGameListView      = require('views/Player/PlayerGameList');

    // // Media Blocks
    // var PlayerMediaBlocksView      = require('views/Player/PlayerMediaBlocks');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.todo_id = that.options.args[0];
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

            // debugger;

            // Show user information
            that.contentLightbox.show(that.contentScrollView);
            console.log(that.contentScrollView.Views);

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


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.loadModels = function(){
        var that = this;

        // Models
        this.model = new TodoModel.Todo({
            _id: this.todo_id
        });
        this.model.fetch({prefill: true});
    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: " ",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: false // '<span class="icon ion-refresh"></span>'
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
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
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
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

        this.todoLayout = new View();
        this.todoLayout.Layout = new FlexibleLayout({
            direction: 1, // y, vertical
            ratios: [true, 1, true]
        });

        this.todoLayout.Layout.Views = [];

        // Details
        this.todoDetails = new SequentialLayout();
        this.todoDetails.Views = [];

        // Title
        this.todoDetails.TitleSurface = new Surface({
            content: 'title content',
            size: [window.innerWidth, true],
            classes: ['todo-view-title-default']
        });
        this.todoDetails.Views.push(this.todoDetails.TitleSurface);

        // Assign/delegate to someone
        this.todoDetails.AssignedSurface = new Surface({
            content: 'some content',
            size: [undefined, true],
            classes: ['todo-view-assigned-default']
        });
        this.todoDetails.AssignedSurface.on('click', function(){
            // Redo assignment
            if(that.model.get('assigned_id')){
                // already assigned!
                // - visit that person
                App.history.navigate('user/' + Model.get('assigned_id'));
                return;
            }

            App.history.modifyLast({
                tag: 'StartAssign'
            });
            App.history.navigate('todo/assign/' + that.model.get('_id'));

            return;

            // Not assigned to anyone, lets go assign/delegate to someone!
            // App.history.navigate('todo/assign/' + Model.get('_id'));
            that.model.save({
                assigned_id: '53fa41f9f7b40e040000a4bb'
            },{
                patch: true,
                success: function(){
                    console.log('Success');
                    that.model.fetch();
                }
            })

        });
        this.todoDetails.Views.push(this.todoDetails.AssignedSurface);

        this.todoDetails.sequenceFrom(this.todoDetails.Views);


        this.todoLayout.Layout.Views.push(this.todoDetails);


        // Content
        this.todoContent = new TodoContentView({
            todo_id: this.todo_id
        });
        this.todoLayout.Layout.Views.push(this.todoContent);

        this.todoLayout.Layout.sequenceFrom(this.todoLayout.Layout.Views);

        this.todoLayout.add(this.todoLayout.Layout);
        this.contentScrollView.Views.push(this.todoLayout);


        // OptionButtons (add text, etc.)
        this.todoButtons = new View();
        this.todoButtons.ButtonSurface = new Surface({
            content: '<div>Add Update</div>',
            size: [undefined, true],
            classes: ['todo-view-todocontent-add-button-default']
        });
        this.todoButtons.getSize = function(){
            return [undefined, 60];
        };
        this.todoButtons.ButtonSurface.on('click', function(){
            Timer.setTimeout(function(){
                var p = prompt('Update text');
                if(p && p.trim() !== ''){

                    var TodoContent = new TodoContentModel.TodoContent({
                        todo_id: that.todo_id,
                        type: 'text',
                        text: p
                    });
                    TodoContent.save()
                    .then(function(){
                        that.todoContent.collection.fetch();
                    });

                }

            },200);

        });
        this.todoButtons.add(this.todoButtons.ButtonSurface);

        this.todoLayout.Layout.Views.push(this.todoButtons);



        // Content state modifier
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

            // title
            this.todoDetails.TitleSurface.setContent(that.model.get('title'));

            // assigned
            if(that.model.get('assigned_id')){
                // assigned to someone
                this.todoDetails.AssignedSurface.setContent(that.model.get('assigned_id.profile.name') || '');
                this.todoDetails.AssignedSurface.setClasses(['todo-view-assigned-default','assigned']);
            } else {
                // Not assigned
                this.todoDetails.AssignedSurface.setContent('undelegated');
                this.todoDetails.AssignedSurface.setClasses(['todo-view-assigned-default','notassigned']);
            }

            return;


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