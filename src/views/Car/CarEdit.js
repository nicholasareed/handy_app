/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
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

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');

    var EventHandler = require('famous/core/EventHandler');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var CarModel = require('models/car');

    // Extras
    var Utils = require('utils');
    var tinycolor           = require('lib2/tinycolor');
    var spectrum            = require('lib2/spectrum');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;


        // Model
        this.model = new CarModel.Car({
            _id: this.options.args[0]
        });

        // Fetch and process
        this.model.fetch({prefill: true});
        this.model.populated().then(this.addSurfaces.bind(this));

        // Layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();
        // this.createFooter();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: "Edit Vehicle",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            window.history.go(-1);
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function() {
        // ScrollView
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.scrollSurfaces = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.scrollSurfaces);

        // Add to layout, with a Modifier
        this.layout.content.StateModifier = new StateModifier();
        this.layout.content.add(this.layout.content.StateModifier).add(Transform.behind).add(this.contentScrollView);
    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView
        this.inputNameSurface = new InputSurface({
            name: 'name',
            placeholder: 'Name',
            type: 'text',
            size: [200, 50],
            value: this.model.get('name')
        });
        this.scrollSurfaces.push(this.inputNameSurface);

        var inputColorId = Utils.Base64.encode(this.model.get('_id') + new Date());
        this.inputColorSurface = new InputSurface({
            id: inputColorId,
            name: 'color',
            placeholder: '',
            type: 'color',
            size: [undefined, 200],
            value: this.model.get('color')
        });
        this.scrollSurfaces.push(this.inputColorSurface);

        $('#' + inputColorId).waitUntilExists((function(){
            this.$('#' + inputColorId).spectrum();
        }).bind(this));

        this.submitButtonSurface = new Surface({
            size: [undefined,40],
            classes: ['button-surface'],
            content: 'Save Car',
            properties: {
                lineHeight : "20px"
            }
        });
        this.scrollSurfaces.push(this.submitButtonSurface);

        // Events for surfaces
        this.submitButtonSurface.on('click', this.save_car.bind(this));


    };

    PageView.prototype.save_car = function(ev){
        var that = this;

        // validate name
        var name = $.trim(this.inputNameSurface.getValue().toString());
        if(name.length === 0){
            return;
        }

        // Disable submit
        this.submitButtonSurface.setSize([0,0]);

        // Get color
        var newColor = tinycolor(this.inputColorSurface.getValue().toString());

        // Update model
        // - use PATCH
        this.model.save({
            name: name,
            color: newColor.toHexString()
        },{
            patch: true,
            success: function(response){
                // console.log(response);
                // debugger;
                window.history.go(-1);
                // App.history.navigate('driver/' + that.model._id, {trigger: true});
            }
        });
        

        // this.model.save()
        //     .then(function(newModel){
                
        //         // Enable submit
        //         that.submitButtonSurface.setSize([undefined, 40]);

        //         // Clear driver cache
        //         // - todo...

        //         // Redirect to the new user
        //         // that.$('.back-button').trigger('click');
        //         App.history.navigate('driver/' + newModel._id, {trigger: true});
                

        //     });

        return false;
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

                        // Default position
                        that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth, 0, 0));

                        // Content
                        window.setTimeout(function(){

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);


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
