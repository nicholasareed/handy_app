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

    // Models
    var SportModel = require('models/sport');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // Add to new ".passed" params, separate from this.params.App and other root-level arguments/objects
        this.params.passed = _.extend({
            title: 'Win/Lose/Tie?',
            back_to_default_hint: true
        }, App.Cache.ResultOptions || {});

        // Create according to the model's "result_type"
        this.model = this.params.App.Cache.ResultOptions.sport;

        
        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();

        // create the "select from" Sport List scroller
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Add W/L/T button views

        // Win
        this.winButton = new View();
        this.winButton.Surface = new Surface({
            size: [undefined, 60],
            content: 'Won',
            classes: ['form-button-submit-default', 'won-next-button-default']
        });
        this.winButton.add(this.winButton.Surface);
        this.winButton.Surface.pipe(that.contentScrollView);
        this.winButton.Surface.on('click', function(){
            if(that.params.passed.on_choose){
                that.params.passed.on_choose('win');
            }
        });
        this.contentScrollView.Views.push(this.winButton);

        // Lose
        this.loseButton = new View();
        this.loseButton.Surface = new Surface({
            size: [undefined, 60],
            content: 'Lost',
            classes: ['form-button-submit-default', 'lost-next-button-default']
        });
        this.loseButton.add(this.loseButton.Surface);
        this.loseButton.Surface.pipe(that.contentScrollView);
        this.loseButton.Surface.on('click', function(){
            if(that.params.passed.on_choose){
                that.params.passed.on_choose('lose');
            }
        });
        this.contentScrollView.Views.push(this.loseButton);

        // Tie
        this.tieButton = new View();
        this.tieButton.Surface = new Surface({
            size: [undefined, 60],
            content: 'Tied',
            classes: ['form-button-submit-default', 'tied-next-button-default']
        });
        this.tieButton.add(this.tieButton.Surface);
        this.tieButton.Surface.pipe(that.contentScrollView);
        this.tieButton.Surface.on('click', function(){
            if(that.params.passed.on_choose){
                that.params.passed.on_choose('tie');
            }
        });
        this.contentScrollView.Views.push(this.tieButton);

        // Content
        this.layout.content.StateModifier = new StateModifier();
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);

        // Attach layout to the context
        this.add(this.layout);


    };

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
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

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

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth, 0, 0));

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring content back
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

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
