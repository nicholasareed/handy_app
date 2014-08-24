/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
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
    var numeral = require('lib2/numeral.min');


    // Models
    var SportModel = require('models/sport');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // Add to new ".passed" params, separate from this.params.App and other root-level arguments/objects
        this.params.passed = _.extend({
            title: 'Win/Lose/Tie?',
            back_to_default_hint: true
        }, App.Cache.ResultOptions || {});

        // Create according to the model's "result_type"
        this.model = this.params.App.Cache.ResultOptions.sport;

        
        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();

        // create the "select from" Sport List scroller
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Done button
        this.doneButton = new View();
        this.doneButton.Surface = new Surface({
            content: "Tap Here When Done",
            size: [undefined, 60],
            classes: ['form-button-submit-default']
        });
        this.doneButton.Surface.on('click', function(){
            // Return each player with their details/place
            var result = {};

            _.each(that.PlayerResults, function(playerView){
                result[ playerView.Model.get('_id') ] = {
                    place: playerView.currentPlace
                    // score...
                };
            });

            if(that.params.passed.on_choose){
                that.params.passed.on_choose(result);
            }

        });
        this.doneButton.add(this.doneButton.Surface);

        that.contentScrollView.Views.push(this.doneButton);

        // Add all the players
        this.PlayerResults = [];
        _.each(this.options.passed.player, function(PlayerModel,index){

            var temp = new View();

            that.PlayerResults.push(temp);

            temp.Model = PlayerModel;
            temp.currentPlace = index + 1;

            // Create a FlexibleLayout
            temp.FlexibleLayout = new FlexibleLayout({
                ratios: [true, true, true, 1] // 4 columns
            });
            temp.FlexibleLayout.Mod = new StateModifier({
                size: [undefined, 60]
            });
            temp.FlexibleLayout.Views = [];
            temp.FlexibleLayout.sequenceFrom(temp.FlexibleLayout.Views);

            // "Place"
            temp.PlaceView = new View();
            temp.PlaceView.Surface = new Surface({
                content: numeral(temp.currentPlace).format('0o'),
                size: [60, undefined],
                properties: {
                    textAlign: "center",
                    backgroundColor: 'white',
                    color: '#333',
                    fontSize: '20px',
                    lineHeight: '60px'
                }
            });
            temp.PlaceView.add(temp.PlaceView.Surface);
            temp.FlexibleLayout.Views.push(temp.PlaceView);

            // Up
            temp.UpView = new View();
            temp.UpView.Surface = new Surface({
                content: "&#9650;",
                size: [50, undefined],
                properties: {
                    textAlign: "center",
                    backgroundColor: 'white',
                    color: '#999',
                    fontSize: '20px',
                    lineHeight: '60px'
                }
            });
            temp.UpView.add(temp.UpView.Surface);
            temp.FlexibleLayout.Views.push(temp.UpView);

            temp.UpView.Surface.on('click', function(){
                if(temp.currentPlace != 1){
                    temp.currentPlace -= 1;
                    temp.PlaceView.Surface.setContent(numeral(temp.currentPlace).format('0o'));
                }
            });

            // Down
            temp.DownView = new View();
            temp.DownView.Surface = new Surface({
                content: "&#9660;",
                size: [50, undefined],
                properties: {
                    textAlign: "center",
                    backgroundColor: 'white',
                    color: '#999',
                    fontSize: '20px',
                    lineHeight: '60px'
                }
            });
            temp.DownView.add(temp.DownView.Surface);
            temp.FlexibleLayout.Views.push(temp.DownView);

            temp.DownView.Surface.on('click', function(){
                temp.currentPlace += 1;
                temp.PlaceView.Surface.setContent(numeral(temp.currentPlace).format('0o'));
            });

            // Name
            // console.log(PlayerModel);
            // debugger;
            temp.NameView = new View();
            temp.NameView.Surface = new Surface({
                content: '<span class="ellipsis full" data-replace-model="player"  data-replace-id="'+PlayerModel.get('_id')+'"  data-replace-field="Profile.name">&nbsp;</span>',
                properties: {
                    backgroundColor: 'white',
                    color: '#333',
                    fontSize: '20px',
                    lineHeight: '60px'
                }
            });
            Utils.dataModelReplaceOnSurface(temp.NameView.Surface);
            temp.NameView.add(temp.NameView.Surface);
            temp.FlexibleLayout.Views.push(temp.NameView);

            temp.NameView.Surface.on('click', function(){
                temp.currentPlace += 1;
                temp.PlaceView.Surface.setContent(numeral(temp.currentPlace).format('0o'));
            });

            temp.add(temp.FlexibleLayout.Mod).add(temp.FlexibleLayout);

            // Push to scrollview
            // - with Size modifier
            that.contentScrollView.Views.push(temp);

        });

        // Content
        this.layout.content.StateModifier = new StateModifier();
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);

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
        this.header.navBar.title.on('click', function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

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
