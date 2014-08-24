define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        UserSelect = Backbone.DeepModel.extend({

            idAttribute: '_id',
            
            urlRoot: Credentials.server_root + "user",

            initialize: function (opts) {
                // set ids,etc
                this.url = this.urlRoot + '';
                if(this.id){
                  this.url = this.urlRoot + '/' + this.id;
                } else {
                  this.url = this.urlRoot;
                }
                // console.log(this.url);
            },

            select: function(user_id){
                // POST to server
                var def = $.Deferred();

                $.ajax({
                    url: Credentials.server_root + 'sentence/users/select/' + user_id,
                    method: 'POST',
                    success: function(resp){
                        // returns with an array!

                        if(user_id == 'all'){
                            def.resolve(resp);
                            return;
                        }

                        // resolve the first element in array
                        def.resolve(resp[0]);

                    }
                });

                return def.promise();
            }

        });

    UserSelect = Backbone.UniqueModel(UserSelect);

    var UserSelectCollection = Backbone.Collection.extend({

            model: UserSelect,

            urlRoot: Credentials.server_root + "users",

            initialize: function(models, options) {
                options = options || {};
                this.options = options;

                if(options.type == 'sentence_to_select'){
                  this.url = Credentials.server_root + 'sentence/users/to_select';
                }

                if(options.type == 'sentence_potential_to_select'){
                  this.url = Credentials.server_root + 'sentence/users/potential_to_select';
                }

                if(options.type == 'sentence_matched'){
                  this.url = Credentials.server_root + 'sentence/users/matched';
                }
            },
        });

    return {
        UserSelect: UserSelect,
        UserSelectCollection: UserSelectCollection
    };

});