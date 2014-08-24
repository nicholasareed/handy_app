/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var Lightbox = require('famous/views/Lightbox');
    var Surface = require('famous/core/Surface');
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

    // Models
    var PlayerModel = require('models/player');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        if(!App.Cache.HelpPopoverModal){
            window.location = '';
            return;
        }

        this.modalOptions = App.Cache.HelpPopoverModal;

        // Expecting there to be a max of about 10 modal options
        // - params.title is optional

        // Add to new ".passed" options, separate from this.options.App and other root-level arguments/objects
        this.params.passed = _.extend({
            title: null,
            body: ''
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

        var frontMod = new StateModifier({
            transform: Transform.inFront
        });
        this.contentView.add(this.contentView.BgOpacityMod).add(this.contentView.BgSurface);
        // this.contentView.add(frontMod).add(this.lightbox);

        this.contentScrollView = new View();
        this.contentScrollView.OriginMod = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.contentScrollView.SizeMod = new StateModifier({
            size: [window.innerWidth - 80, 200]
        });
        this.contentScrollView.PositionMod = new StateModifier({
            transform: Transform.translate(0, window.innerHeight, 0)
        });
        this.contentScrollView.ScaleMod = new StateModifier({
            transform: Transform.scale(0.001, 0.001, 0.001)
        });
        this.contentScrollView.SeqLayout = new SequentialLayout(); //App.Defaults.ScrollView);
        
        this.contentScrollView.Views = [];
        this.contentScrollView.SeqLayout.sequenceFrom(this.contentScrollView.Views);

        // Add Surfaces
        this.addSurfaces();

        // add sizing and everything
        this.contentScrollView.add(this.contentScrollView.OriginMod).add(this.contentScrollView.PositionMod).add(this.contentScrollView.ScaleMod).add(this.contentScrollView.SizeMod).add(this.contentScrollView.SeqLayout);

        // show the content in the lightbox
        // this.lightbox.show(this.contentScrollView);
        this.contentView.add(frontMod).add(this.contentScrollView);
        this.add(this.contentView);


        // Events (background on_cancel)
        this.contentView.BgSurface.on('click', function(){
            // close the popover, call on_cancel
            that.closePopover();
            if(that.params.passed.on_done){
                that.params.passed.on_done();
            }
        });

        // // Content
        // this.layout.content.StateModifier = new StateModifier();
        // this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);

        // // Attach layout to the context
        // this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.backbuttonHandler = function(){
        var that = this;
        // Back button pressed
        // alert('back button pressed for popover');
        this.closePopover();
        // if(that.params.passed.on_cancel){
        that.params.passed.on_done();
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
            App.Views.Popover.hide(); // actually hide the popover

        }, delay);

        return def.promise();
    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: this.params.passed.title,
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            // App.history.back();//.history.go(-1);
            
            if(that.params.passed.on_done){
                that.params.passed.on_done();
            }
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.addSurfaces = function(Model) { 
        var that = this;
        ModelIndex = this.contentScrollView.Views.length;

        // Adding a header kinda and a body

        // title
        this.titleView = new View(); 
        this.titleView.Surface = new Surface({
            size: [undefined, 60],
            content: this.params.passed.title,
            classes: ['modal-option-help-popover-title-default']
        });
        this.titleView.add(this.titleView.Surface);
        this.titleView.Surface.pipe(that.contentScrollView);
        this.titleView.Surface.on('click', function(){
            // debugger;
            // var returnResult = listOption;
            that.closePopover();
            that.params.passed.on_done();
        });
        that.contentScrollView.Views.push(this.titleView);

        // body
        this.bodyView = new View(); 
        this.bodyView.Surface = new Surface({
            size: [undefined, 60],
            content: this.params.passed.body,
            classes: ['modal-option-help-popover-body-default']
        });
        this.bodyView.add(this.bodyView.Surface);
        this.bodyView.Surface.pipe(that.contentScrollView);
        this.bodyView.Surface.on('click', function(){
            // debugger;
            // var returnResult = listOption;
            that.closePopover();
            that.params.passed.on_done();
        });
        that.contentScrollView.Views.push(this.bodyView);

    };

    PageView.prototype.inOutTransitionPopover = function(direction){
        var that = this;

        var delay = 0;

        // this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':

                // Fade out the background
                delay = 1000;

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
                    duration: 450,
                    curve: 'easeOut'
                });
                that.contentScrollView.ScaleMod.setTransform(Transform.scale(1,1,1),{
                    duration: 450,
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
