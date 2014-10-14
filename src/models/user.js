define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Utils = require('utils'),

        Credentials         = JSON.parse(require('text!credentials.json')),

        User = Backbone.DeepModel.extend({

            idAttribute: '_id',
            
            urlRoot: Credentials.server_root + "user",

            initialize: function (defaults) {
              defaults = defaults || {};
              this.url = this.urlRoot;
              if(defaults.profile_id){
                this.url = this.urlRoot + '/profile/' + defaults.profile_id;
              }
                
            },

            submitEmailCode: function(code){
              var def = $.Deferred();

              $.ajax({
                url: Credentials.server_root + 'user/verify/email/',
                data: {
                  code: code, 
                  platform: App.Config.devicePlatform
                },
                method: 'post',
                success: function(result){
                  // verified
                  def.resolve();
                },
                error: function(){
                  def.reject();
                }
              }); 

              return def.promise();
            },

            verifiedEmail: function(){
              var def = $.Deferred();

              $.ajax({
                url: Credentials.server_root + 'user/verify/status/',
                method: 'get',
                cache: false,
                success: function(result){
                  // verified
                  // console.error(JSON.stringify(result));
                  // Utils.Notification.Toast(result);
                  if(result.verified == true){
                    def.resolve();
                    return;
                  }
                  // alert(JSON.stringify(result));
                  def.reject(result);
                },
                error: function(err){
                  def.reject(err);
                }
              }); 

              return def.promise();
            },

            resendEmail: function(){
              var def = $.Deferred();
              
              $.ajax({
                url: Credentials.server_root + 'user/email/',
                method: 'post',
                data: {
                  email: localStorage.getItem(Credentials.local_user_email)
                },
                success: function(){
                  // resent
                  def.resolve();
                },
                error: function(){
                  def.reject();
                }
              });  

              return def.promise();
            },

            signup: function(body){
                // Log in a user with credentials
                // - store login information in the global scope

                // Deferred
                var def = $.Deferred();

                // Run ajax command from here, instead of from View
                $.ajax({
                  url: Credentials.server_root + 'signup',
                  data: body,
                  method: 'POST',
                  success: function(response){
                    // Signed up OK

                    def.resolve(response);

                  },
                  error: function(errResponse){
                    def.reject(errResponse);
                  }
                });

                return def.promise();

            },

            login: function(body){
                // Log in a user with credentials
                // - store login information in the global scope

                // Deferred
                var def = $.Deferred();

                // Run ajax command from here, instead of from View
                $.ajax({
                  url: Credentials.server_root + 'login',
                  data: body,
                  method: 'POST',
                  success: function(response){
                    // Great!
                    //  store the access token

                    var token = response.token;

                    // Store access_token in localStorage
                    localStorage.setItem(App.Credentials.local_token_key, token);
                    App.Data.UserToken = token;

                    console.log(response);

                    App.Data.UserToken = token;

                    // Update ajaxSetup with x-token header
                    $.ajaxSetup({
                        headers: {
                            "x-token" : token
                            // 'Authorization' : 'Bearer ' + response.access_token
                        }
                    });

                    App.Data.User = new User({
                      _id: response._id
                    });
                    App.Data.User.fetch();
                    App.Data.User.populated().then(function(){
                      localStorage.setItem(App.Credentials.local_user_key, JSON.stringify(App.Data.User.toJSON()));
                    });

                    try {
                      // window._trackJs.userId = body.email;
                      trackJs.configure({

                        // // Custom session identifier.
                        // sessionId: "",

                        // Custom user identifier.
                        userId: body.email.toLowerCase(),

                        // // Custom application identifier.
                        // version: ""

                      });
                    } catch(err){
                      console.error('No Track.js');
                    }

                    // Save user email
                    localStorage.setItem(Credentials.local_user_email, body.email)

                    // Preload Models
                    require(['models/preload'], function(PreloadModels){
                        PreloadModels(App);
                    });

                    // Register for Push Notifications
                    App.DeviceReady.initPush();
                    

                    // Return to original
                    def.resolve(response);

                  },
                  error: function(errResponse){
                    def.reject(errResponse);
                  }
                });

                return def.promise();

            }

        });

        User = Backbone.UniqueModel(User);

        var UserCollection = Backbone.Paginator.requestPager.extend({

            model: User,

            url: Credentials.server_root + "users",
            urlRoot: Credentials.server_root + "users",

            // Paginator Core
            paginator_core: {
              // the type of the request (GET by default)
              type: 'GET',

              // the type of reply (jsonp by default)
              dataType: 'json',

              // the URL (or base URL) for the service
              // if you want to have a more dynamic URL, you can make this a function
              // that returns a string
              url: function(){return this.url}
            },

            // Paginator User Interface (UI)
            paginator_ui: {
              // the lowest page index your API allows to be accessed
              firstPage: 0,

              // which page should the paginator start from
              // (also, the actual page the paginator is on)
              currentPage: 0,

              // how many items per page should be shown
              perPage: 20,
              totalPages: 10 // the default, gets overwritten
            },

            // Paginator Server API
            server_api: {
              // the query field in the request
              '$filter': '',

              // number of items to return per request/page
              '$top': function() { return this.perPage },

              // how many results the request should skip ahead to
              // customize as needed. For the Netflix API, skipping ahead based on
              // page * number of results per page was necessary.
              '$skip': function() { return this.currentPage * this.perPage },

              // // field to sort by
              // '$orderby': 'ReleaseYear',

              // what format would you like to request results in?
              '$format': 'json',

              // custom parameters
              '$inlinecount': 'allpages',
              // '$callback': 'callback'
            },

            // Paginator Parsing
            parse: function (response) {
                this.totalPages = Math.ceil(response.total / this.perPage);
                this.totalResults = response.total;
                return response.results;
            },

            initialize: function(models, options){
                options = options || {};
                this.options = options;

                if(options.type == 'sentence_to_select'){
                  this.url = Credentials.server_root + 'sentence/users/to_select';
                }

                if(options.type == 'sentence_matched'){
                  this.url = Credentials.server_root + 'sentence/users/matched';
                }

            }

        });

    return {
        User: User,
        UserCollection: UserCollection
    };

});