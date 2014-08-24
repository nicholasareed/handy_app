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
    // - none needed

    // Custom Surface
    var TextAreaSurface = require('views/common/TextAreaSurface');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Look for expected options
        this.options.indicator = this.options.args[0] || 'none';

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

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];

        // link endpoints of layout to widgets

        // Add surfaces to content (buttons)
        this.addSurfaces();

        // Sequence
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView
        this.inputFeedbackSurface = new TextAreaSurface({
            name: 'feedback',
            placeholder: 'Please tell us how we can improve, and be as specific as you can! ',
            type: 'text',
            size: [undefined, window.innerHeight * 0.5],
            value: ''
        });
        window.onresize = function(){
            // todo: unattach the onresize
            that.inputFeedbackSurface.setSize([undefined, window.innerHeight * 0.5]);
        };

        this.inputFeedbackSurface.View = new View();
        this.inputFeedbackSurface.View.StateModifier = new StateModifier();
        this.inputFeedbackSurface.View.add(this.inputFeedbackSurface.View.StateModifier).add(this.inputFeedbackSurface);
        this.scrollSurfaces.push(this.inputFeedbackSurface.View);

        this.submitButtonSurface = new Surface({
            content: 'Send Feedback',
            size: [undefined, 60],
            classes: ['form-button-submit-default']
        });
        this.submitButtonSurface.View = new View();
        this.submitButtonSurface.View.StateModifier = new StateModifier();
        this.submitButtonSurface.View.add(this.submitButtonSurface.View.StateModifier).add(this.submitButtonSurface);
        this.scrollSurfaces.push(this.submitButtonSurface.View);

        // Events for surfaces
        this.submitButtonSurface.on('click', this.send_feedback.bind(this));


    };

    PageView.prototype.send_feedback = function(ev){
        var that = this;

        // validate feedback
        var feedback = $.trim(this.inputFeedbackSurface.getValue().toString());
        if(feedback.length === 0){
            return;
        }

        // Disable submit
        this.submitButtonSurface.setSize([0,0]);

        // Submit the feedback
        $.ajax({
            url: Credentials.server_root + 'feedback',
            method: 'POST',
            data: {
                text: feedback,
                indicator: this.options.indicator
            },
            error: function(err){
                // failed

                Utils.Notification.Toast('Sorry, failed saving your feedback, kindly try again!');

                // todo: hande failed feedback submission

            },
            success: function(response){
                // real success

                // Toast a "Thank You"
                Utils.Notification.Toast('Thank you for the Feedback!');

                // Go back a page
                App.history.back();//.history.go(-1);

            }

        });

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
                        that.scrollSurfaces.forEach(function(surf, index){
                            surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        });

                        // Content
                        // - extra delay for other content to be gone
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring in button surfaces individually
                            that.scrollSurfaces.forEach(function(surf, index){
                                window.setTimeout(function(){
                                    surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                                        duration: 750,
                                        curve: Easing.inOutElastic
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
