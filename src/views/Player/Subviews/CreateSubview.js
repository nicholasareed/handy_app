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
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    require('lib2/moment');
    var numeral = require('lib2/numeral.min');

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

        this.model = options.model;

        // Background
        this.bgSurface = new Surface({
            size: [undefined, undefined]
        });
        // this.bgSurface.BackMod = new StateModifier({
        //     transform: Transform.behind
        // });
        this.add(this.bgSurface);
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

        // Text code
        // this.textCodeSurface = new View();
        this.textCodeSurface = new Surface({
            content: this.model.get('code'),
            size: [undefined, 60],
            classes: ['text-center'],
            properties: {
                lineHeight: "40px",
                color: "black",
                fontSize: "24px",
                fontWeight: "bold",
                letterSpacing: "2px"
                // backgroundColor: "white"
            }

        });
        this.textCodeSurface.pipe(this.contentScrollView);
        // this.textCodeSurface.add(this.textCodeSurface.OriginMod).add(this.textCodeSurface.Surface);
        this.contentScrollView.Views.push(this.textCodeSurface);

        // QR Code
        this.qrCodeSurface = new Surface({
            content: '<div id="qrcode"><i class="icon ion-looping"></i></div>',
            size: [undefined, 150],
            properties: {
                textAlign: "center",
                lineHeight: "150px",
                color: "black",
                backgroundColor: "white"
            }
            // origin: [0.5,0.5]
        });
        this.qrCodeSurface.pipe(this.contentScrollView);
        this.qrCodeSurface.on('deploy', function(){
            // debugger;
            Timer.setTimeout(function(){
                $('#qrcode').empty();
                $('#qrcode').qrcode({width: 150,height: 150,text: JSON.stringify({c: that.model.get('code'),v: 1})});
            }, 2000);
        });
        this.contentScrollView.Views.push(this.qrCodeSurface);

        // var qrcode = new QRCode("qrcode", {
        //     text: JSON.stringify({c: this.model.get('code'),v: 1}),
        //     width: 128,
        //     height: 128,
        //     colorDark : "#000000",
        //     colorLight : "#ffffff",
        //     // correctLevel : QRCode.CorrectLevel.H
        // });
        // Timer.setTimeout(function(){
        //     // that.qrCodeSurface.setContent('<div id="qrcode"></div>');
        //     $('#qrcode').empty();
        //     $('#qrcode').qrcode({width: 150,height: 150,text: JSON.stringify({c: that.model.get('code'),v: 1})});
        // },2000);

        // Instructions
        this.instructionsSurface = new View();
        this.instructionsSurface.Surface = new Surface({
            content: 'Have a friend scan the code from within Nemesis, or use one of the buttons below. <br />After they finish scanning, press the Back button to refresh your Nemeses list',
            size: [undefined, true],
            properties: {
                padding: "20px 8px",
                lineHeight: "20px",
                color: "black",
                backgroundColor: "white",
                textAlign: "center"
            }

        });
        this.instructionsSurface.getSize = function(){
            return that.instructionsSurface.Surface.getSize(true);
        };
        this.instructionsSurface.add(this.instructionsSurface.Surface);
        this.instructionsSurface.Surface.pipe(this.contentScrollView);
        this.contentScrollView.Views.push(this.instructionsSurface);

        // SMS Button
        this.smsButton = new View();
        this.smsButton.Surface = new Surface({
            size: [210,40],
            classes: ['button-surface'],
            content: "<strong>Send</strong> via Text Message",
            properties: {
                lineHeight : "40px",
                // backgroundColor: "white",
                // color: "#333"
            }
        });
        this.smsButton.Surface.pipe(this.contentScrollView);
        this.smsButton.Surface.on('click', this.share_by_sms.bind(this));
        this.smsButton.OriginMod = new StateModifier({
            origin: [0.5, 0]
        });
        this.smsButton.add(this.smsButton.OriginMod).add(this.smsButton.Surface);
        this.contentScrollView.Views.push(this.smsButton);

        // spacer
        this.spacer1 = new Surface({
            size: [undefined, 20]
        });
        this.spacer1.pipe(this.contentScrollView);
        this.contentScrollView.Views.push(this.spacer1);

        // Prompt button
        this.copyToClipBoardButton = new View();
        this.copyToClipBoardButton.Surface = new Surface({
            size: [210,40],
            classes: ['button-surface'],
            content: "<strong>Copy</strong> to clipboard",
            properties: {
                lineHeight : "40px",
                // backgroundColor: "white",
                // color: "#333"
            }
        });
        this.copyToClipBoardButton.Surface.on('click',this.copy_to_clipboard.bind(this));
        this.copyToClipBoardButton.Surface.pipe(this.contentScrollView);
        this.copyToClipBoardButton.OriginMod = new StateModifier({
            origin: [0.5, 0]
        });
        this.copyToClipBoardButton.add(this.copyToClipBoardButton.OriginMod).add(this.copyToClipBoardButton.Surface);
        this.contentScrollView.Views.push(this.copyToClipBoardButton);

    };

    SubView.prototype.share_by_sms = function(){
        try {
            window.plugins.socialsharing.shareViaSMS('Nemesis code: ' + this.model.get('code').toUpperCase(), null);
        }catch(err){
            console.error('Failed launching SMS sender');
            console.error(err);
            Utils.Notification.Toast('Failed launching SMS sender');
        }
    };

    SubView.prototype.copy_to_clipboard = function(){
        var that = this;

        try {
            window.plugins.clipboard.copy(this.model.get('code').toString());
            Utils.Notification.Toast('Copied Code to Clipboard');
        }catch(err){
            console.error('Failed1');
            console.error(err);
            Utils.Notification.Toast('Failed copying to clipboard');
        }

    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
