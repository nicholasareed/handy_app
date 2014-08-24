/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");
    var TabBar = require("famous/widgets/TabBar");

    var StandardHeader = require("views/common/StandardHeader");

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Utils
    var Utils = require('utils');

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery-adapter');

    // Subviews
    var CreateView      = require('./Subviews/CreateSubview');
    var EnterView      = require('./Subviews/EnterSubview');

    // Models
    var RelationshipCodeModel = require('models/relationship_code');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        // create the header
        this.createHeader();

        this.createContent();
        
        // Attach the layout to the rendertree
        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;


    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header's bg
        this.headerBg = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: "black",
                zIndex: "-10"
            }
        });

        // create the header bar
        this.header = new StandardHeader({
            content: "Add Player",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreContent: "&nbsp;&nbsp;&nbsp;"
        }); 
        this.header._eventOutput.on('back',function(){
            App.Data.Players.fetch(); // fetch, in case
            App.Events.trigger('player_collection_fetch');
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.Data.Players.fetch(); // fetch, in case
            App.Events.trigger('player_collection_fetch');
            App.history.back();
        });
        this.header._eventOutput.on('more',function(){
            App.history.navigate('player/add/nolink');
        });


        this.header.pipe(this._eventInput);

        // this._eventInput.on('menutoggle', this.menuToggle.bind(this));
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })
        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // Using another HeaderFooterLayout
        this.FixedContentLayout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.layout.content.add(this.FixedContentLayout);

        // // Tab content (render controller and subviews)
        // this.createTabContent();

        // // create the scrollView of content
        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        // this.scrollSurfaces = [];
        // this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // // Content
        // this.layout.content.StateModifier = new StateModifier();
        // this.layout.content.add(this.layout.content.StateModifier).add(Transform.behind).add(this.contentScrollView);


        // Create Model
        this.model = new RelationshipCodeModel.RelationshipCode({
            modelType: 'add_player'
        })

        // Wait for model to be populated before loading Surfaces
        this.model.populated().then(function(){

            // Create tabs
            that.createTopTabs();

            // Tab content (render controller and subviews)
            that.createTabContent();

            // Choose tab
            that.TopTabs.Bar.select('create');

        });
        this.model.fetch();

    };

    PageView.prototype.createTopTabs = function(){
        var that = this;

        // Create the Tabs
        this.TopTabs = new View();
        this.TopTabs.Bar = new TabBar();
        this.TopTabs.BarSizeMod = new StateModifier({
            size: [undefined, 40],
            transform: Transform.inFront
        });
        this.TopTabs.add(this.TopTabs.BarSizeMod).add(this.TopTabs.Bar);

        this.TopTabs.Bar.defineSection('create', {
            content: 'Create Code',
            onClasses: ['add-player-tabbar-default', 'on'],
            offClasses: ['add-player-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('enter', {
            content: 'Enter Code',
            onClasses: ['add-player-tabbar-default', 'on'],
            offClasses: ['add-player-tabbar-default', 'off']
        });

        // Add tabs to header
        this.FixedContentLayout.header.add(this.TopTabs);

        // Listeners for Tabs
        this.TopTabs.Bar.on('select', function(result){
            switch(result.id){

                case 'create':
                    that.ContentController.show(that.ContentController.Create);
                    break;

                case 'enter':
                    that.ContentController.show(that.ContentController.Enter);
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });
        // this.TopTabs.Bar.select('nemeses');

    };

    PageView.prototype.createTabContent = function(){
        var that = this;

        // Tab content
        // this.TopTabs = new View();
        this.ContentController = new RenderController();

        // Create
        this.ContentController.Create = new View();
        this.ContentController.Create.View = new CreateView({
            model: that.model
        });
        this.ContentController.Create.add(this.ContentController.Create.View);
        // this.TopTabs.Content.Nemeses = new View();
        // this.TopTabs.Content.Nemeses.Surface = new Surface({
        //     content: 'No news for Nemeses!',
        //     size: [undefined, 50],
        //     properties: {
        //         textAlign: "center",
        //         backgroundColor: "white",
        //         color: "#222",
        //         lineHeight: "50px",
        //         borderTop: "1px solid #ddd"
        //     }
        // });
        // this.TopTabs.Content.Nemeses.add(this.TopTabs.Content.Nemeses.Surface);

        // Enter
        this.ContentController.Enter = new View();
        this.ContentController.Enter.View = new EnterView({
            model: that.model
        });
        this.ContentController.Enter.add(this.ContentController.Enter.View);

        // Add RenderController to content
        this.FixedContentLayout.content.add(this.ContentController);

        // // Add Lightbox to sequence (FlexibleLayout)
        // this.contentScrollView.Views.push(this.ContentController);


        // this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

        // // Flexible Layout sequencing
        // this.contentScrollView.sequenceFrom(this.contentScrollView.Views);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView


        /*
    
        Tabs!
        1. Send a code to a friend, or enter a friend's code
        2. 

        */



        // Instructions
        this.instructionsSurface = new Surface({
            content: 'Have a friend scan the code () from within Nemesis, or use one of the buttons below. <br />After scanning, press the Back button',
            size: [undefined, 80],
            properties: {
                lineHeight: "20px",
                color: "black",
                padding: "0px 10px",
                backgroundColor: "white",
                textAlign: "center"
            }

        });
        this.scrollSurfaces.push(this.instructionsSurface);


        // Scan button
        this.scanButtonSurface = new Surface({
            size: [210,40],
            classes: ['button-surface'],
            content: "<strong>Scan</strong> a Nemesis's barcode",
            properties: {
                lineHeight : "40px",
                // backgroundColor: "white",
                // color: "#333"
            }
        });
        this.scanButtonSurface.View = new View();
        this.scanButtonSurface.View.StateModifier = new StateModifier();
        this.scanButtonSurface.SizeModifier = new StateModifier({
            size: [undefined, 50]
        });
        this.scanButtonSurface.OriginModifier = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.scanButtonSurface.View.add(this.scanButtonSurface.View.StateModifier).add(this.scanButtonSurface.SizeModifier).add(this.scanButtonSurface.OriginModifier).add(this.scanButtonSurface);
        this.scrollSurfaces.push(this.scanButtonSurface.View);

        // Prompt button
        this.promptButtonSurface = new Surface({
            size: [210,40],
            classes: ['button-surface'],
            content: "<strong>Type</strong> a Nemeses's code",
            properties: {
                lineHeight : "40px",
                // backgroundColor: "white",
                // color: "#333"
            }
        });
        this.promptButtonSurface.View = new View();
        this.promptButtonSurface.View.StateModifier = new StateModifier();
        this.promptButtonSurface.SizeModifier = new StateModifier({
            size: [undefined, 50]
        });
        this.promptButtonSurface.OriginModifier = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.promptButtonSurface.View.add(this.promptButtonSurface.View.StateModifier).add(this.promptButtonSurface.SizeModifier).add(this.promptButtonSurface.OriginModifier).add(this.promptButtonSurface);
        this.scrollSurfaces.push(this.promptButtonSurface.View);

        this.testButtonSurface = new Surface({
            size: [150,40],
            classes: ['button-surface'],
            content: 'test scanner',
            properties: {
                lineHeight : "40px",
                backgroundColor: "#f68484"
            }
        });

        this.testButtonSurface.View = new View();
        this.testButtonSurface.View.StateModifier = new StateModifier();
        this.testButtonSurface.SizeModifier = new StateModifier({
            size: [undefined, 50]
        });
        this.testButtonSurface.OriginModifier = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.testButtonSurface.View.add(this.testButtonSurface.View.StateModifier).add(this.testButtonSurface.SizeModifier).add(this.testButtonSurface.OriginModifier).add(this.testButtonSurface);

        try {
            if(App.Data.User.toJSON().email.substr(0,15) == 'nicholas.a.reed'){
                this.scrollSurfaces.push(this.testButtonSurface.View);
            }
        }catch(err){

        }

        // Spacer
        this.spacerSurface = new Surface({
            size: [200,1],
            properties: {
                backgroundColor: "white"
            }
        });
        this.spacerSurface.View = new View();
        this.spacerSurface.View.StateModifier = new StateModifier();
        this.spacerSurface.SizeModifier = new StateModifier({
            size: [undefined, 10]
        });
        this.spacerSurface.OriginModifier = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.spacerSurface.View.add(this.spacerSurface.View.StateModifier).add(this.spacerSurface.SizeModifier).add(this.spacerSurface.OriginModifier).add(this.spacerSurface);
        this.scrollSurfaces.push(this.spacerSurface.View);

        // Text code
        this.textCodeSurface = new Surface({
            content: this.model.get('code'),
            size: [undefined, 40],
            classes: ['text-center'],
            properties: {
                lineHeight: "40px",
                color: "black",
                backgroundColor: "white"
            }

        });
        this.scrollSurfaces.push(this.textCodeSurface);

        // QR Code
        this.qrCodeSurface = new Surface({
            content: '<div id="qrcode"><i class="icon ion-looping"></i></div>',
            size: [undefined, 200],
            properties: {
                textAlign: "center",
                lineHeight: "200px",
                color: "black",
                backgroundColor: "white"
            }
            // origin: [0.5,0.5]
        });
        this.scrollSurfaces.push(this.qrCodeSurface);
        // var qrcode = new QRCode("qrcode", {
        //     text: JSON.stringify({c: this.model.get('code'),v: 1}),
        //     width: 128,
        //     height: 128,
        //     colorDark : "#000000",
        //     colorLight : "#ffffff",
        //     // correctLevel : QRCode.CorrectLevel.H
        // });
        Timer.setTimeout(function(){
            // that.qrCodeSurface.setContent('<div id="qrcode"></div>');
            $('#qrcode').empty();
            $('#qrcode').qrcode({width: 150,height: 150,text: JSON.stringify({c: that.model.get('code'),v: 1})});
        },2000);




        // this.scrollSurfaces.push(this.spacerSurface.View);

        // window.plugins.copy(text);
        // window.plugins.socialsharing.shareViaSMS('Nemesis code: ' + this.model.get('code').toUpperCase(), null);

        // Events for each
        this.scanButtonSurface.on('click', this.scan_barcode.bind(this));
        this.promptButtonSurface.on('click', this.prompt_code.bind(this));
        if(this.testButtonSurface){
            this.testButtonSurface.on('click', this.test_barcode.bind(this));
        }
        // this.buyButtonSurface.on('click', this.buy_device.bind(this));


    };

    PageView.prototype.check_code = function(code){
        var that = this;

        // Check the invite code against the server
        // - creates the necessary relationship also
        $.ajax({
            url: Credentials.server_root + 'relationships/invited',
            method: 'post',
            data: {
                from: 'add', // if on the Player Edit / LinkUp page, we'd be using 'linkup'
                code: code
            },
            success: function(response){
                if(response.code != 200){
                    if(response.msg){
                        alert(response.msg);
                        return;
                    }
                    alert('Invalid code, please try again');
                    return false;
                }

                // Relationship has been created
                // - either just added to a player
                //      - simply go look at it
                // - or am the Owner of a player now
                //      - go edit the player

                if(response.type == 'player'){
                    alert('You have successfully added a player!');

                    // Update list of players
                    App.Data.Players.fetch();

                    // Erase until
                    App.history.eraseUntilTag('Dash');
                    App.history.navigate('player/' + response._id);
                    return;
                }

            },
            error: function(err){
                alert('Failed with that code, please try again');
                return;
            }
        });
    };

    PageView.prototype.prompt_code = function(ev){
        var that = this;

        // Prompt for a code to be inputted
        var p = prompt('Code');
        if(p){
            that.check_code(p);
        }

        return false;
    };

    PageView.prototype.scan_barcode = function(ev){
        var that = this;

        cordova.plugins.barcodeScanner.scan(
            function (result) {
                if(result.cancelled){
                    return false;
                }

                // Got a result

                // Try and parse it as JSON (that is what we are expecting)
                try {
                    var data = JSON.parse(result.text);
                    if(typeof data != typeof({})){
                        throw "Failed 'data' type";
                    }
                } catch(err){
                    // Failed reading the code
                    alert('Sorry, this does not seem to be a valid invite barcode');
                    return;
                }

                // Expecting "v" and "c" keys
                // - version
                // - code

                if(!data.c){
                    alert('Sorry, this does not seem to be a valid invite barcode');
                    return;
                }

                // Check the code
                that.check_code(data.c);

            }, 
            function (error) {
                alert("Scanning failed: " + error);
            }
        );

        return false;
    };

    PageView.prototype.test_barcode = function(ev){
        var that = this;

        cordova.plugins.barcodeScanner.scan(
            function (result) {
                if(result.cancelled){
                    return false;
                }

                // Got a result

                // Try and parse it as JSON (that is what we are expecting)
                try {
                    var data = JSON.parse(result.text);
                    if(typeof data != typeof({})){
                        throw "Failed 'data' type";
                    }
                } catch(err){
                    // Failed reading the code
                    alert('Failed parsing JSON');
                    return;
                }

                // Show "read" data
                alert(JSON.stringify(data));

                // Gather details from server

                // Expecting "v" and "c" keys
                // - version
                // - code

                // Gather more details from server
                $.ajax({
                    url: Credentials.server_root + 'relationship_codes/info',
                    method: 'post',
                    data: data,
                    error: function(err){
                        alert("Failed loading remote");
                    },
                    success: function(responseText){
                        // alert('responseText');
                        alert(JSON.stringify(responseText));
                    }
                });

                return false;

            }, 
            function (error) {
                alert("Scanning failed: " + error);
            }
        );

        return false;
    };

    PageView.prototype.backbuttonHandler = function(ev){
        // See if we are in the Barcode scanner
        var that = this;

        try {
            if(this.ContentController.Enter.View.captureBack === true){
                console.info('is Captured');
                return;
            } else {
                console.info('not captured');
                console.info(typeof this.ContentController.Enter.View.captureBack);
                console.info(this.ContentController.Enter.View.captureBack);
            }
        }catch(err){
            console.error(err);
        }

        console.log('back without captured...');

        this.header._eventOutput.emit('back');
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hide/move elements
                        window.setTimeout(function(){
                            // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // // Slide content left
                            // that.layout.content.StateModifier.setTransform(Transform.translate((window.innerWidth) - 100,0,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    window.setTimeout(that.refreshData.bind(that), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // // if(goingBack){
                        // //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // // } else {
                        // //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // // }
                        // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        // that.scrollSurfaces.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0));
                        // });

                        // // Header
                        // // - no extra delay
                        // window.setTimeout(function(){

                        //     // Change header opacity
                        //     that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        // }, delayShowing);

                        // Content
                        // - extra delay for other content to be gone
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // // Bring in button surfaces individually
                            // that.scrollSurfaces.forEach(function(surf, index){
                            //     window.setTimeout(function(){
                            //         surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                            //             duration: 1500,
                            //             curve: Easing.inOutElastic
                            //         });
                            //     }, index * 50);
                            // });

                        }, delayShowing); // + transitionOptions.outTransition.duration);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
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
