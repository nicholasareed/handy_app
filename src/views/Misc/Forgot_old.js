
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var RenderController = require('famous/views/RenderController');
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

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        // create the header

        // create the header
        this.header = new StandardHeader({
            content: "Feedback",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Create the RenderController/Lightbox
        this.lightbox = new RenderController();

        // Surfaces for success (after submitting)
        this.successSurface = new Surface({
            content: "Sent Reset Email",
            size: [undefined, 80],
            properties: {
                color: "black",
                lineHeight: "80px",
                textAlign: "center"
            }
        });


        // create the scrollView of content
        this.contentInputScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollInputSurfaces = [];
        this.contentInputScrollView.sequenceFrom(this.scrollInputSurfaces);

        // link endpoints of layout to widgets

        // Header/navigation
        this.layout.header.add(this.header);

        // Add lightbox to HeaderFooterLayout
        this.layout.content.add(Transform.behind).add(this.lightbox);

        // Add surfaces
        this.addSurfaces();
    
        // Show Input surfaces on load
        this.lightbox.show(this.contentInputScrollView);

        // add to RenderTree
        this.add(this.layout);


        // Models

        // User
        this.model = new UserModel.User();

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView

        // Email
        this.inputEmailSurface = new InputSurface({
            name: 'email',
            placeholder: 'Email Address You Registered With',
            type: 'text',
            size: [200, 50],
            value: ''
        });
        this.scrollInputSurfaces.push(this.inputEmailSurface);

        // Submit button
        this.submitButtonSurface = new Surface({
            size: [undefined,40],
            classes: ['button-surface'],
            content: 'Request Reset',
            properties: {
                lineHeight : "20px"
            }
        });
        this.scrollInputSurfaces.push(this.submitButtonSurface);

        // Events for surfaces
        this.submitButtonSurface.on('click', this.submit_forgot.bind(this));

    };

    PageView.prototype.submit_forgot = function(ev){
        var that = this;

        // Get email
        var email = $.trim(this.inputEmailSurface.getValue().toString());
        if(email.length === 0){
            return;
        }
        // todo: validate email

        // Disable submit button
        this.submitButtonSurface.setSize([0,0]);

        // data to POST
        // - just the email
        var dataBody = {
            email: email
            // code: code,
        };

        // Try sending a reset email
        $.ajax({
            url: Credentials.server_root + 'forgot',
            // url: 'https://wehicleapp.com/forgot',
            method: 'POST',
            data: dataBody,
            error: function(err){
                // failed somehow
                // - if it was a "valid" (structured correctly) email, we'll ALWAYS return "if an account exists for this email, we've sent a reset password"

                that.lightbox.show(that.contentInputScrollView);

                Utils.Notification.Toast('Failed sending email');
                that.submitButtonSurface.setSize([undefined,40]);

            },
            success: function(response){
                // Success logging in
                // - awesome!
                
                if(response.complete == true){
                    // Awesome, sent a reset email

                    that.lightbox.show(that.successSurface);

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
                that.submitButtonSurface.setSize([undefined,40]);

                return false;

            }

        });

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
