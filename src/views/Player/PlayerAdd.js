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

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Models

        // User
        this.model = new UserModel.User();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();

        this.add(this.layout);
    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        this.header = new StandardHeader({
            content: "Signup",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();//.history.go(-1);
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(that.header, args);
        })

        this.layout.header.add(this.header);
    };

    PageView.prototype.createContent = function(){
        var that = this;

        // create the scrollView of content
        this.contentScrollView = new SequentialLayout(); //(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Add surfaces
        this.addSurfaces();
        
        // Content
        this.layout.content.StateModifier = new StateModifier();
        this.contentView = new View();
        this.contentView.SizeMod = new Modifier({
            size: //[window.innerWidth - 50, true]
                function(){
                    var tmpSize = that.contentScrollView.getSize(true);
                    if(!tmpSize){
                        return [window.innerWidth, undefined];
                    }
                    return [window.innerWidth - 16, tmpSize[1]];
                }
        });
        this.contentView.OriginMod = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.contentView.add(this.contentView.OriginMod).add(this.contentView.SizeMod).add(this.contentScrollView);
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentView);

    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView

        // Name
        this.inputNameSurface = new InputSurface({
            name: 'name',
            placeholder: 'Your Name',
            type: 'text',
            size: [undefined, 50],
            value: ''
        });
        this.contentScrollView.Views.push(this.inputNameSurface);

        // Spacer
        this.contentScrollView.Views.push(new Surface({
            size: [undefined, 4]
        }));

        // Submit button
        this.submitButtonSurface = new Surface({
            size: [undefined,60],
            classes: ['form-button-submit-default'],
            content: 'Create Offline Nemesis'
        });
        this.contentScrollView.Views.push(this.submitButtonSurface);

        // Events for surfaces
        this.submitButtonSurface.on('click', this.save_player.bind(this));

    };

    PageView.prototype.save_player = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;

        // validate name
        var name = $.trim(this.inputNameSurface.getValue().toString());
        if(name.length === 0){
            return;
        }

        // Disable submit button
        this.submitButtonSurface.setContent('Please wait...');

        // Get elements to save
        this.model.set({
            name: name
        });

        this.model.save()
            .then(function(newModel){
                
                // Disable submit button
                this.submitButtonSurface.setContent('Create Offline Nemesis');

                // Clear player cache
                // - todo...

                // Redirect to the new user
                // that.$('.back-button').trigger('click');
                App.history.eraseUntilTag('StartPlayerAdd');
                App.history.navigate('player/' + newModel._id);
                

            });

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

                        // Content
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.inTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // window.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default position
                        that.layout.content.StateModifier.setOpacity(0);

                        // Content
                        window.setTimeout(function(){

                            // Bring content back
                            that.layout.content.StateModifier.setOpacity(1, transitionOptions.inTransition);

                        }, delayShowing +transitionOptions.outTransition.duration);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };




    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50]
        },
        footer: {
            size: [undefined, 0]
        },
        content: {
            size: [undefined, undefined]
        }
    };

    module.exports = PageView;

});
