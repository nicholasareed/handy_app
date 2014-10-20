/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ContainerSurface = require('famous/surfaces/ContainerSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    var StandardToggleButton = require('views/common/StandardToggleButton');

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
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header bar
        this.header = new StandardHeader({
            content: 'Settings',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // backContent: false,
            moreContent: false,
            // moreContent: 'more',
            // moreClasses: ["normal-header"],
        }); 
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.on('back', function(){
            App.history.back();
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        this.layout.header.add(Utils.usePlane('header')).add(this.header);

    };

    // PageView.prototype.createHeader = function(){
    //     var that = this;

    //     // create the header bar
    //     this.header = new StandardHeader({
    //         content: 'Settings',
    //         classes: ["normal-header"],
    //         backClasses: ["normal-header"],
    //         // backContent: false,
    //         // moreContent: false,
    //         // moreContent: 'more',
    //         moreClasses: ["normal-header"],
    //     }); 
    //     this.header.navBar.title.on('click', function(){
    //         App.history.back();
    //     });
    //     this.header.on('back', function(){
    //         App.history.back();//.history.go(-1);
    //     });
    //     this._eventOutput.on('inOutTransition', function(args){
    //         this.header.inOutTransition.apply(this.header, args);
    //     })

    //     this.layout.header.add(this.header);

    // };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView();
        this.contentScrollView.Views = [];

        // link endpoints of layout to widgets

        // Add surfaces to content (buttons)
        this.addSettings();

        // Sequence
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // // Content bg
        // // - for handling clicks
        // this.contentBg = new Surface({
        //     size: [undefined, undefined],
        //     properties: {
        //         background: 'red'
        //     }
        // });
        // this.contentBg.on('click', function(){
        //     // App.history.back();
        // });

        // Content
        this.layout.content.StateModifier = new StateModifier({
            // origin: [0, 1],
            // size: [undefined, undefined]
        });
        this.layout.content.SizeModifier = new StateModifier({
            size: [undefined, undefined]
        });


        // Now add content
        // this.layout.content.add(Utils.usePlane('content',-1)).add(this.contentBg);
        this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(Utils.usePlane('content')).add(this.contentScrollView);
        // this.layout.content.add(this.layout.content.SizeModifier).add(this.layout.content.StateModifier).add(container);


    };

    PageView.prototype.addSettings = function() {
        var that = this;

        var settings = [

            {
                title: 'Edit Profile',
                desc: 'You, yourself, and...yours?',
                href: 'profile/edit'
            },

            {
                title: 'Payments',
                desc: 'Manage cards and bank accounts',
                href: 'payment_source/list'
            },

            {
                title: 'Push Notifications',
                desc: 'Finer control',
                href: 'settings/push'
            },

            {
                title: 'Feedback ('+App.ConfigImportant.Version+')',
                desc: 'Tell us how to improve!' + ' v' + App.ConfigImportant.Version,
                href: 'feedback/settings'
            },

            // {
            //     title: 'My Cars',
            //     desc: 'Model and related details',
            //     href: 'settings/cars'
            // },
            // {
            //     title: 'Drivers',
            //     desc: 'View and edit',
            //     href: 'drivers'
            // },

            // {
            //     title: 'Account and Perks',
            //     desc: '$$ in your pocket',
            //     href: 'perks'
            // },
            
            {
                title: 'Logout and Exit',
                desc: 'Buh-bye',
                href: 'logout'
            }
        ];

        settings.forEach(function(setting){

            switch(setting.type){

                case 'toggle': 
                    that.createToggleSwitch(setting);
                    break;

                default:
                    that.createNormal(setting);
                    break;

            }

        });

    };

    PageView.prototype.createNormal = function(setting){
        var that = this;
        
        var classes = ["settings-list-item"];
        if(setting.classes){
            classes = setting.classes;
        }
        var surface = new Surface({
            content: '<div>'+setting.title+'</div>', //<div>'+setting.desc+'</div>',
            size: [undefined, 60],
            classes: classes
        });
        surface.Setting = setting;
        surface.pipe(that.contentScrollView);
        surface.on('click', function(){
            if(this.Setting.href){
                App.history.navigate(this.Setting.href, this.Setting.hrefOptions);
            }
        });
        if(setting.on_create){
            setting.on_create(surface);
        }
        that.contentScrollView.Views.push(surface);

    };

    PageView.prototype.createToggleSwitch = function(setting){
        var that = this;

        // Normal list item
        var pushOpt = new View();

        // that.model_views.push({
        //     scheme_key: Info.scheme_key,
        //     view: pushOpt
        // });

        pushOpt.Layout = new FlexibleLayout({
            ratios: [1, true, true]
        });
        // pushOpt.Layout.Views = [];

        pushOpt.Left = new Surface({
            content: '<div>' + setting.text + '</div>',
            size: [undefined, true],
            classes: ['settings-list-item']
        });
        pushOpt.Left.on('click', function(){
            if(pushOpt.Toggle.isSelected()){
                pushOpt.Toggle.deselect();
            } else {
                pushOpt.Toggle.select();
            }
        });
        pushOpt.Left.pipe(that.contentScrollView);

        pushOpt.Toggle = new StandardToggleButton({
            size: [40, 40],
            content: '',
            classes: ['text-center'],
            onClasses: ['push-toggle', 'circle-toggle', 'toggle-on'],
            offClasses: ['push-toggle', 'circle-toggle', 'toggle-off'],

            // NOT for setting the default toggle state of the button
            toggleMode: StandardToggleButton.TOGGLE
        });
        pushOpt.Toggle.pipe(that.contentScrollView);

        // Handle toggle button click
        pushOpt.Toggle.on('select', setting.on_select); 

        // function(m){
        //     console.log('select, saving');
        //     if(that.model.get('scheme.' + Info.scheme_key) !== true){
        //         var data = {};
        //         data['scheme.' + Info.scheme_key] = true;
        //         that.model.save(data,{patch: true});
        //     }
        // });
        pushOpt.Toggle.on('deselect', setting.on_deselect); 

        // function(){
        //     console.log('deselect, saving');
        //     if(that.model.get('scheme.' + Info.scheme_key) !== false){
        //         var data = {};
        //         data['scheme.' + Info.scheme_key] = false;
        //         that.model.save(data,{patch: true});
        //     }
        // });

        pushOpt.getSize = function(){
            return [undefined, 60]; //pushOpt.Left._size ? pushOpt.Left._size[1]:undefined];
        };

        pushOpt.Right = new Surface({
            content: '',
            size: [10,10]
        });
        pushOpt.Right.getSize = function(){
            return [10, 10];
        };

        pushOpt.Layout.sequenceFrom([
            pushOpt.Left,
            pushOpt.Toggle,
            pushOpt.Right
        ]);

        pushOpt.add(pushOpt.Layout);

        // Toggle to the correct state 
        // - above doesn't work?
        var val = setting.default; //that.model.get('scheme.' + Info.scheme_key);
        if(val){
            pushOpt.Toggle.select(false) 
        } else {
            pushOpt.Toggle.deselect(false) 
        }

        that.contentScrollView.Views.push(pushOpt);

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
                        Timer.setTimeout(function(){
                            
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide content down
                            that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // Timer.setTimeout(that.refreshData.bind(that), 1000);
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
                        that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1, 0, 0));


                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            // Bring map content back
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);

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
