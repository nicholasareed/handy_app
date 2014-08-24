/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode')

    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");
    var FlexibleLayout = require("famous/views/FlexibleLayout");

    var Backbone = require('backbone-adapter');
    var StoryModel = require("models/story");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');
    var moment = require('moment');
    var Credentials         = JSON.parse(require('text!credentials.json'));

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/GameStoryListItem.html');
    var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.game_id = this.options.game_id;

        // Create collection of Games for game_id
        this.collection = new StoryModel.StoryCollection([], {
            game_id: this.game_id
        });
        this.collection.infiniteResults = 0;
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        this.collection.on("add", this.addOne, this);
        this.collection.on("error", function(){
            console.error('Collection error');
            // // Already fetched successfully?
            // if(this.collection.hasFetched){
            //     Utils.Notification.Toast('Error when updating');
            // } else {
            //     Utils.Notification.Toast('Attempting to reload games');
            //     this.collection.pager({reset: true});
            // }
        });

        this.collection.on("request", function(){
            // todo

        });

        this.collection.pager({prefill: true});


        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.lightbox = new RenderController({
            // showOrigin: [0.5, 0]
        });

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: "Loading",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.emptyListSurface = new Surface({
            content: "None to Show",
            size: [undefined, 100],
            classes: ['empty-list-surface-default']
        });
        this.lightbox.show(this.loadingSurface);

        // // Add Lightbox to page
        // this.add(this.lightbox);


        // Create LightboxButtons for Render Infinity Buttons (refreshing, etc.)
        this.lightboxButtons = new RenderController({
            // showOrigin: [0.5, 0]
        });

        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default']
        });

        // Loaded 'em all!
        // - shows "X total games"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default']
        });

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default']
        });
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });

        // Add to view
        // this.add(this.lightboxButtons);

        // Show loading surface
        this.lightboxButtons.show(this.infinityLoadingSurface);


        // Using a SequentialLayout
        this.layout = new SequentialLayout({
            // size: [undefined, 300]
        });

        this.contentLayout = new SequentialLayout({
            // size: [undefined, 300]
        });
        this.contentLayout.Views = [];

        this.createAddBar();


        // Sequence main layout from the game surfaces, and the buttons
        // debugger;
        this.layout.sequenceFrom([
            this.contentAddBar,
            this.lightbox, // rendercontroller holding a SequentialLayout
            this.lightboxButtons
        ]);

        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error

        // this.add(this.layoutSizeMod).add(this.layout); 
        this.add(this.layout);

        // this.layout.getSize = function(){
        //     return [undefined, 1500];
        // };

        // this.lightbox.getSize = function(){
        //     // console.log(that.layout);
        //     // console.log(that.lightbox);
        //     // console.log(that.lightbox._size);
        //     // console.log(that.lightbox);
        //     // debugger;
        //     // console.log(that.lightbox.__proto__.__proto__.getSize.call(that.lightbox));
        //     // debugger;
        //     return [undefined, 1500];
        // };

        this.getSize = function(){
            return [undefined, that.contentLayout.getSize(true)[1] + 100 + 50]
        };

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;

    SubView.prototype.createAddBar = function() { 
        var that = this;

        // Create Grid
        this.contentAddBar = new View();
        this.contentAddBar.Grid = new GridLayout({
            dimensions: [2,1]
        });
        this.contentAddBar.Grid.Views = [];
        this.contentAddBar.Grid.sequenceFrom(this.contentAddBar.Grid.Views);
        this.contentAddBar.SizeMod = new StateModifier({
            size: [undefined, 50]
        });
        this.contentAddBar.add(this.contentAddBar.SizeMod).add(this.contentAddBar.Grid);
        
        // Add Grid items
        // - gallery/camera
        // - text

        // Add Text (popup asking for text)
        this.contentAddBar.AddText = new View();
        this.contentAddBar.AddText.Surface = new Surface({
            content: '<i class="icon ion-ios7-photos"></i><div>Text</div>',
            size: [undefined, undefined],
            classes: ['game-feed-tabbar-default', 'on']
        });
        this.contentAddBar.AddText.Surface.pipe(this._eventOutput);
        this.contentAddBar.AddText.Surface.on('click', function(){
            var t = prompt("Enter your text");
            if(t && t.length > 0){
                that.saveStory({
                    type: 'text',
                    text: t
                });
            }
        });
        this.contentAddBar.AddText.add(this.contentAddBar.AddText.Surface);
        this.contentAddBar.Grid.Views.push(this.contentAddBar.AddText);


        // Add Media (popover asking for camera/gallery)
        this.contentAddBar.AddText = new View();
        this.contentAddBar.AddText.Surface = new Surface({
            content: '<i class="icon ion-images"></i><div>Photo</div>',
            size: [undefined, undefined],
            classes: ['game-feed-tabbar-default', 'on']
        });
        this.contentAddBar.AddText.Surface.pipe(this._eventOutput);
        this.contentAddBar.AddText.Surface.on('click', function(){
            
            // Options and details
            App.Cache.OptionModal = {
                list: [
                    {
                        text: "Take Photo with Camera",
                        value: "camera"
                    },
                    {
                        text: "Choose from Gallery",
                        value: "gallery"
                    }
                ],
                on_choose: function(chosen_type){
                    switch(chosen_type.value){
                        case 'camera':
                            Utils.takePicture('camera', {}, that.uploadImage.bind(that), function(message){
                                // failed taking a picture
                            });
                            break;
                        case 'gallery':
                            Utils.takePicture('gallery', {}, that.uploadImage.bind(that), function(message){
                                // failed taking a picture
                            });
                            break;
                        default:
                            return;
                    }
                    // App.history.navigate(that.previousPage);
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                },
                title: 'Set a Profile Picture'
            };

            // Change history (must)
            App.history.navigate('modal/list', {history: false});

        });
        this.contentAddBar.AddText.add(this.contentAddBar.AddText.Surface);
        this.contentAddBar.Grid.Views.push(this.contentAddBar.AddText);


        //     content: '<i class="icon ion-ios7-photos"></i><div>Highlights</div>',
        //     onClasses: ['profile-tabbar-default', 'on'],
        //     offClasses: ['profile-tabbar-default', 'off']

    };


    // Upload image to server
    SubView.prototype.uploadImage = function(imageURI){
        // upload = function (imageURI) {
        var that = this;

        console.log('uploading...');
        console.log({
            token : App.Data.UserToken,
            game_id : this.game_id,
            extra: {
                "description": "Uploaded from my phone testing 3249879dsfs"
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
            game_id : this.game_id,
            extra: {
                "description": "Uploaded from my phone testing 3249879dsfs"
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
        ft.upload(imageURI, Credentials.server_root + "/game/media", // no game_id needed, added it to the body
            function (e) {
                // getFeed();
                // alert('complete');
                // alert('upload succeeded');
                Utils.Notification.Toast('Upload succeeded');


                Utils.Notification.Toast('Please Wait');

                // update collection
                Timer.setTimeout(function(){
                    Utils.Notification.Toast('Refreshing');
                    that.collection.fetch();
                },5000);

            },
            function (e) {
                alert("Upload failed");
                Utils.Notification.Toast('Upload failed');
                // Utils.Notification.Toast(e);
            }, options);
    };


    SubView.prototype.saveStory = function(storyOpts) { 
        var that = this;

        var storyData = {
            type: '', // text/media
            game_id: that.game_id,
            player_id: App.Data.Players.findMe().get('_id'),
            story_template_id: "53a1f80f736770086231a930",
            // text: 'Here is some sample text'

        };

        storyData = _.defaults(storyData, storyOpts);

        var Story = new StoryModel.Story(storyData);
        Story.save()
        .then(function(result){
            console.log(result);

            Utils.Notification.Toast('Please Wait');

            // update collection
            Timer.setTimeout(function(){
                Utils.Notification.Toast('Refreshing');
                that.collection.fetch();
            },1000);
        });

    };

    SubView.prototype.addOne = function(Story) { 
        var that = this;
        
        moment.lang('en', {
            relativeTime : {
                future: "in %s",
                past:   "%s ago",
                s:  "1s",
                m:  "1m",
                mm: "%dm",
                h:  "1h",
                hh: "%dh",
                d:  "1d",
                dd: "%dd",
                M:  "1m",
                MM: "%dm",
                y:  "1y",
                yy: "%dy"
            }
        });

        // console.log('Adding a Game Surface');
        // console.log(Game);

        var StoryIndex = this.contentLayout.Views.length;


        // Media or Text?

        switch(Story.get('type')){
            case 'text':

                var storyView = new View();
                storyView.Surface = new Surface({
                    content: template({
                        player_id: Story.get('player_id'),
                        ago: moment(Story.get('created')).format('h:mma - MMM Do'),
                        text: Story.get('details.text')
                    }), //Utils.htmlEncode(Story.get('details.text')),
                    size: [undefined, 40],
                    classes: ['game-story-text-default']
                });
                Utils.dataModelReplaceOnSurface(storyView.Surface);
                storyView.Surface.pipe(this._eventOutput);
                storyView.Surface.Model = Story;
                this.contentLayout.Views.push(storyView.Surface);
                this.collection.infiniteResults += 1;

                // if(!this.contentLayout.isSeq){
                    // this.contentLayout.isSeq = true;
                    this.contentLayout.sequenceFrom(this.contentLayout.Views);
                // }

                return;

                break;

            case 'media':

                var media = Story.get('media_id');
                if(!media){
                    return; // media not ready yet? or invalid?
                }
                var storyView = new View();
                var imageSrc = '';
                try {
                    imageSrc = media.urls.thumb300x300;
                }catch(err){
                    // Not yet assembled
                    imageSrc = 'img/ajax-loader.gif'; // spinner
                    Timer.setTimeout(function(){
                        that.collection.once('sync', function(){
                            media = Story.get('media_id');
                            imageSrc = media.urls.thumb300x300;
                            storyView.Surface.setContent(template({
                                player_id: Story.get('player_id'),
                                ago: moment(Story.get('created')).format('h:mma - MMM Do'),
                                image_src: imageSrc
                            }));
                        },2000);
                        that.collection.fetch();
                    }, 10000);
                }
                
                storyView.Surface = new Surface({
                    content: template({
                        player_id: Story.get('player_id'),
                        ago: moment(Story.get('created')).format('h:mma - MMM Do'),
                        image_src: imageSrc
                    }), //Utils.htmlEncode(Story.get('details.text')),
                    size: [undefined, 320],
                    classes: ['game-story-text-default']
                });
                Utils.dataModelReplaceOnSurface(storyView.Surface);
                storyView.Surface.pipe(this._eventOutput);
                storyView.Surface.Model = Story;
                storyView.Surface.on('click', function(){
                    // View full image

                    // Ask what they want to do

                    App.Cache.OptionModal = {
                        list: [
                            {
                                text: 'View Image',
                                value: 'view'
                            },
                            {
                                text: 'Share Image and Link to Game',
                                value: 'share'
                            }
                        ],
                        on_choose: function(chosen_type){
                            // that.PlayerFilterChanger.Data = chosen_type.value;

                            switch(chosen_type.value){
                                case 'view':
                                    window.open(media.urls.original, '_system');
                                    break;
                                case 'share':
                                    window.plugins.socialsharing.share('',null,media.urls.original,'www.nemesisapp.net/game/public/' + Story.get('_id'));
                                    break;
                                default:
                                    break;
                            }

                        },
                        on_cancel: function(){
                            // App.history.navigate(that.previousPage);
                            // debugger;
                        },
                        // title: '',
                        back_to_default_hint: false
                    };

                    // Change history (must)
                    App.history.navigate('modal/list', {history: false});


                    // window.plugins.socialsharing.share('',null,'','www.nemesisapp.net/game/public/' + that.model.get('_id'));
                    // window.open(media.urls.original, '_system');

                });
                this.contentLayout.Views.push(storyView.Surface);
                this.collection.infiniteResults += 1;

                // if(!this.contentLayout.isSeq){
                    // this.contentLayout.isSeq = true;
                    this.contentLayout.sequenceFrom(this.contentLayout.Views);
                // }

                return;

                break;

            default:
                console.error('unsupported Story.type');
                console.log(Story.toJSON());
                debugger;
                break;
        }




        return;





        // // gameContent creation function, created at runtime
        // var storyFunc = function(){

        //     var tmpStory = Story.toJSON();

        //     var bgImage = '';
        //     if(tmpStory.template_data.bg_pattern){
        //         bgImage = 'url(img/transparenttextures/' + tmpStory.template_data.bg_pattern.toString() + '.png)';
        //     }

        //     return {
        //         // content: template({
        //         //     paginator: {
        //         //         currentPage: that.collection.currentPage + 1,
        //         //         firstPage: that.collection.firstPage,
        //         //         totalPages: that.collection.totalPages,
        //         //         totalResults: that.collection.totalResults
        //         //     },
        //         //     story: tmpStory
        //         // }),
        //         properties: {
        //             backgroundColor: tmpStory.template_data.bg_color,
        //             backgroundImage: bgImage,
        //             color: tmpStory.template_data.text_color,
        //         }
        //     };

        // };

        // var storyView = new View();

        // storyView.height = window.innerWidth;
        // if(storyView.height > 400){
        //     storyView.height = 400;
        // }
        // // use media_id height if included? (scaled correctly)
        // // -todo..

        // storyView.SizeMod = new StateModifier({
        //     size: [undefined, storyView.height]
        // });

        // var sc = storyFunc();

        // // Background surface (Image or Pattern Color)
        // storyView.BgSurface = new Surface({
        //     size: [undefined, undefined],
        //     content: '',
        //     properties: sc.properties
        // });

        // // Create layout
        // // - expands to size of container (using .SizeMod above)
        // storyView.Layout = new HeaderFooterLayout({
        //     headerSize: 40,
        //     footerSize: 40
        // });

        // // header (name of sport and time)
        // storyView.Layout._header = new View();
        // storyView.Layout._header.Grid = new GridLayout({
        //     dimensions: [2,1]
        // });
        // storyView.Layout._header.add(storyView.Layout._header.Grid);
        // // Player Name
        // storyView.Layout._header.Player = new Surface({
        //     content: '<div data-replace-id="'+Story.get('game_id')+'" data-replace-model="Player" data-replace-field="Profile.name">&nbsp;</div>',
        //     size: [undefined,undefined],
        //     properties: {
        //         color: Story.get('template_data').text_color,
        //         fontWeight: "400",
        //         paddingLeft: "8px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderBottom: "1px solid #f8f8f8"
        //     }
        // });
        // Utils.dataModelReplaceOnSurface(storyView.Layout._header.Player);
        // storyView.Layout._header.Player.pipe(this._eventOutput);
        // // Datetime (ago)
        // storyView.Layout._header.DateTime = new Surface({
        //     content: moment(Story.get('created')).fromNow(true),
        //     size: [undefined,undefined],
        //     properties: {
        //         color: Story.get('template_data').text_color,
        //         fontWeight: "100",
        //         textAlign: "right",
        //         paddingRight: "8px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderBottom: "1px solid #f8f8f8"
        //     }
        // });
        // storyView.Layout._header.DateTime.pipe(this._eventOutput);
        // // SequenceFrom
        // storyView.Layout._header.Grid.sequenceFrom([
        //     storyView.Layout._header.Player,
        //     storyView.Layout._header.DateTime
        // ]);
        // // Add header to local HeaderFooterLayout
        // storyView.Layout.header.add(storyView.Layout._header)

        // // content
        // storyView.Layout._content = new View();
        // storyView.Layout._content.BgSurface = new Surface({
        //     size: [undefined, undefined]
        // });
        // storyView.Layout._content.BgSurface.pipe(this._eventOutput);
        // storyView.Layout._content.Surface = new Surface({
        //     content: Story.get('template_data').headline,
        //     size: [undefined,true],
        //     properties: {
        //         textAlign: "center",
        //         color: Story.get('template_data').text_color,
        //         fontWeight: "bold",
        //         fontSize: "21px",
        //         textShadow: "0px 0px 1px #555"
        //     }
        // });
        // storyView.Layout._content.Surface.pipe(this._eventOutput);
        // storyView.Layout._content.BgSurface.on('click', function(){
        //     App.history.navigate('game/' + Story.get('game_id')._id);
        // });
        // storyView.Layout._content.Surface.on('click', function(){
        //     App.history.navigate('game/' + Story.get('game_id')._id);
        // });
        // var originMod = new StateModifier({
        //     origin: [0, 0.5]
        // });
        // var sizeMod = new StateModifier({
        //     size: [undefined, undefined],
        // });
        // storyView.Layout._content.add(storyView.Layout._content.BgSurface);
        // storyView.Layout._content.add(originMod).add(storyView.Layout._content.Surface);
        // storyView.Layout.content.add(storyView.Layout._content)


        // // footer (likes and comments)
        // storyView.Layout._footer = new View();
        // // storyView.Layout._footer.BgSurface = new Surface({
        // //     size: [undefined, undefined]
        // // });
        // // storyView.Layout._footer.BgSurface.pipe(this._eventOutput);
        // storyView.Layout._footer.Grid = new FlexibleLayout({
        //     ratios: [1, true, true]
        // });
        // storyView.Layout._footer.add(storyView.Layout._footer.Grid);
        // // Sport Name
        // storyView.Layout._footer.Sport = new Surface({
        //     content: Story.get('sport_id').name,
        //     size: [undefined,undefined],
        //     properties: {
        //         color: Story.get('template_data').text_color,
        //         fontWeight: "400",
        //         paddingLeft: "8px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderTop: "1px solid #f8f8f8"
        //     }
        // });
        // storyView.Layout._footer.Sport.pipe(this._eventOutput);
        // // Likes
        // storyView.Layout._footer.Likes = new Surface({
        //     content: '', //'<i class="icon ion-heart"></i> 3',
        //     size: [70,undefined],
        //     properties: {
        //         color: Story.get('template_data').text_color,
        //         // fontWeight: "100",
        //         textAlign: "left",
        //         // paddingRight: "8px",
        //         fontSize: "18px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderTop: "1px solid #f8f8f8"
        //     }
        // });
        // storyView.Layout._footer.Likes.pipe(this._eventOutput);
        // // Comments
        // storyView.Layout._footer.Comments = new Surface({
        //     content: '', //'<i class="icon ion-chatbubble"></i> 2',
        //     size: [70,undefined],
        //     properties: {
        //         color: Story.get('template_data').text_color,
        //         // fontWeight: "100",
        //         textAlign: "left",
        //         // paddingRight: "8px",
        //         fontSize: "18px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderTop: "1px solid #f8f8f8"
        //     }
        // });
        // storyView.Layout._footer.Comments.pipe(this._eventOutput);
        // // SequenceFrom
        // storyView.Layout._footer.Grid.sequenceFrom([
        //     storyView.Layout._footer.Sport,
        //     storyView.Layout._footer.Likes,
        //     storyView.Layout._footer.Comments
        // ]);
        // // Add header to local HeaderFooterLayout
        // storyView.Layout.footer.add(storyView.Layout._footer)

        // storyView.Layout._footer.on('click', function(){
        //     App.history.navigate('game/' + Story.get('game_id')._id);
        // });

        // // Add layout and background to rendertree
        // var sizeNode = storyView.add(storyView.SizeMod);
        // sizeNode.add(storyView.BgSurface);
        // sizeNode.add(storyView.Layout);


        // // storyView.OriginMod = new StateModifier({
        // //     // origin: [0.5, 0.5]
        // // });
        // // storyView.add(storyView.OriginMod).add(storyView.Surface);

        // storyView.Layout.Model = Story;

        // // Utils.dataModelReplaceOnSurface(storyView.Surface);

        // Story.on('change', function(){
        //     // re-render the story...
        //     // - todo...
        //     // var sc = storyContent();
        //     // storyView.Surface.setContent(sc.content);
        //     // storyView.Surface.setProperties(sc.properties);

        //     // Utils.dataModelReplaceOnSurface(storyView.Surface);

        //     console.error('not yet re-rendering a story on "change" event');

        // }, this);

        // // storyView.Surface.pipe(this._eventOutput);
        // // storyView.Layout.on('click', function(){
        // //     App.history.navigate('game/' + Story.get('game_id')._id);
        // // });
    

        // storyView.getSize = function(){
        //     // debugger;
        //     return [undefined, storyView.height];
        // };

        // this.contentLayout.Views.push(storyView);
        // this.collection.infiniteResults += 1;

        // // if(!this.contentLayout.isSeq){
        //     // this.contentLayout.isSeq = true;
        //     this.contentLayout.sequenceFrom(this.contentLayout.Views);
        // // }

    };

    SubView.prototype.updateCollectionStatus = function() { 

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent('Show More (' + amount_left + ')');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' Total');

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.contentLayout;
        }

        if(nextRenderable != this.lightbox.lastRenderable){
            this.lightbox.lastRenderable = nextRenderable;
            this.lightbox.show(nextRenderable);
        }


        // // Resort the contentLayout.Views
        // this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(surface){
        //     var m = moment(surface.Model.get('start_time'));
        //     return m.format('X') * -1;
        // });

        // Re-sequence
        if(this.contentLayout.Views.length > 0){

            // Make sure the Views are in the correct order
            // var tmpModels = _.pluck(this.contentLayout.Views,'Model');
            // var tmpOrder = _.pluck(tmpModels, 'created');
            // console.log(this.contentLayout.Views);
            this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(tmpView){
                // console.log(tmpView.Model.get('created'));
                var tmpDate = moment(tmpView.Model.get('created')).format('X');
                // console.log(tmpDate);
                var tmpResult = parseInt(tmpDate, 10);
                return tmpResult * -1;
            });
            this.contentLayout.sequenceFrom(this.contentLayout.Views);
        }

        // Show correct infinity buttons (More, All, etc.)
        this.render_infinity_buttons();

    };

    SubView.prototype.render_infinity_buttons = function(){
        // Renders the correct infinity-list buttons (the "Show More" or "Is loading" button/hint) at the bottom of the page

        // // Hide all dat shit
        // // - unnecessary?
        // this.$('.load-list').addClass('nodisplay');

        if(this.collection.hasFetched){
            // at the end?
            if(this.collection.infiniteResults == this.collection.totalResults){
                this.lightboxButtons.hide();
                // this.lightboxButtons.show(this.infinityLoadedAllSurface);
            } else {
                // Show more
                // - also includes the number more to show :)
                this.lightboxButtons.show(this.infinityShowMoreSurface);
                // this.$('.show-more').removeClass('nodisplay');
            }
        } else {
            // not yet fetched, so display the "loading" one
            this.lightboxButtons.show(this.infinityLoadingSurface);
            // this.$('.loading-progress').removeClass('nodisplay');
        }

    };

    SubView.prototype.next_page = function(){
        // Load more games
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');
        // debugger;

        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
