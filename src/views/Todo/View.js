
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
    var SmartSurface = require('views/common/SmartSurface');

    // Extras
    var Utils = require('utils');
    var _ = require('underscore');
    var numeral = require('lib2/numeral.min');
    var crypto = require('lib2/crypto');

    // Models
    var InvoiceModel = require('models/invoice');
    var TodoModel = require('models/todo');
    var TodoContentModel = require('models/todo_content');

    // Subviews

    // TodoContent
    var TodoContentView      = require('./Subviews/TodoContent');

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

        this.todo_id = that.options.args[0];
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
        this.model = new TodoModel.Todo({
            _id: this.todo_id
        });
        this.model.fetch({prefill: true});

        // this._onRemoteRefresh = [];
        // this._onRemoteRefresh.push(this.model);

    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // -- settings/message (lightbox)
        this.headerContent = new View();

        // Complete
        this.headerContent.Complete = new View();
        this.headerContent.Complete.Lightbox = new RenderController();
        this.headerContent.Complete.SizeMod = new StateModifier({
            size: [80, 60]
        });
        this.headerContent.Complete.add(this.headerContent.Complete.SizeMod).add(this.headerContent.Complete.Lightbox);
        // settings
        this.headerContent.MarkComplete = new Surface({
            content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Not Done</div>',
            size: [80, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.MarkComplete.on('longtap', function(){
            Utils.Help('Todo/View/MarkComplete');
        });
        this.headerContent.MarkComplete.on('click', function(){
            
            var data = {},
                tags = that.model.get('tags');
            if(that.model.get('tags').indexOf('complete') === -1){
                data = {
                    add_tags: ['complete']
                }
                tags.push('complete');
                that.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
                that.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big']);

            } else {
                data = {
                    remove_tags: ['complete']
                };
                tags = _.without(tags, 'complete');

                // that.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
                // that.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big','marked-complete']);
            }

            // that.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
            // that.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big','marked-complete']);

            that.model.set({
                tags: tags
            });
            that.model.save(data,{
                patch: true,
                // success: function(){
                //     that.model.fetch();    
                // }
            }).then(function(){
                // that.model.set({
                //     assigned_id: App.Data.User.toJSON()
                // });
                that.model.fetch();
                that.todoContent.collection.fetch();
                // App.history.backTo('StartAssign');
            });

        });

        // Invoiced
        this.headerContent.Invoice = new View();
        this.headerContent.Invoice.Lightbox = new RenderController();
        this.headerContent.Invoice.SizeMod = new StateModifier({
            size: [80, 60]
        });
        this.headerContent.Invoice.add(this.headerContent.Invoice.SizeMod).add(this.headerContent.Invoice.Lightbox);
        // settings
        this.headerContent.ViewInvoice = new Surface({
            content: '<i class="icon ion-social-usd"></i>',
            size: [80, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ViewInvoice.on('longtap', function(){
            Utils.Help('Todo/View/ViewInvoice');
        });
        this.headerContent.ViewInvoice.on('click', function(){
            
            // Invoiced?
            if(that.model.get('invoice_id')){
                // Go to invoice
                App.history.navigate('invoice/' + that.model.get('invoice_id._id'));
                return;
            }

            // Not invoiced, bring up the options

            Utils.Popover.Buttons({
                title: 'Attach to Invoice',
                buttons: [
                // {
                //     text: 'Browse Unpaid Invoices',
                //     success: function(){

                //         var p = prompt('Update text');
                //         if(p && p.trim() !== ''){

                            

                //         }

                //     }
                // },
                {
                    text: 'New Invoice',
                    success: function(){

                        // Create a new Invoice
                        // Add this Todo to the Invoice

                        Utils.Notification.Toast('Creating Invoice');

                        var a = prompt('Cost of this Todo');
                        a = parseFloat(a);
                        if(!a){
                            // canceled
                            console.error(a);
                            return;
                        }

                        var newModel = new InvoiceModel.Invoice({
                            // friend_id: that.model.get('_id'),
                            // amount: a,
                            title: that.model.get('title')
                            // todo_id: that.model.get('_id')
                        });

                        newModel.save()
                        .then(function(newInvoice){

                            that._subviews.forEach(function(sv){
                                sv.collection.fetch();
                            });

                            that.model.save({
                                cost: a,
                                invoice_id: newInvoice._id
                            },{
                                patch: true
                            })
                            .then(function(newModel){

                                App.history.navigate('invoice/' + newInvoice._id);

                            });
                            
                        });

                    }
                }]

            });

            return;

            var data = {};
            if(that.model.get('tags').indexOf('complete') === -1){
                data = {
                    add_tags: ['complete']
                }
            } else {
                data = {
                    remove_tags: ['complete']
                };
            }

            that.model.save(data,{
                patch: true,
                // success: function(){
                //     that.model.fetch();    
                // }
            }).then(function(){
                // that.model.set({
                //     assigned_id: App.Data.User.toJSON()
                // });
                that.model.fetch();
                that.todoContent.collection.fetch();
                // App.history.backTo('StartAssign');
            });

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
            console.log(that.model.get('included'));
            console.log(that.model.get('included_email_only'));
            that.model.get('included_email_only').forEach(function(EmailOnlyFriend){
                listData.push({
                    text: EmailOnlyFriend.email,
                    success: function(){
                        Utils.Notification.Toast('Cannot remove yet!');
                    }
                });
            });

            // Add a new email address
            listData.push({
                text: '<i class="icon ion-plus-round"></i> Add new Email',
                success: function(){

                    Utils.Popover.Prompt('Email Address', '', 'Add Email', 'Cancel', 'email').then(function(p){

                        if(!p || p.trim() == ''){
                            // Utils.Notification.Toast('Todo NOT created');
                            return;
                        }

                        $.ajax({
                            url: App.Credentials.server_root + 'todo/emailinvite/' + that.model.get('_id'),
                            method: 'post',
                            data: {
                                email: p.trim()
                            },
                            success: function(result, status){
                                console.log(result);
                                console.log(status);
                                that.model.fetch();
                                Utils.Notification.Toast('Email added');
                            }
                        });

                    });


                }
            });

            // Choose from list of existing friends
            listData.push({
                text: '<i class="icon ion-plus-round"></i> Add Friend (email)',
                success: function(){

                    // Go to the Picker
                    App.history.navigate('friend/emailonly/choose/todo/' + that.model.get('_id'));

                }
            });

            Utils.Popover.List({
                list: listData
            });

        });



        // create the header
        this.header = new StandardHeader({
            content: "Job",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Email,
                this.headerContent.Invoice,
                this.headerContent.Complete
            ]
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
        // - if I have it starred (todo)
        // - if I need to certify

        this.todoLayout = new View();
        this.todoLayout.Layout = new FlexibleLayout({
            direction: 1, // y, vertical
            ratios: [true, 1, true]
        });

        var emitter = new EventHandler();

        this.todoLayout.Layout.Views = [];

        // Details
        this.todoDetails = new View();
        this.todoDetails.BgSurface = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: 'rgba(250,250,250,0.8)'
            }
        });
        this.todoDetails.SeqLayout = new SequentialLayout();
        this.todoDetails.Views = [];

        // Title
        this.todoDetails.Title = new View();
        this.todoDetails.Title.Surface = new Surface({
            content: 'title content',
            size: [window.innerWidth, true],
            classes: ['todo-view-title-default']
        });
        // Utils.bindSize(emitter, this.todoDetails.Title, this.todoDetails.Title.Surface);
        this.todoDetails.Title.add(this.todoDetails.Title.Surface);
        this.todoDetails.Views.push(this.todoDetails.Title.Surface);

        // Assign/delegate to someone
        this.todoDetails.Assigned = new View();
        this.todoDetails.Assigned.Surface = new Surface({
            content: '',
            size: [window.innerWidth, true],
            classes: ['todo-view-assigned-default']
        });
        this.todoDetails.Assigned.Surface.on('click', function(){
            // // Redo assignment
            // if(that.model.get('assigned_id')){
            //     // already assigned!
            //     // - visit that person
            //     App.history.navigate('user/' + that.model.get('assigned_id._id'));
            //     return;
            // }

            App.history.modifyLast({
                tag: 'StartAssign'
            });
            App.history.navigate('todo/assign/' + that.model.get('_id'));
        });

        // Utils.bindSize(emitter, this.todoDetails.Assigned, this.todoDetails.Assigned.Surface);
        this.todoDetails.Assigned.add(this.todoDetails.Assigned.Surface);
        this.todoDetails.Views.push(this.todoDetails.Assigned.Surface);

        // owner
        this.todoDetails.Owner = new View();
        this.todoDetails.Owner.Surface = new Surface({
            content: '',
            size: [window.innerWidth, true],
            classes: ['todo-view-owner-default'],
            properties: {
                borderBottom: "1px solid #ddd;"
            }
        });
        this.todoDetails.Owner.Surface.on('click', function(){
            // // Redo owner
            // if(that.model.get('owner_id') && that.model.get('owner_id._id') != App.Data.User.get('_id')){
            //     // already changed owner!
            //     // - visit that person
            //     App.history.navigate('user/' + that.model.get('owner_id._id'));
            //     return;
            // }

            App.history.modifyLast({
                tag: 'StartOwner'
            });
            App.history.navigate('todo/owner/' + that.model.get('_id'));
        });

        // Utils.bindSize(emitter, this.todoDetails.Owner, this.todoDetails.Owner.Surface);
        this.todoDetails.Owner.add(this.todoDetails.Owner.Surface);
        this.todoDetails.Views.push(this.todoDetails.Owner.Surface);


        // // Tags
        // this.todoDetails.Tags = new View();
        // this.todoDetails.Tags.Surface = new Surface({
        //     content: 'no tags',
        //     size: [window.innerWidth, true],
        //     classes: ['todo-view-tags-default']
        // });
        // this.todoDetails.Tags.Surface.on('click', function(){
        //     Utils.Popover.Buttons({
        //         title: 'Add/Remove Tags',
        //         buttons: [{
        //             text: 'Add Tag'
        //         }]
        //     });
        // });
        // // Utils.bindSize(emitter, this.todoDetails.Title, this.todoDetails.Title.Surface);
        // this.todoDetails.Tags.add(this.todoDetails.Tags.Surface);
        // this.todoDetails.Views.push(this.todoDetails.Tags.Surface);



        this.todoDetails.getSize = function(){
            var tmpH = 1;
            that.todoDetails.Views.forEach(function(tmp){
                if(tmp._trueSize){
                    tmpH += tmp._trueSize[1];
                }
            });
            return [undefined, tmpH ? tmpH : undefined];
        }

        this.todoDetails.SeqLayout.sequenceFrom(this.todoDetails.Views);
        emitter.on('newsize', function(){
            console.info('resyncing!');
            that.todoDetails.SeqLayout.sequenceFrom(that.todoDetails.Views);
        });

        this.todoDetails.add(Utils.usePlane('content',1)).add(this.todoDetails.BgSurface);
        this.todoDetails.add(Utils.usePlane('content',2)).add(this.todoDetails.SeqLayout);
        this.todoLayout.Layout.Views.push(this.todoDetails);

        that.todoDetails.Views.forEach(function(tmp){
            tmp.on('deploy', function(){
                console.log('deployed, ratios setting');
                that.todoLayout.Layout.setRatios([true, 1, true]);                
            });
            // tmp._eventOutput.on('deploy', function(){
            //     console.log('deployed, ratios setting2');
            //     that.todoLayout.Layout.setRatios([true, 1, true]);                
            // });
        });


        // Content
        this.todoContent = new TodoContentView({
            todo_id: this.todo_id
        });
        this._subviews.push(this.todoContent);
        this.todoContent.View = new View();
        this.todoContent.View.add(Utils.usePlane('content')).add(this.todoContent);
        this.todoLayout.Layout.Views.push(this.todoContent.View);


        // Sequence everything
        this.todoLayout.Layout.sequenceFrom(this.todoLayout.Layout.Views);
        emitter.on('newsize', function(){
            console.info('resyncing!');
            that.todoLayout.Layout.setRatios([true, 1, true]);
        });

        this.todoLayout.add(this.todoLayout.Layout);

        this.contentScrollView.Views.push(this.todoLayout);


        // OptionButtons (add text, etc.)
        this.todoButtons = new View();
        this.todoButtons.ButtonSurface = new Surface({
            content: '<div>Post Message to Job</div>',
            size: [undefined, true],
            classes: ['todo-view-todocontent-add-button-default']
        });
        this.todoButtons.getSize = function(){
            return [undefined, 60];
        };
        this.todoButtons.ButtonSurface.on('click', function(){
            
            Utils.Popover.Buttons({
                title: 'Choose type of content',
                buttons: [{
                    text: 'Text',
                    success: function(){


                        Utils.Popover.Prompt('Post Text', '', 'Post')
                        .then(function(p){
                            if(p && p.trim() !== ''){

                                var TodoContent = new TodoContentModel.TodoContent({
                                    todo_id: that.todo_id,
                                    type: 'text',
                                    text: p
                                });
                                TodoContent.save()
                                .then(function(){
                                    that.todoContent.collection.fetch();
                                });

                            }

                        });


                    },
                },{
                    text: 'Take a Picture',
                    success: function(){

                        Utils.takePicture('camera', {}, that.uploadMedia.bind(that), function(message){
                            // failed taking a picture
                            console.log(message);
                            console.log(JSON.stringify(message));
                            Utils.Notification.Toast('Failed picture');
                        });


                    },
                },{
                    text: 'Gallery',
                    success: function(){

                        Utils.takePicture('gallery', {}, that.uploadMedia.bind(that), function(message){
                            // failed taking a picture
                            console.log(message);
                            console.log(JSON.stringify(message));
                            Utils.Notification.Toast('Failed picture');
                        });


                    },
                }]

            });


        });
        this.todoButtons.add(Utils.usePlane('content',1)).add(this.todoButtons.ButtonSurface);

        this.todoLayout.Layout.Views.push(this.todoButtons);



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
        this.contentLightbox.show(this.loadingUser);

        // this.layout.content.add(this.ContentStateModifier).add(this.mainNode);
        this.layout.content.add(this.ContentStateModifier).add(this.contentLightbox);

    };

    PageView.prototype.refreshData = function() {
        try {
            this.model.fetch();
            this.tabBar.Layout.Stories.GameStoryListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        Utils.RemoteRefresh(this,snapshot);
    };

    PageView.prototype.update_content = function(){
        var that = this;

        console.info('update_content');


        if(that.model != undefined && that.model.hasFetched){
            // pass

            // title
            this.todoDetails.Title.Surface.setContent(that.model.get('title'));

            console.info('update_content');
            console.log(that.model.get('tags'));
            
            // "complete" tag
            this.headerContent.Complete.Lightbox.show(this.headerContent.MarkComplete);
            if(that.model.get('tags') && that.model.get('tags').indexOf('complete') !== -1){
                // complete
                this.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
                this.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big','marked-complete']);
            } else {
                // Not complete
                this.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark-outline"></i>');
                this.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big']);
            }

            // Invoicing
            this.headerContent.Invoice.Lightbox.show(this.headerContent.ViewInvoice);
            if(that.model.get('invoice_id')){
                // complete
                this.headerContent.ViewInvoice.setContent('<i class="icon ion-social-usd"></i>');
                this.headerContent.ViewInvoice.setClasses(['header-tab-icon-text-big','marked-complete']);
            } else {
                // Not complete
                this.headerContent.ViewInvoice.setContent('<i class="icon ion-social-usd"></i>');
                this.headerContent.ViewInvoice.setClasses(['header-tab-icon-text-big']);
            }

            // // tags
            // var tagContent = '';
            // if(that.model.get('tags') && that.model.get('tags').length > 0){
            //     tagContent += '<div>';
            //     that.model.get('tags').forEach(function(tmpTag){
            //         tagContent += '<span class="label">'+S(tmpTag)+'</span>';
            //     });
            // } else {
            //     tagContent += '<div>';
            //         tagContent += 'no tags';
            //     tagContent += '</div>';
            // }
            // this.todoDetails.Tags.Surface.setContent(tagContent);

            // assigned
            if(that.model.get('assigned_id')){
                // assigned to someone
                this.todoDetails.Assigned.Surface.setContent('assigned: ' + that.model.get('assigned_id.profile.name'));
                this.todoDetails.Assigned.Surface.setClasses(['todo-view-assigned-default','assigned']);
            } else {
                // Not assigned
                this.todoDetails.Assigned.Surface.setContent('not assigned');
                this.todoDetails.Assigned.Surface.setClasses(['todo-view-assigned-default','notassigned']);
            }

            // owner
            if(that.model.get('owner_id')){
                // assigned to someone
                if(that.model.get('owner_id.profile')){
                    this.todoDetails.Owner.Surface.setContent('employer: ' + that.model.get('owner_id.profile.name'));
                } else {
                    this.todoDetails.Owner.Surface.setContent('employer: <span data-replace-id="' + that.model.get('owner_id') + '" data-replace-model="Profile" data-replace-target="profile.name"/>&nbsp;</span>');
                    Utils.dataModelReplaceOnSurface(this.todoDetails.Owner.Surface);
                }
                this.todoDetails.Owner.Surface.setClasses(['todo-view-owner-default','has_owner']);
            } else {
                // No owner at the moment
                this.todoDetails.Owner.Surface.setContent('');
                this.todoDetails.Owner.Surface.setClasses(['todo-view-owner-default','no_owner']);
                this.todoDetails.Owner.Surface.setSize([undefined,1]);
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

    PageView.prototype.uploadMedia = function(imageURI){
        var that = this;

        Utils.Notification.Toast('Uploading');

        console.log('uploading...');
        console.log(this.player_id);
        console.log({
            token : App.Data.UserToken,
            // player_id : this.player_id,
            extra: {
                "description": "Uploaded from my phone testing 234970897"
            }
        });

        var ft = new FileTransfer(),
            options = new FileUploadOptions();

        options.fileKey = "file";
        options.fileName = 'filename.jpg'; // We will use the name auto-generated by Node at the server side.
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
        options.params = {
            token : App.Data.UserToken,
            todo_id: that.todo_id,
            extra: {
                "description": "Uploaded from my phone testing 193246"
            }
        };

        ft.onprogress = function(progressEvent) {
            
            if (progressEvent.lengthComputable) {
                // loadingStatus.setPercentage(progressEvent.loaded / progressEvent.total);
                // console.log('Percent:');
                // console.log(progressEvent.loaded);
                // console.log(progressEvent.total);
                console.log((progressEvent.loaded / progressEvent.total) * 100);
                Utils.Notification.Toast((Math.floor((progressEvent.loaded / progressEvent.total) * 1000) / 10).toString() + '%');
            } else {
                // Not sure what is going on here...
                // loadingStatus.increment();
                console.log('not computable?, increment');
            }
        };
        ft.upload(imageURI, App.Credentials.server_root + "todocontent/media",
            function (e) {
                // getFeed();
                // alert('complete');
                // alert('upload succeeded');
                Utils.Notification.Toast('Upload succeeded');
                Utils.Notification.Toast('~10 seconds to process');

                // update collection
                Timer.setTimeout(function(){
                    that.todoContent.collection.fetch();
                },5000);

            },
            function (e) {
                console.error(e);
                Utils.Notification.Toast('Upload failed');
            }, options);
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

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? -1.5 : 1.5)),0,0));

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.outTransition);

                        }, delayShowing); // + transitionOptions.outTransition.duration);


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
