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
    var tinycolor           = require('lib2/tinycolor');
    var spectrum            = require('lib2/spectrum');

    var BoxLayout = require('famous-boxlayout');

    function FormHelper(options) {
        var that = this;
        View.apply(this, arguments);

        // accepts a dictionary and returns correct layout?
        // - LayoutHelper? 

        // parse options to build correct type of Form element
        switch(options.type){

            case 'form':
                this.createFormContainer(options);
                break;

            case 'submit':
                this.createSubmitInput(options);
                break;

            case 'color':
                this.createColorPicker(options);
                break;

            case 'email':
            case 'number':
            case 'zipcode':
            case 'password':
            case 'text':
            case 'textarea':
                this.createInput(options);
                break;

            default:
                console.error('missing Type of input (required)');
                break;
        }

    }

    FormHelper.prototype = Object.create(View.prototype);
    FormHelper.prototype.constructor = FormHelper;

    FormHelper.DEFAULT_OPTIONS = {
        
    };

    FormHelper.prototype.createFormContainer = function(opts){

        var planeMod = new StateModifier();
        if(opts.planeMod){
            planeMod = opts.planeMod;
        }

        // Form Container
        var FormContainer = new FormContainerSurface();
        var FormNode = FormContainer.add(planeMod);

        // prevent submit from actually submitting the form
        FormContainer.on('submit', function(ev){
            ev.preventDefault();
            ev.stopPropagation();
            return false;
        });

        // Add ScrollView/SequentialLayout to FormContainer for holding Inputs Surfaces

        // create the scrollView of content
        var contentScrollView;
        if(opts.scroll){
            contentScrollView = new ScrollView();
        } else {
            contentScrollView = new SequentialLayout();
        }
        contentScrollView.scroll = opts.scroll;

        contentScrollView.Views = [];

        // sequenceFrom
        contentScrollView.sequenceFrom(contentScrollView.Views);

        // background if necessary
        if(opts.bg){
            var bgClasses = ['form-bg-default'];
            if(opts.bg !== true){
                bgClasses = opts.bg
            }
            this._bg = new View();
            this._bg.Surface = new Surface({
                size: [undefined, undefined],
                classes: bgClasses
            });
            this._bg.Surface.pipe(contentScrollView);
            this._bg.SizeMod = new Modifier({
                size: function(){
                    // console.log(FormNode.getSize());
                    // console.log(FormNode.getSize(true));
                    // console.log(contentScrollView);
                    // console.log(contentScrollView.getSize());
                    // debugger;
                    // console.log(contentScrollView._trueSize);
                    return [undefined, contentScrollView.getSize() ? contentScrollView.getSize()[1]+20 : undefined]
                }
            });
            this._bg.add(this._bg.SizeMod).add(this._bg.Surface);
            FormNode.add(Utils.Z(1)).add(this._bg);
        }

        this._form = FormNode;
        this._formScrollView = contentScrollView;

        FormNode.add(Utils.Z(10)).add(contentScrollView);

        this.add(FormNode);

        this.getSize = function(){
            // console.log('contentScrollView getSize', contentScrollView.getSize());
            // console.log(contentScrollView);
            return contentScrollView.getSize();
        };

    };

    FormHelper.prototype.addInputsToForm = function(inputsArray){
        var that = this;
        inputsArray.forEach(function(view){
            that._formScrollView.Views.push(view);
        });

        that._formScrollView.sequenceFrom(that._formScrollView.Views);
    };

    FormHelper.prototype.createInput = function(opts) {
        var that = this;

        // Inputs
        var inputSurface;
        if(opts.type == 'textarea'){
            inputSurface = new TextareaSurface({
                name: opts.name,
                placeholder: opts.placeholder,
                size: opts.size ? opts.size : [undefined, true],
                value: opts.value,
                attr: opts.attr || {},
                classes: opts.classes || ['textarea-default'],
                properties: opts.properties || {},
            });
        } else {
            inputSurface = new InputSurface({
                name: opts.name,
                placeholder: opts.placeholder,
                type: opts.type,
                size: opts.size ? opts.size : [undefined, true],
                value: opts.value,
                classes: opts.classes || [],
                properties: opts.properties || {},
                attr: opts.attr || {}
            });
        }
        this.Surface = inputSurface;

        // Build Margins
        var boxLayout = new BoxLayout({ margins: opts.margins });
        boxLayout.middleAdd(inputSurface);

        inputSurface.View = new View();
        inputSurface.View.StateModifier = new StateModifier();
        this.StateModifier = inputSurface.View.StateModifier;
        inputSurface.View.add(inputSurface.View.StateModifier).add(boxLayout);

        if(opts.form){

            inputSurface.on('focus', function(){
                var myIndex = opts.form._formScrollView.Views.indexOf(that);
                // console.log(opts.form._formScrollView.Views);
                // console.log(inputSurface.View);
                // console.log(myIndex);
                // console.log(opts.form._formScrollView);
                // if(App.KeyboardShowing != true && opts.form._formScrollView.goToIndex){
                if(opts.form._formScrollView.goToIndex){
                    opts.form._formScrollView.goToIndex(myIndex,0,60);
                }
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

    FormHelper.prototype.createColorPicker = function(opts){
        var that = this;

        // create id for color picker

        // var inputColorId = Utils.Base64.encode(this.model.get('_id') + new Date());
        // $('#' + inputColorId).waitUntilExists((function(){
        //     this.$('#' + inputColorId).spectrum();
        // }).bind(this));
    
        
        // // ContainerSurface
        // var Container = new ContainerSurface();

        // Color Picker
        var inputSurface = new InputSurface({
            name: opts.name,
            placeholder: opts.placeholder,
            type: opts.type,
            size: opts.size ? opts.size : [undefined, true],
            value: opts.value
        });
        if(opts.form){
            inputSurface.pipe(opts.form._formScrollView);
        }

        // Build Margins
        var boxLayout = new BoxLayout({ margins: opts.margins });
        boxLayout.middleAdd(inputSurface, {
            container: true
        });

        inputSurface.on('deploy', function(){
            console.log(this);
            console.log(this._currentTarget);
            // debugger;
            // $(this._currentTarget).spectrum({
            //     flat: true,
            //     showButtons: false,
            //     replacerClassName: 'awesome22222222222222'
            // });
        });


        inputSurface.View = new View();
        // inputSurface.View.getSize = function(){
        //     console.log(boxLayout.getSize(true));
        //     return boxLayout.getSize();
        // };
        // inputSurface.View.add(boxLayout);
        // inputSurface.View.add(inputSurface);
        inputSurface.View.StateModifier = new StateModifier();
        this.StateModifier = inputSurface.View.StateModifier;
        inputSurface.View.add(inputSurface.View.StateModifier).add(boxLayout).add(boxLayout);

        if(opts.form){

            // inputSurface.on('focus', function(){
            //     var myIndex = opts.form._formScrollView.Views.indexOf(that);
            //     console.log(opts.form._formScrollView.Views);
            //     console.log(inputSurface.View);
            //     console.log(myIndex);
            //     console.log(opts.form._formScrollView);
            //     opts.form._formScrollView.goToIndex(myIndex,0,60);
            // });

            inputSurface.pipe(opts.form._formScrollView);
        }

        this._value = function(){
            return inputSurface.getValue();
        };

        this.getColor = function(){
            return tinycolor(inputSurface.getValue().toString());
        };

        this._setContent = function(data){
            inputSurface.setContent(data);
        };

        this.add(inputSurface.View);

    };

    FormHelper.prototype.createSubmitInput = function(opts) {

        // Submit button
        var submitButtonSurface = new SubmitInputSurface({
            value: opts.value,
            size: [undefined, true],
            classes: opts.classes || ['form-button-submit-default']
        });
        submitButtonSurface.View = new View();
        submitButtonSurface.View.StateModifier = new StateModifier();
        this.StateModifier = submitButtonSurface.View.StateModifier;

        if(opts.form){
            submitButtonSurface.pipe(opts.form._formScrollView);
        }

        // Build Margins
        var boxLayout = new BoxLayout({ margins: opts.margins });
        boxLayout.middleAdd(submitButtonSurface);

        submitButtonSurface.View.add(submitButtonSurface.View.StateModifier).add(boxLayout);
        // this.contentScrollView.Views.push(this.submitButtonSurface.View);

        this._setContent = function(data){
            submitButtonSurface.setValue(data);
        };

        // callback already specified for click?
        if(opts.click){
            submitButtonSurface.on('click', opts.click);
        }

        // emit event
        submitButtonSurface.on('click', this._eventOutput.emit('click'));

        this.add(submitButtonSurface.View);

    };

    FormHelper.prototype.getValue = function(){
        return this._value();
    };

    FormHelper.prototype.setContent = function(data){
        return this._setContent(data);
    };

    // FormHelper.prototype.getSize = function(){
    //     console.log('formhelper getsize');
    //     return this._size ? this._size : [undefined, undefined];
    // };

    module.exports = FormHelper;
});