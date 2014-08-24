define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        moment            = require('moment'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        UserMessage = Backbone.DeepModel.extend({

            idAttribute: '_id',

            urlRoot: Credentials.server_root + "messages/user", // don't use this route, ever

            initialize: function (options) {
                this.url = this.urlRoot;
                if(options._id){
                  this.url = this.urlRoot + '/' + options._id;
                }
            }

        });

    UserMessage = Backbone.UniqueModel(UserMessage);

    var UserMessageCollection = Backbone.Collection.extend({

            model: UserMessage,

            urlRoot: Credentials.server_root + "messages/users",

            initialize: function(models, options){
                options = options || {};
                this.options = options;

                this.url = this.urlRoot;

            },

            comparator: function(model){
                return -1 * moment(model.get('created')); // 20131106T230554+0000
            }

        });

    return {
        UserMessage: UserMessage,
        UserMessageCollection: UserMessageCollection
    };

});