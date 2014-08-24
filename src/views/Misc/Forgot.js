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

        Utils.Notification.Toast('Signup IS broken');

        // create the header

        this.header = new StandardHeader({
            content: "Back to Login",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();//.history.go(-1);
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // create the scrollView of content
        this.contentScrollView = new SequentialLayout(); //(App.Defaults.ScrollView);
        this.scrollSurfaces = [];
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // link endpoints of layout to widgets

        // Header/navigation
        this.layout.header.add(this.header);

        // Content
        this.layout.content.StateModifier = new StateModifier();
        this.contentView = new View();
        this.contentView.SizeMod = new Modifier({
            size: //[window.innerWidth - 50, true]
                function(){
                    var tmpSize = that.contentScrollView.getSize(true);
                    if(!tmpSize){
                        return [window.innerWidth, undefined];
                    }
                    return [window.innerWidth - 16, tmpSize[1]];
                }
        });
        this.contentView.OriginMod = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.contentView.add(this.contentView.OriginMod).add(this.contentView.SizeMod).add(this.contentScrollView);
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentView);

        // Add surfaces
        this.addSurfaces();

        // // Footer
        // // - bring it up
        // this.layout.footer.add(quick_stats_grid);
        
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
            placeholder: 'Email Address',
            type: 'text',
            size: [undefined, 50],
            value: ''
        });
        this.scrollSurfaces.push(this.inputEmailSurface);

        this.scrollSurfaces.push(new Surface({
            size: [undefined, 4]
        }));

        // Submit button
        this.submitButtonSurface = new Surface({
            size: [undefined,60],
            classes: ['form-button-submit-default'],
            content: 'Request Reset'
        });
        this.scrollSurfaces.push(this.submitButtonSurface);

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
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.inTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // window.setTimeout(this.refreshData.bind(this), 1000);
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
                        that.layout.content.StateModifier.setOpacity(0);
                        // that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth, 0, 0));

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring content back
                            that.layout.content.StateModifier.setOpacity(1, transitionOptions.inTransition);
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);


                        }, delayShowing +transitionOptions.outTransition.duration);


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
