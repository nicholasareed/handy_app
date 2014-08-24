/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
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

    // Helpers
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    var Handlebars = require('lib2/handlebars-helpers');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Subviews
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // Side menu of options
    var GameMenuView      = require('views/Game/GameMenu');

    // Models
    var GameModel = require('models/game');
    var PlayerModel = require('models/player');
    var MediaModel = require('models/media');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // Models

        // Game
        this.model = new GameModel.Game({
            _id: params.args[0]
        });
        this.model.fetch({prefill: true});

        // Media
        this.media_collection = new MediaModel.MediaCollection([],{
            game_id: params.args[0]
        });
        this.media_collection.fetch({prefill: true});

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });


        this.createHeader();
        // this.createContent();

            
        // Create the mainTransforms for shifting the entire view over on menu open
        this.mainTransform = new Modifier({
            transform: Transform.identity
        });
        this.mainTransitionable = new Transitionable(0);
        this.mainTransform.transformFrom(function() {
            // Called every frame of the animation
            return Transform.translate(this.mainTransitionable.get() * -1, 0, 0);
        }.bind(this));

        // Create the menu that swings out
        this.sideView = new GameMenuView({
            model: this.model
        });
        this.sideView.OpacityModifier = new StateModifier();


        // Wait for model to get data, and then render the content
        this.model.populated().then(function(){

            // that.update_counts();

            // // Now listen for changes
            // that.model.on('change', that.update_counts, that);

            switch(that.model.get('sport_id.result_type')){
                case '1v1':
                    that.create1v1();
                    break;

                case 'free-for-all':
                    that.createFreeForAll();
                    break;

                default:
                    console.log(that.model.toJSON());
                    throw "error";
                    alert("Unable to handle other types (1v2, teams, etc.) yet");
                    debugger;
                    return;
            }

        });

        // Attach the main transform and the comboNode to the renderTree
        this.add(this.mainTransform).add(this.layout);

        // // Attach the main transform and the comboNode to the renderTree
        // this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: "Game Overview",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: '<span class="icon ion-refresh"></span>'
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click',function(){
            // that.refreshData();
            App.history.back();
        });
        this.header._eventOutput.on('more',function(){
            // if(that.model.get('CarPermission.coowner')){
            //     App.history.navigate('car/permission/' + that.model.get('_id'), {trigger: true});
            // }
            // that.menuToggle();
            that.refreshData();
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // // Node for Modifier and background
        // this.HeaderNode = new RenderNode();
        // this.HeaderNode.add(this.headerBg);
        // this.HeaderNode.add(this.header.StateModifier).add(this.header);

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };
    
    // PageView.prototype.createContent = function(){
    //     var that = this;

    //     // scrollview
    //     this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
    //     this.contentScrollView.Views = [];
    //     this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

    //     // Content
    //     this.ContentStateModifier = new StateModifier();
    //     this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);


    // };
    
    PageView.prototype.create1v1 = function(){
        var that = this;

        // scrollview
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Content
        this.ContentStateModifier = new StateModifier();
        // this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

        
        // Tie the sideView and the main body together (why the fuck are we doing it like this?)
        // - this means the origin of the SideView is at the top-left of the ContentBody, no the topLeft of the page (like I kinda expect)
        this.mainNode = new RenderNode();
        this.mainNode.add(this.contentScrollView);
        this.mainNode.add(this.sideView.OpacityModifier).add(this.sideView);

        this.sideView._eventOutput.on("menuToggle", (function(){
            this.menuToggle();
        }).bind(this));

        // Add node to content of layout
        this.layout.content.add(this.ContentStateModifier).add(this.mainNode);

        // You Won! (or lost, or tied)

        // Player has all of the player_ids for themselves (that they "own" almost)
        var my_player_ids = App.Data.Players.findMe().get('related_player_ids');
        var matched_ids = _.intersection(this.model.get('player_ids'), my_player_ids);
        if(matched_ids.length < 1){
            // Unable to find any _id for this player that matches!
            // - basically, they didn't participate
            console.log(game.player_ids);
            console.log(my_player_ids);
            debugger;
            return game;
        }

        // convert matched_ids into the first matching player_id
        var found_player_id = matched_ids[0];
        var myResult = this.model.get('player_results')[found_player_id].result;


        // var me = App.Data.Players.findMe();

        // var myResult = this.model.get('player_results')[me.get('_id')].result;

        this.bigResult = new View();

        switch(myResult){
            case 'w':
                this.bigResult.Surface = new Surface({
                    content: 'You Won!',
                    size: [undefined, 40],
                    classes: ['g1v1-small-flag-result','small-flag-result-win']
                });
                break; 
            case 'l':
                this.bigResult.Surface = new Surface({
                    content: 'You Lost',
                    size: [undefined, 40],
                    classes: ['g1v1-small-flag-result','small-flag-result-lose']
                });
                break; 
            case 't':
                this.bigResult.Surface = new Surface({
                    content: 'Tie Game',
                    size: [undefined, 40],
                    classes: ['g1v1-small-flag-result','small-flag-result-tie']
                });
                break; 

            default:
                debugger;
                break;
        }

        this.bigResult.Surface.pipe(that.contentScrollView);
        this.bigResult.add(this.bigResult.Surface);
        this.contentScrollView.Views.push(this.bigResult);

        // Name of Sport
        this.sportName = new View();
        this.sportName.Surface = new Surface({
            content: this.model.get('sport_id.name'),
            size: [undefined, 60],
            properties: {
                lineHeight: "60px",
                textAlign: "center",
                backgroundColor: "white",
                color: "#222"
            }
        });
        this.sportName.Surface.pipe(that.contentScrollView);
        this.sportName.add(this.sportName.Surface);
        this.contentScrollView.Views.push(this.sportName);

        // // Opponent
        // var opponent_id = _.clone(this.model.get('player_ids'));
        // opponent_id = _.without(opponent_id, me.get('_id'));
        // if(opponent_id.length != 1){
        //     // uh-oh
        //     console.error('Unable to load opponent');
        //     return;
        // }

        // opponent_id = opponent_id[0];

        // this.opponent = new View();
        // this.opponent.Surface = new Surface({
        //     content: '<div data-replace-id="'+opponent_id+'" data-replace-model="Player" data-replace-field="Profile.name"></div>',
        //     size: [undefined, 40],
        //     properties: {
        //         lineHeight: "40px",
        //         padding: "0px 10px",
        //         backgroundColor: "white",
        //         color: "#222"
        //     }
        // });
        // this.opponent.Surface.pipe(that.contentScrollView);
        // Utils.dataModelReplaceOnSurface(this.opponent.Surface);
        // this.opponent.add(this.opponent.Surface);
        // this.contentScrollView.Views.push(this.opponent);


        // Players

        // Create SequenceLayout of items
        // - inserting that into the existing contentScrollView
        this.ResultSequenceLayout = new SequentialLayout();
        this.ResultSequenceLayout.Views = [];
        this.ResultSequenceLayout.sequenceFrom(this.ResultSequenceLayout.Views);

        // Create surfaces for each player
        _.each(this.model.get('player_results'), function(player, player_id){
            console.log(player);
            var opponent = new View();
            opponent.Surface = new Surface({
                content: '<span class="place-order" style="font-weight:bold;">' + player.result.toUpperCase() + ' - </span>&nbsp;&nbsp;<span data-replace-id="'+player_id+'" data-replace-model="Player" data-replace-field="Profile.name"></span>',
                size: [undefined, 40],
                classes: [],
                properties: {
                    lineHeight: "40px",
                    padding: "0px 10px",
                    backgroundColor: "white",
                    color: "#222"
                }
            });
            opponent.Surface.pipe(that.contentScrollView);
            Utils.dataModelReplaceOnSurface(opponent.Surface);
            opponent.add(opponent.Surface);

            that.ResultSequenceLayout.Views.push(opponent);
        });

        this.contentScrollView.Views.push(this.ResultSequenceLayout);


        // Media (photos, etc.)
        // - media would be here
        this.createMedia();
        this.create_highlight_button();
        this.create_share_button();
        this.create_view_online_button();

    };

    PageView.prototype.createMedia = function(){
        var that = this;

        // Media (photos, etc.)
        // - media would be here

        // Current collection of media (depends on collection fetching)
        this.mediaCollection = new SequentialLayout();
        this.mediaCollection.Views = [];

        this.contentScrollView.Views.push(this.mediaCollection);

        var addMedia = function(Media){

            Media.View = new View();
            Media.Surface = new ImageSurface({
                content: Media.get('urls.thumb100x100'),
                size: [75, 75]
            });
            Media.Surface.pipe(that.contentScrollView);
            Media.View.add(Media.Surface);
            
            that.mediaCollection.Views.push(Media.View);
            that.mediaCollection.sequenceFrom(that.mediaCollection.Views);

            Media.on('change:urls', function(){
                Media.Surface.setContent(Media.get('urls.thumb100x100'));
            });

            

        };
        this.media_collection.populated().then(function(){
            
            that.media_collection.forEach(function(tmpMedia){
                addMedia(tmpMedia);
            });
            that.media_collection.on('add', addMedia.bind(that));

            // that.mediaCollection.sequenceFrom(that.mediaCollection.Views);
        });

        // Button for adding more media
        // - from Camera
        this.mediaButton = new View();
        this.mediaButton.Surface = new Surface({
            content: 'Take Picture',
            size: [undefined, 40],
            properties: {
                lineHeight: "40px",
                padding: "0px 10px",
                backgroundColor: "white",
                color: "blue",
                textDecoration: "underline"
            }
        });
        this.mediaButton.Surface.pipe(that.contentScrollView);
        this.mediaButton.Surface.on('click', function(){
            // alert('media adding, coming soon');
            Utils.takePicture('camera', {}, that.uploadImage.bind(that), function(message){
                // failed taking a picture
            });
        });
        this.mediaButton.add(this.mediaButton.Surface);
        this.contentScrollView.Views.push(this.mediaButton);

        // Button for adding more media
        // - from GALLERY
        this.mediaButtonGallery = new View();
        this.mediaButtonGallery.Surface = new Surface({
            content: 'Add from Saved Photos',
            size: [undefined, 40],
            properties: {
                lineHeight: "40px",
                padding: "0px 10px",
                backgroundColor: "white",
                color: "blue",
                textDecoration: "underline"
            }
        });
        this.mediaButtonGallery.Surface.pipe(that.contentScrollView);
        this.mediaButtonGallery.Surface.on('click', function(){
            // alert('media adding, coming soon');
            Utils.takePicture('gallery', {}, that.uploadImage.bind(that), function(message){
                // failed taking a picture
            });
        });
        this.mediaButtonGallery.add(this.mediaButtonGallery.Surface);
        this.contentScrollView.Views.push(this.mediaButtonGallery);

    };

    PageView.prototype.create_highlight_button = function(ev){
        var that = this;

        // Create a Highlight

        this.postHighlightButtonSurface = new Surface({
            content: "Create Highlight",
            size: [undefined, 50],
            classes: ['text-center'],
            properties: {
                lineHeight: "50px",
                color: "blue",
                backgroundColor: "white",
                textDecoration: "underline"
            }

        });
        this.postHighlightButtonSurface.pipe(that.contentScrollView);
        this.contentScrollView.Views.push(this.postHighlightButtonSurface);

        // Events for surfaces
        this.postHighlightButtonSurface.on('click', function(){
            // alert('www.nemesisapp.net/games/public/' + that.model.get('_id'));
            // window.open('http://www.nemesisapp.net/game/public/' + that.model.get('_id'),'_system');
            App.history.navigate('story/add/game/' + that.model.get('_id'), {history: false});
        });

        // window.plugins.socialsharing.shareViaSMS('Wehicle code: ' + this.model.get('code').toUpperCase(), null);

    };

    PageView.prototype.create_view_online_button = function(ev){
        var that = this;

        // View Online (opens in a new window)

        this.viewOnlineButtonSurface = new Surface({
            content: "View Online",
            size: [undefined, 50],
            classes: ['text-center'],
            properties: {
                lineHeight: "50px",
                color: "blue",
                backgroundColor: "white",
                textDecoration: "underline"
            }

        });
        this.viewOnlineButtonSurface.pipe(that.contentScrollView);
        this.contentScrollView.Views.push(this.viewOnlineButtonSurface);

        // Events for surfaces
        this.viewOnlineButtonSurface.on('click', function(){
            // alert('www.nemesisapp.net/games/public/' + that.model.get('_id'));
            window.open('http://www.nemesisapp.net/game/public/' + that.model.get('_id'),'_system');
        });

        // window.plugins.socialsharing.shareViaSMS('Wehicle code: ' + this.model.get('code').toUpperCase(), null);

    };

    PageView.prototype.create_share_button = function(ev){
        var that = this;

        // Share Button

        // - only does SMS for now
        // - todo: share a SUMMARY to Facebook/Twitter/Pinterest (open graph tags could also be used)

        this.shareButtonSurface = new Surface({
            content: "Share by SMS",
            size: [undefined, 50],
            classes: ['text-center'],
            properties: {
                lineHeight: "50px",
                color: "blue",
                backgroundColor: "white",
                textDecoration: "underline"
            }

        });
        this.shareButtonSurface.pipe(that.contentScrollView);
        this.contentScrollView.Views.push(this.shareButtonSurface);

        // Events for surfaces
        this.shareButtonSurface.on('click', function(){
            // alert('www.nemesisapp.net/games/public/' + that.model.get('_id'));
            window.plugins.socialsharing.shareViaSMS('www.nemesisapp.net/game/public/' + that.model.get('_id'), null);
        });

        // window.plugins.socialsharing.shareViaSMS('Wehicle code: ' + this.model.get('code').toUpperCase(), null);

    };


    // Upload image to server
    PageView.prototype.uploadImage = function(imageURI){
        // upload = function (imageURI) {
        var ft = new FileTransfer(),
            options = new FileUploadOptions();

        options.fileKey = "file";
        options.fileName = 'filename.jpg'; // We will use the name auto-generated by Node at the server side.
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
        options.params = { // Whatever you populate options.params with, will be available in req.body at the server-side.
            "token" : App.Data.UserToken,
            "game_id" : this.model.get('_id'),
            extra: {
                "description": "Uploaded from my phone testing234"
            }
        };

        ft.onprogress = function(progressEvent) {
            
            if (progressEvent.lengthComputable) {
                // loadingStatus.setPercentage(progressEvent.loaded / progressEvent.total);
                // console.log('Percent:');
                // console.log(progressEvent.loaded);
                // console.log(progressEvent.total);
                console.log((progressEvent.loaded / progressEvent.total) * 100);
                Utils.Notification.Toast((Math.floor((progressEvent.loaded / progressEvent.total) * 1000) / 10).toString() + '%');
            } else {
                // Not sure what is going on here...
                // loadingStatus.increment();
                console.log('not computable?, increment');
            }
        };
        ft.upload(imageURI, Credentials.server_root + "/game/media",
            function (e) {
                // getFeed();
                // alert('complete');
                // alert('upload succeeded');
                Utils.Notification.Toast('Upload succeeded');
            },
            function (e) {
                alert("Upload failed");
                Utils.Notification.Toast('Upload failed');
                // Utils.Notification.Toast(e);
            }, options);
    };
    
    PageView.prototype.createFreeForAll = function(){
        var that = this;

        // scrollview
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Content
        this.ContentStateModifier = new StateModifier();
        // this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

        
        // Tie the sideView and the main body together (why the fuck are we doing it like this?)
        // - this means the origin of the SideView is at the top-left of the ContentBody, no the topLeft of the page (like I kinda expect)
        this.mainNode = new RenderNode();
        this.mainNode.add(this.contentScrollView);
        this.mainNode.add(this.sideView.OpacityModifier).add(this.sideView);

        this.sideView._eventOutput.on("menuToggle", (function(){
            this.menuToggle();
        }).bind(this));

        // Add node to content of layout
        this.layout.content.add(this.ContentStateModifier).add(this.mainNode);

        // Results
        // - places
        switch(this.model.get('sport_id.result_subtype')){
            case 'places':

                // Create SequenceLayout of items
                // - inserting that into the existing contentScrollView
                this.ResultSequenceLayout = new SequentialLayout();
                this.ResultSequenceLayout.Views = [];
                this.ResultSequenceLayout.sequenceFrom(this.ResultSequenceLayout.Views);


                // var myResult = this.model.get('player_results')[me.get('_id')];
                // console.log(me);
                // console.log(this.model.toJSON());
                // console.log(myResult);
                // debugger;


                // Player has all of the player_ids for themselves (that they "own" almost)
                var my_player_ids = App.Data.Players.findMe().get('related_player_ids');
                var matched_ids = _.intersection(this.model.get('player_ids'), my_player_ids);
                if(matched_ids.length < 1){
                    // Unable to find any _id for this player that matches!
                    // - basically, they didn't participate
                    console.log(game.player_ids);
                    console.log(my_player_ids);
                    debugger;
                    return game;
                }

                // convert matched_ids into the first matching player_id
                var found_player_id = matched_ids[0];
                var myResult = this.model.get('player_results')[found_player_id];

                this.bigResult = new View();
                this.bigResult.Surface = new Surface({
                    content: 'You placed ' + numeral(myResult.place).format('0o'),
                    size: [undefined, 40],
                    classes: ['gFreeForAll-small-flag-result','small-flag-result-place-' + (myResult.place > 3 ? '4plus':myResult.place).toString()]
                });
                this.bigResult.Surface.pipe(that.contentScrollView);
                this.bigResult.add(this.bigResult.Surface);
                this.contentScrollView.Views.push(this.bigResult);

                // Place for everybody
                // - re-ordering
                var playerOrder = []; //_.clone(this.model.get('player_results'));
                _.each(this.model.get('player_results'), function(result, player_id){
                    playerOrder.push({
                        _id: player_id,
                        result: result
                    });
                });
                playerOrder = _.sortBy(playerOrder, function(player){
                    return player.result.place;
                });

                // Create surfaces for each opponent
                _.each(playerOrder, function(player){

                    var opponent = new View();
                    opponent.Surface = new Surface({
                        content: '<span class="place-order">' + numeral(player.result.place).format('0o') + '</span>&nbsp;&nbsp;<span data-replace-id="'+player._id+'" data-replace-model="Player" data-replace-field="Profile.name"></span>',
                        size: [undefined, 40],
                        classes: ['gFreeForAll-places-order', 'places-order-' + (player.result.place > 3 ? '4plus':player.result.place).toString()],
                        properties: {
                            lineHeight: "40px",
                            padding: "0px 10px",
                            backgroundColor: "white",
                            color: "#222"
                        }
                    });
                    opponent.Surface.pipe(that.contentScrollView);
                    Utils.dataModelReplaceOnSurface(opponent.Surface);
                    opponent.add(opponent.Surface);

                    that.ResultSequenceLayout.Views.push(opponent);
                });

                // opponent_id = opponent_id[0];

                // this.opponent = new View();
                // this.opponent.Surface = new Surface({
                //     content: '<div data-replace-id="'+opponent_id+'" data-replace-model="Player" data-replace-field="name"></div>',
                //     size: [undefined, 40],
                //     properties: {
                //         lineHeight: "40px",
                //         padding: "0px 10px",
                //         backgroundColor: "white",
                //         color: "#222"
                //     }
                // });
                // Utils.dataModelReplaceOnSurface(this.opponent.Surface);
                // this.opponent.add(this.opponent.Surface);

                this.contentScrollView.Views.push(this.ResultSequenceLayout);

                break;
            default:
                console.error('Only places supported so far');
                debugger;
        }


        this.createMedia();
        this.create_highlight_button();
        this.create_share_button();
        this.create_view_online_button();

        // if(me.get('_id') == this.model.get('versus.winner_id')){
        //     // game.tmp_extras.won = true;
        //     this.model.set('tmp_extras.won', true);
        //     this.model.set('tmp_extras.opponent_id', this.model.get('versus.loser_id'));
        // }
        // if(me.get('_id') == this.model.get('versus.loser_id')){
        //     this.model.set('tmp_extras.lost', true);
        //     this.model.set('tmp_extras.opponent_id', this.model.get('versus.winner_id'));
        //     // game.tmp_extras.lost = true;
        //     // game.tmp_extras.opponent_id = game.versus.winner_id;
        // }

        // // Win/Lost/Tie
        // // Ties allowed?
        // if(this.model.get('sport_id.ties_allowed')){

        // }


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

                App.history.modifyLast({
                    tag: 'Game'
                });

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
