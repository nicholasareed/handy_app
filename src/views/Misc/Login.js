/*globals define*/
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

    // Curves
    var Easing = require('famous/transitions/Easing');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');

    // Custom Surface
    var TextAreaSurface = require('views/common/TextAreaSurface');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
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

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;


    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: "Login",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];

        // link endpoints of layout to widgets

        // Add surfaces to content (buttons)
        this.addSurfaces();

        // Sequence
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces

        // Email
        this.inputEmailSurface = new InputSurface({
            name: 'email',
            placeholder: 'Email Address',
            type: 'email',
            size: [undefined, 50],
            value: ''
        });

        this.inputEmailSurface.View = new View();
        this.inputEmailSurface.View.StateModifier = new StateModifier();
        this.inputEmailSurface.View.add(this.inputEmailSurface.View.StateModifier).add(this.inputEmailSurface);
        this.contentScrollView.Views.push(this.inputEmailSurface.View);

        // Password
        this.inputPasswordSurface = new InputSurface({
            name: 'password',
            placeholder: 'Password',
            type: 'password',
            size: [undefined, 50],
            value: ''
        });

        this.inputPasswordSurface.View = new View();
        this.inputPasswordSurface.View.StateModifier = new StateModifier();
        this.inputPasswordSurface.View.add(this.inputPasswordSurface.View.StateModifier).add(this.inputPasswordSurface);
        this.contentScrollView.Views.push(this.inputPasswordSurface.View);

        // Submit button
        this.submitButtonSurface = new Surface({
            content: 'Login',
            size: [undefined, 60],
            classes: ['form-button-submit-default']
        });
        this.submitButtonSurface.View = new View();
        this.submitButtonSurface.View.StateModifier = new StateModifier();
        this.submitButtonSurface.View.add(this.submitButtonSurface.View.StateModifier).add(this.submitButtonSurface);
        this.contentScrollView.Views.push(this.submitButtonSurface.View);

        // Forgot password
        this.forgotPassword = new View();
        this.forgotPassword.StateModifier = new StateModifier();
        this.forgotPassword.Surface = new Surface({
            content: 'Forgot your password? Reset Now',
            size: [undefined, 60],
            classes: ['login-forgot-pass-button']
        });
        this.forgotPassword.Surface.on('click', function(){
            // App.history.navigate('forgot');
            // console.log(1);
            Utils.Popover.Prompt('title','default','saveit')
            .then(function(result){
                if(result && $.trim(result) != ''){
                    alert(result);
                }
            });
        });
        this.forgotPassword.add(this.forgotPassword.StateModifier).add(this.forgotPassword.Surface);
        this.contentScrollView.Views.push(this.forgotPassword);

        // Events for surfaces
        this.submitButtonSurface.on('click', this.login.bind(this));


    };

    PageView.prototype.login = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;

        console.log(this.inputEmailSurface);
        console.log(this.inputPasswordSurface);

        // Get email and password
        var email = $.trim(this.inputEmailSurface.getValue().toString());
        if(email.length === 0){
            this.checking = false;
            Utils.Notification.Toast('Email Missing');
            return;
        }
        // todo: validate email

        var password = this.inputPasswordSurface.getValue().toString();

        // Disable submit button
        this.submitButtonSurface.setContent('Please wait...');

        var dataBody = {
            email: email,
            password: password,
            platform: App.Config.devicePlatform
        };

        // Test fetching a user
        this.model.login(dataBody)
        .fail(function(err){

            that.checking = false;
            that.submitButtonSurface.setContent('Login');

            // invalid login
            console.error('Fail, invalid login');

            // Toast
            Utils.Notification.Toast('Invalid Login');

        })
        .then(function(response){
            // Success logging in

            // Fetch model
            if(response.code != 200){
                console.error('Failed signing in (3424)');
                console.log(response);
                console.log(response.code);
                Utils.Notification.Toast('Failed signing in (3424)');
                that.checking = false;
                that.submitButtonSurface.setContent('Login');
                return;
            }

            // Store access_token in localStorage
            localStorage.setItem(App.Credentials.local_token_key, response.token);
            App.Data.UserToken = response.token;

            // Get's the User's Model
            that.model.fetch({
                error: function(){
                    alert("Failed gathering user model");
                },
                success: function(userModel){
                    console.log('UserModel');
                    console.log(userModel);

                    // Set global logged in user
                    that.options.App.Data.User = userModel;

                    console.log('user_v3');
                    console.log(userModel);
                    console.log(userModel.toJSON());

                    localStorage.setItem(App.Credentials.local_user_key, JSON.stringify(userModel.toJSON()));

                    // Preload Models
                    require(['models/preload'], function(PreloadModels){
                        PreloadModels(that.options.App);
                    });

                    // Register for Push Notifications
                    App.DeviceReady.initPush();

                    // Goto home
                    App.history.eraseUntilTag('all-of-em');
                    App.history.navigate('dash');

                }
            });

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
                        window.setTimeout(function(){

                            // Slide content left
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

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

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        that.contentScrollView.Views.forEach(function(surf, index){
                            surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        });

                        // Content
                        // - extra delay for other content to be gone
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring in button surfaces individually
                            that.contentScrollView.Views.forEach(function(surf, index){
                                window.setTimeout(function(){
                                    surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                                        duration: 250,
                                        curve: Easing.easeOut
                                    });
                                }, index * 50);
                            });

                        }, delayShowing); // + transitionOptions.outTransition.duration);

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


