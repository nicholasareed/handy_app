
/* This is now part of ScrollView (not officially, of course) */

define(function(require,module,exports){
    var Scrollview = require('famous/views/Scrollview');
    var ViewSequence = require('famous/core/ViewSequence');
    var VELOCITY = 0; // default: No animation (i.e. the item isn't given any "swipe"-velocity when moved)
    
    /***********************************
     *   getIndex
     ************************************/
    Scrollview.prototype.getIndex = function () {
      return this._node.getIndex();
    };
    
    /***********************************
     *   goToIndex
     ************************************/
    Scrollview.prototype.goToIndex = function (i,velocity,position) {
        // if we're already there, don't move!
        if(i == this.getIndex()){
            console.log('at this index');
            return;
        }
        // create ViewSequence node at proper location
        var _ = this._node._;
        var node = new ViewSequence({
            _: _,
            index: i
        });
        // Animate the movement (default is no animation)
        if(velocity === undefined) velocity = VELOCITY;
        // If animated (i.e. velocity > 0), start at +/- height from the item, and swipe towards proper position (0);
        if(position === undefined) position = velocity > 0? this._node.getSize()[this.options.direction]: 0;
        // We're swiping from the top, start before (negative height) and swipe down (positive velocity)
        position = -1.0 * position;
        // Unless we're swiping from the bottom, then we reverse position/velocity;
        if(i < this.getIndex()) {
            velocity = -1.0 * velocity;
            position = -1.0 * position;
        }        
        // Set the Scrollview
        this.sequenceFrom(node);
        // Position a little bit away from the element
        this.setPosition(position);
        // And swipe from there -- (and hope that scrollview ends in the right position - it's a bit of guesswork...)
        this.setVelocity(velocity);
    };

    /***********************************
     *   goToFirst
     ************************************/
    Scrollview.prototype.goToFirst = function (velocity,position) {
        this.goToIndex(this._node._.firstIndex,velocity,position);
    };

    /***********************************
     *   goToLast
     ************************************/
    Scrollview.prototype.goToLast = function (velocity,position) {
        var _ = this._node._;
        var index = _.firstIndex + _.array.length - 1;
        this.goToIndex(index,position,velocity);
    };
});