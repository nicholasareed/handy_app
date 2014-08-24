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

    // Side menu of options
    var GameMenuView      = require('views/Game/GameMenu');

    // Notifications SubView
    var NotificationsView      = require('./Notifications');
    var MessagesView      = require('./Subviews/Messages');
    var UserMessagesView      = require('./Subviews/UserMessages');

    // Models
    // var GameModel = require('models/game');
    // var PlayerModel = require('models/player');
    var MediaModel = require('models/media');
    var MessageModel = require('models/message');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();

        this._subviews = [];
        // Wait for User to be resolved
        App.Data.User.populated().then((function(){
            this.createContent();
        }).bind(this));

        this.add(this.layout);



        return;


        // // Models

        // // Game
        // this.model = new GameModel.Game({
        //     _id: params.args[0]
        // });
        // this.model.fetch({prefill: true});

        // // Media
        // this.media_collection = new MediaModel.MediaCollection({
        //     game_id: params.args[0]
        // });
        // this.media_collection.fetch({prefill: true});

        // // create the layout
        // this.layout = new HeaderFooterLayout({
        //     headerSize: App.Defaults.Header.size,
        //     footerSize: App.Defaults.Footer.size
        // });


        // this.createHeader();
        // // this.createContent();

            
        // // Create the mainTransforms for shifting the entire view over on menu open
        // this.mainTransform = new Modifier({
        //     transform: Transform.identity
        // });
        // this.mainTransitionable = new Transitionable(0);
        // this.mainTransform.transformFrom(function() {
        //     // Called every frame of the animation
        //     return Transform.translate(this.mainTransitionable.get() * -1, 0, 0);
        // }.bind(this));

        // // Create the menu that swings out
        // this.sideView = new GameMenuView({
        //     model: this.model
        // });
        // this.sideView.OpacityModifier = new StateModifier();


        // // Wait for model to get data, and then render the content
        // this.model.populated().then(function(){

        //     // that.update_counts();

        //     // // Now listen for changes
        //     // that.model.on('change', that.update_counts, that);

        //     switch(that.model.get('sport_id.result_type')){
        //         case '1v1':
        //             that.create1v1();
        //             break;

        //         case 'free-for-all':
        //             that.createFreeForAll();
        //             break;

        //         default:
        //             console.log(that.model.toJSON());
        //             throw "error";
        //             alert("Unable to handle other types (1v2, teams, etc.) yet");
        //             debugger;
        //             return;
        //     }

        // });

        // // Attach the main transform and the comboNode to the renderTree
        // this.add(this.mainTransform).add(this.layout);

        // // // Attach the main transform and the comboNode to the renderTree
        // // this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: "Inbox",
            classes: ["normal-header"],
            // backClasses: ["normal-header"],
            backContent: false,
            moreClasses: ["normal-header"],
            moreContent: "New", //'<span class="icon ion-navicon-round"></span>'
        }); 
        // this.header._eventOutput.on('back',function(){
        //     App.history.back();//.history.go(-1);
        // });
        // this.header.navBar.title.on('click', function(){
        //     App.history.back();
        // });
        this.header._eventOutput.on('more',function(){
            // if(that.model.get('CarPermission.coowner')){
            //     App.history.navigate('car/permission/' + that.model.get('_id'), {trigger: true});
            // }
            // that.menuToggle();

            // Modify Last
            App.history.modifyLast({
                tag: 'StartMessageAdd'
            });
            App.history.navigate('message/add',{history: false});

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

        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView = new FlexibleLayout({
            direction: FlexibleLayout.DIRECTION_Y,
            ratios: [true, 1]
        });
        this.contentScrollView.Views = [];

        // Content
        this.ContentStateModifier = new StateModifier();

        // Create the Tabs
        this.TopTabs = new View();
        this.TopTabs.Bar = new TabBar();
        this.TopTabs.BarSizeMod = new StateModifier({
            size: [undefined, 50]
        });
        this.TopTabs.getSize = function(){
            return [undefined, 50];
        };
        this.TopTabs.add(this.TopTabs.BarSizeMod).add(this.TopTabs.Bar);

        // combine the following 2 into "events" ? ("Stories" would be the default view, with a link inside the "Actions" (because they are a subset, really)
        // this.TopTabs.Bar.defineSection('actions', {
        //     content: '<i class="icon ion-navicon"></i><div>Actions</div>',
        //     onClasses: ['inbox-tabbar-default', 'on'],
        //     offClasses: ['inbox-tabbar-default', 'off']
        // });
    
        // Re-enable Notifications soon!
        // this.TopTabs.Bar.defineSection('notifications', {
        //     content: '<i class="icon ion-ios7-flag"></i><div>Notifications</div>',
        //     onClasses: ['inbox-tabbar-default', 'on'],
        //     offClasses: ['inbox-tabbar-default', 'off']
        // });

        this.TopTabs.Bar.defineSection('by_user', {
            content: '<i class="icon ion-ios7-checkmark-outline"></i><div>By User</div>',
            onClasses: ['inbox-tabbar-default', 'on'],
            offClasses: ['inbox-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('all', {
            content: '<i class="icon ion-ios7-checkmark-outline"></i><div>All</div>',
            onClasses: ['inbox-tabbar-default', 'on'],
            offClasses: ['inbox-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('sent', {
            content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Sent</div>',
            onClasses: ['inbox-tabbar-default', 'on'],
            offClasses: ['inbox-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('received', {
            content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Received</div>',
            onClasses: ['inbox-tabbar-default', 'on'],
            offClasses: ['inbox-tabbar-default', 'off']
        });

        // Add tabs to sequence
        this.contentScrollView.Views.push(this.TopTabs);

        // Tab content
        // this.TopTabs = new View();
        this.TopTabs.Content = new RenderController();

        // All Messages
        this.TopTabs.Content.AllMessages = new View();
        this.TopTabs.Content.AllMessages.View = new MessagesView({
            show_other_person: true
        });
        this.TopTabs.Content.AllMessages.add(this.TopTabs.Content.AllMessages.View);
        this._subviews.push(this.TopTabs.Content.AllMessages.View);

        // Sent Messages
        this.TopTabs.Content.SentMessages = new View();
        this.TopTabs.Content.SentMessages.View = new MessagesView({
            filter: {
                from_user_id: App.Data.User.get('_id')
            },
            show_other_person: true
        });
        this.TopTabs.Content.SentMessages.add(this.TopTabs.Content.SentMessages.View);
        this._subviews.push(this.TopTabs.Content.SentMessages.View);

        // Received Messages
        this.TopTabs.Content.RecMessages = new View();
        this.TopTabs.Content.RecMessages.View = new MessagesView({
            filter: {
                to_user_id: App.Data.User.get('_id')
            },
            show_other_person: true
        });
        this.TopTabs.Content.RecMessages.add(this.TopTabs.Content.RecMessages.View);
        this._subviews.push(this.TopTabs.Content.RecMessages.View);

        // By Users
        this.TopTabs.Content.ByUserMessages = new View();
        this.TopTabs.Content.ByUserMessages.View = new UserMessagesView();
        this.TopTabs.Content.ByUserMessages.add(this.TopTabs.Content.ByUserMessages.View);
        this._subviews.push(this.TopTabs.Content.ByUserMessages.View);

        // this.TopTabs.Content.Certify.Surface = new Surface({
        //     content: 'No games to certify',
        //     size: [undefined, 50],
        //     properties: {
        //         textAlign: "center",
        //         backgroundColor: "white",
        //         color: "#222",
        //         lineHeight: "50px",
        //         borderTop: "1px solid #ddd"
        //     }
        // });
        // this.TopTabs.Content.Messages.add(this.TopTabs.Content.Messages.View);

        // Add Lightbox to sequence
        this.contentScrollView.Views.push(this.TopTabs.Content);

        // Listeners for Tabs
        this.TopTabs.Bar.on('select', function(result){
            switch(result.id){

                case 'all':
                    that.TopTabs.Content.show(that.TopTabs.Content.AllMessages);
                    that.TopTabs.Content.AllMessages.View.collection.pager();
                    break;

                case 'sent':
                    that.TopTabs.Content.show(that.TopTabs.Content.SentMessages);
                    that.TopTabs.Content.SentMessages.View.collection.pager();
                    break;

                case 'received':
                    that.TopTabs.Content.show(that.TopTabs.Content.RecMessages);
                    that.TopTabs.Content.RecMessages.View.collection.pager();
                    break;

                case 'by_user':
                    that.TopTabs.Content.show(that.TopTabs.Content.ByUserMessages);
                    that.TopTabs.Content.ByUserMessages.View.collection.fetch();
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });
        this.TopTabs.Bar.select('by_user');

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

        // Flexible Layout sequencing
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

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
