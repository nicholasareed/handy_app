/*globals define*/
define(function(require, exports, module) {
    
    // var Player              = require('models/player'),
        // Game                = require('models/game'),
        // Sport               = require('models/sport'),
        // RelationshipCode    = require('models/relationship_code'),
    var User                = require('models/user');
    var FriendModel                = require('models/friend');

    module.exports = function(App){

        // Load our existing models first
        // - should have already been loaded into App.Data (or similar)
        // - initiate a fetcs

        // Preload the necessary models by fetching from the server
        console.info('preloading models');

        App.Data.UserFriends = new FriendModel.FriendCollection([],{
            type: 'friend'
        });

        if(App.Data.User.get('_id')){
            // Logged in

            App.Data.UserFriends.fetch({prefill: true});

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
