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
    var StandardPageView = require('views/common/StandardPageView');
    var StandardHeader = require('views/common/StandardHeader');
    var FormHelper = require('views/common/FormHelper');

    var BoxLayout = require('famous-boxlayout');
    
    var EventHandler = require('famous/core/EventHandler');

    // Models
    var UserModel = require('models/user');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this._showing = false;

        // Model
        this.model = App.Data.User;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createHeader();
        this.createContent();
        
        // Attach to render tree
        this.add(this.layout);

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
            content: "Edit Profile",
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
        this.layout.header.add(Utils.usePlane('header',100)).add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        this.form = new FormHelper({
            type: 'form',
            scroll: true
        });

        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(Utils.usePlane('content')).add(this.form);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces

        // Profile photo
        // Profile Image
        this.ProfileImage = new View();
        this.ProfileImage.SizeMod = new StateModifier({
            size: [undefined, 120]
        });
        this.ProfileImage.OriginMod = new StateModifier({
            origin: [0.5, 0.5]
        });
        this.ProfileImage.Surface = new ImageSurface({
            content: 'img/generic-profile.png',
            size: [110,110],
            properties: {
                borderRadius: "50%",
                border: "1px solid #444"
            }
        });

        // update via model
        this.model.on('sync', function(){
            if(that.model.get('profilephoto.urls')){
                that.ProfileImage.Surface.setContent(that.model.get('profilephoto.urls.thumb300x300'));
            } else {
                that.ProfileImage.Surface.setContent('img/generic-profile.png');
            }
        });
        this.model.trigger('sync');

        this.ProfileImage.add(this.ProfileImage.SizeMod).add(this.ProfileImage.OriginMod).add(this.ProfileImage.Surface);
        this.ProfileImage.Surface.on('click', function(){
        
            // Launch options for photo

            // Slide to the change screen for the player
            // that.previousPage = window.location.hash;

            // Options and details
            Utils.Popover.Buttons({
                title: 'Take new photo',
                // text: 'text here',
                buttons: [
                    {
                        text: "Camera",
                        value: "camera",
                        success: function(){
                            Utils.takePicture('camera', {}, that.uploadProfileImage.bind(that), function(message){
                                // failed taking a picture
                                console.log(message);
                                console.log(JSON.stringify(message));
                                Utils.Notification.Toast('Failed picture');
                            });
                        }
                    },
                    {
                        text: "Gallery",
                        value: "gallery",
                        success: function(){
                            Utils.takePicture('gallery', {}, that.uploadProfileImage.bind(that), function(message){
                                // failed taking a picture
                                console.log(message);
                                console.log(JSON.stringify(message));
                                Utils.Notification.Toast('Failed picture');
                            });
                        }
                    }
                ]
            });

        });
        this.ProfileImage.Surface.pipe(this.form._formScrollView);


        this.inputName = new FormHelper({

            margins: [10,10],

            form: this.form,
            name: 'name',
            placeholder: 'Name',
            type: 'text',
            value: this.model.get('profile.name')
        });

        this.inputBio = new FormHelper({

            margins: [10,10],
            size: [undefined, 200],

            form: this.form,
            name: 'bio',
            placeholder: 'Enter your public message',
            type: 'textarea',
            value: this.model.get('profile.bio')
        });

        this.submitButton = new FormHelper({
            form: this.form,
            type: 'submit',
            value: 'Save Profile',
            margins: [10,10],
            click: this.save_profile.bind(this)
        });


        this.form.addInputsToForm([
            this.ProfileImage,
            this.inputName,
            this.inputBio,
            this.submitButton
        ]);


        return;











        // // Build Surfaces
        // // - add to scrollView

        // this.contentScrollView.Views.push(this.ProfileImage);


        // // Name
        // this.inputNameSurface = new InputSurface({
        //     name: 'name',
        //     placeholder: 'Name',
        //     type: 'text',
        //     size: [undefined, 50],
        //     value: this.model.get('profile.name')
        // });
        // this.inputNameSurface.pipe(this.contentScrollView);
        // this.inputNameSurface.View = new View();
        // this.inputNameSurface.View.StateModifier = new StateModifier();
        // this.inputNameSurface.View.add(this.inputNameSurface.View.StateModifier).add(this.inputNameSurface);
        // this.contentScrollView.Views.push(this.inputNameSurface.View);

        // // Bio
        // this.inputBioSurface = new TextAreaSurface({
        //     name: 'bio',
        //     placeholder: 'A little about yourself',
        //     type: 'text',
        //     size: [undefined, window.innerHeight / 3],
        //     value: this.model.get('profile.bio')
        // });
        // this.inputBioSurface.pipe(this.contentScrollView);
        // this.inputBioSurface.View = new View();
        // this.inputBioSurface.View.StateModifier = new StateModifier();
        // this.inputBioSurface.View.add(this.inputBioSurface.View.StateModifier).add(this.inputBioSurface);
        // this.contentScrollView.Views.push(this.inputBioSurface.View);

        // this.submitButtonSurface = new Surface({
        //     content: 'Save Profile',
        //     size: [undefined, 60],
        //     classes: ['form-button-submit-default']
        // });
        // this.submitButtonSurface.View = new View();
        // this.submitButtonSurface.View.StateModifier = new StateModifier();
        // this.submitButtonSurface.View.add(this.submitButtonSurface.View.StateModifier).add(this.submitButtonSurface);
        // this.contentScrollView.Views.push(this.submitButtonSurface.View);

        // // Events for surfaces
        // this.submitButtonSurface.on('click', this.save_profile.bind(this));


    };

    PageView.prototype.save_profile = function(ev){
        var that = this;

        if(this.checking){
            return;
        }
        this.checking = true;

        // validate name
        var name = $.trim(this.inputName.getValue().toString());
        if(name.length === 0){
            return;
        }

        var bio = $.trim(this.inputBio.getValue().toString());

        // Disable submit
        this.submitButton.setContent('Saving...');

        // Get elements to save
        this.model.save({
            profile_name: name,
            profile_bio: bio
        },{
            patch: true,
            success: function(response){

                that.checking = false;
                that.submitButton.setContent('Save Profile');
                that.model.fetch();

                App.history.back();
            }
        });

        // // console.log(this.model.toJSON());
        // // debugger;
        // // return;

        // this.model.save()
        //     .then(function(newModel){
                
        //         // Enable submit
        //         that.submitButtonSurface.setSize([undefined, 40]);

        //         // Clear driver cache
        //         // - todo...

        //         // Redirect to the new user
        //         // that.$('.back-button').trigger('click');
        //         App.history.navigate('driver/' + newModel._id, {trigger: true});
                

        //     });

        return false;
    };

    PageView.prototype.uploadProfileImage = function(imageURI){
        var that = this;

        Utils.Notification.Toast('Uploading');

        console.log('uploading...');
        console.log(this.player_id);
        console.log({
            token : App.Data.UserToken,
            // player_id : this.player_id,
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
                "description": "Uploaded from my phone testing 193246"
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
        ft.upload(imageURI, Credentials.server_root + "media/profilephoto",
            function (e) {
                // getFeed();
                // alert('complete');
                // alert('upload succeeded');
                Utils.Notification.Toast('Upload succeeded');
                Utils.Notification.Toast('~30 seconds to process');

                // update collection
                Timer.setTimeout(function(){
                    that.model.fetch();
                },5000);

            },
            function (e) {
                console.error(e);
                Utils.Notification.Toast('Upload failed');
            }, options);
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
                        Timer.setTimeout(function(){

                            // Slide content left
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                this._showing = true;
                if(this._refreshData){
                    // Timer.setTimeout(that.refreshData.bind(that), 1000);
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
                        Timer.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // Bring in button surfaces individually
                            // that.contentScrollView.Views.forEach(function(surf, index){
                                // Timer.setTimeout(function(){
                                //     surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                                //         duration: 750,
                                //         curve: Easing.inOutElastic
                                //     });
                                // }, index * 50);
                            // });

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
