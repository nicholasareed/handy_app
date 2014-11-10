/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
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

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Views
    var StandardPageView = require('views/common/StandardPageView');
    var StandardHeader = require('views/common/StandardHeader');
    var FormHelper = require('views/common/FormHelper');
    var BoxLayout = require('famous-boxlayout');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');
    // var Geolocation = require('models/geolocation');


    function PageView(options) {
        var that = this;
        StandardPageView.apply(this, arguments);
        this.options = options;

        if(!this.options.App.Cache.CompanyEditDetailOptions){
            console.error('no location options');
            App.history.back();
            return;
        }

        // What we'll return (kinda, through choose_xyz)
        // ....

        // Add to new ".passed" options, separate from this.options.App and other root-level arguments/objects
        this.options.passed = _.extend({
            // ;pass
        }, App.Cache.CompanyEditDetailOptions || {});

        this._showing = false;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 0
        });

        this.createHeader();
        this.createContent();
        
        // Attach to render tree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(StandardPageView.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header
        this.header = new StandardHeader({
            content: "Company Details",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // backContent: tru,
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();

            if(this.test.click4){
                console.log(1);
            }
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

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


        // // Form Container
        // this.FormContainer = new FormContainerSurface();

        // // create the scrollView of content
        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        // this.contentScrollView.Views = [];

        // // link endpoints of layout to widgets

        // // Sequence
        // this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // this.FormContainer.add(this.contentScrollView);

        // // Content Modifiers
        // this.layout.content.StateModifier = new StateModifier();

        // // Now add content
        // this.layout.content.add(this.layout.content.StateModifier).add(this.FormContainer);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        var allInputs = []; // array for adding to the _formScrollView

        this.inputs = [{
            name: 'name',
            placeholder: 'Name',
            type: 'text',
            size: [undefined, 50],
            value: this.options.passed.summary.Model.get('name')
        },{
            name: 'website',
            placeholder: 'website',
            type: 'text',
            size: [undefined, 50],
            value: this.options.passed.summary.Model.get('website')
        },{
            name: 'description',
            placeholder: 'Description (markdown supported)',
            type: 'textarea',
            size: [undefined, 150],
            value: this.options.passed.summary.Model.get('description')
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
                value: inputOpts.value
            });

        });

        Object.keys(this._inputs).forEach(function(key){
            allInputs.push(that._inputs[key]);
        });

        this.submitButton = new FormHelper({
            form: this.form,
            type: 'submit',
            value: 'Continue',
            margins: [10,10],
            click: this.save_details.bind(this)
        });

        allInputs.push(this.submitButton);

        this.form.addInputsToForm(allInputs);

    };

    PageView.prototype.save_details = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;
        // this.submitButton.setContent('Validating Address');

        // var $form = this.$('#credit-card-form');
        var submitData = {
            name: $.trim(this._inputs['name'].getValue().toString()),
            description: $.trim(this._inputs['description'].getValue().toString()),
            website:$.trim(this._inputs['website'].getValue().toString())
        };

        this.checking = false;

        App.Cache.CompanyEditDetailOptions.on_choose(submitData);

        return false;
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                this._showing = false;
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hide/move elements
                        Timer.setTimeout(function(){

                            // slide out
                            that.layout.content.StateModifier.setTransform(Transform.translate(-1 * window.innerWidth,0,0),{
                                duration: 450,
                                curve: Easing.inQuad
                            });

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                this._showing = true;
                if(this._refreshData){
                    // Timer.setTimeout(that.refreshData.bind(that), 1000);
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
                        that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0));
                        // that.contentScrollView.Views.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        // });

                        // Content
                        // - extra delay for other content to be gone
                        Timer.setTimeout(function(){

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0),{
                                duration: 450,
                                curve: Easing.outQuad
                            });

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring in button surfaces individually
                            // that.contentScrollView.Views.forEach(function(surf, index){
                                // Timer.setTimeout(function(){
                                //     surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                                //         duration: 750,
                                //         curve: Easing.inOutElastic
                                //     });
                                // }, index * 50);
                            // });

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
