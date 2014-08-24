/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode')

    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");
    var FlexibleLayout = require("famous/views/FlexibleLayout");

    var Backbone = require('backbone-adapter');
    var StoryModel = require("models/story");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');
    var moment = require('moment');

    // // Templates
    // var Handlebars          = require('lib2/handlebars-adapter');
    // var tpl                 = require('text!./tpl/PlayerStoryList.html');
    // var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // this.game_id = this.options.game_id;
        this.model = this.options.model;

        this.lightbox = new RenderController({
            // showOrigin: [0.5, 0]
        });
        this.contentSeqLayout = new SequentialLayout();
        this.contentSeqLayout.Views = [];
        

        var testSurf = new Surface({
            content: "TESTING",
            size: [undefined, undefined]
        });
        this.lightbox.show(this.contentSeqLayout);

        // Wait for model to get data, and then render the content
        this.model.populated().then(function(){

            // that.update_counts();
            // // Now listen for changes
            // that.model.on('change', that.update_counts, that);

            App.Data.Players.populated().then(function(){
                // Create my result first (if I had a result)
                that.createMyResult();

                switch(that.model.get('sport_id.result_type')){
                    case '1v1':
                        that.create1v1();
                        break;

                    case 'free-for-all':
                        that.createFreeForAll();
                        break;

                    default:
                        console.log(that.model.toJSON());
                        throw "error";
                        alert("Unable to handle other types (1v2, teams, etc.) yet");
                        debugger;
                        return;
                }

                that.contentSeqLayout.sequenceFrom(that.contentSeqLayout.Views);

            });

        });

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.add(this.lightbox);


    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;

    SubView.prototype.createMyResult = function(){
        var that = this;

        // How did I do?

        // You Won! (or lost, or tied)

        // Player has all of the player_ids for themselves (that they "own" almost)
        var my_player_ids = App.Data.Players.findMe().get('related_player_ids');
        var matched_ids = _.intersection(this.model.get('player_ids'), my_player_ids);
        if(matched_ids.length < 1){
            // player didn't participate
            return;
        }

        // convert matched_ids into the first matching player_id
        var found_player_id = matched_ids[0];
        var myResult = this.model.get('player_results')[found_player_id];


        // var me = App.Data.Players.findMe();

        // var myResult = this.model.get('player_results')[me.get('_id')].result;

        this.bigResult = new View();

        switch(this.model.get('sport_id.result_type')){
            case '1v1':

                switch(myResult.result){
                    case 'w':
                        this.bigResult.Surface = new Surface({
                            content: 'You Won!',
                            size: [undefined, 40],
                            classes: ['g1v1-small-flag-result','small-flag-result-win']
                        });
                        break; 
                    case 'l':
                        this.bigResult.Surface = new Surface({
                            content: 'You Lost :(',
                            size: [undefined, 40],
                            classes: ['g1v1-small-flag-result','small-flag-result-lose']
                        });
                        break; 
                    case 't':
                        this.bigResult.Surface = new Surface({
                            content: 'You Tied :|',
                            size: [undefined, 40],
                            classes: ['g1v1-small-flag-result','small-flag-result-tie']
                        });
                        break; 

                    default:
                        debugger;
                        return;
                        break;
                }

                this.bigResult.Surface.pipe(that._eventOutput);
                this.bigResult.add(this.bigResult.Surface);
                this.contentSeqLayout.Views.push(this.bigResult);

                break;

            case 'free-for-all':

                switch(this.model.get('sport_id.result_subtype')){
                    case 'places':
                        this.bigResult.Surface = new Surface({
                            content: 'You placed ' + numeral(myResult.place).format('0o'),
                            size: [undefined, 40],
                            classes: ['gFreeForAll-small-flag-result','small-flag-result-place-' + (myResult.place > 3 ? '4plus':myResult.place).toString()]
                        });
                        this.bigResult.Surface.pipe(that._eventOutput);
                        this.bigResult.add(this.bigResult.Surface);
                        this.contentSeqLayout.Views.push(this.bigResult);
                        break;
                    default:
                        console.error('wrong result_subtype of result, not yet supported');
                        return;
                }
                break;

            default:
                console.error('wrong result_type of result, not yet supported');
                return;

        }
    };

    SubView.prototype.create1v1 = function(){
        var that = this;

        // Players

        // Create SequenceLayout of items
        // - inserting that into the existing contentScrollView
        this.ResultSequenceLayout = new SequentialLayout();
        this.ResultSequenceLayout.Views = [];
        this.ResultSequenceLayout.sequenceFrom(this.ResultSequenceLayout.Views);

        // Place for everybody
        // - re-ordering
        var playerOrder = []; //_.clone(this.model.get('player_results'));
        _.each(this.model.get('player_results'), function(result, player_id){
            playerOrder.push({
                _id: player_id,
                result: result
            });
        });
        playerOrder = _.sortBy(playerOrder, function(player){
            // return player.result.place;
            console.log(player);
            if(player.result.result == 'w'){
                return -1;
            }
            if(player.result.result == 'l'){
                return 1;
            }
            if(player.result.result == 't'){
                return 0;
            }
        });

        // Create surfaces for each player
        _.each(playerOrder, function(player){
            console.log(player);
            var opponent = new View();
            opponent.Surface = new Surface({
                content: '<span class="place-order" style="font-weight:bold;">' + player.result.result.toUpperCase() + ' - </span>&nbsp;&nbsp;<span data-replace-id="'+player._id+'" data-replace-model="Player" data-replace-field="Profile.name"></span>',
                size: [undefined, 40],
                classes: [],
                properties: {
                    lineHeight: "40px",
                    padding: "0px 10px",
                    backgroundColor: "white",
                    color: "#222"
                }
            });
            opponent.Surface.pipe(that._eventOutput);
            Utils.dataModelReplaceOnSurface(opponent.Surface);
            opponent.add(opponent.Surface);

            that.ResultSequenceLayout.Views.push(opponent);
        });

        this.contentSeqLayout.Views.push(this.ResultSequenceLayout);

    };

    SubView.prototype.createFreeForAll = function(){
        var that = this;

        // Create SequenceLayout of items
        // - inserting that into the existing contentScrollView
        this.ResultSequenceLayout = new SequentialLayout();
        this.ResultSequenceLayout.Views = [];
        this.ResultSequenceLayout.sequenceFrom(this.ResultSequenceLayout.Views);
        
        // Place for everybody
        // - re-ordering
        var playerOrder = []; //_.clone(this.model.get('player_results'));
        _.each(this.model.get('player_results'), function(result, player_id){
            playerOrder.push({
                _id: player_id,
                result: result
            });
        });
        playerOrder = _.sortBy(playerOrder, function(player){
            return player.result.place;
        });

        // Create surfaces for each opponent
        _.each(playerOrder, function(player){

            var opponent = new View();
            opponent.Surface = new Surface({
                content: '<span class="place-order">' + numeral(player.result.place).format('0o') + '</span>&nbsp;&nbsp;<span data-replace-id="'+player._id+'" data-replace-model="Player" data-replace-field="Profile.name"></span>',
                size: [undefined, 40],
                classes: ['gFreeForAll-places-order', 'places-order-' + (player.result.place > 3 ? '4plus':player.result.place).toString()],
                properties: {
                    lineHeight: "40px",
                    padding: "0px 10px",
                    backgroundColor: "white",
                    color: "#222"
                }
            });
            opponent.Surface.pipe(that._eventOutput);
            Utils.dataModelReplaceOnSurface(opponent.Surface);
            opponent.add(opponent.Surface);

            that.ResultSequenceLayout.Views.push(opponent);
        });

        this.contentSeqLayout.Views.push(this.ResultSequenceLayout);

    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
