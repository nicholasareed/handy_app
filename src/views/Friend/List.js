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

    // Notifications SubView
    var ConnectedView      = require('./Subviews/Connected');
    var RecommendedView      = require('./Subviews/Recommended');
    var EmailOnlyListView      = require('./Subviews/EmailOnlyList');
    var NewFriendView      = require('./Subviews/NewFriend');
    // var PotentialView      = require('./Subviews/Potential');
    // var IncomingView      = require('./Subviews/Incoming');
    // var OutgoingView      = require('./Subviews/Outgoing');
    
    // Models
    var MediaModel = require('models/media');
    var FriendModel = require('models/friend');
    var RelationshipCodeModel = require('models/relationship_code');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this._showing = true;

        this.createHeader();

        this._subviews = [];

        // Wait for User to be resolved
        App.Data.User.populated().then((function(){
            this.createContent();
        }).bind(this));

        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
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


        // quick invite
        this.headerContent.QuickInvite = new Surface({
            content: '<i class="icon ion-android-add-contact"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.QuickInvite.on('longtap', function(){
            Utils.Help('User/View/Message');
        });
        this.headerContent.QuickInvite.on('click', function(){
            // Fetch an Invite Code and send it to somebody

            // If looking at somebody else, then send THEM an invite code
            // - v2...

            Utils.Notification.Toast('Fetching Code');

            // Create Model
            var newRCode = new RelationshipCodeModel.RelationshipCode({
                modelType: 'add_friend'
            })

            // Wait for model to be populated before loading Surfaces
            newRCode.populated().then(function(){

                Utils.Popover.Buttons({
                    title: 'Unique Friend Invite Code',
                    text: 'Give the unique code <strong>'+S(newRCode.get('code'))+'</strong> to another OddJob user who you want to connect with.',
                    buttons: [{
                        text: 'Send via SMS',
                        success: function(){
                            var sentence = "Try out OddJob! I'm on it now. theoddjobapp.com/i/" + newRCode.get('code');
                            window.plugins.socialsharing.shareViaSMS(sentence, '', function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})
                        }
                    },{
                        text: 'Send via Email',
                        success: function(){
                            // https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin
                            var sentence = "Try out OddJob! I'm on it now. theoddjobapp.com/i/" + newRCode.get('code');
                            window.plugins.socialsharing.shareViaEmail(sentence, 'Join me on OddJob!', null, null, null, null, function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})
                        }
                    },{
                        text: 'Copy to Clipboard',
                        success: function(){
                            Utils.Clipboard.copyTo('Try out OddJob at theoddjobapp.com/i/' + newRCode.get('code'));
                        }
                    }]
                });

                // var nada = prompt('Code has been copied','get handy at handyapp.com/i/' + newRCode.get('code'));

                // var sentence = "get handy! I'm on it now. handyapp.com/i/" + newRCode.get('code');
                // console.log(sentence);
                // window.plugins.socialsharing.shareViaSMS(sentence, phone_number, function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})

            });
            newRCode.fetch();

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
                this.headerContent.Invite,
                // this.headerContent.QuickInvite
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

        // this.AllView = new AllView();

        // this.layout.content.add(this.ContentStateModifier).add(this.AllView);

        // Tabs
        this.TopTabs = this.createTabs();
        this.TopTabs.on('change', function(key){
            
            var indexStr = '';
            switch(key){
                case 'connected':
                    indexStr = 'Connected';
                    break;
                case 'recommended':
                    indexStr = 'Recommended';
                    break;
                case 'emailonly':
                    indexStr = 'EmailOnly';
                    break;
                default:
                    return;
            }
            that.TopTabs.Content.Controller.show(that.TopTabs.Content[indexStr]);
        });
        this.contentScrollView.Views.push(this.TopTabs);

        // this.TopTabs = new View();
        // this.TopTabs.SizeMod = new StateModifier({
        //     size: [undefined, 60]
        // });
        // this.TopTabs.SeqLayout = new SequentialLayout({
        //     direction: 0
        // });
        // this.TopTabs.add(this.TopTabs.SizeMod).add(Utils.usePlane('content',5)).add(this.TopTabs.SeqLayout);
        // this.TopTabs.SeqLayout.Views = [];

        // // this._plantSelected = null;

        // var items = [{
        //     name: 'connected'
        // },{
        //     name: 'recommended'
        // },{
        //     name: 'email-only'
        // }];

        // this._tabSurfaces = [];
        // items.forEach(function(item, index){

        //     var tmpClasses = ['top-tabs-scroller-item-default'];
        //     // Select default one
        //     // if(that.model.get('plant_type.id') == Model.get('id')){
        //     //     tmpClasses.push('selected');
        //     //     that._plantSelected = Model.get('id');
        //     // }
            
        //     var tabView = new Surface({
        //         content: '<div>'+item.name+'</div>',
        //         size: [true, undefined],
        //         classes: tmpClasses
        //     });
        //     // tabView.Model = Model;
        //     that._tabSurfaces.push(tabView);
        //     tabView.on('click', function(e){
        //         // console.log('clicked');
        //         that._tabSurfaces.forEach(function(tmp){
        //             tmp.setClasses(['top-tabs-scroller-item-default']);
        //         });
        //         this.setClasses(['top-tabs-scroller-item-default','selected']);
        //         if(e !== undefined){
                    // console.log(index);
                    // var indexStr = '';
                    // switch(index){
                    //     case 0:
                    //         indexStr = 'Connected';
                    //         break;
                    //     case 1:
                    //         indexStr = 'Recommended';
                    //         break;
                    //     case 2:
                    //         indexStr = 'EmailOnly';
                    //         break;
                    //     default:
                    //         return;
                    // }
        //             that.TopTabs.Content.Controller.show(that.TopTabs.Content[indexStr]);
        //             // that.TopTabs.Content.ScrollView.goToIndex(index, 0.1, 1.5);
        //         }
        //     });
        //     tabView.pipe(that.TopTabs.SeqLayout);
        //     tabView.pipe(that.contentScrollView);

        //     that.TopTabs.SeqLayout.Views.push(tabView);

        // });
        // that._tabSurfaces[0].emit('click');

        // this.TopTabs.SeqLayout.sequenceFrom(this.TopTabs.SeqLayout.Views);

        // this.contentScrollView.Views.push(this.TopTabs);



        // // Create the Tabs
        // this.TopTabs = new View();
        // this.TopTabs.Bar = new TabBar();
        // this.TopTabs.BarSizeMod = new StateModifier({
        //     size: [undefined, 80]
        // });
        // this.TopTabs.getSize = function(){
        //     return [undefined, 80];
        // };
        // this.TopTabs.add(Utils.usePlane('contentTabs')).add(this.TopTabs.BarSizeMod).add(this.TopTabs.Bar);

        // this.TopTabs.Bar.defineSection('connected', {
        //     content: '<i class="icon ion-arrow-swap"></i><div>Connected</div>',
        //     onClasses: ['friend-list-tabbar-default', 'on'],
        //     offClasses: ['friend-list-tabbar-default', 'off']
        // });
        // this.TopTabs.Bar.defineSection('recommended', {
        //     content: '<i class="icon ion-thumbsup"></i><div>Recommended</div>',
        //     onClasses: ['friend-list-tabbar-default', 'on'],
        //     offClasses: ['friend-list-tabbar-default', 'off']
        // });
        // // this.TopTabs.Bar.defineSection('incoming', {
        // //     content: '<i class="icon ion-arrow-down-a"></i><div>Incoming</div>',
        // //     onClasses: ['inbox-tabbar-default', 'on'],
        // //     offClasses: ['inbox-tabbar-default', 'off']
        // // });
        // // this.TopTabs.Bar.defineSection('outgoing', {
        // //     content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Outgoing</div>',
        // //     onClasses: ['inbox-tabbar-default', 'on'],
        // //     offClasses: ['inbox-tabbar-default', 'off']
        // // });

        // // Add tabs to sequence
        // this.contentScrollView.Views.push(this.TopTabs);

        // Tab content
        this.TopTabs.Content = new View();
        this.TopTabs.Content.Bg = new Surface({
            size: [undefined, undefined]
        });
        this.TopTabs.Content.Controller = new RenderController({
        // this.TopTabs.Content.ScrollView = new ScrollView({
            direction: 0, // horizontal
            // paginated: true
        });
        // this.TopTabs.Content.Bg.pipe(this.TopTabs.Content.ScrollView);
        // Timer.setInterval(function(){
        //     // highlight the correct TopTab
        //     // console.log();
        //     if(!that._showing){
        //         return;
        //     }
        //     try {
        //         var x = that.TopTabs.Content.ScrollView.getIndex();
        //         // console.log('x',x);
        //     }catch(err){
        //         console.log(err);
        //     }
        //     // that._tabSurfaces[that.TopTabs.Content.ScrollView.getIndex()].emit('click');
        // },9500);
        // this.TopTabs.Content.Views = [];

        this.TopTabs.Content.add(Utils.usePlane('content')).add(this.TopTabs.Content.Bg);
        this.TopTabs.Content.add(Utils.usePlane('content',1)).add(this.TopTabs.Content.Controller);

        // Connected 
        this.TopTabs.Content.Connected = new View();
        this.TopTabs.Content.Connected.View = new ConnectedView();
        // this.TopTabs.Content.Connected.View._eventOutput.pipe(this.TopTabs.Content.ScrollView);
        this.TopTabs.Content.Connected.add(this.TopTabs.Content.Connected.View);
        this._subviews.push(this.TopTabs.Content.Connected.View);
        // this.TopTabs.Content.Views.push(this.TopTabs.Content.Connected.View);

        // Recommended 
        this.TopTabs.Content.Recommended = new View();
        this.TopTabs.Content.Recommended.View = new RecommendedView();
        // this.TopTabs.Content.Recommended.View._eventOutput.pipe(this.TopTabs.Content.ScrollView);
        this.TopTabs.Content.Recommended.add(this.TopTabs.Content.Recommended.View);
        this._subviews.push(this.TopTabs.Content.Recommended.View);
        // this.TopTabs.Content.Views.push(this.TopTabs.Content.Recommended.View);

        // Email-only (only connected to "me") 
        this.TopTabs.Content.EmailOnly = new View();
        this.TopTabs.Content.EmailOnly.View = new EmailOnlyListView();
        // this.TopTabs.Content.EmailOnly.View._eventOutput.pipe(this.TopTabs.Content.ScrollView);
        this.TopTabs.Content.EmailOnly.add(this.TopTabs.Content.EmailOnly.View);
        this._subviews.push(this.TopTabs.Content.EmailOnly.View);
        // this.TopTabs.Content.Views.push(this.TopTabs.Content.EmailOnly.View);

        this.TopTabs.Content.Controller.show(this.TopTabs.Content.Connected);

        // // All 
        // this.TopTabs.Content.AllFriends = new View();
        // this.TopTabs.Content.AllFriends.View = new AllView();
        // this.TopTabs.Content.AllFriends.add(this.TopTabs.Content.AllFriends.View);
        // this._subviews.push(this.TopTabs.Content.AllFriends.View);

        // // Potential 
        // this.TopTabs.Content.PotentialFriends = new View();
        // this.TopTabs.Content.PotentialFriends.View = new PotentialView();
        // this.TopTabs.Content.PotentialFriends.add(this.TopTabs.Content.PotentialFriends.View);
        // this._subviews.push(this.TopTabs.Content.PotentialFriends.View);

        // // Incoming
        // this.TopTabs.Content.IncomingInvites = new View();
        // this.TopTabs.Content.IncomingInvites.View = new IncomingView();
        // this.TopTabs.Content.IncomingInvites.add(this.TopTabs.Content.IncomingInvites.View);
        // this._subviews.push(this.TopTabs.Content.IncomingInvites.View);

        // // Outgoing
        // this.TopTabs.Content.OutgoingInvites = new View();
        // this.TopTabs.Content.OutgoingInvites.View = new OutgoingView();
        // this.TopTabs.Content.OutgoingInvites.add(this.TopTabs.Content.OutgoingInvites.View);
        // this._subviews.push(this.TopTabs.Content.OutgoingInvites.View);

        // this.TopTabs.Content.ScrollView.sequenceFrom(this.TopTabs.Content.Views);

        // Add Scrollview to sequence
        this.contentScrollView.Views.push(this.TopTabs.Content);

        // // Listeners for Tabs
        // this.TopTabs.Bar.on('select', function(result){
        //     switch(result.id){

        //         case 'connected':
        //             that.TopTabs.Content.show(that.TopTabs.Content.Connected);
        //             // that.TopTabs.Content.AllFriends.View.collection.fetch();
        //             break;

        //         case 'recommended':
        //             that.TopTabs.Content.show(that.TopTabs.Content.Recommended);
        //             // that.TopTabs.Content.AllFriends.View.collection.fetch();
        //             break;

        //         case 'all':
        //             that.TopTabs.Content.show(that.TopTabs.Content.AllFriends);
        //             // that.TopTabs.Content.AllFriends.View.collection.fetch();
        //             break;

        //         case 'potential':
        //             that.TopTabs.Content.show(that.TopTabs.Content.PotentialFriends);
        //             // that.TopTabs.Content.AllFriends.View.collection.fetch();
        //             break;

        //         case 'incoming':
        //             that.TopTabs.Content.show(that.TopTabs.Content.IncomingInvites);
        //             // that.TopTabs.Content.IncomingInvites.View.collection.fetch();
        //             break;

        //         case 'outgoing':
        //             that.TopTabs.Content.show(that.TopTabs.Content.OutgoingInvites);
        //             // that.TopTabs.Content.OutgoingInvites.View.collection.fetch();
        //             break;

        //         default:
        //             alert('none chosen');
        //             break;
        //     }
        // });

        // // This depends on the previously selected! 
        // var default_selected = 'connected';
        // // try {
        // //     default_selected = App.Cache.FriendListOptions.default || 'all';
        // // }catch(err){console.error(err);}
        // this.TopTabs.Bar.select(default_selected);

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

        // Flexible Layout sequencing
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

    };

    PageView.prototype.createTabs = function(){
        var that = this;

        var tabList = {
            connected: 'Connected',
            recommended: 'Recommended',
            emailonly: 'EmailOnly'
        }
        console.log(tabList);
        var tabKeys = Object.keys(tabList);
        this._cachedViews = {};

        var Tabs = new View();
        Tabs.getSize = function(){
            return [undefined, 40];
        };
        Tabs.BgSurface = new Surface({
            size: [undefined, undefined],
            classes: ['tabs-bg-default']
        });
        // console.log( _.map(tabKeys, function(o,i){ 
        //         return i == (tabKeys.length - 1) ? 1:true;
        //     })
        // );
        Tabs.Layout = new FlexibleLayout({
            direction: 0, //x
            // ratios: [true,true,true, 1, true,true,true]
            ratios: _.map(tabKeys, function(o,i){ 
                return i == (tabKeys.length - 1) ? 1:true; // [true, true, 1]
            })
        });
        Tabs.Views = [];
        Tabs.SizeMod = new StateModifier({
            size: [undefined, 40]
        });

        // All the tab options that could be clicked
        // - and a spacer
        tabKeys.forEach(function(key, index){

            var tabInfo = tabList[key];

            // My
            // console.log([(index == (tabKeys.length - 1)) ? undefined : true, undefined]);
            Tabs[key] = new Surface({
                content: tabInfo,
                size: [(index == (tabKeys.length - 1)) ? undefined : (11 * tabInfo.length), undefined], // true size, or undefined (if last)
                wrap: '<div class="ellipsis-all"></div>',
                classes: ['tabs-item-default']
            });
            // Tabs[key].group = ;
            Tabs[key].on('click', function(){
                // that.tabChosen = 'my';
                // that.tab_change();
                Tabs.Views.forEach(function(tmpView){
                    // if(tmpView.group == 'Todos'){
                    tmpView.setClasses(['tabs-item-default']);
                    // }
                });
                this.setClasses(['tabs-item-default','selected']);
                Tabs._eventOutput.emit('change', key); //_eventOutput.trigger('click');
            });
            Tabs.Views.push(Tabs[key]);

            Tabs[key].pipe(Tabs._eventInput);
        });

        Tabs.Layout.sequenceFrom(Tabs.Views);
        
        var node = Tabs.add(Tabs.SizeMod);
        node.add(Utils.usePlane('contentTabs',-1)).add(Tabs.BgSurface);
        node.add(Utils.usePlane('contentTabs')).add(Tabs.Layout);

        // Select Defaults
        console.log(Tabs);
        Tabs['connected'].emit('click'); //_eventOutput.trigger('click');

        return Tabs;

        // this.filtertabChosenAssignedAll._eventOutput.trigger('click');


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

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        console.log('RemoteRefresh - PageView');
        Utils.RemoteRefresh(this,snapshot);
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
                this._showing = false;
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
                this._showing = true;
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
