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
    var StandardPageView = require('views/common/StandardPageView');
    var StandardHeader = require('views/common/StandardHeader');
    var FormHelper = require('views/common/FormHelper');

    var BoxLayout = require('famous-boxlayout');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');

    // Custom Surface
    var TextAreaSurface = require('views/common/TextAreaSurface');


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
        
        // create the header
        this.header = new StandardHeader({
            content: "Forgot Password",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false,
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

        this.submitButton = new FormHelper({
            type: 'submit',
            value: 'Send Reset Email',
            margins: [10,10],
            click: this.submit_forgot.bind(this)
        });

        this.form.addInputsToForm([
            this.inputEmail,
            this.submitButton
        ]);

    };

    PageView.prototype.submit_forgot = function(ev){
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

        // Disable submit button
        this.submitButton.setContent('Please wait...');

        // data to POST
        // - just the email
        var dataBody = {
            email: email
            // code: code,
        };

        // Try sending a reset email
        $.ajax({
            url: Credentials.server_root + 'forgot',
            method: 'POST',
            data: dataBody,
            error: function(err){
                // failed somehow
                // - if it was a "valid" (structured correctly) email, we'll ALWAYS return "if an account exists for this email, we've sent a reset password"

                console.log(err);

                Utils.Notification.Toast('Failed sending email');
                that.submitButton.setContent('Send Reset Email');
                that.checking = false;

            },
            success: function(response){
                // Success logging in
                // - awesome!
                
                if(response.complete == true){
                    // Awesome, sent a reset email

                    // Surfaces for success (after submitting)
                    var successSurface = new Surface({
                        content: "Sent Reset Email",
                        size: [undefined, 80],
                        properties: {
                            color: "white",
                            lineHeight: "80px",
                            textAlign: "center"
                        }
                    });

                    that.form._formScrollView.Views = [successSurface];
                    that.form._formScrollView.sequenceFrom(that.form._formScrollView.Views);

                    Utils.Notification.Toast('Sent Reset Email');

                    return;

                }

                // See what the error was
                switch(response.msg){
                    case 'bademail':
                        alert('Sorry, that does not look like an email address to us.');
                        break;
                    case 'duplicate':
                        alert('Sorry, that email is already in use.');
                        break;
                    case 'unknown':
                    default:
                        alert('Sorry, we could not send a reset email at the moment, please try again!');
                        break;

                }

                // Re-enable submit button
                that.submitButton.setContent('Send Reset Email');
                that.checking = false;

                return false;

            }

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
                    // window.setTimeout(that.refreshData.bind(that), 1000);
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


