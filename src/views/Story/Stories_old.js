
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var ModifiedScrollView = require('views/common/ModifiedScrollView');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
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
    var FlexibleLayout = require("famous/views/FlexibleLayout");

    var EventHandler = require('famous/core/EventHandler');

    // Extras
    var Utils = require('utils');
    var $ = require('jquery');
    var _ = require('underscore');
    var Credentials = JSON.parse(require('text!credentials.json'));

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var StoryModel = require('models/story');
    var PlayerModel = require('models/player');
    var GameModel = require('models/game');

    // Subviews

    // Side menu of list of cars
    var PlayerMenuView = require('views/Player/PlayerMenu');
    // Game List
    var PlayerGameListView = require('views/Player/PlayerGameList');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // // Models
        // this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();
        // this.createContent();

        this.contentView = new View();
        this.contentView.OriginMod = new StateModifier({
            origin: [0, 0.5]
        });
        this.contentView.Surface = new Surface({
            content: '<i class="icon ion-earth"></i><div>Coming Soon!</div><div>Worldwide updates from your Nemeses</div>',
            size: [undefined, true],
            classes: ['explore-surface-temp'],
            properties: {
                fontSize: '42px',
                textAlign: 'center',
                backgroundColor: "white"
            }
        });
        this.contentView.add(this.contentView.OriginMod).add(this.contentView.Surface);

        this.layout.content.add(this.contentView);
        this.add(this.layout);
    



        // Events

        // this._eventInput.on('menuToggle', this.menuToggle.bind(this))


        // window.setTimeout(function(){
        //     KnowPlayerId.resolve("529c02f00705435badb1dff5");
        // },3000);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons
        this.headerContent = new View();
        this.headerContent.Inbox = new Surface({
            content: '<i class="icon ion-android-inbox"></i><div>Inbox</div>',
            size: [50, undefined],
            classes: ['header-tab-icon-text']
        });
        this.headerContent.Inbox.on('click', function(){
            App.history.navigate('inbox');
        });

        // create the header
        this.header = new StandardHeader({
            content: 'Nemesis',
            classes: ["normal-header","nemesis-main-header"],
            backClasses: ["normal-header"],
            backContent: false,
            moreClasses: ["normal-header"],
            // moreContent: false, //"+", //"Players",
            moreSurfaces: [
                this.headerContent.Inbox
            ]
            // backContent: "+Game"
        }); 
        this.header.navBar.title.initialTranslate = Transform.translate(0,0,0);
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
            // App.history.navigate('game/add',{trigger: true});
            // App.history.navigate('dash',{trigger: true});
        });
        this.header._eventOutput.on('more',function(){
            // rewrite the event
            // this._eventOutput.emit('menutoggle');
            // App.history.navigate('player/add', {trigger: true});
        });
        this.header.navBar.title.on('click',function(){
            // rewrite the event
            // that.PlayerGameListView.collection.requestNextPage();
            // App.history.navigate('settings',{trigger: true});
        });
        this.header.pipe(this._eventInput);

        // this._eventInput.on('menutoggle', this.menuToggle.bind(this));
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // // Change title on change
        // this.model.on('change', function(Model){
        //     that.header.setContent(Model.get('name'));
        // });

        // // Node for Modifier and background
        // this.HeaderNode = new RenderNode();
        // this.HeaderNode.add(this.headerBg);
        // this.HeaderNode.add(this.header.StateModifier).add(this.header);

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;

        // After model populated

        // create the content
        this.contentScrollView = new ModifiedScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Wait for users
        this.collection.populated().then(function(){
            that.collection.each(function(model){
                that.addOne(model);
            }, that);
        });

        this.ContentStateModifier = new StateModifier();

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

    };


    PageView.prototype.loadModels = function() {
        var that = this;

        // Player list
        this.collection = new StoryModel.StoryCollection([],{
            feed: true
        });
        this.collection.fetch({prefill: true});

    };

    PageView.prototype.addOne = function(Story) { 
        var that = this;
        
        // console.log('Adding a Game Surface');
        // console.log(Game);

        moment.lang('en', {
            relativeTime : {
                future: "in %s",
                past:   "%s ago",
                s:  "s",
                m:  "m",
                mm: "%dm",
                h:  "1h",
                hh: "%dh",
                d:  "1d",
                dd: "%dd",
                M:  "1m",
                MM: "%dm",
                y:  "1y",
                yy: "%dy"
            }
        });

        var StoryIndex = this.contentScrollView.Views.length;

        // gameContent creation function, created at runtime
        var storyFunc = function(){

            var tmpStory = Story.toJSON();

            var bgImage = '';
            if(tmpStory.template_data.bg_pattern){
                bgImage = 'url(img/transparenttextures/' + tmpStory.template_data.bg_pattern.toString() + '.png)';
            }

            return {
                // content: template({
                //     paginator: {
                //         currentPage: that.collection.currentPage + 1,
                //         firstPage: that.collection.firstPage,
                //         totalPages: that.collection.totalPages,
                //         totalResults: that.collection.totalResults
                //     },
                //     story: tmpStory
                // }),
                properties: {
                    backgroundColor: tmpStory.template_data.bg_color,
                    backgroundImage: bgImage,
                    color: tmpStory.template_data.text_color,
                }
            };

        };

        var storyView = new View();

        storyView.height = 200; //window.innerWidth;
        if(storyView.height > 400){
            storyView.height = 400;
        }
        // use media_id height if included? (scaled correctly)
        // -todo..

        storyView.SizeMod = new StateModifier({
            size: [undefined, storyView.height]
        });

        var sc = storyFunc();

        // Background surface (Image or Pattern Color)
        storyView.BgSurface = new Surface({
            size: [undefined, undefined],
            content: '',
            properties: sc.properties
        });

        // Create layout
        // - expands to size of container (using .SizeMod above)
        storyView.Layout = new HeaderFooterLayout({
            headerSize: 40,
            footerSize: 40
        });

        // header (name of sport and time)
        storyView.Layout._header = new View();
        storyView.Layout._header.BgOpacity = new StateModifier({
            opacity: [0.5]
        });
        storyView.Layout._header.BgSurface = new Surface({
            content: '',
            size: [undefined, undefined],
            properties: {
                backgroundColor: "white"
            }
        });
        storyView.Layout._header.add(storyView.Layout._header.BgOpacity).add(storyView.Layout._header.BgSurface);
        storyView.Layout._header.Grid = new GridLayout({
            dimensions: [2,1]
        });
        storyView.Layout._header.add(storyView.Layout._header.Grid);
        // Player Name
        storyView.Layout._header.Player = new Surface({
            content: '<div data-replace-id="'+Story.get('player_id')+'" data-replace-model="Player" data-replace-field="Profile.name">&nbsp;</div>',
            size: [undefined,undefined],
            properties: {
                color: '#40557F', //Story.get('template_data').text_color,
                fontWeight: "400",
                paddingLeft: "8px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderBottom: "1px solid #f8f8f8"
            }
        });
        Utils.dataModelReplaceOnSurface(storyView.Layout._header.Player);
        storyView.Layout._header.Player.pipe(this._eventOutput);
        // Datetime (ago)
        storyView.Layout._header.DateTime = new Surface({
            content: '<span class="icon ion-android-clock" style="font-size: 12px;"></span> ' + moment(Story.get('created')).fromNow(true),
            size: [undefined,undefined],
            properties: {
                color: '#40557F', //Story.get('template_data').text_color,
                // fontWeight: "100",
                textAlign: "right",
                paddingRight: "8px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderBottom: "1px solid #f8f8f8"
            }
        });
        storyView.Layout._header.DateTime.pipe(this._eventOutput);
        // SequenceFrom
        storyView.Layout._header.Grid.sequenceFrom([
            storyView.Layout._header.Player,
            storyView.Layout._header.DateTime
        ]);
        // Add header to local HeaderFooterLayout
        storyView.Layout.header.add(storyView.Layout._header)

        // content
        storyView.Layout._content = new View();
        storyView.Layout._content.BgSurface = new Surface({
            size: [undefined, undefined]
        });
        storyView.Layout._content.BgSurface.pipe(this._eventOutput);
        storyView.Layout._content.Surface = new Surface({
            content: Story.get('template_data').headline,
            size: [undefined,true],
            properties: {
                textAlign: "center",
                color: Story.get('template_data').text_color,
                fontWeight: "bold",
                fontSize: "21px",
                textShadow: "0px 0px 1px #555"
            }
        });
        storyView.Layout._content.Surface.pipe(this._eventOutput);
        storyView.Layout._content.BgSurface.on('click', function(){
            App.history.navigate('game/' + Story.get('game_id')._id);
        });
        storyView.Layout._content.Surface.on('click', function(){
            App.history.navigate('game/' + Story.get('game_id')._id);
        });
        var originMod = new StateModifier({
            origin: [0, 0.5]
        });
        var sizeMod = new StateModifier({
            size: [undefined, undefined],
        });
        storyView.Layout._content.add(storyView.Layout._content.BgSurface);
        storyView.Layout._content.add(originMod).add(storyView.Layout._content.Surface);
        storyView.Layout.content.add(storyView.Layout._content)


        // footer (likes and comments)
        storyView.Layout._footer = new View();
        // storyView.Layout._footer.BgSurface = new Surface({
        //     size: [undefined, undefined]
        // });
        // storyView.Layout._footer.BgSurface.pipe(this._eventOutput);
        storyView.Layout._footer.Grid = new FlexibleLayout({
            ratios: [1, true, true]
        });
        storyView.Layout._footer.add(storyView.Layout._footer.Grid);
        // Sport Name
        storyView.Layout._footer.Sport = new Surface({
            content: Story.get('sport_id').name,
            size: [undefined,undefined],
            properties: {
                color: Story.get('template_data').text_color,
                fontWeight: "400",
                paddingLeft: "8px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderTop: "1px solid #f8f8f8"
            }
        });
        storyView.Layout._footer.Sport.pipe(this._eventOutput);
        // Likes
        storyView.Layout._footer.Likes = new Surface({
            content: '', //<i class="icon ion-heart"></i> 3',
            size: [70,undefined],
            properties: {
                color: Story.get('template_data').text_color,
                // fontWeight: "100",
                textAlign: "left",
                // paddingRight: "8px",
                fontSize: "18px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderTop: "1px solid #f8f8f8"
            }
        });
        storyView.Layout._footer.Likes.pipe(this._eventOutput);
        // Comments
        storyView.Layout._footer.Comments = new Surface({
            content: '', //<i class="icon ion-chatbubble"></i> 2',
            size: [70,undefined],
            properties: {
                color: Story.get('template_data').text_color,
                // fontWeight: "100",
                textAlign: "left",
                // paddingRight: "8px",
                fontSize: "18px",
                lineHeight: "40px",
                textShadow: "0px 0px 1px #999",
                // borderTop: "1px solid #f8f8f8"
            }
        });
        storyView.Layout._footer.Comments.pipe(this._eventOutput);
        // SequenceFrom
        storyView.Layout._footer.Grid.sequenceFrom([
            storyView.Layout._footer.Sport,
            storyView.Layout._footer.Likes,
            storyView.Layout._footer.Comments
        ]);
        // Add header to local HeaderFooterLayout
        storyView.Layout.footer.add(storyView.Layout._footer)

        // Events for footer
        storyView.Layout._footer.on('click', function(){
            App.history.navigate('game/' + Story.get('game_id')._id);
        });

        // Add layout and background to rendertree
        var sizeNode = storyView.add(storyView.SizeMod);
        sizeNode.add(storyView.BgSurface);
        sizeNode.add(storyView.Layout);

        storyView.getSize = function(){
            // debugger;
            return [undefined, storyView.height]
        };


        // storyView.OriginMod = new StateModifier({
        //     // origin: [0.5, 0.5]
        // });
        // storyView.add(storyView.OriginMod).add(storyView.Surface);

        storyView.Layout.Model = Story;

        // Utils.dataModelReplaceOnSurface(storyView.Surface);

        Story.on('change', function(){
            // re-render the story...
            // - todo...
            // var sc = storyContent();
            // storyView.Surface.setContent(sc.content);
            // storyView.Surface.setProperties(sc.properties);

            // Utils.dataModelReplaceOnSurface(storyView.Surface);

            console.error('not yet re-rendering a story on "change" event');

        }, this);

        // storyView.Surface.pipe(this._eventOutput);
        // storyView.Layout.on('click', function(){
        //     App.history.navigate('game/' + Story.get('game_id')._id);
        // });

        this.contentScrollView.Views.push(storyView);
        this.collection.infiniteResults += 1;

        // if(!this.contentScrollView.isSeq){
            // this.contentScrollView.isSeq = true;
            this.contentScrollView.sequenceFrom(this.contentScrollView.Views);
        // }

    };

    // PageView.prototype.addOne = function(Model) { 
    //     var that = this;

    //     if(Model.get('_id') == that.options.args[0]){
    //         return;
    //     }
        
    //     var ModelIndex = this.collection.indexOf(Model);
    //     var name = Model.get('name');
    //     console.log(Model.toJSON());
    //     var temp = new Surface({
    //          content: name,
    //          size: [undefined, 60],
    //          properties: {
    //              color: "black",
    //              backgroundColor: "white",
    //              borderBottom: "1px solid black",
    //              lineHeight: "60px",
    //              padding: "0 8px"
    //              // textAlign: "center"
    //          }
    //     });

    //     // Events
    //     temp.pipe(this.contentScrollView);
    //     temp.on('click', (function(){
    //         this._eventOutput.emit("menuToggle");
    //         App.history.navigate('player/' + Model.get('_id'), {trigger: true});
    //     }).bind(this));
    //     temp.on('swipe', (function(){
    //         this._eventOutput.emit("menuToggle");
    //     }).bind(this));

    //     // // Model change
    //     // Model.on('change:name', function(ModelTmp){
    //     //     temp.setContent(ModelTmp.get('name'));
    //     // }, this);
    //     this.contentScrollView.Views.push(temp);

    //     // this.modelSurfaces[Model.get('_id')] = temp;

    // }


    PageView.prototype.refreshData = function() {
        try {
            // this.model.fetch();
            // this.PlayerTripListView.collection.fetch();
        }catch(err){};
    };


    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){
                    case 'Fleet':

                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // // Hiding the sideView
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Move the content
                        window.setTimeout(function(){

                            // Hide content from a direction
                            // if(goingBack){
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.outTransition);
                            // } else {
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);
                            // }
                            // that.ContentStateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // // Hiding the sideView
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Content
                        window.setTimeout(function(){
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // // Slide left
                            // that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * -1) - 100,0,0), transitionOptions.outTransition);

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

                        // // SideView must be visible
                        // this.sideView.OpacityModifier.setOpacity(1);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        // // Header
                        // // - no extra delay
                        // window.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // // Bring map content back
                            // that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);


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
            size: [undefined, undefined],
            inTransition: true,
            outTransition: true,
            overlap: true
        }
    };

    module.exports = PageView;

});
