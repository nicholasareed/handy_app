/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var RenderController = require('famous/views/RenderController');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Mouse/touch
    var GenericSync = require('famous/inputs/GenericSync');
    var MouseSync = require('famous/inputs/MouseSync');
    var TouchSync = require('famous/inputs/TouchSync');
    GenericSync.register({'mouse': MouseSync, 'touch': TouchSync});

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    
    // Extras
    var Utils = require('utils');
    var crypto = require('lib2/crypto');

    // Models
    var UserModel = require('models/user');
    var UserSelectModel = require('models/user_select');
    var SentenceModel = require('models/sentence');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.loadModels();

        this._activityViews = {};
        this.old_sentence = {};
        this.sentence = {
            start_time: {
                text: 'Now',
                value: 'now',
                pre_text_result: 'starting ',
                result_text: 'now'
            },
            duration: {
                text: '1 hour',
                value: ['h',1]
            },
            activities: []
        };

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();
        this.createContent();
        this.createFooter();
        
        // Attach to render tree
        this.add(this.layout);

        // // Fetch

        // Wait for model to get populated, then add the input surfaces
        // - model should be ready immediately!
        if(!this.model.hasFetched){
            this.contentContainer.show(this.loadingView);
            this.model.fetch();
        }
        this.model.populated().then(function(){

            that.addSurfaces();
            that.add_activity({
                text: 'whatever',
                value: 'whatever'
            });

            that.update_content();
        });


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        // Model
        this.model = App.Data.User;

        // Pre-existing Sentence Model
        this.sentenceModel = new SentenceModel.Sentence();
        this.sentenceModel.populated().then(function(){
            // sentence expired?
            // - if one exists that is active, go to it!
            // - ask the user if they want to visit it, or erase the existing one? 
            if(moment(that.sentenceModel.get('end_time')).format('X') < moment().format('X')){
                that.sentenceModel.trigger('error');
                return;
            }

            App.history.navigate('user/sentence_friends/' + CryptoJS.SHA3(new Date().toString()));
        });
        this.sentenceModel.once('sync', function(){

            // debugger;
        });
        this.sentenceModel.once('error', function(res, xhr){
            // if(xhr.status == 404){
            //     // None found!
            //     return;
            // }
            // if(xhr.status == 409){

            //     Utils.Notification.Toast('Expired');

            //     // Navigate back to home
            //     App.history.eraseUntilTag('all-of-em');
            //     App.history.navigate('user/sentence');
            // }

            that.contentContainer.show(that.contentScrollView);

            that.showFooter();

            console.info('ok to create another one');

        });
        this.sentenceModel.fetch();

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

        // Find Friends
        this.headerContent.PotentialFriends = new Surface({
            content: '<i class="icon ion-earth"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.PotentialFriends.on('click', function(){
            App.history.navigate('friend/potential');
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

        // create the header
        this.header = new StandardHeader({
            content: "",
            classes: ["normal-header"],
            backContent: false,
            // backClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Invite,
                this.headerContent.PotentialFriends,
                this.headerContent.Settings
            ]
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createFooter = function(){
        var that = this;
        
        this.footerButtonView = new View();
        
        this.footerButtonView.Surface = new Surface({
            content: 'Select Friends',
            size: [undefined, 60],
            classes: ['sentence-normal-default', 'sentence-normal-button-default', 'sentence-footer-button'],
            properties: {
                // backgroundColor: "red"
            }

        });
        this.footerButtonView.Surface.on('click', function(){
            // Submit your sentence
            // - loading dialogue

            var start_time = moment().format(),
                end_time = moment().format();
            if(that.sentence.start_time.value != 'now'){
                start_time = moment().hour(that.sentence.start_time.value).startOf('hour').format();
            } else {

            }
            if(that.sentence.duration.value == 'today'){
                // find the end of today (11:59pm)
                end_time = moment().endOf('day').format(); 
            } else {
                end_time = moment(start_time).add(that.sentence.duration.value[0],that.sentence.duration.value[1]).format();
            }

            console.log('---=-=-');
            console.log(that.sentence);
            console.log(start_time);
            console.info(end_time);
            // return;

            // console.log(that.sentence.activities);
            var Sentence = new SentenceModel.Sentence({
                start_time: start_time, // Javascript new Date
                end_time: end_time,
                duration: that.sentence.duration.text, // just a string
                location: null,
                activities: that.sentence.activities
            });

            Utils.Notification.Toast('OK, one moment');

            Sentence.save()
            .then(function(result){
                App.history.navigate('user/sentence_friends/' + CryptoJS.SHA3(new Date().toString()));
                // SentenceModel.set(result);
                // App.Cache.current_sentence = SentenceModel;
                // App.history.navigate('user/sentence_friends');
            });

            // App.history.navigate('user/sentence_friends');
            
        });

        // Different sync for each messageView! (instead of a Sequentail/ScrollView-wide one)
        this.footerButtonView.sync = new GenericSync(['mouse', 'touch']);

        this.footerButtonView.Surface.pipe(this.footerButtonView.sync);

        // this.sync.on('start', _handleStart.bind(this));
        this.footerButtonView.sync.on('start', function(e){
            // Create (or get cached) MessageView

        });
        this.footerButtonView.sync.on('update', function(e){
            console.log(e);
            // that.DraggedOverView._position += e.delta[0];
            // if(that.DraggedOverView._position > window.innerWidth){
            //     that.DraggedOverView._position = window.innerWidth;
            // }
            // that.DraggedOverView.position.set(that.DraggedOverView._position); 
        });
        this.footerButtonView.sync.on('end', function(e){
            // // Update position of other renderable
            // // - showing/hiding?
            // if(e.velocity[0] < -0.05 || that.DraggedOverView._position < window.innerWidth/2){
            //     // that.DraggedOverView.position = 0;
            //     // that.DraggedOverView._position = 0;
            // } else {
            //     // that.DraggedOverView._position = window.innerWidth;
            // }
            // // that.DraggedOverView.position.set(that.DraggedOverView._position, {
            // //     method : 'spring',
            // //     period : 150,
            // //     dampingRatio: 0.9,
            // //     velocity : e.velocity
            // // });
        });

        this.footerButtonView.add(this.footerButtonView.Surface);

        this.FooterPositionMod = new StateModifier({
            transform: Transform.translate(0,60,0)
        });
        this.layout.footer.add(this.FooterPositionMod).add(this.footerButtonView);


        return;



        // Everyone or Select
        this.EveryoneOrSelectLayout = new FlexibleLayout({
            ratios: [1,true,1]
        });
        this.EveryoneOrSelectLayout.Views = [];
        this.EveryoneOrSelectLayout.View = new View();
        this.EveryoneOrSelectLayout.SizeMod = new StateModifier({
            size: [undefined, 60]
        });
        this.EveryoneOrSelectLayout.StateModifier = new StateModifier();
        this.EveryoneOrSelectLayout.View.add(this.EveryoneOrSelectLayout.StateModifier).add(this.EveryoneOrSelectLayout.SizeMod).add(this.EveryoneOrSelectLayout);

        // Everyone
        this.EveryoneSurface = new Surface({
            content: "Select All",
            size: [undefined, undefined],
            classes: ['sentence-normal-default', 'sentence-normal-button-default', 'sentence-footer-button', 'left-button']
        });
        this.EveryoneSurface.on('click', function(){
            // Submit your sentence
            // - loading dialogue

            var start_time = new Date();
            if(that.sentence.start_time.value != 'now'){
                start_time = moment().hour(that.sentence.start_time.value).minute(0).second(0).millisecond(0).format();
            }
            console.log(that.sentence.activities);
            var Sentence = new SentenceModel.Sentence({
                start_time: start_time, // Javascript new Date
                end_time: moment(start_time).add(that.sentence.duration.value[0],that.sentence.duration.value[1]).format(),
                duration: that.sentence.duration.text, // just a string
                location: null,
                activities: that.sentence.activities
            });

            Utils.Notification.Toast('OK, Wait a Moment');

            Sentence.save()
            .then(function(result){
                // Send invites to everybody


                var UserSelect = new UserSelectModel.UserSelect();
                UserSelect.select('all')
                .then(function(){
                    App.history.navigate('user/sentence_friends/' + CryptoJS.SHA3(new Date().toString()));
                });

                // - todo...
                // SentenceModel.set(result);
                // App.Cache.current_sentence = SentenceModel;
                // App.history.navigate('user/sentence_friends');
            });

            // App.history.navigate('user/sentence_friends');
            
        });
        this.EveryoneOrSelectLayout.Views.push(this.EveryoneSurface);

        // "or" text
        this.Content_OrSurface = new Surface({
            content: "or",
            size: [60, undefined],
            classes: ['sentence-normal-default', 'sentence-normal-button-default', 'sentence-normal-button-separator-default']
        });
        this.EveryoneOrSelectLayout.Views.push(this.Content_OrSurface);

        // Select Friends
        this.SelectSurface = new Surface({
            content: "Be Choosy",
            size: [undefined, undefined],
            classes: ['sentence-normal-default', 'sentence-normal-button-default', 'sentence-footer-button', 'right-button']
        });
        this.SelectSurface.on('click', function(){
            // Submit your sentence
            // - loading dialogue

            var start_time = new Date();
            if(that.sentence.start_time.value != 'now'){
                start_time = moment().hour(that.sentence.start_time.value).minute(0).second(0).millisecond(0).format();
            }
            console.log(that.sentence.activities);
            var Sentence = new SentenceModel.Sentence({
                start_time: start_time, // Javascript new Date
                end_time: moment(start_time).add(that.sentence.duration.value[0],that.sentence.duration.value[1]).format(),
                duration: that.sentence.duration.text, // just a string
                location: null,
                activities: that.sentence.activities
            });

            Utils.Notification.Toast('OK, Wait a Moment');

            Sentence.save()
            .then(function(result){
                App.history.navigate('user/sentence_friends/' + CryptoJS.SHA3(new Date().toString()));
                // SentenceModel.set(result);
                // App.Cache.current_sentence = SentenceModel;
                // App.history.navigate('user/sentence_friends');
            });

            // App.history.navigate('user/sentence_friends');
            
        });
        this.EveryoneOrSelectLayout.Views.push(this.SelectSurface);

        this.EveryoneOrSelectLayout.sequenceFrom(this.EveryoneOrSelectLayout.Views);

        this.FooterPositionMod = new StateModifier({
            transform: Transform.translate(0,60,0)
        });
        this.layout.footer.add(this.FooterPositionMod).add(this.EveryoneOrSelectLayout.View);
        // this.scrollSurfaces.push(this.EveryoneOrSelectLayout.View);

    };

    PageView.prototype.createFooter_old = function(){
        var that = this;
        
        // Everyone or Select
        this.EveryoneOrSelectLayout = new FlexibleLayout({
            ratios: [1,true,1]
        });
        this.EveryoneOrSelectLayout.Views = [];
        this.EveryoneOrSelectLayout.View = new View();
        this.EveryoneOrSelectLayout.SizeMod = new StateModifier({
            size: [undefined, 60]
        });
        this.EveryoneOrSelectLayout.StateModifier = new StateModifier();
        this.EveryoneOrSelectLayout.View.add(this.EveryoneOrSelectLayout.StateModifier).add(this.EveryoneOrSelectLayout.SizeMod).add(this.EveryoneOrSelectLayout);

        // Everyone
        this.EveryoneSurface = new Surface({
            content: "Select All",
            size: [undefined, undefined],
            classes: ['sentence-normal-default', 'sentence-normal-button-default', 'sentence-footer-button', 'left-button']
        });
        this.EveryoneSurface.on('click', function(){
            // Submit your sentence
            // - loading dialogue

            var start_time = new Date();
            if(that.sentence.start_time.value != 'now'){
                start_time = moment().hour(that.sentence.start_time.value).minute(0).second(0).millisecond(0).format();
            }
            console.log(that.sentence.activities);
            var Sentence = new SentenceModel.Sentence({
                start_time: start_time, // Javascript new Date
                end_time: moment(start_time).add(that.sentence.duration.value[0],that.sentence.duration.value[1]).format(),
                duration: that.sentence.duration.text, // just a string
                location: null,
                activities: that.sentence.activities
            });

            Utils.Notification.Toast('OK, Wait a Moment');

            Sentence.save()
            .then(function(result){
                // Send invites to everybody


                var UserSelect = new UserSelectModel.UserSelect();
                UserSelect.select('all')
                .then(function(){
                    App.history.navigate('user/sentence_friends/' + CryptoJS.SHA3(new Date().toString()));
                });

                // - todo...
                // SentenceModel.set(result);
                // App.Cache.current_sentence = SentenceModel;
                // App.history.navigate('user/sentence_friends');
            });

            // App.history.navigate('user/sentence_friends');
            
        });
        this.EveryoneOrSelectLayout.Views.push(this.EveryoneSurface);

        // "or" text
        this.Content_OrSurface = new Surface({
            content: "or",
            size: [60, undefined],
            classes: ['sentence-normal-default', 'sentence-normal-button-default', 'sentence-normal-button-separator-default']
        });
        this.EveryoneOrSelectLayout.Views.push(this.Content_OrSurface);

        // Select Friends
        this.SelectSurface = new Surface({
            content: "Be Choosy",
            size: [undefined, undefined],
            classes: ['sentence-normal-default', 'sentence-normal-button-default', 'sentence-footer-button', 'right-button']
        });
        this.SelectSurface.on('click', function(){
            // Submit your sentence
            // - loading dialogue

            var start_time = new Date();
            if(that.sentence.start_time.value != 'now'){
                start_time = moment().hour(that.sentence.start_time.value).minute(0).second(0).millisecond(0).format();
            }
            console.log(that.sentence.activities);
            var Sentence = new SentenceModel.Sentence({
                start_time: start_time, // Javascript new Date
                end_time: moment(start_time).add(that.sentence.duration.value[0],that.sentence.duration.value[1]).format(),
                duration: that.sentence.duration.text, // just a string
                location: null,
                activities: that.sentence.activities
            });

            Utils.Notification.Toast('OK, Wait a Moment');

            Sentence.save()
            .then(function(result){
                App.history.navigate('user/sentence_friends/' + CryptoJS.SHA3(new Date().toString()));
                // SentenceModel.set(result);
                // App.Cache.current_sentence = SentenceModel;
                // App.history.navigate('user/sentence_friends');
            });

            // App.history.navigate('user/sentence_friends');
            
        });
        this.EveryoneOrSelectLayout.Views.push(this.SelectSurface);

        this.EveryoneOrSelectLayout.sequenceFrom(this.EveryoneOrSelectLayout.Views);

        this.FooterPositionMod = new StateModifier({
            transform: Transform.translate(0,60,0)
        });
        this.layout.footer.add(this.FooterPositionMod).add(this.EveryoneOrSelectLayout.View);
        // this.scrollSurfaces.push(this.EveryoneOrSelectLayout.View);

    };

    PageView.prototype.showFooter = function(){
        this.FooterPositionMod.setTransform(Transform.translate(0,0,0), {
            curve: 'linear',
            duration: 250
        });
    };

    PageView.prototype.hideFooter = function(){
        this.FooterPositionMod.setTransform(Transform.translate(0,60,0), {
            curve: 'linear',
            duration: 250
        });
    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];

        // link endpoints of layout to widgets

        // Content Modifiers
        this.ContentStateModifier = new StateModifier();

        // RenderControl (loading, or loaded?)
        this.contentContainer = new RenderController();

        this.loadingView = new View();
        this.loadingView.Surface = new Surface({
            content: 'Refreshing, please wait',
            size: [undefined, true],
            classes: ['sentence-loading-default']
        });
        this.loadingView.OriginMod = new StateModifier({
            origin: [0, 0.5]
        });
        this.loadingView.add(this.loadingView.OriginMod).add(this.loadingView.Surface);

        // this.contentContainer.show(this.loadingView);
        var tmpBackground = new Surface({
            size: [undefined, undefined]
        });
        tmpBackground.pipe(this.contentScrollView);

        // Now add content
        var ContentNode = this.layout.content.add(this.ContentStateModifier);
        ContentNode.add(Utils.usePlane('content',-1)).add(tmpBackground);
        ContentNode.add(Utils.usePlane('content')).add(this.contentContainer);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView

        // // I'm down to hang (text)
        // this.surface1 = new Surface({
        //     content: "",
        //     size: [undefined, true],
        //     classes: ['sentence-normal-default']
        // });
        // this.surface1.pipe(this.contentScrollView);
        // this.surface1.View = new View();
        // this.surface1.View.getSize = function(){
        //     return that.surface1.getSize(true);
        // };
        // this.surface1.View.StateModifier = new StateModifier();
        // this.surface1.View.add(this.surface1.View.StateModifier).add(this.surface1);
        // this.scrollSurfaces.push(this.surface1.View);


        // at START TIME
        this.startTimeSurface = new Surface({
            content: "<span></span>",
            size: [undefined, true],
            classes: ['sentence-normal-default']
        });
        this.startTimeSurface.pipe(this.contentScrollView);
        this.startTimeSurface.on('click', function(){
            var timeOptions = [{
                text: 'Now',
                value: 'now',
                pre_text_result: 'starting ',
                result_text: 'now'
            },{
                text: '30 minutes',
                value: moment().add('m',30),
                pre_text_result: 'at ',
                result_text: moment().add('m',30).format('h:mma')
            },{
                text: '1 hour',
                value: moment().add('m',60),
                pre_text_result: 'at ',
                result_text: moment().add('m',60).format('h:mma')
            },{
                text: 'Choose time',
                value: 'pick',
            }];

            // Launch popover/modal list of times
            Utils.Popover.List({
                list: timeOptions,
                type: 'scroll',
                on_choose: function(chosen_type){
                    if(chosen_type.value == 'pick'){
                        var options = {
                            date: new Date(),
                            mode: 'time'
                        };

                        datePicker.show(options, function(date){
                            // alert(date); 
                            // alert(JSON.stringify(date)); //"2014-08-34...Z"
                            // alert(moment(date).format('h:mma')); //"11:25pm"
                            // alert(moment(date)); // same as 'date'
                            that.sentence.start_time = {
                                pre_text_result: 'at ',
                                result_text: moment(date).format('h:mma'),
                                text: moment(date).format('h:mma'),
                                value: moment(date)
                            };
                            that.update_content();
                        });
                        return;
                    }

                    that.sentence.start_time = chosen_type;
                    that.update_content();
                    
                }
            });
            // App.history.navigate('modal/list', {history: false});

        });
        this.startTimeSurface.View = new View();
        this.startTimeSurface.View.getSize = function(){
            return that.startTimeSurface.getSize(true);
        };
        this.startTimeSurface.View.StateModifier = new StateModifier();
        this.startTimeSurface.View.add(this.startTimeSurface.View.StateModifier).add(this.startTimeSurface);
        this.scrollSurfaces.push(this.startTimeSurface.View);


        // for DURATION
        this.durationSurface = new Surface({
            content: "for <span>1 hour</span>",
            size: [undefined, true],
            classes: ['sentence-normal-default']
        });
        this.durationSurface.pipe(this.contentScrollView);
        this.durationSurface.on('click', function(){
            var durationOptions = [{
                text: '30m',
                value: ['m',30]
            },{
                text: '1 hour',
                value: ['h',1]
            },{
                text: '2 hours',
                value: ['h',2]
            },{
                text: '3 hours',
                value: ['h',3]
            },{
                text: 'Rest of Today',
                value: 'today'
            }];
            // Launch popover/modal list of times
            Utils.Popover.List({
                list: durationOptions,
                type: 'scroll',
                on_choose: function(chosen_type){
                    that.sentence.duration = chosen_type;
                    that.update_content();
                }
            });

        });
        this.durationSurface.View = new View();
        this.durationSurface.View.getSize = function(){
            return that.durationSurface.getSize(true);
        };
        this.durationSurface.View.StateModifier = new StateModifier();
        this.durationSurface.View.add(this.durationSurface.View.StateModifier).add(this.durationSurface);
        this.scrollSurfaces.push(this.durationSurface.View);


        this.createActivities();


        // Scrollview (Sentence)
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

    };

    PageView.prototype.createActivities = function(){
        var that = this;

        this.activitiesLayout = new SequentialLayout();
        this.activitiesLayout.Views = [];


        this.activitiesInstrSurface = new Surface({
            content: "i'm up for",
            size: [window.innerWidth, true],
            classes: ['sentence-normal-default']
        });
        this.activitiesInstrSurface.pipe(this.contentScrollView);
        this.activitiesInstrSurface.View = new View();
        this.activitiesInstrSurface.View.getSize = function(){
            return that.activitiesInstrSurface.getSize(true);
        };
        this.activitiesInstrSurface.View.StateModifier = new StateModifier();
        this.activitiesInstrSurface.View.add(this.activitiesInstrSurface.View.StateModifier).add(this.activitiesInstrSurface);
        // this.scrollSurfaces.push(this.activitiesInstrSurface.View);

        this.activitiesLayout.Views.push(this.activitiesInstrSurface.View);


        // Add the first "add +" activity

        // wanna ACTIVITIES
        this.activitiesAddSurface = new Surface({
            content: '<span><i class="icon ion-ios7-plus-empty"></i></span>',
            size: [window.innerWidth, true],
            classes: ['sentence-normal-default']
        });
        this.activitiesAddSurface.pipe(this.contentScrollView);
        this.activitiesAddSurface.on('click', function(){

            // Choose a few activities via popup
            var tmpactivities = [
                'whatever',
                'just chill',
                'outside',
                'exercise',
                'competition',
                'watch a show',
                'downtown',
                'a drink',
                'some food',
                "let's rage",
                'quiet time',
                ];

            var activityOptions = [];

            tmpactivities.forEach(function(act){
                activityOptions.push({
                    text: act,
                    value: act
                });
            });

            // Launch popover/modal list of times
            Utils.Popover.List({
                list: activityOptions,
                type: 'scroll',
                on_choose: function(chosen_type){

                    if(that.sentence.activities.indexOf(chosen_type.value) === -1){
                        // add to array
                        that.add_activity(chosen_type);

                    } else {
                        // remove it
                        that.sentence.activities = _.without(that.sentence.activities, chosen_type.value);

                        // Remove an activity from SequentialLayout
                        that.activitiesLayout.Views = _.without(that.activitiesLayout.Views, that._activityViews[chosen_type.value]);

                        that.activitiesLayout.sequenceFrom(that.activitiesLayout.Views);
                    }

                    // Already in list (remove it)
                    that.update_content();
                }
            });

        });
        this.activitiesAddSurface.View = new View();
        this.activitiesAddSurface.View.getSize = function(){
            // console.log(that.activitiesAddSurface.getSize(true));
            return that.activitiesAddSurface.getSize(true);
        };
        this.activitiesAddSurface.View.StateModifier = new StateModifier();
        this.activitiesAddSurface.View.add(this.activitiesAddSurface.View.StateModifier).add(this.activitiesAddSurface);
        // this.scrollSurfaces.push(this.activitiesAddSurface.View);

        this.activitiesLayout.Views.push(this.activitiesAddSurface.View);

        this.activitiesLayout.sequenceFrom(this.activitiesLayout.Views);

        this.activitiesLayout.View = new View();
        this.activitiesLayout.View.StateModifier = new StateModifier();
        this.activitiesLayout.View.add(this.activitiesLayout.View.StateModifier).add(this.activitiesLayout);

        this.scrollSurfaces.push(this.activitiesLayout.View);

    };

    PageView.prototype.update_content = function(){
        var that = this;

        // this.startTimeSurface.setContent(this.model.get('position') || 0);

        if(this.old_sentence == this.sentence){
            return;
        }

        // Update the values

        // Start Time
        that.startTimeSurface.setContent(this.sentence.start_time.pre_text_result + ' <span>'+ this.sentence.start_time.result_text +'</span>');
        // switch(this.sentence.start_time.value){
        //     case 'now':
        //         that.startTimeSurface.setContent('starting <span>now</span>');
        //         break;
        //     default:
        //         // time chosen
        //         if(this.sentence.start_time.){
        //             that.startTimeSurface.setContent('at <span>'+ this.sentence.start_time.text +'</span>');
        //         } else {
        //             that.startTimeSurface.setContent('in <span>'+ this.sentence.start_time.text +'</span>');
        //         }
        //         break;
        // }

        // Duration
        switch(this.sentence.duration.value){
            case 'today':
                that.durationSurface.setContent('until <span>today</span> ends');
                break;
            default:
                // time chosen
                that.durationSurface.setContent('for <span>'+ this.sentence.duration.text +'</span>');
                break;
        }

        // Activities (things to do)
        // - handled 

        this.old_sentence = _.clone(this.sentence);

    };

    PageView.prototype.add_activity = function(chosen_type){
        var that = this;
        
        // Activities (things to do)
        // - need to resequence them

        // add it to sentence summary obj
        that.sentence.activities.push(chosen_type.value);

        // I'm down to hang (text)
        var tmpSurface = new Surface({
            content: '<span>' + chosen_type.value + '</span>',
            size: [undefined, true],
            classes: ['sentence-normal-default']
        });
        tmpSurface.pipe(this.contentScrollView);
        tmpSurface.on('click', function(){
            // remove it
            that.sentence.activities = _.without(that.sentence.activities, chosen_type.value);
            // Remove an activity from SequentialLayout
            that.activitiesLayout.Views = _.without(that.activitiesLayout.Views, tmpSurface.View);
            that.activitiesLayout.sequenceFrom(that.activitiesLayout.Views);
            console.log(that.activitiesLayout.Views);
        });
        tmpSurface.View = new View();
        tmpSurface.View.getSize = function(){
            return tmpSurface.getSize(true);
        };
        tmpSurface.View.StateModifier = new StateModifier();
        tmpSurface.View.add(tmpSurface.View.StateModifier).add(tmpSurface);

        this.activitiesLayout.Views.splice(this.activitiesLayout.Views.length - 1, 0, tmpSurface.View);

        this._activityViews[chosen_type.value] = tmpSurface.View;

    };

    PageView.prototype.refreshData = function(ev){
        var that = this;

        this.model.fetch();

        return false;
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

                        that.ContentStateModifier.setOpacity(1);

                        // Hide/move elements
                        window.setTimeout(function(){
                            
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide content down
                            that.ContentStateModifier.setOpacity(0, transitionOptions.outTransition);

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

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.ContentStateModifier.setOpacity(0);

                        // Header
                        // - no extra delay
                        window.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        }, delayShowing);

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
            size: [undefined, 50],
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
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
