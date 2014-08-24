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

    // Side menu of options
    var GameMenuView      = require('views/Game/GameMenu');

    // Notifications SubView
    var AllView      = require('./Subviews/All');
    var PotentialView      = require('./Subviews/Potential');
    var MatchedView      = require('./Subviews/Matched');

    // Models
    var SentenceModel = require("models/sentence");
    var MediaModel = require('models/media');

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
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();

        this._subviews = [];

        this.createContent();

        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        this.model = new SentenceModel.Sentence();
        App.Events.on('resume', function(){
            Utils.Notification.Toast('Refreshing');
            that.model.fetch();
        });
        this.model.on('sync', function(){
            // sentence expired?
            if(that.model.get('expired') == true){
                console.info('expired_true');
                return;
            }
            if(moment(that.model.get('end_time')).format('X') < moment().format('X')){
                console.info('expired2');
                that.model.set('expired',true);

                Utils.Notification.Toast('Expired');

                // Navigate back to home
                App.history.eraseUntilTag('all-of-em');
                App.history.navigate('user/sentence');
            } else {
                // Update time on navbar title
                if(moment(that.model.get('start_time')).format('X') > moment().format('X')){
                    that.header.navBar.title.setContent(moment(that.model.get('start_time')).format('ha') + ' - '+ moment(that.model.get('end_time')).format('ha'));
                } else {
                    that.header.navBar.title.setContent(moment(that.model.get('end_time')).format('h:mma'));
                }
            }

        });
        this.model.on('error', function(res, xhr, res3){
            if(xhr.status == 409){
                console.info('expired3');
                that.model.set('expired',true);

                Utils.Notification.Toast('Expired');

                // Navigate back to home
                App.history.eraseUntilTag('all-of-em');
                App.history.navigate('user/sentence');
            }
        });

        this.model.fetch();

        var checkFetch = function(){
            Timer.setTimeout(function(){
                if(that.model.get('expired') !== true){
                    that.model.fetch();
                    checkFetch();
                }
            }, 30000);
        };
        checkFetch();

    };
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // Invite somebody
        this.headerContent = new View();
        this.headerContent.Invite = new Surface({
            content: '<i class="icon ion-ios7-plus-outline">',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Invite.on('click', function(){
            // App.Cache.FriendListOptions = {
            //     default: 'outgoing'
            // };
            // App.history.navigate('friend/list');
            App.history.navigate('friend/add');
        });

        // Settings
        this.headerContent.Settings = new Surface({
            content: '<i class="icon ion-ios7-gear-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Settings.on('click', function(){
            App.history.navigate('settings');
        });

        // Send SMS
        this.headerContent.SendSms = new Surface({
            content: '<i class="icon ion-ios7-chatboxes-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.SendSms.on('click', function(){
            // Send an SMS to a group of friends (sends each sms in the background?)

            // checkflag (todo) 

            Utils.Notification.Toast('SMS Blast (not done)');

            // parse the sentence and display it
            var parsed_sentence = '';

            // Started?
            if(moment(that.model.get('start_time')).format('X') < moment().format('X')){
                parsed_sentence += "right now I have ";
            } else {
                parsed_sentence += 'at ' + moment(that.model.get('start_time')).format('ha') + " i have ";
            }

            switch(that.model.get('duration')){
                case '30m':
                    parsed_sentence += '30m';
                    break;
                case '1 hour':
                    parsed_sentence += 'an hour';
                    break;
                case '2 hours':
                    parsed_sentence += 'a couple hours';
                    break;
                case '3 hours':
                    parsed_sentence += 'a few hours';
                    break;
                default:
                    parsed_sentence += that.model.get('duration');
                    debugger;
                    break;
            }


            parsed_sentence += '. want to hang out?';

            console.log(that.model.toJSON());
            console.log(parsed_sentence);

            window.plugins.socialsharing.shareViaSMS(parsed_sentence, '', function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})

            return;

            // pick the contact to send the sms to
            navigator.contacts.pickContact(function(contact){

                console.log(contact);
                console.log(JSON.stringify(contact));

                // Phone Numbers validation
                if(!contact.phoneNumbers || contact.phoneNumbers.length < 1){
                    // No phone numbers
                    Utils.Notification.Toast('No phone number');
                    return;
                }


                var successFunction = function(ptn){
                    var number = ptn;
                    var message = 'testing a message';
                    var intent = ""; //leave empty for sending sms using default intent
                    var success = function () { Utils.Notification.Toast('Message sent successfully'); };
                    var error = function (e) { Utils.Notification.Toast('Message Failed:' + e); };
                    sms.send(number, message, intent, success, error);
                }

                // Single Number?
                if(contact.phoneNumbers.length == 1){
                    successFunction(contact.phoneNumbers[0]);
                } else {

                    // Multiple numbers (expected)

                    var listData = [];
                    contact.phoneNumbers.forEach(function(ptn){
                        listData.push({
                            text: JSON.stringify(ptn),
                            value: ptn,
                            success: function(){

                                successFunction(ptn);


                            }
                        });
                    });

                    Utils.Popover.List({
                        list: listData,
                        type: 'scroll'
                    });

                }

            });

            // App.history.navigate('settings');
        });


        // Find Friends
        this.headerContent.PotentialFriends = new Surface({
            content: '<i class="icon ion-earth"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.PotentialFriends.on('click', function(){
            App.history.navigate('friend/potential');
        });

        

        // create the header
        this.header = new StandardHeader({
            content: "",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            backContent: '<i class="icon ion-close-round"></i>',
            moreClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.PotentialFriends,
                this.headerContent.SendSms,
                this.headerContent.Invite,
                this.headerContent.Settings
            ]
            
        });
        this.header._eventOutput.on('back',function(){
            // App.history.back();
            that.goBack();
        });
        this.header.navBar.title.on('click',function(){
            // App.history.back();
            that.goBack();
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

    PageView.prototype.goBack = function(){
        var that = this;

        // Erase the existing Sentence, if one exists
        if(that.model.get('active') || that.model.get('end_time') > new Date()){

            Utils.Popover.Buttons({
                title: 'Clear Previous?',
                buttons: [
                    {
                        text: 'Nah, stay here'
                    },
                    {
                        text: 'Yup, go back',
                        success: function(){

                            Utils.Notification.Toast('One moment please');

                            // Clear previous
                            that.model.disable();

                            // redirect
                            App.history.eraseUntilTag('all-of-em');
                            App.history.navigate('user/sentence');
                        }
                    }
                ]
            });

            return;

        }

        // Doesn't seem to exist, just go back
        App.history.eraseUntilTag('all-of-em');
        App.history.navigate('user/sentence');

    };
    
    PageView.prototype.createContent = function(){
        var that = this;

        // this.contentFlexibleLayout = new ScrollView(App.Defaults.ScrollView);
        this.contentFlexibleLayout = new FlexibleLayout({
            direction: FlexibleLayout.DIRECTION_Y,
            ratios: [true, 1]
        });
        this.contentFlexibleLayout.Views = [];

        // Content
        this.ContentStateModifier = new StateModifier();

        // Create the Tabs
        this.TopTabs = new View();
        this.TopTabs.Bar = new TabBar();
        this.TopTabs.BarSizeMod = new StateModifier({
            size: [undefined, 80]
        });
        this.TopTabs.getSize = function(){
            return [undefined, 80];
        };
        this.TopTabs.add(Utils.usePlane('contentTabs')).add(this.TopTabs.BarSizeMod).add(this.TopTabs.Bar);

        this.TopTabs.Bar.defineSection('all', {
            content: '<i class="icon ion-android-friends"></i><div>Friends</div>',
            onClasses: ['select-friends-tabbar-default', 'on'],
            offClasses: ['select-friends-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('potential', {
            content: '<i class="icon ion-android-social"></i><div>Potential</div>',
            onClasses: ['select-friends-tabbar-default', 'on'],
            offClasses: ['select-friends-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('matched', {
            content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Available</div>',
            onClasses: ['select-friends-tabbar-default', 'on'],
            offClasses: ['select-friends-tabbar-default', 'off']
        });

        // Add tabs to sequence
        this.contentFlexibleLayout.Views.push(this.TopTabs);

        // Tab content
        this.TopTabs.Content = new RenderController();

        // Add Lightbox to sequence
        this.contentFlexibleLayout.Views.push(this.TopTabs.Content);

        // Listeners for Tabs
        this.TopTabs.Bar.on('select', function(result){
            switch(result.id){

                case 'all':
                    that.TopTabs.Content.show(that.TopTabs.Content.AllFriends);
                    that.TopTabs.Content.AllFriends.View.collection.fetch();
                    break;

                case 'potential':
                    that.TopTabs.Content.show(that.TopTabs.Content.PotentialFriends);
                    that.TopTabs.Content.PotentialFriends.View.collection.fetch();
                    break;

                case 'matched':
                    that.TopTabs.Content.show(that.TopTabs.Content.MatchedFriends);
                    that.TopTabs.Content.MatchedFriends.View.collection.fetch();
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });

        App.Data.User.populated().then((function(){

            // All 
            this.TopTabs.Content.AllFriends = new View();
            this.TopTabs.Content.AllFriends.View = new AllView({
                model: this.model
            });
            this.TopTabs.Content.AllFriends.add(this.TopTabs.Content.AllFriends.View);
            this._subviews.push(this.TopTabs.Content.AllFriends.View);

            // Potential
            this.TopTabs.Content.PotentialFriends = new View();
            this.TopTabs.Content.PotentialFriends.View = new PotentialView({
                model: this.model
            });
            this.TopTabs.Content.PotentialFriends.add(this.TopTabs.Content.PotentialFriends.View);
            this._subviews.push(this.TopTabs.Content.PotentialFriends.View);

            // Matched
            this.TopTabs.Content.MatchedFriends = new View();
            this.TopTabs.Content.MatchedFriends.View = new MatchedView({
                model: this.model
            });
            this.TopTabs.Content.MatchedFriends.add(this.TopTabs.Content.MatchedFriends.View);
            this._subviews.push(this.TopTabs.Content.MatchedFriends.View);

            this.TopTabs.Content.MatchedFriends.View.collection.on('sync', function(){
                that.TopTabs.Bar.buttons[2].onSurface.setContent('<i class="icon ion-ios7-checkmark-outline"></i><div>' +that.TopTabs.Content.MatchedFriends.View.collection.length+ ' Available</div>');
                that.TopTabs.Bar.buttons[2].offSurface.setContent('<i class="icon ion-ios7-checkmark-outline"></i><div>' +that.TopTabs.Content.MatchedFriends.View.collection.length+ ' Available</div>');
                // debugger;
                // this.TopTabs.Bar.defineSection('matched', {
                // content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Available</div>',
            });

            // This depends on the previously selected! 
            this.TopTabs.Bar.select('all');

        }).bind(this));

        this.layout.content.add(this.ContentStateModifier).add(this.contentFlexibleLayout);

        // Flexible Layout sequencing
        console.log(this.contentFlexibleLayout.Views);
        this.contentFlexibleLayout.sequenceFrom(this.contentFlexibleLayout.Views);

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

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        that.ContentStateModifier.setOpacity(0);

                        // Hide/move elements
                        Timer.setTimeout(function(){

                            // Slide content down
                            that.ContentStateModifier.setOpacity(1, transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // window.setTimeout(that.refreshData.bind(that), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        that.ContentStateModifier.setOpacity(0);

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

    PageView.prototype.backButtonHandler = function(){
        this.goBack();
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 520],
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
