define(function(require, exports, module) {
    var Surface            = require('famous/core/Surface');
    var Modifier           = require('famous/core/Modifier');
    var Transform          = require('famous/core/Transform');
    var View               = require('famous/core/View');
    var ScrollView         = require('famous/views/Scrollview');
    
    function ModifiedScrollView(options) {
        ScrollView.apply(this, arguments);
        _bindUpdateEvent.call(this);
    }

    ModifiedScrollView.prototype = Object.create(ScrollView.prototype);
    ModifiedScrollView.prototype.constructor = ModifiedScrollView;

    ModifiedScrollView.DEFAULT_OPTIONS = {
    };

    function _bindUpdateEvent() {
        this._eventInput.on('update', function (event) {
            if (this._node.index <= 1) {
                this._eventOutput.emit('scrollmove', event);
            }
        }.bind(this));
        this._scroller.on('edgeHit', function (data) {
            this._eventOutput.emit('edgeHit', this.getPosition());
        }.bind(this));
    }

    module.exports = ModifiedScrollView;
});
