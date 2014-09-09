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

        async : '../src/requirejs-plugins/src/async',

        underscore: '../src/lib2/underscore',
        jquery: '../src/lib2/jquery',
        backbone: '../src/lib2/backbone',
        moment: '../src/lib2/moment',
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
        Flags: {},
        MainContext: null,
        MainController: null,
        Events: new EventHandler(),
        Credentials: JSON.parse(require('text!credentials.json')),
        Config: null, // parsed in a few lines, symlinked to src/config.xml
        ConfigImportant: {},
        BackboneModels: _.extend({}, Backbone.Events),
        Router: null,
        Views: {
            MainFooter: null
        },
        Analytics: null,
        DefaultCache: tmpDefaultCache,
        Cache: _.defaults({},tmpDefaultCache),
        Data: {
            User: null,
            Players: null // preloaded
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
            fps: 10, // frames-per-second counter
            content: 100,
            contentTabs: 400,
            header: 500,
            mainfooter: 500,
            popover: 1000
        }
    };

    // Update body stylesheet
    // - remove loading background
    document.body.setAttribute('style',"");

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

            // Hammer device events, like doubletap
            Hammer($('body').get(0), {
                // swipe_velocity : 0.2
            });

            // create the main context
            App.MainContext = Engine.createContext();
            App.MainContext.setPerspective(1000);

            // Add main background image (pattern)
            App.MainBackground = new Surface({
                size: [undefined, undefined],
                classes: ['overall-background']
            });
            App.MainContext.add(Utils.usePlane('background')).add(App.MainBackground); 

            // Create main Lightbox
            App.MainController = new Lightbox();
            App.MainController.SizeMod = new StateModifier({
                size: [undefined, undefined]
            });
            App.MainController.resetOptions = function(){
                this.setOptions(Lightbox.DEFAULT_OPTIONS);
            };

            App.defaultSize = [window.innerWidth, window.innerHeight];
            App.mainSize = [window.innerWidth, window.innerHeight];
            Engine.nextTick(function() {
                console.log('After tick=' + App.MainContext.getSize());
                App.mainSize = App.MainContext.getSize();
            });

            App.MainContext.on('resize', function(e) {
                App.MainController.SizeMod.setSize(App.mainSize);
            }.bind(this));

            // // Add Background
            // var MainBackgroundSurface = new Surface({
            //     size: [undefined, undefined],
            //     properties: {
            //         backgroundColor: "black"
            //     }
            // });
            // App.MainContext.add(MainBackgroundSurface);

            // Add GenericToast
            // - attaches to MainContext at the Root at is an overlay for Toast notifications (more fun animation options than Native Toast)
            // - todo...

            // Add GenericOnlineStatus
            // - we want to effectively communicate to the user when we have lost or are experiencing a degraded internet connection
            // - todo...

            // Add Lightbox/RenderController to mainContext
            App.MainContext.add(Utils.usePlane('content')).add(App.MainController.SizeMod).add(App.MainController);

            var colors = new Array(
              [62,35,255],
              [60,255,60],
              [255,35,98],
              [45,175,230],
              [255,0,255],
              [255,128,0]);

            var step = 0;
            //color table indices for: 
            // current color left
            // next color left
            // current color right
            // next color right
            var colorIndices = [0,1,2,3];

            //transition speed
            var gradientSpeed = 0.008; //0.002;

            var updateBackgroundSurface = function(){
                Timer.setTimeout(function(){

                    var c0_0 = colors[colorIndices[0]];
                    var c0_1 = colors[colorIndices[1]];
                    var c1_0 = colors[colorIndices[2]];
                    var c1_1 = colors[colorIndices[3]];

                    var istep = 1 - step;
                    var r1 = Math.round(istep * c0_0[0] + step * c0_1[0]);
                    var g1 = Math.round(istep * c0_0[1] + step * c0_1[1]);
                    var b1 = Math.round(istep * c0_0[2] + step * c0_1[2]);
                    var color1 = "#"+((r1 << 16) | (g1 << 8) | b1).toString(16);

                    var r2 = Math.round(istep * c1_0[0] + step * c1_1[0]);
                    var g2 = Math.round(istep * c1_0[1] + step * c1_1[1]);
                    var b2 = Math.round(istep * c1_0[2] + step * c1_1[2]);
                    var color2 = "#"+((r2 << 16) | (g2 << 8) | b2).toString(16);

                    App.MainBackground.setProperties({
                        background: "-webkit-gradient(linear, left top, right top, from("+color1+"), to("+color2+"))"
                    });

                    step += gradientSpeed;
                    if ( step >= 1 ){
                        step %= 1;
                        colorIndices[0] = colorIndices[1];
                        colorIndices[2] = colorIndices[3];

                        //pick two new target color indices
                        //do not pick the same as the current one
                        colorIndices[1] = ( colorIndices[1] + Math.floor( 1 + Math.random() * (colors.length - 1))) % colors.length;
                        colorIndices[3] = ( colorIndices[3] + Math.floor( 1 + Math.random() * (colors.length - 1))) % colors.length;

                    }

                    updateBackgroundSurface();

                },10);
            }
            // updateBackgroundSurface(); // uncomment to have an animated background

            // Main Footer
            var createMainFooter = function(){
                // var that = this;
                App.Views.MainFooter = new View();

                // create the footer
                App.Views.MainFooter.Tabs = new StandardTabBar();  
                var tmpTabs = App.Views.MainFooter.Tabs;

                tmpTabs.defineSection('todos', { // updates
                    content: '<i class="icon ion-android-lightbulb"></i><div><span class="ellipsis-all">Todo</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });
                tmpTabs.defineSection('updates', {
                    content: '<i class="icon ion-android-sort"></i><div><span class="ellipsis-all">Updates</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });
                tmpTabs.defineSection('messages', {
                    content: '<i class="icon ion-android-inbox"></i><div><span class="ellipsis-all">Msgs</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });
                tmpTabs.defineSection('profiles', {
                    content: '<i class="icon ion-person"></i><div><span class="ellipsis-all">Profile</span></div>',
                    onClasses: ['footer-tabbar-default', 'on'],
                    offClasses: ['footer-tabbar-default', 'off']
                });


                tmpTabs.on('select', function(result, eventTriggered){
                    console.error(eventTriggered);
                    console.error(result);
                    switch(result.id){
                        
                        case 'todos':
                            App.history.navigate('todo/list');
                            break;

                        case 'profiles':
                            App.history.navigate('dash');
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

                App.Views.MainFooter.add(App.Views.MainFooter.originMod).add(App.Views.MainFooter.positionMod).add(App.Views.MainFooter.sizeMod).add(App.Views.MainFooter.Tabs);

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
                App.MainContext.add(Utils.usePlane('mainfooter')).add(App.Views.MainFooter);

            };
            createMainFooter();


            // Main Popover (keeps PageView underneath)
            var createPopover = function(){
                // var that = this;
                App.Views.Popover = new Lightbox({
                    inTransition: false,
                    outTransition: false,
                });
                // var po = App.Views.Popover;
                App.Views.Popover.frontMod = new StateModifier({
                    transform: Transform.inFront
                });
                App.MainContext.add(Utils.usePlane('popover')).add(App.Views.Popover);

            };
            createPopover();


            // Add ToastController to mainContext
            // - it should be a ViewSequence or something that allows multiple 'toasts' to be displayed at once, with animations)
            // - todo
            var toastNode = new RenderNode();
            App.MainContext.add(toastNode);

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
            App.MainContext.add(Utils.usePlane('fps')).add(fps);

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
                    window.setTimeout(function(){
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

                            // Unregister from Push Notifications
                            App.DeviceReady.ready.then(function(){
                                console.info('Unregisering from PushNotification');
                                try {
                                    window.plugins.pushNotification.unregister();
                                }catch(err){
                                    console.error('Failed unregistering from PushNotification');
                                }
                            });

                            // Logout
                            // - if not already at the login page
                            // - and if data is already clear
                            if(!localUser){
                                App.history.navigate('landing');
                                return;   
                            }

                            console.log(window.location.hash);
                            if(window.location.hash.indexOf('random') != -1){
                                App.history.navigate('dash');
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
                        App.history.navigate('logout/force');
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
