/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode')

    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");
    var ToggleButton = require('famous/widgets/ToggleButton');

    var Backbone = require('backbone-adapter');

    // Models
    var InvoiceContentModel = require("models/invoice_content");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpls                = {
        text: require('text!./tpl/ContentText.html'),
        email: require('text!./tpl/ContentEmail.html'),
        added_email: require('text!./tpl/ContentAddedEmail.html'),
        mark_paid: require('text!./tpl/ContentMarkPaid.html'),
        mark_unpaid: require('text!./tpl/ContentMarkUnpaid.html'),
        card_paid: require('text!./tpl/ContentCardPaid.html')
    };
    var templates           = {};
    _.each(tpls, function(val, key){
        templates[key] = Handlebars.compile(tpls[key]);
    });

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Load models
        this.invoice_id = this.options.invoice_id;
        this.loadModels();

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // this.contentLayout = new SequentialLayout();
        this.contentLayout = new ScrollView();
        this.contentLayout.Views = [];
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        // this.createTemplates();

        this.createDefaultSurfaces();
        this.createDefaultLightboxes();


        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error
        this.add(this.lightboxContent);

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;


    SubView.prototype.loadModels = function(player_id){
        var that = this;

        // App.Data.User contains friends

        // Create collection of Games for player_id
        var options = {};
        // if(this.options && this.options.filter){
        //     options['$filter'] = this.options.filter;
        // }
        this.collection = new InvoiceContentModel.InvoiceContentCollection([],{
            // type: 'friend'
            invoice_id: this.invoice_id
        });
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addOne, this);
        // this.collection.on("remove", this.removeOne, this); // invoice...
        this.collection.infiniteResults = 0;
        this.collection.totalResults = 0;

        this.collection.fetch();

        // this.prior_list = [];

        // Listen for 'showing' events
        this._eventInput.on('inOutTransition', function(args){
            // 0 = direction
            if(args[0] == 'showing'){
                that.collection.fetch();
            }
        });

    };

    SubView.prototype.createDefaultSurfaces = function(){
        var that = this;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: "Loading",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.loadingSurface.pipe(this._eventOutput);
        this.emptyListSurface = new Surface({
            content: "No messages",
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
                // backgroundColor: 'red'
            }
        });
        this.emptyListSurface.pipe(this._eventOutput);


        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default']
        });
        this.infinityLoadingSurface.pipe(this._eventOutput);

        // Loaded 'em all!
        // - shows "X total events"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default']
        });
        this.infinityLoadedAllSurface.pipe(this._eventOutput);

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default']
        });
        this.infinityShowMoreSurface.pipe(this._eventOutput);
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });
    };

    SubView.prototype.createDefaultLightboxes = function(){
        var that = this;

        // Content Lightbox
        this.lightboxContent = new RenderController();
        this.lightboxContent.show(this.loadingSurface);
        this.lightboxContent.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    this.lastSize = [undefined, s[1]];
                    return [undefined, s[1]];
                }
            }catch(err){}
            // Last Size?
            if(this.lastSize){
                return this.lastSize;
            }
            return [undefined, true];
        };

        // Buttons lightbox
        this.lightboxButtons = new RenderController();
        this.lightboxButtons.show(this.infinityLoadingSurface);
        this.lightboxButtons.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    this.lastSize = [undefined, s[1]];
                    return [undefined, s[1]];
                }
            }catch(err){}
            // Last Size?
            if(this.lastSize){
                return this.lastSize;
            }
            return [undefined, true];
        };

    };

    SubView.prototype.addOne = function(Model){
        var that = this;

        var contentView = new View();

        contentView.Model = Model;

        var surfaceVars = {
            content: '',
            classes: ['list-content-item-default']
        };

        switch(Model.get('type')){
            // case 'text':
            //     // Display some text
            //     surfaceVars.content = templates.text(Model.toJSON());
            //     surfaceVars.classes.push('list-content-text-default');
            //     break;

            // case 'mark_paid':
            //     surfaceVars.content = templates.mark_paid(Model.toJSON());
            //     surfaceVars.classes.push('list-content-paid-status-default');
            //     break;

            // case 'mark_unpaid':
            //     surfaceVars.content = templates.mark_unpaid(Model.toJSON());
            //     surfaceVars.classes.push('list-content-paid-status-default');
            //     surfaceVars.classes.push('unpaid');
            //     break;

            // case 'card_paid':
            //     surfaceVars.content = templates.card_paid(Model.toJSON());
            //     surfaceVars.classes.push('list-content-paid-status-default');
            //     surfaceVars.classes.push('card-paid');
            //     break;


            default:
                // console.error('testing default type');

                // template exist?
                if(templates[Model.get('type')]){
                    surfaceVars.content = templates[Model.get('type')](Model.toJSON());
                    surfaceVars.classes.push('list-content-item-default');
                    break;
                }

                console.error('Invalid content view type');
                return;

        }

        console.log(surfaceVars);

        // Surface
        contentView.Surface = new Surface({
            content: surfaceVars.content,
            size: [undefined, true],
            classes: surfaceVars.classes
        });
        contentView.getSize = function(){
            return [undefined, contentView.Surface._size ? contentView.Surface._size[1] : undefined];
        };
        contentView.Surface.pipe(that.contentLayout);
        contentView.Surface.on('click', function(){
            // Utils.Notification.Toast('View Invoice');
            // App.history.navigate('invoice/' + Model.get('_id'));
        });

        contentView.add(contentView.Surface);

        this.contentLayout.Views.splice(this.contentLayout.Views.length-1, 0, contentView);
        this.collection.infiniteResults += 1;

    };

    SubView.prototype.updateCollectionStatus = function() { 
        console.info('updateCollectionStatus');

        this.collection.totalResults = this.collection.length;

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent(amount_left + ' more');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' total');

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.contentLayout;
        }

        if(nextRenderable != this.lightboxContent.lastRenderable){
            this.lightboxContent.lastRenderable = nextRenderable;
            this.lightboxContent.show(nextRenderable);
        }

        // // Splice out the lightboxButtons before sorting
        // var popped = this.contentLayout.Views.pop();

        // Resort the contentLayout.Views
        this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(v){
            console.log(v.Model.get('created'));
            return v.Model.get('created');
        });
        this.contentLayout.Views.reverse();

        // this.contentLayout.Views.push(popped);

        console.log(this.contentLayout.Views);

        // Re-sequence?
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        // Show correct infinity buttons (More, All, etc.)
        this.render_infinity_buttons();

    };

    SubView.prototype.render_infinity_buttons = function(){
        // Renders the correct infinity-list buttons (the "Show More" or "Is loading" button/hint) at the bottom of the page

        // // Hide all dat shit
        // // - unnecessary?
        // this.$('.load-list').addClass('nodisplay');

        // at the end?
        if(this.collection.infiniteResults == this.collection.totalResults){
            this.lightboxButtons.show(this.infinityLoadedAllSurface);
            // this.$('.loaded-all').removeClass('nodisplay');
        } else {
            // Show more
            // - also includes the number more to show :)
            this.lightboxButtons.show(this.infinityShowMoreSurface);
            // this.$('.show-more').removeClass('nodisplay');
        }

    };

    SubView.prototype.refresh_any_new = function(){
        // Load any newly-created (since we last loaded) models
        // - invoice...

        // bascially like next_page, right?

        // Load more games
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');
        // debugger;

        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
    };

    SubView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        console.log('RemoteRefresh - SubView');
        Utils.RemoteRefresh(this,snapshot);
    };

    SubView.prototype.next_page = function(){
        // Load more games
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');
        // debugger;

        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
