/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var RenderController = require('famous/views/RenderController');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var TabBar = require('famous/widgets/TabBar');

    var Utility = require('famous/utilities/Utility');

    // Helpers
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    var Handlebars = require('lib2/handlebars-helpers');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Subviews
    var StandardHeader = require('views/common/StandardHeader');

    // Subviews
    var YouView      = require('./YouSubview');
    var NemesesView      = require('./NemesesSubview');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // // Side menu of options
    // var GameMenuView      = require('views/Game/GameMenu');

    // // Models
    // var GameModel = require('models/game');
    // var PlayerModel = require('models/player');
    // var MediaModel = require('models/media');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });
        this.createHeader();
        this.createContent();

        // // temp surface
        // this.contentView = new View();
        // this.contentView.OriginMod = new StateModifier({
        //     origin: [0, 0.5]
        // });
        // this.contentView.Surface = new Surface({
        //     content: '<i class="icon ion-android-note"></i><div>Coming Soon!</div>',
        //     size: [undefined, 80],
        //     classes: ['explore-surface-temp'],
        //     properties: {
        //         fontSize: '42px',
        //         textAlign: 'center'
        //     }
        // });
        // this.contentView.add(this.contentView.OriginMod).add(this.contentView.Surface);

        // this.layout.content.add(this.contentView);
        this.add(this.layout);


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: "News",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            backContent: false,
            moreClasses: ["normal-header"],
            moreContent: false //'<span class="icon ion-navicon-round"></span>'
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click',function(){
            that.refreshData();
        });
        this.header._eventOutput.on('more',function(){
            // if(that.model.get('CarPermission.coowner')){
            //     App.history.navigate('car/permission/' + that.model.get('_id'), {trigger: true});
            // }
            that.menuToggle();
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };
    
    PageView.prototype.createContent = function(){
        var that = this;

        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView = new FlexibleLayout({
            direction: FlexibleLayout.DIRECTION_Y,
            ratios: [true, 1]
        });
        this.contentScrollView.Views = [];

        // Content
        this.ContentStateModifier = new StateModifier();

        // Create the Tabs
        this.TopTabs = new View();
        this.TopTabs.Bar = new TabBar();
        this.TopTabs.BarSizeMod = new StateModifier({
            size: [undefined, 40]
        });
        this.TopTabs.add(this.TopTabs.BarSizeMod).add(this.TopTabs.Bar);

        this.TopTabs.Bar.defineSection('nemeses', {
            content: 'Nemeses',
            onClasses: ['actions-news-tabbar-default', 'on'],
            offClasses: ['actions-news-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('you', {
            content: 'You',
            onClasses: ['actions-news-tabbar-default', 'on'],
            offClasses: ['actions-news-tabbar-default', 'off']
        });

        // Add tabs to sequence
        this.contentScrollView.Views.push(this.TopTabs);

        // Tab content
        // this.TopTabs = new View();
        this.TopTabs.Content = new RenderController();

        // Nemeses
        this.TopTabs.Content.Nemeses = new View();
        this.TopTabs.Content.Nemeses.View = new NemesesView();
        this.TopTabs.Content.Nemeses.add(this.TopTabs.Content.Nemeses.View);
        // this.TopTabs.Content.Nemeses = new View();
        // this.TopTabs.Content.Nemeses.Surface = new Surface({
        //     content: 'No news for Nemeses!',
        //     size: [undefined, 50],
        //     properties: {
        //         textAlign: "center",
        //         backgroundColor: "white",
        //         color: "#222",
        //         lineHeight: "50px",
        //         borderTop: "1px solid #ddd"
        //     }
        // });
        // this.TopTabs.Content.Nemeses.add(this.TopTabs.Content.Nemeses.Surface);

        // You
        this.TopTabs.Content.You = new View();
        this.TopTabs.Content.You.View = new YouView();
        this.TopTabs.Content.You.add(this.TopTabs.Content.You.View);

        // Add Lightbox to sequence (FlexibleLayout)
        this.contentScrollView.Views.push(this.TopTabs.Content);

        // Listeners for Tabs
        this.TopTabs.Bar.on('select', function(result){
            switch(result.id){

                case 'nemeses':
                    that.TopTabs.Content.show(that.TopTabs.Content.Nemeses);
                    break;

                case 'you':
                    that.TopTabs.Content.show(that.TopTabs.Content.You);
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });
        this.TopTabs.Bar.select('nemeses');

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

        // Flexible Layout sequencing
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

    };

    PageView.prototype.refreshData = function() {
        try {
            this.model.fetch();
            this.media_collection.fetch();
            // this.errorList.fetch();
            // this.alert_collection.fetch();
            // this.CarTripListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.menuToggle = function() {
        console.log("menuToggle'ing");
        if (!this.sideView.open) {
            console.log('opening');
            this.mainTransitionable.set(200, { duration: 500, curve: 'easeOut' });
            this.sideView.flipOut();
        } else {
            console.log('closing');
            this.mainTransitionable.set(0, { duration: 500, curve: 'easeOut' });
            this.sideView.flipIn();
        }
        this.sideView.open = !this.sideView.open;
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':

                switch(otherViewName){
                    case 'Fleet':

                        // No animation by default
                        transitionOptions.outTransform = Transform.identity;

                        // Wait for timeout of delay to hide
                        window.setTimeout(function(){

                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Hide content from a direction
                            // if(goingBack){

                            // that.ContentStateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);
                            // } else {
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);
                            // }

                        }, delayShowing);

                        break;

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        window.setTimeout(function(){

                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide down
                            // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight,0), transitionOptions.outTransition);

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

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        // Header
                        window.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);


                        }, delayShowing);

                        // Content
                        // - extra delay
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);

                        // //Fade out the header
                        // // var previousTransform = transitionOptions.outTransform;
                        // transitionOptions.outTransform = Transform.identity;

                        // // Move the content to the left
                        // // - not the footer
                        // // console.log(transitionOptions.outTransform);
                        // // debugger;
                        // window.setTimeout(function(){

                        //     // Bring map content back
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        //     // Bring Footer Up
                        //     that.layout.footer.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.outTransition);

                        // }, delayShowing);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
        },
        footer: {
            size: [0,0]
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
