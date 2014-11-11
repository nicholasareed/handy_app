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

        // Quick Help
        this.headerContent = new View();
        this.headerContent.QuickHelp = new Surface({
            content: '<i class="icon ion-ios7-help-outline"></i>',
            size: [App.Defaults.Header.Icon.w, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.QuickHelp.on('longtap', function(){
            Utils.Help('PaymentRecipient/List/QuickHelp');
        });
        this.headerContent.QuickHelp.on('click', function(){
            // App.Cache.FriendListOptions = {
            //     default: 'outgoing'
            // };
            // App.history.navigate('payment_recipient/add/bankaccount');
            Utils.Popover.Alert('Data is secured by Stripe, and SSNs are not stored on our system (only used for verification)<br /><br />Contact us at info@theoddjobapp.com for questions.','OK');
        });

        // create the header
        this.header = new StandardHeader({
            content: "Add Debit Card",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.QuickHelp
            ]
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

        // instructions
        this.instructions = new Surface({
            content: 'OddJob only supports <strong>individuals</strong> (people) bank accounts and debit cards, no corporations or businesses.',
            wrap: '<div></div>',
            size: [undefined, true],
            classes: ['form-instructions-default']
        });
        this.instructions.pipe(this.form._formScrollView);

        this.inputRealName = new FormHelper({

            margins: [10,10],

            form: this.form,
            name: 'name',
            placeholder: 'Full Name',
            type: 'text',
            value: ''
        });

        this.inputSSN = new FormHelper({

            margins: [10,10],

            form: this.form,
            name: 'name',
            placeholder: 'Social Security Number',
            type: 'text',
            value: ''
        });


        // spacer !!
        this.spacer = new Surface({
            size: [undefined, 1],
            properties: {
                background: '#ddd'
            }
        });
        this.spacer.pipe(this.form._formScrollView);


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
            placeholder: 'Debit Card Number',
            type: 'number',
            value: ''
        });

        this.inputExpMonth = new FormHelper({

            margins: [10,10],
            size: [100,true],

            form: this.form,
            placeholder: 'MM',
            type: 'number',
            value: '',
            attr: {
                'maxlength' : 2
            }
        });

        this.inputExpYear = new FormHelper({

            margins: [10,10],
            size: [100,true],
            form: this.form,
            placeholder: 'YY',
            type: 'number',
            value: '',
            attr: {
                'maxlength' : 2
            }
        });

        this.inputCvc = new FormHelper({

            margins: [10,10],
            size: [200,true],

            form: this.form,
            placeholder: 'CVC Code (on back)',
            type: 'number',
            value: '',
            attr: {
                'maxlength' : 4
            }
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
            this.instructions,
            this.inputRealName,
            this.inputSSN,
            this.spacer,
            this.inputSaveName,
            this.inputNumber,
            this.inputExpMonth,
            this.inputExpYear,
            this.inputCvc,
            this.inputZipcode,
            this.submitButton
        ]);

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

        var card_save_name = $.trim(this.inputSaveName.getValue().toString());
        var card_last4 = creditCardData.number.substr(-4,4),
            user_fullname = $.trim(this.inputRealName.getValue().toString()),
            user_ssn = $.trim(this.inputSSN.getValue().toString());

         card_save_name = card_save_name.length > 0 ? card_save_name : creditCardData.card_number.substr(-4,4); // saved name or last 4

        console.log(card_save_name);

        Stripe.card.createToken(creditCardData, function(status, response){
            if(response.error){
                Utils.Notification.Toast('Failed to save card');
                Utils.Popover.Alert(S(response.error.message));
                // Re-enable the button
                // that.$('.add-button').attr('disabled','disabled');
                that.checking = false;
                that.submitButton.setContent('Save Card');
                return;
            }

            $.ajax({
                url: Credentials.server_root + 'payment_recipient',
                cache: false,
                method: 'POST',
                data: {
                    type: 'card',
                    token: response.id,
                    cardid: response.card.id,
                    save_as: card_save_name,
                    last4: card_last4,
                    ssn: user_ssn,
                    name: user_fullname
                },
                success: function(response){
                    // Succeeded attaching Debit Card to user
                    console.log(response);

                    // // Emit event that a payment source has been added
                    // App.Events.trigger('payment_sources_updated');

                    Utils.Notification.Toast('Saved Card');

                    // Return to previous page
                    App.history.back();
                },
                error: function(err){
                    Utils.Popover.Alert('Error attaching Debit Card');

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
