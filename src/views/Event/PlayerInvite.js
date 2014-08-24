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
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var ContainerSurface    = require("famous/surfaces/ContainerSurface");

    var EventFilter = require('famous/events/EventFilter');

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var TabBar = require('famous/widgets/TabBar');
    var GridLayout = require("famous/views/GridLayout");

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    var SmartSurface = require('views/common/SmartSurface');

    // Subviews
    var ResultsSubView      = require('./Subviews/PlayerInvite_Result');
    var NemesesSubView      = require('./Subviews/PlayerInvite_Nemeses');

    // Extras
    var Utils = require('utils');

    // Models
    var PlayerModel = require('models/player');
    var InviteModel = require('models/invite');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.loadModels();

        // "selected_players" is an array of objects with an _id corresponding to the player_id (use Utils.dataModelReplaceOnSurface)
        // this.selected_players = this.options.passed.selected_players || {};

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();


        // Content
        this.layout.content.StateModifier = new StateModifier();

        // Attach layout to the context
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){

        // // Player
        // this.collection = new PlayerModel.PlayerCollection();
        // if(this.collection.length == 0){
        //     this.lightbox.show(this.loadingSurface);
        // }
        // this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        // this.collection.on("add", this.addOne, this);
        // this.collection.on("remove", function(Model){
        //     // This was a remove as triggered by the collection
        //     // - we want to differentiate from a move triggered elsewhere? (like by our same view, we might want to animate differently)
        //     this.scrollSurfaces = _.reject(this.scrollSurfaces, function(scrollSurface){
        //         return scrollSurface.ModelId === Model.get('_id') ? true : false;
        //     });

        //     // Re-sequence (unfortunate that I have to do this, thought it would auto-resequence)
        //     this.playerScrollView.sequenceFrom(this.scrollSurfaces);
        // }, this);
        // this.collection.on("cachesync", function(collection){
        //     // got a "prefill" value
        //     // - no need to update anything, just use the normal add/remove
        // });

        // this.collection.fetch({prefill: true});

    };

    PageView.prototype.createHeader = function(){
        var that = this;
            
        // Icons

        // // -- create
        // this.headerContent = new View();
        // // - done
        // this.headerContent.Done = new Surface({
        //     content: '<i class="icon ion-checkmark-round"></i><div>Done</div>',
        //     size: [60, undefined],
        //     classes: ['header-tab-icon-text']
        // });
        // this.headerContent.Done.on('click', function(){
            
            // // Get summary from Results SubView
            // that.selected_players = that.TopTabs.Content.Results.View.summarize();

            // // Any selected?
            // if(Object.keys(that.selected_players).length < 1){
            //     Utils.Notification.Toast('Nobody selected!');
            //     return;
            // }

            // if(that.options.passed.on_choose){
            //     that.options.passed.on_choose(that.selected_players);
            // }

        });

        // create header
        this.header = new StandardHeader({
            content: 'Invite Players',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: false,
            // moreSurfaces: [
            //     this.headerContent.Done
            // ]
        }); 

        this.header._eventOutput.on('back',function(){
            App.history.back();
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

    PageView.prototype.createContent = function(){

        this.MainFlexibleLayout = new FlexibleLayout({
            direction: FlexibleLayout.DIRECTION_Y,
            ratios: [true, 1]
        });
        this.MainFlexibleLayout.Views = [];

        // Content Modifier
        this.ContentStateModifier = new StateModifier();


        // this.createInstructions();
        this.createTabs();


        this.layout.content.add(this.ContentStateModifier).add(this.MainFlexibleLayout);

        // Flexible Layout sequencing
        this.MainFlexibleLayout.sequenceFrom(this.MainFlexibleLayout.Views);

    };

    PageView.prototype.createInstructions = function(){

        // Create Instructions Surface
        var instrContent = 'Select your opponent';
        if(this.useMultiple){
            instrContent = "Select your opponents, you'll be included automatically";
        }

        this.instructionsView = new View();
        this.instructionsView.Surface = new Surface({
            content: instrContent,
            size: [undefined, true],
            classes: ['player-list-item-instructions-default'],
            properties: {
                zIndex: '10'
            }
        });
        this.instructionsView.FrontMod = new Modifier({
            tranform: Transform.inFront,
            size: [undefined, 40]
        });
        this.instructionsView.add(this.instructionsView.FrontMod).add(this.instructionsView.Surface);

        this.MainFlexibleLayout.Views.push(this.instructionsView);
        
    };

    PageView.prototype.createTabs = function(){
        var that = this;

        // Create the Tabs
        this.TopTabs = new View();
        this.TopTabs.Bar = new TabBar();
        this.TopTabs.BarSizeMod = new StateModifier({
            size: [undefined, 50]
        });
        this.TopTabs.add(this.TopTabs.BarSizeMod).add(this.TopTabs.Bar);

        this.TopTabs.Bar.defineSection('result', {
            content: '<i class="icon ion-android-sort"></i><div>Invited</div>',
            onClasses: ['inbox-tabbar-default', 'on'],
            offClasses: ['inbox-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('nemeses', {
            content: '<i class="icon ion-person-stalker"></i><div>Nemeses</div>',
            onClasses: ['inbox-tabbar-default', 'on'],
            offClasses: ['inbox-tabbar-default', 'off']
        });

        // Add tabs to sequence
        this.MainFlexibleLayout.Views.push(this.TopTabs);

        // Tab content
        // this.TopTabs = new View();
        this.TopTabs.Content = new RenderController();

        // Results/Selected
        this.TopTabs.Content.Results = new View();
        this.TopTabs.Content.Results.View = new ResultsSubView(this.options);
        this.TopTabs.Content.Results.add(this.TopTabs.Content.Results.View);

        // Nemeses
        this.TopTabs.Content.Nemeses = new View();
        this.TopTabs.Content.Nemeses.View = new NemesesSubView(this.options);
        var myFilter = new EventFilter(function(type, data) {
            console.log(type);
            switch(type){
                case 'add-player':
                case 'remove-player':
                    return true;
                    break;
                default:
                    return false;
            }
        });
        this.TopTabs.Content.Nemeses.View._eventOutput.pipe(myFilter).pipe(this.TopTabs.Content.Results.View._eventInput);
        this.TopTabs.Content.Nemeses.add(this.TopTabs.Content.Nemeses.View);

        // Add Lightbox to sequence
        this.MainFlexibleLayout.Views.push(this.TopTabs.Content);

        // Listeners for Tabs
        this.TopTabs.Bar.on('select', function(result){
            if(!result || !result.id){
                // requires id
                return;
            }
            switch(result.id){
                case 'result':
                    that.TopTabs.Content.show(that.TopTabs.Content.Results);

                    try {
                        that.TopTabs.Content.Results.View.collection.fetch();
                    }catch(err){}
                    break;

                case 'nemeses':
                    that.TopTabs.Content.show(that.TopTabs.Content.Nemeses);
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });
        this.TopTabs.Bar.select('result'); // notifications

        
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
