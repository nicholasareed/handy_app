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

    // Side menu of options
    var GameMenuView      = require('views/Game/GameMenu');

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
            Utils.IconHelp('todo_plus');
        });
        this.headerContent.Create.on('click', function(){
            
            // Timer.setTimeout(function(){

            var p = prompt('Todo title');
            if(p && p.trim() != ''){

                Utils.Notification.Toast('Create a new Todo!');

                var newModel = new TodoModel.Todo({
                    title: p
                });

                newModel.save()
                .then(function(){
                    that.ListContent.Todos.collection.fetch();

                    // show new todos
                    that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowTodo);
                    that.ListContent.show(that.ListContent.Todos);
                    that.ListContent.Todos.collection.fetch();

                });

            }

            // },200);


        });

        // Invoices
        this.headerContent.Invoices = new Surface({
            content: '<i class="icon ion-social-usd"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Invoices.on('longtap', function(){
            Utils.IconHelp('todo_invoices');
            this.longTap = true;
        });
        this.headerContent.Invoices.on('click', function(){
            if(this.longTap === true){
                this.longTap = false;
                return;
            }
            App.history.navigate('invoice/list');
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
            Utils.IconHelp('todo_circle_checkmark');
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
            Utils.IconHelp('todo_circle_checkmark');
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
            Utils.IconHelp('todo_circle_checkmark');
        });
        this.headerContent.ShowAll.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowTodo);
            that.ListContent.show(that.ListContent.Todos);
            that.ListContent.Todos.collection.fetch();
        });

        this.headerContent.FilterSwitcher.Lightbox.show(this.headerContent.ShowTodo);


        // create the header
        this.header = new StandardHeader({
            content: "Todos",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // moreContent: false
            backContent: false,
            // moreClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Invoices,
                this.headerContent.Create,
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
        var filter = {};

        // 
        switch(this.tabs.todos_complete){
            case 'notcomplete':
                filter.tags = {
                    '$ne' : 'complete'
                };
                break;
            case 'complete':
                filter.tags = 'complete';
                break;
            case 'all':
                break;
        }

        switch(this.tabs.todos_assigned){
            case 'all':
                // filter.assigned_id = App.Data.User.get('_id');
                break;
            case 'me':
                filter.assigned_id = App.Data.User.get('_id');
                break;
            case 'other':
                filter.assigned_id = {
                    '$nin' : [null, App.Data.User.get('_id')]
                }
                break;
        }

        console.log(JSON.stringify(filter));

        // is filter already created (JSON.stringify and check as a key)
        var cachedView = this._cachedViews[JSON.stringify(filter)];

        // Create the ListView if it doesn't exist
        if(!cachedView){
            cachedView = new FilterView({
                empty_string: 'No todos to show',
                filter: filter
            });

            this._cachedViews[JSON.stringify(filter)] = cachedView;
            this._subviews.push(cachedView);

        }

        // Show the ListView
        this.ListContent.show(cachedView);


    };

    PageView.prototype.createTabs = function(){
        var that = this;

        this.tabs = {
            todos_complete: 'notcomplete',
            todos_assigned: 'all'
        }
        this._cachedViews = {};

        this.filterTabs = new View();
        this.filterTabs.getSize = function(){
            return [undefined, 60];
        };
        this.filterTabs.BgSurface = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: 'rgba(255,255,255,0.5)'
            }
        });
        this.filterTabs.Layout = new FlexibleLayout({
            direction: 0, //FlexibleLayout.DIRECTION_X,
            ratios: [true,true,true, 1, true,true,true]
        });
        this.filterTabs.Views = [];
        this.filterTabs.SizeMod = new StateModifier({
            size: [undefined, 60]
        });


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
        node.add(Utils.usePlane('contentTabs'),-1).add(this.filterTabs.BgSurface);
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

        // Todo 
        this.ListContent.Todos = new AllView({
            empty_string: 'Add Todos by tapping the <i class="icon ion-ios7-plus-outline"></i>',
            filter: {
                tags: {
                    '$ne' : 'complete'
                }
            }
        });
        // this.ListContent.Todos.View = new View();
        // this.ListContent.Todos.add(this.ListContent.Todos.View);
        this._subviews.push(this.ListContent.Todos);

        // Complete 
        this.ListContent.CompleteTodos = new AllView({
            empty_string: "None Completed",
            filter: {
                tags: 'complete'
            }
        });
        // this.ListContent.CompleteTodos.View = new View();
        // this.ListContent.CompleteTodos.add(this.ListContent.CompleteTodos.View);
        this._subviews.push(this.ListContent.CompleteTodos);

        // All 
        this.ListContent.AllTodos = new AllView({
            empty_string: "You have not created any Todos, ever!",
            filter: {}
        });
        // this.ListContent.AllTodos.View = new View();
        // this.ListContent.AllTodos.add(this.ListContent.AllTodos.View);
        this._subviews.push(this.ListContent.AllTodos);

        // // Show "Todos" by default
        // this.ListContent.show(this.ListContent.Todos);

        // this.layout.content.add(this.ContentStateModifier).add(this.ListContent);




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


        return;


        // Create the Tabs
        this.TopTabs = new View();
        this.TopTabs.Bar = new TabBar();
        this.TopTabs.BarSizeMod = new StateModifier({
            size: [undefined, 80]
        });
        this.TopTabs.getSize = function(){
            return [undefined, 80];
        };
        this.TopTabs.add(Utils.usePlane('contentTabs')).add(this.TopTabs.BarSizeMod).add(this.TopTabs.Bar);

        this.TopTabs.Bar.defineSection('all', {
            content: '<i class="icon ion-android-friends"></i><div>All</div>',
            onClasses: ['friend-list-tabbar-default', 'on'],
            offClasses: ['friend-list-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('potential', {
            content: '<i class="icon ion-android-social"></i><div>Potential</div>',
            onClasses: ['friend-list-tabbar-default', 'on'],
            offClasses: ['friend-list-tabbar-default', 'off']
        });
        // this.TopTabs.Bar.defineSection('incoming', {
        //     content: '<i class="icon ion-arrow-down-a"></i><div>Incoming</div>',
        //     onClasses: ['inbox-tabbar-default', 'on'],
        //     offClasses: ['inbox-tabbar-default', 'off']
        // });
        // this.TopTabs.Bar.defineSection('outgoing', {
        //     content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Outgoing</div>',
        //     onClasses: ['inbox-tabbar-default', 'on'],
        //     offClasses: ['inbox-tabbar-default', 'off']
        // });

        // Add tabs to sequence
        this.contentScrollView.Views.push(this.TopTabs);

        // Tab content
        this.TopTabs.Content = new RenderController();

        // All 
        this.TopTabs.Content.AllFriends = new View();
        this.TopTabs.Content.AllFriends.View = new AllView();
        this.TopTabs.Content.AllFriends.add(this.TopTabs.Content.AllFriends.View);
        this._subviews.push(this.TopTabs.Content.AllFriends.View);

        // Potential 
        this.TopTabs.Content.PotentialFriends = new View();
        this.TopTabs.Content.PotentialFriends.View = new PotentialView();
        this.TopTabs.Content.PotentialFriends.add(this.TopTabs.Content.PotentialFriends.View);
        this._subviews.push(this.TopTabs.Content.PotentialFriends.View);

        // // Incoming
        // this.TopTabs.Content.IncomingInvites = new View();
        // this.TopTabs.Content.IncomingInvites.View = new IncomingView();
        // this.TopTabs.Content.IncomingInvites.add(this.TopTabs.Content.IncomingInvites.View);
        // this._subviews.push(this.TopTabs.Content.IncomingInvites.View);

        // // Outgoing
        // this.TopTabs.Content.OutgoingInvites = new View();
        // this.TopTabs.Content.OutgoingInvites.View = new OutgoingView();
        // this.TopTabs.Content.OutgoingInvites.add(this.TopTabs.Content.OutgoingInvites.View);
        // this._subviews.push(this.TopTabs.Content.OutgoingInvites.View);

        // Add Lightbox to sequence
        this.contentScrollView.Views.push(this.TopTabs.Content);

        // Listeners for Tabs
        this.TopTabs.Bar.on('select', function(result){
            switch(result.id){

                case 'all':
                    that.TopTabs.Content.show(that.TopTabs.Content.AllFriends);
                    // that.TopTabs.Content.AllFriends.View.collection.fetch();
                    break;

                case 'potential':
                    that.TopTabs.Content.show(that.TopTabs.Content.PotentialFriends);
                    // that.TopTabs.Content.AllFriends.View.collection.fetch();
                    break;

                case 'incoming':
                    that.TopTabs.Content.show(that.TopTabs.Content.IncomingInvites);
                    // that.TopTabs.Content.IncomingInvites.View.collection.fetch();
                    break;

                case 'outgoing':
                    that.TopTabs.Content.show(that.TopTabs.Content.OutgoingInvites);
                    // that.TopTabs.Content.OutgoingInvites.View.collection.fetch();
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });

        // This depends on the previously selected! 
        var default_selected = 'all';
        // try {
        //     default_selected = App.Cache.FriendListOptions.default || 'all';
        // }catch(err){console.error(err);}
        this.TopTabs.Bar.select(default_selected);

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

        // Flexible Layout sequencing
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

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

                            // Slide down
                            that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth, 0,0), transitionOptions.outTransition);

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

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // Default position
                        if(goingBack){
                            that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        } else {
                            that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        }
                        that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));


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
