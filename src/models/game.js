define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        moment            = require('moment'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        Game = Backbone.DeepModel.extend({

            idAttribute: '_id',

            urlRoot: Credentials.server_root + "game/",

            initialize: function () {
                // ok
                if(this.id){
                  this.url = this.urlRoot + this.id;
                } else {
                  this.url = this.urlRoot;
                }
            }

        });

    Game = Backbone.UniqueModel(Game);

    var GameCollection = Backbone.Paginator.requestPager.extend({

            model: Game,

            url: Credentials.server_root + "games/by_players",
            urlRoot: Credentials.server_root + "games/",

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
              perPage: 10,
              totalPages: 10 // the default, gets overwritten
            },

            // Paginator Server API
            type: 'head-to-head', // 'overall'
            timeframe: 'all', // top, local
            player_filter: 'none', // top, local
            sport_id: 'all', // top, local
            player_ids: [],
            server_api: {

              'type' : function(){
                return this.type;
              },
              'player_filter' : function(){
                return this.player_filter;
              },
              'player_ids' : function(){
                console.log('player_ids');
                console.log(this);
                console.log(this.player_ids);
                return this.player_ids;
              },

              // the query field in the request
              '$filter': function(){
                var f = {};
                if(this.sport_id !== 'all'){
                  f.sport_id = this.sport_id;
                }
                if(this.timeframe !== 'all'){
                  f.created = {
                      '$gte' : this.timeframe
                    }
                }
                return JSON.stringify(f);
              },

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
                this.summary = response.summary;

                // console.log('SUMMARY', this.summary);
                // console.log(JSON.stringify(this.summary));
                
                // debugger;
                return response.results;
            },


            initialize: function(models, options){
                options = options || {};
                this.options = options;

                if(options.type){
                  this.type = options.type;
                }

                if(options.player_filter){
                  this.player_filter = options.player_filter;
                }

                if(options.sport_id){
                  this.sport_id = options.sport_id;
                }

                if(options.timeframe){
                  this.timeframe = options.timeframe;
                }

                this.player_ids = [];
                if(options.player_id){
                  
                  if(typeof(options.player_id) != typeof([])){
                    // single _id string
                    this.player_ids.push(options.player_id);
                  } else {
                    // array of player_ids
                    this.player_ids = this.player_ids.concat(options.player_id);
                  }

                  // console.log(this.player_ids);
                }

                // Feed (ignoring stuff above, basically)
                if(options.starred === true){
                  this.url = this.urlRoot + 'starred_for_me';
                } else {
                  this.url = this.urlRoot + 'by_players/' + CryptoJS.SHA3(JSON.stringify(options));
                }

                // if(options.player_id){
                //     this.url = this.url + '/player/' + options.player_id;
                // }
            },

            comparator: function(model){
                return -1 * moment(model.get('start_time'), "YYYYMMDD HHmmss"); // 20131106T230554+0000
            },

            findByLastGame: function(){
                var deferred = $.Deferred();
                
                deferred.resolve(this.first());
                
                return deferred.promise();
            }

        });

    return {
        Game: Game,
        GameCollection: GameCollection
    };

});