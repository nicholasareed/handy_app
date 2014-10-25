define(function (require) {

    "use strict";

    var $ = require('jquery-adapter'),
        _ = require('underscore');

    var Modifier = require('famous/core/Modifier');
    var ImageSurface = require('famous/surfaces/ImageSurface');

    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');

    var Credentials = JSON.parse(require('text!credentials.json'));
    var Crypto = require('lib2/crypto');

    var Help = require('help');
    // var thisHelp = new Help();

    var tinycolor = require('lib2/tinycolor');

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
                        // App.history.navigate('random2',{history: false});
                    }
                });
                App.Cache.HelpPopoverModal = opts;
                // navigate
                App.history.navigate('popover/help', {history: false});
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
                App.history.navigate('popover/buttons', {history: false});
            },
            Alert: function(text, button){
                // default options

                var def = $.Deferred();

                button = button || 'OK';

                // default options
                var opts = {
                    text: text,
                    button: button
                };

                opts.on_done = function(){
                    def.resolve(true);
                };
                opts.on_cancel = function(){
                    def.resolve(false);
                };

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('popover/alert', {history: false});

                return def.promise();
            },
            Confirm: function(text, buttonYes, buttonNo){
                // default options

                var def = $.Deferred();

                buttonYes = buttonYes || 'Yes';
                buttonNo = buttonNo || 'No';

                // default options
                var opts = {
                    text: text,
                    buttonYes: buttonYes,
                    buttonNo: buttonNo
                };

                opts.on_done = function(){
                    def.resolve(true);
                };
                opts.on_cancel = function(){
                    def.resolve(false);
                };

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('popover/confirm', {history: false});

                return def.promise();
            },
            Prompt: function(text, defaultValue, button, buttonCancel, type){ // use callback pattern instead?

                var def = $.Deferred();

                defaultValue = defaultValue || '';
                button = button || 'OK';
                buttonCancel = buttonCancel || 'X';
                type = type || 'text';

                // default options
                var opts = {
                    text: text,
                    defaultValue: defaultValue,
                    button: button,
                    buttonCancel: buttonCancel,
                    type: type
                };

                opts.on_done = function(value){
                    def.resolve(value);
                };
                opts.on_cancel = function(){
                    def.resolve(false);
                };

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('popover/prompt', {history: false});

                return def.promise();
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
                App.history.navigate('popover/list', {history: false});
            },
            ColorPicker: function(opts){

                // defaults
                opts = _.defaults(opts, {
                    color: '#000'
                });

                // Options and details
                App.Cache.ColorPickerOptions = opts;


                // Change history (must)
                App.history.navigate('popover/colorpicker', {history: false});
            },
        },

        Help: function(key){
            Help.launch(key);
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

        Z: function(amount){
            // "nudge" the z-plane a bit
            console.log(amount / 1000000.0);
            return new StateModifier({transform: Transform.translate(0,0,amount / 1000000.0)})
        },

        usePlane: function(plane_name, add, returnValue){
            // return new StateModifier();

            add = add || 0;
            if(!App.Planes[plane_name]){
                // key doesn't exist, use 'content'
                plane_name = 'content';
            }
            // console.log(App.Planes[plane_name] + add);
            // console.log(0.001 + (App.Planes[plane_name] + add)/1000000);
            var value = 0.001 + (App.Planes[plane_name] + add)/1000000;
            if(returnValue){
                return value;
            }
            return new StateModifier({
                transform: Transform.translate(0,0, value)
            });

        },

        bindSize: function(emitter, tmpView, tmpSurface){
            var oldSize = null;
            tmpView.getSize = function(){
                // console.log(tmpSurface._size);
                // this._size = [undefined, tmpSurface._size ? tmpSurface._size[1] : 120];
                this._size = [undefined, tmpSurface._size ? tmpSurface._size[1] : undefined];
                if(oldSize != tmpSurface._size){
                    console.info('new size');
                    console.log(tmpSurface._size, tmpSurface._size ? tmpSurface._size[1] : undefined);
                    emitter.trigger('newsize');
                }
                oldSize = tmpSurface._size;
                return [undefined, tmpSurface._size ? tmpSurface._size[1] : undefined];
            };
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
                    App.Analytics.trackPage(function(){
                        // success
                        // console.log('success');
                    }, function(){
                        // error
                        // console.error('ganalyticserror');
                    }, 'waiting.app/' + pageRoute);
                }catch(err){
                    if(App.Data.usePg){
                        console.error('Utils.Analytics.trackPage');
                        console.error(err);
                        debugger;
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

        RemoteRefresh: function(context, snapshot){
            // Default PageView.prototype.remoteRefresh

            if(context.model){
                context.model.fetch();
            }
            if(context.collection){
                context.collection.fetch(); // updates, doesn't take "pager" into account?
            }

            // emit on subviews
            if(context._subviews){
                _.each(context._subviews, function(tmpSubview){
                    if(typeof tmpSubview.remoteRefresh == "function"){
                        tmpSubview.remoteRefresh(snapshot);
                    }
                });
            }

        },

        GetRatio: function(normal_ratio, our_variable, max){
            // Utils.GetRatio([160,320],[window.innerWidth,'x'])
            var val;
            if(our_variable[0] instanceof String){
                // x
                val = (our_variable[1] * normal_ratio[0]) / normal_ratio[1];
            } else {
                // y
                val = (our_variable[0] / normal_ratio[0]) * normal_ratio[1];
            }
            if(max !== undefined && val > max){
                return max;
            }
            return val;

        },

        htmlEncode: function(value){
          //create a in-memory div, set it's inner text(which jQuery automatically encodes)
          //then grab the encoded contents back out.  The div never exists on the page.
          return $('<div/>').text(value).html();
        },

        hbSanitize: function(string){
            // copied from Handlebars.js sanitizing of strings
            var escape = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#x27;",
                "`": "&#x60;"
            };

            var badChars = /[&<>"'`]/g;
            var possible = /[&<>"'`]/;

            function escapeChar(chr) {
                return escape[chr] || "&amp;";
            }

            if (!string && string !== 0) {
              return "";
            }

            // Force a string conversion as this will be done by the append regardless and
            // the regex test will do this transparently behind the scenes, causing issues if
            // an object's to string has escaped characters in it.
            string = "" + string;

            if(!possible.test(string)) { return string; }
            return string.replace(badChars, escapeChar);
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

        PairingCode: (function (undefined) {
            var ns = {
                alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
                checkSalt : "grass",
                decode: function(inStr, nPos) {
                    var val = this.alphabet.indexOf(inStr.charAt(nPos).toUpperCase());
                    if (val == -1) throw "Decoding error";
                    return val;
                },
                CalculateCheckDigit : function(inStr ) {
                    if(inStr.length!=5)
                        throw "Invalid length";
                    var arrDecode = new Uint8Array(5);
                    arrDecode[0] = this.decode(inStr,0);
                    arrDecode[1] = this.decode(inStr,1);
                    arrDecode[2] = this.decode(inStr,2);
                    arrDecode[3] = this.decode(inStr,3);
                    arrDecode[4] = this.decode(inStr,4);
                    var arrBytes = CryptoJS.lib.WordArray.create(arrDecode);
                    var arrSalt  = CryptoJS.enc.Latin1.parse( this.checkSalt );
                    arrSalt.concat(arrBytes);
                    var arrSha1 = CryptoJS.SHA1(arrSalt);
                    var strHash = arrSha1.toString();
                    var firstByte = strHash.charAt(0) + strHash.charAt(1);
                    var value = parseInt(firstByte,16) & 0x1F;
                    var letter = this.alphabet.charAt(value);
                    return letter;
                }
            };

            return ns;
        }()),


        logout: function(){
            
            // Reset caches
            App.Cache = {};
            App.Cache = _.defaults({},App.DefaultCache);
            // console.log(App.Cache);
            App.Data = {
                User: null,
                Players: null // preloaded
            };

            // Maintain some localStorage (temporary, during development)
            // - address
            var doSave = true; // toggle for on/off
            var it = ['address_street','address_street2','address_city','address_state','address_zipcode'];
            var saved = [];
            it.forEach(function(k){
                saved.push({
                    key: k,
                    value: localStorage.getItem(k)
                });
            });

            // Clear storage
            localStorage.clear();

            if(doSave){
                saved.forEach(function(k){
                    localStorage.setItem(k.key,k.value);
                });
            }
            
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
                    // 'x-token' : ''
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
            App.history.eraseUntilTag('all-of-em');
            App.history.navigate('landing');
            // window.location = window.location.href.split('#')[0] + '#landing';

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

                case 'new_connection':
                    // Already on page?
                    var viewUrl = 'user/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'New Connection',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;


                case 'todo_updated':
                    // Already on the page?
                    var viewUrl = 'todo/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Job Details Updated',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'todo_assigned':
                    // Already on the page?
                    var viewUrl = 'todo/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Job people updated',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'todo_content_added':
                    // Already on the page?
                    var viewUrl = 'todo/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'New Job Content',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'invoice_updated':
                    // Already on the page?
                    var viewUrl = 'invoice/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Invoice Details Updated',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'invoice_assigned':
                    // Already on the page?
                    var viewUrl = 'invoice/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Invoice people updated',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'invoice_item_added':
                    // Already on the page?
                    var viewUrl = 'invoice/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Item added to Invoice',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'invoice_content_added':
                    // Already on the page?
                    var viewUrl = 'invoice/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'New Invoice Content',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'new_message_connected':
                case 'new_message_unconnected':
                    // Already on the page?
                    var viewUrl = 'inbox/' + payload.from_user_id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'New Message',
                        text: payload.text,
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;


                default:
                    Utils.Notification.Toast('Updates Available');
                    // alert('Unknown type');
                    // alert(payload.type);
                    // alert(JSON.stringify(payload));
                    return;
            }

        },


        addLabelsToMap : function(EventOutput, mapView, MapNode, cars, zoomLevel){
            // Putting a label for each leg of the trip
            // - only the beginning of the trip has the "start"
            // - unless the GPS has moved a ton? (we could do haversine)

            var map = mapView.getMap();

            if(map && map.markerList){
                // Map already exists
                // - clear out markers
                _.each(map.markerList, function(marker){
                    map.removeLayer(marker);
                });
                map.markerList = [];
                // return map;
                // return;

            } else {

                // // var mapOptions = {
                // //     zoom: 4,
                // //     // maxZoom: 17,
                // //     mapTypeId: google.maps.MapTypeId.ROADMAP,
                // //     // disableDefaultUI: true
                // //     panControl: false,
                // //     streetViewControl: false,
                // //     zoomControl: false,
                // //     zoomControlOptions: {
                // //         style: google.maps.ZoomControlStyle.SMALL,
                // //         position: google.maps.ControlPosition.RIGHT_BOTTOM
                // //     },
                // //     mapTypeControl: false,
                // //     mapTypeControlOptions: {
                // //         style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
                // //     },
                // //     scaleControl: false
                // // };
                // // map = new google.maps.Map(mapElem, mapOptions);

                // var layer = new L.StamenTileLayer("toner-lite");

                // map = L.map(mapElem, {
                //     zoomControl: false,
                //     attributionControl: false
                // }); //.setView([51.505, -0.09], 13);
                // map.Events = _.extend({}, Backbone.Events);

                // map.on('load', function(){
                //     window.setTimeout(function(){
                //         map.Events.trigger('load');
                //     },300);
                // });

                // // add an OpenStreetMap tile layer
                // // L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                // //     updateWhenIdle: false,
                // //     attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                // // }).addTo(map);
                // map.addLayer(layer);

            }

            if(cars.length < 1){
                console.log('No cars');
                return '';
            }

            var markers = [],
                bounds = [],
                paths = [],
                foundCar = false;
  
            console.log(App.Cache.geolocation_coords);

            // First do my current position (if available)
            if(App.Cache.geolocation_coords){

                var me_label = 'Me';
                var latLng = [App.Cache.geolocation_coords.latitude, App.Cache.geolocation_coords.longitude];

                bounds.push(latLng);

                var image = new ImageSurface({
                    size: [true, true],
                    content: 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-icon.png'
                });
                var modifier = new Modifier({
                    align: [0, 0],
                    origin: [0.5, 0.5]
                });
                var mapModifier = new MapStateModifier({
                    mapView: mapView,
                    position: latLng,
                    // zoomBase: 15
                });
                // image.on('click', _panToLandmark.bind(mapModifier));
                MapNode.add(mapModifier).add(modifier).add(Utils.usePlane('content',10)).add(image);


                var meMarker = L.marker(latLng);
                markers.push(meMarker);

                // var me_marker = L.marker(latLng, {
                //     icon: new L.Icon.Label.Default({
                //         iconUrl: 'never-exist.png',
                //         iconSize: [1,1],
                //         shadowUrl: 'never-exist.png',
                //         shadowSize: [1,1],
                //         labelText: 'Me',
                //         classStyle: {
                //             'color' : 'blue'
                //         } 
                //     })
                // });

                // // me_marker.bindLabel('Me', {
                // //     noHide: true,
                // //     className: 'leaflet-label'
                // // });

                // me_marker.addTo(map);

                // me_marker.showLabel();


                // new MarkerWithLabel({
                //     position: latLng,
                //     draggable: false,
                //     map: map,
                //     icon: 'never_exist.png', // effectively hides the icon
                //     labelContent: me_label,
                //     labelAnchor: new google.maps.Point(22, 0),
                //     labelClass: "map-label", // the CSS class for the label
                //     labelStyle: {
                //         opacity: 1.0,
                //         background: "blue"
                //     },
                //     labelInBackground: false
                // });

                // me_marker.me_marker = true;
                
                // markers.push(me_marker);
            }

            // Now do Cars
            for(var index in cars){
                var car = _.clone(cars[index]);
                // console.log(tripLegs[index]); // trip object
                try {
                    var gps_position = cars[index].latest_data.lastWaypoint,
                        label = '',
                        latLng = [gps_position.latitude, gps_position.longitude];

                    bounds.push(latLng);

                    index = parseInt(index, 10);

                    // console.log(label);
                    // console.log(cars[index]);
                    // var marker = new google.maps.Marker({
                    //     position: latLng,
                    //     map: map,
                    //     title: label
                    // });
        
                    var marker = L.marker(latLng, {
                        // icon: transparentIcon
                        icon: new L.Icon.Label.Default({
                            iconUrl: 'never-exist.png',
                            iconSize: [1,1],
                            shadowUrl: 'never-exist.png',
                            shadowSize: [1,1],
                            labelText: car.name,
                            classStyle: {
                                'border-color' : car.color,
                                'background-color' : car.color,
                                'color' : tinycolor.mostReadable(car.color, ["#000", "#fff"]).toHexString()
                            } 
                        })
                    });

                    marker.on('click', function(e){
                        EventOutput.trigger('mapclick', {e: e, car: this.car});
                    });

                    // marker.bindLabel(car.name, {
                    //     noHide: true,
                    //     clickable: true,
                    //     className: 'leaflet-label',
                    //     classStyle: {
                    //         'border-color' : car.color
                    //     }
                    // });

                    marker.car = car;
                    marker.car_id = car._id;

                    marker.addTo(map);
                    // marker.showLabel();

                    // var marker = new MarkerWithLabel({
                    //     car: car,
                    //     car_id: car._id,

                    //     position: latLng,
                    //     draggable: false,
                    //     map: map,
                    //     icon: 'never_exist.png', // effectively hides the icon
                    //     labelContent: car.name,
                    //     labelAnchor: new google.maps.Point(22, 0),
                    //     labelClass: "map-label", // the CSS class for the label
                    //     labelStyle: {
                    //         opacity: 1.0,
                    //         background: car.color
                    //     },
                    //     labelInBackground: false
                    // });
                    markers.push(marker);


                    // google.maps.event.addListener(markers[markers.length-1], "click", function (e) {
                    //     // console.log(e);
                    //     EventOutput.trigger('mapclick', {e: e, car: this.car});
                    // });

                    foundCar = true;

                } catch(err){
                    // Failed finding a waypoint for a car
                    // - skipping it for now
                    console.error(err);
                }

            }

            // Find any cars?
            if(foundCar === false){
                // return 'no_cars_with_datapoints';
            }
            console.log(map);
            console.log(bounds);

            map.fitBounds(bounds, {
                maxZoom: 18,
                padding: [20,20]
            });

            map.markerList = markers;

            console.log(bounds);
            // debugger;

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

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

    return Utils;


});