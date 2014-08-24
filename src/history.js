/*globals define*/
define(function(require, exports, module) {
    
    var Lightbox          = require('famous/views/Lightbox');
    var Transform       = require('famous/core/Transform');
    var Easing          = require('famous/transitions/Easing');
    var Timer          = require('famous/utilities/Timer');

    var Utils = require('utils');
    var _ = require('underscore');

    module.exports = function(App){

        var HistoryContext = this;

        // var historyObj = {};

        // Replacing history events

        var historyObj = {};
        historyObj.data = [];
        historyObj.isGoingBack = false;
        historyObj.navigate = function(path, opts, back, reloadCurrent){

            console.log('historyObj.navigate: path:', path, arguments);
            // console.trace();

            opts = opts || {};

            opts = _.defaults(opts, {
                history: true, // add to history
                group: null,
                tag: null
            });

            if(back === true){
                // Get the last entry, see if we can go back to it
                // - todo, compare saved opts, etc.

                // Remove the "current entry"
                // - reload the last one (after pop'ing it out too)
                var currentArgs = historyObj.data.pop();
                console.log(currentArgs);

                var lastArgs = historyObj.data.pop();
                console.log('lastArgs', lastArgs);

                if(lastArgs === undefined || !lastArgs || lastArgs.length < 1 || lastArgs[0] == ''){
                    // No last arguments exist
                    // alert('Exiting app');
                    Utils.Notification.Toast('Exiting App');
                    console.error('exiting app');
                    historyObj.navigate('user/sentence');
                    return;
                }

                // debugger;

                historyObj.isGoingBack = true;
                console.log('isGoingBack==true');
                historyObj.navigate.apply(HistoryContext, lastArgs);

                return;
            }

            if(reloadCurrent === true){
                // Reload the currently-in-place history event
                // - should be used when you want to go "back" from a history:false page

                // pop it out from the array, it'll get popped back in
                var lastArgs = historyObj.data.pop();
                console.log('lastArgs', lastArgs);

                if(lastArgs === undefined || !lastArgs || lastArgs.length < 1 || lastArgs[0] == ''){
                    // No last arguments exist
                    Utils.Notification.Toast('Exiting App');
                    console.error('Exiting app, reloadCurrent failed');
                    historyObj.navigate('dash');
                    return;
                }

                historyObj.isGoingBack = true; // yes, keep as "is going back" from whatever is currently displayed
                historyObj.navigate.apply(HistoryContext, lastArgs);

                return;
            }

            // be able to "tag" a history event, and then "erase" all the ones since that one
            // keep "groups" together: viewing a bunch of users in a row, then going "back" to the Dash

            // options
            console.log('Running backbone.history', path);

            // Replace the URL
            // console.log(DefaultRouter);
            // console.log(DefaultRouter.handlers);
            // console.log(App.StartRouter);
            // console.log(App.StartRouter.handlers);
            // console.log(App.StartRouter.routes);
            // console.log(Object.keys(App.StartRouter.routes));
            // _.find(Object.keys(App.StartRouter.routes), function(theRoute){
            //     console.log(theRoute);
            //     console.log(App.StartRouter._routeToRegExp(theRoute));
            //     if(App.StartRouter._routeToRegExp(theRoute).test(path)){

            //     // }
            //     // if(theRoute.toString().test(path)) {
            //       // handler.callback();
            //       // debugger;
            //       // App.StartRouter.routes[theRoute](); // call the function
            //       return true;
            //     }
            // });

            // pass arguments
            // - update with default options? (no, pass exactly as before)
            if(opts.history == true){
                historyObj.data.push([
                    path, opts, back
                ]);
            }

            Backbone.history.navigate(path, {trigger: true, replace: true});


        };
        historyObj.back = function(opts){
            historyObj.navigate(null, opts, true);
        };
        historyObj.reloadCurrent = function(opts){
            // Reload the currently-in-place history event
            // - should be used when you want to go "back" from a history:false page
            historyObj.navigate(null, opts, false, true);
        };
        historyObj.backTo = function(tag, opts){
            // erase a bunch of history, until we reach that tag
            // - erase it, then visit it
            // debugger;
            historyObj.eraseUntilTag(tag, false);

            var lastArgs = historyObj.data.pop(); // get last
            historyObj.navigate.apply(HistoryContext, lastArgs);

            // historyObj.data.reverse();

            // var continueErasing = true;
            // historyObj.data = _.filter(historyObj.data, function(args){
            //     // check options for tag that matches
            //     if(continueErasing !== true){
            //         return true;
            //     }
            //     if(args.length < 2 || args[1].tag != tag){
            //         return false;
            //     } else {
            //         continueErasing = false;
            //         return true;
            //     }
            // });

            // var lastArgs = historyObj.data.shift(); // pop again

            // historyObj.data.reverse();

            // historyObj.navigate.apply(RouterContext, lastArgs);
        };
        historyObj.eraseLast = function(numToErase){
            numToErase = numToErase || 1;

            // // debugger;
            // historyObj.data.reverse();
            
            _.each(_.range(numToErase), function(){
                historyObj.data.pop();
            });

            // var continueErasing = true;
            // historyObj.data = _.filter(historyObj.data, function(args){
            //     // check options for tag that matches
            //     if(continueErasing !== true){
            //         return true;
            //     }
            //     if(args.length < 2){
            //         return false;
            //     }
            //     if(!args[1].tag){
            //         return false;
            //     }
            //     if(typeof args[1].tag == "string" && args[1].tag != tag){
            //         return false
            //     }
            //     if(typeof args[1].tag === typeof [] && args[1].tag.indexOf(tag) === -1){
            //         return false;
            //     }
            //     console.log('FOUND tag in eraseUntilTag');
            //     // debugger;
            //     continueErasing = false;
            //     if(eraseLast === true){
            //         return false;
            //     } else {
            //         return true;
            //     }

            // });

            // historyObj.data.reverse();
        };
        historyObj.eraseUntilTag = function(tag, eraseLast){
            // Erase entries up until the last tag
            // - and including the last tag! (if included, by default, ERASE)
            eraseLast = eraseLast === undefined ? true : (eraseLast ? true : false);

            console.log(_.clone(historyObj.data));
            console.log(historyObj.data);
            // debugger;
            historyObj.data.reverse();

            var continueErasing = true;
            historyObj.data = _.filter(historyObj.data, function(args){
                // check options for tag that matches
                if(continueErasing !== true){
                    return true;
                }
                if(args.length < 2){
                    return false;
                }
                if(!args[1].tag){
                    return false;
                }
                if(typeof args[1].tag == "string" && args[1].tag != tag){
                    return false
                }
                if(typeof args[1].tag === typeof [] && args[1].tag.indexOf(tag) === -1){
                    return false;
                }
                console.log('FOUND tag in eraseUntilTag');
                // debugger;
                continueErasing = false;
                if(eraseLast === true){
                    return false;
                } else {
                    return true;
                }

            });

            historyObj.data.reverse();
        };
        historyObj.modifyLast = function(opts){
            // Add additional data/opts to the last item
            // - useful for tagging postrender
            // historyObj.data[historyObj.data.length - 1][1]
            // console.log(historyObj.data);
            var args = historyObj.data[historyObj.data.length - 1];
            if(!args){ args = []; }
            if(args.length < 1){
                console.log(args);
                console.log(opts);
            } else if(args.length < 2){
                // no options exist anyways
                console.log(args);
                console.log(typeof args);
                args[1] = opts;
                // args.push(opts);
                historyObj.data[historyObj.data.length - 1] = args;
                console.info('modifyLast1', opts.tag);
            // } else if(args.length < 1){
            //     // no arguments?
            //     debugger;
            } else {
                console.info('modifyLast2', opts.tag);
                if(opts.tag){
                    // add tag to array of tags
                    var currentTag = historyObj.data[historyObj.data.length - 1][1].tag;
                    // console.log(historyObj.data);
                    // console.log(historyObj.data[historyObj.data.length - 1]);
                    // console.log(currentTag);
                    // debugger;
                    if(currentTag == undefined || currentTag == null || currentTag == false){
                        currentTag = [];
                    }
                    if(typeof currentTag == "string"){
                        currentTag = [currentTag];
                    }
                    // add to array
                    currentTag.push(opts.tag);
                    historyObj.data[historyObj.data.length - 1][1].tag = currentTag;

                    delete opts.tag
                }

                // altering anything but the 'tag'
                historyObj.data[historyObj.data.length - 1][1] = _.defaults(historyObj.data[historyObj.data.length - 1][1],opts);
                
                // console.log(historyObj.data);
            }

            console.info(historyObj.data);
            // debugger;
        };


        // Backbutton
        // - launches history.back, unless a backbuttonHandler is set on the currently displayed View
        App.Events.on('backbutton', function(){
            // Backbutton handler?
            // - otherwise, initiate a "back" on the App.Navigate
            try {
                if(typeof App.Views.currentPageView.backbuttonHandler == "function"){
                    console.log('launching backbuttonHanderl');
                    App.Views.currentPageView.backbuttonHandler.apply(App.Views.currentPageView);
                    return;
                } else {
                    console.log('no backbutton handler in PageView');
                }
            } catch(err){
                console.error(err);
            }
            
            console.error('normal .back');
            historyObj.back();
            // RouterContext.currentPageView._eventInput.emit('backbutton');
        });

        return historyObj;

    };

});
