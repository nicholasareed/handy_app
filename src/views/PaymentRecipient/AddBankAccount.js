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
            content: "Add Bank Account",
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
            placeholder: 'Save Bank Account As',
            type: 'text',
            value: ''
        });

        this.inputRealName = new FormHelper({

            margins: [10,10],

            form: this.form,
            name: 'name',
            placeholder: 'Full Name',
            type: 'text',
            value: ''
        });

        this.inputAccount = new FormHelper({

            margins: [10,10],

            form: this.form,
            placeholder: 'Account Number',
            type: 'number',
            value: ''
        });

        this.inputRouting = new FormHelper({

            margins: [10,10],

            form: this.form,
            placeholder: 'Routing Number',
            type: 'number',
            value: ''
        });

        this.submitButton = new FormHelper({
            form: this.form,
            type: 'submit',
            value: 'Save Bank Account',
            margins: [10,10],
            click: this.save_bankaccount.bind(this)
        });

        this.form.addInputsToForm([
            this.inputSaveName,
            this.inputRealName,
            this.inputAccount,
            this.inputRouting,
            this.submitButton
        ]);


    };

    PageView.prototype.save_bankaccount = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;

        this.submitButton.setContent('Please Wait');

        // var $form = this.$('#credit-card-form');
        var bankAccountData = {
            // name: $form.find('#name').val(),
            country: 'US',
            accountNumber: $.trim(this.inputAccount.getValue().toString()),
            routingNumber: $.trim(this.inputRouting.getValue().toString()),
         };

        console.log(bankAccountData);

         var bank_save_name = $.trim(this.inputSaveName.getValue().toString()),
            user_fullname = $.trim(this.inputRealName.getValue().toString());

        console.log(bank_save_name);

        Stripe.bankAccount.createToken(bankAccountData, function(status, response){
            if(response.error){
                Utils.Notification.Toast('Failed to save bank account');
                Utils.Popover.Alert(S(response.error.message));
                // Re-enable the button
                // that.$('.add-button').attr('disabled','disabled');
                that.checking = false;
                that.submitButton.setContent('Save Bank Account');
                return;
            }

            $.ajax({
                url: Credentials.server_root + 'payment_recipient',
                cache: false,
                method: 'POST',
                data: {
                    type: 'bank_account',
                    bank_token: response.id,
                    // cardid: response.card.id,
                    name: user_fullname,
                    save_as: bank_save_name
                },
                success: function(response){
                    // Succeeded attaching Bank Account to user
                    console.log(response);

                    // // Emit event that a payment recipient has been added
                    // App.Events.trigger('payment_recipients_updated');

                    Utils.Notification.Toast('Saved Bank Account');

                    // Return to previous page
                    App.history.back();
                },
                error: function(err){
                    Utils.Popover.Alert('Error attaching Bank Account');

                    that.checking = false;
                    that.submitButton.setContent('Save Bank Account');
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