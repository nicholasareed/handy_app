define(function(require, exports, module) {
    'use strict';

    var Timer = require('famous/utilities/Timer');

    var $ = require('jquery');
    var Utils = require('utils');
    var Credentials = JSON.parse(require('text!credentials.json'));

    var readyDeferred = $.Deferred();

    module.exports = {

        readyDeferred: readyDeferred,
        ready: readyDeferred.promise(),
        init: function(){
            var that = this;

            // phonegap/cordova usage
            App.Data.usePg = false;
            if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/) && cordova) {
                console.log('Using PhoneGap/Cordova!');
                App.Data.usePg = true;
            }

            // runGpsUpdate();
            // var gpsMinutes = 5;
            // window.setInterval(runGpsUpdate, gpsMinutes * 60 * 1000);

            // Trigger .onReady

            // Browser (development)
            if(!App.Data.usePg){
                console.log('Using Browser');
                console.log(that);
                that.onReady();
            }

            // Listen for intent gathering
            // - expecting you to be logged in?
            // - add after-login redirection? 
            App.Events.on('after-login', function(){
                // hit up the after-login intent! 
                // - todo    
            });
            App.Events.on('handle-open-url', function(url){
                Utils.Intent.HandleOpenUrl(url);
            });

            // See if device is already ready

            // (function checkCordova() {
            //     // Check if Cordova exists
            //     if (window.cordova) {
            //         // Listen for the deviceready event
            //         // - already ready?
            //         that.onReady();
            //         document.addEventListener('deviceready', function(){
            //             alert('deviceready');
            //         }, false);
            //         Utils.Notification.Toast('Test Toast');
            //     } else {
            //         // If Cordova does not exist, check again in 1/60th second
            //         setTimeout(checkCordova, 16);
            //         // console.log('what');
            //     }
            // }());

            if(GLOBAL_onReady === true){
                // alert('is already onReady');
                setTimeout(function(){
                    that.onReady();
                },100);
            } else {
                document.addEventListener("deviceready", function(){
                    // alert('deviceready ready 324');
                    that.onReady();
                }, false);
            }

        },

        onReady: function(){
            
            if(this.isReady === true){
                return;
            }
            this.isReady = true;

            // Overwrite console.log and console.info

            // console.log('overwrite log');
            // console.log = (function(){
            //     var originalLog = console.log;
            //     var newLog = function(){
            //         if(1==1){
            //             return;
            //         }
            //         originalLog.apply(this, arguments);
            //     }
            //     return newLog;
            // })();

            // console.info('overwrite info');
            // console.info = (function(){
            //     var originalLog = console.info;
            //     var newLog = function(){
            //         if(1==1){
            //             return;
            //         }
            //         originalLog.apply(this, arguments);
            //     }
            //     return newLog;
            // })();


            // // FastClick attachment to document.body
            // console.log(document.body);
            // attachFastClick.attach(document.body);

            // Android or iOS stylesheet?
            App.Config.devicePlatform = 'android';
            try {
                App.Config.devicePlatform = device.platform.toLowerCase();
            }catch(err){}
            $('head').append('<link rel="stylesheet" href="css/'+ App.Config.devicePlatform +'.css" type="text/css" />');

            // Status bar colors
            try {

                if(App.Config.devicePlatform == 'ios'){

                    // App.MainView has NOT been created yet
                    App.StatusBar = true;

                    StatusBar.overlaysWebView(true);
                    StatusBar.backgroundColorByHexString(App.ConfigImportant.StatusBarBackgroundColor);
                    // Utils.Notification.Toast('OK status bar');
                }
            }catch(err){
                console.log(err);
                Utils.Notification.Toast('Failed status bar');
            }

            // Resolve deferred
            this.readyDeferred.resolve();

            // Stripe
            Stripe.setPublishableKey(Credentials['stripe_publishable_key_' + Credentials.stripe_mode]);

            // Track.js
            // - only using in production
            if(App.Data.usePg && App.Prod){

                // lazy-load track.js
                var script = document.createElement( 'script' );
                script.type = 'text/javascript';
                script.src = 'src/lib2/track.js';
                // $(script).attr('data-token', Credentials.trackjs_token);

                // trackjs options
                window._trackJs = Credentials.trackjs_opts;
                window._trackJs.version = App.ConfigImportant.Version;
                $("body").append( script );

                // // Need to init it first
                // console.error();

                // //override the error function (the immediate call function pattern is used for data hiding)
                // console.error = (function () {
                //   //save a reference to the original error function.
                //   var originalConsole = console.error;
                //   //this is the function that will be used instead of the error function
                //   function myError (stackTrace) {
                //     // alert( 'Error is called. ' );
                //     try {
                //         trackJs.track(stackTrace);
                //     }catch(err){
                //         console.log('trackJs.track non-existant for now');
                //     }

                //     //the arguments array contains the arguments that was used when console.error() was called
                //     originalConsole.apply( this, arguments );
                //   }
                //   //return the function which will be assigned to console.error
                //   return myError;
                // })();

                // // Overwrite window.onerror
                // window.onerror = function (errorMsg, url, lineNumber) {
                //     // lineNumber doesn't mean anything, it is relative to the function that was called! (not the page)
                //     console.error(errorMsg, url, lineNumber);
                // }

                
                // // Testing in production
                // window.setTimeout(function(){
                //     // Throw a failure
                //     throw WeAreInProduction
                // },3000);

            }


            // try {
            //  window.plugin.notification.local.add({ id: 1, title: "Waiting Title", message: 'Great app!' });
            // }catch(err){
            //  alert('noti error');
            //  console.log(err);
            // }

            // Push notifications
            if(App.Credentials.push_notifications === true){
                this.initPush();
            }


            // Keyboard
            // - requires ionic keyboard plugin
            try {
                // disable keyboard scrolling
                cordova.plugins.Keyboard.disableScroll(true);
            }catch(err){
                console.error(err, 'no Keyboard');
            }
            // add listeners for keyboard show/hide
            window.addEventListener('native.keyboardshow', function(e){
                // Utils.Notification.Toast('Keyboard Show');

                var keyboardHeight = e.keyboardHeight;

                // Has the body changed in height?
                // if yes, set that as the keyboardHeight
                if(App.defaultSize[1] != window.innerHeight){
                    keyboardHeight = App.defaultSize[1] - window.innerHeight;
                } else {
                    // if no, use the supplied keyboardHeight
                    switch(App.Config.devicePlatform){
                        case 'android':
                            keyboardHeight -= 40;
                            break;
                        case 'ios':
                            break;
                        default:
                            break;
                    }
                }

                App.mainSize = [App.defaultSize[0],App.defaultSize[1] - keyboardHeight];
                App.MainContext.emit('resize');

                App.KeyboardShowing = true;
                App.Events.emit('KeyboardShowHide', true);

                App.Events.emit('resize');

                // App.mainSize = App.MainContext.getSize();
                // if (App.MainController)
                //     App.MainController.setOptions({size: [App.mainSize[0], App.mainSize[1]]});

            });
            window.addEventListener('native.keyboardhide', function(e){
                // Utils.Notification.Toast('Keyboard HIDE');
                
                App.mainSize = [App.defaultSize[0],App.defaultSize[1]];
                App.MainContext.emit('resize');

                // Update the page (tell 'em)
                App.KeyboardShowing = false;
                App.Events.emit('KeyboardShowHide', false);

                App.Events.emit('resize');
                
                // App.mainSize = App.MainContext.getSize();
                // if (App.MainController)
                //     App.MainController.setOptions({size: [App.mainSize[0], App.mainSize[1]]});

            });

            // Pausing (exiting)
            document.addEventListener("pause", function(){
                // Mark as Paused
                // - this prevents Push Notifications from activating all at once when Resuming

                App.Data.paused = true;
                App.Data.was_paused = true;
                
                App.Events.trigger('pause');

            }, false);

            // Back button capturing in Browser
            if(!App.Data.usePg){
                $(document).keydown(function (e) {
                    var preventKeyPress;
                    if (e.keyCode == 8) {
                        var d = e.srcElement || e.target;
                        switch (d.tagName.toUpperCase()) {
                            case 'TEXTAREA':
                                preventKeyPress = d.readOnly || d.disabled;
                                break;
                            case 'INPUT':
                                preventKeyPress = d.readOnly || d.disabled ||
                                    (d.attributes["type"] && $.inArray(d.attributes["type"].value.toLowerCase(), ["radio", "checkbox", "submit", "button"]) >= 0);
                                break;
                            case 'DIV':
                                preventKeyPress = d.readOnly || d.disabled || !(d.attributes["contentEditable"] && d.attributes["contentEditable"].value == "true");
                                break;
                            default:
                                preventKeyPress = true;
                                break;
                        }
                    }
                    else
                        preventKeyPress = false;

                    if (preventKeyPress){
                        e.preventDefault();
                        App.Events.emit('backbutton');
                    }
                });
            }

            // Resume
            // - coming back to application
            document.addEventListener("resume", function(resume_data){
                // Gather existing Push Notifications and see if we should summarize them, or show individually (confirm, etc.)
                    
                App.Events.trigger('resume');
                console.log('resuming');
                console.log(resume_data);

                console.log(JSON.stringify(resume_data));

                App.Data.paused = false;
                App.Data.was_paused = true;

                // Run 1 second after returning
                // - collecting all the Push Notifications into a queue
                // - enough time for all Push events to be realized
                setTimeout(function(){

                    App.Data.paused = false;
                    App.Data.was_paused = false;

                    // // Get queue
                    // // - more than 1 item in queue?
                    // // - different types of items?
                    // switch (App.Data.notifications_queue.length){
                    //     case 0:
                    //         // No messages
                    //         break;
                    //     case 1:
                    //         // Only a single message, use normal
                    //         Utils.process_push_notification_message(App.Data.notifications_queue.pop());
                    //         break;
                    //     default:
                    //         // Multiple notifications
                    //         // - get last added
                    //         // alert(App.Data.notifications_queue.length + ' Push Notifications Received. Latest Processed');
                    //         Utils.process_push_notification_message(App.Data.notifications_queue.pop());
                    //         App.Data.notifications_queue = [];
                    //         break;
                    // }
                    // var queue = App.Data.notifications_queue.concat([]);

                    // - assuming 1 type of Push Notification only at this time

                },1000);

            }, false);


            // Init MENU button on Android (not always there?)
            document.addEventListener("menubutton", function(){
                // - only launches the settings if we're on the main view
                App.history.navigate('settings');
            }, false);

            // Init BACK button on Android
            // - disable default first
            document.addEventListener("backbutton", function(killa){
                App.Events.emit('backbutton');
                killa.stopPropagation();
                killa.preventDefault();
                return false;
            }, true);

            // // Online/Offline state

            // //Create the View
            // // - render too
            // App.Data.GlobalViews.OnlineStatus = new App.Views.OnlineStatus();
            // App.Data.GlobalViews.OnlineStatus.render();

            // // Online
            // // - remove "not online"
            // document.addEventListener("online", function(){
            //  // Am now online
            //  // - emit an event?
            //  App.Data.GlobalViews.OnlineStatus.trigger('online');

            // }, false);
            // document.addEventListener("offline", function(){
            //  // Am now online
            //  // - emit an event?
            //  App.Data.GlobalViews.OnlineStatus.trigger('offline');

            // }, false);
            



            
        },

        initPush: function(){
            console.info('Registering for PushNotification');

            // Disable Push in debug mode
            if(App.Prod != true){
                console.error('Development mode');
                return;
            }
            try { 
                App.Data.pushNotification = window.plugins.pushNotification;
                if (device.platform.toLowerCase() == 'android') {
                    // alert('android push');

                    App.Data.pushNotification.register(function(result){

                        Utils.Notification.Toast('Registered for Push Notifications');
                        console.log('Push Setup OK');
                        // alert('Push Setup OK');
                        // alert('success w/ Push Notifications');
                        // alert('Push setup ok');
                        // App.Utils.Notification.debug.temporary('Push Setup OK'); // not actually ok, not registering, nothing sending to it

                    }, function(err){
                        window.setTimeout(function(){
                            Utils.Notification.Alert('failed Push Notifications');
                        },2000);
                        // App.Utils.Notification.debug.temporary('Failed Push Notification Setup');
                        console.error(err);
                        // alert(err);
                    }, 
                    {
                        "senderID": App.Credentials.push_notification_sender_id, //"312360250527",
                        "ecb": "onNotificationGCM"
                    });
                } else if (device.platform.toLowerCase() == 'ios') {
                    // // alert('not');
                    App.Data.pushNotification.register(function(token){
                        console.log('ios token');
                        console.log(token);

                        // Write the key
                        // - see if the user is logged in
                        var i = 0;
                        var pushRegInterval = function(){
                            window.setTimeout(function(){
                                // See if logged in
                                if(App.Data.User.get('_id')){
                                    App.Data.User.set({ios: [{reg_id: token, last: new Date()}]});
                                    App.Data.User.save(); // update the user
                                } else {
                                    // Try running again
                                    // App.Utils.Notification.debug.temp('NLI - try again' + i);
                                    console.log('Not logged in - try android registration update again');
                                    console.log(App.Data.User.get('_id'));
                                    i++;
                                    pushRegInterval();
                                }
                            },3000);
                        };
                        pushRegInterval();


                    },function(err){
                        console.log('Failed ios Push notifications');
                        console.log(err);
                    },   {"badge":"true","sound":"true","alert":"true","ecb":"onNotificationAPN"});
                }
            }
            catch(err) { 
                // txt="There was an error on this page.\n\n"; 
                // txt+="Error description: " + err.message + "\n\n"; 
                // alert(txt); 
                // alert('Push Error2');
                if(App.Data.usePg){
                    console.error('Push Error 2');
                }
                
                // console.log(err);
                // App.Utils.Notification.debug.temporary('Push Error');
            }
        },


        // GPS updates
        runGpsUpdate: function(){
            // We only want one running at a time
            if(App.Cache.running_gps_update === true){
                return;
            }

            App.Cache.running_gps_update = true;

            var runGpsUpdateFunc = function(){
                navigator.geolocation.getCurrentPosition(function(position){
                    console.log('coords');
                    console.log(position.coords);
                    App.Events.emit('updated_user_current_location');
                    App.Cache.geolocation_coords = position.coords;
                    // alert(position.coords);
                    // alert(position.coords.latitude);
                    // $.ajax({
                    //     url: Credentials.server_root + 'user_coords',
                    //     cache: false,
                    //     method: 'POST',
                    //     success: function(){
                    //         console.log('Made call OK');
                    //     }
                    // });

                }, function(err){
                    console.log('GPS failure');
                    console.log(err);
                });

                window.setTimeout(runGpsUpdateFunc, 1000 * 60 * 5); // 5 minutes
            };

            runGpsUpdateFunc(); // uncomment for coordinate uploads

        },

        // return {
        //     onReady: onReady,
        //     init: initPush,
        //     runGpsUpdate: runGpsUpdate
        // };

    }


});

// iOS (Apple Push Notifications - APN)
function onNotificationAPN(e) {

    require(['utils'], function(Utils){

        Utils.process_push_notification_message(e.payload);
        return;

        // Utils.PushNotification.HandlePush();

        // Utils.Notification.Toast('New APN');

        // // alert(2);
        // // try {
        // //     alert(event);
        // // }catch(err){};

        // // alert(3);
        // // try {
        // //     alert(event.event);
        // // }catch(err){};

        // alert(4);
        // try {
        //     alert(JSON.stringify(Object.keys(event)));
        // }catch(err){};

        // Object.keys(event).forEach(function(key){
        //     alert(event[key]);
        // });


        // var pushNotification = window.plugins.pushNotification;
        // console.log("Received a notification! " + event.alert);
        // console.log("event sound " + event.sound);
        // console.log("event badge " + event.badge);
        // console.log("event " + event);

        // if (event.alert) {
        //     navigator.notification.alert(event.alert);
        // }
        // if (event.badge) {
        //     console.log("Set badge on  " + pushNotification);
        //     pushNotification.setApplicationIconBadgeNumber(function(){
        //         console.log('succeeded at something in pushNotification for iOS');
        //     }, event.badge);
        // }
        // if (event.sound) {
        //     var snd = new Media(event.sound);
        //     snd.play();
        // }

    });
};

// GCM = Google Cloud Messag[something] for Android
function onNotificationGCM(e){
    // Received a notification from GCM
    // - multiple types of notifications

    // App.Utils.Notification.debug.temp('New Notification: ' + e.event);
    // alert('onNotificationGCM');
    console.log('onNotificationGCM');

    require(['utils'], function(Utils){

        switch( e.event ){
            case 'registered':
                // Registered with GCM
                if ( e.regid.length > 0 ) {
                    // Your GCM push server needs to know the regID before it can push to this device
                    // here is where you might want to send it the regID for later use.
                    // alert('registration id: ' + e.regid);
                    // App.Utils.Notification.debug.temp('Reg ID:' + e.regid.substr(0,25) + '...');
                    console.log('Android registration ID for device');
                    console.log(e.regid);

                    // // Got the registration ID
                    // // - we're assuming this happens before we've done alot of other stuff
                    // App.Credentials.android_reg_id = e.regid;

                    // Write the key
                    // - see if the user is logged in
                    var i = 0;
                    var pushRegInterval = function(){
                        window.setTimeout(function(){
                            // See if logged in
                            if(App.Data.User.get('_id')){
                                // Sweet, logged in, update user's android_reg_id
                                // alert('saving user!'); // ...
                                // alert(App.Data.User.get('_id'));
                                // alert(e.regid);
                                App.Data.User.set({android: [{reg_id: e.regid, last: new Date()}]});
                                App.Data.User.save(); // update the user
                                // App.Plugins.Minimail.updateAndroidPushRegId(App.Credentials.android_reg_id);

                            } else {
                                // Try running again
                                // App.Utils.Notification.debug.temp('NLI - try again' + i);
                                console.log('Not logged in - try android registration update again');
                                console.log(App.Data.User.get('_id'));
                                i++;
                                pushRegInterval();
                            }
                        },3000);
                    };
                    pushRegInterval();

                }
            break;

            case 'message':
                // if this flag is set, this notification happened while we were in the foreground.
                // you might want to play a sound to get the user's attention, throw up a dialog, etc.

                // alert('message received');
                // alert(JSON.stringify(e.payload));

                // Capture and then wait for a half-second to see if any other messages are incoming
                // - don't want to overload the person

                Utils.process_push_notification_message(e.payload.payload);

                return;


                // alert('Message!');
                console.log(e);
                console.log(JSON.stringify(e));
                console.log(e.payload.payload);

                if (e.foreground || 1==1){
                    // // We were in the foreground when it was incoming
                    // // - process right away
                    // console.log('In FOREground');

                    // // alert('Alert Triggered');

                    // var payload = e.payload.payload;
                    // var alert_trigger_id = payload.alert_trigger_id;

                    // // Go to alert_trigger
                    // App.history.navigate('alert_trigger/' + alert_trigger_id);

                    // require(["utils"], function (Utils) {
                    //     // Utils.process_push_notification_message(e);
                    // });

                // } else {
                    // Not in the foreground
                    // - they clicked the notification
                    // - process all of them at once
                    // alert('in background');

                    window.setTimeout(function(){

                    }, 1000);

                    // console.log('In BACKground!');
                    // if (e.coldstart){
                    //     // App wasn't previously running, so it is starting up
                    //     console.log('In COLDstart');
                    // } else {
                    //     // App is probably already displaying some other page
                    // }

                    // // add to process queue
                    // // - the last/latest one gets analyzed
                    // console.log('ADDING TO PUSH QUEUE');
                    // // App.Data.notifications_queue.push(e);

                }

            break;

            case 'error':
                alert('GCM error');
                alert(e.msg);
            break;

            default:
                alert('An unknown GCM event has occurred');
            break;
        }
    });

};
