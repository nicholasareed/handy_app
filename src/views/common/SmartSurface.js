define(function (require, exports, module) {
var Surface = require('famous/core/Surface');

function SmartSurface(options) {
    Surface.apply(this, arguments);
    this._superDeploy = Surface.prototype.deploy;
}

SmartSurface.prototype = Object.create(Surface.prototype);
SmartSurface.prototype.constructor = SmartSurface;

SmartSurface.prototype.deploy = function deploy(target) {
    this._superDeploy(target);
    var size = this.size; //this.getSize() return _size, which we don't want
    var width = size[0] === true ? target.offsetWidth : size[0];
    var height = size[1] === true ? target.offsetHeight : size[1];
    
    console.log(this.size, [width, height]);

    this._size = [width, height];
    this.setSize([width, height]);

    this._eventOutput.emit('deploy2');
};

module.exports = SmartSurface;
});