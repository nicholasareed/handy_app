define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        PaymentSource = Backbone.DeepModel.extend({

            idAttribute: '_id',
            
            urlRoot: Credentials.server_root + "payment_source",

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

    PaymentSource = Backbone.UniqueModel(PaymentSource);

    var PaymentSourceCollection = Backbone.Collection.extend({

            model: PaymentSource,

            urlRoot: Credentials.server_root + "payment_sources",

            initialize: function(models, options) {
                options = options || {};
                // set ids,etc
                this.url = this.urlRoot + '';
                if(options.payment_source_id){
                    this.url = this.urlRoot + '/' + options.payment_source_id;
                }
            }

        });

    return {
        PaymentSource: PaymentSource,
        PaymentSourceCollection: PaymentSourceCollection
    };

});