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
    var StandardHeader = require('views/common/StandardHeader');

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
            text: null,
            button: 'OK'
        }, this.modalOptions || {});

        // // create the layout
        // this.layout = new HeaderFooterLayout({
        //     headerSize: App.Defaults.Header.size,
        //     footerSize: App.Defaults.Footer.size
        // });

        // this.createHeader();

        // Background

        this.contentView = new View();
        this.contentView.BgSurface = new Surface({
            content: '',
            size: [undefined, undefined],
            properties: {
                backgroundColor: 'black'
            }
        });
        this.contentView.BgOpacityMod = new StateModifier({
            opacity: 0
        });


        // Create Content Views
        this.lightbox = new Lightbox({
            // inTransition: false
        });
        
        this.contentView.add(Utils.usePlane('popover')).add(this.contentView.BgOpacityMod).add(this.contentView.BgSurface);
        // this.contentView.add(frontMod).add(this.lightbox);

        this.contentScrollView = new View();
        this.contentScrollView.OriginMod = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.contentScrollView.SizeMod = new StateModifier({
            size: [window.innerWidth - 80, true]
        });
        this.contentScrollView.PositionMod = new StateModifier({
            transform: Transform.translate(0, window.innerHeight, 0)
        });
        this.contentScrollView.ScaleMod = new StateModifier({
            transform: Transform.scale(0.001, 0.001, 0.001)
        });

        // ScrollView or SequentialLayout
        switch(this.modalOptions.type){
            case 'scroll':
                this.contentScrollView.SeqLayout = new ScrollView(); //App.Defaults.ScrollView);
                this.contentScrollView.SizeMod.setSize([window.innerWidth - 80, window.innerHeight - 40]);
                break
            case 'static':
            default:
                this.contentScrollView.SeqLayout = new SequentialLayout(); //App.Defaults.ScrollView);
                break;
        }
        
        this.contentScrollView.Views = [];

        // Add Surfaces
        this.addSurfaces();

        // sequenceFrom
        this.contentScrollView.SeqLayout.sequenceFrom(this.contentScrollView.Views);

        // add sizing and everything
        this.contentScrollView.add(this.contentScrollView.OriginMod).add(this.contentScrollView.PositionMod).add(this.contentScrollView.ScaleMod).add(this.contentScrollView.SizeMod).add(this.contentScrollView.SeqLayout);

        // show the content in the lightbox
        // this.lightbox.show(this.contentScrollView);
        this.contentView.add(Utils.usePlane('popover',1)).add(this.contentScrollView);
        this.add(this.contentView);


        // Events (background on_cancel)
        this.contentView.BgSurface.on('click', function(){
            // // close the popover, call on_cancel
            // that.closePopover();
            // if(that.params.passed.on_cancel){
            //     that.params.passed.on_cancel();
            // }
        });

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.addSurfaces = function(Model) { 
        var that = this;
        ModelIndex = this.contentScrollView.Views.length;
        // Text
        // Buttons

        // Text

        this.textView = new View();
        this.textView.Surface = new Surface({
            size: [undefined, true],
            content: this.params.passed.text,
            classes: ['modal-option-buttons-text-default']
        });
        this.textView.add(this.textView.Surface);
        this.textView.getSize = function(){
            return [undefined, that.textView.Surface._trueSize ? that.textView.Surface._trueSize[1] : undefined];
        };
        this.textView.Surface.pipe(that.contentScrollView.SeqLayout);
        this.textView.Surface.on('click', function(){
            
            that.closePopover();
            if(that.params.passed.on_done){
                that.params.passed.on_done();
            }

        });
        that.contentScrollView.Views.push(this.textView);


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
            content: '<div class="outward-button">' + this.params.passed.buttonYes + '</div>',
            classes: ['button-outwards-default'],
            properties: {
                backgroundColor: 'white'
            }
        });
        OKButtonView.add(OKButtonView.Surface);
        OKButtonView.Surface.pipe(that.contentScrollView.SeqLayout);
        OKButtonView.Surface.on('click', function(){
            // var value = that.inputView.Surface.getValue();

            that.closePopover();
            if(that.params.passed.on_done){
                that.params.passed.on_done();
            }

        });
        this.buttonsView.GridLayout.Views.push(OKButtonView.Surface);

        // Cancel (one-third)
        var CancelButtonView = new View(); 
        CancelButtonView.Surface = new Surface({
            size: [undefined, 60],
            content: '<div class="outward-button">' + this.params.passed.buttonNo + '</div>',
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
        // if(that.params.passed.on_cancel){
        that.params.passed.on_cancel();
        // }
    };

    PageView.prototype.closePopover = function(){
        // Back button pressed
        var that = this;
        var def = $.Deferred();

        // Close popover!

        // run our animation first
        var delay = this.inOutTransitionPopover('hiding');
        Timer.setTimeout(function(){

            def.resolve(); // 
            App.Views.Popover.hideIf(that); // actually hide the popover

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

                that.contentScrollView.PositionMod.setTransform(Transform.translate(0,-1 * window.innerHeight,0),{
                    duration: 250,
                    curve: 'easeIn' //Easing.inElastic
                });
                // that.contentScrollView.ScaleMod.setTransform(Transform.scale(1,1,1),{
                //     duration: 750,
                //     curve: 'easeOut'
                // });

                break;

            case 'showing':

                // Content
                // - extra delay for content to be gone
                that.contentView.BgOpacityMod.setOpacity(0);
                that.contentView.BgOpacityMod.setOpacity(0.4, {
                    duration: 250,
                    curve: 'easeOut'
                });


                that.contentScrollView.PositionMod.setTransform(Transform.translate(0,0,0),{
                    duration: 250,
                    curve: 'easeOut'
                });
                that.contentScrollView.ScaleMod.setTransform(Transform.scale(1,1,1),{
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
