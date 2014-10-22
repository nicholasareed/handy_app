
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Lightbox = require('famous/views/Lightbox');
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

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');

    var TabBar = require('famous/widgets/TabBar');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var EventHandler = require('famous/core/EventHandler');

    var $ = require('jquery');
    var Credentials = JSON.parse(require('text!credentials.json'));

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    var StandardTabBar = require('views/common/StandardTabBar');

    // Extras
    var Utils = require('utils');
    var _ = require('underscore');
    var numeral = require('lib2/numeral.min');
    var crypto = require('lib2/crypto');

    // Models
    var PaymentSourceModel = require('models/payment_source');
    var InvoiceModel = require('models/invoice');
    var InvoiceContentModel = require('models/invoice_content');

    // Subviews

    // InvoiceContent
    var InvoiceContentView      = require('./Subviews/InvoiceContent');

    // // Game story/chat
    // var GameStoryListView      = require('views/Game/Subviews/GameStoryList');

    // // Game Sharing
    // var GameShareView      = require('views/Game/Subviews/GameShare');

    // // Game Media (unused atm)
    // var PlayerGameListView      = require('views/Player/PlayerGameList');

    // // Media Blocks
    // var PlayerMediaBlocksView      = require('views/Player/PlayerMediaBlocks');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.invoice_id = that.options.args[0];
        this._subviews = [];
        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createContent();
        this.createHeader();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);


        this.model.populated().then(function(){

            // debugger;

            // Show user information
            that.contentLightbox.show(that.contentScrollView);
            console.log(that.contentScrollView.Views);

            // // Show Certify, Certified, or Nothing
            // // - determine is_me
            // if(that.model.get('is_me') == true && that.model.get('user_id') == App.Data.User.get('_id')){
            //     console.error('is_me!');
            //     that.profileRight.Layout.show(that.profileRight.EditProfile);
            // } else if (that.model.get('connected_user_id') == App.Data.User.get('_id')){
            //     console.error('is_me!');
            //     that.profileRight.Layout.show(that.profileRight.EditProfile);
            // } else {
            //     that.is_me = false;
            //     console.error('Not is_me!');

            //     // Connected to this person?
            //     // console.log(that.model.get('related_player_ids'));
            //     // console.log(App.Data.Players.findMe().get('related_player_ids'));
            //     // console.log(_.intersection(that.model.get('related_player_ids'),App.Data.Players.findMe().get('related_player_ids')));
            //     // console.log(that.model.toJSON());
            //     var my_friend_player_ids = _.pluck(App.Data.Players.toJSON(), '_id');
            //     // console.log(my_friend_player_ids);
            //     if(_.intersection(that.model.get('related_player_ids'),my_friend_player_ids).length > 0){
            //         that.profileRight.Layout.show(that.profileRight.Connected);
            //     } else {
            //         that.profileRight.Layout.show(that.profileRight.Connect);
            //     }
            // }

            // update going forward
            that.update_content();
            that.model.on('change', that.update_content.bind(that));

        });


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.loadModels = function(){
        var that = this;

        // Models
        this.model = new InvoiceModel.Invoice({
            _id: this.invoice_id
        });

        this.model.on('error',function(model, err){
            if(err.status == 404){
                // Do not have access
                that.contentLightbox.show(that.errorLoading);
            }
        });

        this.model.fetch({prefill: true});
    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // -- mark as paid (lightbox)
        this.headerContent = new View();
        this.headerContent.PaidLightbox = new RenderController();
        this.headerContent.SizeMod = new StateModifier({
            size: [80, 60]
        });
        this.headerContent.add(this.headerContent.SizeMod).add(this.headerContent.PaidLightbox);
        // settings
        this.headerContent.MarkPaid = new Surface({
            content: '<i class="icon ion-ios7-checkmark-outline"></i>',
            size: [80, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.MarkPaid.on('longtap', function(){
            Utils.Help('Invoice/View/MarkPaid');
        });
        this.headerContent.MarkPaid.on('click', function(){
            // App.history.navigate('settings');

            // var data = {};
            // if(that.model.get('tags').indexOf('paid') === -1){
            //     data = {
            //         add_tags: ['paid']
            //     }
            // } else {
            //     data = {
            //         remove_tags: ['paid']
            //     };
            // }

            Utils.Popover.Buttons({
                title: 'Mark as Unpaid',
                text: 'Are you sure?',
                buttons: [{
                    text: 'Yes, mark as Unpaid',
                    success: function(){
                        Utils.Notification.Toast('Marking as Unpaid');
                        that.model.save({
                            remove_tags: ['paid']
                        },{
                            patch: true,
                            // success: function(){
                            //     that.model.fetch();    
                            // }
                        }).then(function(){
                            // that.model.set({
                            //     assigned_id: App.Data.User.toJSON()
                            // });
                            that.model.fetch();
                            that.invoiceContent.collection.fetch();
                            // App.history.backTo('StartAssign');
                        });
                    }
                }]
            });

        });

        // Pay using Payment Source/Method
        this.headerContent.PaymentView = new View();
        this.headerContent.PaymentLightbox = new RenderController();
        this.headerContent.PaymentView.SizeMod = new StateModifier({
            size: [80, 60]
        });
        this.headerContent.PaymentView.add(this.headerContent.PaymentView.SizeMod).add(this.headerContent.PaymentLightbox);
        this.headerContent.MakePayment = new Surface({
            content: '<i class="icon ion-card"></i>',
            size: [80, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.MakePayment.on('longtap', function(){
            Utils.Help('Invoice/View/MakePayment');
        });
        this.headerContent.MakePayment.on('click', function(){
            // App.history.navigate('settings');

            that.make_payment();

        });

    
        // Email
        this.headerContent.Email = new Surface({
            content: '<i class="icon ion-email"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Email.on('click',function(){

            var listData = [];

            that.model.get('included').forEach(function(theEmail){
                listData.push({
                    text: theEmail,
                    success: function(){
                        Utils.Notification.Toast('Cannot remove yet!');
                    }
                });
            });

            listData.push({
                text: '<i class="icon ion-plus-round"></i> Add new Email',
                success: function(){

                    Utils.Popover.Prompt('Email Address', '', 'Add Email', 'Cancel', 'email').then(function(p){

                        if(!p || p.trim() == ''){
                            // Utils.Notification.Toast('Todo NOT created');
                            return;
                        }

                        $.ajax({
                            url: App.Credentials.server_root + 'invoice/emailinvite/' + that.model.get('_id'),
                            method: 'post',
                            data: {
                                email: p.trim()
                            },
                            success: function(result, status){
                                console.log(result);
                                console.log(status);
                                that.model.fetch();
                            }
                        });

                    });


                }
            });

            Utils.Popover.List({
                list: listData
            });

        });


        // create the header
        this.header = new StandardHeader({
            content: "Invoice",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Email,
                this.headerContent,
                // this.headerContent
            ]
            // moreClasses: ["normal-header"],
            // moreContent: false // '<span class="icon ion-refresh"></span>'
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });
        this.header._eventOutput.on('more',function(){
            // if(that.model.get('CarPermission.coowner')){
            //     App.history.navigate('car/permission/' + that.model.get('_id'), {trigger: true});
            // }
            // that.menuToggle();
            that.refreshData();
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

    PageView.prototype.createContent = function(){
        var that = this;

        // create the content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // // Pipe edgeHit (bottom) to next_page
        // this.contentScrollView.on('edgeHit', function(data){
        //     var position = parseInt(this.getPosition(), 10);
        //     if(that.lastEdgeHit == position){
        //         return;
        //     }
        //     that.lastEdgeHit = position;

        //     // At beginning?
        //     if(position <= 0){
        //         return;
        //     }

        //     // // Probably all good to try and update
        //     // that.PlayerGameListView.next_page.call(that.PlayerGameListView);
        // });

        // top of game
        // - Sport Name
        // - if I have it starred (invoice)
        // - if I need to certify

        this.invoiceLayout = new View();
        this.invoiceLayout.Layout = new FlexibleLayout({
            direction: 1, // y, vertical
            ratios: [true, 1, true]
        });

        this.invoiceLayout.Layout.Views = [];

        // Details
        this.invoiceDetails = new View();
        this.invoiceDetails.BgSurface = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: 'rgba(250,250,250,0.8)'
            }
        });
        this.invoiceDetails.SeqLayout = new SequentialLayout();
        this.invoiceDetails.Views = [];

        // Description/Details
        this.invoiceDetails.DetailMarkdown = new Surface({
            content: 'title content',
            size: [window.innerWidth, true],
            classes: ['invoice-view-title-default']
        });
        this.invoiceDetails.Views.push(this.invoiceDetails.DetailMarkdown);

        // Cost
        this.invoiceDetails.Cost = new Surface({
            content: '',
            size: [window.innerWidth, true],
            classes: ['invoice-view-cost-default']
        });
        this.invoiceDetails.Cost.on('click', function(){
            // Line-items for an Invoice
            // - including Todos that are linked
            App.history.navigate('invoice_item/list/' + that.model.get('_id'));
        });
        this.invoiceDetails.Views.push(this.invoiceDetails.Cost);

        // To user
        this.invoiceDetails.ToSurface = new Surface({
            content: '',
            size: [window.innerWidth, true],
            classes: ['invoice-view-to-default']
        });
        this.invoiceDetails.ToSurface.on('click', function(){

            // // Redo assignment
            // if(that.model.get('to_user_id')){
            //     // already assigned!
            //     // - visit that person
            //     App.history.navigate('user/' + that.model.get('to_user_id._id'));
            //     return;
            // }

            App.history.modifyLast({
                tag: 'StartTo'
            });
            App.history.navigate('invoice/to/' + that.model.get('_id'));
        });
        this.invoiceDetails.Views.push(this.invoiceDetails.ToSurface);

        // From user
        this.invoiceDetails.FromSurface = new Surface({
            content: '',
            size: [window.innerWidth, true],
            classes: ['invoice-view-from-default'],
            properties: {
                borderBottom: "1px solid #ddd;"
            }
        });
        this.invoiceDetails.FromSurface.on('click', function(){
            // // Redo assignment
            // if(that.model.get('from_user_id')){
            //     // already changed owner!
            //     // - visit that person
            //     App.history.navigate('user/' + that.model.get('from_user_id._id'));
            //     return;
            // }

            App.history.modifyLast({
                tag: 'StartOwner'
            });
            App.history.navigate('invoice/owner/' + that.model.get('_id'));
        });
        this.invoiceDetails.Views.push(this.invoiceDetails.FromSurface);

        this.invoiceDetails.getSize = function(){
            var tmpH = 1;
            that.invoiceDetails.Views.forEach(function(tmp){
                if(tmp._trueSize){
                    tmpH += tmp._trueSize[1];
                }
            });
            return [undefined, tmpH ? tmpH : undefined];
        }


        this.invoiceDetails.SeqLayout.sequenceFrom(this.invoiceDetails.Views);

        this.invoiceDetails.add(Utils.usePlane('content',1)).add(this.invoiceDetails.BgSurface);
        this.invoiceDetails.add(Utils.usePlane('content',2)).add(this.invoiceDetails.SeqLayout);

        that.invoiceDetails.Views.forEach(function(tmp){
            tmp.on('deploy', function(){
                console.log('deployed, ratios setting3');
                that.invoiceLayout.Layout.setRatios([true, 1, true]);                
            });
        });


        this.invoiceLayout.Layout.Views.push(this.invoiceDetails);


        // InvoiceContent (updates)
        this.invoiceContent = new InvoiceContentView({
            invoice_id: this.invoice_id
        });
        this._subviews.push(this.invoiceContent);
        this.invoiceContent.View = new View();
        this.invoiceContent.View.add(Utils.usePlane('content')).add(this.invoiceContent);

        this.invoiceLayout.Layout.Views.push(this.invoiceContent.View);

        this.invoiceLayout.add(this.invoiceLayout.Layout);
        this.contentScrollView.Views.push(this.invoiceLayout);


        // OptionButtons (add text, etc.)
        this.invoiceButtons = new View();
        this.invoiceButtons.ButtonSurface = new Surface({
            content: '<div>Post Message to Stream</div>',
            size: [undefined, true],
            classes: ['invoice-view-invoicecontent-add-button-default']
        });
        this.invoiceButtons.getSize = function(){
            return [undefined, 60];
        };
        this.invoiceButtons.ButtonSurface.on('click', function(){
            
            Utils.Popover.Buttons({
                title: 'Choose type of content',
                buttons: [{
                    text: 'Text',
                    success: function(){

                        Utils.Popover.Prompt('Post Text', '', 'Post')
                        .then(function(p){
                            if(p && p.trim() !== ''){

                                var InvoiceContent = new InvoiceContentModel.InvoiceContent({
                                    invoice_id: that.invoice_id,
                                    type: 'text',
                                    text: p
                                });
                                InvoiceContent.save()
                                .then(function(){
                                    that.invoiceContent.collection.fetch();
                                });

                            }
                        });

                    }
                }]

            });


        });
        this.invoiceButtons.add(Utils.usePlane('content',2)).add(this.invoiceButtons.ButtonSurface);

        this.invoiceLayout.Layout.Views.push(this.invoiceButtons);
        this.invoiceLayout.Layout.sequenceFrom(this.invoiceLayout.Layout.Views);


        // Content state modifier
        this.ContentStateModifier = new StateModifier();

        // Content Lightbox
        // - waiting for the user to load a bit
        this.contentLightbox = new RenderController();
        // this.contentLightbox.getSize = function(){
        //     return 
        // }
        this.loadingUser = new View();
        this.loadingUser.StateModifier = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.loadingUser.Surface = new Surface({
            content: '<i class="icon ion-loading-c"></i>',
            size: [true, true],
            properties: {
                fontSize: "40px",
                textAlign: "center",
                color: "#444",
                lineHeight: "50px"
            }
        });
        this.loadingUser.add(this.loadingUser.StateModifier).add(this.loadingUser.Surface);

        // Error
        this.errorLoading = new View();
        this.errorLoading.StateModifier = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.errorLoading.Surface = new Surface({
            content: 'This Invoice is not yet available',
            size: [true, true],
            properties: {
                padding: "0 10px",
                fontSize: "24px",
                textAlign: "center",
                color: "#777",
                lineHeight: "32px"
            }
        });
        this.errorLoading.add(this.errorLoading.StateModifier).add(this.errorLoading.Surface);

        this.contentLightbox.show(this.loadingUser);

        // this.layout.content.add(this.ContentStateModifier).add(this.mainNode);
        this.layout.content.add(this.ContentStateModifier).add(this.contentLightbox);

    };

    PageView.prototype.make_payment = function() {
        var that = this;

        // Pay with/like what? 
        var title = 'Pay Invoice',
            buttons = [{
                text: 'Credit Card',
                success: function(){
                    that.make_payment_cc();
                }
            }];

        if(that.model.get('from_user_id._id') == App.Data.User.get('_id')){
            title = 'Collect Invoice';
            buttons.push({
                text: 'Just Mark as Paid',
                success: function(){
                    
                    // var data = {};
                    // if(that.model.get('tags').indexOf('paid') === -1){
                    //     data = {
                    //         add_tags: ['paid']
                    //     }
                    // } else {
                    //     data = {
                    //         remove_tags: ['paid']
                    //     };
                    // }

                    that.model.save({
                        add_tags: ['paid']
                    },{
                        patch: true,
                        // success: function(){
                        //     that.model.fetch();    
                        // }
                    }).then(function(){
                        // that.model.set({
                        //     assigned_id: App.Data.User.toJSON()
                        // });
                        that.model.fetch();
                        that.invoiceContent.collection.fetch();
                        // App.history.backTo('StartAssign');
                    });

                }
            });
        }

        Utils.Popover.Buttons({
            title: title,
            body: 'How is this invoice being paid?',
            buttons: buttons
        });

    };

    PageView.prototype.make_payment_cc = function(){
        var that = this;

        // Gather PaymentSources

        var PaymentSources = new PaymentSourceModel.PaymentSourceCollection([],{
        });
        PaymentSources.fetch();

        PaymentSources.populated().then(function(){
            var listData = [];

            PaymentSources.toJSON().forEach(function(payment){
                listData.push({
                    text: '<div>'+S(payment.name) + '</div><div>*'+S(payment.last4)+'</div>',
                    classes: ['modal-option-list-default','card-line-default'],
                    value: payment,
                    success: function(option){
                        // Make payment
                        console.log('making payment');
                        console.log(option);

                        $.ajax({
                            url: Credentials.server_root + 'invoice/pay/' + that.model.get('_id'),
                            cache: false,
                            method: 'POST',
                            data: {
                                payment_source_id: option.value._id // PaymentSource._id
                            },
                            success: function(response){
                                // Succeeded paying for Invoice!
                                console.log(response);

                                Utils.Notification.Toast('Succeeded making payment!');

                                // Update InvoiceContent (subview) collection
                                that.invoiceContent.collection.fetch();
                            },
                            error: function(err){
                                if(err.responseJSON.msg){
                                    alert(err.responseJSON.msg);
                                }
                            }
                        });


                    }
                });
            });

            listData.push({
                text: '<i class="icon ion-plus"></i> Add new card',
                success: function(){
                    App.history.navigate('payment_source/add/creditcard');
                }
            });

            Utils.Popover.List({
                list: listData
            });

        });

    };

    PageView.prototype.refreshData = function() {
        try {
            this.model.fetch();
            this.tabBar.Layout.Stories.GameStoryListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        console.log('RemoteRefresh - PageView');
        Utils.RemoteRefresh(this,snapshot);
    };

    PageView.prototype.update_content = function(){
        var that = this;

        console.info('update_content');


        if(that.model != undefined && that.model.hasFetched){
            // pass

            // Make payment using PaymentSource
            // this.headerContent.PaymentLightbox.show(this.headerContent.MakePayment);
            // if(that.model.get('tags') && that.model.get('tags').indexOf('paid') !== -1){
            //     // complete
            //     this.headerContent.MarkPaid.setContent('<i class="icon ion-social-usd"></i>');
            //     this.headerContent.MarkPaid.setClasses(['header-tab-icon-text-big','marked-paid']);
            // } else {
            //     // Not complete
            //     this.headerContent.MarkPaid.setContent('<i class="icon ion-social-usd-outline"></i>');
            //     this.headerContent.MarkPaid.setClasses(['header-tab-icon-text-big']);
            // }

            // "paid" tag
            if(that.model.get('tags') && that.model.get('tags').indexOf('paid') !== -1){
                // complete
                this.headerContent.PaidLightbox.show(this.headerContent.MarkPaid);
                this.headerContent.MarkPaid.setContent('<i class="icon ion-social-usd"></i>');
                this.headerContent.MarkPaid.setClasses(['header-tab-icon-text-big','marked-paid']);
            } else {
                // this.headerContent.PaidLightbox.hide();
                this.headerContent.PaidLightbox.show(this.headerContent.MakePayment);
                // // Not complete
                // this.headerContent.MarkPaid.setContent('<i class="icon ion-social-usd-outline"></i>');
                // this.headerContent.MarkPaid.setClasses(['header-tab-icon-text-big']);
            }

            // title/details/description
            this.invoiceDetails.DetailMarkdown.setContent(S(that.model.get('title')));

            // amount
            this.invoiceDetails.Cost.setContent('<div>' + S(numeral(that.model.get('amount')).format('$0,0.00')) + ' <span>&nbsp;+/-&nbsp;</span></div>');

            // to
            if(that.model.get('to_user_id')){
                // assigned to someone
                this.invoiceDetails.ToSurface.setContent('to: ' + that.model.get('to_user_id.profile.name') || '');
                this.invoiceDetails.ToSurface.setClasses(['invoice-view-to-default','assigned']);
            } else {
                // Not assigned
                this.invoiceDetails.ToSurface.setContent('not shared with anyone');
                this.invoiceDetails.ToSurface.setClasses(['invoice-view-to-default','notassigned']);
            }

            // from
            if(that.model.get('from_user_id')){
                // assigned to someone
                this.invoiceDetails.FromSurface.setContent('pay to: ' + that.model.get('from_user_id.profile.name') || '');
                this.invoiceDetails.FromSurface.setClasses(['invoice-view-from-default','has_owner']);
            } else {
                // No owner at the moment (what the fuck)
                this.invoiceDetails.FromSurface.setContent('');
                this.invoiceDetails.FromSurface.setClasses(['invoice-view-from-default','no_owner']);
                this.invoiceDetails.FromSurface.setSize([undefined,1]);
            }

            return;


            // datetime
            this.gameLeft.GameDatetime.Surface.setContent(moment(that.model.get('created')).format('MMMM Do'));

            // starred
            // - is one of my Player_ids in the Stars ?
            // - also can check my user_id
            // console.log(_.pluck(this.model.get('Star'),'user_id'));
            // debugger;
            var StarTotal = that.model.get('StarTotal');
            that.isStarred = false;
            console.log(_.pluck(that.model.get('Star'),'user_id'));
            if(_.pluck(that.model.get('Star'),'user_id').indexOf(App.Data.User.get('_id')) !== -1){
                that.isStarred = true;
                // debugger;
                that.gameLeft.Starred.Surface.setContent('<i class="icon ion-ios7-star"></i><span>'+StarTotal+'</span>');
            } else {
                that.gameLeft.Starred.Surface.setContent('<i class="icon ion-ios7-star-outline"></i><span>'+StarTotal+'</span>');
            }

            // Certified?
            var myResult = that.GetMyResult();
            if(myResult !== false){
                switch(myResult.certified){
                    case false:
                        this.gameLeft.CertifyLayout.show(this.gameLeft.CertifiedFalse);
                        break;
                    case null:
                        this.gameLeft.CertifyLayout.show(this.gameLeft.CertifyNull);
                        break;
                    case true:
                        this.gameLeft.CertifyLayout.show(this.gameLeft.CertifiedTrue);
                        break;

                }
            }
            
            // // Profile Photo
            // if(that.model.get('profilephoto.urls')){
            //     this.gameLeft.ProfileImage.Surface.setContent(that.model.get('profilephoto.urls.thumb100x100'));
            // } else {
            //     this.gameLeft.ProfileImage.Surface.setContent('img/generic-profile.png');
            // }

            // // username (header)
            // // - using "email" for now
            // if(that.model.get('Profile.email') !== false){
            //     // this.gameLeft.ProfileName.setContent(that.model.get('Profile.name'));
            //     that.header.navBar.title.setContent(that.model.get('Profile.email') ? that.model.get('Profile.email').split('@')[0].split('+')[0] : '');
            // } else {
            //     // not me
            //     // - no email set
            //     // - not showing any name for them
            //     that.header.navBar.title.setContent('');
            //     // that.header.navBar.title.setContent(that.model.get('Profile.email') ? that.model.get('email').split('@')[0].split('+')[0] : '');
            // }

            // // back button
            // if(that.is_me === true){
            //     // no back button
            // } else {
            //     that.header.navBar.back.setSize([20,undefined]);
            //     that.header.navBar.back.setContent('<i class="icon ion-android-arrow-back"></i>');
            //     // that.header.navBar.title.setContent(that.model.get('email').split('@')[0].split('+')[0]);
            // }

        }

        // // Total results/places
        // if(that.stats_collection != undefined && that.stats_collection.hasFetched){
        //     // Summary/stat surfaces (update)

        //     // wins
        //     that.profileRight.OverallRecord.Left.setContent('<div>'+that.stats_collection.summary[that.player_id].w+'</div><div>wins</div>');
        //     // winning percentage
        //     that.profileRight.OverallRecord.LeftMiddle.setContent('<div>'+numeral(that.stats_collection.summary[that.player_id].wp).format('.000')+'</div><div>Win %</div>');
        //     // 1st place
        //     that.profileRight.OverallRecord.Middle.setContent('<div>'+that.stats_collection.summary[that.player_id]['1']+'</div><div>1st</div>');


        //     // _.each(that.stats_collection.summary[that.player_id], function(value, key){
        //     //     var tmpKey = '';
        //     //     switch(key){
        //     //         case "1":
        //     //         case "2":
        //     //         case "3":
        //     //             tmpKey = numeral(key).format('0o');
        //     //             break;
        //     //         case "4":
        //     //             tmpKey = numeral(key).format('0o') + '+';
        //     //             break;

        //     //         case "w":
        //     //         case "l":
        //     //         case "t":
        //     //             tmpKey = key.toUpperCase();
        //     //             break;
        //     //     }
        //     //     that.GridSurfacesTotal[key].setContent(tmpKey + ': ' + value.toString());
        //     // });

        // }

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

                        // Hiding the sideView
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Content
                        Timer.setTimeout(function(){
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

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

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            // Bring map content back
                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.outTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50]
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
