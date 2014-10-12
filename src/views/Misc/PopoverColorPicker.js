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

    var CanvasSurface    = require("famous/surfaces/CanvasSurface");
    var ContainerSurface    = require("famous/surfaces/ContainerSurface");

    // Mouse/touch
    var GenericSync = require('famous/inputs/GenericSync');
    var MouseSync = require('famous/inputs/MouseSync');
    var TouchSync = require('famous/inputs/TouchSync');
    GenericSync.register({'mouse': MouseSync, 'touch': TouchSync});

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var Easing = require('famous/transitions/Easing');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var BoxLayout = require('famous-boxlayout');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Utils = require('utils');
    var _ = require('underscore');
    var $ = require('jquery');
    var tinycolor = require('lib2/tinycolor');

    // Models
    // var PlayerModel = require('models/player');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        if(!App.Cache.ColorPickerOptions){
            window.location = '';
            return;
        }

        this.modalOptions = App.Cache.ColorPickerOptions;

        // Expecting there to be a max of about 10 modal options
        // - params.title is optional

        // Add to new ".passed" options, separate from this.options.App and other root-level arguments/objects
        this.params.passed = _.extend({
            color: '#0f0f0f'
        }, this.modalOptions || {});

        this.chosen_color = this.params.passed.color;

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

        // Add Surfaces
        this.addSurfaces();

        this.contentScrollView.SeqLayout.sequenceFrom(this.contentScrollView.Views);

        // add sizing and everything
        this.contentScrollView.add(this.contentScrollView.OriginMod).add(this.contentScrollView.SizeMod).add(this.contentScrollView.SeqLayout);

        // show the content in the lightbox
        // this.lightbox.show(this.contentScrollView);
        this.contentView.add(this.contentScrollView.PositionMod).add(Utils.usePlane('popover',10)).add(this.contentScrollView);
        this.add(this.contentView);


        // Events (background on_cancel)
        this.contentView.BgSurface.on('click', function(){
            // close the popover, call on_cancel
            that.closePopover();
            if(that.params.passed.on_cancel){
                that.params.passed.on_cancel();
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

            def.resolve(); // 
            App.Views.Popover.hide(); // actually hide the popover

        }, delay);

        return def.promise();
    };

    PageView.prototype.addSurfaces = function() { 
        var that = this;


        this.addColorPicker();

        this.addColorPicked();


    };

    PageView.prototype.addColorPicker = function() { 
        var that = this;

        this.colorCanvas = new CanvasSurface({
            canvasSize: [300, 300]
        });


        // // create canvas and context objects
        // var canvas = document.getElementById('picker');
        this.colorCanvas.on('deploy', function(){
            // debugger;
        });

        var ctx = this.colorCanvas.getContext('2d');

        // drawing active image
        var image = new Image();
        image.onload = function () {
            // console.log(image);
            // ctx.drawImage(image, 0, 0); // draw the image on the canvas
            this.loaded = true;
            ctx.drawImage(image, 10, 10); // draw the image on the canvas
        }
        // image.src = 'https://dl.dropboxusercontent.com/u/6673634/colorwheel3.png';
        var image_src = 'https://dl.dropboxusercontent.com/u/6673634/colorwheel3.png';
        image_src = 'img/colorwheel3.png';
        image.src = 'img/colorwheel3.png';

        // this.colorCanvas.render = function render() {
            
        //     // console.log('render canvas');
        //     var ctx = this.getContext('2d');

        //     // // drawing active image
        //     // var image = new Image();
        //     // image.onload = function () {
        //     //     ctx.drawImage(image, 0, 0); // draw the image on the canvas
        //     // }
        //     // image.src = 'https://dl.dropboxusercontent.com/u/6673634/colorwheel3.png';

        //     // if(image.loaded){
        //     //     ctx.drawImage(image, 10, 10); // draw the image on the canvas
        //     // }

        //     return this.id;
        // };

        // Create Image for the user to click on
        this.imageSurface = new Surface({
            content: '<img src="'+image_src+'" />',
            size: [300, 300]
        });
        this.imageSurface.View = new ContainerSurface({
            size: [300,300]
        });
        this.imageSurface.View.add(this.imageSurface);
        
        this.imageSurface.sync = new GenericSync(['mouse', 'touch']);
        this.imageSurface.pipe(this.imageSurface.sync);

        var updateSurface = function(e){
            console.log(e.clientX,e.clientY);
            console.log(that.imageSurface._element);

            //Convert the mouse position to a Point
            var mousePoint = new WebKitPoint(e.clientX, e.clientY)

            //Convert the mouse point into node coordinates using WebKit
            var nodeCoords = webkitConvertPointFromPageToNode(that.imageSurface._element, mousePoint)

            // var offsets = recursiveOffsetLeftAndTop(that.imageSurface._element);
            console.log(nodeCoords.x, nodeCoords.y);

            // get current pixel
            var imageData = ctx.getImageData(nodeCoords.x, nodeCoords.y, 1, 1);
            var pixel = imageData.data;

            // update preview color
            var pixelColor = "rgb("+pixel[0]+", "+pixel[1]+", "+pixel[2]+")";
            
            that.chosenColorSurface.setProperties({
                background: pixelColor,
                color: tinycolor.mostReadable(pixelColor, ["#000", "#fff"]).toHexString()
            });

            that.chosen_color = tinycolor(pixelColor).toHexString();
        };

        this.imageSurface.sync.on('update', updateSurface);
        this.imageSurface.sync.on('end', updateSurface);

        this.contentScrollView.Views.push(this.imageSurface);

        // // Create gradient
        // var grd = ctx.createRadialGradient(75,50,5,90,60,100);
        // grd.addColorStop(0,"red");
        // grd.addColorStop(1,"white");

        // // Fill with gradient
        // ctx.fillStyle = grd;
        // ctx.fillRect(10,10,150,80);

        // that.contentScrollView.Views.push(this.colorCanvas);

    };

    PageView.prototype.addColorPicked = function() { 
        var that = this;

        this.chosenColorSurface = new Surface({
            content: 'Ready',
            size: [undefined, 40],
            classes: ['color-picker-ready-default'],
            properties: {
                background: this.params.passed.color,
                color: tinycolor.mostReadable(this.params.color, ["#000", "#fff"]).toHexString()
            }
        });
        this.chosenColorSurface.on('click', function(){
            that.closePopover();
            if(that.params.passed.on_done){
                that.params.passed.on_done(that.chosen_color);
            }
        });

        // Build Margins
        var boxLayout = new BoxLayout({ 
            margins: [10] 
        });
        boxLayout.middleAdd(this.chosenColorSurface);

        this.contentScrollView.Views.push(boxLayout);

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

                that.contentScrollView.PositionMod.setTransform(Transform.translate(0,window.innerHeight,0),{
                    duration: 450,
                    curve: 'easeOut'
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
                    curve: 'easeIn'
                });
                that.contentScrollView.ScaleMod.setTransform(Transform.scale(1,1,1),{
                    duration: 450,
                    curve: 'easeIn'
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
