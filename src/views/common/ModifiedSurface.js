define(function(require, exports, module) {
    var Surface            = require('famous/core/Surface');
    var Modifier           = require('famous/core/Modifier');
    var Transform          = require('famous/core/Transform');
    var View               = require('famous/core/View');

    var Utils = require('utils');
    
    function ModifiedSurface(options) {
        Surface.apply(this, arguments);
    }

    ModifiedSurface.prototype = Object.create(Surface.prototype);
    ModifiedSurface.prototype.constructor = ModifiedSurface;

    ModifiedSurface.DEFAULT_OPTIONS = {
    };

    ModifiedSurface.prototype.deploy = function deploy(target) {
        var content = this.getContent();

        if (content instanceof Node) {
            while (target.hasChildNodes()) target.removeChild(target.firstChild);
            target.appendChild(content);
        }
        else target.innerHTML = content;

        if(this.size_x === true){
            this.size[0] = target.scrollWidth;
        }
        if(this.size_y === true){
            this.size[1] = target.scrollHeight;
        }
    };

    module.exports = ModifiedSurface;
});
