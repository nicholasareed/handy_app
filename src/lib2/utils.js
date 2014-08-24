define(function (require) {

    "use strict";

    var $ = require('jquery-adapter'),
        _ = require('underscore');

    var leaflet = require('lib2/leaflet/leaflet');
    // require('lib2/leaflet/leaflet.label');
    require('lib2/leaflet/leaflet.iconlabel');
    require('lib2/leaflet/tile.stamen');

    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');

    var Credentials = JSON.parse(require('text!credentials.json'));
    var Crypto = require('lib2/crypto');

    var Utils = {

        CheckFlag: function(flag){
            // returns promise
            // debugger;
            var def = $.Deferred()
            App.Data.User.populated().then(function(){
                if(App.Data.User.get('flags.' + flag)){
                    // def.resolve(true);
                    def.reject();
                    // def.resolve(true);
                } else {
                    // alert('rejected');
                    // console.log(App.Data.User.toJSON());
                    // console.log(App.Data.User.get('flags.' + flag));
                    // debugger;
                    // def.reject();
                    def.resolve(true);
                }
            });
            return def.promise();
        },
        PostFlag: function(flag, value){
            // value is always going to be true, we are tripping a flag
            var tmpData = {
                flags: {}
            };
            tmpData.flags[flag] = value;
            App.Data.User.set('flags.' + flag, value);
            return $.ajax({
                url: Credentials.server_root + 'user/flag',
                method: 'PATCH',
                data: tmpData,
                error: function(){
                    Utils.Notification.Toast('Failed Flag');
                    debugger;
                },
                success: function(){
                    // awesome
                }
            });
        },

        QuickModel: function(ModelName, id, model_file){
            if(model_file == undefined){
                model_file = ModelName.toLowerCase();
            }

            var defer = $.Deferred();

            require(['models/' + model_file], function(Model){

                if(!id || id.length < 1){
                    defer.reject();
                    return;
                }

                var newModel = new Model[ModelName]({
                    _id: id
                });
                if(newModel.hasFetched){
                    // Already fetched
                    defer.resolve(newModel);
                } else {
                    newModel.populated().then(function(){
                        defer.resolve(newModel);
                    });
                    if(App.Cache['QuickModel_' + ModelName + '_' + id] !== true){
                        // Need to initiate a fetch
                        // console.log(newModel.isFetching, newModel.hasFetched, newModel.toJSON());
                        App.Cache['QuickModel_' + ModelName + '_' + id] = true;
                        newModel.fetch({prefill: true});
                    }
                }
            });

            return defer.promise();

        },

        // QuickModel: {
        //     Player: function(id){

        //         var defer = $.Deferred();

        //         require(['models/player'], function(Model){

        //             if(!id || id.length < 1){
        //                 defer.reject();
        //                 return;
        //             }

        //             var newModel = new Model.Player({
        //                 _id: id
        //             });
        //             if(newModel.hasFetched){
        //                 // Already fetched?
        //                 // console.log(1);
        //                 defer.resolve(newModel);
        //             } else {
        //                 // console.log(2);
        //                 newModel.fetch({prefill: true});
        //                 newModel.populated().then(function(){
        //                     // console.log(newModel.toJSON());
        //                     defer.resolve(newModel);
        //                 });
        //             }
        //         });

        //         return defer.promise();
        //     },
        //     Sport: function(id){
        //         var defer = $.Deferred();

        //         require(['models/sport'], function(Model){

        //             if(!id || id.length < 1){
        //                 defer.reject();
        //                 return;
        //             }

        //             var newModel = new Model.Sport({
        //                 _id: id
        //             });

        //             if(newModel.hasFetched){
        //                 // Already fetched?
        //                 defer.resolve(newModel);
        //             } else {
        //                 newModel.fetch({prefill: true});
        //                 // console.log(newModel);
        //                 // debugger;
        //                 newModel.populated().done(function(){
        //                     // console.log('USING RESOLVED');
        //                     // console.dir(newModel.toJSON());
        //                     // debugger;
        //                     defer.resolve(newModel);
        //                 });
        //             }
        //         });

        //         return defer.promise();
        //     }
        // },

        Locale: {

            normalize: function(value){
                var tmpValue = value.toString().toLowerCase();
                var allowed_locales = {
                    'en' : ['undefined','en','en_us','en-us']
                };

                var normalized = false;
                _.each(allowed_locales, function(locales, locale_normalized){
                    if(locales.indexOf(tmpValue) !== -1){
                        normalized = locale_normalized;
                    }
                });

                return normalized;
            }

        },

        Popover: {
            Help: function(opts){
                // default options
                opts = _.defaults(opts, {
                    title: null,
                    body: null,
                    on_done: function(){
                        App.history.navigate('random2',{history: false});
                    }
                });
                App.Cache.HelpPopoverModal = opts;
                // navigate
                App.history.navigate('modal/helppopover', {history: false});
            },
            Buttons: function(opts){
                // default options
                opts = _.defaults(opts, {
                    title: null,
                    text: null,
                    buttons: []
                });

                // opts.on_cancel

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('modal/popoverbuttons', {history: false});
            },
            List: function(opts){

                // defaults
                opts = _.defaults(opts, {
                    list: [],
                    type: 'scroll'
                });

                // Options and details
                App.Cache.OptionModal = opts;


                // Change history (must)
                App.history.navigate('modal/list', {history: false});
            },
        },

        Contacts: {

            // // find all contacts with 'Bob' in any name field
            // var options      = new ContactFindOptions();
            // options.filter   = "Bob";
            // options.multiple = true;
            // options.desiredFields = [navigator.contacts.fieldType.id];
            // var fields       = [navigator.contacts.fieldType.displayName, navigator.contacts.fieldType.name];
            // navigator.contacts.find(fields, onSuccess, onError, options);

        },

        usePlane: function(plane_name, add){
            // return new StateModifier();

            add = add || 0;
            if(!App.Planes[plane_name]){
                // key doesn't exist, use 'content'
                plane_name = 'content';
            }
            console.log(App.Planes[plane_name] + add);
            console.log(0.001 + (App.Planes[plane_name] + add)/1000000);
            return new StateModifier({
                transform: Transform.translate(0,0, 0.001 + (App.Planes[plane_name] + add)/1000000)
            });

        },

        Intent: {
            HandleOpenUrl: function(url){
                // what type of a url are we looking at?

                console.log('url');
                console.log(url);

                var urlhost = 'ulu://',

                    n = url.indexOf(urlhost),
                    pathname = url.substring(n + urlhost.length),
                    splitPath = pathname.split('/');

                switch(splitPath[0]){
                    case 'i':
                        Utils.Notification.Toast('Accepting a Friend Invite!');

                        var code = splitPath[1];
                        Utils.Notification.Toast(code);

                        Utils.Popover.Buttons({
                            title: 'Accept Friend Invite?',
                            text: 'You have received one!',
                            buttons: [
                                {
                                    text: 'Nah.'
                                },
                                {
                                    text: 'Yes! We Friends',
                                    success: function(){

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
                                                    Utils.Notification.Toast('You have successfully added a friend!');

                                                    // Update list of players
                                                    App.Data.User.fetch();

                                                    // App.history.back();

                                                    return;
                                                }

                                            },
                                            error: function(err){
                                                alert('Failed with that code, please try again');
                                                return;
                                            }
                                        });
                                    }
                                }
                            ]
                        });

                        // Accept via ajax!
                        // - as long as logged in...


                        break;
                    default:
                        Utils.Notification.Toast('Unknown URL');
                        // console.log(parsed.pathname.split('/')[0]);
                        break;
                }

            }
        },

        Clipboard: {

            copyTo: function(string){

                try {
                    window.plugins.clipboard.copy(string);
                    Utils.Notification.Toast('Copied to Clipboard');
                }catch(err){
                    console.error('Failed1');
                    console.error(err);
                    Utils.Notification.Toast('Failed copying to clipboard');
                }

            }

        },

        Analytics: {
            init: function(){
                try {
                    App.Analytics = window.plugins.gaPlugin;
                    App.Analytics.init(function(){
                        // success
                        console.log('Success init gaPlugin');
                    }, function(){
                        // error
                        if(App.Data.usePg){
                            console.error('Failed init gaPlugin');
                            Utils.Notification.Toast('Failed init gaPlugin');
                        }
                    }, Credentials.GoogleAnalytics, 30);
                }catch(err){
                    if(App.Data.usePg){
                        console.error(err);
                    }
                    return false;
                }

                return true;

            },

            trackRoute: function(pageRoute){
                // needs to wait for Utils.Analytics.init()? (should be init'd)
                try{
                    App.Analytics.trackPage( function(){
                        // success
                        console.log('success');
                    }, function(){
                        // error
                        console.error('error');
                    }, 'nemesis.app/' + pageRoute);
                }catch(err){
                    if(App.Data.usePg){
                        console.error('Utils.Analytics.trackPage');
                        console.error(err);
                    }
                }
            }
        },

        takePicture: function(camera_type_short, opts, successCallback, errorCallback){
            // Take a picture using the camera or select one from the library
            var that = this;

            var options = { 
                quality : 80,
                destinationType : Camera.DestinationType.FILE_URI,
                sourceType : null, //Camera.PictureSourceType.CAMERA,
                allowEdit : true,
                encodingType: Camera.EncodingType.JPEG,
                targetWidth: 1000,
                targetHeight: 1000,
                popoverOptions: CameraPopoverOptions,
                saveToPhotoAlbum: false 
              };

            switch(camera_type_short){
                case 'gallery':
                    options.sourceType = Camera.PictureSourceType.PHOTOLIBRARY;
                    break;

                case 'camera':
                default:
                    // camera
                    options.sourceType = Camera.PictureSourceType.CAMERA;
                    break;
            }

            navigator.camera.getPicture(successCallback, errorCallback, options);
                // function (imageURI) {
                //     console.log(imageURI);
                //     that.uploadImage(imageURI);
                // },
                // function (message) {
                //     // We typically get here because the use canceled the photo operation. Fail silently.
                // }, options);

            return false;

        },

        parseUrl: function(url){
            var parser = document.createElement('a');

            // parser.href = "http://example.com:3000/pathname/?search=test#hash";
            parser.href = url;
             
            // parser.protocol; // => "http:"
            // parser.hostname; // => "example.com"
            // parser.port;     // => "3000"
            // parser.pathname; // => "/pathname/"
            // parser.search;   // => "?search=test"
            // parser.hash;     // => "#hash"
            // parser.host;     // => "example.com:3000"

            return parser;

        },

        htmlEncode: function(value){
          //create a in-memory div, set it's inner text(which jQuery automatically encodes)
          //then grab the encoded contents back out.  The div never exists on the page.
          return $('<div/>').text(value).html();
        },

        Notification: {
            Toast: function(msg, position){
                // attempting Toast message
                // - position is ignored
                var defer = $.Deferred();
                try {
                    window.plugins.toast.showShortBottom(msg, 
                        function(a){
                            defer.resolve(a);
                        },
                        function(b){
                            defer.reject(b);
                        }
                    );
                }catch(err){
                    console.log('TOAST failed');
                }
                return defer.promise();
            }
        },

        /**
        *
        *  Base64 encode / decode
        *  http://www.webtoolkit.info/
        *
        **/
        Base64: {
         
            // private property
            _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
         
            // public method for encoding
            encode : function (input) {
                var output = "";
                var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                var i = 0;

                input = this._utf8_encode(input);
         
                while (i < input.length) {
         
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);
         
                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;
         
                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    } else if (isNaN(chr3)) {
                        enc4 = 64;
                    }
         
                    output = output +
                    this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                    this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
         
                }
         
                return output;
            },
         
            // public method for decoding
            decode : function (input) {
                var output = "";
                var chr1, chr2, chr3;
                var enc1, enc2, enc3, enc4;
                var i = 0;
         
                input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
         
                while (i < input.length) {
         
                    enc1 = this._keyStr.indexOf(input.charAt(i++));
                    enc2 = this._keyStr.indexOf(input.charAt(i++));
                    enc3 = this._keyStr.indexOf(input.charAt(i++));
                    enc4 = this._keyStr.indexOf(input.charAt(i++));
         
                    chr1 = (enc1 << 2) | (enc2 >> 4);
                    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                    chr3 = ((enc3 & 3) << 6) | enc4;
         
                    output = output + String.fromCharCode(chr1);
         
                    if (enc3 != 64) {
                        output = output + String.fromCharCode(chr2);
                    }
                    if (enc4 != 64) {
                        output = output + String.fromCharCode(chr3);
                    }
         
                }
         
                output = this._utf8_decode(output);
         
                return output;
         
            },
         
            // private method for UTF-8 encoding
            _utf8_encode : function (string) {
                string = string.replace(/\r\n/g,"\n");
                var utftext = "";
         
                for (var n = 0; n < string.length; n++) {
         
                    var c = string.charCodeAt(n);
         
                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
         
                }
         
                return utftext;
            },
         
            // private method for UTF-8 decoding
            _utf8_decode : function (utftext) {
                var string = "";
                var i = 0;
                var c2 = 0,
                    c1 = c2,
                    c = c1;
                    
                while ( i < utftext.length ) {
         
                    c = utftext.charCodeAt(i);
         
                    if (c < 128) {
                        string += String.fromCharCode(c);
                        i++;
                    }
                    else if((c > 191) && (c < 224)) {
                        c2 = utftext.charCodeAt(i+1);
                        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                        i += 2;
                    }
                    else {
                        c2 = utftext.charCodeAt(i+1);
                        c3 = utftext.charCodeAt(i+2);
                        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                        i += 3;
                    }
         
                }
         
                return string;
            }
         
        },

        logout: function(){

            // Reset caches
            App.Cache = {}; //_.defaults({},App.DefaultCache);
            // console.log(App.Cache);
            App.Data = {
                User: null,
                Players: null // preloaded
            };
            localStorage.clear();
            
            // Unregister from Push
            console.info('Unregisering from PushNotification');
            try {
                window.plugins.pushNotification.unregister();
            }catch(err){
                console.error('Failed unregistering from PushNotification');
            }

            // Reset credentials
            $.ajaxSetup({
                headers: {
                    'x-token' : ''
                }
            });

            // // Try and exit on logout, because we cannot effectively clear views
            // try {
            //     navigator.app.exitApp();
            // } catch(err){
            // }

            // try {
            //     navigator.device.exitApp();
            // } catch(err){
            // }

            // Last effort, reload the page
            // - probably lose all native hooks
            // console.log(window.location.href);
            window.location = window.location.href.split('#')[0] + '#login';

            return true;
        },

        slugToCamel: function (slug) {
            var words = slug.split('_');

            for(var i = 0; i < words.length; i++) {
              var word = words[i];
              words[i] = word.charAt(0).toUpperCase() + word.slice(1);
            }

            return words.join(' ');
        },

        randomInt: function(min, max){
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        dataModelReplaceOnSurface : function(Surface){
            // Load driver name and image
            // console.log(context);
            if(typeof App.Cache != typeof {}){
                App.Cache = {};
            }

            var context = $('<div/>').html(Surface.getContent());

            App.Cache.ModelReplacers = App.Cache.ModelReplacers || {};

            context.find('[data-replace-model]').each(function(index){
                var elem = this;
                var model = $(elem).attr('data-replace-model'),
                    id = $(elem).attr('data-replace-id'),
                    field = $(elem).attr('data-replace-field'),
                    target = $(elem).attr('data-target-type'),
                    pre = $(elem).attr('data-replace-pre') || '',
                    cachestring = 'cached_display_v1_' + model + id + field;

                // Surface.setContent(context.html());

                // // See if cached this result already
                // // var tmp = localStorage.getItem(cachestring);
                // var tmp = App.Cache.ModelReplacers[cachestring];
                // if(tmp != undefined){
                //     // Element has been cached, or we're waiting for the response
                //     // - use a deferred
                //     tmp.then(function(result){
                //         // Deferred resolved
                //         try {
                //             var tmp2 = JSON.parse(result);
                //             // Determine target

                //             // Replace text
                //             if(!target || target.length < 1 || target == 'text'){
                //                 var new_text = tmp2.toString();
                //                 $(elem).text($.trim(new_text));

                //                 // Update Surface, setContent
                //                 Surface.setContent(context.html());
                //             }

                //             return;

                //         } catch(err){
                //             console.error(err);
                //         }
                //     });
                //     return;


                // } else {
                //     console.info('Replacement element not cached');
                // }

                // App.Data.Cache.ModelReplacers[cachestring] = $.Deferred();


                Utils.QuickModel(Utils.slugToCamel(model), id).then(function(Model){

                    var value = Model.get(field);

                    // Replace text
                    if(!target || target.length < 1 || target == 'text'){
                        var new_text = '';
                        try {
                            new_text = value.toString();
                        }catch(err){
                            new_text = '';
                            console.log(Model.toJSON());
                            console.log(value);
                            console.error('Failed value of DataModel',err);
                        }
                        $(elem).text(pre + $.trim(new_text));

                        // Update Surface, setContent
                        Surface.setContent(context.html());

                    }

                });

                // require(["app/models/" + model], function (models) {
                //     console.log('ModelReplace request');
                //     var modelName = new models[slugToCamel(model)]({_id: id});
                //     modelName.fetch({
                //         cache: true,
                //         success: function (dataModel) {

                //             var tmp = dataModel.toJSON();

                //             // Split field
                //             var fields = field.split('.');

                //             var current_data_val;
                //             for(field in fields){
                //                 tmp = tmp[fields[field]];
                //             }

                //             // Cache
                //             // App.Data['cached_display_v1_' + model + id + field] = tmp.toString();
                //             // localStorage.setItem(cachestring, JSON.stringify(tmp));
                //             App.Data.Cache.ModelReplacers[cachestring].resolve(JSON.stringify(tmp));

                //             // Determine target

                //             // Replace text
                //             if(!target || target.length < 1 || target == 'text'){
                //                 var new_text = tmp.toString();
                //                 $(elem).text($.trim(new_text));

                //                 // Update Surface, setContent
                //                 Surface.setContent(context.html());

                //             }

                //         }
                //     });
                // });

            });
            
            

        },

        dataModelReplace : function(context){
            // Load driver name and image
            // console.log(context);
            if(typeof App.Data.Cache != typeof {}){
                App.Data.Cache = {};
            }

            App.Data.Cache.ModelReplacers = App.Data.Cache.ModelReplacers || {};

            context.$('[data-replace-model]').each(function(index){
                var elem = this;
                var model = $(elem).attr('data-replace-model'),
                    id = $(elem).attr('data-replace-id'),
                    field = $(elem).attr('data-replace-field'),
                    target = $(elem).attr('data-target-type'),
                    cachestring = 'cached_display_v1_' + model + id + field;

                // See if cached this result already
                // var tmp = localStorage.getItem(cachestring);
                var tmp = App.Data.Cache.ModelReplacers[cachestring];
                if(tmp != undefined){
                    // Element has been cached, or we're waiting for the response
                    // - use a deferred
                    tmp.then(function(result){
                        // Deferred resolved
                        try {
                            var tmp2 = JSON.parse(result);
                            // Determine target

                            // Replace text
                            if(!target || target.length < 1 || target == 'text'){
                                var new_text = tmp2.toString();
                                $(elem).text($.trim(new_text));
                            }

                            return;

                        } catch(err){
                            console.error(err);
                        }
                    });
                    return;


                } else {
                    console.info('Replacement element not cached');
                }

                App.Data.Cache.ModelReplacers[cachestring] = $.Deferred();

                require(["app/models/" + model], function (models) {
                    console.log('ModelReplace request');
                    var modelName = new models[slugToCamel(model)]({_id: id});
                    modelName.fetch({
                        cache: true,
                        success: function (dataModel) {

                            var tmp = dataModel.toJSON();

                            // Split field
                            var fields = field.split('.');

                            var current_data_val;
                            for(field in fields){
                                tmp = tmp[fields[field]];
                            }

                            // Cache
                            // App.Data['cached_display_v1_' + model + id + field] = tmp.toString();
                            // localStorage.setItem(cachestring, JSON.stringify(tmp));
                            App.Data.Cache.ModelReplacers[cachestring].resolve(JSON.stringify(tmp));

                            // Determine target

                            // Replace text
                            if(!target || target.length < 1 || target == 'text'){
                                var new_text = tmp.toString();
                                $(elem).text($.trim(new_text));
                            }

                        }
                    });
                });
            });

        },



        updateGpsPosition: function(){

            try {
                navigator.geolocation.getCurrentPosition(function(position){
                    console.log('coords');
                    console.log(position.coords);
                    App.Events.emit('updated_user_current_location');
                    App.Cache.geolocation_coords = position.coords;

                }, function(err){
                    console.log('GPS failure');
                    console.log(err);
                });
            } catch(err){
                return false;
            }

            return true;

        },

        process_push_notification_message : function(payload){
            // Processing a single Push Notification
            // - not meant for handling a bunch in a row

            console.log(payload);

            if(typeof payload === typeof ""){
                payload = JSON.parse(payload);
            }

            console.log(payload);

            switch(payload.type){
                case 'new_friend':
                    Utils.Popover.Buttons({
                        title: 'New Friend!',
                        buttons: [
                            {
                                text: 'OK'
                            }
                        ]
                    });
                    
                    break;
                case 'friend_hangout_match':
                    Utils.Popover.Buttons({
                        title: 'A friend can hang',
                        buttons: [
                            {
                                text: 'OK'
                            }
                        ]
                    });
                    break;
                default:
                    alert('Unknown type');
                    alert(payload.type);
                    alert(JSON.stringify(payload));
                    return;
            }

        },


        haversine : function(lat1,lat2,lon1,lon2){

            // Run haversine formula
            var toRad = function(val) {
               return val * Math.PI / 180;
            };

            // var lat2 = homelat; 
            // var lon2 = homelon;
            // var lat1 = lat;
            // var lon1 = lon;

            var R = 3959; // km=6371. mi=3959

            //has a problem with the .toRad() method below.
            var x1 = lat2-lat1;
            var dLat = toRad(x1);
            var x2 = lon2-lon1;
            var dLon = toRad(x2);
            var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                            Math.sin(dLon/2) * Math.sin(dLon/2);  
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            var d = R * c; 

            return d;

        },

        toFixedOrNone: function(val, len){
            var tmp = parseFloat(val).toFixed(len).toString();
            if (parseInt(tmp, 10).toString() == tmp){
                return isNaN(tmp) ? '--' : parseInt(tmp, 10).toString();
            }
            return isNaN(tmp) ? '--' : tmp;
        },

        displayGameListDate: function(carvoyant_datetime, short_or_long){
            // return Today, Yesterday, or the actual date
            var date_string = '';
            var m;
            try {
                if(carvoyant_datetime.length == 20){
                    m = moment(carvoyant_datetime, "YYYYMMDD HHmmss Z"); // 20131106T230554+0000
                } else {
                    m = moment(carvoyant_datetime);
                }
            } catch(err){
                return "";
            }
            
            if(!m.isValid()){
                return "Unknown"
            }

            var now = moment().startOf('day');

            if(now.diff(m.startOf('day'), 'days') == 0){
                return "Today";
            }
            if(now.diff(m.startOf('day'), 'days') == 1){
                return "Yesterday";
            }

            if(short_or_long == "long"){
                return m.format("MMMM Do");
            } else {
                return m.format("MMM Do");
            }
        },

        displayGameListTime: function(carvoyant_datetime){
            // return "3:40pm" or similar
            var date_string = '';
            var m;
            try {
                if(carvoyant_datetime.length == 20){
                    m = moment(carvoyant_datetime, "YYYYMMDD HHmmss Z"); // 20131106T230554+0000
                } else {
                    m = moment(carvoyant_datetime);
                }
            } catch(err){
                return "";
            }
            
            if(!m.isValid()){
                return "Unknown"
            }
            var tmp_format = m.format("h:mma");
            // console.log(tmp_format);
            // console.log(tmp_format.substr(0,tmp_format.length - 1));
            return tmp_format.substr(0,tmp_format.length - 1); // like remove the "m" in "am" or "pm"
        },

        isElementInViewport: function(el) {
            var rect = el.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
            );
        }


    };

    return Utils;


});