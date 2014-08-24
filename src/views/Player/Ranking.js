
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var ModifiedScrollView = require('views/common/ModifiedScrollView');
    var RenderController = require('famous/views/RenderController');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var Timer = require('famous/utilities/Timer');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    var ToggleButton = require('famous/widgets/ToggleButton');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var EventHandler = require('famous/core/EventHandler');

    // Extras
    var Utils = require('utils');
    var $ = require('jquery');
    var _ = require('underscore');
    var numeral = require('lib2/numeral.min');
    var Credentials = JSON.parse(require('text!credentials.json'));

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var PlayerModel = require('models/player');
    var GameModel = require('models/game');

    // Subviews

    // Side menu of list of cars
    var PlayerMenuView = require('views/Player/PlayerMenu');
    // Game List
    var PlayerGameListView = require('views/Player/PlayerGameList');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Get the player's we're loading
        // - defines the display we'll have, right?

        // need to be able to define the Sport easily, and add/remove other players
        // - todo...

        if(!App.Cache.NewSummary){
            // window.location = '';
            // return;
            App.Cache.NewSummary = {};
        }

        this.params = _.clone(App.Cache.NewSummary);

        if(this.params.player_ids == "me"){
            // Showing only me
        }

        // Else, assume it is a list of player _ids

        // Models
        this.loadModels();

        // Create the mainTransforms for shifting the entire view over on menu open
        this.mainTransform = new Modifier({
            transform: Transform.identity
        });
        this.mainTransitionable = new Transitionable(0);
        this.mainTransform.transformFrom(function() {
            // Called every frame of the animation
            return Transform.translate(this.mainTransitionable.get() * -1, 0, 0);
        }.bind(this));

        // // Create the CarList menu that swings out
        // this.sideView = new PlayerMenuView();
        // this.sideView.OpacityModifier = new StateModifier();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();

        // // content
        // this.model.populated().then(function(){
        //     that.update_content();
        //     that.model.on('change', that.update_content.bind(that)); // could put it inside the: .populated().then(function(){....
        // });
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.mainTransform).add(this.layout);



        // Events

        // this._eventInput.on('menuToggle', this.menuToggle.bind(this))


        // window.setTimeout(function(){
        //     KnowPlayerId.resolve("529c02f00705435badb1dff5");
        // },3000);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: 'Rankings',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: false, //"Players",
            // backContent: "+Game"
        }); 
        
        this.header._eventOutput.on('back',function(){
            // App.history.back();//.history.go(-1);
            // App.history.navigate('game/add',{trigger: true});
            App.history.navigate('dash');
        });
        this.header._eventOutput.on('more',function(){
            // rewrite the event
            this._eventOutput.emit('menutoggle');
        });
        this.header.navBar.title.on('click',function(){
            // rewrite the event
            App.history.back();
            // that.PlayerGameListView.collection.requestNextPage();
            // App.history.navigate('settings',{trigger: true});
        });
        this.header.pipe(this._eventInput);

        // this._eventInput.on('menutoggle', this.menuToggle.bind(this));
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // // Change title on change
        // this.model.on('change', function(Model){
        //     that.header.setContent(Model.get('name'));
        // });

        // // Node for Modifier and background
        // this.HeaderNode = new RenderNode();
        // this.HeaderNode.add(this.headerBg);
        // this.HeaderNode.add(this.header.StateModifier).add(this.header);

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;

        // After model populated

        // create the content
        this.contentScrollView = new ModifiedScrollView(App.Defaults.ScrollView);
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

        //     // Probably all good to try and update
        //     that.PlayerGameListView.next_page.call(that.PlayerGameListView);
        // });

        // Create grid at the top
        this.topButtons = new View();
        this.topButtons.SizeMod = new StateModifier({
            size: [undefined, 120]
        });
        this.topButtons.Grid = new GridLayout({
            dimensions: [2,2]
        });
        this.topButtons.Grid.Views = [];
        this.topButtons.add(this.topButtons.SizeMod).add(this.topButtons.Grid);

        // Change sport
        this.create_sport_changer();

        // Change timeframe
        this.create_timeframe_changer();

        // Change player filter (friends, etc.)
        this.create_player_filter_changer();

        // Win/loss filter
        this.create_win_loss_places_switcher();

        // sequenceFrom
        this.topButtons.Grid.sequenceFrom(this.topButtons.Grid.Views);

        this.contentScrollView.Views.push(this.topButtons);

        // Spacer
        this.spacer = new Surface({
            size: [undefined, 30]
        });
        this.spacer.pipe(this.contentScrollView);
        this.contentScrollView.Views.push(this.spacer);

        // Create Results Grid
        this.create_grid_results_layout();


        // this.create_grid_results_header();

        // // Game List
        // this.create_game_list();

        
        // // Tie the sideView and the main body together (why the fuck are we doing it like this?)
        // // - this means the origin of the SideView is at the top-left of the ContentBody, no the topLeft of the page (like I kinda expect)
        // this.mainNode = new RenderNode();
        // this.mainNode.add(this.contentScrollView);
        // this.mainNode.add(this.sideView.OpacityModifier).add(this.sideView);

        // this.sideView._eventOutput.on("menuToggle", (function(){
        //     this.menuToggle();
        // }).bind(this));

        this.ContentStateModifier = new StateModifier();

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

    };


    PageView.prototype.loadModels = function() {
        var that = this;

        // // Fetch each Player model
        // this.player_models = {};
        // _.each(this.params.player_ids, function(_id){
        //     that.player_models[_id] = new PlayerModel.Player({_id: _id});
        //     that.player_models[_id].fetch({prefill: true});
        // });

        this.searchData = {
            type: that.options.args[0], // overall
            player_filter: that.options.args[1], // friends
            player_id: that.options.args[2], // _id
            timeframe: that.options.args[3] || 'all', // _id
        };

        // Get rankings for a player, against another "division" or group
        // - Friends
        // - Top
        // - Local
        console.log(App.Data);
        that.ranking_collection = new GameModel.GameCollection([],{
            type: that.searchData.type, // overall
            player_filter: that.searchData.player_filter, // friends
            player_id: that.searchData.player_id // _id (perspective?)
        });
        that.ranking_collection.fetch({prefill: true});
        that.ranking_collection.populated().then(function(){
            // Returns a list of Players and results/places

            // Rebuild the grids
            that.create_grid_results();
            // ... and if we get told to rebuild
            that.ranking_collection.on('reset', that.create_grid_results.bind(that));
            // that.ranking_collection.on('please-reset', that.create_grid_results.bind(that));

            // that.update_content();
            // that.stats_collection_headtohead.on('sync', that.update_content.bind(that));
        });

    };


    PageView.prototype.refreshData = function() {
        try {
            // this.model.fetch();
            // this.PlayerTripListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.create_sport_changer = function(){
        var that = this;

        // Need a dedicated Sport changer!
        // - way to create/choose/edit from a single page?

        this.SportChanger = new View();
        this.SportChanger.Surface = new Surface({
            content: 'All Sports &gt;',
            size: [undefined, 60],
            classes: ['ranking-group-button-default']
        });
        this.SportChanger.Surface.on('click', function(){

            // See if sports are already loaded
            App.Data.Sports.fetch({prefill: true});
            App.Data.Sports.populated().then(function(){

                // // Slide to the option list
                // that.previousPage = window.location.hash;

                // Set a marker
                App.history.modifyLast({
                    tag: 'ranking'
                });

                var sportList = _.map(App.Data.Sports.toJSON(), function(Sport){
                    return {
                        text: Sport.name,
                        value: Sport._id
                    };
                });

                // Add "All sports"
                sportList.unshift({
                    text: 'All Sports',
                    value: 'all'
                });

                // Slide page
                App.Cache.OptionModal = {
                    list: sportList,
                    on_choose: function(chosen_type){
                        // that.PlayerFilterChanger.Data = chosen_type.value;

                        // Reload the GameModel (rankings)
                        that.ResultSeq.Views = [];

                        that.searchData.sport_id = chosen_type.value;
                        that.SportChanger.Surface.setContent('<span class="ellipsis ellipsis-block full">' + chosen_type.text + ' &gt;</span>');

                        that.ranking_collection.initialize([],that.searchData);
                        that.ranking_collection.fetch({reset: true});
                        // that.ranking_collection.once('reset', 
                        // that.ranking_collection.emit('rebuild');

                        // debugger;
                        App.history.backTo('ranking');

                        // App.history.navigate(that.previousPage);
                    },
                    on_cancel: function(){
                        // debugger;
                        console.log(App.history.data);
                        // debugger;

                        App.history.backTo('ranking');
                        // App.history.navigate(that.previousPage);
                    },
                    title: 'Change Sport',
                    back_to_default_hint: false
                };

                // Change history (must)
                App.history.navigate('modal/old_list');

            });

        });
        this.SportChanger.add(this.SportChanger.Surface);
        this.topButtons.Grid.Views.push(this.SportChanger);
        // this.contentScrollView.Views.push(this.SportChanger);

    };

    PageView.prototype.create_timeframe_changer = function(){
        // 
        var that = this;

        // Filter options
        var timeFrameOptions = [
            {
                text: "All Time",
                value: "all"
            },
            {
                text: "Last 30 Days",
                value: moment().days(-30)
            },
            {
                text: "Last 7 Days",
                value: moment().days(-7)
            },
            {
                text: "24h",
                value: moment().hours(-24)
            },
            // choose a time (todo...)
        ];

        var tmpValue = _.findWhere(timeFrameOptions, {value: this.searchData.timeframe});

        this.TimeframeChanger = new View();
        this.TimeframeChanger.Surface = new Surface({
            // content: 'Head to Head &#10093;',
            content: tmpValue.text + ' &gt;',
            size: [undefined, 60],
            classes: ['ranking-group-button-default']
        });
        this.TimeframeChanger.Surface.on('click', function(){
            // Pop up list of sports to choose from
            // - should be a list of sports that could be listed
            // Change the sport, and re-find

            // Slide to the option list
            // that.previousPage = window.location.hash;

            // Slide page
            App.Cache.OptionModal = {
                list: timeFrameOptions,
                on_choose: function(chosen_type){
                    // that.PlayerFilterChanger.Data = chosen_type.value;

                    // Reload the GameModel (rankings)
                    that.ResultSeq.Views = [];

                    that.searchData.timeframe = chosen_type.value;
                    that.TimeframeChanger.Surface.setContent(chosen_type.text + ' &gt;');

                    that.ranking_collection.initialize([],that.searchData);
                    that.ranking_collection.fetch({reset: true});
                    // that.ranking_collection.once('reset', 
                    // that.ranking_collection.emit('rebuild');

                    // Don't redirect, the popover is closed automatically
                    // App.history.navigate(that.previousPage);
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                    // debugger;
                },
                title: 'Change Timeframe',
                back_to_default_hint: false
            };

            // Change history (must)
            App.history.navigate('modal/list', {history: false});

        });
        this.TimeframeChanger.add(this.TimeframeChanger.Surface);
        this.topButtons.Grid.Views.push(this.TimeframeChanger);
        // this.contentScrollView.Views.push(this.TimeframeChanger);

    };

    PageView.prototype.create_player_filter_changer = function(){
        // Friends, or Just Me (none)

        var that = this;

        // Filter options
        var filterOptions = [
            {
                text: "Just Me",
                value: "none"
            },
            {
                text: "Nemeses",
                value: "friends"
            },
            // Local! todo...
            // Top!
        ];

        var tmpValue = _.findWhere(filterOptions, {value: this.searchData.player_filter});

        this.PlayerFilterChanger = new View();
        this.PlayerFilterChanger.Surface = new Surface({
            // content: 'Head to Head &#10093;',
            content: tmpValue.text + ' &gt;',
            size: [undefined, 60],
            classes: ['ranking-group-button-default']
        });
        this.PlayerFilterChanger.Surface.on('click', function(){
            // Pop up list of sports to choose from
            // - should be a list of sports that could be listed
            // Change the sport, and re-find

            // Slide to the change screen for the player
            that.previousPage = window.location.hash;

            // Slide page
            App.Cache.OptionModal = {
                // selected_players: this.model.get('players') ? this.model.get('players') : [],
                list: filterOptions,
                on_choose: function(chosen_type){
                    // that.PlayerFilterChanger.Data = chosen_type.value;

                    // Reload the GameModel (rankings)
                    that.ResultSeq.Views = [];

                    that.searchData.player_filter = chosen_type.value;
                    that.PlayerFilterChanger.Surface.setContent(chosen_type.text + ' &gt;');

                    that.ranking_collection.initialize([],that.searchData);
                    that.ranking_collection.fetch({reset: true});
                    // that.ranking_collection.once('reset', 
                    // that.ranking_collection.emit('rebuild');

                    // App.history.navigate(that.previousPage);
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                },
                title: 'Change Nemeses Filter',
                back_to_default_hint: false
            };

            // Change history (must)
            App.history.navigate('modal/list', {history: false});

        });
        this.PlayerFilterChanger.add(this.PlayerFilterChanger.Surface);
        this.topButtons.Grid.Views.push(this.PlayerFilterChanger);
        // this.contentScrollView.Views.push(this.PlayerFilterChanger);

    };

    PageView.prototype.create_win_loss_places_switcher = function(){
        // Displaying wins/losses, or places/finishes per-person

        var that = this;

        // Filter options
        var filterOptions = [
            {
                text: "Just Me",
                value: "none"
            },
            {
                text: "Friends",
                value: "friends"
            },
            // Local! todo...
            // Top!
        ];

        var tmpValue = _.findWhere(filterOptions, {value: this.searchData.player_filter});

        this.WinPlaceSwitcher = new ToggleButton({
            size: [undefined, 60],
            content: 'W/1',
            onClasses: ['win-place-switcher-button-default', 'on'],
            offClasses: ['win-place-switcher-button-default', 'off']
        });
        this.WinPlaceSwitcher.on('select', function(){
            // Places
            that.headerRow.GridRight.show(that.headerRow.GridRight.Places);
            _.each(that.RowByPlayer, function(row){
                row.GridRight.show(row.GridRight.Places);
            });
        });
        this.WinPlaceSwitcher.on('deselect', function(){
            // Wins
            that.headerRow.GridRight.show(that.headerRow.GridRight.Wins);
            _.each(that.RowByPlayer, function(row){
                row.GridRight.show(row.GridRight.Wins);
            });
        });

        // this.PlayerFilterChanger = new View();
        // this.PlayerFilterChanger.Surface = new Surface({
        //     // content: 'Head to Head &#10093;',
        //     content: 'W/L',
        //     size: [undefined, 60]
        // });
        // this.PlayerFilterChanger.Surface.on('click', function(){
        //     // Pop up list of sports to choose from
        //     // - should be a list of sports that could be listed
        //     // Change the sport, and re-find

        //     // Slide to the change screen for the player
        //     that.previousPage = window.location.hash;

        //     // Slide page
        //     App.Cache.OptionModal = {
        //         // selected_players: this.model.get('players') ? this.model.get('players') : [],
        //         list: filterOptions,
        //         on_choose: function(chosen_type){
        //             // that.PlayerFilterChanger.Data = chosen_type.value;

        //             // Reload the GameModel (rankings)
        //             that.ResultSeq.Views = [];

        //             that.searchData.player_filter = chosen_type.value;
        //             that.PlayerFilterChanger.Surface.setContent(chosen_type.text + ' &#10093;');

        //             that.ranking_collection.initialize([],that.searchData);
        //             that.ranking_collection.fetch({reset: true});
        //             // that.ranking_collection.once('reset', 
        //             // that.ranking_collection.emit('rebuild');

        //             App.history.navigate(that.previousPage);
        //         },
        //         on_cancel: function(){
        //             App.history.navigate(that.previousPage);
        //         },
        //         title: 'Basic Setup',
        //         back_to_default_hint: false
        //     };

        //     // Change history (must)
        //     App.history.navigate('modal/list');

        // });
        // this.PlayerFilterChanger.add(this.PlayerFilterChanger.Surface);

        this.topButtons.Grid.Views.push(this.WinPlaceSwitcher);
        // this.contentScrollView.Views.push(this.WinPlaceSwitcher);

    };

    PageView.prototype.create_grid_results_layout = function(){
        var that = this;

        this.ResultSeq = new SequentialLayout();
        this.ResultSeq.Views = [];

        this.contentScrollView.Views.push(this.ResultSeq);

    };

    PageView.prototype.create_grid_results = function(){
        var that = this;
        // Create a grid entry for each "player"

        // Get the player_ids from the returned result
        this.params.player_ids = _.map(this.ranking_collection.summary, function(key, index){
            return index;
        });

        this.comparison_player_ids = this.params.player_ids;

        // console.log('player_ids', this.params.player_ids);

        // SequentialLayout of rows/grids
        // this.ResultSeq = new SequentialLayout();

        // Reset array of views
        this.ResultSeq.Views = [];

        // Header
        this.create_grid_results_header();

        // People
        // - order is correct?
        this.RowByPlayer = {};

        // Create row for each player
        this.comparison_player_ids.forEach(function(pId){
            var row = that.create_grid_head_to_head_row(pId);
            that.ResultSeq.Views.push(row);
        });

        // SequenceFrom
        this.ResultSeq.sequenceFrom(this.ResultSeq.Views);

        // Update content
        this.update_content();

        // this.ResultSeq.sequenceFrom(this.ResultSeq.Views);

        // // Title
        // this.GridResults_HeadToHeadTitle = new View();
        // this.GridResults_HeadToHeadTitle.Surface = new Surface({
        //     content: 'Head to Head > (view games)',
        //     size: [undefined, 40],
        //     properties: {
        //         backgroundColor: "white",
        //         color: "#222",
        //         padding: "0 10px",
        //         lineHeight: "40px"
        //     }
        // });
        // this.GridResults_HeadToHeadTitle.Surface.on('click', function(){
        //     // navigate to the normal games/summary view (that lists the games, scoreboard, filter, etc.)
        //     // - first set the parameters/flags that it will need to read
        //     App.Cache.NewSummary = {
        //         player_ids: [that.player_id, App.Data.Players.findMe().get('_id')]
        //     };
        //     App.history.navigate('player/comparison');
        // });
        // this.GridResults_HeadToHeadTitle.Surface.pipe(this.contentScrollView);
        // this.GridResults_HeadToHeadTitle.add(this.GridResults_HeadToHeadTitle.Surface);
        // this.HeadToHeadSeq.Views.push(this.GridResults_HeadToHeadTitle);

        // this.contentScrollView.Views.push(this.ResultSeq);

    };

    PageView.prototype.resort_rows = function(resortKey){
        // resort the rows and resequence (according to resortKey)
        var that = this;

        // get the last few results, only going to re-sort them
        // that.ResultSeq.Views;
        var spliced_out = this.ResultSeq.Views.splice(1);
        spliced_out = _.sortBy(spliced_out, function(v){
            // that.RowByPlayer[v.player_id]
            // console.log(that.RowByPlayer[v.player_id].Summary);
            // console.log(that.RowByPlayer[v.player_id].Summary[resortKey]);
            return that.RowByPlayer[v.player_id].Summary[resortKey] * -1;
        });
        // this.ResultSeq.Views.splice(1,0,spliced_out);
        _.each(spliced_out, function(so, index){
            // Update classes
            if(index%2){
                so.GridBg.setProperties({
                    backgroundColor: '#f8f8f8'
                });
            }
            that.ResultSeq.Views.push(so);
        });

        this.ResultSeq.sequenceFrom(this.ResultSeq.Views);

    };

    PageView.prototype.create_grid_results_header = function(){

        var that = this;

        var tmpProps = {
            textAlign: "center",
            fontSize: "20px",
            lineHeight: "30px",
            // backgroundColor: "white",
            fontWeight: "bold",
            color: "#444",
            borderBottom: "1px solid #eee"
        };

        // Header row
        this.headerRow = new View();
        this.headerRow.Grid = new FlexibleLayout({
            ratios: [true, 1]
        });
        this.headerRow.GridRight = new RenderController();
        this.headerRow.GridRight.Wins = new GridLayout({
            dimensions: [4,1]
        });
        this.headerRow.SurfacesList = [
            ['wp','WIN%'],
            ['w','W'],
            ['l','L'],
            ['t','T'],
            ['1','1st'],
            ['2','2nd'],
            ['3','3rd'],
            ['4','4th+']
        ];
        this.headerRow.Surfaces = {};
        _.each(this.headerRow.SurfacesList, function(details){
            that.headerRow.Surfaces[details[0]] = new Surface({
                content: details[1],
                properties: tmpProps
            }),
            that.headerRow.Surfaces[details[0]].on('click', function(){
                // resort rows
                that.resort_rows(details[0]);
            });
        });
        this.headerRow.GridRight.Wins.sequenceFrom([
            this.headerRow.Surfaces.wp,
            this.headerRow.Surfaces.w,
            this.headerRow.Surfaces.l,
            this.headerRow.Surfaces.t
        ]);
        this.headerRow.GridRight.Places = new GridLayout({
            dimensions: [4,1]
        });
        this.headerRow.GridRight.Places.sequenceFrom([
            this.headerRow.Surfaces['1'],
            this.headerRow.Surfaces['2'],
            this.headerRow.Surfaces['3'],
            this.headerRow.Surfaces['4']
        ]);
        this.headerRow.GridRight.show(this.headerRow.GridRight.Wins);

        this.headerRow.SizeMod = new StateModifier({
            size: [undefined, 30]
        });
        this.headerSurfaces = [
            new Surface({
                content: '',
                size: [100, undefined],
                properties: tmpProps
            }),
            this.headerRow.GridRight
        ];
        this.headerSurfaces.forEach(function(surf){
            surf.pipe(that.contentScrollView);
        });
        this.headerRow.Grid.sequenceFrom(this.headerSurfaces);
        this.headerRow.add(this.headerRow.SizeMod).add(this.headerRow.Grid);

        this.ResultSeq.Views.push(this.headerRow);

        // this.RowByPlayer = {};

        // // Create row for each player
        // this.comparison_player_ids.forEach(function(pId){
        //     var row = that.create_grid_head_to_head_row(pId);
        //     that.ResultSeq.Views.push(row);
        // });

    };

    PageView.prototype.create_grid_head_to_head_row = function(player_id){        
        // GridLayout of results
        // - 2 grid layouts W/L/T and 1/2/3/4+
        var that = this;

        this.RowByPlayer[player_id] = {
            Summary: {}
        };
        var tmpRow = this.RowByPlayer[player_id];
        tmpRow.GridSurfaces = {};

        // Name
        tmpRow.GridSurfaces.name = new Surface({
            size: [100, undefined],
            content: '<span class="ellipsis ellipsis-block" data-replace-model="Player" data-replace-id="'+player_id.toString()+'" data-replace-field="Profile.name"></span>',
            properties: {
                // backgroundColor: "white",
                fontSize: "16px",
                lineHeight: "30px",
                padding: "0 4px"
            }
        });
        tmpRow.GridSurfaces.name.pipe(that.contentScrollView);
        Utils.dataModelReplaceOnSurface(tmpRow.GridSurfaces.name);
        tmpRow.GridSurfaces.name.on('click', function(){
            App.history.navigate('player/' + player_id.toString());
        });

        // wp
        tmpRow.GridSurfaces.wp = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-white1"]
        });
        tmpRow.GridSurfaces.wp.pipe(that.contentScrollView);
        // w
        tmpRow.GridSurfaces.w = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-win1"]
        });
        tmpRow.GridSurfaces.w.pipe(that.contentScrollView);
        // l
        tmpRow.GridSurfaces.l = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-lose1"]
        });
        tmpRow.GridSurfaces.l.pipe(that.contentScrollView);
        // t
        tmpRow.GridSurfaces.t = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-tie1"]
        });
        tmpRow.GridSurfaces.t.pipe(that.contentScrollView);
        // 1
        tmpRow.GridSurfaces["1"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-gold1"]
        });
        tmpRow.GridSurfaces["1"].pipe(that.contentScrollView);
        // 2
        tmpRow.GridSurfaces["2"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-silver1"]
        });
        tmpRow.GridSurfaces["2"].pipe(that.contentScrollView);
        // 3
        tmpRow.GridSurfaces["3"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-bronze1"]
        });
        tmpRow.GridSurfaces["3"].pipe(that.contentScrollView);
        // 4
        tmpRow.GridSurfaces["4"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-white1"]
        });
        tmpRow.GridSurfaces["4"].pipe(that.contentScrollView);

        // Row setup
        var thisRow = new View();
        thisRow.player_id = player_id;


        thisRow.GridBg = new Surface({
            size: [undefined, undefined]
        });

        // thisRow.Grid = new GridLayout({
        //     dimensions: [9,1]
        // });
        thisRow.Grid = new FlexibleLayout({
            ratios: [true, 1]
        });
        thisRow.GridRight = new RenderController(); // notice it is "tmpRow" not thisRow!! (need to access it later)
        tmpRow.GridRight = thisRow.GridRight; // reference
        thisRow.GridRight.Wins = new GridLayout({
            dimensions: [4,1]
        });
        thisRow.GridRight.Wins.sequenceFrom([
            tmpRow.GridSurfaces.wp,
            tmpRow.GridSurfaces.w,
            tmpRow.GridSurfaces.l,
            tmpRow.GridSurfaces.t
        ]);
        thisRow.GridRight.Places = new GridLayout({
            dimensions: [4,1]
        });
        thisRow.GridRight.Places.sequenceFrom([
            tmpRow.GridSurfaces['1'],
            tmpRow.GridSurfaces['2'],
            tmpRow.GridSurfaces['3'],
            tmpRow.GridSurfaces['4']
        ]);
        // Show "win/loss" by default (not places)
        thisRow.GridRight.show(thisRow.GridRight.Wins);

        thisRow.SizeMod = new StateModifier({
            size: [undefined, 40]
        });
        var tmpProps = {
            textAlign: "center",
            fontSize: "20px"
        };
        thisRow.Grid.sequenceFrom([
            tmpRow.GridSurfaces.name,
            thisRow.GridRight
            // tmpRow.GridSurfaces.wp,
            // tmpRow.GridSurfaces.w,
            // tmpRow.GridSurfaces.l,
            // tmpRow.GridSurfaces.t,
            // tmpRow.GridSurfaces['1'],
            // tmpRow.GridSurfaces['2'],
            // tmpRow.GridSurfaces['3'],
            // tmpRow.GridSurfaces['4']
        ]);
        var node = thisRow.add(thisRow.SizeMod);
        node.add(thisRow.GridBg);
        node.add(thisRow.Grid);

        return thisRow;

        // // var gridRow = {};

        // this.GridSurfaces = {};

        // this.GridResults_1v1_WLT = new View();
        // this.GridResults_1v1_WLT.Grid = new GridLayout({
        //     dimensions: [3,1]
        // });
        // this.GridResults_1v1_WLT.HeightMod = new StateModifier({
        //     size: [undefined, 60]
        // });

        // // w
        // this.GridSurfaces.w = new Surface({
        //     content: '',
        //     classes: ["stat-grid-number", "bg-win"]
        // });

        // // l
        // this.GridSurfaces.l = new Surface({
        //     content: '',
        //     classes: ["stat-grid-number", "bg-lose"]
        // });
        // // t
        // this.GridSurfaces.t = new Surface({
        //     content: '',
        //     classes: ["stat-grid-number", "bg-tie"]
        // });

        // this.GridResults_1v1_WLT.Grid.sequenceFrom([
        //     this.GridSurfaces.w,
        //     this.GridSurfaces.l,
        //     this.GridSurfaces.t,
        // ]);
        // this.GridResults_1v1_WLT.add(this.GridResults_1v1_WLT.HeightMod).add(this.GridResults_1v1_WLT.Grid);

        // // 2nd grid (places)
        // this.GridResults_FreeForAll_Places = new View();
        // this.GridResults_FreeForAll_Places.HeightMod = new StateModifier({
        //     size: [undefined, 60]
        // });
        // this.GridResults_FreeForAll_Places.Grid = new GridLayout({
        //     dimensions: [4,1]
        // });


        // // 1
        // this.GridSurfaces["1"] = new Surface({
        //     content: '',
        //     classes: ["stat-grid-number", "bg-gold"]
        // });
        // // 2
        // this.GridSurfaces["2"] = new Surface({
        //     content: '',
        //     classes: ["stat-grid-number", "bg-silver"]
        // });
        // // 3
        // this.GridSurfaces["3"] = new Surface({
        //     content: '',
        //     classes: ["stat-grid-number", "bg-bronze"]
        // });
        // // 4
        // this.GridSurfaces["4"] = new Surface({
        //     content: '',
        //     classes: ["stat-grid-number", "bg-white"]
        // });

        // this.GridResults_FreeForAll_Places.Grid.sequenceFrom([
        //     this.GridSurfaces['1'],
        //     this.GridSurfaces['2'],
        //     this.GridSurfaces['3'],
        //     this.GridSurfaces['4']
        // ]);
        // this.GridResults_FreeForAll_Places.add(this.GridResults_FreeForAll_Places.HeightMod).add(this.GridResults_FreeForAll_Places.Grid);

        // // Title
        // this.GridResults_TotalTitle = new View();
        // this.GridResults_TotalTitle.Surface = new Surface({
        //     content: 'Full Record',
        //     size: [undefined, 40],
        //     properties: {
        //         backgroundColor: "white",
        //         color: "#222",
        //         padding: "0 10px",
        //         lineHeight: "40px"
        //     }
        // });
        // this.GridResults_TotalTitle.add(this.GridResults_TotalTitle.Surface);

        // // Add Grids to ScrollView
        // // - with Title
        // this.contentScrollView.Views.push(this.GridResults_TotalTitle);
        // this.contentScrollView.Views.push(this.GridResults_1v1_WLT);
        // this.contentScrollView.Views.push(this.GridResults_FreeForAll_Places);   
    };

    PageView.prototype.create_game_list = function(){
        var that = this;
        
        // Title
        this.GameTitle = new View();
        this.GameTitle.Surface = new Surface({
            content: 'Games',
            size: [undefined, 40],
            properties: {
                backgroundColor: "#f8f8f8",
                fontWeight: "bold",
                textDecoration: "underline",
                color: "#222",
                padding: "0 10px",
                lineHeight: "40px"
            }
        });
        // this.GameTitle.Surface.on('click', function(){
        //     // navigate to the normal games/summary view (that lists the games, scoreboard, filter, etc.)
        //     // - first set the parameters/flags that it will need to read
        //     App.Cache.NewSummary = {
        //         player_ids: [App.Data.Players.findMe().get('_id')] // just me
        //     };
        //     App.history.navigate('player/comparison/' + CryptoJS.SHA3(JSON.stringify(App.Cache.NewSummary)));
        // });
        this.GameTitle.Surface.pipe(this.contentScrollView);
        this.GameTitle.add(this.GameTitle.Surface);
        this.contentScrollView.Views.push(this.GameTitle);

        // Add GameList subview of all Games for this player
        this.PlayerGameListView = new PlayerGameListView({
            // use player_id, an array, or the promise
            // - include who the current viewer is?
            // collection: stats_collection_headtohead,
            player_id: this.params.player_ids
        });
        this.PlayerGameListView._eventOutput.pipe(this.contentScrollView);

        this.contentScrollView.Views.push(this.PlayerGameListView);

    };

    PageView.prototype.update_content = function(){
        var that = this;

        // Timer.setTimeout(function(){
            // Head to head results/places
            if(that.ranking_collection != undefined && that.ranking_collection.hasFetched){
                // Summary/stat surfaces (update)
                // console.dir(that.RowByPlayer);
                _.each(that.ranking_collection.summary, function(summary, this_player_id){
                    // console.log(this_player_id);
                    that.RowByPlayer[this_player_id].Summary = summary;
                    _.each(that.ranking_collection.summary[this_player_id], function(value, key){
                        // if(['wp'].indexOf(key) !== -1){
                        //     // bad key, not used in table
                        //     return;
                        // }
                        if(key === 'wp'){
                            value = numeral(value).format('.000');
                        }
                        that.RowByPlayer[this_player_id].GridSurfaces[key].setContent(value.toString());
                    });

                });

                that.resort_rows('w');

            }
        // },100);

    };

    // PageView.prototype.menuToggle = function() {
    //     console.log("menuToggle'ing");
    //     if (!this.sideView.open) {
    //         console.log('opening');
    //         this.mainTransitionable.set(200, { duration: 500, curve: 'easeOut' });
    //         this.sideView.flipOut();
    //     } else {
    //         console.log('closing');
    //         this.mainTransitionable.set(0, { duration: 500, curve: 'easeOut' });
    //         this.sideView.flipIn();
    //     }
    //     this.sideView.open = !this.sideView.open;
    // };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){
                    case 'OptionModal':
                        transitionOptions.outTransform = Transform.identity;
                        return transitionOptions;

                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // // Hiding the sideView
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Move the content
                        window.setTimeout(function(){

                            // Hide content from a direction
                            // if(goingBack){
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.outTransition);
                            // } else {
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);
                            // }
                            // that.ContentStateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // // Hiding the sideView
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Content
                        window.setTimeout(function(){
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // // Slide left
                            // that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * -1) - 100,0,0), transitionOptions.outTransition);

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

                        // // SideView must be visible
                        // this.sideView.OpacityModifier.setOpacity(1);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        // // Header
                        // // - no extra delay
                        // window.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // // Bring map content back
                            // that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

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
