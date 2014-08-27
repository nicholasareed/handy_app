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
    var StandardHeader = require('views/common/StandardHeader');
    // var TextAreaSurface = require('views/common/TextAreaSurface');
    var TextAreaSurface = require('famous/surfaces/TextareaSurface');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');
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

        // // Fetch
        // this.model.fetch({prefill: true});

        // Wait for model to get populated, then add the input surfaces
        // - model should be ready immediately!
        this.model.populated().then(function(){
            that.addSurfaces();
            Timer.setInterval(function(){
                if(that._showing){
                    that.model.fetch();
                }
            },10000);
        });


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
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView.Views = [];

        // link endpoints of layout to widgets

        // Sequence
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Card Name
        this.inputNameSurface = new InputSurface({
            name: 'cardname',
            placeholder: 'Save Card As',
            type: 'text',
            size: [undefined, 50],
            value: ''
        });
        this.inputNameSurface.pipe(this.contentScrollView);
        this.inputNameSurface.View = new View();
        this.inputNameSurface.View.StateModifier = new StateModifier();
        this.inputNameSurface.View.add(this.inputNameSurface.View.StateModifier).add(this.inputNameSurface);
        this.contentScrollView.Views.push(this.inputNameSurface.View);

        // Number
        this.inputNumberSurface = new InputSurface({
            name: 'number',
            placeholder: 'Credit Card Number',
            type: 'text',
            size: [undefined, 50],
            value: ''
        });
        this.inputNumberSurface.pipe(this.contentScrollView);
        this.inputNumberSurface.View = new View();
        this.inputNumberSurface.View.StateModifier = new StateModifier();
        this.inputNumberSurface.View.add(this.inputNumberSurface.View.StateModifier).add(this.inputNumberSurface);
        this.contentScrollView.Views.push(this.inputNumberSurface.View);


        // Month
        this.inputMonthSurface = new InputSurface({
            name: 'month',
            placeholder: 'Expiration Month',
            type: 'text',
            size: [undefined, 50],
            value: ''
        });
        this.inputMonthSurface.pipe(this.contentScrollView);
        this.inputMonthSurface.View = new View();
        this.inputMonthSurface.View.StateModifier = new StateModifier();
        this.inputMonthSurface.View.add(this.inputMonthSurface.View.StateModifier).add(this.inputMonthSurface);
        this.contentScrollView.Views.push(this.inputMonthSurface.View);

        // Year
        this.inputYearSurface = new InputSurface({
            name: 'year',
            placeholder: 'Expiration Year',
            type: 'text',
            size: [undefined, 50],
            value: ''
        });
        this.inputYearSurface.pipe(this.contentScrollView);
        this.inputYearSurface.View = new View();
        this.inputYearSurface.View.StateModifier = new StateModifier();
        this.inputYearSurface.View.add(this.inputYearSurface.View.StateModifier).add(this.inputYearSurface);
        this.contentScrollView.Views.push(this.inputYearSurface.View);

        // CVC
        this.inputCvcSurface = new InputSurface({
            name: 'cvc',
            placeholder: 'CVC Code',
            type: 'text',
            size: [undefined, 50],
            value: ''
        });
        this.inputCvcSurface.pipe(this.contentScrollView);
        this.inputCvcSurface.View = new View();
        this.inputCvcSurface.View.StateModifier = new StateModifier();
        this.inputCvcSurface.View.add(this.inputCvcSurface.View.StateModifier).add(this.inputCvcSurface);
        this.contentScrollView.Views.push(this.inputCvcSurface.View);

        // Zipcode
        this.inputZipcodeSurface = new InputSurface({
            name: 'zipcode',
            placeholder: 'Zipcode',
            type: 'text',
            size: [undefined, 50],
            value: ''
        });
        this.inputZipcodeSurface.pipe(this.contentScrollView);
        this.inputZipcodeSurface.View = new View();
        this.inputZipcodeSurface.View.StateModifier = new StateModifier();
        this.inputZipcodeSurface.View.add(this.inputZipcodeSurface.View.StateModifier).add(this.inputZipcodeSurface);
        this.contentScrollView.Views.push(this.inputZipcodeSurface.View);


        this.submitButtonSurface = new Surface({
            content: 'Save Card',
            size: [undefined, 60],
            classes: ['form-button-submit-default']
        });
        this.submitButtonSurface.View = new View();
        this.submitButtonSurface.View.StateModifier = new StateModifier();
        this.submitButtonSurface.View.add(this.submitButtonSurface.View.StateModifier).add(this.submitButtonSurface);
        this.contentScrollView.Views.push(this.submitButtonSurface.View);

        // Events for surfaces
        this.submitButtonSurface.on('click', this.save_card.bind(this));


    };

    PageView.prototype.save_card = function(ev){
        var that = this;

        if(this.checking === true){
            return;
        }
        this.checking = true;

        this.submitButtonSurface.setContent('Please Wait');

        // var $form = this.$('#credit-card-form');
        var creditCardData = {
            // name: $form.find('#name').val(),
            number: $.trim(this.inputNumberSurface.getValue().toString()),
            exp_month: $.trim(this.inputMonthSurface.getValue().toString()),
            exp_year: $.trim(this.inputYearSurface.getValue().toString()),
            cvc: $.trim(this.inputCvcSurface.getValue().toString()),
            address_zip: $.trim(this.inputZipcodeSurface.getValue().toString())
         };

        console.log(creditCardData);

         var card_save_name = $.trim(this.inputNameSurface.getValue().toString());
         var card_last4 = creditCardData.number.substr(-4,4);
         card_save_name = card_save_name.length > 0 ? card_save_name : creditCardData.card_number.substr(-4,4); // saved name or last 4

        console.log(card_save_name);

        Stripe.card.createToken(creditCardData, function(status, response){
            if(response.error){
                alert(response.error.message);
                // Re-enable the button
                // that.$('.add-button').attr('disabled','disabled');
                that.checking = false;
                that.submitButtonSurface.setContent('Save Card');
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
                    alert('Error attaching Credit Card');

                    that.checking = false;
                    that.submitButtonSurface.setContent('Save Card');
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
                        window.setTimeout(function(){

                            // Slide content left
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                this._showing = true;
                if(this._refreshData){
                    // window.setTimeout(that.refreshData.bind(that), 1000);
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
                        that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        // that.contentScrollView.Views.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        // });

                        // Content
                        // - extra delay for other content to be gone
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring in button surfaces individually
                            that.contentScrollView.Views.forEach(function(surf, index){
                                // window.setTimeout(function(){
                                //     surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                                //         duration: 750,
                                //         curve: Easing.inOutElastic
                                //     });
                                // }, index * 50);
                            });

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
