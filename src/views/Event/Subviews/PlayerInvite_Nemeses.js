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

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Backbone = require('backbone-adapter');

    // Models
    var PlayerModel = require("models/player");
    var InviteModel = require("models/invite");

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
        this.contentLayout.Views = [];

        this.createDefaultSurfaces();
        this.createDefaultLightboxes(); // begins by showing "loading" surface

        this.contentLayout.Views.push(this.lightboxButtons);
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        this.add(this.lightboxContent);

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;


    SubView.prototype.loadModels = function(player_id){
        var that = this;

        // Clear loading, if it exists
        this.event_id = this.options.args[0];

        // Create collection of Games for player_id
        this.collection = new PlayerModel.PlayerCollection([],{
            player_id: App.Data.Players.findMe().get('_id')
        });
        this.collection.infiniteResults = 0;
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addOne, this);
        this.collection.on("error", function(){
            console.error('Collection error');
            // // Already fetched successfully?
            // if(this.collection.hasFetched){
            //     Utils.Notification.Toast('Error when updating');
            // } else {
            //     Utils.Notification.Toast('Attempting to reload games');
            //     this.collection.pager({reset: true});
            // }
        });

        this.collection.on("request", function(){
            // todo

        });

        this.collection.fetch({prefill: true});

    };
    SubView.prototype.createDefaultSurfaces = function(){
        var that = this;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: "Loading",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.loadingSurface.pipe(this._eventOutput);
        this.emptyListSurface = new Surface({
            content: "None to Show",
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
                // backgroundColor: 'red'
            }
        });
        this.emptyListSurface.pipe(this._eventOutput);


        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default']
        });
        this.infinityLoadingSurface.pipe(this._eventOutput);

        // Loaded 'em all!
        // - shows "X total events"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default']
        });
        this.infinityLoadedAllSurface.pipe(this._eventOutput);

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default']
        });
        this.infinityShowMoreSurface.pipe(this._eventOutput);
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });
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
        this.lightboxContent.show(this.loadingSurface);

        // Buttons lightbox
        this.lightboxButtons = new RenderController();
        this.lightboxButtons.getSize = function(){
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
        this.lightboxButtons.show(this.infinityLoadingSurface);

    };

    SubView.prototype.addOne = function(Model) { 
        var that = this;

        // if(Model.get('_id') == that.player_id || Model.get('is_me') === true){
        //     return;
        // }

        var ModelIndex = this.collection.indexOf(Model);
        var name = Model.get('Profile.name');
        if(!name){
            name = Model.get('name');
        }
        var username = Model.get('Profile.username');
        if(username === false){
            username = 'Offline Nemesis';
        } else {
            username = '@' + username;
        }

        // photo
        var photoUrl = 'img/generic-profile.png';
        if(Model.get('Profile.photo.urls')){
            photoUrl = Model.get('Profile.photo.urls.thumb100x100');
        }

        var tmpLayout = new View();
        tmpLayout.Model = Model;
        tmpLayout.Grid = new FlexibleLayout({
            direction: 0, // X
            ratios: [true, 1]
        });
        tmpLayout.Views = [];
        tmpLayout.SizeMod = new StateModifier({
            size: [undefined, 60]
        });
        tmpLayout.add(tmpLayout.SizeMod).add(tmpLayout.Grid);

        var surfaceClick = function(){

            // // Selecting multiple players?
            // if(that.useMultiple == true || 1==1){
            //     // multiple
            //     // - already in the array?
            //     if(that.selected_players.indexOf(Model) === -1){
            //         // Add it
            //         that.selected_players.push(Model);
            //         that._eventOutput.emit('add-player',Model);
            //         tempName.emit('selected');
            //     } else {
            //         that.selected_players = _.without(that.selected_players, Model);
            //         that._eventOutput.emit('remove-player',Model);
            //         tempName.emit('de-selected');
            //     }
            //     return;
            // } else {
            //     // return this one
            //     that.selected_players = [
            //         Model
            //     ];
            // }
            // if(that.options.passed.on_choose){
            //     that.options.passed.on_choose(that.selected_players);
            // }

            var Invite = new InviteModel.Invite({
                type: 'event',
                event_id: that.event_id,
                player_id: Model.get('_id')
            });

            Invite.save({},{
                success: function(newModel, resp, x){
                    if(resp.msg){
                        Utils.Notification.Toast(resp.msg);
                    }
                }
            });

        };

        // photo
        var tempImage = new ImageSurface({
            content: photoUrl,
            size: [60,60]
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
        tempName.on('click', surfaceClick.bind(this));
        tempName.on('selected', function(){
            tempName.addClass('selected');
        });
        tempName.on('de-selected', function(){
            tempName.removeClass('selected');
        });
        tmpLayout.Views.push(tempName);

        tmpLayout.Grid.sequenceFrom(tmpLayout.Views);

        // this.contentScrollView.Views.push(tmpLayout);
        this.contentLayout.Views.splice(this.contentLayout.Views.length - 1, 0, tmpLayout);

    };

    SubView.prototype.updateCollectionStatus = function() { 

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent(amount_left + ' more');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' total');

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.contentLayout;
        }

        if(nextRenderable != this.lightboxContent.lastRenderable){
            this.lightboxContent.lastRenderable = nextRenderable;
            this.lightboxContent.show(nextRenderable);
        }


        // // Resort the contentLayout.Views
        // this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(surface){
        //     var m = moment(surface.Model.get('start_time'));
        //     return m.format('X') * -1;
        // });

        if(this.contentLayout.Views.length > 0){

            // sort correctly
            var popped = this.contentLayout.Views.pop();

            this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(tmpView){
                // console.log(tmpView.Model.get('created'));
                console.log(tmpView);
                var tmpName = tmpView.Model.get('Profile.name');
                if(!tmpName){
                    tmpName = tmpView.Model.get('name');
                }
                tmpName = tmpName.toLowerCase();

                // Move "Me" to the very top
                if(tmpView.Model.get('Profile.user_id') == App.Data.User.get('_id')){
                    return 'aaaaaaaaaaaaa';
                }

                return tmpName;
            });

            this.contentLayout.Views.push(popped);

            this.contentLayout.sequenceFrom(this.contentLayout.Views);
        }

        // this.layout.sequenceFrom([]);
        // this.layout.sequenceFrom([
        //     // this.contentLayout, // another SequentialLayout
        //     this.lightboxContent,
        //     this.lightboxButtons
        // ]);

        // Show correct infinity buttons (More, All, etc.)
        this.render_infinity_buttons();

    };

    SubView.prototype.render_infinity_buttons = function(){
        // Renders the correct infinity-list buttons (the "Show More" or "Is loading" button/hint) at the bottom of the page

        // // Hide all dat shit
        // // - unnecessary?
        // this.$('.load-list').addClass('nodisplay');

        if(this.collection.hasFetched){
            // at the end?
            if(this.collection.infiniteResults == this.collection.totalResults){
                this.lightboxButtons.show(this.infinityLoadedAllSurface);
                // this.$('.loaded-all').removeClass('nodisplay');
            } else {
                // Show more
                // - also includes the number more to show :)
                this.lightboxButtons.show(this.infinityShowMoreSurface);
                // this.$('.show-more').removeClass('nodisplay');
            }
        } else {
            // not yet fetched, so display the "loading" one
            this.lightboxButtons.show(this.infinityLoadingSurface);
            // this.$('.loading-progress').removeClass('nodisplay');
        }

    };

    SubView.prototype.refresh_any_new = function(){
        // Load any newly-created (since we last loaded) models
        // - todo...

        // bascially like next_page, right?

        // Load more games
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');
        // debugger;

        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
    };

    SubView.prototype.next_page = function(){
        // Load more games
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');
        // debugger;

        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
