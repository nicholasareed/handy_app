/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Model
        this.model = App.Data.User;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();
        
        // Attach to render tree
        this.add(this.layout);

        // // Fetch
        // this.model.fetch({prefill: true});

        // Wait for model to get populated, then add the input surfaces
        // - model should be ready immediately!
        this.model.populated().then(this.addSurfaces.bind(this));


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: "",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];

        // link endpoints of layout to widgets

        // Sequence
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView

        // surface 1
        this.surface1 = new Surface({
            content: 'Current Position',
            size: [undefined, true],
            classes: ['waiting-list-top-default']
        });
        this.surface1.View = new View();
        this.surface1.View.getSize = function(){
            return that.surface1.getSize(true);
        };
        this.surface1.View.StateModifier = new StateModifier();
        this.surface1.View.add(this.surface1.View.StateModifier).add(this.surface1);
        this.scrollSurfaces.push(this.surface1.View);

        // surface 2
        this.surface2 = new Surface({
            content: '',
            size: [undefined, 200],
            classes: ['waiting-list-position-default']
        });
        this.surface2.View = new View();
        this.surface2.View.getSize = function(){
            return that.surface2.getSize(true);
        };
        this.surface2.View.StateModifier = new StateModifier();
        this.surface2.View.add(this.surface2.View.StateModifier).add(this.surface2);
        this.scrollSurfaces.push(this.surface2.View);

        this.model.populated().then(function(){
            that.update_position();
            that.model.on('change', that.update_position.bind(that));
        });

        // this.submitButtonSurface = new Surface({
        //     size: [undefined,40],
        //     classes: ['button-surface'],
        //     content: 'Save Profile',
        //     properties: {
        //         lineHeight : "20px"
        //     }
        // });
        // this.submitButtonSurface.View = new View();
        // this.submitButtonSurface.View.StateModifier = new StateModifier();
        // this.submitButtonSurface.View.add(this.submitButtonSurface.View.StateModifier).add(this.submitButtonSurface);
        // this.scrollSurfaces.push(this.submitButtonSurface.View);

        // // Events for surfaces
        // this.submitButtonSurface.on('click', this.save_driver.bind(this));


    };

    PageView.prototype.update_position = function(){
        var that = this;

        this.surface2.setContent(this.model.get('position') || 0);

    };

    PageView.prototype.refreshData = function(ev){
        var that = this;

        this.model.fetch();

        return false;
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

                            // Slide content left
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

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        that.scrollSurfaces.forEach(function(surf, index){
                            surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        });

                        // Content
                        // - extra delay for other content to be gone
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring in button surfaces individually
                            that.scrollSurfaces.forEach(function(surf, index){
                                window.setTimeout(function(){
                                    surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                                        duration: 1500,
                                        curve: Easing.inOutElastic
                                    });
                                }, index * 50);
                            });

                        }, delayShowing); // + transitionOptions.outTransition.duration);

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
