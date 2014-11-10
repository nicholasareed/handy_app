define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
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
    var TabBar = require('famous/widgets/TabBar');
    var GridLayout = require("famous/views/GridLayout");

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Views
    var StandardHeader = require('views/common/StandardHeader');

    // Models
    var TodoModel = require('models/todo');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl_detail        = require('text!./tpl/SummaryDetail.html');
    var template_detail   = Handlebars.compile(tpl_detail);

    var FormHelper = require('views/common/FormHelper');

    // var tpl_payment        = require('text!./tpl/SummaryPayment.html');
    // var template_payment   = Handlebars.compile(tpl_payment);

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.WizardOptionsKey = 'TodoEditSummaryOptions';

        if(!this.options.App.Cache[this.WizardOptionsKey]){
            console.error('Missing this.WizardOptionsKey');
            App.history.navigate(App.Credentials.home_route);
            return;
        }

        // Add to new ".passed" params, separate from this.options.App and other root-level arguments/objects
        this.options.passed = _.extend({}, App.Cache[this.WizardOptionsKey] || {});
        
        this.loadModels();

        this.createHeader();
        this.createContent();

        // Updates content based on this.summary values
        this.update_content();

        this.add(this.layout);
    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        // Models
        this.model = this.options.passed.summary.Model;  //new TodoModel.Todo();

    };

    PageView.prototype.createHeader = function(){
        var that = this;

        // Icons

        // -- create
        this.headerContent = new View();
        // - done
        this.headerContent.Cancel = new Surface({
            content: '<i class="icon ion-ios7-close-outline"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Cancel.on('click', function(){
            that.options.passed.on_cancel();
        });

        this.header = new StandardHeader({
            content: 'Update Job',
            classes: ["normal-header"],
            backContent: false,
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Cancel
            ]
        }); 
        this.header._eventOutput.on('back',function(){
            // App.history.back();
            // that.options.passed.on_cancel();
        });
        // this.header._eventOutput.on('more',function(){
        // });
        this.header.navBar.title.on('click',function(){
            // App.history.back();
            // that.options.passed.on_cancel();
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(that.header, args);
        })

        this.layout.header.add(Utils.usePlane('header')).add(this.header);
    };

    PageView.prototype.createContent = function(){
        var that = this;

        // // create the scrollView of content
        // this.contentScrollView = new ScrollView(); //(App.Defaults.ScrollView);
        // this.contentScrollView.Views = [];

        this.form = new FormHelper({
            type: 'form',
            scroll: true
        });

        // Add surfaces
        this.addSurfaces();

        // this.contentScrollView.sequenceFrom(this.contentScrollView.Views);
        
        // Content
        this.layout.content.StateModifier = new StateModifier();
        // this.contentView = new View();
        // this.contentView.SizeMod = new Modifier({
        //     size: //[window.innerWidth - 50, true]
        //         function(){
        //             var tmpSize = that.contentScrollView.getSize(true);
        //             if(!tmpSize){
        //                 return [window.innerWidth, undefined];
        //             }
        //             return [window.innerWidth - 16, tmpSize[1]];
        //         }
        // });
        // this.contentView.OriginMod = new StateModifier({
        //     // origin: [0.5, 0.5]
        // });
        // this.contentView.add(this.contentView.OriginMod).add(this.contentView.SizeMod).add(this.contentScrollView);
        this.layout.content.add(this.layout.content.StateModifier).add(Utils.usePlane('content')).add(this.form); //.add(this.contentView);

    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        this.allInputs = []; // array for adding to the _formScrollView

        // Build Surfaces
        // - add to scrollView

        // 1px line necessary?
        // var _holder = new Surface({size: [undefined,1]});
        // _holder.pipe(this.contentScrollView);
        // // need to create a 1px-height surface for the scrollview, otherwise it fucks up?
        // this.contentScrollView.Views.push(_holder);
        
        // this.createGroupView();
        // this.createImageView();
        // this.createDetailView();

        this.addFormSurfaces();

        this.addTimeframeSlider();

        // // weight
        // this.weightView = new View();
        // this.weightView.Surface = new Surface({
        //     content: '<div>Images</div><div>&nbsp;</div>',
        //     size: [undefined, true],
        //     classes: ['todo-add-summary-topic-default','next-option']
        // });
        // this.weightView.Surface.on('click', function(){
        //     that.options.passed.on_choose('weight');
        // });
        // this.weightView.getSize = function(){
        //     return that.weightView.Surface.getSize(true);
        // };
        // this.weightView.add(this.weightView.Surface);
        // this.contentScrollView.Views.push(this.weightView);

        // // comments
        // this.commentsView = new View();
        // this.commentsView.Surface = new Surface({
        //     content: '<div>Images</div><div>&nbsp;</div>',
        //     size: [undefined, true],
        //     classes: ['todo-add-summary-topic-default','next-option']
        // });
        // this.commentsView.Surface.on('click', function(){
        //     that.options.passed.on_choose('comments');
        // });
        // this.commentsView.getSize = function(){
        //     return that.commentsView.Surface.getSize(true);
        // };
        // this.commentsView.add(this.commentsView.Surface);
        // this.contentScrollView.Views.push(this.commentsView);

        // this.createPaymentView();

        this.createSubmitButton();

        // // Submit button
        // this.submitButtonSurface = new Surface({
        //     content: 'Create Job',
        //     wrap: '<div class="outward-button"></div>',
        //     size: [undefined,60],
        //     classes: ['button-outwards-default']
        // });
        // this.submitButtonSurface.pipe(this.contentScrollView);
        // this.contentScrollView.Views.push(this.submitButtonSurface);

        // // Events for surfaces
        // this.submitButtonSurface.on('click', this.save_todo.bind(this));

        this.form.addInputsToForm(this.allInputs);

        // // Default selections
        // this.singleOrTeamView.TabBar.select('singles');
        // this.winOrPlaceView.TabBar.select('wlt');

    };

    PageView.prototype.addFormSurfaces = function() {
        var that = this;

        this.inputs = [{
            name: 'title',
            placeholder: 'Title',
            type: 'text',
            size: [undefined, 50],
            value: this.options.passed.summary.Model.get('title')
        },{
            name: 'details',
            placeholder: 'Job Details',
            type: 'textarea',
            size: [undefined, 300],
            value: this.options.passed.summary.Model.get('details')
        }];

        this._inputs = {};

        this.inputs.forEach(function(inputOpts){
            var id = inputOpts.id || inputOpts.name;

            that._inputs[id] = new FormHelper({

                margins: [10,10],

                form: that.form,
                name: inputOpts.name,
                placeholder: inputOpts.placeholder,
                type: inputOpts.type,
                value: inputOpts.value,
                size: inputOpts.size,
                att: inputOpts.attr
            });

        });

        Object.keys(this._inputs).forEach(function(key){
            that.allInputs.push(that._inputs[key]);
        });

    };

    PageView.prototype.addTimeframeSlider = function() {
        var that = this;

        // Timeframe button
        //  Popover list to change the Timeframe

        this.timeframeView = new View();
        this.timeframeView.Surface = new Surface({
            content: '<span>Timeframe:</span> No Rush',
            wrap: '<div class="set-timeframe"></div>',
            size: [undefined, true],
            classes: ['todo-add-summary-timeframe-default']
        });
        this.timeframeView.Surface.pipe(this.form._formScrollView);
        this.timeframeView.Surface.on('click', function(){
            // no 'click' action
            var timeframes = ['ASAP','Today','No Rush'];

            Utils.Popover.List({
                title: 'title',
                text: 'text',
                list: _.map(timeframes, function(timeframe,idx){
                    return {
                        text: timeframe,
                        success: function(){
                            that.summary.detail.timeframe = idx; // 0,1,2
                            that.update_content();
                        }
                    };
                })
            });
        });
        this.timeframeView.getSize = function(val){
            return that.timeframeView.Surface.getSize(val);
        };
        this.timeframeView.add(this.timeframeView.Surface);
        // this.contentScrollView.Views.push(this.timeframeView);

        this.allInputs.push(this.timeframeView);

    };

    PageView.prototype.createSubmitButton = function(){
        var that = this;

        this.submitButton = new FormHelper({
            form: this.form,
            type: 'submit',
            value: 'Update Job',
            margins: [10,10],
            click: this.save_todo.bind(this)
        });

        this.allInputs.push(this.submitButton);

    };

    PageView.prototype.createGroupView = function(){
        var that = this;

        // Group Name
        this.groupView = new View();
        this.groupView.Surface = new Surface({
            content: '<div class="no-location">Group Name here</div>',
            size: [undefined, true],
            classes: ['todo-add-summary-location-default']
        });
        this.groupView.Surface.pipe(this.contentScrollView);
        this.groupView.Surface.on('click', function(){
            // no 'click' action
        });
        this.groupView.getSize = function(){
            return that.groupView.Surface.getSize();
        };
        this.groupView.add(this.groupView.Surface);
        this.contentScrollView.Views.push(this.groupView);

    };

    PageView.prototype.createImageView = function(){
        var that = this;

        // Images
        this.imagesView = new View();
        this.imagesView.Surface = new Surface({
            content: '<div class="not-taken"><i class="icon ion-camera"></i></div>',
            size: [undefined, true],
            classes: ['todo-add-summary-take-picture']
        });
        this.imagesView.Surface.pipe(this.contentScrollView);
        this.imagesView.Surface.on('click', function(){
            // that.options.passed.on_choose('images');

            // Take picture
            Utils.takePicture('camera', {}, function(imageURI){
                Timer.setTimeout(function(){
                    that.imagesView.Surface.setContent('<div class="taken"><img src="'+imageURI+'" /></div>');
                },1000);
                that.upload_todo_image(imageURI);
            }, function(message){
                // failed taking a picture
                console.log(message);
                console.log(JSON.stringify(message));
                Utils.Notification.Toast('Failed picture');
            });

        });
        this.imagesView.getSize = function(){
            return that.imagesView.Surface.getSize();
        };
        this.imagesView.add(this.imagesView.Surface);
        this.contentScrollView.Views.push(this.imagesView);

    };

    PageView.prototype.createDetailView = function(){
        var that = this;

        // Location
        this.detailView = new View();
        this.detailView.Surface = new Surface({
            content: '',
            size: [undefined, true],
            classes: ['todo-add-summary-location-default']
        });
        this.detailView.Surface.pipe(this.contentScrollView);
        this.detailView.Surface.on('click', function(){
            that.options.passed.on_choose('detail');

            // Get location from GPS

        });
        this.detailView.getSize = function(){
            return that.detailView.Surface.getSize(true);
        };
        this.detailView.add(this.detailView.Surface);
        this.contentScrollView.Views.push(this.detailView);

    };

    PageView.prototype.createLocationView = function(){
        var that = this;

        // Location
        this.locationView = new View();
        this.locationView.Surface = new Surface({
            content: '',
            size: [undefined, true],
            classes: ['todo-add-summary-location-default']
        });
        this.locationView.Surface.pipe(this.contentScrollView);
        this.locationView.Surface.on('click', function(){
            that.options.passed.on_choose('location');

            // Get location from GPS

        });
        this.locationView.getSize = function(){
            return that.locationView.Surface.getSize(true);
        };
        this.locationView.add(this.locationView.Surface);
        this.contentScrollView.Views.push(this.locationView);

    };

    PageView.prototype.createPaymentView = function(){
        var that = this;

        // payment method
        this.paymentView = new View();
        this.paymentView.Surface = new Surface({
            content: '',
            size: [undefined, true],
            classes: ['todo-add-summary-payment-default','next-option']
        });
        this.paymentView.Surface.on('click', function(){
            that.options.passed.on_choose('payment');
        });
        this.paymentView.getSize = function(){
            return that.paymentView.Surface.getSize(true);
        };
        this.paymentView.add(this.paymentView.Surface);
        this.contentScrollView.Views.push(this.paymentView);

    };

    PageView.prototype.upload_todo_image = function(imageURI){
        var that = this;

        Utils.Notification.Toast('Uploading');

        console.log('uploading...');
        console.log(this.player_id);
        console.log({
            token : App.Data.UserToken,
            extra: {
                "description": "Uploaded from my phone testing 234970897"
            }
        });

        var ft = new FileTransfer(),
            options = new FileUploadOptions();

        options.fileKey = "file";
        options.fileName = 'filename.jpg'; // We will use the name auto-generated by Node at the server side.
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
        options.params = {
            token : App.Data.UserToken,
            // player_id : this.player_id,
            extra: {
                "description": "Uploaded from my phone testing 293048"
            }
        };

        ft.onprogress = function(progressEvent) {
            
            if (progressEvent.lengthComputable) {
                // loadingStatus.setPercentage(progressEvent.loaded / progressEvent.total);
                // console.log('Percent:');
                // console.log(progressEvent.loaded);
                // console.log(progressEvent.total);
                console.log((progressEvent.loaded / progressEvent.total) * 100);
                Utils.Notification.Toast((Math.floor((progressEvent.loaded / progressEvent.total) * 1000) / 10).toString() + '%');
            } else {
                // Not sure what is going on here...
                // loadingStatus.increment();
                console.log('not computable?, increment');
            }
        };
        ft.upload(imageURI, Credentials.server_root + "media/todophoto",
            function (r) {
                // getFeed();
                // alert('complete');
                // alert('upload succeeded');
                Utils.Notification.Toast('Upload succeeded');
                Utils.Notification.Toast('~30 seconds to process');

                // r.responseCode
                var response = JSON.parse(r.response);

                // Expecting to get back a media_id that we'll use for uploading the Todo/Pickup

                if(response._id){
                    Utils.Notification.Toast(response._id);
                    that.summary.media_id = response._id;
                }



                // // update collection
                // Timer.setTimeout(function(){
                //     that.model.fetch();
                // },5000);

            },
            function (e) {
                console.error(e);
                Utils.Notification.Toast('Upload failed');
            }, options);
    };

    PageView.prototype.update_content = function() {
        var that = this;

        this.summary = App.Cache[this.WizardOptionsKey].summary;
        this.AllowedRoutes = {
            images : true,
            location: true,
            weight: true,
            comment: true,
            payment: true
        };

        // // Images
        // if(this.summary.images){
        //     this.imagesView.Surface.setContent('<div>Images</div><div><span class="ellipsis-all">'+ 'images' +'</span></div>');
            
        //     // Allow the next one to be displayed
        //     this.AllowedRoutes.players = true;
        //     this.AllowedRoutes.teams = true;

        // } else {
        //     this.imagesView.Surface.setContent('<div>Images</div><div>Choose Images</div>');
        // }



        // // Group Name
        // if(!this.options.passed.summary.group.get('name')){
        //     this.groupView.Surface.setContent('');
        // } else {
        //     this.groupView.Surface.setContent('<div class="no-location">'+S(this.options.passed.summary.group.get('name'))+'</div>');
        // }

        // // Detail
        // if(this.summary.detail){
        //     this.detailView.Surface.setContent(template_detail(this.summary));
        // } else {
        //     this.detailView.Surface.setContent('<div class="no-location"><i class="icon ion-information-circled"></i></div>');
        // }

        // // Payment method
        // if(this.summary.payment){
        //     this.paymentView.Surface.setContent(template_payment(this.summary));
        // } else {
        //     this.paymentView.Surface.setContent('<div class="no-payment"><i class="icon ion-card"></i></div>');
        // }

        // // Teams
        // if(this.summary.SingleOrTeam == 'singles'){
        //     // No Teams to show
        //     this.TeamsView.Surface.setContent('');
        // } else {
        //     if(this.AllowedRoutes.teams && this.summary.team_results && this.summary.team_results != {}){
        //         this.TeamsView.Surface.setClasses(['todo-add-summary-topic-default','next-option']);
        //         this.TeamsView.Surface.setContent('<div>Teams</div><div><span class="ellipsis-all">'+ Object.keys(this.summary.team_results).length +' Teams</span></div>');

        //         // Allow the next one to be displayed
        //         this.AllowedRoutes.result = true;
        //     } else {
        //         if(this.AllowedRoutes.teams) {
        //             this.TeamsView.Surface.setClasses(['todo-add-summary-topic-default','next-option']);
        //         } else {
        //             this.TeamsView.Surface.setClasses(['todo-add-summary-topic-default']);
        //         }
        //         this.TeamsView.Surface.setContent('<div>Teams</div><div>Select Teams</div>');
        //     }
        // }

        // // Players
        // if(this.AllowedRoutes.players && this.summary.player_results && Object.keys(this.summary.player_results).length > 0){
        //     this.playersView.Surface.setClasses(['todo-add-summary-topic-default','next-option']);
        //     // say if it also incudes me?
        //     this.playersView.Surface.setContent('<div>Players</div><div><span class="ellipsis-all">'+ Object.keys(this.summary.player_results).length +' Players</span></div>');

        //     // Allow the next one to be displayed
        //     this.AllowedRoutes.result = true;
        //     // console.log(this.summary);
        //     // debugger;
        // } else {
        //     if(this.AllowedRoutes.players) {
        //         this.playersView.Surface.setClasses(['todo-add-summary-topic-default','next-option']);
        //     } else {
        //         this.playersView.Surface.setClasses(['todo-add-summary-topic-default']);
        //     }
        //     this.playersView.Surface.setContent('<div>Players</div><div>Select Players</div>');
        // }

        // // Results (checkmark)
        // if(this.AllowedRoutes.result && this.summary.result){
        //     this.resultView.Surface.setClasses(['todo-add-summary-topic-default','next-option']);
        //     this.resultView.Surface.setContent('<div>Result</div><div><span class="ellipsis-all"> <i class="icon ion-checkmark-circled"></i> </span></div>');
        // } else {
        //     if(this.AllowedRoutes.result) {
        //         this.resultView.Surface.setClasses(['todo-add-summary-topic-default','next-option']);
        //     } else {
        //         this.resultView.Surface.setClasses(['todo-add-summary-topic-default']);
        //     }
        //     this.resultView.Surface.setContent('<div>Result</div><div>Add Results</div>');
        // }



    };

    PageView.prototype.save_todo = function(ev){
        var that = this;

        if(this.checking === true){
            // return;
        }
        this.checking = true;

        var formData = {};

        // Determine what data, and format, we'll send up to the server to store this Todo
        // formData.images = this.summary.images;

        // // picture (only taking one for now)
        // if(!this.summary.media_id){
        //     Utils.Notification.Toast('Include a picture!');
        //     return;
        // }
        // formData.images = [this.summary.media_id];

        // title
        formData.title = this._inputs['title'].getValue().toString();
        if(!formData.title){
            Utils.Notification.Toast('Include a title!');
            return;
        }

        // detail/description
        formData.details = this._inputs['details'].getValue().toString();

        // // Group_id
        // formData.group_id = this.summary.group.get('_id');

        // // payment
        // if(!this.summary.payment){
        //     Utils.Notification.Toast('Include a payment method!');
        //     return;
        // }
        // formData.payment_source_id = this.summary.payment._id;

        this.submitButton.setContent('..Please Wait..');

        // Get elements to save
        this.model.set(formData);

        this.model.save(formData,{
            patch: true
        })
            .fail(function(){
    
                that.checking = false;
                that.submitButton.setContent('Update Job');                

            })
            .then(function(newModel){

                // that.checking = false;
                // that.submitButtonSurface.setContent('Create Todo');

                Utils.Notification.Toast('Job Updated');

                // // Create the new one
                // // - causes a "populated" to be created that is valid
                // var newTodo = new TodoModel.Todo(newModel);


                // Clear player cache
                // - todo...

                // Clear history
                App.history.backTo('StartEdit');

                // // Redirect to the new Todo
                // App.history.navigate('todo/' + that.model.get('_id'));

                

            });

        return false;
    };

    PageView.prototype.launch_popover_team_with_ind = function(){
        var that = this;

        App.Cache.HelpPopoverModal = {
            title: 'Team + Individual',
            body: "You can now include results for both the team, and the individuals", // could even pass a surface!?!?
            on_done: function(){
                App.history.navigate('random2',{history: false});
            }
        };
        // navigate
        App.history.navigate('modal/helppopover', {history: false});

    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Content
                        Timer.setTimeout(function(){

                            // Opacity 0
                            that.layout.content.StateModifier.setOpacity(0, transitionOptions.inTransition);

                        }, 1);

                        break;
                }

                break;
            case 'showing':

                if(this._refreshData){
                    // Timer.setTimeout(this.refreshData.bind(this), 1000);

                    // Run the "update"
                    this.update_content();

                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight * -1.5,0));
                        // that.contentScrollView.Views.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        // });

                        // Content
                        // - extra delay for other content to be gone
                        Timer.setTimeout(function(){

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0),{
                                duration: 450,
                                curve: Easing.outSine
                            });


                        }, delayShowing +transitionOptions.outTransition.duration);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };




    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50]
        },
        footer: {
            size: [undefined, 0]
        },
        content: {
            size: [undefined, undefined]
        }
    };

    module.exports = PageView;

});