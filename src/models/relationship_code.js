define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        RelationshipCode = Backbone.Model.extend({

            idAttribute: '_id',

            urlRoot: Credentials.server_root + "relationships/",

            initialize: function (options) {
                // ok
                if(options.modelType == 'friend' && options.friend_id){
                    this.url = this.urlRoot + 'friend/' + options.friend_id;
                } else if(options.modelType == 'add_friend'){
                    this.url = this.urlRoot + 'add_friend'
                } else {
                    this.url = this.urlRoot + this.id;
                }

            },

        }),

    RelationshipCode = Backbone.UniqueModel(RelationshipCode);

    var RelationshipCodeCollection = Backbone.Collection.extend({

            model: RelationshipCode,

            urlRoot: Credentials.server_root + "relationships",

            initialize: function(models, options){
                this.url = this.urlRoot + '';
            }

        });

    return {
        RelationshipCode: RelationshipCode,
        RelationshipCodeCollection: RelationshipCodeCollection
    };

});