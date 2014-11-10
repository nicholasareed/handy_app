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

    /**
     * A Famo.us surface in the form of an HTML input element.
     *   This extends the Surface class.
     *
     * @class SelectInputSurface
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     * @param {string} [options.placeholder] placeholder text hint that describes the expected value of an <input> element
     * @param {string} [options.type] specifies the type of element to display (e.g. 'datetime', 'text', 'button', etc.)
     * @param {string} [options.value] value of text
     */
    function SelectInputSurface(options) {
        this._placeholder = options.placeholder || '';
        this._id          = options.id || '';
        this._value       = options.value || '';
        this._type        = options.type || 'text';
        this._name        = options.name || '';
        this._attr        = options.attr || {};

        Surface.apply(this, arguments);

        this.on('click', this.focus.bind(this));
        window.addEventListener('click', function(event) {
            if (event.target !== this._currTarget) this.blur();
        }.bind(this));
    }
    SelectInputSurface.prototype = Object.create(Surface.prototype);
    SelectInputSurface.prototype.constructor = SelectInputSurface;

    SelectInputSurface.prototype.elementType = 'select';
    SelectInputSurface.prototype.elementClass = 'famous-surface';

    /**
     * Set placeholder text.  Note: Triggers a repaint.
     *
     * @method setPlaceholder
     * @param {string} str Value to set the placeholder to.
     * @return {SelectInputSurface} this, allowing method chaining.
     */
    SelectInputSurface.prototype.setPlaceholder = function setPlaceholder(str) {
        this._placeholder = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Focus on the current input, pulling up the keyboard on mobile.
     *
     * @method focus
     * @return {SelectInputSurface} this, allowing method chaining.
     */
    SelectInputSurface.prototype.focus = function focus() {
        if (this._currTarget) this._currTarget.focus();
        return this;
    };

    /**
     * Blur the current input, hiding the keyboard on mobile.
     *
     * @method blur
     * @return {SelectInputSurface} this, allowing method chaining.
     */
    SelectInputSurface.prototype.blur = function blur() {
        if (this._currTarget) this._currTarget.blur();
        return this;
    };

    /**
     * Set the placeholder conent.
     *   Note: Triggers a repaint next tick.
     *
     * @method setValue
     * @param {string} str Value to set the main input value to.
     * @return {SelectInputSurface} this, allowing method chaining.
     */
    SelectInputSurface.prototype.setValue = function setValue(str) {
        this._value = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Set the name attribute of the element.
     *   Note: Triggers a repaint next tick.
     *
     * @method setName
     * @param {string} str element name
     * @return {SelectInputSurface} this, allowing method chaining.
     */
    SelectInputSurface.prototype.setName = function setName(str) {
        this._name = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Get the name attribute of the element.
     *
     * @method getName
     * @return {string} name of element
     */
    SelectInputSurface.prototype.getName = function getName() {
        return this._name;
    };


    SelectInputSurface.prototype.setId = function setId(str) {
        this._id = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Get the name attribute of the element.
     *
     * @method getName
     * @return {string} name of element
     */
    SelectInputSurface.prototype.getId = function getId() {
        return this._id;
    };



    /**
     * Place the document element this component manages into the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    SelectInputSurface.prototype.deploy = function deploy(target) {
        if (this._placeholder !== '') target.placeholder = this._placeholder;
        // if(this._id != '') target._id = this._id;
        target.value = this._value;
        target.type = this._type;
        target.name = this._name;

        var that = this;
        Object.keys(this._attr).forEach((function(key){
            target.setAttribute(key, that._attr[key]);
        }).bind(this));

    };

    module.exports = SelectInputSurface;
});
