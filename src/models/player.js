define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        Player = Backbone.DeepModel.extend({

            idAttribute: '_id',
            
            urlRoot: Credentials.server_root + "player",

            initialize: function (opts) {
                // set ids,etc
                this.url = this.urlRoot + '';
                if(this.id){
                  this.url = this.urlRoot + '/' + this.id;
                } else {
                  this.url = this.urlRoot;
                }
                // console.log(this.url);
            }

        });

    Player = Backbone.UniqueModel(Player);

    var PlayerCollection = Backbone.Collection.extend({

            model: Player,

            urlRoot: Credentials.server_root + "players",

            initialize: function(models, options) {
                options = options || {};
                // set ids,etc
                this.url = this.urlRoot + '';
                if(options.player_id){
                    this.url = this.urlRoot + '/' + options.player_id;
                }
                if(options.type == 'username'){
                    this.url = this.urlRoot + '/' + 'search/username/' + options.username;
                }
            },

            comparator: function(model){
                if(model.get('Profile.name')){
                    return model.get('Profile.name').toString().toLowerCase();
                } else {
                    return model.get('name').toString().toLowerCase();
                }
            },

            findMe: function(){
                // console.log( this.findWhere({is_me: true}));
                return this.findWhere({is_me: true});
            }

        });

    return {
        Player: Player,
        PlayerCollection: PlayerCollection
    };

});