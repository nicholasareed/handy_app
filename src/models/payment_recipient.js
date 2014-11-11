define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        PaymentRecipient = Backbone.DeepModel.extend({

            idAttribute: '_id',
            
            urlRoot: Credentials.server_root + "payment_recipient",

            initialize: function (opts) {
                // set ids,etc
                this.url = this.urlRoot + '';
                if(this.id){
                  this.url = this.urlRoot + '/' + this.id;
                } else {
                  this.url = this.urlRoot;
                }
                // console.log(this.url);
            }

        });

    PaymentRecipient = Backbone.UniqueModel(PaymentRecipient);

    var PaymentRecipientCollection = Backbone.Collection.extend({

            model: PaymentRecipient,

            urlRoot: Credentials.server_root + "payment_recipients",

            initialize: function(models, options) {
                options = options || {};
                // set ids,etc
                this.url = this.urlRoot + '';
                if(options.payment_recipient_id){
                    this.url = this.urlRoot + '/' + options.payment_recipient_id;
                }
            }

        });

    return {
        PaymentRecipient: PaymentRecipient,
        PaymentRecipientCollection: PaymentRecipientCollection
    };

});