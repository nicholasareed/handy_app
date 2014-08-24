
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

    var EventHandler = require('famous/core/EventHandler');

    // Extras
    var Utils = require('utils');
    var $ = require('jquery');
    var _ = require('underscore');
    var Credentials = JSON.parse(require('text!credentials.json'));

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
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

        // // Create the CarList menu that swings out
        // this.sideView = new PlayerMenuView();
        // this.sideView.OpacityModifier = new StateModifier();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();

        // // content
        // this.model.populated().then(function(){
        //     that.update_content();
        //     that.model.on('change', that.update_content.bind(that)); // could put it inside the: .populated().then(function(){....
        // });
        
        // Attach the main transform and the comboNode to the renderTree
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
        this.headerContent.Add = new Surface({
            content: '<i class="icon ion-android-add-contact"></i><div>Add</div>',
            size: [60, undefined],
            classes: ['header-tab-icon-text']
        });
        this.headerContent.Add.on('click', function(){
            App.history.modifyLast({
                tag: 'StartPlayerAdd'
            });
            App.history.navigate('player/add');
        });

        // create the header
        this.header = new StandardHeader({
            content: 'Nemeses',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Add
            ]
            // moreClasses: ["normal-header"],
            // moreContent: "+", //"Players",
            // backContent: "+Game"
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.reloadCurrent();//.history.go(-1);
            // App.history.navigate('game/add',{trigger: true});
            // App.history.navigate('dash');
        });
        // this.header._eventOutput.on('more',function(){
        //     // rewrite the event
        //     // this._eventOutput.emit('menutoggle');
        //     App.history.navigate('player/add');
        // });
        this.header.navBar.title.on('click',function(){
            // rewrite the event
            // that.PlayerGameListView.collection.requestNextPage();
            App.history.reloadCurrent();

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
            that.collection.on('add', that.addOne.bind(that));
        });

        this.ContentStateModifier = new StateModifier();

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

    };


    PageView.prototype.loadModels = function() {
        var that = this;

        this.player_id = that.options.args[0];

        // Player list
        this.collection = new PlayerModel.PlayerCollection([],{
            player_id: that.options.args[0]
            // should include player_id to get "friends" for a player
        });

        // this.collection.on("add", this.addOne, this);
        // this.collection.on("remove", function(Model){
        //     // This was a remove as triggered by the collection
        //     // - we want to differentiate from a move triggered elsewhere? (like by our same view, we might want to animate differently)
        //     this.scrollSurfaces = _.without(this.scrollSurfaces, this.modelSurfaces[Model.get('_id')]);

        //     // Re-sequence (unfortunate that I have to do this, thought it would auto-resequence)
        //     this.contentScrollView.sequenceFrom(this.scrollSurfaces);
        // }, this);
        // this.collection.on("cachesync", function(collection){
        //     // got a "prefill" value
        //     // - no need to update anything, just use the normal add/remove
        // });
        this.collection.fetch({prefill: true});

    };

    PageView.prototype.addOne = function(Model) { 
        var that = this;

        if(Model.get('_id') == that.player_id || Model.get('is_me') === true){
            return;
        }

        // console.info(Model.get('_id'), that.player_id);
        // console.log(ModelIndex);

        var ModelIndex = this.collection.indexOf(Model);
        var name = Model.get('Profile.name');
        if(!name){
            name = Model.get('name');
        }
        var username = Model.get('Profile.username');

        // console.log(Model.toJSON());
        var temp = new Surface({
             content: '<div>' + name + '</div><div>@' +username+'</div>',
             size: [undefined, 60],
             classes: ['player-list-item-default']
        });

        // Events
        temp.pipe(this.contentScrollView);
        temp.on('click', (function(){
            this._eventOutput.emit("menuToggle");
            App.history.navigate('player/' + Model.get('_id'), {trigger: true});
        }).bind(this));
        temp.on('swipe', (function(){
            this._eventOutput.emit("menuToggle");
        }).bind(this));

        // // Model change
        // Model.on('change:name', function(ModelTmp){
        //     temp.setContent(ModelTmp.get('name'));
        // }, this);
        this.contentScrollView.Views.push(temp);

        // this.modelSurfaces[Model.get('_id')] = temp;

    }


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

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // // Hiding the sideView
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Hide content
                        that.ContentStateModifier.setOpacity(1);

                        // Content
                        window.setTimeout(function(){
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Hide through opacity
                            that.ContentStateModifier.setOpacity(0, transitionOptions.outTransition);

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

                        // Hide content
                        that.ContentStateModifier.setOpacity(0);

                        // // Header
                        // // - no extra delay
                        // window.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setOpacity(1, transitionOptions.inTransition);

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
