
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var ModifiedScrollView = require('views/common/ModifiedScrollView');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var EventHandler = require('famous/core/EventHandler');

    // Extras
    var Utils = require('utils');
    var $ = require('jquery');
    var Credentials = JSON.parse(require('text!credentials.json'));

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var PlayerModel = require('models/player');
    var GameModel = require('models/game');

    // Subviews
    var Crypto = require('lib2/crypto');

    // Side menu of list of cars
    var PlayerMenuView      = require('views/Player/PlayerMenu');
    // Game List
    var PlayerGameListView      = require('views/Player/PlayerGameList');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

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

        // Create the CarList menu that swings out
        this.sideView = new PlayerMenuView();
        this.sideView.OpacityModifier = new StateModifier();


        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();

        // content
        this.model.populated().then(function(){
            that.update_content();
            that.model.on('change', that.update_content.bind(that)); // could put it inside the: .populated().then(function(){....
        });
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.mainTransform).add(this.layout);



        // Events

        this._eventInput.on('menuToggle', this.menuToggle.bind(this))


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
            content: '',
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: "Players",
            // backContent: "+Game"
        }); 
        this.header._eventOutput.on('back',function(){
            // App.history.back();//.history.go(-1);
            // App.history.navigate('game/add',{trigger: true});
            App.history.navigate('dash',{trigger: true});
        });
        this.header._eventOutput.on('more',function(){
            // rewrite the event
            this._eventOutput.emit('menutoggle');
        });
        this.header.navBar.title.on('click',function(){
            // rewrite the event
            // that.PlayerGameListView.collection.requestNextPage();
            App.history.navigate('settings',{trigger: true});
        });
        this.header.pipe(this._eventInput);

        this._eventInput.on('menutoggle', this.menuToggle.bind(this));
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Change title on change
        this.model.on('change', function(Model){
            that.header.setContent(Model.get('name'));
        });

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

        // Add first item (Name of player)
        this.surface_PlayerInfo = new View();
        this.surface_PlayerInfo.Surface = new Surface({
            content: "",
            size: [true, 60],
            properties: {
                backgroundColor: "white",
                borderRadius: "8px",
                color: "black",
                lineHeight: "60px",
                fontSize: "22px",
                textAlign: "center"
            }
        });
        this.surface_PlayerInfo.SizeOpacityStateModifier = new StateModifier({
            size: [undefined, 80],
            opacity: 0.5
        });
        this.surface_PlayerInfo.OriginStateModifier = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.surface_PlayerInfo.add(this.surface_PlayerInfo.SizeOpacityStateModifier).add(this.surface_PlayerInfo.OriginStateModifier).add(this.surface_PlayerInfo.Surface);
        this.contentScrollView.Views.push(this.surface_PlayerInfo);
        this.surface_PlayerInfo.Surface.pipe(this.contentScrollView);

        // Create "Total Results" Grid
        this.create_grid_total();

        // Create "Head To Head" Grid
        this.create_grid_head_to_head();


        // // Add GameList subview of all Games for this player
        // this.PlayerGameListView = new PlayerGameListView({
        //     // use player_id, or the promise
        //     player_id: this.player_id && this.player_id.length === 24 ? this.player_id : that.KnowPlayerId.promise()
        // });
        // this.PlayerGameListView._eventOutput.pipe(this.contentScrollView);

        // this.contentScrollView.Views.push(this.PlayerGameListView);


        // // Linked / RelationshipCode
        // this.surface_PlayerLinked = new View();
        // this.surface_PlayerLinked.Surface = new Surface({
        //     content: "",
        //     size: [undefined, 50],
        //     properties: {
        //         backgroundColor: "#f8f8f8",
        //         color: "black",
        //         lineHeight: "50px",
        //         textAlign: "center",
        //         textDecoration: "underline"
        //     }
        // });
        // this.surface_PlayerLinked.Surface.pipe(this.contentScrollView);
        // this.surface_PlayerLinked.StateModifier = new StateModifier();
        // this.surface_PlayerLinked.add(this.surface_PlayerLinked.StateModifier).add(this.surface_PlayerLinked.Surface);
        // this.contentScrollView.Views.push(this.surface_PlayerLinked);

        // // Events
        // this.surface_PlayerLinked.Surface.on('click', function(){
        //     // App.history.navigate('player/relationship_code/' + that.model.get('_id'), {trigger: true});
        // }, this);
        // this.surface_PlayerLinked.Surface.on('click', function(){
        //     if(that.model.get('connected_user_id')){
        //         return;
        //     }
        //     App.history.navigate('player/relationship_code/' + that.model.get('_id'), {trigger: true});
        // });


        
        // Tie the sideView and the main body together (why the fuck are we doing it like this?)
        // - this means the origin of the SideView is at the top-left of the ContentBody, no the topLeft of the page (like I kinda expect)
        this.mainNode = new RenderNode();
        this.mainNode.add(this.contentScrollView);
        this.mainNode.add(this.sideView.OpacityModifier).add(this.sideView);

        this.sideView._eventOutput.on("menuToggle", (function(){
            this.menuToggle();
        }).bind(this));

        this.ContentStateModifier = new StateModifier();

        this.layout.content.add(this.ContentStateModifier).add(Transform.behind).add(this.mainNode);

    };


    PageView.prototype.loadModels = function() {
        var that = this;

        this.player_id = this.options.args[0];

        // Fetch models
        this.model = new PlayerModel.Player({_id: this.player_id});
        // Fetch the Player Model
        this.model.fetch({ prefill: true});


        // Get "general" stats
        that.stats_collection = new GameModel.GameCollection([],{
            player_id: that.player_id
        });
        // that.stats_collection.
        that.stats_collection.fetch({prefill: true, limit: 0});
        that.stats_collection.populated().then(function(){
            that.update_content();
            that.stats_collection.on('sync', that.update_content.bind(that));
        });


        // Get "head to head" stats
        that.stats_collection_headtohead = new GameModel.GameCollection([],{
            player_id: [that.player_id, App.Data.Players.findMe().get('_id')]
        });
        that.stats_collection_headtohead.fetch({prefill: true});
        that.stats_collection_headtohead.populated().then(function(){
            that.update_content();
            that.stats_collection_headtohead.on('sync', that.update_content.bind(that));
        });

    };


    PageView.prototype.refreshData = function() {
        try {
            this.model.fetch();
            this.PlayerTripListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.create_grid_total = function(){
        var that = this;

        // GridLayout of results
        // - 2 grid layouts W/L/T and 1/2/3/4+
        
        this.GridSurfacesTotal = {};

        this.GridResults_1v1_WLT = new View();
        this.GridResults_1v1_WLT.Grid = new GridLayout({
            dimensions: [1,3]
        });
        // this.GridResults_1v1_WLT.HeightMod = new StateModifier({
        //     size: [window.innerWidth / 2, 300]
        // });

        // w
        this.GridSurfacesTotal.w = new Surface({
            content: '',
            // size: [undefined, 100],
            classes: ["stat-grid-number", "bg-win"]
        });
        this.GridSurfacesTotal.w.pipe(this.contentScrollView);

        // l
        this.GridSurfacesTotal.l = new Surface({
            content: '',
            // size: [undefined, 100],
            classes: ["stat-grid-number", "bg-lose"]
        });
        this.GridSurfacesTotal.l.pipe(this.contentScrollView);
        // t
        this.GridSurfacesTotal.t = new Surface({
            content: '',
            // size: [undefined, 100],
            classes: ["stat-grid-number", "bg-tie"]
        });
        this.GridSurfacesTotal.t.pipe(this.contentScrollView);

        this.GridResults_1v1_WLT.Grid.sequenceFrom([
            this.GridSurfacesTotal.w,
            this.GridSurfacesTotal.l,
            this.GridSurfacesTotal.t,
        ]);
        this.GridResults_1v1_WLT.add(this.GridResults_1v1_WLT.Grid);

        // 2nd grid (places)
        this.GridResults_FreeForAll_Places = new View();
        // this.GridResults_FreeForAll_Places.HeightMod = new StateModifier({
        //     size: [window.innerWidth / 2, 400]
        // });
        this.GridResults_FreeForAll_Places.Grid = new GridLayout({
            dimensions: [1,4]
        });


        // 1
        this.GridSurfacesTotal["1"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-gold"]
        });
        this.GridSurfacesTotal["1"].pipe(this.contentScrollView);
        // 2
        this.GridSurfacesTotal["2"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-silver"]
        });
        this.GridSurfacesTotal["2"].pipe(this.contentScrollView);
        // 3
        this.GridSurfacesTotal["3"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-bronze"]
        });
        this.GridSurfacesTotal["3"].pipe(this.contentScrollView);
        // 4
        this.GridSurfacesTotal["4"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-white"]
        });
        this.GridSurfacesTotal["4"].pipe(this.contentScrollView);

        this.GridResults_FreeForAll_Places.Grid.sequenceFrom([
            this.GridSurfacesTotal['1'],
            this.GridSurfacesTotal['2'],
            this.GridSurfacesTotal['3'],
            this.GridSurfacesTotal['4']
        ]);
        this.GridResults_FreeForAll_Places.add(this.GridResults_FreeForAll_Places.Grid);

        // Title
        this.GridResults_TotalTitle = new View();
        this.GridResults_TotalTitle.Surface = new Surface({
            content: 'Full Record >',
            size: [undefined, 40],
            properties: {
                backgroundColor: "white",
                color: "#222",
                padding: "0 10px",
                lineHeight: "40px"
            }
        });
        this.GridResults_TotalTitle.Surface.on('click', function(){
            // navigate to the normal games/summary view (that lists the games, scoreboard, filter, etc.)
            // - first set the parameters/flags that it will need to read
            App.Cache.NewSummary = {
                player_ids: [that.player_id]
            };
            App.history.navigate('player/comparison/' + CryptoJS.SHA3(JSON.stringify(App.Cache.NewSummary)));
        });
        this.GridResults_TotalTitle.add(this.GridResults_TotalTitle.Surface);

        // Add Grids to ScrollView

        // GridLayout for holding the two columns
        this.GridResults_Columns = new View();
        this.GridResults_Columns.Grid = new GridLayout({
            dimensions: [2, 1]
        });
        this.GridResults_Columns.SizeMod = new StateModifier({
            size: [undefined, 200]
        });
        this.GridResults_Columns.add(this.GridResults_Columns.SizeMod).add(this.GridResults_Columns.Grid);

        this.GridResults_Columns.Grid.sequenceFrom([
            this.GridResults_1v1_WLT,
            this.GridResults_FreeForAll_Places
        ]);

        // - with Title
        this.contentScrollView.Views.push(this.GridResults_TotalTitle);
        // this.contentScrollView.Views.push(this.GridResults_1v1_WLT);
        // this.contentScrollView.Views.push(this.GridResults_FreeForAll_Places);   
        this.contentScrollView.Views.push(this.GridResults_Columns); 
    };

    PageView.prototype.create_grid_head_to_head = function(){
        var that = this;
        // Create a grid entry for each "player"

        this.comparison_player_ids = [that.player_id, App.Data.Players.findMe().get('_id')];

        // SequentialLayout of rows/grids
        this.HeadToHeadSeq = new SequentialLayout();
        this.HeadToHeadSeq.Views = [];
        this.HeadToHeadSeq.sequenceFrom(this.HeadToHeadSeq.Views);

        // Spacer
        this.tmpSpacer = new Surface({
            content: '',
            size: [undefined, 20]
        });
        this.HeadToHeadSeq.Views.push(this.tmpSpacer);

        // Title
        this.GridResults_HeadToHeadTitle = new View();
        this.GridResults_HeadToHeadTitle.Surface = new Surface({
            content: 'Head to Head >',
            size: [undefined, 40],
            properties: {
                backgroundColor: "white",
                color: "#222",
                padding: "0 10px",
                lineHeight: "40px"
            }
        });
        this.GridResults_HeadToHeadTitle.Surface.on('click', function(){
            // navigate to the normal games/summary view (that lists the games, scoreboard, filter, etc.)
            // - first set the parameters/flags that it will need to read
            App.Cache.NewSummary = {
                player_ids: [that.player_id, App.Data.Players.findMe().get('_id')]
            };
            App.history.navigate('player/comparison/' + CryptoJS.SHA3(JSON.stringify(App.Cache.NewSummary)));
        });
        this.GridResults_HeadToHeadTitle.Surface.pipe(this.contentScrollView);
        this.GridResults_HeadToHeadTitle.add(this.GridResults_HeadToHeadTitle.Surface);
        this.HeadToHeadSeq.Views.push(this.GridResults_HeadToHeadTitle);

        // Header row
        var headerRow = new View();
        headerRow.Grid = new GridLayout({
            dimensions: [8,1]
        });
        headerRow.SizeMod = new StateModifier({
            size: [undefined, 40]
        });
        var tmpProps = {
            textAlign: "center",
            fontSize: "20px",
            backgroundColor: "white"
        };
        this.headerSurfaces = [
            new Surface({
                content: "Player",
                properties: tmpProps
            }),
            new Surface({
                content: "W",
                properties: tmpProps
            }),
            new Surface({
                content: "L",
                properties: tmpProps
            }),
            new Surface({
                content: "T",
                properties: tmpProps
            }),
            new Surface({
                content: "1st",
                properties: tmpProps
            }),
            new Surface({
                content: "2nd",
                properties: tmpProps
            }),
            new Surface({
                content: "3rd",
                properties: tmpProps
            }),
            new Surface({
                content: "4th+",
                properties: tmpProps
            })
        ];
        this.headerSurfaces.forEach(function(surf){
            surf.pipe(that.contentScrollView);
        });
        headerRow.Grid.sequenceFrom(this.headerSurfaces);
        headerRow.add(headerRow.SizeMod).add(headerRow.Grid);

        this.HeadToHeadSeq.Views.push(headerRow);

        this.RowByPlayer = {};

        // Create row for each player
        this.comparison_player_ids.forEach(function(pId){
            var row = that.create_grid_head_to_head_row(pId);
            that.HeadToHeadSeq.Views.push(row);
        });

        this.contentScrollView.Views.push(this.HeadToHeadSeq);

    };


    PageView.prototype.create_grid_head_to_head_row = function(player_id){        
        // GridLayout of results
        // - 2 grid layouts W/L/T and 1/2/3/4+
        var that = this;

        this.RowByPlayer[player_id] = {};
        var tmpRow = this.RowByPlayer[player_id];
        tmpRow.GridSurfaces = {};

        // Name
        tmpRow.GridSurfaces.name = new Surface({
            content: '<span class="ellipsis full" data-replace-model="Player" data-replace-id="'+player_id.toString()+'" data-replace-field="name"></span>',
            properties: {
                backgroundColor: "white",
                color: "blue"
            }
        });
        Utils.dataModelReplaceOnSurface(tmpRow.GridSurfaces.name);
        // w
        tmpRow.GridSurfaces.w = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-win"]
        });
        tmpRow.GridSurfaces.w.pipe(that.contentScrollView);
        // l
        tmpRow.GridSurfaces.l = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-lose"]
        });
        tmpRow.GridSurfaces.l.pipe(that.contentScrollView);
        // t
        tmpRow.GridSurfaces.t = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-tie"]
        });
        tmpRow.GridSurfaces.t.pipe(that.contentScrollView);
        // 1
        tmpRow.GridSurfaces["1"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-gold"]
        });
        tmpRow.GridSurfaces["1"].pipe(that.contentScrollView);
        // 2
        tmpRow.GridSurfaces["2"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-silver"]
        });
        tmpRow.GridSurfaces["2"].pipe(that.contentScrollView);
        // 3
        tmpRow.GridSurfaces["3"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-bronze"]
        });
        tmpRow.GridSurfaces["3"].pipe(that.contentScrollView);
        // 4
        tmpRow.GridSurfaces["4"] = new Surface({
            content: '',
            classes: ["stat-grid-number", "bg-white"]
        });
        tmpRow.GridSurfaces["4"].pipe(that.contentScrollView);

        // Row setup
        var thisRow = new View();
        thisRow.Grid = new GridLayout({
            dimensions: [8,1]
        });
        thisRow.SizeMod = new StateModifier({
            size: [undefined, 40]
        });
        var tmpProps = {
            textAlign: "center",
            fontSize: "20px"
        };
        thisRow.Grid.sequenceFrom([
            tmpRow.GridSurfaces.name,
            tmpRow.GridSurfaces.w,
            tmpRow.GridSurfaces.l,
            tmpRow.GridSurfaces.t,
            tmpRow.GridSurfaces['1'],
            tmpRow.GridSurfaces['2'],
            tmpRow.GridSurfaces['3'],
            tmpRow.GridSurfaces['4']
        ]);
        thisRow.add(thisRow.SizeMod).add(thisRow.Grid);

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

    PageView.prototype.update_content = function(){
        var that = this;

        if(this.surface_PlayerInfo){
            this.surface_PlayerInfo.Surface.setContent(this.model.get('name'));
        }
        // if(this.model.get('connected_user_id')){
        //     this.surface_PlayerLinked.Surface.setContent('Linked');
        // } else {
        //     this.surface_PlayerLinked.Surface.setContent('LinkUp');
        // }

        // Total results/places
        if(that.stats_collection != undefined && that.stats_collection.hasFetched){
               // Summary/stat surfaces (update)
            _.each(that.stats_collection.summary[that.player_id], function(value, key){
                var tmpKey = '';
                switch(key){
                    case "1":
                    case "2":
                    case "3":
                        tmpKey = numeral(key).format('0o');
                        break;
                    case "4":
                        tmpKey = numeral(key).format('0o') + '+';
                        break;

                    case "w":
                    case "l":
                    case "t":
                        tmpKey = key.toUpperCase();
                        break;
                }
                that.GridSurfacesTotal[key].setContent(tmpKey + ': ' + value.toString());
            });

        }

        // Head to head results/places
        if(that.stats_collection_headtohead != undefined && that.stats_collection_headtohead.hasFetched){
            // Summary/stat surfaces (update)
            _.each(that.stats_collection_headtohead.summary, function(summary, this_player_id){
                // console.log(this_player_id);
                _.each(that.stats_collection_headtohead.summary[this_player_id], function(value, key){
                    that.RowByPlayer[this_player_id].GridSurfaces[key].setContent(value.toString());
                });
            });

        }

    }

    PageView.prototype.menuToggle = function() {
        console.log("menuToggle'ing");
        if (!this.sideView.open) {
            console.log('opening');
            this.mainTransitionable.set(200, { duration: 500, curve: 'easeOut' });
            this.sideView.flipOut();
        } else {
            console.log('closing');
            this.mainTransitionable.set(0, { duration: 500, curve: 'easeOut' });
            this.sideView.flipIn();
        }
        this.sideView.open = !this.sideView.open;
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){
                    case 'Fleet':

                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hiding the sideView
                        this.sideView.OpacityModifier.setOpacity(0);

                        // Move the content
                        window.setTimeout(function(){

                            // Hide content from a direction
                            // if(goingBack){
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.outTransition);
                            // } else {
                            //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0), transitionOptions.outTransition);
                            // }
                            that.ContentStateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hiding the sideView
                        this.sideView.OpacityModifier.setOpacity(0);

                        // Content
                        window.setTimeout(function(){
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide left
                            that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * -1) - 100,0,0), transitionOptions.outTransition);

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

                        // SideView must be visible
                        this.sideView.OpacityModifier.setOpacity(1);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        // // Header
                        // // - no extra delay
                        // window.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring map content back
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
