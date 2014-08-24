
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var ModifiedScrollView = require('views/common/ModifiedScrollView');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
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

        // Models
        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();
        this.createContent();

        // this.contentView = new View();
        // this.contentView.OriginMod = new StateModifier({
        //     origin: [0, 0.5]
        // });
        // this.contentView.Surface = new Surface({
        //     content: '<i class="icon ion-earth"></i><div>Coming Soon!</div><div>Worldwide updates from your Nemeses</div>',
        //     size: [undefined, true],
        //     classes: ['explore-surface-temp'],
        //     properties: {
        //         fontSize: '42px',
        //         textAlign: 'center',
        //         backgroundColor: "white"
        //     }
        // });
        // this.contentView.add(this.contentView.OriginMod).add(this.contentView.Surface);

        // this.layout.content.add(this.contentView);
        this.add(this.layout);
    


        var localFlag = 'highlights/home';
        Utils.CheckFlag(localFlag).then(function(){
            // popover
            that.launch_help_popover();
            // update flag
            Utils.PostFlag(localFlag, true);
        });

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
            content: App.t('app.name'),
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

        // - used to be a list of Stories! (doing only "highlighted" games for now
        this.collection = new GameModel.GameCollection([],{
            starred: true
        });
        this.collection.pager({prefill: true});

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

            // var bgImage = '';
            // if(tmpStory.template_data.bg_pattern){
            //     bgImage = 'url(img/transparenttextures/' + tmpStory.template_data.bg_pattern.toString() + '.png)';
            // }

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


        // Chess
        // - Starred by: You + 3 Friends
        // - Media (if it exists, in a grid of 3 max?)

        var clickHandler = new EventHandler();

        var storyView = new View();
        
        // // Size Modifier
        // storyView.SizeModifier = new Modifier({
        //     size: function(){
        //         return [undefined, something...]
        //     }
        // });

        // Spacer
        storyView.TopSpacer = new Surface({
            size: [undefined, 20],
            content: ''
            // classes: ['story-surface-top-default']
        });
        storyView.TopSpacer.pipe(clickHandler);
        that.contentScrollView.Views.push(storyView.TopSpacer);

        // Sport name
        storyView.TopSurface = new Surface({
            size: [undefined, 24],
            content: '<span class="ellipsis-all">' + Story.get('sport_id').name + '</span>',
            classes: ['story-surface-top-default']
        });
        storyView.TopSurface.pipe(clickHandler);
        that.contentScrollView.Views.push(storyView.TopSurface);

        // Winner / 1st place
        var winner_content = '<span class="ellipsis-all">No Winner</span>';
        switch(Story.get('sport_id.result_type')){
            case '1v1':
                // Find the winner
                var winner_id = false;
                _.each(Story.get('player_results'), function(val, key){
                    if(val.result == 'w'){
                        winner_id = key;
                    }
                });
                if(winner_id !== false){
                    winner_content = '<span class="ellipsis-all">Winner: <span data-replace-id="'+winner_id+'" data-replace-model="Player" data-replace-field="Profile.name">&nbsp;</span></span>';
                }
                break;
            case 'free-for-all':
                // Find the winner
                var winner_id = false;
                _.each(Story.get('player_results'), function(val, key){
                    if(parseInt(val.place, 10) == 1){
                        winner_id = key;
                    }
                });
                if(winner_id !== false){
                    winner_content = '<span class="ellipsis-all">Winner: <span data-replace-id="'+winner_id+'" data-replace-model="Player" data-replace-field="Profile.name">&nbsp;</span></span>';
                }
                break;
            default:
                console.error('missing result_type');
                break;

        }
        storyView.WinnerSurface = new Surface({
            size: [undefined, 18],
            content: winner_content,
            classes: ['story-surface-winner-default']
        });
        storyView.WinnerSurface.pipe(clickHandler);
        that.contentScrollView.Views.push(storyView.WinnerSurface);

        // Media layout
        if(Story.get('media').length > 0){
            storyView.MediaGrid = new SequentialLayout({
                direction: 0,
            });
            storyView.MediaGrid.getSize = function(){
                return [undefined, 100];
            };
            storyView.MediaGrid.Views = [];
            _.each(Story.get('media'), function(tmpMedia){
                if(tmpMedia.assembled !== true || !tmpMedia.urls){
                    // skip until assembled
                    return;
                }
                var tmpView = new ImageSurface({
                    content: tmpMedia.urls.thumb100x100,
                    size: [100,100]
                });
                tmpView.pipe(clickHandler);
                tmpView.on('click', function(e){

                    // Ask what they want to do
                    App.Cache.OptionModal = {
                        list: [
                            {
                                text: 'View Image',
                                value: 'view'
                            },
                            {
                                text: 'View Game',
                                value: 'game'
                            }
                        ],
                        on_choose: function(chosen_type){
                            // that.PlayerFilterChanger.Data = chosen_type.value;

                            switch(chosen_type.value){
                                case 'view':
                                    window.open(Media.get('urls.original'), '_system');
                                    break;
                                case 'game':
                                    App.history.navigate('game/' + Media.get('game_id'));
                                    // window.plugins.socialsharing.share('',null,media.urls.original,'www.nemesisapp.net/game/public/' + Story.get('_id'));
                                    break;
                                default:
                                    break;
                            }

                        },
                        on_cancel: function(){
                            // App.history.navigate(that.previousPage);
                            // debugger;
                        },
                        // title: '',
                        back_to_default_hint: false
                    };


                    e.dontbubble = true;

                    // Navigate
                    App.history.navigate('modal/list', {history: false});

                    return false;
                });

                storyView.MediaGrid.Views.push(tmpView);

            });
            storyView.MediaGrid.sequenceFrom(storyView.MediaGrid.Views);
            that.contentScrollView.Views.push(storyView.MediaGrid);
        }
        // storyView.MediaGrid.pipe(clickHandler);
        



        clickHandler.pipe(that.contentScrollView);
        clickHandler.on('click', function(e){
            // visit game
            if(e.dontbubble){
                return;
            }
            App.history.navigate('game/' + Story.get('_id'));
        });

        Utils.dataModelReplaceOnSurface(storyView.WinnerSurface);

        // this.contentScrollView.Views.push(storyView);
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
            that.collection.pager();
        }catch(err){};
    };

    PageView.prototype.launch_help_popover = function(){
        var that = this;
        
        App.Cache.HelpPopoverModal = {
            title: 'Check out your Nemeses',
            body: "You and your nemeses' '<i class='icon ion-ios7-star'></i>' games will be listed here :)", // could even pass a surface!?!?
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
