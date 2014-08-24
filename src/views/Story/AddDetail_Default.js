/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var Lightbox = require('famous/views/Lightbox');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var ContainerSurface    = require("famous/surfaces/ContainerSurface");
    var InputSurface = require('famous/surfaces/InputSurface');

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Utils = require('utils');
    var color2 = require('lib2/color');
    var RGBaster = require('lib2/rgbaster');

    // Models
    var SportModel = require('models/sport');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // Add to new ".passed" params, separate from this.params.App and other root-level arguments/objects
        this.params.passed = _.extend({
            title: 'Details',
            back_to_default_hint: true
        }, App.Cache.DetailOptions || {});

        // Create according to the model's "result_type"
        this.model = this.params.App.Cache.DetailOptions.summary.sport;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();

        // create the "select from" Sport List scroller
        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView = new SequentialLayout();
        this.contentScrollView.Views = [];
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Gathering more details

        // Headline input
        this.headlineInput = new View();
        this.headlineInput.Surface = new InputSurface({
            size: [undefined, 60],
            placeholder: "Headline",
            properties: {
                backgroundColor: "white",
                color: "black",
                lineHeight: "60px",
                padding: "0px 8px",
                zIndex: "-1"
            }
        });
        this.headlineInput.Surface.on('input', function(event){
            // updated text
            that.bgInput.Layout.TextColor.Surface.setContent(that.headlineInput.Surface.getValue());
        });
        this.headlineInput.add(this.headlineInput.Surface);
        this.headlineInput.Surface.pipe(that.contentScrollView);
        this.contentScrollView.Views.push(this.headlineInput);

        // Background Color and Texture
        // - build array of colors, allow them to be swiped through
        // - static array of textures to use
        var bgColors = [];
        var textColors = [];

        // manually push white/black
        textColors.push({
            name: 'light',
            color: Color('#fff')
        });
        textColors.push({
            name: 'dark',
            color: Color('#000')
        });
        _.each(cssKeywords, function(val, name){
            bgColors.push({
                name: name,
                color: Color({r: val[0], g: val[1], b: val[2]})
            });
            textColors.push({
                name: name,
                color: Color({r: val[0], g: val[1], b: val[2]})
            });
        });
        var currentBgKey = Utils.randomInt(0,bgColors.length-1);

        // Use light/dark depending on the background
        // - only used for the default
        var currentTextColorKey = 0;
        if(bgColors[currentBgKey%bgColors.length].color.light()){
            currentTextColorKey = 1;
        }
        var bgTextures = [null,{ // first is null, the rest are {name}.png
            name: 'assault'
        },{
            name: 'batthern'
        },{
            name: 'bedge-grunge'
        },{
            name: '3px-tile'
        },{
            name: '60-lines'
        },{
            name: 'argyle'
        },{
            name: 'brick-wall-dark'
        },{
            name: 'bright-squares'
        },{
            name: 'clean-gray-paper'
        }
        ];
        var currentTextureKey = bgTextures.length -3; // always start with "none" texture
        this.bgInput = new View();
        this.bgInput.Surface = new Surface({
            size: [undefined, undefined],
            properties: {
                backgroundColor: bgColors[currentBgKey%bgColors.length].color.hexString(), // mod to wraparound colors
                backgroundImage: bgTextures[currentTextureKey%bgTextures.length] ? bgTextures[currentTextureKey%bgTextures.length].name + '.png':'',
                border: "1px solid black"
            }
        });

        // Grid for swiping (and text!)
        this.bgInput.Layout = new GridLayout({
            dimensions: [1,3]
        });
        this.bgInput.Layout.Views = [];

        // Top (pattern)
        this.bgInput.Layout.BgPattern = new Surface({
            content: 'no pttrn',
            size: [undefined, undefined],
            properties: {
                textAlign: "right",
                paddingRight: "8px",
                lineHeight: "100px",
                fontSize: "10px",
                color: "white"
            }
        });
        this.bgInput.Layout.Views.push(this.bgInput.Layout.BgPattern);

        this.bgInput.Layout.BgPattern.on('swipeleft', function(){
            currentTextureKey += 1;
            // Utils.Notification.Toast(bgTextures[currentTextureKey%bgTextures.length] ? bgTextures[currentTextureKey%bgTextures.length].name : 'No Texture');
            that.bgInput.Layout.BgPattern.setContent(bgTextures[currentTextureKey%bgTextures.length] ? bgTextures[currentTextureKey%bgTextures.length].name : 'no pttrn');
            that.bgInput.Surface.setProperties({
                backgroundImage: bgTextures[currentTextureKey%bgTextures.length] ? 'url(img/transparenttextures/' + bgTextures[currentTextureKey%bgTextures.length].name + '.png)' : '',
            });
        });
        this.bgInput.Layout.BgPattern.on('swiperight', function(){
            currentTextureKey -= 1;
            if(currentTextureKey < 0){
                currentTextureKey = bgTextures.length;
            }
            // Utils.Notification.Toast(bgTextures[currentTextureKey%bgTextures.length] ? bgTextures[currentTextureKey%bgTextures.length].name : 'No Texture');
            that.bgInput.Layout.BgPattern.setContent(bgTextures[currentTextureKey%bgTextures.length] ? bgTextures[currentTextureKey%bgTextures.length].name : 'No Texture');
            that.bgInput.Surface.setProperties({
                backgroundImage: bgTextures[currentTextureKey%bgTextures.length] ? 'url(img/transparenttextures/' + bgTextures[currentTextureKey%bgTextures.length].name + '.png)' : '',
            });
        });

        // Middle (text)
        this.bgInput.Layout.TextColor = new View();
        this.bgInput.Layout.TextColor.OriginMod = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.bgInput.Layout.TextColor.Surface = new Surface({
            content: "",
            size: [undefined, undefined],
            properties: {
                textAlign: "center",
                lineHeight: "50px",
                fontSize: "28px",
                textShadow: "0px 0px 1px #555",
                color: textColors[currentTextColorKey%textColors.length].color.hexString()
            }
        });
        this.bgInput.Layout.TextColor.add(this.bgInput.Layout.TextColor.SizeMod).add(this.bgInput.Layout.TextColor.Surface);
        this.bgInput.Layout.Views.push(this.bgInput.Layout.TextColor);

        this.bgInput.Layout.TextColor.Surface.on('swipeleft', function(){
            currentTextColorKey += 1;
            // Utils.Notification.Toast(bgColors[currentTextColorKey%bgColors.length].name);
            // that.bgInput.Layout.TextColor.Surface.setContent(bgColors[currentTextColorKey%bgColors.length].name);
            that.bgInput.Layout.TextColor.Surface.setProperties({
                color: textColors[currentTextColorKey%textColors.length].color.hexString(), // mod to wraparound colors
            });
        });
        this.bgInput.Layout.TextColor.Surface.on('swiperight', function(){
            currentTextColorKey -= 1;
            if(currentTextColorKey < 0){
                currentTextColorKey = bgColors.length;
            }
            // Utils.Notification.Toast(bgColors[currentBgKey%bgColors.length].name);
            // that.bgInput.Layout.TextColor.setContent(bgColors[currentTextColorKey%bgColors.length].name);
            that.bgInput.Layout.TextColor.Surface.setProperties({
                color: textColors[currentTextColorKey%textColors.length].color.hexString(), // mod to wraparound colors
            });
        });


        // Bottom (color)
        this.bgInput.Layout.BgColor = new Surface({
            content: bgColors[currentBgKey%bgColors.length].name,
            size: [undefined, undefined],
            properties: {
                textAlign: "right",
                paddingRight: "8px",
                lineHeight: "100px",
                fontSize: "10px",
                color: "white"
            }
        });
        this.bgInput.Layout.Views.push(this.bgInput.Layout.BgColor);

        this.bgInput.Layout.BgColor.on('swipeleft', function(){
            currentBgKey += 1;
            // Utils.Notification.Toast(bgColors[currentBgKey%bgColors.length].name);
            that.bgInput.Layout.BgColor.setContent(bgColors[currentBgKey%bgColors.length].name);
            that.bgInput.Surface.setProperties({
                backgroundColor: bgColors[currentBgKey%bgColors.length].color.hexString(), // mod to wraparound colors
            });
        });
        this.bgInput.Layout.BgColor.on('swiperight', function(){
            currentBgKey -= 1;
            if(currentBgKey < 0){
                currentBgKey = bgColors.length;
            }
            // Utils.Notification.Toast(bgColors[currentBgKey%bgColors.length].name);
            that.bgInput.Layout.BgColor.setContent(bgColors[currentBgKey%bgColors.length].name);
            that.bgInput.Surface.setProperties({
                backgroundColor: bgColors[currentBgKey%bgColors.length].color.hexString(), // mod to wraparound colors
            });
        });


        // Grid SequenceFrom
        this.bgInput.Layout.sequenceFrom(this.bgInput.Layout.Views);

        // this.bgInput.Surface.on('swipeleft', function(){ //forward
        //     currentBgKey += 1;
        //     Utils.Notification.Toast(bgColors[currentBgKey%bgColors.length].name);
        //     that.bgInput.Surface.setProperties({
        //         backgroundColor: bgColors[currentBgKey%bgColors.length].color.hexString(), // mod to wraparound colors
        //     });
        // });
        // this.bgInput.Surface.on('swiperight', function(){ // backward
        //     currentBgKey -= 1;
        //     if(currentBgKey < 0){
        //         currentBgKey = bgColors.length;
        //     }
        //     Utils.Notification.Toast(bgColors[currentBgKey%bgColors.length].name);
        //     that.bgInput.Surface.setProperties({
        //         backgroundColor: bgColors[currentBgKey%bgColors.length].color.hexString(), // mod to wraparound colors
        //     });
        // });
        // this.bgInput.Surface.on('swipeup', function(){
        //     currentTextureKey += 1;
        //     Utils.Notification.Toast(bgTextures[currentTextureKey%bgTextures.length] ? bgTextures[currentTextureKey%bgTextures.length].name : 'No Texture');
        //     that.bgInput.Surface.setProperties({
        //         backgroundImage: bgTextures[currentTextureKey%bgTextures.length] ? 'url(img/transparenttextures/' + bgTextures[currentTextureKey%bgTextures.length].name + '.png)' : '',
        //     });
        // });
        // this.bgInput.Surface.on('swipedown', function(){
        //     currentTextureKey -= 1;
        //     if(currentTextureKey < 0){
        //         currentTextureKey = bgTextures.length;
        //     }
        //     Utils.Notification.Toast(bgTextures[currentTextureKey%bgTextures.length] ? bgTextures[currentTextureKey%bgTextures.length].name : 'No Texture');
        //     that.bgInput.Surface.setProperties({
        //         backgroundImage: bgTextures[currentTextureKey%bgTextures.length] ? 'url(img/transparenttextures/' + bgTextures[currentTextureKey%bgTextures.length].name + '.png)' : '',
        //     });
        // });

        this.bgInput.SizeMod = new StateModifier({
            size: [undefined, 300]
        });

        var sizeNode = this.bgInput.add(this.bgInput.SizeMod);
        sizeNode.add(this.bgInput.Surface);
        sizeNode.add(this.bgInput.Layout);

        // Push this to the SequentialLayout/ScrollView
        this.contentScrollView.Views.push(this.bgInput);

        // this.bgInput.Surface.pipe(that.contentScrollView);

        // Background Texture (if any)

        // Background Image (if used)
        // - todo...
        // var img = 'http://example.com/path-to-image.jpg';
        // var paletteSize = 1; // get the dominant color
        // var colors = RGBaster.colors(img, function(payload){
        //   // You now have the payload.
        //   console.log(payload.dominant);
        //   console.log(payload.palette);
        // }, paletteSize);


        // Submit/Save
        this.submitButton = new View();
        this.submitButton.Surface = new Surface({
            size: [undefined, 60],
            content: 'Save',
            properties: {
                backgroundColor: "#F8F8F8",
                borderBottom: "1px solid #ddd",
                color: "blue",
                lineHeight: "60px",
                padding: "0px 8px",
                zIndex: "-1"
            }
        });
        this.submitButton.add(this.submitButton.Surface);
        this.submitButton.Surface.pipe(that.contentScrollView);
        this.submitButton.Surface.on('click', function(){

            var bg_color = bgColors[currentBgKey%bgColors.length].color;

            // Only white/black text for now, keep it simple
            // - eventually, let people choose
            var text_color = textColors[currentTextColorKey%textColors.length].color.hexString();

            // alert(opposite_color);

            if(that.params.passed.on_choose){
                that.params.passed.on_choose({
                    headline: that.headlineInput.Surface.getValue().toString(),
                    media_id: null,
                    bg_color: bgColors[currentBgKey%bgColors.length].color.hexString(),
                    bg_pattern: bgTextures[currentTextureKey%bgTextures.length] ? bgTextures[currentTextureKey%bgTextures.length].name : null,
                    text_color: text_color // choose a complementary color!
                });
            }
        });
        this.contentScrollView.Views.push(this.submitButton);


        // Content
        this.layout.content.StateModifier = new StateModifier();
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);

        // Attach layout to the context
        this.add(this.layout);

    };

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // create the header
        this.header = new StandardHeader({
            content: this.params.passed.title,
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
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

    var cssKeywords = {
      aliceblue:  [240,248,255],
      antiquewhite: [250,235,215],
      aqua: [0,255,255],
      aquamarine: [127,255,212],
      azure:  [240,255,255],
      beige:  [245,245,220],
      bisque: [255,228,196],
      black:  [0,0,0],
      blanchedalmond: [255,235,205],
      blue: [0,0,255],
      blueviolet: [138,43,226],
      brown:  [165,42,42],
      burlywood:  [222,184,135],
      cadetblue:  [95,158,160],
      chartreuse: [127,255,0],
      chocolate:  [210,105,30],
      coral:  [255,127,80],
      cornflowerblue: [100,149,237],
      cornsilk: [255,248,220],
      crimson:  [220,20,60],
      cyan: [0,255,255],
      darkblue: [0,0,139],
      darkcyan: [0,139,139],
      darkgoldenrod:  [184,134,11],
      darkgreen:  [0,100,0],
      darkgrey: [169,169,169],
      darkkhaki:  [189,183,107],
      darkmagenta:  [139,0,139],
      darkolivegreen: [85,107,47],
      darkorange: [255,140,0],
      darkorchid: [153,50,204],
      darkred:  [139,0,0],
      darksalmon: [233,150,122],
      darkseagreen: [143,188,143],
      darkslateblue:  [72,61,139],
      darkslategrey:  [47,79,79],
      darkturquoise:  [0,206,209],
      darkviolet: [148,0,211],
      deeppink: [255,20,147],
      deepskyblue:  [0,191,255],
      dimgrey:  [105,105,105],
      dodgerblue: [30,144,255],
      firebrick:  [178,34,34],
      floralwhite:  [255,250,240],
      forestgreen:  [34,139,34],
      fuchsia:  [255,0,255],
      gainsboro:  [220,220,220],
      ghostwhite: [248,248,255],
      gold: [255,215,0],
      goldenrod:  [218,165,32],
      green:  [0,128,0],
      greenyellow:  [173,255,47],
      grey: [128,128,128],
      honeydew: [240,255,240],
      hotpink:  [255,105,180],
      indianred:  [205,92,92],
      indigo: [75,0,130],
      ivory:  [255,255,240],
      khaki:  [240,230,140],
      lavender: [230,230,250],
      lavenderblush:  [255,240,245],
      lawngreen:  [124,252,0],
      lemonchiffon: [255,250,205],
      lightblue:  [173,216,230],
      lightcoral: [240,128,128],
      lightcyan:  [224,255,255],
      lightgoldenrodyellow: [250,250,210],
      lightgreen: [144,238,144],
      lightgrey:  [211,211,211],
      lightpink:  [255,182,193],
      lightsalmon:  [255,160,122],
      lightseagreen:  [32,178,170],
      lightskyblue: [135,206,250],
      lightslategrey: [119,136,153],
      lightsteelblue: [176,196,222],
      lightyellow:  [255,255,224],
      lime: [0,255,0],
      limegreen:  [50,205,50],
      linen:  [250,240,230],
      magenta:  [255,0,255],
      maroon: [128,0,0],
      mediumaquamarine: [102,205,170],
      mediumblue: [0,0,205],
      mediumorchid: [186,85,211],
      mediumpurple: [147,112,219],
      mediumseagreen: [60,179,113],
      mediumslateblue:  [123,104,238],
      mediumspringgreen:  [0,250,154],
      mediumturquoise:  [72,209,204],
      mediumvioletred:  [199,21,133],
      midnightblue: [25,25,112],
      mintcream:  [245,255,250],
      mistyrose:  [255,228,225],
      moccasin: [255,228,181],
      navajowhite:  [255,222,173],
      navy: [0,0,128],
      oldlace:  [253,245,230],
      olive:  [128,128,0],
      olivedrab:  [107,142,35],
      orange: [255,165,0],
      orangered:  [255,69,0],
      orchid: [218,112,214],
      palegoldenrod:  [238,232,170],
      palegreen:  [152,251,152],
      paleturquoise:  [175,238,238],
      palevioletred:  [219,112,147],
      papayawhip: [255,239,213],
      peachpuff:  [255,218,185],
      peru: [205,133,63],
      pink: [255,192,203],
      plum: [221,160,221],
      powderblue: [176,224,230],
      purple: [128,0,128],
      red:  [255,0,0],
      rosybrown:  [188,143,143],
      royalblue:  [65,105,225],
      saddlebrown:  [139,69,19],
      salmon: [250,128,114],
      sandybrown: [244,164,96],
      seagreen: [46,139,87],
      seashell: [255,245,238],
      sienna: [160,82,45],
      silver: [192,192,192],
      skyblue:  [135,206,235],
      slateblue:  [106,90,205],
      snow: [255,250,250],
      springgreen:  [0,255,127],
      steelblue:  [70,130,180],
      tan:  [210,180,140],
      teal: [0,128,128],
      thistle:  [216,191,216],
      tomato: [255,99,71],
      turquoise:  [64,224,208],
      violet: [238,130,238],
      wheat:  [245,222,179],
      yellow: [255,255,0],
      yellowgreen:  [154,205,50]
    };

});
