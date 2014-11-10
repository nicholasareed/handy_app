define(function(require, exports, module) {


    var Scene = require('famous/core/Scene');
    var Surface = require('famous/core/Surface');
    var RenderNode = require('famous/core/RenderNode');
    var Transform = require('famous/core/Transform');
    var View = require('famous/core/View');

    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');

    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var TextareaSurface = require('famous/surfaces/TextareaSurface');
    var SubmitInputSurface = require('famous/surfaces/SubmitInputSurface');

    var ContainerSurface = require('famous/surfaces/ContainerSurface');
    var FormContainerSurface = require('famous/surfaces/FormContainerSurface');

    var Timer = require('famous/utilities/Timer');
    var Utils = require('utils');

    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var ScrollView = require('famous/views/Scrollview');

    var $ = require('jquery');
    var _ = require('underscore');
    var tinycolor           = require('lib2/tinycolor');
    var spectrum            = require('lib2/spectrum');

    var BoxLayout = require('famous-boxlayout');

    function LayoutBuilder(options) {
        var that = this;
        View.apply(this, arguments);

        // accepts a dictionary and returns a built layout
        // - expectecting references/names for all items passed in (Surfaces, etc.)

        // Size modifier?
        // - wrap in a rendernode
        // - if String, then using a Modifier function

        var node; // the RenderNode (with size modifier) that gets returned!
        var returnNode; // node that gets wrapped by size
        var name;

        // maybe passing in a famous-like element already?, that just needs a name?

        // "extract" out the keys we might want to use

        // What type are we going to use?
        if(options.surface){
            // EXPECTING a title/key to be here
            name = _.without(Object.keys(options.surface),'click','pipe')[0];
            console.log('name', name);
            node = options.surface[name];

            if(options.surface.click){
                node.on('click', options.surface.click);
            }
            if(options.surface.pipe){
                node.pipe(options.surface.pipe);
            }

            return node;
        } else if(options.flexible){
            name = 'flexible';
            returnNode = this.createFlexibleLayout(options.flexible);
        } else if(options.sequential){
            name = 'sequential';
            returnNode = this.createSequentialLayout(options.sequential);
        } else if(options.controller){

        } else if(options.flipper){

        } else {
            console.error('missing type of Layout to build');
            debugger;
        }

        // set the size (can handle a bunch of passed-in sizes)
        // - functions, string, etc.
        
        if(options.size){
            if(options.size instanceof Function){
                node = new RenderNode(new Modifier({
                    size: options.size
                }));
            } else if(options.size instanceof String){
                node = new RenderNode(new Modifier({
                    size: function(){
                        return returnNode.getSize();
                    }
                }));
            } else {
                node = new RenderNode(new Modifier({
                    size: function(){
                        var w = options.size[0],
                            h = options.size[1];
                        if(options.size[0] instanceof String){
                            w = returnNode.getSize()[0];
                        }
                        if(options.size[1] instanceof String){
                            h = returnNode.getSize()[1];
                        }
                        return [w, h];
                    }
                }));
            }

        } else {
            // build our own size
            node = new RenderNode(new Modifier({
                size: function(val){
                    // console.log(returnNode);
                    // console.log(options);
                    return returnNode.getSize ? returnNode.getSize(val) : [undefined, undefined];
                }
            }));
        }

        node[name] = returnNode;
        node.add(returnNode);

        return node;

    }

    LayoutBuilder.prototype = Object.create(View.prototype);
    LayoutBuilder.prototype.constructor = LayoutBuilder;

    LayoutBuilder.prototype.createFlexibleLayout = function(options){
        var that = this;

        var tmp = new FlexibleLayout({
            direction: options.direction,
            ratios: options.ratios
        });
        tmp.Views = [];

        // sequenceFrom
        options.sequenceFrom.forEach(function(obj){

            if((typeof obj).toLowerCase() == 'object'){

                // // obj passed in, by name to reference it
                // // - the ONLY key!!
                // // - Surface, etc.
                var key = Object.keys(obj)[0];
                var name = Object.keys(obj[key])[0];
                // var tmpNode = obj[key];
                // if(tmpNode instanceof String){
                //     // what else could somebody pass in?
                // } else {
                //     // expecting a RenderNode or other Famous-like node-thing
                //     tmp[key] = tmpNode;
                // }
                // var tmpObj = {
                //     surface: tmpNode;
                // };
                var tmpNode = new LayoutBuilder(obj);
                tmp[name] = tmpNode;
                // tmp[key] = tmpNode;

            } else {
                // Using a famous-node element
                // - probably for prototyping quickly
                console.log('famous-like element?', obj);
                var tmpNode = obj;
            }

            console.info('tmpNode', tmpNode);
            tmp.Views.push(tmpNode);
        });

        tmp.sequenceFrom(tmp.Views);

        // constantly reset the ratios?
        // Timer.setInterval(function(){
        //     // check if actually displayed?
        //     tmp.setRatios(tmp.options.ratios);
        // },16);

        return tmp;

    };

    LayoutBuilder.prototype.createSequentialLayout = function(options){
        var that = this;

        var tmp = new SequentialLayout({
            // ratios: options.ratios
        });
        tmp.Views = [];

        // sequenceFrom
        options.sequenceFrom.forEach(function(obj){

            if((typeof obj).toLowerCase() == 'object'){

                var key = Object.keys(obj)[0];
                var name = Object.keys(obj[key])[0];
                var tmpNode = new LayoutBuilder(obj);
                tmp[name] = tmpNode;

                // tmp[key] = tmpNode;

            } else {
                // Using a famous-node element
                // - probably for prototyping quickly
                console.log('famous-like element?', obj);
                var tmpNode = obj;
            }

            console.info('tmpNode', tmpNode);
            tmp.Views.push(tmpNode);
        });

        tmp.sequenceFrom(tmp.Views);

        return tmp;

    };

    LayoutBuilder.prototype.createScrollviewLayout = function(options){
        var that = this;

        var tmp = new ScrollView({
            // ratios: options.ratios
        });
        tmp.Views = [];

        // sequenceFrom
        options.sequenceFrom.forEach(function(obj){

            if((typeof obj).toLowerCase() == 'object'){

                var key = Object.keys(obj)[0];
                var name = Object.keys(obj[key])[0];
                var tmpNode = new LayoutBuilder(obj);
                tmp[name] = tmpNode;

                // tmp[key] = tmpNode;

            } else {
                // Using a famous-node element
                // - probably for prototyping quickly
                console.log('famous-like element?', obj);
                var tmpNode = obj;
            }

            console.info('tmpNode', tmpNode);
            tmp.Views.push(tmpNode);
        });

        tmp.sequenceFrom(tmp.Views);

        return tmp;

    };

    LayoutBuilder.DEFAULT_OPTIONS = {
        
    };

    module.exports = LayoutBuilder;
});