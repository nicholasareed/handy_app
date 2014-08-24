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

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Utils = require('utils');
    var _ = require('underscore');

    // Models
    var PlayerModel = require('models/player');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        if(!App.Cache.OptionModal){
            window.location = '';
            return;
        }

        this.modalOptions = App.Cache.OptionModal;


        // Add to new ".passed" options, separate from this.options.App and other root-level arguments/objects
        this.params.passed = _.extend({
            title: 'Option Modal',
            back_to_default_hint: true
        }, this.modalOptions || {});

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();

        // Background
        this.BgSurface = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: "white"
            }
        });
        this.layout.content.add(this.BgSurface);

        // create the "select from" Player List scroller
        this.contentScrollView = new ScrollView();
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Add Surfaces
        this.addSurfaces();

        // Content
        this.layout.content.StateModifier = new StateModifier();
        var frontMod = new StateModifier({
            transform: Transform.inFront
        });
        this.layout.content.add(frontMod).add(this.layout.content.StateModifier).add(this.contentScrollView);

        // Attach layout to the context
        this.add(this.layout);


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

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

            if(that.params.passed.on_cancel){
                that.params.passed.on_cancel();
            }
        });
        this.header.navBar.title.on('click', function(){
            // App.history.back();
            // console.log(that.params.passed);
            // debugger;

            // if(that.params.passed.on_cancel){
            that.params.passed.on_cancel();
            // debugger;
            // }
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

        _.each(this.modalOptions.list, function(listOption){

            var optionSurface = new View(); 
            optionSurface.Surface = new Surface({
                size: [undefined, 60],
                content: listOption.text,
                classes: ['modal-option-list-default']
            });
            optionSurface.add(optionSurface.Surface);
            optionSurface.Surface.pipe(that.contentScrollView);
            optionSurface.Surface.on('click', function(){
                // debugger;
                var returnResult = listOption;
                if(that.params.passed.on_choose){
                    that.params.passed.on_choose(returnResult);
                }
            });
            that.contentScrollView.Views.push(optionSurface);

            // that.playerScrollView.sequenceFrom(that.playerScrollSurfaces);
        });

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

                            // Bring content back
                            that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.inTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    window.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:
                        return transitionOptions;
                        
                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.layout.content.StateModifier.setOpacity(0);
                        that.layout.content.StateModifier.setTransform(Transform.translate(0, 0, 0));

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);
                            that.layout.content.StateModifier.setOpacity(1, transitionOptions.inTransition);

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
