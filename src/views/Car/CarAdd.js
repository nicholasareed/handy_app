/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
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

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Utils
    var Utils = require('utils');

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');

    var EventHandler = require('famous/core/EventHandler');

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
        this.header = new NavigationBar({
            content: "Add Car",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            window.history.go(-1);
        });

        // Header StateModifier
        this.header.StateModifier = new StateModifier();

        // Attach header to the layout

        // Header/navigation
        this.HeaderNode = new RenderNode();
        this.HeaderNode.add(this.headerBg);
        this.HeaderNode.add(this.header.StateModifier).add(this.header);
        
        this.layout.header.add(this.HeaderNode);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // link endpoints of layout to widgets

        // // Content
        this.layout.content.StateModifier = new StateModifier();
        this.layout.content.add(this.layout.content.StateModifier).add(Transform.behind).add(this.contentScrollView);
        // this.layout.content.add(Transform.behind).add(this.contentScrollView);

        // Add surfaces to content (buttons)
        this.addSurfaces();

    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView

        // Scan button
        this.scanButtonSurface = new Surface({
            size: [150,40],
            classes: ['button-surface'],
            content: 'Scan a barcode',
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
            size: [150,40],
            classes: ['button-surface'],
            content: 'Enter a code',
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
            if(App.Data.User.toJSON().email == 'zanepreed@gmail.com'){
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


        // // Buy New button
        // this.buyButtonSurface = new Surface({
        //     size: [200,40],
        //     classes: ['button-surface'],
        //     content: 'Purchase',
        //     properties: {
        //         lineHeight : "40px",
        //         backgroundColor: "#3BAFDA",
        //         color: "white"
        //     }
        // });
        // this.buyButtonSurface.View = new View();
        // this.buyButtonSurface.View.StateModifier = new StateModifier();
        // this.buyButtonSurface.SizeModifier = new StateModifier({
        //     size: [undefined, 50]
        // });
        // this.buyButtonSurface.OriginModifier = new StateModifier({
        //     origin: [0.5, 0.5]
        // });
        // this.buyButtonSurface.View.add(this.buyButtonSurface.View.StateModifier).add(this.buyButtonSurface.SizeModifier).add(this.buyButtonSurface.OriginModifier).add(this.buyButtonSurface);
        // this.scrollSurfaces.push(this.buyButtonSurface.View);


        // Events for each
        this.scanButtonSurface.on('click', this.scan_barcode.bind(this));
        this.promptButtonSurface.on('click', this.prompt_code.bind(this));
        this.testButtonSurface.on('click', this.test_barcode.bind(this));
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
                // - either just added to a car
                //      - simply go look at it
                // - or am the Owner of a car now
                //      - go edit the car

                if(response.type == 'driver'){
                    alert('You have successfully linked with a Driver profile!');
                    App.history.navigate('car', {trigger: true});
                    return;
                }

                if(response.type == 'car'){
                    alert('You have successfully added a vehicle!');
                    App.history.navigate('car/' + response.id, {trigger: true});
                    return;
                }


                if(response.type == 'device'){
                    if(response.id){
                        alert('You have successfully added a vehicle!');
                        App.history.navigate('car/' + response.id, {trigger: true});
                    } else {
                        // no id returned, needs to be plugged into a Car
                        alert('Last Step: Plug the device into your car.');
                        App.history.navigate('car/' + response.id, {trigger: true});
                    }

                    return;
                    
                }

                alert('Failed determining the type of car added!');

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
                    url: Credentials.server_root + 'devices/info',
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

    PageView.prototype.buy_device = function(code){
        var that = this;

        Utils.Notification.Toast('Please visit WehicleApp.com!');

        return;
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
                            that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide content left
                            that.layout.content.StateModifier.setTransform(Transform.translate((window.innerWidth) - 100,0,0), transitionOptions.outTransition);

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

                        // Default header opacity
                        that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        that.scrollSurfaces.forEach(function(surf, index){
                            surf.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0));
                        });

                        // Header
                        // - no extra delay
                        window.setTimeout(function(){

                            // Change header opacity
                            that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);

                        }, delayShowing);

                        // Content
                        // - extra delay for other content to be gone
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring in button surfaces individually
                            that.scrollSurfaces.forEach(function(surf, index){
                                window.setTimeout(function(){
                                    surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                                        duration: 1500,
                                        curve: Easing.inOutElastic
                                    });
                                }, index * 50);
                            });

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
