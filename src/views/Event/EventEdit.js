/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var TextareaSurface = require('famous/surfaces/TextareaSurface');
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
    var EventModel = require('models/event');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Models

        // Event
        this.loadModels();

        this.input_keys = {
            'title' : {
                name: 'Title',
                type: 'text',
                placeholder: 'Title',
                path: 'title',
                upload_key: 'title'
            },
            'description' : {
                name: 'Description',
                type: 'textarea',
                placeholder: 'Description',
                path: 'description',
                upload_key: 'description'
            }
        };

        // this.inputDetails = keys[this.options.args[0]];


        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createContent();
        this.createHeader();

        // Add surfaces
        this.model.populated().then(function(){
            console.log(that.model.toJSON());
            that.addSurfaces();
        });

        this.add(this.layout);
    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        this.event_id = this.options.args[0];

        this.model = new EventModel.Event({
            _id: this.event_id
        });
        this.model.fetch({prefill: true});

    };

    PageView.prototype.createHeader = function(){
        var that = this;

        this.header = new StandardHeader({
            content: "Update Event",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
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

        this.layout.header.add(this.header);
    };

    PageView.prototype.createContent = function(){
        var that = this;

        // create the scrollView of content
        this.contentScrollView = new ScrollView(); //(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        
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
            // origin: [0.5, 0.5]
        });
        this.contentView.add(this.contentView.OriginMod).add(this.contentView.SizeMod).add(this.contentScrollView);
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentView);

    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView

        this.inputSurfaces = [];

        // Spacer
        this.contentScrollView.Views.push(new Surface({
            size: [undefined, 16]
        }));


        Object.keys(this.input_keys).forEach(function(key){

            var inputDetails = that.input_keys[key];

            var inputSurface;

            switch(inputDetails.type){
                case 'text':
                    inputSurface = new InputSurface({
                        name: inputDetails.name,
                        placeholder: inputDetails.placeholder,
                        type: 'text',
                        size: [undefined, 50],
                        value: that.model.get(inputDetails.path)
                    });
                    break;
                case 'textarea':
                    console.log(that.model.toJSON());
                    inputSurface = new TextareaSurface({
                        name: inputDetails.name,
                        placeholder: inputDetails.placeholder,
                        size: [undefined, window.innerHeight / 2],
                        value: that.model.get(inputDetails.path)
                    });
                    break;
            }
            inputSurface.Details = inputDetails;
            inputSurface.pipe(that.contentScrollView);

            that.inputSurfaces.push(inputSurface);

            that.contentScrollView.Views.push(inputSurface);

            // Spacer
            that.contentScrollView.Views.push(new Surface({
                size: [undefined, 4]
            }));

        });


        // Submit button
        this.submitButtonSurface = new Surface({
            size: [undefined,60],
            classes: ['form-button-submit-default'],
            content: 'Update Event'
        });
        this.submitButtonSurface.pipe(this.contentScrollView);
        this.contentScrollView.Views.push(this.submitButtonSurface);

        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Events for surfaces
        this.submitButtonSurface.on('click', this.save_event.bind(this));

    };

    PageView.prototype.save_event = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;

        var formData = {};

        // Gather fields
        var valid = true;
        this.inputSurfaces.forEach(function(tmpView){
            if(!valid){ return; }

            var details = tmpView.Details;

            var val = $.trim(tmpView.getValue().toString());

            if(details.path == 'profile.name'){
                // min length
                if(val.length == 0){
                    valid = false;
                    Utils.Notification.Toast('Enter something, please!');
                    return
                };
            }

            formData[ details.upload_key ] = val;

        });

        if(!valid){
            this.checking = false;
            return;
        }

        // // validate fields
        // var formData = $.trim(this.inputSurface.getValue().toString());
        // if(formData.length === 0){
        //     Utils.Notification.Toast('Enter something, please!');
        //     this.checking = false;
        //     return;
        // }

        // Disable submit button
        this.submitButtonSurface.setContent('Please wait...');

        // // Get elements to save
        // var data = {};
        // data[this.inputDetails.upload_key] = formData;

        this.model.save(formData,{
            patch: true,
            success: function(){

                // Disable submit button
                that.submitButtonSurface.setContent('Update Profile');

                // Clear event cache
                // - todo...

                // get rid of everything back to the Dash
                // App.history.eraseUntilTag('Dash');

                // Go back
                App.history.backTo('Dash');


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
                        that.layout.content.StateModifier.setOpacity(0);

                        // Content
                        window.setTimeout(function(){

                            // Bring content back
                            that.layout.content.StateModifier.setOpacity(1, transitionOptions.inTransition);

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
