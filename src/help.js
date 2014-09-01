define(function(require) {

    "use strict";

    // Extras
    // var _ = require('underscore');
    // var Utils = require('utils');

    return {
        launch: function(key){

            var that = this;
            
            require(['utils'], function(Utils){


                var opts = {

                    todo_invoices : {
                        type: 'popover',
                        title: 'Switch to Invoices',
                        body: 'Tapping this will switch to a view of Invoices'
                    },

                    todo_circle_checkmark : {
                        type: 'popover',
                        title: 'Cycle between Todos',
                        body: 'Tapping this will switch between 3 todo types:<br />' + 
                              '<p><i class="icon ion-ios7-circle-outline"></i> Todo</p>' + 
                              '<p><i class="icon ion-ios7-checkmark-outline"></i> Complete</p>' + 
                              '<p><i class="icon ion-ios7-checkmark"></i> All</p>'
                    },

                    'PaymentSource/List/BankDetails' : {
                        type: 'popover',
                        title: 'Accepting Payments',
                        body: "To accept payments, we'll need a few more details from you. " + 
                              "Please email us at founders@thehandyapp.com (or use the feedback form from the Settings menu) and we'll get you set up!<br /><br />" +
                              "We apologize for the inconvenience!"
                    }
                    
                };

                if(opts[key] === undefined){
                    Utils.Popover.Help({
                        title: 'Help Option Unavailable',
                        body: "I'm sorry, this help page isn't ready yet! <br />" + key
                    });
                    return;
                }

                // Show Help Popover
                switch(opts[key].type){
                    case 'popover':
                        Utils.Popover.Help(opts[key]);
                        break;
                    default:
                        console.error('unexpected');
                        break;
                }
            });

        }

    };

});