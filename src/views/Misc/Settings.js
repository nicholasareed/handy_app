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

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

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
            // moreContent: false,
            // moreContent: 'more',
            moreClasses: ["normal-header"],
        }); 
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.on('back', function(){
            App.history.back();//.history.go(-1);
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        this.layout.header.add(this.header);

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

        var settings = [

            // {
            //     title: 'Welcome',
            //     desc: 'run it back',
            //     href: 'welcome'
            // },

            {
                title: '<i class="ion-android-friends"></i> Friends', // (' + friend_count + ')',
                desc: 'Invite new people',
                href: 'friend/list'
            },
            
            {
                title: '<i class="ion-ios7-plus-outline"></i> Add Friend', // (' + friend_count + ')',
                desc: 'Choose from contacts',
                href: 'friend/add'
            },

            {
                title: '<i class="ion-edit"></i> Edit Your Profile',
                desc: 'Change your display name',
                href: 'profile/edit'
            },

            {
                title: '<i class="ion-ios7-help-outline"></i> How does it work?',
                desc: 'Shoot, we hoped it was clear. our fault.',
                href: 'misc/help'
            },

            {
                title: '<i class="ion-alert"></i> Push Notifications',
                desc: 'Finer control',
                href: 'settings/push'
            },

            {
                title: '<i class="ion-ios7-email-outline"></i> Feedback / Contact',
                desc: 'Please tell us how to improve!' + ' v' + App.ConfigImportant.Version,
                href: 'feedback/settings'
            },
            
            {
                title: '<i class="ion-log-out"></i> Logout',
                desc: 'Buh-bye',
                href: 'logout',
                hrefOptions: {
                    history: false
                }
            }
        ];

        var friend_count = 0;

        // settings.unshift({
        //     title: 'Friends', // (' + friend_count + ')',
        //     desc: 'Invite new people',
        //     href: 'friend/list'
        // });

        // Get "Friends" count that are waiting on you

        settings.forEach(function(setting){
            var surface = new Surface({
                content: '<div>'+setting.title+'</div>', //<div>'+setting.desc+'</div>',
                size: [undefined, 60],
                classes: ["settings-list-item"],
                properties: {
                    lineHeight: '20px',
                    padding: '5px',
                    paddingTop: '20px',
                    borderBottom: '1px solid #ddd',
                    backgroundColor: "white"
                }
            });
            surface.Setting = setting;
            surface.pipe(that.contentScrollView);
            surface.on('click', function(){
                // alert('clicked!');
                // alert(this.Setting.href);
                App.history.navigate(this.Setting.href, this.Setting.hrefOptions);
            });
            that.scrollSurfaces.push(surface);
        });

        // that.contentScrollView.sequenceFrom(that.scrollSurfaces);

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
                        that.layout.content.StateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));


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
