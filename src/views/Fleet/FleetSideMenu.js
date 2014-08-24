define(function(require, exports, module) {
    // Famous Modules
    var Surface    = require('famous/core/Surface');
    var Modifier   = require('famous/core/Modifier');
    var StateModifier   = require('famous/modifiers/StateModifier');
    var Transform  = require('famous/core/Transform');
    var View       = require('famous/core/View');
    var GridLayout = require('famous/views/GridLayout');
    var Timer = require('famous/utilities/Timer');

    var ScrollView = require('famous/views/Scrollview');

    var EventHandler = require('famous/core/EventHandler');

    // Curves
    var Easing = require('famous/transitions/Easing');

    var _ = require('underscore');

    // Models
    var CarModel    = require('models/car');

    function SideView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        this.open = false;

        // Background surface
        this.bgSurface = new Surface({
            size: [undefined, undefined],
            content: "",
            properties: {
                // backgroundColor: "#111", // invisible!
                zIndex: "-2"
            }
        });
        this.bgSurface.on('swipe', (function(){
            this._eventOutput.emit("menuToggle");
        }).bind(this));
        this.bgSurface.on('click', (function(){
            this._eventOutput.emit("menuToggle");
        }).bind(this));

        this.hinge = new StateModifier({ // used to be a Modifier, not a StateModifier
            // transform: Transform.thenMove(Transform.identity, [-1 * this.options.width, 0, 0]) // rotateY(-Math.PI/2.5)
        });

        // Create ScrollView
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];
        this.modelSurfaces = {};
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // Car list
        this.collection = new CarModel.CarCollection();
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
        this.collection.fetch({prefill: true, data: {}});

        // Add "New Driver" button below list of drivers
        this.addNewCarButton();

        // turn this.layout into a HeaderFooterLayout??
        this.layout = this.contentScrollView;

        var node = this.add(); //this.add(new Modifier({size : [200, undefined]}));
        // node.add(bgSurface);
        // var hingeNode = node.add(new Modifier({origin : [1,0]})).add(this.hinge);
        var hingeNode = node.add(new Modifier({
            origin : [0,0],
            transform: Transform.thenMove(Transform.identity, [0, 91, 0]) // rotateY(-Math.PI/2.5)
        })).add(this.hinge);
        hingeNode.add(this.bgSurface);
        hingeNode.add(this.layout);
   
    }

    SideView.prototype = Object.create(View.prototype);
    SideView.prototype.constructor = SideView;

    SideView.prototype.refreshData = function(Car, CarIndex) { 
        this.collection.fetch();
    };

    SideView.prototype.addOne = function(Car, CarIndex) { 
        
        var temp = new Surface({
             content: Car.get('name'),
             size: [this.options.width, this.options.height],
             properties: {
                 color: "white",
                 backgroundColor: Car.get('color'),
                 lineHeight: "50px",
                 padding: "0 8px",
                 zIndex: "0"
             }
        });

        // Push surface/View to sequence
        temp.View = new View();
        temp.View.positionModifier = new StateModifier({
            transform: Transform.translate(-250,40,0)
        });
        temp.View.rotateModifier = new StateModifier({
            transform: Transform.rotateZ(this.options.angle)
        });
        temp.View.skewModifier = new StateModifier({
            transform: Transform.skew(0, 0, this.options.angle)
        });

        temp.View.add(temp.View.positionModifier).add(temp.View.rotateModifier).add(temp.View.skewModifier).add(temp);
        

        // Events
        temp.pipe(this.contentScrollView);
        temp.on('click', (function(){
            this._eventOutput.emit("menuToggle");
            App.history.navigate('car/' + Car.get('_id'), {trigger: true});
        }).bind(this));
        temp.on('swipe', (function(){
            this._eventOutput.emit("menuToggle");
        }).bind(this));

        // Model change
        Car.on('change:name', function(ModelTmp){
            temp.setContent(ModelTmp.get('name'));
        }, this);


        this.scrollSurfaces.unshift(temp.View);

        this.modelSurfaces[Car.get('_id')] = temp.View;

    }

    SideView.prototype.addNewCarButton = function(Car, CarIndex) { 
        
        var temp = new Surface({
             content: "New Car",
             size: [this.options.width, this.options.height],
             properties: {
                 color: "black",
                 backgroundColor: "white",
                 lineHeight: "50px",
                 padding: "0 8px"
             }
        });

        // Push surface/View to sequence
        temp.View = new View();
        temp.View.positionModifier = new StateModifier({
            transform: Transform.translate(-250,40,0)
        });
        temp.View.rotateModifier = new StateModifier({
            transform: Transform.rotateZ(this.options.angle)
        });
        temp.View.skewModifier = new StateModifier({
            transform: Transform.skew(0, 0, this.options.angle)
        });
        temp.View.add(temp.View.positionModifier).add(temp.View.rotateModifier).add(temp.View.skewModifier).add(temp);

        temp.pipe(this.contentScrollView);
        temp.on('click', (function(){
            this._eventOutput.emit("menuToggle");
            App.history.navigate('car/add', {trigger: true});
        }).bind(this));


        this.scrollSurfaces.push(temp.View);

    }

    SideView.prototype.flipOut = function() {
        var that = this;

        this.refreshData();

        this.scrollSurfaces.forEach(function(view, index){
            Timer.setTimeout(function(index) {
                console.log(that.scrollSurfaces);
                that.scrollSurfaces[index].positionModifier.setTransform(Transform.translate(0,0,0), {
                    duration: 500,
                    curve: Easing.easeIn
                });
            }.bind(this, index), 50 * index);
        });

        // this.hinge.setTransform(Transform.translate(-200, 0, 0), { duration: 500, curve: 'easeOut' });
    }

    SideView.prototype.flipIn = function() {
        // this.hinge.setTransform(Transform.thenMove(Transform.identity, [-200, 0, 0]), { duration: 500, curve: 'easeOut' }); // Transform.rotateY(-Math.PI/2.2)

        this.scrollSurfaces.reverse().forEach(function(view, index){
            window.setTimeout(function(){
                view.positionModifier.setTransform(Transform.translate(-250,40,0), {
                    duration: 500,
                    curve: Easing.outBack
                });
            }, 50 * index);
        });

        this.scrollSurfaces.reverse();

    };

    SideView.DEFAULT_OPTIONS = {
        width: 210,
        height: 50,
        angle: -0.2
    };


    module.exports = SideView;
});