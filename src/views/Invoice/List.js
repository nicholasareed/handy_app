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
    var FilterView      = require('./Subviews/All');
    // var PotentialView      = require('./Subviews/Potential');
    // var IncomingView      = require('./Subviews/Incoming');
    // var OutgoingView      = require('./Subviews/Outgoing');
    
    // Models
    var MediaModel = require('models/media');
    var InvoiceModel = require('models/invoice');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

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
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // Create an Invoice
        this.headerContent = new View();
        this.headerContent.Create = new Surface({
            content: '<i class="icon ion-ios7-plus-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Create.on('longtap', function(){
            Utils.Help('Invoice/List/Create');
        });
        this.headerContent.Create.on('click', function(){

            Utils.Popover.Prompt('Title of new Invoice', '', 'Create', 'Cancel').then(function(p){
                
                if(!p || p.trim() == ''){
                    Utils.Notification.Toast('Invoice NOT created');
                    return;
                }

                Utils.Notification.Toast('Created a new Invoice!');

                var newModel = new InvoiceModel.Invoice({
                    // friend_id: that.model.get('_id'),
                    // amount: a,
                    // details: p
                    title: p.trim()
                });

                newModel.save()
                .then(function(result){

                    that._subviews.forEach(function(sv){
                        sv.collection.fetch();
                    });

                    App.history.navigate('invoice/' + result._id);
                });

            });


        });

        // Invoices
        this.headerContent.Invoices = new Surface({
            content: '<i class="icon ion-android-lightbulb"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Invoices.on('longtap', function(){
            Utils.Help('Invoice/List/Invoices');
        });
        this.headerContent.Invoices.on('click', function(){
            App.history.navigate('todo/list');
        });

        // ListContent switcher
        this.headerContent.FilterSwitcher = new View();
        this.headerContent.FilterSwitcher.Lightbox = new RenderController();
        this.headerContent.FilterSwitcher.SizeMod = new StateModifier({
            size: [80, 60]
        });
        this.headerContent.FilterSwitcher.add(this.headerContent.FilterSwitcher.SizeMod).add(this.headerContent.FilterSwitcher.Lightbox);
        
        this.headerContent.ShowInvoice = new Surface({
            content: '<i class="icon ion-ios7-circle-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowInvoice.on('longtap', function(){
            Utils.Help('Invoice/List/Series');
        });
        this.headerContent.ShowInvoice.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowPaid);
            that.ListContent.show(that.ListContent.PaidInvoices);
            that.ListContent.PaidInvoices.collection.fetch();
        });
        this.headerContent.ShowPaid = new Surface({
            content: '<span class="header-with-money-sign"></span><i class="icon ion-ios7-circle-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowPaid.on('longtap', function(){
            Utils.Help('Invoice/List/Series');
        });
        this.headerContent.ShowPaid.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowAll);
            that.ListContent.show(that.ListContent.AllInvoices);
            that.ListContent.AllInvoices.collection.fetch();
        });
        this.headerContent.ShowAll = new Surface({
            content: '<span class="header-with-money-sign white-money"></span><i class="icon ion-ios7-circle-filled"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShowAll.on('longtap', function(){
            Utils.Help('Invoice/List/Series');
        });
        this.headerContent.ShowAll.on('click', function(){
            that.headerContent.FilterSwitcher.Lightbox.show(that.headerContent.ShowInvoice);
            that.ListContent.show(that.ListContent.Invoices);
            that.ListContent.Invoices.collection.fetch();
        });

        this.headerContent.FilterSwitcher.Lightbox.show(this.headerContent.ShowInvoice);




        // create the header
        this.header = new StandardHeader({
            content: "Invoices",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            backContent: false,
            // moreContent: false
            // moreClasses: ["normal-header"],
            moreSurfaces: [
                // this.headerContent.Invoices,
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

        // Unpaid
        this.filterTabs.UnpaidInvoices = new Surface({
            content: 'Unpaid',
            size: [100, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        this.filterTabs.UnpaidInvoices.group = 'Invoices';
        this.filterTabs.UnpaidInvoices.on('click', function(){
            that.tabs.invoices = 'unpaid';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'Invoices'){
                    tmpView.setClasses(['invoice-filter-tabs-item-default']);
                }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.UnpaidInvoices);

        // Paid
        this.filterTabs.PaidInvoices = new Surface({
            content: 'Paid',
            size: [undefined, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        this.filterTabs.PaidInvoices.group = 'Invoices';
        this.filterTabs.PaidInvoices.on('click', function(){
            that.tabs.invoices = 'paid';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'Invoices'){
                    tmpView.setClasses(['invoice-filter-tabs-item-default']);
                }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.PaidInvoices);

        this.filterTabs.Layout.sequenceFrom(this.filterTabs.Views);
        
        var node = this.filterTabs.add(this.filterTabs.SizeMod);
        node.add(Utils.usePlane('contentTabs',-1)).add(this.filterTabs.BgSurface);
        node.add(Utils.usePlane('contentTabs')).add(this.filterTabs.Layout);

        this.contentScrollView.Views.push(this.filterTabs);

        // Select Defaults
        this.filterTabs.UnpaidInvoices._eventOutput.trigger('click');
        // this.filterTabs.TodosAssignedAll._eventOutput.trigger('click');


        return;



        // All the tab options that could be clicked
        // - and a spacer

        this.filterTabs.InvoicesNotPaid = new Surface({
            content: '<i class="icon ion-ios7-circle-outline"></i>',
            size: [50, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        this.filterTabs.InvoicesNotPaid.group = 'InvoicesPaid';
        this.filterTabs.InvoicesNotPaid.on('click', function(){
            that.tabs.invoices_paid = 'notcomplete';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'InvoicesPaid'){
                    tmpView.setClasses(['invoice-filter-tabs-item-default']);
                }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.InvoicesNotPaid);

        this.filterTabs.InvoicesPaid = new Surface({
            content: '<i class="icon ion-social-usd"></i>',
            size: [50, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        this.filterTabs.InvoicesPaid.group = 'InvoicesPaid';
        this.filterTabs.InvoicesPaid.on('click', function(){
            that.tabs.invoices_paid = 'complete';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'InvoicesPaid'){
                    tmpView.setClasses(['invoice-filter-tabs-item-default']);
                }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.InvoicesPaid);

        this.filterTabs.InvoicesAll = new Surface({
            content: 'All',
            size: [50, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        this.filterTabs.InvoicesAll.group = 'InvoicesPaid';
        this.filterTabs.InvoicesAll.on('click', function(){
            that.tabs.invoices_paid = 'all';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'InvoicesPaid'){
                    tmpView.setClasses(['invoice-filter-tabs-item-default']);
                }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.InvoicesAll);

        // spacer
        this.filterTabs.Spacer = new Surface({
            size: [undefined, undefined]
        });
        this.filterTabs.Views.push(this.filterTabs.Spacer);

        this.filterTabs.InvoicesFromMe = new Surface({
            content: 'From',
            size: [50, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        this.filterTabs.InvoicesFromMe.group = 'InvoicesRecipient';
        this.filterTabs.InvoicesFromMe.on('click', function(){
            that.tabs.invoices_recipient = 'from';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'InvoicesRecipient'){
                    tmpView.setClasses(['invoice-filter-tabs-item-default']);
                }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.InvoicesFromMe);

        this.filterTabs.InvoicesToMe = new Surface({
            content: 'To',
            size: [50, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        this.filterTabs.InvoicesToMe.group = 'InvoicesRecipient';
        this.filterTabs.InvoicesToMe.on('click', function(){
            that.tabs.invoices_recipient = 'to';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'InvoicesRecipient'){
                    tmpView.setClasses(['invoice-filter-tabs-item-default']);
                }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.InvoicesToMe);

        this.filterTabs.InvoicesAllWithMe = new Surface({
            content: 'All',
            size: [50, undefined],
            classes: ['invoice-filter-tabs-item-default']
        });
        this.filterTabs.InvoicesAllWithMe.group = 'InvoicesRecipient';
        this.filterTabs.InvoicesAllWithMe.on('click', function(){
            that.tabs.invoices_recipient = 'all';
            that.tab_change();
            that.filterTabs.Views.forEach(function(tmpView){
                if(tmpView.group == 'InvoicesRecipient'){
                    tmpView.setClasses(['invoice-filter-tabs-item-default']);
                }
            });
            this.setClasses(['invoice-filter-tabs-item-default','selected']);
        });
        this.filterTabs.Views.push(this.filterTabs.InvoicesAllWithMe);

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
        this.filterTabs.InvoicesNotPaid._eventOutput.trigger('click');
        this.filterTabs.InvoicesAllWithMe._eventOutput.trigger('click');

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


        return;


        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView = new FlexibleLayout({
            direction: FlexibleLayout.DIRECTION_Y,
            ratios: [true, 1]
        });
        this.contentScrollView.Views = [];

        // Content
        this.ContentStateModifier = new StateModifier();


        // Lists
        this.ListContent = new RenderController();

        // Invoice 
        this.ListContent.Invoices = new AllView({
            // empty_string: 'Add Invoices by tapping the <i class="icon ion-ios7-plus-outline"></i>',
            empty_string: 'Add Invoices from the People (<i class="icon ion-android-friends"></i>) page',
            filter: {
                tags: {
                    '$ne' : 'paid'
                }
            }
        });
        // this.ListContent.Invoices.View = new View();
        // this.ListContent.Invoices.add(this.ListContent.Invoices.View);
        this._subviews.push(this.ListContent.Invoices);

        // Paid 
        this.ListContent.PaidInvoices = new AllView({
            empty_string: "None Paid",
            filter: {
                tags: 'paid'
            }
        });
        // this.ListContent.PaidInvoices.View = new View();
        // this.ListContent.PaidInvoices.add(this.ListContent.PaidInvoices.View);
        this._subviews.push(this.ListContent.PaidInvoices);

        // All 
        this.ListContent.AllInvoices = new AllView({
            empty_string: "You have not created any Invoices, ever!",
            filter: {}
        });
        // this.ListContent.AllInvoices.View = new View();
        // this.ListContent.AllInvoices.add(this.ListContent.AllInvoices.View);
        this._subviews.push(this.ListContent.AllInvoices);

        // Show "Invoices" by default
        this.ListContent.show(this.ListContent.Invoices);

        this.layout.content.add(this.ContentStateModifier).add(this.ListContent);


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

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        console.log('RemoteRefresh - PageView');
        Utils.RemoteRefresh(this,snapshot);
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
