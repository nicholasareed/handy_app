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
    
    var LongTapSync = require("views/common/LongTapSync");
        

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
    var FilterView      = require('./Subviews/All');
    // var PotentialView      = require('./Subviews/Potential');
    // var IncomingView      = require('./Subviews/Incoming');
    // var OutgoingView      = require('./Subviews/Outgoing');
    
    // Models
    var MediaModel = require('models/media');
    var TodoModel = require('models/todo');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();

        this._subviews = [];

        // // Wait for User to be resolved
        // App.Data.User.populated().then((function(){
            this.createContent();
        // }).bind(this));

        this.add(this.layout);

        // Listen for 'showing' events
        this._eventOutput.on('inOutTransition', function(args){
            // 0 = direction
            if(args[0] == 'showing'){
                App.Data.TodoCollection.fetch();
            }
        });

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // Create a Todo
        this.headerContent = new View();
        this.headerContent.Create = new Surface({
            content: '<i class="icon ion-ios7-plus-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Create.on('longtap', function(){
            Utils.Help('todo_plus');
        });
        this.headerContent.Create.on('click', function(){

            App.history.modifyLast({
                tag: 'StartAdd'
            });
            App.history.navigate('todo/add', {history: false});

            return;

            // Utils.Popover.Prompt('Title of new Job', '', 'Create', 'Cancel').then(function(p){

            //     if(!p || p.trim() == ''){
            //         Utils.Notification.Toast('Job NOT created');
            //         return;
            //     }

            //     Utils.Notification.Toast('Created a new Job!');

            //     var newModel = new TodoModel.Todo({
            //         title: p.trim()
            //     });

            //     newModel.save()
            //     .then(function(result){
            //         // that.ListContent.Todos.collection.fetch();
            //         that._subviews.forEach(function(sv){
            //             sv.collection.fetch();
            //         });

            //         App.history.navigate('todo/' + result._id);

            //         // // show new todos
            //         // that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowTodo);
            //         // that.ListContent.show(that.ListContent.Todos);
            //         // that.ListContent.Todos.collection.fetch();

            //     });

            // });

        });

        // Invoices
        this.headerContent.Invoices = new Surface({
            content: '<i class="icon ion-social-usd"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Invoices.on('longtap', function(){
            Utils.Help('todo_invoices');
            this.longTap = true;
        });
        this.headerContent.Invoices.on('click', function(){
            if(this.longTap === true){
                this.longTap = false;
                return;
            }
            App.history.navigate('invoice/list');
        });



        // Search
        this.headerContent.Search = new Surface({
            content: '<i class="icon ion-ios7-search-strong"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Search.on('longtap', function(){
            Utils.Help('todo_plus');
        });
        this.headerContent.Search.on('click', function(){
            App.history.navigate('todo/search');
        });

        // History
        this.headerContent.History = new Surface({
            content: '<i class="icon ion-android-folder"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.History.on('longtap', function(){
            Utils.Help('todo_plus');
        });
        this.headerContent.History.on('click', function(){
            App.history.navigate('todo/history');
        });

        // ListContent switcher
        this.headerContent.FilterSwitcher = new View();
        this.headerContent.FilterSwitcher.Lightbox = new RenderController();
        this.headerContent.FilterSwitcher.SizeMod = new StateModifier({
            size: [80, 60]
        });
        this.headerContent.FilterSwitcher.add(this.headerContent.FilterSwitcher.SizeMod).add(this.headerContent.FilterSwitcher.Lightbox);
        
        this.headerContent.ShowTodo = new Surface({
            content: '<i class="icon ion-ios7-circle-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowTodo.on('longtap', function(){
            Utils.Help('todo_circle_checkmark');
        });
        this.headerContent.ShowTodo.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowComplete);
            that.ListContent.show(that.ListContent.CompleteTodos);
            that.ListContent.CompleteTodos.collection.fetch();
        });
        this.headerContent.ShowComplete = new Surface({
            content: '<i class="icon ion-ios7-checkmark-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowComplete.on('longtap', function(){
            Utils.Help('todo_circle_checkmark');
        });
        this.headerContent.ShowComplete.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowAll);
            that.ListContent.show(that.ListContent.AllTodos);
            that.ListContent.AllTodos.collection.fetch();
        });
        this.headerContent.ShowAll = new Surface({
            content: '<i class="icon ion-ios7-checkmark"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowAll.on('longtap', function(){
            Utils.Help('todo_circle_checkmark');
        });
        this.headerContent.ShowAll.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowTodo);
            that.ListContent.show(that.ListContent.Todos);
            that.ListContent.Todos.collection.fetch();
        });

        this.headerContent.FilterSwitcher.Lightbox.show(this.headerContent.ShowTodo);


        // create the header
        this.header = new StandardHeader({
            content: "Jobs",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // moreContent: false
            backContent: false,
            // moreClasses: ["normal-header"],
            moreSurfaces: [
                // this.headerContent.Invoices,
                this.headerContent.History,
                this.headerContent.Search,
                this.headerContent.Create
                // this.headerContent.FilterSwitcher,
            ]
            // moreContent: "New", //'<span class="icon ion-navicon-round"></span>'
        });
        this.header._eventOutput.on('back',function(){
            // App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            // App.history.back();
        });

        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // // Node for Modifier and background
        // this.HeaderNode = new RenderNode();
        // this.HeaderNode.add(this.headerBg);
        // this.HeaderNode.add(this.header.StateModifier).add(this.header);

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.tab_change = function(name){
        var that = this;

        // Determine the filter we'll use for this ListView
        var filter = {},
            empty_string = '';

        // create correct filter

        switch(this.tabs.todos){
            case 'my':
                // todos I am responsible for completing
                empty_string = 'No Jobs for you to complete';
                filter = {
                    tags: {
                        '$ne' : 'complete'
                    },

                    // assigned to me
                    '$or' : [{
                        assigned_id: App.Data.User.get('_id')
                    },

                    // created by me, and not assigned to somebody
                    {
                        owner_id: App.Data.User.get('_id'),
                        assigned_id: null
                    },

                    // created by me, and not assigned to somebody
                    {
                        user_id: App.Data.User.get('_id'),
                        assigned_id: null
                    }]
                };
                break;

            case 'assigned':
                
                // todos that are assigned that you know about
                empty_string = 'No Jobs assigned to someone else';
                filter = {
                    tags: {
                        '$ne' : 'complete'
                    },

                    // not assigned to me
                    // is assigned to somebody though!
                    assigned_id: {
                        '$ne' : App.Data.User.get('_id'),
                        '$type' : 7
                    }
                };
                break;

            case 'complete':
                empty_string = 'No Jobs have been completed';
                filter = {
                    tags: 'complete'
                };
                break;
        }

        // switch(this.tabs.todos_complete){
        //     case 'notcomplete':
        //         filter.tags = {
        //             '$ne' : 'complete'
        //         };
        //         break;
        //     case 'complete':
        //         filter.tags = 'complete';
        //         break;
        //     case 'all':
        //         break;
        // }

        // switch(this.tabs.todos_assigned){
        //     case 'all':
        //         // filter.assigned_id = App.Data.User.get('_id');
        //         break;
        //     case 'me':
        //         filter.assigned_id = App.Data.User.get('_id');
        //         break;
        //     case 'other':
        //         filter.assigned_id = {
        //             '$nin' : [null, App.Data.User.get('_id')]
        //         }
        //         break;
        // }

        var key = this.tabs.todos; //_complete + '_' +  this.tabs.todos_assigned;

        // is filter already created (JSON.stringify and check as a key)
        var cachedView = this._cachedViews[key];

        // Create the ListView if it doesn't exist
        if(!cachedView){
            cachedView = new FilterView({
                empty_string: empty_string,
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
            todos: '',
            // todos_complete: 'notcomplete',
            // todos_assigned: 'all'
        }
        this._cachedViews = {};

        this.filterTabs = new View();
        this.filterTabs.getSize = function(){
            return [undefined, 40];
        };
        this.filterTabs.BgSurface = new Surface({
            size: [undefined, undefined],
            classes: ['todo-filter-tabs-bg-default']
        });
        this.filterTabs.Layout = new FlexibleLayout({
            direction: 0, //x
            // ratios: [true,true,true, 1, true,true,true]
            ratios: [true,1]
        });
        this.filterTabs.Views = [];
        this.filterTabs.SizeMod = new StateModifier({
            size: [undefined, 40]
        });



        // All the tab options that could be clicked
        // - and a spacer

        // My
        this.filterTabs.MyTodos = new Surface({
            content: 'Private Jobs &amp; Hired me',
            size: [200, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.MyTodos.group = 'Todos';
        this.filterTabs.MyTodos.on('click', function(){
            that.tabs.todos = 'my';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'Todos'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.MyTodos);

        // Assigned
        this.filterTabs.AssignedTodos = new Surface({
            content: 'Hired Somebody Else',
            wrap: '<div class="ellipsis-all"></div>',
            size: [undefined, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.AssignedTodos.group = 'Todos';
        this.filterTabs.AssignedTodos.on('click', function(){
            that.tabs.todos = 'assigned';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'Todos'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.AssignedTodos);

        // Completed
        this.filterTabs.CompleteTodos = new Surface({
            content: 'Complete',
            size: [undefined, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.CompleteTodos.group = 'Todos';
        this.filterTabs.CompleteTodos.on('click', function(){
            that.tabs.todos = 'complete';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'Todos'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        // this.filterTabs.Views.push(this.filterTabs.CompleteTodos);

        this.filterTabs.Layout.sequenceFrom(this.filterTabs.Views);
        
        var node = this.filterTabs.add(this.filterTabs.SizeMod);
        node.add(Utils.usePlane('contentTabs',-1)).add(this.filterTabs.BgSurface);
        node.add(Utils.usePlane('contentTabs')).add(this.filterTabs.Layout);

        this.contentScrollView.Views.push(this.filterTabs);

        // Select Defaults
        this.filterTabs.MyTodos._eventOutput.trigger('click');
        // this.filterTabs.TodosAssignedAll._eventOutput.trigger('click');


        return;


        // All the tab options that could be clicked
        // - and a spacer

        this.filterTabs.TodosNotComplete = new Surface({
            content: '<i class="icon ion-ios7-circle-outline"></i>',
            size: [50, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.TodosNotComplete.group = 'TodosComplete';
        this.filterTabs.TodosNotComplete.on('click', function(){
            that.tabs.todos_complete = 'notcomplete';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'TodosComplete'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.TodosNotComplete);

        this.filterTabs.TodosComplete = new Surface({
            content: '<i class="icon ion-ios7-checkmark-outline"></i>',
            size: [50, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.TodosComplete.group = 'TodosComplete';
        this.filterTabs.TodosComplete.on('click', function(){
            that.tabs.todos_complete = 'complete';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'TodosComplete'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.TodosComplete);

        this.filterTabs.TodosAll = new Surface({
            content: 'All',
            size: [50, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.TodosAll.group = 'TodosComplete';
        this.filterTabs.TodosAll.on('click', function(){
            that.tabs.todos_complete = 'all';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'TodosComplete'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.TodosAll);

        // spacer
        this.filterTabs.Spacer = new Surface({
            size: [undefined, undefined]
        });
        this.filterTabs.Views.push(this.filterTabs.Spacer);

        this.filterTabs.TodosAssignedMe = new Surface({
            content: 'Me',
            size: [50, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.TodosAssignedMe.group = 'TodosAssigned';
        this.filterTabs.TodosAssignedMe.on('click', function(){
            that.tabs.todos_assigned = 'me';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'TodosAssigned'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.TodosAssignedMe);

        this.filterTabs.TodosAssignedOther = new Surface({
            content: 'Other',
            size: [50, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.TodosAssignedOther.group = 'TodosAssigned';
        this.filterTabs.TodosAssignedOther.on('click', function(){
            that.tabs.todos_assigned = 'other';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'TodosAssigned'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.TodosAssignedOther);

        this.filterTabs.TodosAssignedAll = new Surface({
            content: 'All',
            size: [50, undefined],
            classes: ['todo-filter-tabs-item-default']
        });
        this.filterTabs.TodosAssignedAll.group = 'TodosAssigned';
        this.filterTabs.TodosAssignedAll.on('click', function(){
            that.tabs.todos_assigned = 'all';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'TodosAssigned'){
                    tmpView.setClasses(['todo-filter-tabs-item-default']);
                }
            });
            this.setClasses(['todo-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.TodosAssignedAll);

        this.filterTabs.Layout.sequenceFrom(this.filterTabs.Views);

        // hack/fix for setRatio with true surfaces
        // - should instead have the FlexibleLayout check for a "still dirty" surface or getSize and wait for it to not be "null"
        // Timer.setTimeout(function(){
        //     console.log(1);
        //     that.filterTabs.Layout.setRatios(theRatio);
        // },2000);
        
        var node = this.filterTabs.add(this.filterTabs.SizeMod);
        node.add(Utils.usePlane('contentTabs',-1)).add(this.filterTabs.BgSurface);
        node.add(Utils.usePlane('contentTabs')).add(this.filterTabs.Layout);

        this.contentScrollView.Views.push(this.filterTabs);

        // Select Defaults
        this.filterTabs.TodosNotComplete._eventOutput.trigger('click');
        this.filterTabs.TodosAssignedAll._eventOutput.trigger('click');

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

        // Lists
        this.ListContent = new RenderController();



        // // Filter 
        // this.ListContent.FilterTodos = new FilterView({
        //     empty_string: "You have not created any Todos, ever!",
        //     filter: {}
        // });
        // this._subviews.push(this.ListContent.AllTodos);

        this.createTabs();

        // // Show "Todos" by default
        // this.ListContent.show(this.ListContent.Todos);
        // this.contentScrollView.Views.push(this.ListContent);
        this.contentScrollView.Views.push(this.ListContent);

        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

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

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        console.log('RemoteRefresh - PageView');
        Utils.RemoteRefresh(this, snapshot);
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

                            // Slide down
                            that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? 1.5 : -1.5)),0,0), transitionOptions.outTransition);

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

                        // Default position
                        that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? -1.5 : 1.5)),0,0));

                        // Content
                        // - extra delay
                        Timer.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

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
