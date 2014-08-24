/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var ScrollContainer = require('famous/views/ScrollContainer');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode')

    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Backbone = require('backbone-adapter');

    // Models
    var GameModel = require("models/game");
    var PlayerModel = require("models/player");
    var InviteModel = require('models/invite');

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    // var tpl                 = require('text!./tpl/PlayerGameList.html');
    // var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // Load models
        this.loadModels();

        // this.contentLayout = new SequentialLayout();
        this.contentLayout = new ScrollView();
        // this.contentLayout = new ScrollContainer();
        this.contentLayout.Views = [];
        this.contentLayout.sequenceFrom(this.contentLayout.Views);


        this.createDefaultSurfaces();
        this.createDefaultLightboxes(); // begins by showing "loading" surface

        this.add(this.lightboxContent);

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;

    SubView.prototype.loadModels = function(player_id){
        var that = this;

        this.event_id = this.options.args[0];

        // Clear loading, if it exists

        // Create collection of Games for player_id
        this.collection = new InviteModel.InviteCollection([], {
            type: 'event',
            event_id: that.event_id
        });
        this.collection.on("add", this.addOne, this);
        this.collection.on('sync', this.updateCollectionStatus.bind(this));

        this._eventInput.on('add-player', function(InviteModel){
            // Make sure player doesn't already exist in list
            that.collection.add(InviteModel);
            that.updateCollectionStatus();
        });
        this._eventInput.on('remove-player', function(InviteModel){
            that.collection.remove(InviteModel);
            that.contentLayout.Views = _.filter(that.contentLayout.Views, function(tmpView){
                if(tmpView.Model == InviteModel){
                    return false;
                }
                return true;
            });
            that.updateCollectionStatus();
        });

        this.collection.pager({prefill: true});

    };
    SubView.prototype.createDefaultSurfaces = function(){
        var that = this;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.emptyListSurface = new Surface({
            content: "None to Show",
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
                // backgroundColor: 'red'
            }
        });
        this.emptyListSurface.pipe(this._eventOutput);

    };

    SubView.prototype.createDefaultLightboxes = function(){
        var that = this;

        // Content Lightbox
        this.lightboxContent = new RenderController();
        this.lightboxContent.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    this.lastSize = [undefined, s[1]];
                    return [undefined, s[1]];
                }
            }catch(err){}
            // Last Size?
            if(this.lastSize){
                return this.lastSize;
            }
            return [undefined, true];
        };
        this.lightboxContent.show(this.emptyListSurface);

    };

    SubView.prototype.addOne = function(Model) {
        var that = this;

        var tmpView = new View();
        tmpView.Model = Model;

        // this.contentScrollView.Views.push(tmpLayout);
        this.contentLayout.Views.push(tmpView);

        // Get the Player first
        var Player = new PlayerModel.Player({
            _id: Model.get('to_player_id')
        });
        if(!Player.hasFetched){
            Player.fetch({prefill: true});
        }
        Player.populated().then((function(){
            
            tmpView.Player = Player;

            var name = Player.get('Profile.name');
            if(!name){
                name = Player.get('name');
            }
            var username = Player.get('Profile.username');
            if(username === false){
                username = 'Offline Nemesis';
            } else {
                username = '@' + username;
            }

            // photo
            var photoUrl = 'img/generic-profile.png';
            if(Player.get('Profile.photo.urls')){
                photoUrl = Player.get('Profile.photo.urls.thumb100x100');
            }

            var tmpLayout = new View();

            // ratio for FlexibleLayout
            var ratios = [];
            // Image
            ratios.push(true);
            // Name
            ratios.push(1);

            // Build View for FlexibleLayout
            tmpLayout.Grid = new FlexibleLayout({
                direction: 0, // X
                ratios: ratios
            });
            tmpLayout.Views = [];
            tmpLayout.SizeMod = new StateModifier({
                size: [undefined, 80]
            });
            tmpLayout.add(tmpLayout.SizeMod).add(tmpLayout.Grid);

            var surfaceClick = function(){

            };
            
            // photo
            var tempImage = new ImageSurface({
                content: photoUrl,
                size: [60,60],
                properties: {
                    borderRadius: '50%',
                    border: "1px solid #ddd"
                }
            });
            tempImage.pipe(this.contentLayout);
            tempImage.on('click', surfaceClick.bind(this));
            tmpLayout.Views.push(tempImage);

            // name
            var tempName = new Surface({
                 content: '<div>' + name + '</div><div>' +username+'</div>',
                 size: [undefined, 60],
                 classes: ['player-list-item-default']
            });
            tempName.pipe(this.contentLayout);
            tmpLayout.Views.push(tempName);

            tmpLayout.Grid.sequenceFrom(tmpLayout.Views);

            tmpView.add(tmpLayout);

        }).bind(that));

    };

    SubView.prototype.updateCollectionStatus = function() { 
        console.info(this.collection);
        var nextRenderable;
        if(this.collection.length == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.contentLayout;
        }

        if(nextRenderable != this.lightboxContent.lastRenderable){
            this.lightboxContent.lastRenderable = nextRenderable;
            this.lightboxContent.show(nextRenderable);
        }

        if(this.contentLayout.Views.length > 0){

            this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(tmpView){
                // console.log(tmpView.Model.get('created'));
                try {
                    var tmpName = tmpView.Model.get('Profile.name').toString().toLowerCase();
                }catch(err){
                    return 'zzzzzz';
                }
                return tmpName;
            });

            this.contentLayout.sequenceFrom(this.contentLayout.Views);
        }

    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
