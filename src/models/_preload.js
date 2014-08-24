/*globals define*/
define(function(require, exports, module) {
    
    // var Player              = require('models/player'),
        // Game                = require('models/game'),
        // Sport               = require('models/sport'),
        // RelationshipCode    = require('models/relationship_code'),
    var User                = require('models/user');

    module.exports = function(App){

        // Load our existing models first
        // - should have already been loaded into App.Data (or similar)
        // - initiate a fetcs

        // Preload the necessary models by fetching from the server
        console.info('preloading models');

        if(App.Data.User.get('_id')){
            // Logged in

            // console.log('Logged in, preloading');
            // console.log(App);
            // debugger;
            // App.Data.Sports = new Sport.SportCollection();
            // App.Data.Sports.fetch({prefill: true});

            // debugger;
        } else {
            // Not logged in
            // - probably not fetching anything!
            // debugger;
        }
        
        // // Player List
        // App.Data.Players = new Player.PlayerCollection();
        // App.Data.Players.fetch({prefill: true});

        return true;

    };

});
