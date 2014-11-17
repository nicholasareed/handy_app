require.config({

    // baseUrl: 'src/lib',

    // map: {
    //  '*': {
    //      backbone: '../src/lib2/backbone',
    //      underscore: '../src/lib2/underscore',
    //      jquery: '../src/lib2/jquery'
    //  }
    // },
    waitSeconds: 7,
    paths: {
        // appLib: '../src/lib2/',
        // famous: '../lib/famous',
        // requirejs: '../lib/requirejs/require',
        // almond: '../lib/almond/almond',
        // 'famous-polyfills': '../lib/famous-polyfills/index',

        'famous-boxlayout': 'bower_components/famous-boxlayout/BoxLayout',

        async : '../src/requirejs-plugins/src/async',

        underscore: '../src/lib2/underscore',
        jquery: '../src/lib2/jquery',
        backbone: '../src/lib2/backbone',
        moment: '../src/lib2/moment',
        numeral: '../src/lib2/numeral.min',
        // history: '../src/lib2/history',
        utils: '../src/utils',
        handlebars: '../src/lib2/handlebars',
        'backbone-adapter' : '../src/lib2/backbone-adapter',
        'jquery-adapter' : '../src/lib2/jquery-adapter',

        inappbrowsercss: '../css/inappbrowser.css',
        inappbrowserjs: '../src/views/Misc/inappbrowser.js'
    },

    shim: {
        'underscore': {
            exports: '_'
        },
        'jquery' : {
            exports: 'jquery',
        },
        'backbone': {
            deps: ['underscore', 'jquery','moment'],
            exports: 'Backbone'
        },
        'backbone-adapter': {
            deps: ['backbone'],
            exports: 'Backbone'
        },
        'jquery-adapter': {
            deps: ['jquery'],
            exports: 'jquery'
        },
        'hammer' : {
            deps: ['jquery'],
            exports: 'Hammer'
        },
        'handlebars' : {
            exports: 'Handlebars'
        },
        'handlebars-adapter' : {
            deps: ['handlebars'],
            exports: 'Handlebars'
        },

        'lib2/leaflet/leaflet.label' : {
            deps: ['lib2/leaflet/leaflet']
        },
        'lib2/leaflet/leaflet.iconlabel' : {
            deps: ['lib2/leaflet/leaflet']
        },
        'lib2/leaflet/tile.stamen' : {
            deps: ['lib2/leaflet/leaflet']
        }

        // // 'async!http://maps.googleapis.com/maps/api/js?sensor=false'

        // 'http://maps.googleapis.com/maps/api/js?sensor=false' : {
        //     // deps: ["src/lib2/map_markerWithLabel.js",
        //     //         "src/lib2/map_styledmarker.js",
        //     //         "src/lib2/map_geomarker.js",
        //     //         "src/lib2/map_markerclusterer.js",
        //     //         "src/lib/functionPrototypeBind.js",
        //     //         "src/lib/classList.js",
        //     //         "src/lib/requestAnimationFrame.js"]
        // },
        // // Google maps
        //             "http://maps.googleapis.com/maps/api/js?sensor=false",
        //             "src/lib2/map_markerWithLabel.js",
        //             "src/lib2/map_styledmarker.js",
        //             "src/lib2/map_geomarker.js",
        //             "src/lib2/map_markerclusterer.js",
        //             "src/lib/functionPrototypeBind.js",
        //             "src/lib/classList.js",
        //             "src/lib/requestAnimationFrame.js",
    },

    urlArgs: new Date().toString(),
    // urlArgs: 'v1.8'

});

// Global "App" variable
var App = {},
    S = null; // used for Utils.hbSanitize

define(function(require, exports, module) {
    'use strict';

    // var FastClick = require('famous/inputs/FastClick');

    // import dependencies
    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var RenderController = require('famous/views/RenderController');
    var Lightbox = require('famous/views/Lightbox');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode');

    var Easing = require('famous/transitions/Easing');
    var Timer = require('famous/utilities/Timer');

    var StandardTabBar = require('views/common/StandardTabBar');

    var EventHandler = require('famous/core/EventHandler');

    var Backbone = require('backbone');
    var DeviceReady = require('./device_ready');
    var $ = require('jquery-adapter');
    require('lib2/hammer'); // creates global Hammer()
    var _ = require('underscore');
    var Utils = require('utils');
    S = Utils.hbSanitize;

    // Models
    var PreloadModels = require('models/preload');
    var UserModel = require('models/user');

    console.info('Loaded main.js');
    var tmpDefaultCache = {
        ModelReplacers: {},
        RoutesByHash: {}
    };
    // Data store
    App = {
        t: null, // for translation
        Utils: Utils,
        Flags: {},
        Functions: {}, // some global functions, like for Splash
        KeyboardShowing: false,
        MainContext: null,
        MainController: null,
        MainView: null,
        Events: new EventHandler(),
        Credentials: JSON.parse(require('text!credentials.json')),
        Config: null, // parsed in a few lines, symlinked to src/config.xml
        ConfigImportant: {},
        BackboneModels: _.extend({}, Backbone.Events),
        Router: null,
        Views: {
            Popover: {},
            MainFooter: null
        },
        Analytics: null,
        DefaultCache: tmpDefaultCache,
        Cache: _.defaults({},tmpDefaultCache),
        Data: {
            User: null
        },
        Defaults: {
            ScrollView: {
                // friction: 0.001,
                // drag: 0.0001,
                // edgeGrip: 0.5,
                // edgePeriod: 500, //300,
                // edgeDamp: 1,
                // speedLimit: 2

                // friction: 0.0001, // default 0.001
                // edgeGrip: 0.05, // default 0.5
                // speedLimit: 2.5 // default 10
            },
            Header: {
                Icon: {
                    w: 60 // width
                },
                size: 60 // height, width always undefined width
            },
            Footer: {
                size: 0 // height, width always undefined
            },
        },
        Planes: {
            fps: 10, // 10=hidden, frames-per-second counter
            background: -1000000,
            content: 100,
            contentTabs: 400,
            header: 500,
            footer: 500,
            mainfooter: 500,
            popover: 2000,
            splashLoading: 2100,
            statusBar: 3000
        }
    };

    // Update body stylesheet
    // - remove loading background
    // document.body.setAttribute('style',"height:"+window.innerHeight+"px;");
    document.body.setAttribute('style','');

    // Google Analytics Plugin
    Utils.Analytics.init();

    // Config file, symlinked (ln -s) into multiple directories
    var ConfigXml = require('text!config.xml');
    // Parse config.xml and set approprate App variables
    App.Config = $($.parseXML(ConfigXml));
    if(App.Config.find("widget").get(0).attributes.id.value.indexOf('.pub') !== -1){
        App.Prod = true;
        App.ConfigImportant.Version = App.Config.find("widget").get(0).attributes.version.value;
        App.ConfigImportant.StatusBarBackgroundColor = App.Config.find("widget").find('preference[name="StatusBarBackgroundColor"]').get(0).attributes.value.value;
    }

    // Run DeviceReady actions
    // - Push Notifications
    // - Resume, Back, etc.
    App.DeviceReady = DeviceReady;
    App.DeviceReady.init();
    // App.DeviceReady.ready.then(function(){
    //     App.DeviceReady.runGpsUpdate();
    // });

    // Language set?
    // - localization / globalization
    App.Cache.Language = localStorage.getItem('language_v1');
    var LanguageDef = $.Deferred();
    if(!App.Cache.Language || App.Cache.Language.length <= 0){
        App.Cache.Language = 'en';
        // Get Language
        try {
            navigator.globalization.getLocaleName(
                function (locale) {
                    console.info('locale: ' + locale.value);
                    // Set the locale
                    // - should validate we support this locale!
                    var localeNormalized = Utils.Locale.normalize(locale.value);
                    if(localeNormalized !== false){
                        // valid value!
                        console.info('locale normalized: ' + localeNormalized);
                        App.Cache.Language = localeNormalized;
                    }
                    LanguageDef.resolve();
                },
                function () {
                    alert('Error getting locale');
                }
            );
        }catch(err){
            // use default
            LanguageDef.resolve();
        }
    } else {
        // Have the language already
        LanguageDef.resolve();
    }
    
    // Localization
    LanguageDef.promise().then(function(){
        $.i18n.init({
            lng: App.Cache.Language, //'ru',
            ns: {namespaces: ['ns.common'], defaultNs: 'ns.common'}, //{ namespaces: ['ns.common', 'ns.special'], defaultNs: 'ns.special'},
            useLocalStorage: false,
            debug: true
        },function(t){
            // localization initialized
            App.t = t;

            // Router
            App.Router = require('router')(App); // Passing "App" context to Router also


            // create the main context
            App.MainContext = Engine.createContext();
            App.MainContext.setPerspective(1000);

            // MainView
            App.MainView = new View();
            App.MainView.SizeMod = new StateModifier({
                size: [undefined, undefined]
            });
            App.MainContext.add(App.MainView.SizeMod).add(App.MainView);

            // Add main background image (pattern)
            App.MainBackground = new Surface({
                size: [undefined, undefined],
                classes: ['overall-background']
            });
            App.MainView.add(Utils.usePlane('background')).add(App.MainBackground); 

            // Create main Lightbox
            App.MainController = new Lightbox();
            App.MainController.getSize = function(){
                return [undefined, undefined];
            };
            App.MainController.resetOptions = function(){
                this.setOptions(Lightbox.DEFAULT_OPTIONS);
            };

            App.defaultSize = [window.innerWidth, window.innerHeight]; // use Device Width/height via native plugin? 
            // document.body.setAttribute('style',"width:"+window.innerWidth+"px;height:"+window.innerHeight+"px");
            // Utils.Notification.Toast(window.innerHeight);
            App.mainSize = [window.innerWidth, window.innerHeight];
            // Engine.nextTick(function() {
            //     console.log('After tick=' + App.MainContext.getSize());
            //     App.mainSize = App.MainContext.getSize();
            // });
    
            App.MainContext.on('resize', function(e) {
                // Utils.Notification.Toast('Resized');
                App.MainView.SizeMod.setSize(App.mainSize);
                // document.body.setAttribute('style',"height:"+App.mainSize[1]+"px");
            }.bind(this));


            // Layout for StatusBar / Controller
            if(App.Config.devicePlatform == 'ios'){
                App.StatusBar = true;
            }

            // App.StatusBar set in device_ready
            App.DeviceReady.ready.then(function(){

                var ratios = [1];
                if(App.StatusBar === true){
                    ratios = [true, 1];
                }
                App.MainView.Layout = new FlexibleLayout({
                    direction: 1,
                    ratios: ratios
                });
                App.MainView.Layout.Views = [];


                // iOS StatusBar (above MainController lightbox, if necessary)
                App.StatusBarView = new View();
                App.StatusBarView.getSize = function(){
                    return [undefined, 20];
                };
                App.StatusBarView.Controller = new RenderController();
                App.StatusBarView.add(Utils.usePlane('statusBar')).add(App.StatusBarView.Controller);

                // Animate new colors accordingly (wish it were easier)
                App.StatusBarView.newSurface = function(surf){
                    // animates in a new Surface
                    if(surf instanceof Surface){
                        App.StatusBarView.Controller.show(surf);
                        return;
                    }

                    // create new surface for color, if passed that in an object
                    if(surf.bgClasses){

                        var tmpSurf = new Surface({
                            size: [undefined, 20],
                            classes: surf.bgClasses
                        })

                        App.StatusBarView.Controller.show(tmpSurf);
                        return;
                    }

                    // what else?
                    console.error('no other handler for newSurface');
                    
                };

                // Add first surface
                App.StatusBarView.newSurface({
                    bgClasses: ['status-bar-green']
                });


                // Add to Layout
                if(App.StatusBar === true){
                    App.MainView.Layout.Views.push(App.StatusBarView);
                }

                App.MainView.Layout.Views.push(App.MainController);
                App.MainView.Layout.sequenceFrom(App.MainView.Layout.Views);

                // Add Lightbox/RenderController to mainContext
                App.MainView.add(App.MainView.Layout);

            });

            // Main Footer
            var createMainFooter = function(){
                // var that = this;
                App.Views.MainFooter = new View();

                App.Views.MainFooter.Bg = new Surface({
                    size: [undefined, undefined],
                    classes: ['footer-tabbar-background']
                });

                // create the footer
                App.Views.MainFooter.Tabs = new StandardTabBar();  
                var tmpTabs = App.Views.MainFooter.Tabs;

                tmpTabs.defineSection('todos', {
                    content: '<i class="icon ion-android-lightbulb"></i><div><span class="ellipsis-all">Job</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });
                tmpTabs.defineSection('invoices', {
                    content: '<i class="icon ion-social-usd"></i><div><span class="ellipsis-all">Invoices</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });
                // tmpTabs.defineSection('updates', {
                //     content: '<i class="icon ion-android-sort"></i><div><span class="ellipsis-all">Updates</span></div>',
                //     onClasses: ['footer-tabbar-default', 'on'],
                //     offClasses: ['footer-tabbar-default', 'off']
                // });
                // tmpTabs.defineSection('messages', {
                //     content: '<i class="icon ion-android-inbox"></i><div><span class="ellipsis-all">Msgs</span></div>',
                //     onClasses: ['footer-tabbar-default', 'on'],
                //     offClasses: ['footer-tabbar-default', 'off']
                // });
                tmpTabs.defineSection('profiles', {
                    content: '<i class="icon ion-person"></i><div><span class="ellipsis-all">Profile</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });

                tmpTabs.on('select', function(result, eventTriggered){
                    console.log(eventTriggered);
                    console.log(result);
                    switch(result.id){
                        
                        case 'todos':
                            App.history.navigate('todo/list');
                            break;

                        case 'invoices':
                            App.history.navigate('invoice/list');
                            break;

                        case 'profiles':
                            // display the "last" profile we looked at
                            if(App.history.findLastTag('user')){
                                // found a tag to go back to
                                App.history.backTo('user');
                            } else {
                                // show the default user
                                App.history.navigate('user');
                            }
                            break;

                        case 'updates':
                            App.history.navigate('actions/all');
                            break;

                        case 'messages':
                            App.history.navigate('inbox');
                            break;

                        default:
                            alert('none chosen');
                            break;
                    }
                });


                // Attach header to the layout 
                App.Views.MainFooter.originMod = new StateModifier({
                    origin: [0, 1]
                });
                App.Views.MainFooter.positionMod = new StateModifier({
                    transform: Transform.translate(0,60,0)
                });
                App.Views.MainFooter.sizeMod = new StateModifier({
                    size: [undefined, 60]
                });

                var node = App.Views.MainFooter.add(App.Views.MainFooter.originMod).add(App.Views.MainFooter.positionMod).add(App.Views.MainFooter.sizeMod);
                node.add(App.Views.MainFooter.Bg);
                node.add(App.Views.MainFooter.Tabs);

                App.Views.MainFooter.show = function(transition){
                    transition = transition || {
                        duration: 750,
                        curve: Easing.outExpo
                    };
                    App.Views.MainFooter.positionMod.setTransform(Transform.translate(0,0,0), transition);
                };

                App.Views.MainFooter.hide = function(transition){
                    transition = transition || {
                        duration: 250,
                        curve: Easing.inExpo
                    };
                    App.Views.MainFooter.positionMod.setTransform(Transform.translate(0,1000,0), transition);
                };

                // Add to maincontext
                App.MainView.add(Utils.usePlane('mainfooter')).add(App.Views.MainFooter);

            };
            createMainFooter();

            // Splash Page (bloom loading)
            // - terminated by the 
            var createSplashLoading = function(){
                // var that = this;
                App.Views.SplashLoading = new RenderController({
                    inTransition: false,
                    // outTransition: false,
                });
                App.Views.SplashLoading.View = new View();
                App.Views.SplashLoading.View.SizeMod = new StateModifier({
                    size: [undefined, undefined]
                });
                App.Views.SplashLoading.View.OriginMod = new StateModifier({
                    origin: [0.5,0.5]
                });
                var viewNode = App.Views.SplashLoading.View.add(App.Views.SplashLoading.View.SizeMod).add(App.Views.SplashLoading.View.OriginMod);
                App.Views.SplashLoading.BgSurface = new Surface({
                    content: '',
                    size: [undefined, undefined],
                    classes: ['splash-background-default']
                });


                // spinning logo

                // 0 - innermost
                App.Views.SplashLoading.Logo = new ImageSurface({
                    // content: 'OddJob',
                    content: 'icon.png',
                    classes: ['splash-surface-default'],
                    properties: {
                        // 'backface-visibility' : 'visible'
                    },
                    // content: 'https://dl.dropboxusercontent.com/u/6673634/wehicle_square.svg',
                    // size: [window.innerWidth, 70]
                    size: [150, 150]
                });
                App.Views.SplashLoading.Logo.useOpacity = 0;
                var splashOpacity = 0;
                App.Views.SplashLoading.Logo.StateMod = new StateModifier({
                    opacity: App.Views.SplashLoading.Logo.useOpacity
                });
                App.Views.SplashLoading.Logo.Mod = new Modifier({
                    opacity: function(){
                        // splashOpacity += 0.01;
                        // var through = splashOpacity % 1.20;
                        // var topOrBottom = (parseInt(splashOpacity / 1.20,10)) % 2;
                        // if(topOrBottom == 1){
                        //     through = 1 - through;
                        // }
                        // return through;
                        return 1;
                    }
                });

                // App.Views.SplashLoading.hide = function(thisView){
                //     // if(App.Views.SplashLoading.CurrentPopover === thisView){
                //         App.Views.SplashLoading.hide();
                //     // }
                // };

                App.Functions.action = function(){

                    var durationOfOpacity = 2000;

                    if(App.Views.SplashLoading.Logo.useOpacity != 1){
                        App.Views.SplashLoading.Logo.useOpacity = 1;
                    } else {
                        App.Views.SplashLoading.Logo.useOpacity = 0.1;
                    }
                    App.Views.SplashLoading.Logo.StateMod.setOpacity(App.Views.SplashLoading.Logo.useOpacity,{
                        curve: 'linear',
                        duration: durationOfOpacity
                    });

                    Timer.setTimeout(function(){
                        if(App.Views.SplashLoading._showing != -1){
                            App.Functions.action();
                        }
                    },durationOfOpacity);
                    
                    // rotate it
                    // Timer.setTimeout(function(){
                        // App.Views.SplashLoading.Logo.StateMod.setTransform(Transform.rotateY(Math.PI),{
                        //     duration: 1000,
                        //     curve: 'linear',
                        // }, function(){
                        //     // App.Views.SplashLoading.Logo.StateMod.setTransform(0,{
                        //     //     duration: 1000,
                        //     //     curve: 'linear'
                        //     // });
                        // });
                    // },250);

                    // if(1==1){
                    //     Timer.setTimeout(function(){
                    //         App.Functions.action();
                    //     },3000);
                    // }

                }

                App.Views.SplashLoading.View.add(Utils.usePlane('splashLoading',1)).add(App.Views.SplashLoading.BgSurface);
                viewNode.add(Utils.usePlane('splashLoading',2)).add(App.Views.SplashLoading.Logo.StateMod).add(App.Views.SplashLoading.Logo.Mod).add(App.Views.SplashLoading.Logo);

                App.Views.SplashLoading.show(App.Views.SplashLoading.View);
                App.MainView.add(Utils.usePlane('splashLoading')).add(App.Views.SplashLoading);

            };
            createSplashLoading();


            // Main Popover (keeps PageView underneath)
            var createPopover = function(){
                // var that = this;
                App.Views.Popover = new Lightbox({
                    inTransition: false,
                    outTransition: false,
                });
                App.Views.Popover.hideIf = function(thisView){
                    if(App.Views.Popover.CurrentPopover === thisView || App.Views.Popover.CurrentPopover === false){
                        App.Views.Popover.hide();
                    }
                };
                App.MainView.add(Utils.usePlane('popover')).add(App.Views.Popover);

            };
            createPopover();


            // Add ToastController to mainContext
            // - it should be a ViewSequence or something that allows multiple 'toasts' to be displayed at once, with animations)
            // - todo
            var toastNode = new RenderNode();
            App.MainView.add(Utils.usePlane('toast')).add(toastNode);

            // Add FPS Surface to mainContext
            var fps = new View();
            fps.Surface = new Surface({
                content: 'fps',
                size: [12,12],
                classes: ['fps-counter-default']
            });
            fps.Mod = new StateModifier({
                opacity: 0,
                origin: [1,1]
            });
            Timer.setInterval(function(){
                var fpsNum = parseInt(Engine.getFPS(), 10);
                var thresh = App.Credentials.fps_threshold;
                if(fpsNum >= thresh){
                    fps.Mod.setOpacity(0);
                }
                if(fpsNum < thresh && App.Credentials.show_fps){
                    fps.Mod.setOpacity(1);
                }

                fps.Surface.setContent(fpsNum);
            },1000);
            fps.add(fps.Mod).add(fps.Surface);
            App.MainView.add(Utils.usePlane('fps')).add(fps);

            App.StartRouter = new App.Router.DefaultRouter();

            console.info('StartRouter');

            // Start history watching
            // - don't initiate based on the first view, always restart
            var initialUrl = false;
            if(1==1 && window.location.hash.toString() != ''){
                // Skip goto Home 
                initialUrl = true;
                Backbone.history.start();
            } else {
                Backbone.history.start({silent: true}); 
                App.history.navigate(''); // should go to a "loading" page while we figure out who is logged in
            }


            // Test login
            $.ajaxSetup({
                cache: false,
                contentType: 'application/json', // need to do JSON.stringify() every .data in an $.ajax!
                statusCode: {
                    401: function(){
                        // Redirect the to the login page.
                        // alert(401);
                        // window.location.replace('/#login');
                     
                    },
                    403: function() {
                        // alert(403);
                        // 403 -- Access denied
                        // window.location.replace('/#denied');
                        App.Data.User.clear();
                    },
                    404: function() {
                        // alert(404);
                        // 403 -- Access denied
                        // window.location.replace('/#denied');
                    },
                    500: function() {
                        // alert(500);
                        // 403 -- Access denied
                        // window.location.replace('/#denied');
                    }
                }
            });

    
            // Start Splashscreen
            Timer.setTimeout(function(){
                try {
                    App.Functions.action();

                    Timer.setTimeout(function(){
                        App.Views.SplashLoading.hide();
                    },3000);

                    if(App.Data.usePg){
                        navigator.splashscreen.hide();
                    }
                }catch(err){
                    alert('failed hiding splash screen');
                    alert(err);
                }
            },500);



            // Ajax setup for users
            var localUser = localStorage.getItem(App.Credentials.local_user_key);
            App.Data.User = new UserModel.User();
            try {

                // debugger;
                localUser = JSON.parse(localUser);
                
                // Set User model to our locally-stored values
                App.Data.User.set(localUser);
                console.log(App.Data.User);

                // Set up ajax credentials for later calls using this user
                App.Data.UserToken = localStorage.getItem(App.Credentials.local_token_key);
                $.ajaxSetup({
                    headers: {
                        'x-token' : App.Data.UserToken
                    }
                });
                
                // Redirect after setting ajax credentials
                if(localUser && !initialUrl){
                    // Navigate to my Profiles page
                    Timer.setTimeout(function(){
                        App.Views.MainFooter.Tabs.select('profiles');
                        // App.history.navigate('user/sentence');
                    }, 100);
                }

                // Preload models
                PreloadModels(App);

                // Fetch
                App.Data.User.fetch({
                    statusCode: {
                        403: function(){

                            // Logout
                            // - if not already at the login page
                            // - and if data is already clear
                            if(!localUser){
                                App.history.navigate('landing');
                                return;   
                            }

                            console.log(window.location.hash);
                            if(window.location.hash.indexOf('random') != -1){
                                App.history.navigate(App.Credentials.home_route);
                                return;
                            }

                            if(window.location.hash != '#login' && window.location.hash != '#logout'){
                                App.history.navigate('logout/force');
                            }

                        }
                    },
                    error: function(err){
                        console.error('failed login');
                        console.error(err);
                        // Utils.Notification.Toast('Failed login');
                        // App.history.navigate('logout/force');
                        // App.history.navigate('');
                    },
                    success: function(){
                        // Resolve deferred (in case anyone is listening)
                        // Store credentials

                        // Update localStorage
                        localStorage.setItem(App.Credentials.local_user_key, JSON.stringify(App.Data.User.toJSON()));

                    }
                });

            } catch(err){
                // Failed badly somewhere
                // - log the person out?
                console.log('Failed trying to test login');
                console.log(err);

                // Navigate to Logout
                App.history.navigate('logout/force');
                // return;

                // alert('Unable to log in');
                // debugger;

            }

        });
    });


});
