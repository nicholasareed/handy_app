/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define(function(require, exports, module) {
    var EventHandler = require('famous/core/EventHandler');

    var Timer = require('famous/utilities/Timer');

    var timeToWait = 300;

    /**
     * Helper to PinchSync, RotateSync, and ScaleSync.  Generalized handling of
     *   two-finger touch events.
     *   This class is meant to be overridden and not used directly.
     *
     * @class LongTapSync
     * @constructor
     */
    function LongTapSync() {
        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();

        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this._eventInput.on('mousedown', this.handleStart.bind(this));
        this._eventInput.on('mousemove', this.handleMove.bind(this));
        // this._eventInput.on('mouseend', this.handleEnd.bind(this));
        this._eventInput.on('mouseup', this.handleEnd.bind(this));
        this._eventInput.on('mouseout', this.handleCancel.bind(this));

        this._eventInput.on('touchstart', this.handleStart.bind(this));
        this._eventInput.on('touchmove', this.handleMove.bind(this));
        this._eventInput.on('touchend', this.handleEnd.bind(this));
        this._eventInput.on('touchcancel', this.handleCancel.bind(this));
    }


    // private
    LongTapSync.prototype.handleStart = function handleStart(event) {
        var that = this;
        var now = (new Date()).getTime();
        this._now = now + 0;
        this.longTapped = false;
        this.started = true;

        Timer.setTimeout(function(){
            if(that._now == now && this.longTapped !== true){
                that._eventInput.trigger('touchmove', null);
            }
        },timeToWait+1);

    };

    // private
    LongTapSync.prototype.handleMove = function handleMove(event) {
        if(!this.started || this.longTapped === true){
            return;
        }
        var now = (new Date()).getTime();
        var diff = now - this._now;
        if(diff > timeToWait){
            console.log('longtap1');
            this.longTapped = true;
            this._eventOutput.emit('longtap', {
                event : event,
                // surface   : this
            });
            this._eventOutput.emit('hold', {
                event : event,
                // surface   : this
            });
        }
    };

    // private
    LongTapSync.prototype.handleEnd = function handleEnd(event) {
        if(!this.started || this.longTapped === true){
            return;
        }
        var now = (new Date()).getTime();
        var diff = now - this._now;
        if(diff > timeToWait){
            console.log('longtap2');
            this.longTapped = true;
            this._eventOutput.emit('longtap', {
                event : event,
                // surface   : this
            });
        }
        this.started = false;

    };

    // private
    LongTapSync.prototype.handleCancel = function handleEnd(event) {
        this.longTapped = false;
        this.started = false;
    };

    module.exports = LongTapSync;
});
