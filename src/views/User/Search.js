
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var ModifiedScrollView = require('views/common/ModifiedScrollView');
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

    var EventHandler = require('famous/core/EventHandler');

    // Extras
    var Utils = require('utils');
    var $ = require('jquery');
    var _ = require('underscore');
    var Credentials = JSON.parse(require('text!credentials.json'));

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var ProfileModel = require('models/profile');

    // Subviews

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Models
        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createContent();
        this.createHeader();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header
        this.header = new StandardHeader({
            content: 'Search Usernames',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();

        });
        this.header.pipe(this._eventInput);

        // this._eventInput.on('menutoggle', this.menuToggle.bind(this));
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;

        // After model populated

        // Create search box, and result list of players

        this.ContentLayout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        // create search header
        this.SearchHeader = new InputSurface({
            type: 'text',
            size: [undefined, undefined],
            placeholder: 'username',
            name: 'search_username',
            value: ''
        });
        this.SearchHeader.on('keyup', function(){
            // Trigger search
            that.search_username();
        });
        var SlightlyInFrontMod = new Modifier({
            transform: Transform.translate(0,0,0.0001)
        });
        this.ContentLayout.header.add(SlightlyInFrontMod).add(this.SearchHeader);

        // create the content
        this.contentScrollView = new ModifiedScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);


        // Create default surfaces we'll re-use
        this.InstructionsSurface = new Surface({
            content: '<i class="icon ion-arrow-up-a"></i> Search by typing above!',
            size: [undefined, 200],
            properties: {
                color: '#444',
                textAlign: 'left',
                fontWeight: 'bold',
                padding: '0px 8px',
                fontSize: '18px',
                lineHeight: '60px'
            }
        });

        this.NoResultsSurface = new Surface({
            content: 'No Usernames Matched',
            size: [undefined, 200],
            properties: {
                color: '#444',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '18px',
                lineHeight: '60px'
            }
        });

        // Show initial surfaces
        this.rebuild_username_list();

        // // Wait for users
        // this.collection.populated().then(function(){
        //     that.collection.each(function(model){
        //         that.addOne(model);
        //     }, that);
        //     that.collection.on('add', that.addOne.bind(that));
        // });

        this.ContentStateModifier = new StateModifier();

        this.ContentLayout.content.add(this.contentScrollView);
        this.layout.content.add(this.ContentStateModifier).add(this.ContentLayout);
        // this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

    };

    PageView.prototype.loadModels = function() {
        var that = this;

        this.player_id = that.options.args[0];

        // Player list
        this.collection = new ProfileModel.ProfileCollection([],{
            type: 'username',
            username: ''
            // should include player_id to get "friends" for a player
        });

        this.collection.on('reset', this.rebuild_username_list.bind(this));

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
        // this.collection.fetch({prefill: true});

    };

    PageView.prototype.search_username = function() {
        var that = this;

        // Get the username to search against
        var val = this.SearchHeader.getValue();
        this.collection.initialize([],{
            type: 'username',
            username:  val // .Surface...
        });
        if(val == ''){
            this.collection.set([]);
            this.collection.trigger('reset');
        } else {
            this.collection.fetch()
                .then(function(){
                    if(val == that.SearchHeader.getValue()){
                        that.collection.trigger('reset');
                    }
                });
        }


    };

    PageView.prototype.rebuild_username_list = function(){
        var that = this;

        // console.log(this.collection.toJSON());
        // rebuild_username_list

        // Empty? Display no results
        if(this.collection.length == 0){

            this.contentScrollView.Views = [];
            if(this.SearchHeader.getValue().toString().trim() == ''){
                // Tell them how to search!
                this.contentScrollView.Views.push(this.InstructionsSurface);
            } else {
                // no results
                this.contentScrollView.Views.push(this.NoResultsSurface);
            }
            this.contentScrollView.sequenceFrom(this.contentScrollView.Views);
            return;
        } else {
            // Clear any views that don't have a Model already
            this.contentScrollView.Views = _.filter(this.contentScrollView.Views, function(tmpPlayerView){
                if(tmpPlayerView.Model){
                    return true;
                }
                return false;
            });

        }

        // Figure out which surfaces to remove/keep, re-order, etc.
        var player_ids_to_keep = _.pluck(this.collection.toJSON(), '_id'),
            views_to_add = [];

        // Remove unneeded views
        this.contentScrollView.Views = _.filter(this.contentScrollView.Views, function(tmpPlayerView){
            if(player_ids_to_keep.indexOf(tmpPlayerView.Model.get('_id')) !== -1){
                return true;
            }
            return false;
        });

        // get existing, to figure out which to create
        var existing_view_player_ids = _.map(this.contentScrollView.Views, function(tmpPlayerView){
            return tmpPlayerView.Model.get('_id');
        });

        // create new surfaces
        var to_create_ids = _.difference(player_ids_to_keep, existing_view_player_ids);
        this.collection.forEach(function(tmpPlayerModel){
            if(to_create_ids.indexOf(tmpPlayerModel.get('_id')) === -1){
                // already added!
                return;
            }

            that.addOne(tmpPlayerModel);
            // var userView = new View(),
            //     name = tmpPlayerModel.get('profile.name') || '&nbsp;',
            //     username = tmpPlayerModel.get('username');

            // userView.Model = tmpPlayerModel;
            // userView.Surface = new Surface({
            //      content: '<div>@' +username+'</div><div>' + name + '</div>',
            //      size: [undefined, 60],
            //      classes: ['player-list-item-default']
            // });
            // userView.Surface.on('click', function(){
            //     App.history.navigate('player/' + tmpPlayerModel.get('_id'));
            // });
            // userView.add(userView.Surface);

            // that.contentScrollView.Views.push(userView);
        });

        // sort existing
        this.contentScrollView.Views = _.sortBy(this.contentScrollView.Views, function(tmpPlayerView){
            return tmpPlayerView.Model.get('username').toLowerCase();
        });

        // resequence? (happens automatically?)
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

    };

    PageView.prototype.addOne = function(Model){
        var that = this;

        var userView = new View(),
            name = Model.get('profile.name') || '&nbsp;',
            username = Model.get('username');

        userView.Model = Model;
        userView.Surface = new Surface({
             content: '<div>@' +username+'</div><div>' + name + '</div>',
             size: [undefined, 60],
             classes: ['player-list-item-default']
        });
        userView.Surface.pipe(that.contentScrollView);
        userView.Surface.on('click', function(){
            App.history.navigate('player/' + Model.get('_id'));
        });
        userView.add(userView.Surface);

        that.contentScrollView.Views.push(userView);

    };

    PageView.prototype.addOne2 = function(Model) { 
        var that = this;

        if(Model.get('_id') == that.player_id || Model.get('is_me') === true){
            return;
        }

        // console.info(Model.get('_id'), that.player_id);
        // console.log(ModelIndex);

        var ModelIndex = this.collection.indexOf(Model);
        var username = Model.get('username');
        var name = Model.get('profile.name');

        // console.log(Model.toJSON());
        var temp = new Surface({
             content: '<div>@' +username+'</div>' + '<div>' + name + '</div>',
             size: [undefined, 60],
             classes: ['user-search-list-item-default']
        });

        // Events
        temp.pipe(this.contentScrollView);
        temp.on('click', (function(){
            App.history.navigate('profile/' + Model.get('_id'), {trigger: true});
        }).bind(this));
        // temp.on('swipe', (function(){
        //     this._eventOutput.emit("menuToggle");
        // }).bind(this));

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
