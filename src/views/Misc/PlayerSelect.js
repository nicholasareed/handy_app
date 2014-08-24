/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var Lightbox = require('famous/views/Lightbox');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var ContainerSurface    = require("famous/surfaces/ContainerSurface");

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Utils = require('utils');

    // Models
    var PlayerModel = require('models/player');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        if(!this.options.App.Cache.PlayerSelectOptions){
            App.history.back();//.history.go(-1);
            return;
        }


        // Add to new ".passed" options, separate from this.options.App and other root-level arguments/objects
        this.options.passed = _.extend({
            title: 'Select Player',
            back_to_default_hint: true
        }, App.Cache.PlayerSelectOptions || {});

        // "selected_players" is an array of objects with an _id corresponding to the player_id (use Utils.dataModelReplaceOnSurface)
        this.selected_players = this.options.passed.selected_players || [];

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();

        // Create Content Views
        this.lightbox = new RenderController();


        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: "Loading Players",
            size: [undefined, 100],
            properties: {
                color: "black",
                backgroundColor: "#F8F8F8",
                textAlign: "center"
            }
        });
        this.emptyListSurface = new Surface({
            content: "No Players!",
            size: [undefined, 100],
            properties: {
                color: "black",
                backgroundColor: "#F8F8F8",
                textAlign: "center"
            }
        });

        // Create the "current player" list
        // - leaving it at an individual player (for now)
        // - supports multiple players, but let's keep it simple for now (tap to change to a different player)
        this.currentPlayerSurface = new Surface({
            size: [undefined, 70],
            content: "No Player Selected",
            properties: {
                color: "black",
                background: "white",
                lineHeight: "70px",
                borderBottom: "2px solid #444",
                zIndex: "10"
            }
        });
        // Update currentPlayerSurface
        if(this.selected_players.length > 0){
            this.currentPlayerSurface.setContent('<span class="ellipsis full" data-replace-model="player"  data-replace-id="'+this.selected_players[0]._id+'"  data-replace-field="Profile.name">&nbsp;</span>');
            Utils.dataModelReplaceOnSurface(this.currentPlayerSurface);
        }

        // create the "select from" Player List scroller
        this.playerScrollView = new ScrollView(App.Defaults.ScrollView);
        this.playerScrollSurfaces = [];
        this.playerScrollView.sequenceFrom(this.playerScrollSurfaces);

        // Player selection (names of current and possible)
        this.PlayerSeqLayout = new HeaderFooterLayout({
            headerSize: 70,
            footerSize: App.Defaults.Footer.size
        });

        this.PlayerSeqLayout.header.add(this.currentPlayerSurface);
        this.PlayerSeqLayout.content.add(this.playerScrollView);


        // Content
        this.layout.content.StateModifier = new StateModifier();
        this.layout.content.add(this.layout.content.StateModifier).add(Transform.behind).add(this.PlayerSeqLayout);

        // Attach layout to the context
        this.add(this.layout);


        // // Sequence from for the SequentialLayout
        // this.seqLayout.sequenceFrom([
        //     this.currentPlayerSurface,
        //     this.scroll_h1_cont
        //     // this.playerScrollView
        // ]);

        // Models

        // Player
        this.collection = new PlayerModel.PlayerCollection();
        if(this.collection.length == 0){
            this.lightbox.show(this.loadingSurface);
        }
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addOne, this);
        this.collection.on("remove", function(Model){
            // This was a remove as triggered by the collection
            // - we want to differentiate from a move triggered elsewhere? (like by our same view, we might want to animate differently)
            this.scrollSurfaces = _.reject(this.scrollSurfaces, function(scrollSurface){
                return scrollSurface.ModelId === Model.get('_id') ? true : false;
            });

            // Re-sequence (unfortunate that I have to do this, thought it would auto-resequence)
            this.playerScrollView.sequenceFrom(this.scrollSurfaces);
        }, this);
        this.collection.on("cachesync", function(collection){
            // got a "prefill" value
            // - no need to update anything, just use the normal add/remove
        });

        this.collection.fetch({prefill: true});



    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: this.options.passed.title,
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.updateCollectionStatus = function() { 

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.playerScrollView;
        }

        if(nextRenderable != this.lightbox.lastRenderable){
            this.lightbox.lastRenderable = nextRenderable;
            this.lightbox.show(nextRenderable);
        }

    };

    PageView.prototype.addOne = function(Model) { 
        var that = this;
        ModelIndex = this.playerScrollSurfaces.length;

        var playerSurface = new Surface({
            size: [undefined, 60],
            content: Model.get('name'),
            properties: {
                // color: "white",
                // backgroundColor: "hsl(" + ((TripIndex + 21) * 360 / 40) + ", 100%, 50%)",
                // backgroundColor: "white",
                backgroundColor: "#F8F8F8",
                borderBottom: "1px solid #ddd",
                color: "blue",
                lineHeight: "60px",
                padding: "0px 8px",
                zIndex: "-1"
            }
        });
        // Utils.dataModelReplaceOnSurface(tripSurface);
        Model.on('change', function(){
            // playerSurface.setContent(tripContent());
            // Utils.dataModelReplaceOnSurface(playerSurface);
        }, this);
        playerSurface.pipe(that.playerScrollView);
        playerSurface.on('click', function(){
            var selectedPlayer = [
                {
                    _id: Model.get('_id')
                }
            ];
            if(that.options.passed.on_choose){
                that.options.passed.on_choose(selectedPlayer);
            }
        });
        this.playerScrollSurfaces.push(playerSurface);

        this.playerScrollView.sequenceFrom(this.playerScrollSurfaces);

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

                        // Content
                        window.setTimeout(function(){

                            // Bring content back
                            that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.inTransition);

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

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth, 0, 0));

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring content back
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };



    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
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
