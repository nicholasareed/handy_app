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
    Credentials         = JSON.parse(require('text!credentials.json'));

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


        // // Events (background on_cancel)
        // this.contentView.BgSurface.on('click', function(){
        //     // close the popover, call on_cancel
        //     that.closePopover();
        //     if(that.params.passed.on_cancel){
        //         that.params.passed.on_cancel();
        //     }
        // });

        // // Content
        // this.layout.content.StateModifier = new StateModifier();
        // this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);

        // // Attach layout to the context
        // this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.backbuttonHandler = function(){
        // back button don't do shit!
        return false;
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
        // ModelIndex = this.contentScrollView.Views.length;

        // Add one big Welcome surface (for now)
        // - on click, go to Dash (a single Welcome screen)
        // - can revisit sometime?

        var optionSurface = new View(); 
        optionSurface.Surface = new Surface({
            size: [undefined, 40],
            content: "What's your full name?",
            classes: ['welcome-page-username-default']
        });
        optionSurface.getSize = function(){
            return [undefined, 40];
        };
        optionSurface.add(optionSurface.Surface);
        optionSurface.Surface.pipe(that.contentScrollView);
        optionSurface.Surface.on('click', function(){
            // // debugger;
            // var returnResult = listOption;
            // that.closePopover();
            // if(that.params.passed.on_choose){
            //     that.params.passed.on_choose(returnResult);
            // }
            // App.history.navigate('dash');
        });
        that.contentScrollView.Views.push(optionSurface);


        this.spacer1 = new Surface({
            size: [undefined, 10]
        });
        that.contentScrollView.Views.push(this.spacer1);

        this.inputFullnameSurface = new InputSurface({
            name: 'fullname',
            placeholder: ' ',
            type: 'text',
            size: [undefined, 50],
            value: '',
            classes: ['form-input-text-default'],
            properties: {
                textAlign: "center"
            }
        });
        if(App.Data.User.hasFetched){
            console.log('has fetched');
            this.inputFullnameSurface.setValue(App.Data.User.get('profile.name'));
        }
        that.contentScrollView.Views.push(this.inputFullnameSurface);

        this.spacer2 = new Surface({
            size: [undefined, 10]
        });
        that.contentScrollView.Views.push(this.spacer2);

        this.submitSurface = new Surface({
            size: [undefined,60],
            classes: [''],
            content: 'Next',
            classes: ['form-button-submit-default']
        });
        that.contentScrollView.Views.push(this.submitSurface);

        this.submitSurface.on('click', this.submit_form.bind(this)); 

        
        // _.each(this.modalOptions.list, function(listOption){

        //     var optionSurface = new View(); 
        //     optionSurface.Surface = new Surface({
        //         size: [undefined, 60],
        //         content: listOption.text,
        //         classes: ['modal-option-list-default']
        //     });
        //     optionSurface.add(optionSurface.Surface);
        //     optionSurface.Surface.pipe(that.contentScrollView);
        //     optionSurface.Surface.on('click', function(){
        //         // debugger;
        //         var returnResult = listOption;
        //         that.closePopover();
        //         if(that.params.passed.on_choose){
        //             that.params.passed.on_choose(returnResult);
        //         }
        //     });
        //     that.contentScrollView.Views.push(optionSurface);

        //     // that.playerScrollView.sequenceFrom(that.playerScrollSurfaces);
        // });

    };

    PageView.prototype.submit_form = function(){
        var that = this;

        if(that.checking === true){
            return;
        }
        that.checking = true;

        var fullname = $.trim(that.inputFullnameSurface.getValue());
        if(!fullname || fullname.length < 1){
            Utils.Notification.Toast('Invalid name');
            return;
        }

        that.submitSurface.setContent('...please wait...');

        // Get elements to save
        App.Data.User.save({
            profile_name: fullname
        },{
            patch: true,
            success: function(response){
                that.checking = false;

                // Erase the history of tags
                App.history.eraseUntilTag('all-them-tags');

                // Go home
                App.history.navigate('dash');
            }
        });

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
