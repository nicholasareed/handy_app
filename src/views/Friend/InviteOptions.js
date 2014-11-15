define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
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

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var TabBar = require('famous/widgets/TabBar');
    var GridLayout = require("famous/views/GridLayout");

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var TodoModel = require('models/todo');
    var RelationshipCodeModel = require('models/relationship_code');

    // // Templates
    // var Handlebars          = require('lib2/handlebars-adapter');
    // var tpl_detail        = require('text!./tpl/SummaryDetail.html');
    // var template_detail   = Handlebars.compile(tpl_detail);

    var FormHelper = require('views/common/FormHelper');

    // var tpl_payment        = require('text!./tpl/SummaryPayment.html');
    // var template_payment   = Handlebars.compile(tpl_payment);

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();

        this.add(this.layout);


        // Events
        App.Events.on('Email.chosen', function(email){
            console.log('email');
            that._inputs['email'].setValue(email);
        });

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

    };

    PageView.prototype.createHeader = function(){
        var that = this;

        // Icons

        // -- create
        this.headerContent = new View();
        // - done
        this.headerContent.Cancel = new Surface({
            content: '<i class="icon ion-ios7-close-outline"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Cancel.on('click', function(){
            that.options.passed.on_cancel();
        });

        this.header = new StandardHeader({
            content: 'Invite a connection',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: false
            // moreSurfaces: [
            //     // this.headerContent.Cancel
            // ]
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(that.header, args);
        })

        this.layout.header.add(Utils.usePlane('header')).add(this.header);
    };

    PageView.prototype.createContent = function(){
        var that = this;

        // // create the scrollView of content
        // this.contentScrollView = new ScrollView(); //(App.Defaults.ScrollView);
        // this.contentScrollView.Views = [];

        this.form = new FormHelper({
            type: 'form',
            scroll: false
        });

        // Add surfaces
        this.addSurfaces();

        // this.contentScrollView.sequenceFrom(this.contentScrollView.Views);
        
        // Content
        this.layout.content.StateModifier = new StateModifier();

        this.layout.content.add(this.layout.content.StateModifier).add(Utils.usePlane('content')).add(this.form);

    };

    PageView.prototype.addSurfaces = function() {
        var that = this;


        // instructions
        this.instructions = new Surface({
            content: 'Enter an email to invite somebody (you\'ll send the email)',
            wrap: '<div></div>',
            size: [undefined, true],
            classes: ['form-instructions-default']
        });
        this.instructions.pipe(this.form._formScrollView);


        this.allInputs = [
            this.instructions
        ]; // array for adding to the _formScrollView

        // Build Surfaces
        // - add to scrollView

        // 1px line necessary?
        // var _holder = new Surface({size: [undefined,1]});
        // _holder.pipe(this.contentScrollView);
        // // need to create a 1px-height surface for the scrollview, otherwise it fucks up?
        // this.contentScrollView.Views.push(_holder);
        
        // this.createGroupView();
        // this.createImageView();
        // this.createDetailView();

        this.addFormSurfaces();

        this.createSubmitButton();


        // spacer !!
        this.spacer = new Surface({
            size: [undefined, 1],
            properties: {
                background: '#ddd'
            }
        });
        this.spacer.pipe(this.form._formScrollView);

        this.allInputs.push(this.spacer);

        // Additional options
        // - Get email from contacts

        this.searchContacts = new Surface({
            content: 'Search Contacts',
            wrap: '<div class="outward-button"></div>',
            size: [window.innerWidth, true],
            classes: ['button-outwards-default']
        });
        this.searchContacts.on('click', function(){
            App.history.navigate('friend/localsearch/email');
        });
        this.searchContacts.pipe(this.form._formScrollView);

        this.allInputs.push(this.searchContacts);

        this.form.addInputsToForm(this.allInputs);


    };

    PageView.prototype.addFormSurfaces = function() {
        var that = this;

        this.inputs = [{
            name: 'email',
            placeholder: 'Email Address',
            type: 'email',
            size: [undefined, 50],
            value: ''
        }];

        this._inputs = {};

        this.inputs.forEach(function(inputOpts){
            var id = inputOpts.id || inputOpts.name;

            that._inputs[id] = new FormHelper({

                margins: [10,10],

                form: that.form,
                name: inputOpts.name,
                placeholder: inputOpts.placeholder,
                type: inputOpts.type,
                value: inputOpts.value,
                size: inputOpts.size,
                att: inputOpts.attr
            });

        });

        Object.keys(this._inputs).forEach(function(key){
            that.allInputs.push(that._inputs[key]);
        });

    };

    PageView.prototype.fetch_rcode = function(){
        var that = this;


        // var subject = 'OddJob invite';
        // var body = "Down the OddJob app theoddjobapp.com/i/" + newRCode.get('code');
        // console.log(subject);

        return;

        var subject = 'OddJob Invite';
        var body = 'View my OddJob profile and connect with me by visiting theoddjobapp.com/u/' + App.Data.User.get('_id');
        window.plugins.socialsharing.shareViaEmail(subject, email, function(msg) {
            console.log('ok: ' + msg)
        }, function(msg) {
            Utils.Notification.Toast('Error: ' + msg)
        })


        // Create Model
        var newRCode = new RelationshipCodeModel.RelationshipCode({
            modelType: 'add_friend'
        })

        // Wait for model to be populated before loading Surfaces
        newRCode.populated().then(function(){

            // Utils.Popover.Buttons({
            //     title: 'Unique Friend Invite Code',
            //     text: 'Give the unique code <strong>'+S(newRCode.get('code'))+'</strong> to another OddJob user who you want to connect with.',
            //     buttons: [{
            //         text: 'Send via SMS',
            //         success: function(){
            //             var sentence = "Try out OddJob! I'm on it now. theoddjobapp.com/i/" + newRCode.get('code');
            //             window.plugins.socialsharing.shareViaSMS(sentence, '', function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})
            //         }
            //     },{
            //         text: 'Send via Email',
            //         success: function(){
            //             // https://github.com/EddyVerbruggen/SocialSharing-PhoneGap-Plugin
            //             var sentence = "Try out OddJob! I'm on it now. theoddjobapp.com/i/" + newRCode.get('code');
            //             window.plugins.socialsharing.shareViaEmail(sentence, 'Join me on OddJob!', null, null, null, null, function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})
            //         }
            //     },{
            //         text: 'Copy to Clipboard',
            //         success: function(){
            //             Utils.Clipboard.copyTo('Try out OddJob at theoddjobapp.com/i/' + newRCode.get('code'));
            //         }
            //     }]
            // });

            // var nada = prompt('Code has been copied','get handy at handyapp.com/i/' + newRCode.get('code'));

            // var sentence = "get handy! I'm on it now. handyapp.com/i/" + newRCode.get('code');
            // console.log(sentence);
            // window.plugins.socialsharing.shareViaSMS(sentence, phone_number, function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})

        });
        newRCode.fetch();

    };

    PageView.prototype.createSubmitButton = function(){
        var that = this;

        this.submitButton = new FormHelper({
            form: this.form,
            type: 'submit',
            value: 'Send Invite',
            margins: [10,10],
            click: this.send_invite_via_email.bind(this)
        });

        this.allInputs.push(this.submitButton);

    };

    PageView.prototype.send_invite_via_email = function(ev){
        var that = this;

        Utils.Notification.Toast('Send invite via email');

        if(this.checking === true){
            return;
        }
        this.checking = true;

        var subject = 'OddJob Invite';
        var body = 'View my OddJob profile and connect with me by visiting theoddjobapp.com/u/' + App.Data.User.get('_id');
        window.plugins.socialsharing.shareViaEmail(body, subject, null, null, null, null, function(msg) {
            console.log('ok: ' + msg)
            Utils.Notification.Toast('Launched Email Client');
        }, function(msg) {
            Utils.Notification.Toast('Error: ' + msg)
        })


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

                        // Content
                        Timer.setTimeout(function(){

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight * -1.5,0),{
                                duration: 450,
                                curve: Easing.inSine
                            });

                        }, 1);

                        break;
                }

                break;
            case 'showing':

                if(this._refreshData){
                    // Timer.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight * -1.5,0));
                        // that.contentScrollView.Views.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        // });

                        // Content
                        // - extra delay for other content to be gone
                        Timer.setTimeout(function(){

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0),{
                                duration: 450,
                                curve: Easing.outSine
                            });


                        }, delayShowing +transitionOptions.outTransition.duration);


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
            size: [undefined, undefined]
        }
    };

    module.exports = PageView;

});