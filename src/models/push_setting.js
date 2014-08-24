define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        PushSetting = Backbone.DeepModel.extend({

            idAttribute: '_id',
            
            urlRoot: Credentials.server_root + "push",

            initialize: function () {
                // set ids,etc
                this.url = this.urlRoot + '';
            }

        });

    PushSetting = Backbone.UniqueModel(PushSetting);

    return {
        PushSetting: PushSetting,
        // PushSettingCollection: PushSettingCollection
    };

});