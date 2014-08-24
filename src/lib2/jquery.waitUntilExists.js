;(function ($, window) {

var intervals = {};
var removeListener = function(selector) {

    console.error('REMOVED!');
    if (intervals[selector]) {
        
        window.clearInterval(intervals[selector]);
        intervals[selector] = null;
    }
};
var found = 'waitUntilExists.found';

/**
 * @function
 * @property {object} jQuery plugin which runs handler function once specified
 *           element is inserted into the DOM
 * @param {function|string} handler 
 *            A function to execute at the time when the element is inserted or 
 *            string "remove" to remove the listener from the given selector
 * @param {bool} shouldRunHandlerOnce 
 *            Optional: if true, handler is unbound after its first invocation
 * @example jQuery(selector).waitUntilExists(function);
 */
 
$.fn.waitUntilExists = function(handler, shouldRunHandlerOnce, isChild) {
    shouldRunHandlerOnce = true;
    var selector = this.selector;
    var $this = $(selector);
    var $elements = $this.not(function() { return $(this).data(found); });
    
    if (handler === 'remove') {
        
        // Hijack and remove interval immediately if the code requests
        removeListener(selector);
    }
    else {

        if (shouldRunHandlerOnce && $this.length) {
            // Element was found, implying the handler already ran for all 
            // matched elements
            removeListener(selector);
            
            // Run the handler on all found elements and mark as found
            $elements.each(handler).data(found, true);
        }
        else if (!isChild) {

            // Run the handler on all found elements and mark as found
            $elements.each(handler).data(found, true);
            
            // If this is a recurring search or if the target has not yet been 
            // found, create an interval to continue searching for the target
            intervals[selector] = window.setInterval(function () {
                console.log(3);
                $this.waitUntilExists(handler, shouldRunHandlerOnce, true);
            }, 500);
        } else {
            removeListener(selector);
        }
    }
    
    return $this;
};
 
}(jQuery, window));

// (function ($) {

// /**
// * @function
// * @property {object} jQuery plugin which runs handler function once specified element is inserted into the DOM
// * @param {function} handler A function to execute at the time when the element is inserted
// * @param {bool} shouldRunHandlerOnce Optional: if true, handler is unbound after its first invocation
// * @example $(selector).waitUntilExists(function);
// */

// $.fn.waitUntilExists    = function (handler, shouldRunHandlerOnce, isChild) {
//     var found       = 'found';
//     var $this       = $(this.selector);
//     var $elements = $this.not(function () { 
//                 return $(this).data(found); 
//             }).each(handler).data(found, true);

//     if (!isChild) {
//         window.waitUntilExists_Intervals = window.waitUntilExists_Intervals || {};
//         window.waitUntilExists_Intervals[this.selector] = window.setInterval(function () {
//                 $this.waitUntilExists(handler, shouldRunHandlerOnce, true); 
//                 console.log(1);
//             }, 500);
//     } else if (shouldRunHandlerOnce && $elements.length) {
//         console.log('clearInterval');
//         window.clearInterval(window.waitUntilExists_Intervals[this.selector]);
//     }

//     return $this;
// }

// $.fn.waitUntilOneExists    = function (handler, shouldRunHandlerOnce, isChild) {
//     shouldRunHandlerOnce = (shouldRunHandlerOnce === undefined) ? true : shouldRunHandlerOnce;
//     var found       = 'found';
//     var $this       = $(this.selector);
//     var $elements = $this.not(function () { 
//                 return $(this).data(found); 
//             }).each(handler).data(found, true);

//     var $allElements = $(this.selector);
//     console.error($allElements);
//     console.error($allElements.length);
//     // debugger;

//     if (!isChild) {
//         window.waitUntilExists_Intervals = window.waitUntilExists_Intervals || {};
//         window.waitUntilExists_Intervals[this.selector] = window.setInterval(function () {
//                 $this.waitUntilExists(handler, shouldRunHandlerOnce, true); 
//                 console.log(2);
//             }, 500);
//     } else if (shouldRunHandlerOnce && $allElements.length) {
//         console.log('clearInterval');
//         window.clearInterval(window.waitUntilExists_Intervals[this.selector]);
//     }

//     return $this;
// }

// }(jQuery));
