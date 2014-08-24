/*!
 * Backbone.js ajaxRetry
 * https://github.com/gdibble/backbone-ajaxretry
 * Copyright 2014 Gabriel Dibble; Licensed MIT
 */

// AMD wrapper from https://github.com/umdjs/umd/blob/master/amdWebGlobal.js

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module and set browser global
    define(['underscore', 'backbone', 'jquery', 'utils'], function (_, Backbone, $, Utils) {
      return (root.Backbone = factory(_, Backbone, $, Utils));
    });
  } else {
    // Browser globals
    root.Backbone = factory(root._, root.Backbone, root.jQuery);
  }
}(this, function (_, Backbone, $, Utils) {

  // var Utils = require('utils');

  //Defaults that can be overridden via set
  var settings = {
    base:       2.718281828,
    y:          0.25,
    retryCount: 1
  };

  //-----------------------------------------------------------------------------


  // Helpers:
  //  some console.logs have been left (as to be enabled) for those curious minds


  //Update current settings, overriding defaults
  function setOptions(options) {
    _.defaults(options, settings);
    settings = options;
  }

  //returns delay in milliseconds
  function exponentialDelay(x) {
    return (Math.pow(settings.base, x) - settings.y) * 1000;
  }

  //hit retry limit
  function exhausted() {
    // console.log('exhausted', this.url);
    if (this.hasOwnProperty('exhaust')) {
      // console.log('>>> called this.exhaust', this.exhaust);
      this.exhaust.apply(this, arguments);
    } else {
      // Toast if no default set for failing a network request (and exhausting requests)
      Utils.Notification.Toast('Failed Network Request');
    }
  }

  //recurse the ajax request
  function ajaxRetry(jqXHR) {
    var self = this;
    Utils.Notification.Toast('Retrying Network');
    if (this.hasOwnProperty('retries')) {
      this.recursed = this.recursed === undefined ? 0 : this.recursed + 1;
      if ((jqXHR && (jqXHR.status < 300 || jqXHR.status >= 500)) || this.recursed >= this.retries) {
        exhausted.apply(self, arguments);
      } else if (this.recursed < this.retries) {
        setTimeout(function () {
          $.ajax(self);
          // console.log('recursed', self.url, self.recursed, 'in ' + exponentialDelay(self.recursed) + 'ms');
        }, exponentialDelay(this.recursed));
      }
    } else {
      exhausted.apply(self, arguments);
    }
  }

  //-----------------------------------------------------------------------------


  //extend for retry functionality
  Backbone.ajax = function (options) {
    var args = Array.prototype.slice.call(arguments, 0);
    _.extend(args[0], options ? options : {}, {
      retries: settings.retryCount,
      error:   function () { ajaxRetry.apply(this, arguments); }
    });
    return Backbone.$.ajax.apply(Backbone.$, args);
  };

  // module.exports = { set: setOptions };

  return Backbone;

}));





