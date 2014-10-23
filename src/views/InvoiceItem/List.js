/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Helpers
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    var Handlebars = require('lib2/handlebars-helpers');

    var TabBar = require('famous/widgets/TabBar');
    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Subviews
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // // Side menu of options
    // var GameMenuView      = require('views/Game/GameMenu');

    // Notifications SubView
    var AllView      = require('./Subviews/All');
    var TodoSelectView      = require('./Subviews/TodoSelect');
    // var PotentialView      = require('./Subviews/Potential');
    // var IncomingView      = require('./Subviews/Incoming');
    // var OutgoingView      = require('./Subviews/Outgoing');
    
    // Models
    var MediaModel = require('models/media');
    var InvoiceModel = require('models/invoice');
    var InvoiceItemModel = require('models/invoice_item');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 0
        });

        this.createHeader();

        this._subviews = [];

        // Wait for User to be resolved
        App.Data.User.populated().then((function(){
            this.createContent();
        }).bind(this));

        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        this.model = new InvoiceModel.Invoice({
            _id: this.options.args[0]
        });
        this.model.fetch();

    };
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons


        // create the header
        this.header = new StandardHeader({
            content: "Invoices and Jobs",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // moreContent: false
            // backContent: false,
            // moreClasses: ["normal-header"],
            moreSurfaces: [
                // this.headerContent.Invoices,
                // this.headerContent.Create,
                // this.headerContent.FilterSwitcher,
            ]
        });
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });

        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.tab_change = function(name){
        var that = this;

        return;

        // Determine the filter we'll use for this ListView
        var filter = {};

        // create correct filter

        switch(this.tabs.invoices){
            case 'unpaid':
                
                filter = {
                    tags: {
                        '$ne' : 'paid'
                    }
                };
                break;

            case 'paid':
                
                filter = {
                    tags: 'paid'
                };
                break;

            default:
                return;
                break;
        }

        var key = this.tabs.invoices;

        // // 
        // switch(this.tabs.invoices_paid){
        //     case 'notcomplete':
        //         filter.tags = {
        //             '$ne' : 'paid'
        //         };
        //         break;
        //     case 'complete':
        //         filter.tags = 'paid';
        //         break;
        //     case 'all':
        //         break;
        // }

        // switch(this.tabs.invoices_recipient){
        //     case 'all':
        //         // filter.assigned_id = App.Data.User.get('_id');
        //         break;
        //     case 'to':
        //         filter.to_user_id = App.Data.User.get('_id');
        //         break;
        //     case 'from':
        //         filter.from_user_id = App.Data.User.get('_id');
        //         break;
        // }

        // var key = this.tabs.invoices_paid + '_' +  this.tabs.invoices_recipient;

        // is filter already created (JSON.stringify and check as a key)
        var cachedView = this._cachedViews[key];

        // Create the ListView if it doesn't exist
        if(!cachedView){
            cachedView = new FilterView({
                empty_string: 'Empty List',
                filter: filter
            });

            this._cachedViews[key] = cachedView;
            this._subviews.push(cachedView);

        } else {
            cachedView.collection.fetch();
        }

        // Show the ListView
        this.ListContent.show(cachedView);


    };

    PageView.prototype.createTabs = function(){
        var that = this;

        this.tabs = {
            invoices: '',
            // invoices_paid: 'notcomplete',
            // invoices_recipient: 'all'
        }
        this._cachedViews = {};

        this.filterTabs = new View();
        this.filterTabs.getSize = function(){
            return [undefined, 40];
        };
        this.filterTabs.BgSurface = new Surface({
            size: [undefined, undefined],
            classes: ['invoice-filter-tabs-bg-default']
        });
        this.filterTabs.Layout = new FlexibleLayout({
            direction: 0, //FlexibleLayout.DIRECTION_X,
            // ratios: [true,true,true, 1, true,true,true]
            ratios: [true, 1]
        });
        this.filterTabs.Views = [];
        this.filterTabs.SizeMod = new StateModifier({
            size: [undefined, 40]
        });


        // All the tab options that could be clicked
        // - and a spacer

        // Line Items
        this.filterTabs.LineItems = new Surface({
            content: 'Jobs in Invoice',
            size: [140, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        // this.filterTabs.LineItems.group = 'Invoices';
        this.filterTabs.LineItems.on('click', function(){
            // that.tab_choose = 'line_items';
            // that.tab_change();
            that.ListContent.show(that.ListContent.LineItems);
            that.filterTabs.Views.forEach(function(tmpView){
                tmpView.setClasses(['invoice-filter-tabs-item-default']);
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.LineItems);

        // Assigned to same
        // - ... (this would be useful, I'd expect...Zane?)

        // Available Todos
        this.filterTabs.AvailableTodos = new Surface({
            content: 'un-Invoiced',
            size: [undefined, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        // this.filterTabs.AvailableTodos.group = 'Invoices';
        this.filterTabs.AvailableTodos.on('click', function(){
            // that.tabs.invoices = 'unpaid';
            // that.tab_change();
            that.ListContent.show(that.ListContent.AvailableTodos);
            that.filterTabs.Views.forEach(function(tmpView){
                // if(tmpView.group == 'Invoices'){
                tmpView.setClasses(['invoice-filter-tabs-item-default']);
                // }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.AvailableTodos);

        // sequenceFrom
        this.filterTabs.Layout.sequenceFrom(this.filterTabs.Views);
        
        var node = this.filterTabs.add(this.filterTabs.SizeMod);
        node.add(Utils.usePlane('contentTabs',-1)).add(this.filterTabs.BgSurface);
        node.add(Utils.usePlane('contentTabs')).add(this.filterTabs.Layout);

        // Should occur before ListContent is added
        this.contentScrollView.Views.push(this.filterTabs);


    };
    
    PageView.prototype.createContent = function(){
        var that = this;

        // this.contentScrollView = new SequentialLayout();
        this.contentScrollView = new FlexibleLayout({
            direction: 1, //FlexibleLayout.DIRECTION_Y,
            ratios: [true, 1]
        });
        this.contentScrollView.Views = [];

        // Content
        this.ContentStateModifier = new StateModifier();

        // Tabs
        this.createTabs();

        // List Content
        this.ListContent = new RenderController();

        // Line Items 
        this.ListContent.LineItems = new AllView({
            // empty_string: 'Add Invoices by tapping the <i class="icon ion-ios7-plus-outline"></i>',
            empty_string: 'No attached invoices',
            invoice_id: that.model.get('_id')
            // filter: {
            //     tags: {
            //         '$ne' : 'paid'
            //     }
            // }
        });
        this._subviews.push(this.ListContent.LineItems);

        // Available Todos 
        this.ListContent.AvailableTodos = new TodoSelectView({
            model: that.model, // Invoice model
            empty_string: "No un-invoice jobs",
            filter: {
                invoice_id: null,
                tags: {
                    '$ne' : 'complete'
                }
            }
        });
        this.ListContent.AvailableTodos._eventOutput.on('selected', function(){
            that._subviews.forEach(function(tmpView){
                tmpView.collection.fetch();
            });
        });
        this._subviews.push(this.ListContent.AvailableTodos);
        

        this.contentScrollView.Views.push(this.ListContent);

        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Select Defaults
        this.filterTabs.LineItems._eventOutput.trigger('click');
        // this.filterTabs.TodosAssignedAll._eventOutput.trigger('click');

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

    };

    PageView.prototype.refreshData = function() {
        try {
            // this.model.fetch();
            // this.media_collection.fetch();
            // this.errorList.fetch();
            // this.alert_collection.fetch();
            // this.CarTripListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        var args = arguments;

        this._eventOutput.emit('inOutTransition', arguments);

        // emit on subviews
        _.each(this._subviews, function(obj, index){
            obj._eventInput.emit('inOutTransition', args);
        });

        switch(direction){
            case 'hiding':

                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        Timer.setTimeout(function(){

                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide down
                            // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;

            case 'showing':
                if(this._refreshData){
                    Timer.setTimeout(this.refreshData.bind(this), 1000);
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
                        Timer.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);


                        }, delayShowing);

                        // Content
                        // - extra delay
                        Timer.setTimeout(function(){

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
                        // Timer.setTimeout(function(){

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
