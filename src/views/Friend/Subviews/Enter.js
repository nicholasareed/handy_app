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
    var RenderNode = require('famous/core/RenderNode')

    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Backbone = require('backbone-adapter');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var Utils               = require('utils');
    var $                   = require('jquery-adapter');
    require('lib2/moment');
    var numeral             = require('lib2/numeral.min');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    // var tpl                 = require('text!./tpl/PlayerGameList.html');
    // var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.captureBack = false;

        this.model = options.model;

        // Background
        this.bgSurface = new Surface({
            size: [undefined, undefined]
        });
        this.bgSurface.BackMod = new StateModifier({
            transform: Transform.translate(0,0,-0.00001)
        });
        this.add(this.bgSurface.BackMod).add(this.bgSurface);
        // this.add(this.bgSurface.BackMod).add(this.bgSurface);

        // Scrollview
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];

        // Pipe bg to scrollview
        this.bgSurface.pipe(this.contentScrollView);

        // Content for scrollview
        this.createContent();

        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Origin Mod
        this.contentScrollView.OriginMod = new StateModifier({
            origin: [0.5,0]
        });
        this.add(this.contentScrollView);
    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;


    SubView.prototype.createContent = function(player_id){
        var that = this;

        // spacer
        this.spacer2 = new Surface({
            size: [undefined, 10]
        });
        this.spacer2.pipe(this.contentScrollView);
        this.contentScrollView.Views.push(this.spacer2);

        // Scan button
        this.scanButtonSurface = new View();
        this.scanButtonSurface.Surface = new Surface({
            size: [210,40],
            classes: ['button-surface'],
            content: "<strong>Scan</strong> a friend's barcode",
            properties: {
                lineHeight : "40px",
                // backgroundColor: "white",
                // color: "#333"
            }
        });
        this.scanButtonSurface.Surface.on('click', this.scan_barcode.bind(this) );
        this.scanButtonSurface.Surface.pipe(this.contentScrollView);
        this.scanButtonSurface.OriginMod = new StateModifier({
            origin: [0.5, 0]
        });
        this.scanButtonSurface.add(this.scanButtonSurface.OriginMod).add(this.scanButtonSurface.Surface);
        this.contentScrollView.Views.push(this.scanButtonSurface);

        // spacer
        this.spacer1 = new Surface({
            size: [undefined, 20]
        });
        this.spacer1.pipe(this.contentScrollView);
        this.contentScrollView.Views.push(this.spacer1);

        // Prompt button
        this.promptButtonSurface = new View();
        this.promptButtonSurface.Surface = new Surface({
            size: [210,40],
            classes: ['button-surface'],
            content: "<strong>Type</strong> a friend's code",
            properties: {
                lineHeight : "40px",
                // backgroundColor: "white",
                // color: "#333"
            }
        });
        this.promptButtonSurface.Surface.on('click', this.prompt_code.bind(this) );
        this.promptButtonSurface.Surface.pipe(this.contentScrollView);
        this.promptButtonSurface.OriginMod = new StateModifier({
            origin: [0.5, 0]
        });
        this.promptButtonSurface.add(this.promptButtonSurface.OriginMod).add(this.promptButtonSurface.Surface);
        this.contentScrollView.Views.push(this.promptButtonSurface);

    };

    SubView.prototype.check_code = function(code){
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

                if(response.type == 'friend'){
                    alert('You have successfully added a friend!');

                    // Update list of players
                    App.Data.User.fetch();

                    App.history.back();

                    return;
                }

            },
            error: function(err){
                alert('Failed with that code, please try again');
                return;
            }
        });
    };

    SubView.prototype.prompt_code = function(ev){
        var that = this;

        // Prompt for a code to be inputted
        var p = prompt('Code');
        if(p){
            that.check_code(p);
        }

        return false;
    };

    SubView.prototype.scan_barcode = function(ev){
        var that = this;

        this.captureBack = true;

        cordova.plugins.barcodeScanner.scan(
            function (result) {
                Timer.setTimeout(function(){
                    that.captureBack = false;
                },1000);
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
                Timer.setTimeout(function(){
                    that.captureBack = false;
                },1000);
                alert("Scanning failed: " + error);
            }
        );

        return false;
    };

    SubView.prototype.test_barcode = function(ev){
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


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
