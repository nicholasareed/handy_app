define(function(require, exports, module) {
    var Surface            = require('famous/core/Surface');
    var RenderNode         = require('famous/core/RenderNode');
    var Modifier           = require('famous/core/Modifier');
    var StateModifier      = require('famous/modifiers/StateModifier');
    var Transform          = require('famous/core/Transform');
    var View               = require('famous/core/View');
    var ScrollView         = require('famous/views/Scrollview');

    var Timer         = require('famous/utilities/Timer');

    var Utils = require('utils');
    
    var NavigationBar = require('famous/widgets/NavigationBar');
    var StandardNavigationBar = require('views/common/StandardNavigationBar');

    function StandardHeader(options) {
        View.apply(this, arguments);
        
        this.OpacityModifier = new StateModifier({
            opacity: 1
        });
        this.PositionModifier = new StateModifier({
            // opacity: 1
        });

        // create the header's bg
        this.background = new Surface({
            size: [undefined, undefined],
            classes: options.bgClasses || ['header-bg-default']
        });

        this.navBar = new StandardNavigationBar(options); 
        this.navBar.pipe(this._eventOutput);

        // add to tree
        this.HeaderNode = new RenderNode();
        this.HeaderNode.add(Utils.usePlane('header')).add(this.background);
        // this.HeaderNode.add(new StateModifier({transform: Transform.translate(0,0,1.0)})).add(this.OpacityModifier).add(this.PositionModifier).add(this.navBar);
        this.HeaderNode.add(Utils.usePlane('header',1)).add(this.navBar);

        this.add(this.HeaderNode);

    }

    StandardHeader.prototype = Object.create(View.prototype);
    StandardHeader.prototype.constructor = StandardHeader;


    StandardHeader.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:

                        that.OpacityModifier.setOpacity(1);

                        that.navBar.title.PositionModifier.setTransform(Transform.translate(0,0,0));

                        // Hide/move elements
                        Timer.setTimeout(function(){
                            // Fade header
                            // - using PositionModifier of navBar.title
                            if(goingBack){
                                // fade out and move
                                that.OpacityModifier.setOpacity(0, {
                                    duration: transitionOptions.outTransition.duration / 2,
                                    curve: 'easeIn'
                                });
                                that.navBar.title.OpacityModifier.setOpacity(0,{
                                    duration: transitionOptions.outTransition.duration,
                                    curve: 'easeIn'
                                });
                                that.navBar.title.PositionModifier.setTransform(Transform.translate(window.innerWidth / 2,0,0), {
                                    duration: transitionOptions.outTransition.duration,
                                    curve: 'easeIn'
                                });
                            } else {
                                that.OpacityModifier.setOpacity(0, transitionOptions.outTransition);
                                that.navBar.title.OpacityModifier.setOpacity(0,{
                                    duration: transitionOptions.outTransition.duration,
                                    curve: 'easeIn'
                                });
                            }

                            that.navBar.back.OpacityModifier.setOpacity(0,{
                                duration: transitionOptions.outTransition.duration,
                                curve: 'easeIn'
                            });
                            that.navBar.back.PositionModifier.setTransform(Transform.translate(-200,0,0), {
                                duration: transitionOptions.outTransition.duration,
                                curve: 'easeIn'
                            });


                            // Icons
                            if(that.navBar._moreSurfaces){
                                that.navBar._moreSurfaces.forEach(function(tmpView, index){
                                    Timer.setTimeout(function(){
                                        tmpView.Mod.setOpacity(0, {
                                            duration: transitionOptions.outTransition.duration,
                                            curve: 'easeOut'
                                        });
                                        tmpView.Mod.setTransform(Transform.translate(0,-100,0), {
                                            duration: transitionOptions.outTransition.duration,
                                            curve: 'easeOut'
                                        });
                                    }, index * 100);
                                });
                            }

                        }, delayShowing);

                        break;

                }

                break;
            case 'showing':
                switch(otherViewName){

                    default:

                        // Default header opacity
                        
                        that.OpacityModifier.setOpacity(0);
                        that.navBar.title.OpacityModifier.setOpacity(0);
                        that.navBar.title.PositionModifier.setTransform(Transform.translate(0,0,0));

                        that.navBar.back.OpacityModifier.setOpacity(0);
                        that.navBar.back.PositionModifier.setTransform(Transform.translate(-80,0,0));

                        // Change header opacity
                        if(goingBack){
                            // // fade out and move
                            // that.PositionModifier.setTransform(Transform.translate(0,0,0));
                        } else {

                            if(that.navBar.title.initialTranslate){
                                that.navBar.title.PositionModifier.setTransform(that.navBar.title.initialTranslate);
                            } else {
                                that.navBar.title.PositionModifier.setTransform(Transform.translate(window.innerWidth / 4,0,0));
                            }
                        }

                        // // Icons (starting hidden)
                        // if(that.navBar._moreSurfaces){
                        //     that.navBar._moreSurfaces.forEach(function(tmpView){
                        //         tmpView.Mod.setTransform(Transform.translate(0,-100,0));
                        //     });
                        // }


                        // Header
                        // - no extra delay
                        Timer.setTimeout(function(){

                            // Change header opacity
                            if(goingBack){
                                // fade out and move
                                that.navBar.title.OpacityModifier.setOpacity(1, {
                                    duration: transitionOptions.outTransition.duration / 2,
                                    curve: 'easeIn'
                                });
                            } else {
                                console.log(that.OpacityModifier.getOpacity());
                                // debugger;
                                // that.navBar.title.OpacityModifier.setOpacity(0);
                                // that.OpacityModifier.setOpacity(1, transitionOptions.outTransition);
                                that.navBar.title.OpacityModifier.setOpacity(1,{
                                    duration: transitionOptions.outTransition.duration,
                                    curve: 'easeIn'
                                });
                                that.navBar.title.PositionModifier.setTransform(Transform.translate(0,0,0), {
                                    duration: transitionOptions.outTransition.duration,
                                    curve: 'easeOut'
                                });

                            }

                            that.navBar.back.OpacityModifier.setOpacity(1,{
                                duration: transitionOptions.outTransition.duration,
                                curve: 'easeIn'
                            });
                            that.navBar.back.PositionModifier.setTransform(Transform.translate(0,0,0), {
                                duration: transitionOptions.outTransition.duration,
                                curve: 'easeIn'
                            });

                            // Icons (starting hidden)
                            if(that.navBar._moreSurfaces){
                                that.navBar._moreSurfaces.forEach(function(tmpView, index){
                                    Timer.setTimeout(function(){
                                        tmpView.Mod.setOpacity(1, {
                                            duration: transitionOptions.outTransition.duration,
                                            curve: 'easeOut'
                                        });
                                        tmpView.Mod.setTransform(Transform.translate(0,0,0), {
                                            duration: transitionOptions.outTransition.duration,
                                            curve: 'easeOut'
                                        });
                                    },index*100);
                                });
                            }



                        }, delayShowing);


                        console.log(transitionOptions);
                        // debugger;



                        // // Default header opacity
                        // that.OpacityModifier.setOpacity(0);
                        // console.log(that.OpacityModifier);
                        // debugger;

                        // // // Header
                        // // // - no extra delay
                        // // Timer.setTimeout(function(){

                        // //     // Change header opacity
                        // //     that.OpacityModifier.setOpacity(0, transitionOptions.outTransition);
                        // //     console.log(that.OpacityModifier);
                        // //     // that.OpacityModifier.setOpacity(1, 
                        // //     //     { duration: 3000, curve: "linear" }
                        // //     // );
                        // //     // console.log(delayShowing);
                        // //     // debugger;

                        // // }, delayShowing);


                        break;
                }
                break;
            default:
                console.error('NOT SHOWING OR HIDING');
                console.log(arguments);
                console.log(direction);
                debugger;
        }

        return transitionOptions;
    };


    StandardHeader.DEFAULT_OPTIONS = {
    };

    module.exports = StandardHeader;
});
