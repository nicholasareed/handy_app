/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
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

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl_share      = require('text!./tpl/ShareButtons.html');
    var template_share = Handlebars.compile(tpl_share);

    // // Models
    // var PlayerModel = require('models/player');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        if(!App.Cache.OptionModal){
            debugger;
            window.location = '';
            return;
        }

        this.modalOptions = App.Cache.OptionModal;

        // Expecting there to be a max of about 10 modal options
        // - params.title is optional


        Utils.Popover.Share({

            text: 'Share this stuff!',

            email: {
                // subject: 'bullshit this works',
                // body: 'tsting this again',
                subject: encodeURI('subject here'),
                body: encodeURI("body goes here")
            },
            twitter: {
                text: encodeURI('This works for the hashtag #somethingcool too!').replace(/\#/g, "%23")
            },
            facebook: {
                link: 'http://famousmobileapps.com'
            },
            linkedin: {
                title: encodeURI('Title here'),
                summary: encodeURI('summary here'),
                link: 'http://famousmobileapps.com'
            },
            gplus: {
                link: encodeURI('text here')
            },
            reddit: {
                link: 'text here'
            },
        });


        // Add to new ".passed" options, separate from this.options.App and other root-level arguments/objects
        this.params.passed = _.extend({
            text: null, // String
            buttons: null, // []
            email: null,
            twitter: null,
            facebook: null,
            linkedin: null,
            gplus: null,
            reddit: null
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
            origin: [0.5, 0.5],
            align: [0.5, 0.5]
        });
        this.contentScrollView.OuterSizeMod = new StateModifier({
            size: [window.innerWidth - 40, true]
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

        this.contentScrollView.SizeMod = new Modifier({
            size: function(){
                if(that.contentScrollView.SeqLayout._trueSize){
                    console.log('-----------');
                    // console.log(that.form.trueSize());
                    // console.log(that.contentScrollView.getSize());
                    // console.log(that.contentScrollView._size);
                }
                var defaultSize = 200;
                var newSize = that.contentScrollView.SeqLayout.getSize ? (that.contentScrollView.SeqLayout.getSize() ? that.contentScrollView.SeqLayout.getSize()[1] : defaultSize) : defaultSize;
                // console.log(newSize);
                return [undefined, newSize] // default 200 sizing
            }
        });
        
        this.contentScrollView.Views = [];

        // Add Surfaces
        this.addSurfaces();

        // sequenceFrom
        this.contentScrollView.SeqLayout.sequenceFrom(this.contentScrollView.Views);

        // add sizing and everything
        this.contentScrollView.add(this.contentScrollView.OuterSizeMod).add(this.contentScrollView.OriginMod).add(this.contentScrollView.SizeMod).add(this.contentScrollView.PositionMod).add(this.contentScrollView.ScaleMod).add(this.contentScrollView.SeqLayout);

        // show the content in the lightbox
        // this.lightbox.show(this.contentScrollView);
        this.contentView.add(Utils.usePlane('popover',1)).add(this.contentScrollView);
        this.add(this.contentView);


        // Events (background on_cancel)
        this.contentView.BgSurface.on('click', function(){
            // close the popover, call on_cancel
            that.closePopover();
            if(that.params.passed.on_cancel){
                that.params.passed.on_cancel();
            }
        });

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.addSurfaces = function(Model) { 
        var that = this;
        ModelIndex = this.contentScrollView.Views.length;
        // Text
        // Buttons

        // Share buttons
        this.shareButtonsView = new View();
        this.shareButtonsView.Surface = new Surface({
            size: [undefined, true],
            content: template_share(this.params.passed.details),
            wrap: '<div></div>',
            classes: ['modal-option-buttons-text-default']
        });
        this.shareButtonsView.add(this.shareButtonsView.Surface);
        this.shareButtonsView.getSize = function(){
            // console.log(that.shareButtonsView.Surface._trueSize);
            return [undefined, that.shareButtonsView.Surface._trueSize ? that.shareButtonsView.Surface._trueSize[1] : undefined];
        };
        this.shareButtonsView.Surface.pipe(that.contentScrollView.SeqLayout);
        this.shareButtonsView.Surface.on('click', function(){
            
            that.closePopover();
            if(that.params.passed.on_done){
                that.params.passed.on_done();
            }

        });

        that.contentScrollView.Views.push(this.shareButtonsView);


        // // Text
        // if(this.modalOptions.details.text){

        //     this.textView = new View();
        //     this.textView.Surface = new Surface({
        //         size: [undefined, true],
        //         content: this.modalOptions.details.text,
        //         classes: ['modal-option-buttons-text-default']
        //     });
        //     this.textView.add(this.textView.Surface);
        //     this.textView.getSize = function(){
        //         return [undefined, that.textView.Surface._trueSize ? that.textView.Surface._trueSize[1] : undefined];
        //     };
        //     this.textView.Surface.pipe(that.contentScrollView.SeqLayout);
        //     this.textView.Surface.on('click', function(){
        //         // debugger;
        //         var returnResult = listOption;
        //         that.closePopover();
        //         // if(that.params.passed.on_choose){
        //             // that.params.passed.on_choose(returnResult);
        //         // }
        //     });
        //     that.contentScrollView.Views.push(this.textView);

        // }

        // // Arbitrary buttons
        // if(this.modalOptions.details.buttons){

        //     _.each(this.modalOptions.details.buttons, function(buttonInfo){

        //         var buttonView = new View(); 
        //         buttonView.Surface = new Surface({
        //             size: [undefined, 60],
        //             content: '<div class="outward-button">' + buttonInfo.text + '</div>',
        //             classes: ['button-outwards-default']
        //         });
        //         buttonView.getSize = function(){
        //             return [undefined, 60];
        //         };
        //         buttonView.add(buttonView.Surface);
        //         buttonView.Surface.pipe(that.contentScrollView.SeqLayout);
        //         buttonView.Surface.on('click', function(){
                    
        //             that.closePopover();
        //             if(buttonInfo.success){
        //                 buttonInfo.success();
        //             }

        //         });
        //         that.contentScrollView.Views.push(buttonView.Surface);
        //     });

        // }

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
