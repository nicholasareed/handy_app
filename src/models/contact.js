define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        _                   = require('underscore'),
        Backbone            = require('backbone-adapter'),
        Utils               = require('utils'),
        Credentials         = JSON.parse(require('text!credentials.json')),
        operative           = require('lib2/operative'),

        Contact = Backbone.DeepModel.extend({

            idAttribute: 'id', // Local contacts, not stored on server!
            
            urlRoot: Credentials.server_root + "contact",

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

    Contact = Backbone.UniqueModel(Contact);

    var ContactCollection = Backbone.Collection.extend({

            model: Contact,

            urlRoot: Credentials.server_root + "contacts",

            initialize: function(models, options) {
                options = options || {};
                this.options = options;

                this.url = this.urlRoot + '';

                if(options.type == 'all'){
                    // this.url = Credentials.server_root + 'mobile/users/contacts';
                }
            },

            async: operative({
                runFilter: function(all_contacts, filter, cb) {

                    var models = [];
                    // console.log(all_contacts);
                    all_contacts.forEach(function(tmpContact){
                        // console.log(JSON.stringify(tmpContact));
                        try {
                            if(!tmpContact.displayName && !tmpContact.name){
                                console.log('missing both displayName and name!');
                                // Utils.Notification.Toast('Missing name!');
                                return;
                            }
                        }catch(err){

                        }
                        try {
                            if(tmpContact.displayName && tmpContact.displayName.toLowerCase().indexOf( filter ) !== -1){
                                // Found it

                                // console.log(tmpContact.displayName.toLowerCase().indexOf( filter ));
                                // console.log(tmpContact.displayName.toLowerCase());
                                // console.log(filter);
                                models.push(tmpContact);
                                
                            } else {
                                throw NextError;
                            }
                        }catch(err){
                            // console.log('probably ios');
                            try {
                                // given/formatted name (ios)
                                if(tmpContact.name && tmpContact.name.formatted && tmpContact.name.formatted.toLowerCase().indexOf( filter ) !== -1){
                                    // Found it

                                    // console.log(tmpContact.name.formatted.toLowerCase().indexOf( filter ));
                                    // console.log(tmpContact.name.formatted.toLowerCase());
                                    // console.log(filter);
                                    models.push(tmpContact);
                                    
                                } else {
                                    // console.log('no match');
                                    // console.log(tmpContact);
                                    // console.log(tmpContact.name);
                                }
                            }catch(err){
                                console.log(err);
                            }

                        }

                    });

                    cb( models );
                }
            }),
    
            AllContactsJson: [],
            filterContacts: function(){
                // Filter through "this.AllContacts" and return matched ones
                var that = this;

                var def = $.Deferred();

                var filter = that.options.filter + '';
                filter = filter.toLowerCase();

                setTimeout(function(){
                    // console.log(JSON.stringify(that.AllContacts));
                    that.async.runFilter(that.AllContactsJson, filter, function(models){
                        // console.log(models.length);

                        if(filter != that.options.filter.toLowerCase()){
                            // def.reject();
                            return;
                        }
                        models.forEach(function(tmpModel){
                            tmpModel = new Contact(tmpModel);
                        });
                        that.set(models);
                        def.resolve(models);
                    })



                    // var models = [];
                    // models = _.filter(that.AllContacts, function(tmpContact){
                    //     console.log(JSON.stringify(tmpContact));
                    //     try {
                    //         if(tmpContact.get('displayName').toLowerCase().indexOf( filter ) !== -1){
                    //             // Found it

                    //             // models.push(tmpContact);
                    //             console.log('FOUD!', tmpContact);
                    //             return true;
                    //         }
                    //     }catch(err){}

                    //     return false;
                    // });

                    // that.calculator.add(1,2, function(result){
                    //     // alert(result);
                    // });

                    // that.set(models);
                    // def.resolve(models);

                },1);

                return def.promise();

            },

            fetchContacts: function(){
                var that = this;

                var def = $.Deferred();

                // find all contacts
                if(App.Data.usePg){
                    var options      = new ContactFindOptions();
                    options.filter   = ''; // any/all contacts
                    options.multiple = true;
                    options.desiredFields = ['id','displayName', 'name','phoneNumbers']; // required fields? requires a phone number?
                    var fields       = ['displayName','name','phoneNumbers'];
                    navigator.contacts.find(fields, function(contacts){
                        console.log('Got all contacts');
                        console.log(contacts.length);
                        var tmpContacts = _.map(contacts, function(tmp){
                            return new Contact(tmp);
                        });
                        that.AllContacts = tmpContacts;
                        that.AllContactsJson = JSON.parse(JSON.stringify(that.AllContacts));
                        def.resolve();
                    }, function(err){
                        Utils.Notification.Toast('Failed loading contacts');
                        def.reject(err);
                    }, options);
                } else {

                    setTimeout(function(){
                        that.AllContacts = [
                            new Contact({
                                id: 1,
                                displayName: null, //'nick reed',
                                name: {
                                    given: null,
                                    formatted: 'nick reed'
                                },
                                phoneNumbers: ['6502068481']
                            })];

                        that.AllContactsJson = JSON.parse(JSON.stringify(that.AllContacts));

                        def.resolve();
                    },1);

                }

                return def.promise();

            },

            comparator: function(model){
                // console.log(model);
                if(model.get('displayName')){
                    return model.get('displayName').toString().toLowerCase();
                } else {
                    return model.get('name.formatted').toString().toLowerCase();
                }
            },

        });

    return {
        Contact: Contact,
        ContactCollection: ContactCollection
    };

});