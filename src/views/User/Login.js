/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var SubmitInputSurface = require('famous/surfaces/SubmitInputSurface');
    var FormContainerSurface = require('famous/surfaces/FormContainerSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Curves
    var Easing = require('famous/transitions/Easing');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Views
    var StandardPageView = require('views/common/StandardPageView');
    var StandardHeader = require('views/common/StandardHeader');
    var FormHelper = require('views/common/FormHelper');
    var BoxLayout = require('famous-boxlayout');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');


    function PageView(options) {
        var that = this;
        StandardPageView.apply(this, arguments);
        this.options = options;

        // User
        this.model = new UserModel.User();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(StandardPageView.prototype);
    PageView.prototype.constructor = PageView;


    PageView.prototype.createHeader = function(){
        var that = this;
        
        // - Settings
        this.headerContent = new View();
        this.headerContent.Settings = new Surface({
            content: '<i class="icon ion-gear-a"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Settings.on('click', function(){
            App.history.navigate('settings');
        });

        // create the header
        this.header = new StandardHeader({
            content: "Login",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // moreClasses: ["normal-header"],
            moreContent: false, //"&nbsp;"
            // moreSurfaces: [
            //     this.headerContent.Settings
            // ]
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        }); 
        this.header._eventOutput.on('more',function(){
            that.inputEmailSurface.setValue('nicholas.a.reed+test30@gmail.com');
            that.inputPasswordSurface.setValue('testtest');
        });
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        });

        // Attach header to the layout        
        this.layout.header.add(Utils.usePlane('header')).add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;

        this.form = new FormHelper({
            type: 'form',
            scroll: true
        });

        // Add surfaces to content (buttons)
        this.addSurfaces();

        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(Utils.usePlane('content')).add(this.form);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces

        this.inputEmail = new FormHelper({

            margins: [10,10],

            form: this.form,
            name: 'email',
            placeholder: 'Email Address',
            type: 'email',
            value: ''
        });

        this.inputPassword = new FormHelper({

            margins: [10,10],

            form: this.form,
            name: 'password',
            placeholder: 'Password',
            type: 'password',
            value: ''
        });

        this.submitButton = new FormHelper({
            form: this.form,
            type: 'submit',
            value: 'Login',
            margins: [10,10],
            click: this.login.bind(this)
        });


        // Forgot password
        this.forgotPassword = new View();
        this.forgotPassword.StateModifier = new StateModifier();
        this.forgotPassword.Surface = new Surface({
            content: 'Forgot your password? Reset Now',
            size: [undefined, 80], 
            classes: ['login-forgot-pass-button']
        });
        this.forgotPassword.Surface.pipe(this.form._formScrollView);
        this.forgotPassword.Surface.on('click', function(){
            App.history.navigate('forgot');
        });
        this.forgotPassword.add(this.forgotPassword.StateModifier).add(this.forgotPassword.Surface);


        this.form.addInputsToForm([
            this.inputEmail,
            this.inputPassword,
            this.submitButton,
            this.forgotPassword
        ]);

    };

    PageView.prototype.login = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;

        // Get email and password
        var email = $.trim(this.inputEmail.getValue().toString());
        if(email.length === 0){
            this.checking = false;
            Utils.Notification.Toast('Email Missing');
            return;
        }
        // todo: validate email

        var password = this.inputPassword.getValue().toString();

        // Disable submit button
        this.submitButton.setContent('Please wait...');

        var dataBody = {
            email: email,
            password: password,
            platform: App.Config.devicePlatform
        };

        // Test fetching a user
        this.model.login(dataBody)
        .fail(function(){
            // invalid login

            Utils.Popover.Alert('Sorry, wrong email or password', 'Try Again');
            that.checking = false;
            that.submitButton.setContent('Login');

        })
        .then(function(response){
            // Success logging in
            // - awesome!

            that.checking = false;
            that.submitButton.setContent('Login');

            // Go to signup/home (will get redirected)
            App.history.eraseUntilTag('all-of-em');
            App.history.navigate(App.Credentials.home_route);

        });

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

                        // Hide/move elements
                        Timer.setTimeout(function(){

                            // Slide content left
                            that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // Timer.setTimeout(that.refreshData.bind(that), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // Default position
                        that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth, 0, 0));

                        // Content
                        Timer.setTimeout(function(){

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

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


