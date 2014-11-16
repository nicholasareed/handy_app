
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
    var LayoutBuilder = require('views/common/LayoutBuilder');

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
            that.contentLightbox.show(that.PageLayout);
            console.log(that.PageLayout.Views);

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
            size: [60, 60]
        });
        this.headerContent.Complete.add(this.headerContent.Complete.SizeMod).add(this.headerContent.Complete.Lightbox);
        // settings
        this.headerContent.MarkComplete = new Surface({
            content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Not Done</div>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.MarkComplete.on('longtap', function(){
            Utils.Help('Todo/View/MarkComplete');
        });
        this.headerContent.MarkComplete.on('click', function(){
            
            var data = {},
                tags = that.model.get('tags');
            if(that.model.get('tags').indexOf('complete') === -1){
                that.mark_complete();
                return;

                // data = {
                //     add_tags: ['complete']
                // }
                // tags.push('complete');
                // that.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
                // that.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big']);

            } else {
                that.mark_incomplete();
                return;

                data = {
                    remove_tags: ['complete']
                };
                tags = _.without(tags, 'complete');

                // that.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
                // that.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big','marked-complete']);
            }

            return;



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

        // Menu
        this.headerContent.Menu = new Surface({
            content: '<i class="icon ion-navicon-round"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Menu.on('longtap', function(){
            Utils.Help('Todo/View/Menu');
        });
        this.headerContent.Menu.on('click', function(){
            
            Utils.Popover.Buttons({
                title: 'Additional Options',
                buttons: [{
                    text: 'Delete Job',
                    success: function(){

                        Utils.Notification.Toast('Deleting Job');

                        var data = {
                            active: false
                        }

                        // that.headerContent.Menu.setContent('<i class="icon ion-ios7-checkmark"></i>');
                        // that.headerContent.Menu.setClasses(['header-tab-icon-text-big','marked-complete']);

                        App.history.back();

                        that.model.set(data);
                        that.model.save(data,{
                            patch: true,
                            // success: function(){
                            //     that.model.fetch();    
                            // }
                        })
                        .fail(function(){
                            console.error('Failed saving active=false');
                        })
                        .then(function(){
                            that.model.fetch();
                            // that.todoContent.collection.fetch();
                        });
                    }
                }]
            });

        });

        // Invoiced
        this.headerContent.Invoice = new View();
        this.headerContent.Invoice.Lightbox = new RenderController();
        this.headerContent.Invoice.SizeMod = new StateModifier({
            size: [60, 60]
        });
        this.headerContent.Invoice.add(this.headerContent.Invoice.SizeMod).add(this.headerContent.Invoice.Lightbox);
        // settings
        this.headerContent.ViewInvoice = new Surface({
            content: '<i class="icon ion-social-usd"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ViewInvoice.on('longtap', function(){
            Utils.Help('Todo/View/ViewInvoice');
        });
        this.headerContent.ViewInvoice.on('click', function(){
            
            // Invoiced?
            if(that.model.get('invoice_id._id')){
                // Go to invoice
                App.history.navigate('invoice/' + that.model.get('invoice_id._id'));
                return;
            }
            if(that.model.get('invoice_id')){
                // Go to invoice
                App.history.navigate('invoice/' + that.model.get('invoice_id'));
                return;
            }

            // Not invoiced, bring up the options

            Utils.Popover.Alert('Tap the "Complete" icon to add a cost and assign to an invoice','OK');

            return;

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

                        Utils.Popover.Currency({
                            title: 'Cost of this Job'
                        })
                        .then(function(a){
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
            content: '<i class="icon ion-ios7-people"></i>',
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
            content: '', // no header title
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Menu,
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
        this.PageLayout = new LayoutBuilder({
            size: [undefined, undefined],
            flexible: {
                direction: 1, // vertical
                ratios: [true, 1, true],
                sequenceFrom: []
            }
        });
        this.PageLayout.Views = [];

        // // Pipe edgeHit (bottom) to next_page
        // this.PageLayout.on('edgeHit', function(data){
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
        
        this.createDetailsHolder();
        this.createTopBarLayout();
        this.createTopBarMinimized();
        this.createTopBarMaximized();
        this.createTodoContent();

        // this.PageLayout.flexible.Views = [];


        this.PageLayout.flexible.sequenceFrom(this.PageLayout.Views);

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

    PageView.prototype.createDetailsHolder = function(){
        var that = this;

        this.DetailsHolder = new RenderController({
            showingSize: true
        });
        this.DetailsHolder.Bg = new Surface({
            size: [undefined, undefined],
            classes: ['todo-view-details-bg']
        });

        this.DetailsHolder.View = new View();
        this.DetailsHolder.View.getSize = function(val){
            return that.DetailsHolder.getSize(val);
        }
        this.DetailsHolder.View.add(Utils.usePlane('content',1)).add(this.DetailsHolder.Bg);
        this.DetailsHolder.View.add(Utils.usePlane('content',2)).add(this.DetailsHolder);

        this.PageLayout.Views.push(this.DetailsHolder.View);

    };

    PageView.prototype.createTopBarLayout = function(){
        var that = this;


    };

    PageView.prototype.createTopBarMinimized = function(){
        var that = this;

        this.TopBarMinimized = new LayoutBuilder({
            size: [undefined, 50],
            flexible: {
                direction: 0, // horizontal
                ratios: [1, true],
                sequenceFrom: [{
                    surface: {
                        Title: new Surface({
                            content: '',
                            wrap: '<div class="ellipsis-all"></div>',
                            size: [undefined, undefined],
                            classes: ['todo-view-title-default']
                        }),
                        click: function(){
                            that.DetailsHolder.show(that.TopBarMaximized);
                            that.PageLayout.flexible.updateRatios();
                        }
                    }
                },{
                    surface: {
                        Employer: new Surface({
                            content: '<i class="icon ion-arrow-down-b"></i>',
                            size: [50, undefined],
                            classes: ['todo-view-minimized-employer-default']
                        }),
                        click: function(){
                            that.DetailsHolder.show(that.TopBarMaximized);
                            that.PageLayout.flexible.updateRatios();
                        }
                    }
                },
                // {
                //     surface: {
                //         Assigned: new Surface({
                //             content: '<i class="icon ion-person"></i>',
                //             size: [50, undefined],
                //             classes: ['todo-view-minimized-assigned-default']
                //         }),
                //         click: function(){
                //             that.DetailsHolder.show(that.TopBarMaximized);
                //             that.PageLayout.flexible.updateRatios();
                //         }
                //     }
                // },
                // {
                //     surface: {
                //         Maximize: new Surface({
                //             content: '<i class="icon ion-arrow-expand"></i>',
                //             size: [50, undefined]
                //         }),,
                //         click: function(){
                //             that.DetailsHolder.show(that.TopBarMaximized);
                //             that.PageLayout.flexible.updateRatios();
                //         }
                //     }
                // }
                ]
            }
        });

        this.DetailsHolder.show(this.TopBarMinimized);
    };

    PageView.prototype.createTopBarMaximized = function(){
        var that = this;

        this.TopBarMaximized = new LayoutBuilder({
            // size: [undefined, 60],
            // size: function(){
            //     return [undefined, this.TopBarMaximized];
            // },
            sequential: {
                sequenceFrom: [{
                    surface: {
                        Title: new Surface({
                            content: 'title',
                            size: [window.innerWidth, true],
                            classes: ['todo-view-title-default']
                        }),
                        click: function(){
                            that.DetailsHolder.show(that.TopBarMinimized);
                            that.PageLayout.flexible.updateRatios();
                        }
                    }
                },{
                    surface: {
                        Details: new Surface({
                            content: '',
                            wrap: '<div></div>',
                            size: [window.innerWidth, true],
                            classes: ['todo-view-details-default']
                        }),
                        click: function(){
                            that.DetailsHolder.show(that.TopBarMinimized);
                            that.PageLayout.flexible.updateRatios();
                        }
                    }
                },{
                    surface: {
                        Owner: new Surface({
                            content: '',
                            wrap: '<div></div>',
                            size: [window.innerWidth, true],
                            classes: ['todo-view-owner-default']
                        }),
                        click: function(){
                            App.history.modifyLast({
                                tag: 'StartOwner'
                            });
                            App.history.navigate('todo/owner/' + that.model.get('_id'));
                        }
                    }
                },{
                    surface: {
                        Assigned: new Surface({
                            content: '',
                            wrap: '<div></div>',
                            size: [window.innerWidth, true],
                            classes: ['todo-view-assigned-default']
                        }),
                        click: function(){
                            App.history.modifyLast({
                                tag: 'StartAssign'
                            });
                            App.history.navigate('todo/assign/' + that.model.get('_id'));
                        }
                    }
                },{
                    surface: {
                        Edit: new Surface({
                            content: 'Modify Job Details',
                            wrap: '<div class="outward-button"></div>',
                            size: [window.innerWidth, true],
                            classes: ['button-outwards-default']
                        }),
                        click: function(){
                            // Utils.Popover.Alert('Not Yet working','OK');
                            // return;
                            App.history.modifyLast({
                                tag: 'StartEdit'
                            });
                            App.history.navigate('todo/edit/' + that.model.get('_id'));
                        }
                    }
                }]
            }
        });

        // this.DetailsHolder.show(this.TopBarMinimized);
    };

    // PageView.prototype.createTopBarMaximized_old = function(){
    //     var that = this;

    //     this.todoLayout = new View();
    //     this.todoLayout.Layout = new FlexibleLayout({
    //         direction: 1, // y, vertical
    //         ratios: [true, 1, true]
    //     });

    //     this.todoLayout.Layout.Views = [];

    //     // top of todo

    //     // Details
    //     this.TopBarMaximized = new View();
    //     this.TopBarMaximized.BgSurface = new Surface({
    //         size: [undefined, undefined],
    //         properties: {
    //             backgroundColor: 'rgba(250,250,250,0.8)'
    //         }
    //     });
    //     this.TopBarMaximized.SeqLayout = new SequentialLayout();
    //     this.TopBarMaximized.Views = [];

    //     // Title
    //     this.TopBarMaximized.Title = new View();
    //     this.TopBarMaximized.Title.Surface = new Surface({
    //         content: 'title content',
    //         size: [window.innerWidth, true],
    //         classes: ['todo-view-title-default']
    //     });
    //     this.TopBarMaximized.Title.add(this.TopBarMaximized.Title.Surface);
    //     this.TopBarMaximized.Views.push(this.TopBarMaximized.Title.Surface);

    //     // Assign/delegate to someone
    //     this.TopBarMaximized.Assigned = new View();
    //     this.TopBarMaximized.Assigned.Surface = new Surface({
    //         content: '',
    //         size: [window.innerWidth, true],
    //         classes: ['todo-view-assigned-default']
    //     });
    //     this.TopBarMaximized.Assigned.Surface.on('click', function(){
    //         // // Redo assignment
    //         // if(that.model.get('assigned_id')){
    //         //     // already assigned!
    //         //     // - visit that person
    //         //     App.history.navigate('user/' + that.model.get('assigned_id._id'));
    //         //     return;
    //         // }

    //         App.history.modifyLast({
    //             tag: 'StartAssign'
    //         });
    //         App.history.navigate('todo/assign/' + that.model.get('_id'));
    //     });

    //     this.TopBarMaximized.Assigned.add(this.TopBarMaximized.Assigned.Surface);
    //     this.TopBarMaximized.Views.push(this.TopBarMaximized.Assigned.Surface);

    //     // owner
    //     this.TopBarMaximized.Owner = new View();
    //     this.TopBarMaximized.Owner.Surface = new Surface({
    //         content: '',
    //         size: [window.innerWidth, true],
    //         classes: ['todo-view-owner-default'],
    //         properties: {
    //             borderBottom: "1px solid #ddd;"
    //         }
    //     });
    //     this.TopBarMaximized.Owner.Surface.on('click', function(){
    //         // // Redo owner
    //         // if(that.model.get('owner_id') && that.model.get('owner_id._id') != App.Data.User.get('_id')){
    //         //     // already changed owner!
    //         //     // - visit that person
    //         //     App.history.navigate('user/' + that.model.get('owner_id._id'));
    //         //     return;
    //         // }

    //         App.history.modifyLast({
    //             tag: 'StartOwner'
    //         });
    //         App.history.navigate('todo/owner/' + that.model.get('_id'));
    //     });

    //     this.TopBarMaximized.Owner.add(this.TopBarMaximized.Owner.Surface);
    //     this.TopBarMaximized.Views.push(this.TopBarMaximized.Owner.Surface);


    //     // // Tags
    //     // this.TopBarMaximized.Tags = new View();
    //     // this.TopBarMaximized.Tags.Surface = new Surface({
    //     //     content: 'no tags',
    //     //     size: [window.innerWidth, true],
    //     //     classes: ['todo-view-tags-default']
    //     // });
    //     // this.TopBarMaximized.Tags.Surface.on('click', function(){
    //     //     Utils.Popover.Buttons({
    //     //         title: 'Add/Remove Tags',
    //     //         buttons: [{
    //     //             text: 'Add Tag'
    //     //         }]
    //     //     });
    //     // });
    //     // this.TopBarMaximized.Tags.add(this.TopBarMaximized.Tags.Surface);
    //     // this.TopBarMaximized.Views.push(this.TopBarMaximized.Tags.Surface);



    //     this.TopBarMaximized.getSize = function(){
    //         var tmpH = 1;
    //         that.TopBarMaximized.Views.forEach(function(tmp){
    //             if(tmp._trueSize){
    //                 tmpH += tmp._trueSize[1];
    //             }
    //         });
    //         return [undefined, tmpH ? tmpH : undefined];
    //     }

    //     this.TopBarMaximized.SeqLayout.sequenceFrom(this.TopBarMaximized.Views);

    //     this.TopBarMaximized.add(Utils.usePlane('content',1)).add(this.TopBarMaximized.BgSurface);
    //     this.TopBarMaximized.add(Utils.usePlane('content',2)).add(this.TopBarMaximized.SeqLayout);
    //     this.todoLayout.Layout.Views.push(this.TopBarMaximized);

    //     that.TopBarMaximized.Views.forEach(function(tmp){
    //         tmp.on('deploy', function(){
    //             console.log('deployed, ratios setting');
    //             that.todoLayout.Layout.setRatios([true, 1, true]);                
    //         });
    //         // tmp._eventOutput.on('deploy', function(){
    //         //     console.log('deployed, ratios setting2');
    //         //     that.todoLayout.Layout.setRatios([true, 1, true]);                
    //         // });
    //     });

    // };

    PageView.prototype.createTodoContent = function(){
        var that = this;

        // Content
        this.todoContent = new TodoContentView({
            todo_id: this.todo_id
        });
        this._subviews.push(this.todoContent);
        this.todoContent.View = new View();
        this.todoContent.View.add(Utils.usePlane('content')).add(this.todoContent);
        // this.todoLayout.Layout.Views.push(this.todoContent.View);


        // // Sequence everything
        // this.todoLayout.Layout.sequenceFrom(this.todoLayout.Layout.Views);

        // this.todoLayout.add(this.todoLayout.Layout);

        this.PageLayout.Views.push(this.todoContent.View);


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

        this.PageLayout.Views.push(this.todoButtons);

    };

    PageView.prototype.mark_complete = function(){
        var that = this;

        // Update local tags
        // Get cost of Todo for Invoice

        var tagData = {
            add_tags: ['complete']
        };
        var invoiceData = {};
        tags = that.model.toJSON().tags;
        tags.push('complete');

        Utils.Popover.Currency({
            title: 'Cost of this Job'
        })
        .then(function(a){
        //     alert(a);
        // });
        // return;
            if(a === false){
                // canceled out
                return;
            }

        // Utils.Popover.Prompt('Cost of this Job','','Next','Cancel')
        // .then(function(a){
            a = parseFloat(a);
            if(isNaN(a) ||  (!a && a != 0)){
                // canceled
                console.error(a);
                Utils.Notification.Toast('Invalid value supplied. Example: 25.68');
                return;
            }

            // Add to existing invoice or something else?
            Utils.Popover.Buttons({
                title: 'Add Job to an Invoice',
                text: 'Nice work, time to get paid. Create a new invoice for this job (you\'ll send it later), or add this job to an existing invoice. ',
                buttons: [{
                    text: 'New Invoice',
                    success: function(){

                        console.info('invoice model created');
                        console.info(that.model.toJSON());
                        var newModel = new InvoiceModel.Invoice({
                            // friend_id: that.model.get('_id'),
                            // amount: a,
                            title: that.model.get('title'),
                            from_user_id: that.model.get('owner_id._id'),
                            recipient_user_id: that.model.get('assigned_id._id')
                            // todo_id: that.model.get('_id')
                        });

                        newModel.save()
                        .then(function(newInvoice){

                            that._subviews.forEach(function(sv){
                                sv.collection.fetch();
                            });

                            that.model.set({
                                tags: tags
                            });

                            invoiceData.cost = a;
                            invoiceData.invoice_id = newInvoice._id;

                            // Save invoiceData
                            that.model.save(invoiceData,{
                                patch: true
                            })
                            .then(function(newModel){

                                that.model.fetch();

                                Utils.Notification.Toast('Tap the $ to see the invoice');
                                // App.history.navigate('invoice/' + newInvoice._id);

                            });
                            

                            // Save tag
                            that.model.save(tagData,{
                                patch: true
                            })
                            .then(function(newModel){

                                that.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
                                that.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big']);

                            });
                            
                        });

                    }
                },{
                    text: 'Use Existing Invoice',
                    success: function(){

                        // Find the invoice to add to
                        // - via a popover?

                        Utils.Notification.Toast('Loading Invoices, One moment...');

                        // Find all Invoices that are unpaid
                        var PossibleInvoices = new InvoiceModel.InvoiceCollection([],{
                            '$filter' : {
                                tags: {
                                    '$ne' : 'paid'
                                }
                            }
                        });
                        PossibleInvoices.populated().then(function(){

                            // List of Invoices
                            var listOptions = [];
                            PossibleInvoices.each(function(Invoice){
                                console.log('Invoice', Invoice);

                                var tmpOption = {
                                    text: S(Invoice.get('title')),
                                    success: function(){

                                        // Add option where success saves the Jobs and Invoice and everything

                                        that._subviews.forEach(function(sv){
                                            sv.collection.fetch();
                                        });

                                        that.model.set({
                                            tags: tags
                                        });

                                        invoiceData.cost = a;
                                        invoiceData.invoice_id = Invoice.get('_id');

                                        // Save invoiceData
                                        that.model.save(invoiceData,{
                                            patch: true
                                        })
                                        .then(function(newModel){

                                            Utils.Notification.Toast('Tap the $ to see the invoice');
                                            // App.history.navigate('invoice/' + newInvoice._id);

                                        });
                                        
                                        // Save tag
                                        that.model.save(tagData,{
                                            patch: true
                                        })
                                        .then(function(newModel){

                                            that.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
                                            that.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big']);

                                        });
                                        
                                    }
                                };
                                   

                                listOptions.push(tmpOption);
                            });

                            Utils.Popover.List({
                                list: listOptions
                            });

                        });
                        PossibleInvoices.fetch();

                    }
                }]
            });
        });

        // var data = {},
        //     tags = that.model.get('tags');
        // data = {
        //     add_tags: ['complete']
        // }
        // // tags.push('complete');
        // that.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
        // that.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big']);

        // that.model.set({
        //     tags: tags
        // });
        // that.model.save(data,{
        //     patch: true,
        //     // success: function(){
        //     //     that.model.fetch();    
        //     // }
        // }).then(function(){
        //     // that.model.set({
        //     //     assigned_id: App.Data.User.toJSON()
        //     // });
        //     that.model.fetch();
        //     that.todoContent.collection.fetch();
        //     // App.history.backTo('StartAssign');
        // });

    };

    PageView.prototype.mark_incomplete = function(){
        var that = this;

        Utils.Notification.Toast('Incomplete (undo) not yet enabled');

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

            console.log(this.TopBarMaximized);

            // title
            this.TopBarMaximized.sequential.Title.setContent(that.model.get('title'));
            this.TopBarMinimized.flexible.Title.setContent(that.model.get('title'));

            // details/description
            this.TopBarMaximized.sequential.Details.setContent((that.model.get('details') && that.model.get('details').length > 0) ? that.model.get('details') : '--');
            // this.TopBarMinimized.flexible.Title.setContent(that.model.get('title'));

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
                this.headerContent.ViewInvoice.setClasses(['header-tab-icon-text-big','marked-incomplete']);
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
            // this.TopBarMaximized.Tags.Surface.setContent(tagContent);

            // assigned
            if(that.model.get('assigned_id')){
                // assigned to someone
                this.TopBarMaximized.sequential.Assigned.setContent('hired: ' + that.model.get('assigned_id.profile.name'));
                this.TopBarMaximized.sequential.Assigned.setClasses(['todo-view-assigned-default','assigned']);
            } else {
                // Not assigned
                this.TopBarMaximized.sequential.Assigned.setContent('nobody hired');
                this.TopBarMaximized.sequential.Assigned.setClasses(['todo-view-assigned-default','notassigned']);
            }

            // owner
            if(that.model.get('owner_id')){
                // assigned to someone
                if(that.model.get('owner_id.profile')){
                    this.TopBarMaximized.sequential.Owner.setContent('employer: ' + that.model.get('owner_id.profile.name'));
                } else {
                    this.TopBarMaximized.sequential.Owner.setContent('employer: <span data-replace-id="' + that.model.get('owner_id') + '" data-replace-model="Profile" data-replace-target="profile.name"/>&nbsp;</span>');
                    Utils.dataModelReplaceOnSurface(this.TopBarMaximized.sequential.Owner);
                }
                this.TopBarMaximized.sequential.Owner.setClasses(['todo-view-owner-default','has_owner']);
            } else {
                // No owner at the moment
                this.TopBarMaximized.sequential.Owner.setContent('');
                this.TopBarMaximized.sequential.Owner.setClasses(['todo-view-owner-default','no_owner']);
                this.TopBarMaximized.sequential.Owner.setSize([undefined,1]);
            }


        }

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
