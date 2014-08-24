/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
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

    var Credentials         = JSON.parse(require('text!credentials.json'));
    // require('lib2/qrcode');
    var $ = require('jquery-adapter');

    var EventHandler = require('famous/core/EventHandler');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

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

        this.createHeader();

        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // link endpoints of layout to widgets

        // Header/navigation
        this.layout.header.add(this.header);

        // Content
        this.layout.content.StateModifier = new StateModifier();
        this.layout.content.add(this.layout.content.StateModifier).add(Transform.behind).add(this.contentScrollView);

        // // Footer
        // // - bring it up
        // this.layout.footer.add(quick_stats_grid);
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.mainTransform).add(this.layout);

        // Create Model
        this.model = new RelationshipCodeModel.RelationshipCode({
            player_id: this.options.args[0],
            modelType: 'player'
        })

        // Wait for model to be populated before loading Surfaces
        this.model.populated().then(this.addSurfaces.bind(this));
        this.model.fetch({prefill: true});

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: "Player Code",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView
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
            content: '<div id="qrcode"></div>',
            size: [undefined, 200],
            properties: {
                textAlign: "center",
                lineHeight: "40px",
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
        window.setTimeout(function(){
            $('#qrcode').qrcode({width: 150,height: 150,text: JSON.stringify({c: that.model.get('code'),v: 1})});
        },100);

        // Share Button

        this.shareButtonSurface = new Surface({
            content: "Share by SMS",
            size: [undefined, 50],
            classes: ['text-center'],
            properties: {
                lineHeight: "40px",
                color: "blue",
                backgroundColor: "white"
            }

        });
        this.scrollSurfaces.push(this.shareButtonSurface);

        // Events for surfaces
        this.shareButtonSurface.on('click', this.share_button.bind(this));


    };

    // PageView.prototype.render_qrcode: function () {
    //     var that = this;
        
    //     // qrcode generation
    //     if(this.model.get('code')){
    //         this.$('#qrcode').qrcode({width: 150,height: 150,text: JSON.stringify({c: this.model.get('code'),v: 1})});
    //     }

    //     return this;
    // };

    PageView.prototype.share_button = function(ev){
        
        window.plugins.socialsharing.shareViaSMS('Nemesis code: ' + this.model.get('code').toUpperCase(), null);

    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Content
                        window.setTimeout(function(){

                            // Bring content back
                            that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth,0,0), transitionOptions.inTransition);

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

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth, 0, 0));

                        // Content
                        // - extra delay for content to be gone
                        window.setTimeout(function(){

                            // Bring content back
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing);


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
