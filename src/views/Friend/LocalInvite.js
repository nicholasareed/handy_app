
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
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        // Icons

        // Get a code
        this.headerContent = new View();
        this.headerContent.CopyCode = new Surface({
            content: '<i class="icon ion-ios7-copy-outline">',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.CopyCode.on('click', function(){

            Utils.Notification.Toast('Getting Code');

            // Create Model
            var newRCode = new RelationshipCodeModel.RelationshipCode({
                modelType: 'add_friend'
            })

            // Wait for model to be populated before loading Surfaces
            newRCode.populated().then(function(){

                Utils.Clipboard.copyTo('get ulu at uluapp.com/i/' + newRCode.get('code'));

                // var nada = prompt('Code has been copied','get ulu at uluapp.com/i/' + newRCode.get('code'));

                // var sentence = "get ulu! I'm on it now. uluapp.com/i/" + newRCode.get('code');
                // console.log(sentence);
                // window.plugins.socialsharing.shareViaSMS(sentence, phone_number, function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})

            });
            newRCode.fetch();
        });

        // paste code
        this.headerContent.EnterCode = new Surface({
            content: '<i class="icon ion-edit">',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.EnterCode.on('click', function(){
            Timer.setTimeout(function(){
                var code = prompt('Enter code');
                if(code){

                    // Check the invite code against the server
                    // - creates the necessary relationship also
                    $.ajax({
                        url: Credentials.server_root + 'relationships/invited',
                        method: 'post',
                        data: {
                            from: 'add', // if on the Player Edit / LinkUp page, we'd be using 'linkup'
                            code: code
                        },
                        success: function(response){
                            if(response.code != 200){
                                if(response.msg){
                                    alert(response.msg);
                                    return;
                                }
                                alert('Invalid code, please try again');
                                return false;
                            }

                            // Relationship has been created
                            // - either just added to a player
                            //      - simply go look at it
                            // - or am the Owner of a player now
                            //      - go edit the player

                            if(response.type == 'friend'){
                                Utils.Notification.Toast('You have successfully added a friend!');

                                return;
                            }

                        },
                        error: function(err){
                            alert('Failed with that code, please try again');
                            return;
                        }
                    });
                }
            },350)
        });



        // create the header
        this.header = new StandardHeader({
            content: 'Invite Friends',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // moreContent: false
            moreSurfaces: [
                this.headerContent.CopyCode,
                this.headerContent.EnterCode
            ]
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
            content: '<i class="icon ion-arrow-up-a"></i> Search contacts to send SMS',
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
            ptnCount = '';

        if(!Model.get('phoneNumbers')){
            ptnCount = '<strong>0</strong> numbers';
        } else if(Model.get('phoneNumbers').length == 1){
            ptnCount = '<stong>1</strong> number';
        } else {
            ptnCount = '<strong>' + Model.get('phoneNumbers').length + '</strong> numbers';
        }

        userView.Model = Model;
        userView.Surface = new Surface({
             content: '<div><span class="ellipsis-all">' + name + '</span></div><div><span class="ellipsis-all">' + ptnCount + '</span></div>',
             size: [undefined, true],
             classes: ['contact-list-item-default']
        });
        userView.Surface.pipe(that.contentScrollView);
        userView.Surface.on('click', function(){
            // App.history.navigate('player/' + Model.get('_id'));
            
            var ptns = userView.Model.get('phoneNumbers');

            if(!ptns || !ptns.length){
                Utils.Notification.Toast('No phone number!');
                return;
            }

            if(ptns.length > 1){
                // Multiple phone number options!
                var optList = [];
                ptns.forEach(function(ptn){
                    optList.push({
                        text: ptn.value + ' ('+ ptn.type +')',
                        value: ptn.value,
                        success: function(thisOne){
                            that.launch_sms(thisOne.value.value); 
                        }
                    });
                });
                Utils.Popover.List({
                    list: optList
                });
                return;
            }

            // Only a single ptn
            that.launch_sms(ptns.pop().value);


        });
        userView.getSize = function(){
            return [undefined, userView.Surface._size ? userView.Surface._size[1]: undefined];
        };
        userView.add(userView.Surface);

        that.contentScrollView.Views.push(userView);

    };

    PageView.prototype.launch_sms = function(phone_number){
        var that = this;

        // Should pre-load an RCode
        // - todo...
        console.log(Utils.Notification.Toast(phone_number));
        console.log(phone_number);
        console.log(JSON.stringify(phone_number));

        Utils.Notification.Toast('Creating code...');

        // Create Model
        var newRCode = new RelationshipCodeModel.RelationshipCode({
            modelType: 'add_friend'
        })

        // Wait for model to be populated before loading Surfaces
        newRCode.populated().then(function(){

            var sentence = "get ulu! I'm on it now. uluapp.com/i/" + newRCode.get('code');
            console.log(sentence);
            window.plugins.socialsharing.shareViaSMS(sentence, phone_number, function(msg) {console.log('ok: ' + msg)}, function(msg) {Utils.Notification.Toast('error: ' + msg)})

        });
        newRCode.fetch();
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
