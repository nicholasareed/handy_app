define(function(require, exports, module) {

    var Timer               = require('famous/utilities/Timer');
    var View               = require('famous/core/View');
    var StandardHeader               = require('views/common/StandardHeader');

    function StandardPageView(options) {
        View.apply(this, arguments);
    }

    StandardPageView.prototype = Object.create(View.prototype);
    StandardPageView.prototype.constructor = StandardPageView;

    StandardPageView.prototype.keyboardHandler = function(showing){
        var that = this;
        // standard header
        if(this.header && this.header instanceof StandardHeader){
            this.header.keyboardShowHide(showing);
        };

        // Layout
        // - expecting a HeaderFooterLayout
        if(this.layout){
            Timer.setTimeout(function(){
                that.layout.keyboardShowHide(showing);
            },250);
        }
    };

    StandardPageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){
                    default:
                        break;
                }
                break;
            case 'showing':
                switch(otherViewName){
                    default:
                        break;
                }
                break;
            default:
                break;
        }

        return transitionOptions;
    };


    StandardPageView.DEFAULT_OPTIONS = {
    };

    module.exports = StandardPageView;
});
