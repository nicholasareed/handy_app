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


        // Background

        this.contentView = new View();
        this.contentView.BgSurface = new Surface({
            content: '',
            size: [undefined, undefined],
            properties: {
                backgroundColor: 'white'
            }
        });
        this.contentView.BgOpacityMod = new StateModifier({
            opacity: 0.5
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
            size: [window.innerWidth - 80, true]
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

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.backbuttonHandler = function(){
        // back button don't do shit!
        return false;
    };

    PageView.prototype.addSurfaces = function() { 
        var that = this;
        // ModelIndex = this.contentScrollView.Views.length;

        // Add one big Welcome surface (for now)
        // - on click, go to Dash (a single Welcome screen)
        // - can revisit sometime?

        var optionSurface = new View(); 
        optionSurface.Surface = new Surface({
            size: [undefined, 180],
            content: '<div>Welcome</div> <div>to</div> <div>handy!</div><div><i class="icon ion-play"></i></div>',
            classes: ['welcome-page-default']
        });
        optionSurface.getSize = function(){
            return [undefined, 180];
        };
        optionSurface.add(optionSurface.Surface);
        optionSurface.Surface.pipe(that.contentScrollView);
        optionSurface.Surface.on('click', function(){
            // App.history.navigate('welcome/fullname',{history: false});
            App.history.navigate('profile/edit',{history: false});
        });
        that.contentScrollView.Views.push(optionSurface);

    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
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

                transitionOptions.inTransform = Transform.identity;


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
