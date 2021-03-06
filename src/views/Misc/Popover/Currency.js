/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var RenderController = require('famous/views/RenderController');
    var Lightbox = require('famous/views/Lightbox');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var ContainerSurface    = require("famous/surfaces/ContainerSurface");

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var Easing = require('famous/transitions/Easing');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Views
    var StandardPageView = require('views/common/StandardPageView');
    var StandardHeader = require('views/common/StandardHeader');
    var FormHelper = require('views/common/FormHelper');
    var StandardCurrencyInput = require('views/common/StandardCurrencyInput');

    var BoxLayout = require('famous-boxlayout');

    // Extras
    var Utils = require('utils');
    var _ = require('underscore');
    var $ = require('jquery');

    // // Models
    // var PlayerModel = require('models/player');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        if(!App.Cache.OptionModal){
            window.location = '';
            return;
        }

        this.modalOptions = App.Cache.OptionModal;

        // Expecting there to be a max of about 10 modal options
        // - params.title is optional

        // Add to new ".passed" options, separate from this.options.App and other root-level arguments/objects
        this.params.passed = _.extend({
        }, this.modalOptions || {});

        this.createContent();

        this.add(Utils.usePlane('popover')).add(this.contentView);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createContent = function(){
        var that = this;

        this.contentView = new View();
        this.contentView.BgSurface = new Surface({
            content: '',
            size: [window.innerWidth * 2, window.innerHeight * 2], // make sure it covers everything
            properties: {
                backgroundColor: 'black'
            }
        });
        this.contentView.BgOpacityMod = new StateModifier({
            opacity: 0
        });


        // // Create Content Views
        // this.lightbox = new Lightbox({
        //     // inTransition: false
        // });

        this.contentView.add(this.contentView.BgOpacityMod).add(Utils.usePlane('popover')).add(this.contentView.BgSurface);

        // create the currency input
        this.currencyInput = new StandardCurrencyInput(this.modalOptions);
        this.currencyInput.on('done', function(amount){
            that.closePopover();
            if(that.params.passed.on_done){
                that.params.passed.on_done(amount);
            }
        });
        this.currencyInput.on('cancel', function(){
            that.closePopover();
            if(that.params.passed.on_cancel){
                that.params.passed.on_cancel();
            }
        });

        this.popoverContent = new View();
        this.popoverContent.PositionMod = new StateModifier({
            transform: Transform.translate(0, window.innerHeight, 0)
        });
        this.popoverContent.OriginMod = new StateModifier({
            align: [0.5, 0.5],
            origin: [0.5, 0.5]
        });
        this.popoverContent.OuterSizeMod = new Modifier({
            size: function(){
                return [window.innerWidth - 40, App.mainSize[1]]
            }
        });
        this.popoverContent.SizeMod = new Modifier({
            size: function(){
                var defaultSize = 200;
                var newSize = that.currencyInput.getSize ? (that.currencyInput.getSize() ? that.currencyInput.getSize()[1] : defaultSize) : defaultSize;
                // console.log(newSize);
                return [undefined, newSize] // default 200 sizing
            }
        });

        // add the form to the popover
        this.popoverContent.add(this.popoverContent.OuterSizeMod).add(this.popoverContent.OriginMod).add(this.popoverContent.SizeMod).add(this.popoverContent.PositionMod).add(this.currencyInput);

        // // Content Modifiers
        // this.layout.content.StateModifier = new StateModifier();

        // // Now add content
        // this.layout.content.add(this.layout.content.StateModifier).add(Utils.usePlane('content')).add(this.form);


        // this.contentScrollView = new View();
        // this.contentScrollView.OriginMod = new StateModifier({
        //     origin: [0.5, 0.5]
        // });
        // this.contentScrollView.SizeMod = new StateModifier({
        //     size: [window.innerWidth - 40, true]
        // });
        // this.contentScrollView.PositionMod = new StateModifier({
        //     transform: Transform.translate(0, window.innerHeight, 0)
        // });

        // // ScrollView or SequentialLayout
        // switch(this.modalOptions.type){
        //     case 'scroll':
        //         this.contentScrollView.SeqLayout = new ScrollView(); //App.Defaults.ScrollView);
        //         this.contentScrollView.SizeMod.setSize([window.innerWidth - 40, window.innerHeight - 40]);
        //         break
        //     case 'static':
        //     default:
        //         this.contentScrollView.SeqLayout = new SequentialLayout(); //App.Defaults.ScrollView);
        //         break;
        // }
        
        // this.contentScrollView.Views = [];

        // // Add Surfaces
        // this.addSurfaces();

        // // sequenceFrom
        // this.contentScrollView.SeqLayout.sequenceFrom(this.contentScrollView.Views);

        // // add sizing and everything
        // this.contentScrollView.add(this.contentScrollView.OriginMod).add(this.contentScrollView.PositionMod).add(this.contentScrollView.SizeMod).add(this.contentScrollView.SeqLayout);

        // show the content in the lightbox
        // this.lightbox.show(this.contentScrollView);
        this.contentView.add(Utils.usePlane('popover',2)).add(this.popoverContent);
        
    };

    PageView.prototype.addSurfaces = function() { 
        var that = this;


        // Build Surfaces


        // Text
        this.textView = new View();
        this.textView.Surface = new Surface({
            size: [undefined, true],
            content: '<div>' + S(this.params.passed.text) + '</div>',
            classes: ['modal-option-buttons-text-default']
        });
        this.textView.add(this.textView.Surface);
        this.textView.getSize = function(){
            return [undefined, that.textView.Surface._trueSize ? that.textView.Surface._trueSize[1] : undefined];
        };
        this.textView.Surface.pipe(this.form._formScrollView);
        this.textView.Surface.on('click', function(){
            
            // that.closePopover();
            // if(that.params.passed.on_done){
            //     that.params.passed.on_done();
            // }

        });

        this.inputText = new FormHelper({

            margins: [10,10],

            form: this.form,
            name: 'input',
            placeholder: this.params.passed.placeholder || '',
            value: this.params.passed.defaultValue,
            type: this.params.passed.type || 'text'
        });
        console.log(this.inputText);
        this.inputText.Surface.on('deploy', function(){
            Timer.setTimeout(function(){
                that.inputText.Surface.focus();
            },2000);
        });


        this.submitButton = new FormHelper({
            form: this.form,
            type: 'submit',
            value: this.params.passed.button,
            margins: [10,10],
            click: function(){

                var value = that.inputText.getValue();

                that.closePopover();
                if(that.params.passed.on_done){
                    that.params.passed.on_done(value);
                }
            }
        });
        this.cancelButton = new FormHelper({
            type: 'submit',
            form: this.form,
            classes: ['form-button-submit-default','cancel-button'],
            value: this.params.passed.buttonCancel || 'Cancel',
            margins: [10,10],
            click: function(){
                
                that.closePopover();
                if(that.params.passed.on_cancel){
                    that.params.passed.on_cancel();
                }
            }
        });
        if(!this.params.passed.buttonCancel || this.params.passed.buttonCancel == ''){
            debugger;
        }

        this.buttonsView = new View();
        this.buttonsView.SizeMod = new StateModifier({
            size: [undefined, 60]
        });
        this.buttonsView.GridLayout = new FlexibleLayout({
            direction: 0, // x, horizontal
            ratios: [2, 1]
        });
        this.buttonsView.GridLayout.Views = [];

        this.buttonsView.GridLayout.Views.push(this.submitButton);
        this.buttonsView.GridLayout.Views.push(this.cancelButton);

        this.buttonsView.GridLayout.sequenceFrom(this.buttonsView.GridLayout.Views);

        this.buttonsView.add(this.buttonsView.SizeMod).add(this.buttonsView.GridLayout);

        // // Forgot password
        // this.forgotPassword = new View();
        // this.forgotPassword.StateModifier = new StateModifier();
        // this.forgotPassword.Surface = new Surface({
        //     content: 'Forgot your password? Reset Now',
        //     size: [undefined, 80], 
        //     classes: ['login-forgot-pass-button']
        // });
        // this.forgotPassword.Surface.pipe(this.form._formScrollView);
        // this.forgotPassword.Surface.on('click', function(){
        //     App.history.navigate('forgot');
        // });
        // this.forgotPassword.add(this.forgotPassword.StateModifier).add(this.forgotPassword.Surface);


        this.form.addInputsToForm([
            this.textView,
            this.inputText,
            this.buttonsView
        ]);


        return;


        // // Text
        // // Buttons

        // // Text
        // this.textView = new View();
        // this.textView.Surface = new Surface({
        //     size: [undefined, true],
        //     content: this.params.passed.text,
        //     classes: ['modal-option-buttons-text-default']
        // });
        // this.textView.add(this.textView.Surface);
        // this.textView.getSize = function(){
        //     return [undefined, that.textView.Surface._trueSize ? that.textView.Surface._trueSize[1] : undefined];
        // };
        // this.textView.Surface.pipe(that.contentScrollView.SeqLayout);
        // this.textView.Surface.on('click', function(){
            
        //     // that.closePopover();
        //     // if(that.params.passed.on_done){
        //     //     that.params.passed.on_done();
        //     // }

        // });
        // that.contentScrollView.Views.push(this.textView);

        // // Input
        // this.inputView = new View();
        // this.inputView.Bg = new Surface({
        //     size: [undefined, 40],
        //     properties: {
        //         backgroundColor: 'white'
        //     }
        // });
        // this.inputView.Surface = new InputSurface({
        //     name: 'input',
        //     size: [undefined, true],
        //     value: this.params.passed.defaultValue,
        //     type: this.params.passed.type || 'text'
        // });
        // this.inputView.Surface.OriginMod = new StateModifier({
        //     // origin: [0.5,0.5]
        // });
        // this.inputView.Surface.SizeMod = new Modifier({
        //     size: function(){
        //         return [undefined, 40];
        //     }
        // });
        // this.inputView.add(Utils.usePlane('popover',1)).add(this.inputView.Bg);
        // this.inputView.add(Utils.usePlane('popover',2)).add(this.inputView.Surface.SizeMod).add(this.inputView.Surface.OriginMod).add(this.inputView.Surface);
        // this.inputView.getSize = function(){
        //     return [undefined, 40];
        // };
        // this.inputView.Surface.pipe(that.contentScrollView.SeqLayout);
        // this.inputView.Surface.on('click', function(){
            
        //     // that.closePopover();
        //     // if(that.params.passed.on_done){
        //     //     that.params.passed.on_done();
        //     // }

        // });
        // that.contentScrollView.Views.push(this.inputView);


        // Buttons (FlexibleLayout)

        this.buttonsView = new View();
        this.buttonsView.SizeMod = new StateModifier({
            size: [undefined, 60]
        });
        this.buttonsView.GridLayout = new FlexibleLayout({
            direction: 0, // x, horizontal
            ratios: [2, 1]
        });
        this.buttonsView.GridLayout.Views = [];

        // OK (two-thirds)
        var OKButtonView = new View(); 
        OKButtonView.Surface = new Surface({
            size: [undefined, 60],
            content: '<div class="outward-button">' + this.params.passed.button + '</div>',
            classes: ['button-outwards-default'],
            properties: {
                backgroundColor: 'white'
            }
        });
        OKButtonView.add(OKButtonView.Surface);
        OKButtonView.Surface.pipe(that.contentScrollView.SeqLayout);
        OKButtonView.Surface.on('click', function(){
            var value = that.inputView.Surface.getValue();

            that.closePopover();
            if(that.params.passed.on_done){
                that.params.passed.on_done(value);
            }

        });
        this.buttonsView.GridLayout.Views.push(OKButtonView.Surface);

        // Cancel (one-third)
        var CancelButtonView = new View(); 
        CancelButtonView.Surface = new Surface({
            size: [undefined, 60],
            content: '<div class="outward-button">' + this.params.passed.buttonCancel + '</div>',
            classes: ['button-outwards-default'],
            properties: {
                backgroundColor: 'white'
            }
        });
        CancelButtonView.add(CancelButtonView.Surface);
        CancelButtonView.Surface.pipe(that.contentScrollView.SeqLayout);
        CancelButtonView.Surface.on('click', function(){
            
            that.closePopover();
            if(that.params.passed.on_cancel){
                that.params.passed.on_cancel();
            }

        });
        this.buttonsView.GridLayout.Views.push(CancelButtonView.Surface);

        this.buttonsView.GridLayout.sequenceFrom(this.buttonsView.GridLayout.Views);

        this.buttonsView.add(this.buttonsView.SizeMod).add(this.buttonsView.GridLayout);

        that.contentScrollView.Views.push(this.buttonsView);

    };

    PageView.prototype.backbuttonHandler = function(){
        var that = this;
        // Back button pressed
        // alert('back button pressed for popover');
        this.closePopover();
        if(that.params.passed.on_cancel){
            that.params.passed.on_cancel();
        }
    };

    PageView.prototype.closePopover = function(){
        // Back button pressed
        var that = this;
        var def = $.Deferred();

        // Close popover!

        // run our animation first
        var delay = this.inOutTransitionPopover('hiding');
        Timer.setTimeout(function(){

            App.Views.Popover.hideIf(that); // actually hide the popover
            def.resolve();

        }, delay);

        return def.promise();
    };

    PageView.prototype.inOutTransitionPopover = function(direction){
        var that = this;

        var delay = 0;

        // this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':

                // Fade out the background
                delay = 350;

                that.contentView.BgOpacityMod.setOpacity(0, {
                    duration: 350,
                    curve: 'easeOut'
                });

                that.popoverContent.PositionMod.setTransform(Transform.translate(0,-2 * window.innerHeight,0),{
                    duration: 250,
                    curve: 'easeIn' //Easing.inElastic
                });

                break;

            case 'showing':

                // Content
                // - extra delay for content to be gone
                that.contentView.BgOpacityMod.setOpacity(0);
                that.contentView.BgOpacityMod.setOpacity(0.4, {
                    duration: 250,
                    curve: 'easeOut'
                });


                that.popoverContent.PositionMod.setTransform(Transform.translate(0,0,0),{
                    duration: 250,
                    curve: 'easeOut'
                });

                // that.contentView.BgOpacityMod.setOpacity(0);
                // that.contentView.BgOpacityMod.setOpacity(0.4, {
                //     duration: 250,
                //     curve: 'easeOut'
                // });


                // Bring content back
                // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                // that.layout.content.StateModifier.setOpacity(1, transitionOptions.inTransition);

                break;
        }
        
        // return transitionOptions;
        return delay;
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
