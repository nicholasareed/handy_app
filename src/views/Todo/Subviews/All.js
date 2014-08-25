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
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");
    var ToggleButton = require('famous/widgets/ToggleButton');

    var Backbone = require('backbone-adapter');

    // Models
    var TodoModel = require("models/todo");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/Todo.html');
    var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Load models
        this.loadModels();

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // this.contentLayout = new SequentialLayout();
        this.contentLayout = new ScrollView();
        this.contentLayout.Views = [];
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        this.createDefaultSurfaces();
        this.createDefaultLightboxes();

        // this.contentLayout.Views.push(this.lightboxButtons);

        // Gather data after structure built
        App.Data.User.populated().then(function(){

            // that.update_friend_collection();
            // App.Data.User.on('sync', that.update_friend_collection.bind(that));

        });

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
        this.collection = new TodoModel.TodoCollection([],{
            // type: 'friend'
        });
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addOne, this);
        this.collection.on("remove", this.removeOne, this);
        this.collection.infiniteResults = 0;
        this.collection.totalResults = 0;

        this.collection.fetch();

        // this.prior_list = [];

        // Listen for 'showing' events
        this._eventInput.on('inOutTransition', function(args){
            // 0 = direction
            if(args[0] == 'showing'){
                // that.collection.fetch();
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
            content: "None to Show",
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

        var todoView = new View(),
            name = Model.get('title') || '&nbsp;none';

        todoView.Model = Model;

        todoView.Layout = new FlexibleLayout({
            direction: 0, // x, horizontal
            ratios: [true, 1] // Done, Title, 
        });
        todoView.Layout.Views = [];

        // Action button (checkbox)
        todoView.Action = new View();
        todoView.Action.getSize = function(){
            return [60,60];
        };

        todoView.Action.Toggle = new ToggleButton({
            size: [40, 40],
            content: '',
            classes: ['text-center'],
            onClasses: ['todo-toggle', 'square-toggle', 'toggle-on'],
            offClasses: ['todo-toggle', 'square-toggle', 'toggle-off'],

            // NOT for setting the default toggle state of the button
            toggleMode: ToggleButton.TOGGLE
        });
        todoView.Action.Toggle.pipe(that.contentLayout);

        // Handle toggle button click
        todoView.Action.Toggle.on('select', function(m){
            // console.log('select, saving');
            // if(that.model.get('scheme.' + Info.scheme_key) !== true){
            //     var data = {};
            //     data['scheme.' + Info.scheme_key] = true;
            //     that.model.save(data,{patch: true});
            // }

            // Remove this one!
            Timer.setTimeout(function(){
                that.collection.remove(Model.get('_id'));
            },500);

        });
        todoView.Action.Toggle.on('deselect', function(){
            // console.log('deselect, saving');
            // if(that.model.get('scheme.' + Info.scheme_key) !== false){
            //     var data = {};
            //     data['scheme.' + Info.scheme_key] = false;
            //     that.model.save(data,{patch: true});
            // }
        });
        todoView.Action.add(todoView.Action.Toggle);
        todoView.Layout.Views.push(todoView.Action);

        // Surface
        todoView.Surface = new Surface({
            content: template({
                Todo: Model.toJSON()
            }),
            size: [undefined, true],
            classes: ['todo-list-item-default']
        });
        Utils.dataModelReplaceOnSurface(todoView.Surface);
        Model.on('change', function(){
            todoView.Surface.setContent(template({
                Todo: Model.toJSON()
            }));
            Utils.dataModelReplaceOnSurface(todoView.Surface);
        });
        todoView.getSize = function(){
            return [undefined, todoView.Surface._size ? todoView.Surface._size[1] : 100];
        };
        todoView.Surface.pipe(that.contentLayout);
        todoView.Surface.on('click', function(){
            // Utils.Notification.Toast('View Todo');
            App.history.navigate('todo/' + Model.get('_id'));
        });

        todoView.Layout.Views.push(todoView.Surface);
        todoView.Layout.sequenceFrom(todoView.Layout.Views);

        todoView.add(todoView.Layout);

        this.contentLayout.Views.splice(this.contentLayout.Views.length-1, 0, todoView);
        this.collection.infiniteResults += 1;

    };

    SubView.prototype.removeOne = function(Model){
        var that = this;

        // find the view
        var tmpView = _.find(this.contentLayout.Views, function(tmp){
            return tmp.Model == Model;
        });

        if(!tmpView){
            console.error('no tmpView');
            return;
        }

        this.contentLayout.Views = _.without(this.contentLayout.Views, tmpView);

        this.updateCollectionStatus();

    };

    SubView.prototype.updateCollectionStatus = function() { 
        var that = this;

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
        Timer.setTimeout(function(){
            that.contentLayout.sequenceFrom(that.contentLayout.Views);
        },250);

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
        // - todo...

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
