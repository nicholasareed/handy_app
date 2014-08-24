define(function(require, exports, module) {
    // Famous Modules
    var Surface    = require('famous/core/Surface');
    var Modifier   = require('famous/core/Modifier');
    var Transform  = require('famous/core/Transform');
    var View       = require('famous/core/View');
    var GridLayout = require('famous/views/GridLayout');

    var ScrollView = require('famous/views/Scrollview');

    var EventHandler = require('famous/core/EventHandler');
    var PlayerModel    = require('models/player');

    function SideView(params) {
        var that = this;
        View.apply(this, arguments);

        this.open = false;

        // Background surface
        this.bgSurface = new Surface({
            size: [undefined, undefined],
            content: "",
            properties: {
                backgroundColor: "#111",
                zIndex: "-1"
            }
        });
        this.bgSurface.on('swipe', (function(){
            this._eventOutput.emit("menuToggle");
        }).bind(this));
        this.bgSurface.on('click', (function(){
            this._eventOutput.emit("menuToggle");
        }).bind(this));

        this.hinge = new Modifier({
            transform: Transform.thenMove(Transform.identity, [window.innerWidth + 100, 0, 0]) // rotateY(-Math.PI/2.5)
        });

        // Create ScrollView
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];
        this.modelSurfaces = {};
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);


        // Player list
        this.collection = new PlayerModel.PlayerCollection();
        this.collection.on("reset", function(collection){
        }, this);
        this.collection.on("add", this.addOne, this);
        this.collection.on("remove", function(Model){
            // This was a remove as triggered by the collection
            // - we want to differentiate from a move triggered elsewhere? (like by our same view, we might want to animate differently)
            this.scrollSurfaces = _.without(this.scrollSurfaces, this.modelSurfaces[Model.get('_id')]);

            // Re-sequence (unfortunate that I have to do this, thought it would auto-resequence)
            this.contentScrollView.sequenceFrom(this.scrollSurfaces);
        }, this);
        this.collection.on("cachesync", function(collection){
            // got a "prefill" value
            // - no need to update anything, just use the normal add/remove
        });
        this.collection.fetch({prefill: true});

        // Add "New Player" button below list of players
        this.addNewPlayerButton();

        // turn this.layout into a HeaderFooterLayout??
        this.layout = this.contentScrollView;

        // Add modifiers
        var hingeNode = this._add(new Modifier({size : [200, undefined]})).add(new Modifier({origin : [0,0]})).add(this.hinge)
        hingeNode.add(this.bgSurface);
        hingeNode.add(this.layout);

    }

    SideView.prototype = Object.create(View.prototype);
    SideView.prototype.constructor = SideView;

    SideView.prototype.refreshData = function(Model) { 
        this.collection.fetch();
    };

    SideView.prototype.addOne = function(Model) { 

        if(Model.get('is_me')){
            return;
        }
        // console.log(ModelIndex);
        var ModelIndex = this.collection.indexOf(Model);

        var temp = new Surface({
             content: Model.get('name'),
             size: [200, 60],
             properties: {
                 color: "black",
                 backgroundColor: "white",
                 borderBottom: "1px solid black",
                 lineHeight: "60px",
                 padding: "0 8px"
                 // textAlign: "center"
             }
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

        // Model change
        Model.on('change:name', function(ModelTmp){
            temp.setContent(ModelTmp.get('name'));
        }, this);
        this.scrollSurfaces.unshift(temp);

        this.modelSurfaces[Model.get('_id')] = temp;

    }

    SideView.prototype.addNewPlayerButton = function(Car, CarIndex) { 
        
        var temp = new Surface({
             content: "New Player",
             size: [200, 60],
             properties: {
                 color: "white",
                 backgroundColor: "#444",
                 lineHeight: "60px",
                 padding: "0 8px",
                 border: "1px solid black"
             }
        });
        temp.pipe(this.contentScrollView);
        temp.on('click', (function(){
            this._eventOutput.emit("menuToggle");
            App.history.navigate('player/add', {trigger: true});
        }).bind(this));
        this.scrollSurfaces.push(temp);

    }

    SideView.prototype.flipOut = function() {
        this.refreshData();
        this.hinge.setTransform(Transform.translate(window.innerWidth, 0, 0), { duration: 500, curve: 'easeOut' });
    }

    SideView.prototype.flipIn = function() {
        this.hinge.setTransform(Transform.thenMove(Transform.identity, [window.innerWidth + 100, 0, 0]), { duration: 500, curve: 'easeOut' });
    };


    module.exports = SideView;
});