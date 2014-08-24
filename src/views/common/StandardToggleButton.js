/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define(function(require, exports, module) {
    var Surface = require('famous/core/Surface');
    var EventHandler = require('famous/core/EventHandler');
    var RenderController = require('famous/views/RenderController');

    var StateModifier = require('famous/modifiers/StateModifier');

    /**
     * A view for transitioning between two surfaces based
     *  on a 'on' and 'off' state
     *
     * @class TabBar
     * @extends View
     * @constructor
     *
     * @param {object} options overrides of default options
     */
    function StandardToggleButton(options) {
        this.options = {
            content: '',
            offClasses: ['off'],
            onClasses: ['on'],
            size: undefined,
            outTransition: {curve: 'easeInOut', duration: 300},
            inTransition: {curve: 'easeInOut', duration: 300},
            toggleMode: StandardToggleButton.TOGGLE,
            crossfade: true
        };

        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);

        this.offSurface = new Surface();
        this.offSurface.on('click', function() {
            if (this.options.toggleMode !== StandardToggleButton.OFF) this.select();
        }.bind(this));
        this.offSurface.pipe(this._eventOutput);

        this.onSurface = new Surface();
        this.onSurface.on('click', function() {
            if (this.options.toggleMode !== StandardToggleButton.ON) this.deselect();
        }.bind(this));
        this.onSurface.pipe(this._eventOutput);

        
        if(1==1){
            this.StateModifier = new StateModifier();
        }

        this.arbiter = new RenderController({
            overlap : this.options.crossfade
        });

        this.deselect();

        if (options) this.setOptions(options);
    }

    StandardToggleButton.OFF = 0;
    StandardToggleButton.ON = 1;
    StandardToggleButton.TOGGLE = 2;

    /**
     * Transition towards the 'on' state and dispatch an event to
     *  listeners to announce it was selected
     *
     * @method select
     */
    StandardToggleButton.prototype.select = function select(triggerEvent) {
        triggerEvent = triggerEvent === undefined ? true : triggerEvent;
        this.selected = true;
        this.arbiter.show(this.onSurface, this.options.inTransition);
//        this.arbiter.setMode(StandardToggleButton.ON, this.options.inTransition);
        if(triggerEvent){
            this._eventOutput.emit('select');
        } else {
            console.log('Not triggered event for ToggleButton');
        }
    };

    /**
     * Transition towards the 'off' state and dispatch an event to
     *  listeners to announce it was deselected
     *
     * @method deselect
     */
    StandardToggleButton.prototype.deselect = function deselect() {
        this.selected = false;
        this.arbiter.show(this.offSurface, this.options.outTransition);
        this._eventOutput.emit('deselect');
    };

    /**
     * Return the state of the button
     *
     * @method isSelected
     *
     * @return {boolean} selected state
     */
    StandardToggleButton.prototype.isSelected = function isSelected() {
        return this.selected;
    };

    /**
     * Override the current options
     *
     * @method setOptions
     *
     * @param {object} options JSON
     */
    StandardToggleButton.prototype.setOptions = function setOptions(options) {
        if (options.content !== undefined) {
            this.options.content = options.content;
            this.offSurface.setContent(this.options.content);
            this.onSurface.setContent(this.options.content);
        }
        if (options.offClasses) {
            this.options.offClasses = options.offClasses;
            this.offSurface.setClasses(this.options.offClasses);
        }
        if (options.onClasses) {
            this.options.onClasses = options.onClasses;
            this.onSurface.setClasses(this.options.onClasses);
        }
        if (options.size !== undefined) {
            this.options.size = options.size;
            this.onSurface.setSize(this.options.size);
            this.offSurface.setSize(this.options.size);
        }
        if (options.toggleMode !== undefined) this.options.toggleMode = options.toggleMode;
        if (options.outTransition !== undefined) this.options.outTransition = options.outTransition;
        if (options.inTransition !== undefined) this.options.inTransition = options.inTransition;
        if (options.crossfade !== undefined) {
            this.options.crossfade = options.crossfade;
            this.arbiter.setOptions({overlap: this.options.crossfade});
        }
    };

    /**
     * Return the size defined in the options object
     *
     * @method getSize
     *
     * @return {array} two element array [height, width]
     */
    StandardToggleButton.prototype.getSize = function getSize() {
        return this.options.size;
    };

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {number} Render spec for this component
     */
    StandardToggleButton.prototype.render = function render() {
        return this.arbiter.render();
    };

    module.exports = StandardToggleButton;
});
