/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ContainerSurface = require('famous/surfaces/ContainerSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Easing = require('famous/transitions/Easing');

    var Utility = require('famous/utilities/Utility');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Utils = require('utils');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var EventHandler = require('famous/core/EventHandler');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();
        this.createContent();

        var localFlag = 'add/things';
        Utils.CheckFlag(localFlag).then(function(){
            // popover
            that.launch_help_popover();
            // update flag
            Utils.PostFlag(localFlag, true);
        });
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header bar
        this.header = new StandardHeader({
            content: '',
            classes: ["normal-header"],
            // backClasses: ["normal-header"],
            backContent: false,
            // backContent: false,
            moreContent: false
        }); 
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.on('back', function(){
            // App.history.back();//.history.go(-1);
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];

        // link endpoints of layout to widgets

        // Add surfaces to content (buttons)
        this.addSettings();

        // Sequence
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);


        // var container = new ContainerSurface({
        //     size: [undefined, undefined],
        //     properties:{
        //         overflow:'hidden'
        //     }
        // })
        // container.add(this.contentScrollView)

        // Content bg
        // - for handling clicks
        this.contentBg = new Surface({
            size: [undefined, undefined],
            properties: {
                zIndex: "-1"
            }
        });
        this.contentBg.on('click', function(){
            App.history.back();//.history.go(-1);
        });

        // Content
        this.layout.content.StateModifier = new StateModifier({
            // origin: [0, 1],
            // size: [undefined, undefined]
        });
        this.layout.content.SizeModifier = new StateModifier({
            size: [undefined, undefined]
        });


        // Now add content
        this.layout.content.add(this.contentBg);
        this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(this.contentScrollView);
        // this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(container);


    };

    PageView.prototype.addSettings = function() {
        var that = this;

        var things = [
            {
                title: '+ Game Results',
                desc: 'Finished a game? Add the results for winner/loser or 1st/2nd/3d+!',
                href: 'game/add',
                tag: 'StartAddGame'
            },
            // {
            //     title: '+ Plan a Game',
            //     desc: "Get some people together and play! You are not <italic>required</italic> to enter results.",
            //     href: 'game/add',
            //     tag: 'StartAddGame'
            // },
            // {
            //     title: '+ Something Social',
            //     desc: 'Host a watch party, a result-less event, or something recreational.',
            //     href: 'game/add',
            //     tag: 'StartAddGame'
            // },
            {
                title: '+ Sport',
                desc: 'Create variations of existing sports, or entirely new games.',
                href: 'sport/add',
                tag: 'StartSportAdd'
            },
            
            {
                title: '+ Nemesis',
                desc: 'Connect with another player by sharing a special code.',
                href: 'player/add',
                tag: 'StartPlayerAdd'
            }
        ];

        things.forEach(function(thing){
            var surface = new View();
            surface.Surface = new Surface({
                content: '<div>'+thing.title+'</div><div>'+thing.desc+'</div>',
                size: [undefined, true],
                classes: ["add-thing-list-item-default"]
            });
            surface.StateModifier = new StateModifier();
            surface.Surface.Thing = thing;
            surface.Surface.pipe(that.contentScrollView);
            surface.Surface.on('click', function(){
                // alert('clicked!');
                // alert(this.Setting.href);
                if(this.Thing.tag){
                    App.history.modifyLast({tag: this.Thing.tag});
                }
                App.history.navigate(this.Thing.href, this.Thing.hrefOptions);
            });
            surface.getSize = function(){
                // console.log(surface.Surface.getSize(true));
                var theSize = surface.Surface.getSize(true);
                if(!theSize){
                    return;
                }
                return [undefined, theSize[1]];
            };
            surface.add(surface.StateModifier).add(surface.Surface);
            that.scrollSurfaces.push(surface);
        });

        // that.contentScrollView.sequenceFrom(that.scrollSurfaces);

    };

    PageView.prototype.launch_help_popover = function(){
        var that = this;

        App.Cache.HelpPopoverModal = {
            title: 'Add Different Things',
            body: "This is where you'll add Games, Sports, and Nemeses!", // could even pass a surface!?!?
            on_done: function(){
                App.history.navigate('random2',{history: false});
            }
        };
        // navigate
        App.history.navigate('modal/helppopover', {history: false});

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
                            
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide content down
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

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.layout.content.StateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        that.scrollSurfaces.forEach(function(surf, index){
                            surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        });

                        // Header
                        // - no extra delay
                        window.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring in button surfaces individually
                            that.scrollSurfaces.forEach(function(surf, index){
                                window.setTimeout(function(){
                                    surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                                        duration: 1500,
                                        curve: Easing.inOutElastic
                                    });
                                }, index * 50);
                            });

                            // // Bring map content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing);

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
