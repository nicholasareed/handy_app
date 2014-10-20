/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Views
    var StandardPageView = require('views/common/StandardPageView');
    var StandardHeader = require('views/common/StandardHeader');
    var FormHelper = require('views/common/FormHelper');
    var BoxLayout = require('famous-boxlayout');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this._showing = false;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();
        
        // Attach to render tree
        this.add(this.layout);

        // Model
        this.model = App.Data.User;

        // // // Fetch
        // // this.model.fetch({prefill: true});

        // // Wait for model to get populated, then add the input surfaces
        // // - model should be ready immediately!
        // this.model.populated().then(function(){
        //     that.addSurfaces();
        //     Timer.setInterval(function(){
        //         if(that._showing){
        //             that.model.fetch();
        //         }
        //     },10000);
        // });


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;

        // create the header
        this.header = new StandardHeader({
            content: "Add Credit Card",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();//.history.go(-1);
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        this.form = new FormHelper({
            type: 'form',
            scroll: true,
            bg: true
        });

        // Add surfaces to content (buttons)
        this.addSurfaces();

        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(Utils.usePlane('content')).add(this.form);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        this.inputSaveName = new FormHelper({

            margins: [10,10],

            form: this.form,
            name: 'name',
            placeholder: 'Save Card As',
            type: 'text',
            value: ''
        });

        this.inputNumber = new FormHelper({

            margins: [10,10],

            form: this.form,
            placeholder: 'Credit Card Number',
            type: 'number',
            value: ''
        });

        this.inputExpMonth = new FormHelper({

            margins: [10,10],

            form: this.form,
            placeholder: '2-Digit Expiration Month',
            type: 'number',
            value: ''
        });

        this.inputExpYear = new FormHelper({

            margins: [10,10],

            form: this.form,
            placeholder: '2-Digit Expiration Year',
            type: 'number',
            value: ''
        });

        this.inputCvc = new FormHelper({

            margins: [10,10],

            form: this.form,
            placeholder: 'CVC Code (on back)',
            type: 'number',
            value: ''
        });

        this.inputZipcode = new FormHelper({

            margins: [10,10],

            form: this.form,
            placeholder: 'Billing Zipcode',
            type: 'number',
            value: ''
        });

        this.submitButton = new FormHelper({
            form: this.form,
            type: 'submit',
            value: 'Save Card',
            margins: [10,10],
            click: this.save_card.bind(this)
        });

        this.form.addInputsToForm([
            this.inputSaveName,
            this.inputNumber,
            this.inputExpMonth,
            this.inputExpYear,
            this.inputCvc,
            this.inputZipcode,
            this.submitButton
        ]);


        // // Card Name
        // this.inputNameSurface = new InputSurface({
        //     name: 'cardname',
        //     placeholder: 'Save Card As',
        //     type: 'text',
        //     size: [undefined, 50],
        //     value: ''
        // });
        // this.inputNameSurface.pipe(this.contentScrollView);
        // this.inputNameSurface.View = new View();
        // this.inputNameSurface.View.StateModifier = new StateModifier();
        // this.inputNameSurface.View.add(this.inputNameSurface.View.StateModifier).add(this.inputNameSurface);
        // this.contentScrollView.Views.push(this.inputNameSurface.View);

        // // Number
        // this.inputNumberSurface = new InputSurface({
        //     name: 'number',
        //     placeholder: 'Credit Card Number',
        //     type: 'text',
        //     size: [undefined, 50],
        //     value: ''
        // });
        // this.inputNumberSurface.pipe(this.contentScrollView);
        // this.inputNumberSurface.View = new View();
        // this.inputNumberSurface.View.StateModifier = new StateModifier();
        // this.inputNumberSurface.View.add(this.inputNumberSurface.View.StateModifier).add(this.inputNumberSurface);
        // this.contentScrollView.Views.push(this.inputNumberSurface.View);


        // // Month
        // this.inputMonthSurface = new InputSurface({
        //     name: 'month',
        //     placeholder: 'Expiration Month',
        //     type: 'text',
        //     size: [undefined, 50],
        //     value: ''
        // });
        // this.inputMonthSurface.pipe(this.contentScrollView);
        // this.inputMonthSurface.View = new View();
        // this.inputMonthSurface.View.StateModifier = new StateModifier();
        // this.inputMonthSurface.View.add(this.inputMonthSurface.View.StateModifier).add(this.inputMonthSurface);
        // this.contentScrollView.Views.push(this.inputMonthSurface.View);

        // // Year
        // this.inputYearSurface = new InputSurface({
        //     name: 'year',
        //     placeholder: 'Expiration Year',
        //     type: 'text',
        //     size: [undefined, 50],
        //     value: ''
        // });
        // this.inputYearSurface.pipe(this.contentScrollView);
        // this.inputYearSurface.View = new View();
        // this.inputYearSurface.View.StateModifier = new StateModifier();
        // this.inputYearSurface.View.add(this.inputYearSurface.View.StateModifier).add(this.inputYearSurface);
        // this.contentScrollView.Views.push(this.inputYearSurface.View);

        // // CVC
        // this.inputCvcSurface = new InputSurface({
        //     name: 'cvc',
        //     placeholder: 'CVC Code',
        //     type: 'text',
        //     size: [undefined, 50],
        //     value: ''
        // });
        // this.inputCvcSurface.pipe(this.contentScrollView);
        // this.inputCvcSurface.View = new View();
        // this.inputCvcSurface.View.StateModifier = new StateModifier();
        // this.inputCvcSurface.View.add(this.inputCvcSurface.View.StateModifier).add(this.inputCvcSurface);
        // this.contentScrollView.Views.push(this.inputCvcSurface.View);

        // // Zipcode
        // this.inputZipcodeSurface = new InputSurface({
        //     name: 'zipcode',
        //     placeholder: 'Zipcode',
        //     type: 'text',
        //     size: [undefined, 50],
        //     value: ''
        // });
        // this.inputZipcodeSurface.pipe(this.contentScrollView);
        // this.inputZipcodeSurface.View = new View();
        // this.inputZipcodeSurface.View.StateModifier = new StateModifier();
        // this.inputZipcodeSurface.View.add(this.inputZipcodeSurface.View.StateModifier).add(this.inputZipcodeSurface);
        // this.contentScrollView.Views.push(this.inputZipcodeSurface.View);


        // this.submitButtonSurface = new Surface({
        //     content: 'Save Card',
        //     size: [undefined, 60],
        //     classes: ['form-button-submit-default']
        // });
        // this.submitButtonSurface.View = new View();
        // this.submitButtonSurface.View.StateModifier = new StateModifier();
        // this.submitButtonSurface.View.add(this.submitButtonSurface.View.StateModifier).add(this.submitButtonSurface);
        // this.contentScrollView.Views.push(this.submitButtonSurface.View);

        // // Events for surfaces
        // this.submitButtonSurface.on('click', this.save_card.bind(this));

    };

    PageView.prototype.save_card = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;

        this.submitButton.setContent('Please Wait');

        // var $form = this.$('#credit-card-form');
        var creditCardData = {
            // name: $form.find('#name').val(),
            number: $.trim(this.inputNumber.getValue().toString()),
            exp_month: $.trim(this.inputExpMonth.getValue().toString()),
            exp_year: $.trim(this.inputExpYear.getValue().toString()),
            cvc: $.trim(this.inputCvc.getValue().toString()),
            address_zip: $.trim(this.inputZipcode.getValue().toString())
         };

        console.log(creditCardData);

         var card_save_name = $.trim(this.inputName.getValue().toString());
         var card_last4 = creditCardData.number.substr(-4,4);
         card_save_name = card_save_name.length > 0 ? card_save_name : creditCardData.card_number.substr(-4,4); // saved name or last 4

        console.log(card_save_name);

        Stripe.card.createToken(creditCardData, function(status, response){
            if(response.error){
                Utils.Popover.Alert(S(response.error.message));
                // Re-enable the button
                // that.$('.add-button').attr('disabled','disabled');
                that.checking = false;
                that.submitButton.setContent('Save Card');
                return;
            }

            $.ajax({
                url: Credentials.server_root + 'payment_source',
                cache: false,
                method: 'POST',
                data: {
                    type: 'card',
                    token: response.id,
                    cardid: response.card.id,
                    name: card_save_name,
                    last4: card_last4
                },
                success: function(response){
                    // Succeeded attaching Credit Card to user
                    console.log(response);

                    // // Emit event that a payment source has been added
                    // App.Events.trigger('payment_sources_updated');

                    // Return to previous page
                    App.history.back();
                },
                error: function(err){
                    Utils.Popover.Alert('Error attaching Credit Card');

                    that.checking = false;
                    that.submitButton.setContent('Save Card');
                }
            });

            // // Re-enable the button
            // that.$('.add-button').attr('disabled','disabled');

            return false;

        });

        return false;
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                this._showing = false;
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hide/move elements
                        Timer.setTimeout(function(){

                            that.layout.content.StateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? 1.5 : -1.5)),0,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                this._showing = true;
                if(this._refreshData){
                    // Timer.setTimeout(that.refreshData.bind(that), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }

                        that.layout.content.StateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? -1.5 : 1.5)),0,0));


                        // that.contentScrollView.Views.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        // });

                        // Content
                        // - extra delay for other content to be gone
                        Timer.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring in button surfaces individually
                            // that.contentScrollView.Views.forEach(function(surf, index){
                            //     // Timer.setTimeout(function(){
                            //     //     surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                            //     //         duration: 750,
                            //     //         curve: Easing.inOutElastic
                            //     //     });
                            //     // }, index * 50);
                            // });

                        }, delayShowing); // + transitionOptions.outTransition.duration);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };



    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
        },
        footer: {
            size: [undefined, 0]
        },
        content: {
            size: [undefined, undefined],
            inTransition: true,
            outTransition: true,
            overlap: true
        }
    };

    module.exports = PageView;

});
