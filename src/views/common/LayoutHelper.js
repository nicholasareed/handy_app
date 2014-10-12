define(function(require, exports, module) {


    var Scene = require('famous/core/Scene');
    var Surface = require('famous/core/Surface');
    var RenderNode = require('famous/core/RenderNode');
    var Transform = require('famous/core/Transform');
    var View = require('famous/core/View');

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
    var tinycolor           = require('lib2/tinycolor');
    var spectrum            = require('lib2/spectrum');

    var BoxLayout = require('famous-boxlayout');

    function LayoutHelper(options) {
        var that = this;
        View.apply(this, arguments);

        // accepts a dictionary and returns correct layout?
        // - LayoutHelper? 

        // parse options to build correct type of Form element
        switch(options.type){

            case 'surface':
                this.createSurface(options);
                break;

            default:
                console.error('missing Type of input (required)');
                break;
        }

    }

    LayoutHelper.prototype = Object.create(View.prototype);
    LayoutHelper.prototype.constructor = LayoutHelper;

    LayoutHelper.DEFAULT_OPTIONS = {
        
    };


    LayoutHelper.prototype.createSurface = function(opts) {
        var that = this;



        // NOT READY YET


        return;

        // Inputs
        var inputSurface = new Surface(opts);

        // Build Margins
        var boxLayout = new BoxLayout({ margins: opts.margins });
        boxLayout.middleAdd(inputSurface);

        inputSurface.View = new View();
        inputSurface.View.StateModifier = new StateModifier();
        inputSurface.View.add(inputSurface.View.StateModifier).add(boxLayout);

        if(opts.form){

            inputSurface.on('focus', function(){
                var myIndex = opts.form._formScrollView.Views.indexOf(that);
                console.log(opts.form._formScrollView.Views);
                console.log(inputSurface.View);
                console.log(myIndex);
                console.log(opts.form._formScrollView);
                opts.form._formScrollView.goToIndex(myIndex,0,60);
            });

            inputSurface.pipe(opts.form._formScrollView);
        }

        this._value = function(){
            return inputSurface.getValue();
        };

        this._setContent = function(data){
            inputSurface.setContent(data);
        };

        this.add(inputSurface.View);

    };

    module.exports = LayoutHelper;
});