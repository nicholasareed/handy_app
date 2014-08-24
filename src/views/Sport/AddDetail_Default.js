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
    var InputSurface = require('famous/surfaces/InputSurface');

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Utils = require('utils');

    // Models
    var SportModel = require('models/sport');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // Add to new ".passed" params, separate from this.params.App and other root-level arguments/objects
        this.params.passed = _.extend({
            title: 'Details',
            back_to_default_hint: true
        }, App.Cache.DetailOptions || {});

        // Create according to the model's "result_type"
        this.model = this.params.App.Cache.DetailOptions.summary.sport;
        
        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();


        // Attach layout to the context
        this.add(this.layout);


    };

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: this.params.passed.title,
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
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

        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Gathering more details

            // name: this.summary.detail.name,
            // result_type: this.summary.detail.result_type, // 1v1, free-for-all
            // result_subtype: this.summary.detail.result_subtype, // places (1st, 2nd, 3rd)
            // scoring_schema: this.summary.detail.scoring_schema,    
            // result_schema: this.summary.detail.result_schema,


        // Name of sport
        this.nameInput = new View();
        this.nameInput.Surface = new InputSurface({
            size: [undefined, 60],
            placeholder: this.model.get('name'),
            properties: {
                backgroundColor: "white",
                color: "black",
                lineHeight: "60px",
                padding: "0px 8px",
                zIndex: "-1"
            }
        });
        this.nameInput.add(this.nameInput.Surface);
        this.nameInput.Surface.pipe(that.contentScrollView);
        this.contentScrollView.Views.push(this.nameInput);


        // 1v1 or Free-for-All
        this.resultTypeInput = new View();
        this.resultTypeInput.Surface = new Surface({
            size: [undefined, 60],
            content: this.model.get('result_type'),
            properties: {
                backgroundColor: "white",
                color: "black",
                lineHeight: "60px",
                padding: "0px 8px",
                zIndex: "-1"
            }
        });
        this.resultTypeInput.Data = this.model.get('result_type');
        this.resultTypeInput.Surface.on('click', function(){

            // Slide to the change screen for the player
            that.previousPage = window.location.hash;

            // Slide page
            App.Cache.OptionModal = {
                // selected_players: this.model.get('players') ? this.model.get('players') : [],
                list: [
                    {
                        text: "1v1",
                        value: "1v1"
                    },
                    {
                        text: "Free-For-All",
                        value: "free-for-all"
                    }
                ],
                on_choose: function(chosen_type){
                    that.resultTypeInput.Surface.setContent(chosen_type.text);
                    that.resultTypeInput.Data = chosen_type.value;
                    // console.log(chosen_type.value);
                    // debugger;
                    // App.history.navigate(that.previousPage);
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                },
                title: 'Basic Setup',
                back_to_default_hint: false
            };

            // Change history (must)
            App.history.navigate('modal/list', {history: false});

        });
        this.resultTypeInput.add(this.resultTypeInput.Surface);
        this.resultTypeInput.Surface.pipe(that.contentScrollView);
        this.contentScrollView.Views.push(this.resultTypeInput);

        // Subtype (places, other)
        this.resultSubTypeInput = new View();
        this.resultSubTypeInput.Surface = new Surface({
            size: [undefined, 60],
            content: this.model.get('result_type'),
            properties: {
                backgroundColor: "white",
                color: "black",
                lineHeight: "60px",
                padding: "0px 8px",
                zIndex: "-1"
            }
        });
        this.resultSubTypeInput.Data = this.model.get('result_subtype');
        // not adding to the view!

        // Submit/Save
        this.submitButton = new View();
        this.submitButton.Surface = new Surface({
            size: [undefined, 60],
            content: 'Save Game',
            properties: {
                backgroundColor: "#F8F8F8",
                borderBottom: "1px solid #ddd",
                color: "blue",
                lineHeight: "60px",
                padding: "0px 8px",
                zIndex: "-1"
            }
        });
        this.submitButton.add(this.submitButton.Surface);
        this.submitButton.Surface.pipe(that.contentScrollView);
        this.submitButton.Surface.on('click', function(){

            // name: this.summary.detail.name,
            // result_type: this.summary.detail.result_type, // 1v1, free-for-all
            // result_subtype: this.summary.detail.result_subtype, // places (1st, 2nd, 3rd)
            // scoring_schema: this.summary.detail.scoring_schema,    
            // result_schema: this.summary.detail.result_schema,

            if(that.params.passed.on_choose){
                that.params.passed.on_choose({
                    name: that.nameInput.Surface.getValue(),
                    result_type: that.resultTypeInput.Data, // 1v1, free-for-all
                    result_subtype: that.resultSubTypeInput.Data, // places (1st, 2nd, 3rd)
                    scoring_schema: that.model.get('scoring_schema'),  
                    result_schema: that.model.get('result_schema')
                });
            }
        });
        this.contentScrollView.Views.push(this.submitButton);


        // Content
        this.layout.content.StateModifier = new StateModifier();
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);
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
                    // window.setTimeout(this.refreshData.bind(this), 1000);
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
