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
        
        this.lightbox.show(this.contentSeqLayout);

        // Wait for model to get data, and then render the content
        this.model.populated().then(function(){

            // that.update_counts();
            // // Now listen for changes
            // that.model.on('change', that.update_counts, that);

            that.create_view_online_button();
            that.create_share_button();

            that.contentSeqLayout.sequenceFrom(that.contentSeqLayout.Views);

        });

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.add(this.lightbox);

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;

    SubView.prototype.create_view_online_button = function(ev){
        var that = this;

        // View Online (opens in a new window)

        this.viewOnlineButtonSurface = new Surface({
            content: "View Online",
            size: [undefined, 60],
            classes: ['form-button-submit-default'],
            properties: {
                backgroundColor: "#666E7F",
                borderTop: "4px solid #333740"
            }

        });
        this.viewOnlineButtonSurface.pipe(that._eventOutput);
        // this.contentScrollView.Views.push(this.viewOnlineButtonSurface);
        this.contentSeqLayout.Views.push(this.viewOnlineButtonSurface);

        // Events for surfaces
        this.viewOnlineButtonSurface.on('click', function(){
            // alert('www.nemesisapp.net/games/public/' + that.model.get('_id'));
            window.open('http://www.nemesisapp.net/game/public/' + that.model.get('_id'),'_system');
        });

        // window.plugins.socialsharing.shareViaSMS('Wehicle code: ' + this.model.get('code').toUpperCase(), null);

    };

    SubView.prototype.create_share_button = function(ev){
        var that = this;

        // Share Button

        // - only does SMS for now
        // - todo: share a SUMMARY to Facebook/Twitter/Pinterest (open graph tags could also be used)

        this.shareButtonSurface = new Surface({
            content: "Share Link by SMS",
            size: [undefined, 60],
            classes: ['form-button-submit-default'],
            properties: {
                backgroundColor: "#B8C7E5",
                borderTop: "4px solid #666E7F"
            }

        });
        this.shareButtonSurface.pipe(that._eventOutput);
        // this.contentScrollView.Views.push(this.shareButtonSurface);
        this.contentSeqLayout.Views.push(this.shareButtonSurface);

        // Events for surfaces
        this.shareButtonSurface.on('click', function(){
            // alert('www.nemesisapp.net/games/public/' + that.model.get('_id'));
            window.plugins.socialsharing.shareViaSMS('www.nemesisapp.net/game/public/' + that.model.get('_id'), null);
        });

        // window.plugins.socialsharing.shareViaSMS('Wehicle code: ' + this.model.get('code').toUpperCase(), null);

    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
