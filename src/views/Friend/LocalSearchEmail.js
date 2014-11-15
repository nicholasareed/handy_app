
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
    var Timer = require('famous/utilities/Timer');

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
    var FriendModel = require('models/friend');
    var ContactModel = require('models/contact');
    var RelationshipCodeModel = require('models/relationship_code');

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

        var localFlag = 'localinvite/home/v/1';
        Utils.CheckFlag(localFlag).then(function(){
            // popover
            Utils.Popover.Alert('Connect with people by using a 5-6 digit code. You can also add emails for people who have not yet signed up for OddJob','ok');
            // update flag
            Utils.PostFlag(localFlag, true);
        });
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        // Icons
        this.headerContent = new View();


        // create the header
        this.header = new StandardHeader({
            content: 'Find Email',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
            // moreSurfaces: [
            //     this.headerContent.EmailOnly,
            //     this.headerContent.CopyCode,
            //     this.headerContent.EnterCode
            // ]
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
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
            placeholder: 'name',
            name: 'search_name',
            value: ''
        });
        this.SearchHeader.on('keyup', function(){
            // Trigger search
            that.search_name();
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
            content: '<i class="icon ion-arrow-up-a"></i> Search local contacts',
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
            content: 'No Names Matched',
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
        this.rebuild_list();

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

        // Player list
        this.collection = new ContactModel.ContactCollection([],{
            type: 'local',
            filter: ''
            // should include player_id to get "friends" for a player
        });

        this.collection.on('reset', this.rebuild_list.bind(this));

        Utils.Notification.Toast('Loading Contacts');

        this.collection.fetchContacts()
        .then(function(){
            that.search_name();
        })
        .fail(function(err){
            Utils.Notification.Toast('Failed Contacts');
        });

    };

    PageView.prototype.search_name = function() {
        var that = this;

        // Get the username to search against
        var val = this.SearchHeader.getValue();
        this.collection.initialize([],{
            type: 'local',
            filter:  val // .Surface...
        });
        if(val == ''){
            this.collection.set([]);
            this.collection.trigger('reset');
        } else {
            this.collection.filterContacts()
                .then(function(){
                    if(val == that.SearchHeader.getValue()){
                        console.log('triggering reset');
                        that.collection.trigger('reset');
                    } else {
                        console.log('nope');
                    }
                });
        }


    };

    PageView.prototype.rebuild_list = function(){
        var that = this;

        // console.log(this.collection.toJSON());
        // rebuild_list

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
        var player_ids_to_keep = _.pluck(this.collection.toJSON(), 'id'),
            views_to_add = [];

        // Remove unneeded views
        this.contentScrollView.Views = _.filter(this.contentScrollView.Views, function(tmpPlayerView){
            if(player_ids_to_keep.indexOf(tmpPlayerView.Model.get('id')) !== -1){
                return true;
            }
            return false;
        });

        // get existing, to figure out which to create
        var existing_view_player_ids = _.map(this.contentScrollView.Views, function(tmpPlayerView){
            return tmpPlayerView.Model.get('id');
        });

        // create new surfaces
        var to_create_ids = _.difference(player_ids_to_keep, existing_view_player_ids);
        this.collection.forEach(function(tmpPlayerModel){
            console.log('creating!');
            if(to_create_ids.indexOf(tmpPlayerModel.get('id')) === -1){
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
            var name = tmpPlayerView.Model.get('displayName') || tmpPlayerView.Model.get('name.formatted');
            return name.toLowerCase();
        });

        // resequence? (happens automatically?)
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

    };

    PageView.prototype.addOne = function(Model){
        var that = this;
        // console.log(Model);
        // console.log(Model.toJSON());
        // console.log(JSON.stringify(Model.toJSON()));

        var userView = new View();

        var name = Model.get('displayName') || Model.get('name.formatted'),
            emailCount = '';

        var modelKey = 'emails'; // phoneNumbers

        if(!Model.get(modelKey)){
            emailCount = '<strong>0</strong> emails';
        } else if(Model.get(modelKey).length == 1){
            emailCount = '<stong>1</strong> email';
        } else {
            emailCount = '<strong>' + Model.get(modelKey).length + '</strong> emails';
        }

        userView.Model = Model;
        userView.Surface = new Surface({
             content: '<div><span class="ellipsis-all">' + name + '</span></div><div><span class="ellipsis-all">' + emailCount + '</span></div>',
             size: [undefined, true],
             classes: ['contact-list-item-default']
        });
        userView.Surface.pipe(that.contentScrollView);
        userView.Surface.on('click', function(){
            // App.history.navigate('player/' + Model.get('_id'));
            
            var userEmail = userView.Model.get(modelKey);

            if(!userEmail || !userEmail.length){
                Utils.Notification.Toast('No emails!');
                return;
            }

            if(userEmail.length > 1){
                // Multiple phone email options!
                var optList = [];
                userEmail.forEach(function(email){
                    optList.push({
                        text: email.value,
                        value: email.value,
                        success: function(thisOne){
                            that.launch_email(thisOne.value.value); 
                        }
                    });
                });
                Utils.Popover.List({
                    list: optList
                });
                return;
            }

            // Only a single email
            that.launch_email(userEmail.pop().value);


        });
        userView.getSize = function(){
            return [undefined, userView.Surface._size ? userView.Surface._size[1]: undefined];
        };
        userView.add(userView.Surface);

        that.contentScrollView.Views.push(userView);

    };

    PageView.prototype.launch_email = function(email){
        var that = this;

        // Should pre-load an RCode
        // - todo...
        console.log(Utils.Notification.Toast(email));
        console.log(email);
        console.log(JSON.stringify(email));

        App.Events.trigger('Email.chosen', email);

        App.history.back();

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
                        Timer.setTimeout(function(){
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
                    Timer.setTimeout(this.refreshData.bind(this), 1000);
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
                        // Timer.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setOpacity(1, transitionOptions.inTransition);

                            // Focus on the search input!
                            that.SearchHeader.focus();

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
