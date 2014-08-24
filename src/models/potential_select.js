define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        PotentialSelect = Backbone.DeepModel.extend({

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

    PotentialSelect = Backbone.UniqueModel(PotentialSelect);

    var PotentialSelectCollection = Backbone.Collection.extend({

            model: PotentialSelect,

            urlRoot: Credentials.server_root + "users",

            initialize: function(models, options) {
                options = options || {};
                this.options = options;

                // if(options.type == 'potential_list'){
                this.url = Credentials.server_root + 'friend/potential_list/' + options.hash;
                // }
                
            },
        });

    return {
        PotentialSelect: PotentialSelect,
        PotentialSelectCollection: PotentialSelectCollection
    };

});