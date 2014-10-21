define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        Friend = Backbone.DeepModel.extend({

            idAttribute: '_id',
            
            urlRoot: Credentials.server_root + "friend",

            initialize: function (model, opts) {
                // set ids,etc
                this.url = this.urlRoot + '';
                
                if(model.friend_id){
                  this.url = this.urlRoot + '/' + model.friend_id;
                }
                if(model.id){
                  this.url = this.urlRoot + '/' + model.id;
                }
                if(opts.emailonly){
                  this.url = this.urlRoot + '/emailonly';
                }

            }

        });

    Friend = Backbone.UniqueModel(Friend);

    var FriendCollection = Backbone.Collection.extend({

            model: Friend,

            urlRoot: Credentials.server_root + "friends",

            initialize: function(models, options) {
                options = options || {};
                this.options = options;

                this.url = this.urlRoot + '';

                if(options.type == 'friend'){
                    this.url = this.urlRoot + '/friend';
                }

                if(options.type == 'emailonly'){
                    this.url = this.urlRoot + '/emailonly';
                }

                if(options.type == 'recommended'){
                    this.url = this.urlRoot + '/recommended';
                }
            },

            comparator: function(model){
                if(this.options.type == 'emailonly'){
                    return model.get('email').toString().toLowerCase();
                }
                console.log(model);
                return model.get('profile.name').toString().toLowerCase();
            },

        });

    return {
        Friend: Friend,
        FriendCollection: FriendCollection
    };

});