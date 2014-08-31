/*globals define*/
define(function(require, exports, module) {
    
    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Matrix = require('famous/core/Transform');
    var Transform = require('famous/core/Transform');

    var Utility = require('famous/utilities/Utility');
    var EventHandler = require('famous/core/EventHandler');

    var Backbone = require('backbone');

    // Models
    var UserModel = require('models/user');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Model
        this.model = new UserModel.User();

        // Add background
        var bgSurface = new Surface({
            size: [undefined, undefined],
            classes: ['bg-surface']
        });
        var backMod = new StateModifier({
            transform: Transform.behind
        });
        this.add(backMod).add(bgSurface);

        // Create the layout
        this.layout = new SequentialLayout();
        this.layout.Views = [];

        // Build Surfaces
        var surfaces = [];

        this.topWelcomeSurface = new Surface({
            content: "handy",
            size: [undefined, 80],
            classes: ['login-page-welcome-top-default']
        });
        this.layout.Views.push(this.topWelcomeSurface);

        this.inputEmailSurface = new InputSurface({
            name: 'email',
            placeholder: 'Email Address',
            type: 'text',
            size: [undefined, 50],
            value: '' //nicholas.a.reed@gmail.com
        });
        this.layout.Views.push(this.inputEmailSurface);

        this.spacer1 = new Surface({
            content: "",
            size: [undefined,4]
        });
        this.layout.Views.push(this.spacer1);

        this.inputPasswordView = new View();
        this.inputPasswordView.Surface = new InputSurface({
            name: 'password',
            placeholder: 'Password',
            type: 'password',
            size: [undefined, 50],
            value: '' //testtest
        });
        this.inputPasswordView.PaddingMod = new StateModifier({
            size: [undefined, 54]
        });
        this.inputPasswordView.add(this.inputPasswordView.PaddingMod).add(this.inputPasswordView.Surface);
        this.layout.Views.push(this.inputPasswordView);

        // this.spacer2 = new Surface({
        //     content: "",
        //     size: [undefined,4]
        // });
        // this.layout.Views.push(this.spacer2);

        this.submitSurface = new Surface({
            size: [undefined,60],
            classes: ['form-button-submit-default'],
            content: 'Login'
        });
        this.submitSurface.on('click', this.login.bind(this));
        this.layout.Views.push(this.submitSurface);


        this.spacerSurface = new Surface({
            content: "",
            size: [undefined, 20]
        });
        this.layout.Views.push(this.spacerSurface);

        this.signupLinkSurface = new Surface({
            content: 'Signup &gt;',
            size: [undefined,40],
            classes: [],
            properties: {
                color: "black",
                // backgroundColor: "white",
                lineHeight: "40px",
                // fontStyle: "italic",
                textAlign: "right"
            }
        });
        this.signupLinkSurface.on('click', function(){
            App.history.navigate('signup', {trigger: true});
        });
        this.layout.Views.push(this.signupLinkSurface);


        this.forgotLinkSurface = new Surface({
            content: 'Forgot Password &gt;',
            size: [undefined,40],
            classes: [],
            properties: {
                color: "black",
                backgroundColor: "white",
                lineHeight: "40px",
                // fontStyle: "italic",
                textAlign: "right"
            }
        });
        this.forgotLinkSurface.on('click', function(){
            App.history.navigate('forgot', {trigger: true});
        });
        this.layout.Views.push(this.forgotLinkSurface);


        this.layout.sequenceFrom(this.layout.Views);

        // assign the layout to this view
        // - with a SizeModifier so that we can center everything
        var originMod = new StateModifier({
            origin: [0.5, 0.5]
        });
        var sizeMod = new StateModifier({
            size: [window.innerWidth - 16, undefined]
        });
        this.add(sizeMod).add(originMod).add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.login = function(){
        var that = this;

        var email = this.inputEmailSurface.getValue(),
            password = this.inputPasswordView.Surface.getValue();

        // Disabled button
        this.submitSurface.setContent('Please wait...');

        var body = {
            email: email,
            password: password
        }

        // Test fetching a user
        this.model.login(body)
        .fail(function(){
            // invalid login

            alert('Failed logging in');
            that.submitSurface.setContent('Login');

        })
        .then(function(response){
            // Success logging in
            // - awesome!

            // ajax headers already set

            // Fetch model
            if(response.code != 200){
                alert('Failed signing in (3424)');
                that.submitSurface.setContent('Login');
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

                    localStorage.setItem(App.Credentials.local_user_key,JSON.stringify(userModel.toJSON()));

                    // Preload Models
                    require(['models/preload'], function(PreloadModels){
                        PreloadModels(that.options.App);
                    });

                    // Register for Push Notifications
                    App.DeviceReady.initPush();

                    // Reload home
                    App.history.eraseUntilTag('allofem');
                    App.history.navigate('dash');

                }
            });

            // // Store user in localStorage
            // localStorage.setItem('user_v3_',JSON.stringify(userModel.toJSON()));

            // // Set global logged in user
            // that.options.App.Data.User = userModel;

            // // Preload Models
            // require(['models/_preload'], function(PreloadModels){
            //     PreloadModels(that.options.App);
            // });

            // // Register for Push Notifications
            // App.DeviceReady.initPush();

            // // Reload home
            // App.history.navigate('fleet',{trigger: true, replace: true});

        });

    };

    PageView.prototype.backbuttonHandler = function(){
        return false;
    };

    PageView.DEFAULT_OPTIONS = {
    };

    module.exports = PageView;


});
