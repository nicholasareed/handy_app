/*globals define*/
define(function(require, exports, module) {
    
    // var Player              = require('models/player'),
        // Game                = require('models/game'),
        // Sport               = require('models/sport'),
        // RelationshipCode    = require('models/relationship_code'),
    var User                = require('models/user');
    var FriendModel                = require('models/friend');
    var TodoModel                = require('models/todo');
    var MessageModel                = require('models/message');
    var ActionModel                = require('models/action');

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

            // Todos
            App.Data.TodoCollection = new TodoModel.TodoCollection([],{
                '$filter' : {
                    tags: {
                        '$ne' : 'complete'
                    }
                }
            });
            App.Data.TodoCollection.on('sync', function(){
                App.Views.MainFooter.Tabs.buttons[0].setOptions({
                    content: '<i class="icon ion-android-lightbulb"></i><div><span class="ellipsis-all">'+App.Data.TodoCollection.totalResults+' Todo</span></div>'
                });
                App.Data.TodoCollection.totalResults;
            });
            App.Data.TodoCollection.fetch();

            // Updates
            App.Data.ActionCollection = new ActionModel.ActionCollection([],{
                // type: 'friend'
            });
            App.Data.ActionCollection.on('sync', function(){
                App.Views.MainFooter.Tabs.buttons[1].setOptions({
                    content: '<i class="icon ion-android-sort"></i><div><span class="ellipsis-all">'+App.Data.ActionCollection.totalResults+' Updates</span></div>'
                });
                App.Data.ActionCollection.totalResults;
            });
            App.Data.ActionCollection.fetch();

            // Unread Messages
            App.Data.MessageCollection = new MessageModel.MessageCollection([],{
                '$filter' : {
                    to_user_id: App.Data.User.get('_id'),
                    read: false
                }
            });
            App.Data.MessageCollection.on('sync', function(){
                App.Views.MainFooter.Tabs.buttons[2].setOptions({
                    content: '<i class="icon ion-android-inbox"></i><div><span class="ellipsis-all">'+App.Data.MessageCollection.totalResults+' Msgs</span></div>'
                });
                App.Data.MessageCollection.totalResults;
            });
            App.Data.MessageCollection.fetch();


            // Firebase
            // - needs auth
            var firebase = new Firebase(App.Credentials.firebase_url + 'users/' + App.Data.User.get('_id'));
            firebase.on('child_changed', function (snapshot) {
                console.log('firebase triggered!');
                App.Events.trigger('firebase.child_added', snapshot);
            });

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
