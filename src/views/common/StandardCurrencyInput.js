/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define(function(require, exports, module) {
    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');
    var View = require('famous/core/View');
    var Surface = require('famous/core/Surface');

    var StateModifier = require('famous/modifiers/StateModifier');

    var LayoutBuilder = require('./LayoutBuilder');
    var numeral = require('numeral');

    var Utils = require('utils');

    /**
     * A view for displaying various tabs that dispatch events
     *  based on the id of the button that was clicked
     *
     * @class StandardCurrencyInput
     * @extends View
     * @constructor
     *
     * @param {object} options overrides of default options
     */
    function StandardCurrencyInput(options) {
        View.apply(this, arguments);
        this.options = options;

        this.layout = new View();
        this.layout.SizeMod = new StateModifier({
            size: [undefined, 437]
        });

        this._currencyAmount = 0;
        this._currencyInput = '';
        this._currencyDisplay = numeral(this._currency).format('$0,0.00');

        this.buildCurrencyInput();

        this.layout.add(this.layout.SizeMod).add(this.outline.View);
        this._add(this.layout);

        // this._optionsManager.on('change', _updateOptions.bind(this));
    }

    StandardCurrencyInput.prototype = Object.create(View.prototype);
    StandardCurrencyInput.prototype.constructor = StandardCurrencyInput;

    StandardCurrencyInput.prototype.buildCurrencyInput = function(){
        var that = this;

        this.TitleView = new Surface({
            content: this.options.title,
            size: [undefined, true],
            wrap: '<div class="ellipsis-all"></div>',
            classes: ['currency-input-title']
        });

        this.DisplayView = new LayoutBuilder({
            size: [undefined, 80],
            flexible: {
                direction: 0,
                ratios: [true, 1],
                sequenceFrom: [{
                    surface: {
                        key: 'Type',
                        surface: new Surface({
                            content: 'USD',
                            // wrap: '<div class="ellipsis-all"></div>',
                            size: [60, undefined],
                            classes: ['currency-input-type']
                        }),
                        click: function(){
                            // change type of currency
                        }
                    }
                },{
                    surface: {
                        key: 'Amount',
                        surface: new Surface({
                            content: '$0.00',
                            wrap: '<div class="ellipsis-all"></div>',
                            size: [undefined, undefined],
                            classes: ['currency-input-amount']
                        }),
                        click: function(){
                            // change type of currency
                        }
                    }
                },{
                    surface: {
                        key: 'Delete',
                        surface: new Surface({
                            content: '&lt;',
                            // wrap: '<div class="ellipsis-all"></div>',
                            size: [80, undefined],
                            classes: ['currency-input-delete']
                        }),
                        click: function(){
                            // change type of currency
                            // - delete last value
                            that.removeLast();
                        }
                    }
                }]
            }
        });
    

        this.createNumbersAndButtons();

        this.ButtonsView = new LayoutBuilder({
            size: [undefined, 300],
            grid: {
                dimensions: [3,4],
                sequenceFrom: this.NumberButtonViews
            }
        });

        this.spacer = new Surface({
            content: '',
            size: [undefined, undefined]
        });

        this.outline = new LayoutBuilder({
            size: [undefined, undefined],
            sequential: {
                direction: 1, // vertical
                // ratios: [1, true, true], // beginning is just dead space, to make sure it is bottom-aligned
                sequenceFrom: [
                    // this.spacer,
                    this.TitleView,
                    this.DisplayView,
                    this.ButtonsView
                ]
            }
        });

        this.outline.View = new View();
        this.outline.Bg = new Surface({
            size: [undefined, undefined],
            classes: ['currency-input-bg']
        });
        this.outline.View.add(Utils.Z(10)).add(this.outline.Bg);
        this.outline.View.add(Utils.Z(20)).add(this.outline);

        // this.outline.Views = [];
        // this.outline.sequential.sequenceFrom(this.outline.Views);

    };

    StandardCurrencyInput.prototype.removeLast = function(){
        var that = this;

        // See if we can add this to the number, if it does anything useful
        that._currencyInput = that._currencyInput.substr(0,that._currencyInput.length-1);
        that.reDisplay();

    };

    StandardCurrencyInput.prototype.reDisplay = function(){
        var that = this;

        var tmp = this._currencyInput;
        if(this._currencyInput.length == 1){
            tmp = '.0' + tmp;
        } else if(this._currencyInput.length == 2){
            tmp = '.' + tmp;
        } else if(this._currencyInput.length > 2){
            tmp = this._currencyInput.substr(0,this._currencyInput.length - 2) + '.' + this._currencyInput.substr(-2);
        }

        // console.log(this.DisplayView);
        console.log(this._currencyInput);
        console.log(tmp);

        this._currencyAmount = numeral(tmp).format('0.00');

        this.DisplayView.flexible.Amount.setContent(numeral(tmp).format('$0,0.00'));


    };


    StandardCurrencyInput.prototype.createNumbersAndButtons = function(){
        var that = this;

        this.NumberButtonViews = [];

        var currentNum = '';

        var numberPressed = function(){
            console.log("number pressed");
            // See if we can add this to the number, if it does anything useful
            that._currencyInput = that._currencyInput + this.Number;
            that.reDisplay();
        };

        var basicNumberSurfaces = _.map(_.range(10), function(num){

            var surf = new Surface({
                content: '' + (num === 9 ? 0 : (num + 1)),
                wrap: '<div></div>',
                classes: ['currency-input-number']
            });
            surf.on('click', numberPressed);
            surf.Number = '' + (num === 9 ? 0 : (num + 1)); // 0 if 10

            that.NumberButtonViews.push(surf);
        });

        // Add our last two surfaces
        // - save and cancel

        // Back/Cancel
        this.backSurface = new Surface({
            content: '<i class="icon ion-arrow-left-b"></i>',
            classes: ['currency-input-button']
        });
        this.backSurface.on('click', function(){
            // Any left to erase?
            if(that._currencyInput.length == 0){
                that._eventOutput.emit('cancel');
                return;
            }
            that.removeLast();
        });
        this.NumberButtonViews.splice(this.NumberButtonViews.length-1,0,this.backSurface); // splice in front of "0"

        // Save
        this.saveSurface = new Surface({
            content: '<i class="icon ion-checkmark-circled"></i>',
            classes: ['currency-input-button']
        });
        this.saveSurface.on('click', function(){
            that._eventOutput.emit('done', that._currencyAmount);
        });
        this.NumberButtonViews.push(this.saveSurface);


    };

    StandardCurrencyInput.DEFAULT_OPTIONS = {
        currency: 'usd',
        size: [300, 437] // standard size
    };


    module.exports = StandardCurrencyInput;
});
