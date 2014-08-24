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
    var SpotModel = require("models/spot");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');
    var moment = require('moment');
    var Credentials         = JSON.parse(require('text!credentials.json'));

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl                 = require('text!./tpl/EventSpotListItem.html');
    var template            = Handlebars.compile(tpl);

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.event_id = this.options.event_id;

        // Create collection of Events for event_id
        this.collection = new SpotModel.SpotCollection([], {
            event_id: this.event_id
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
            //     Utils.Notification.Toast('Attempting to reload events');
            //     this.collection.pager({reset: true});
            // }
        });

        this.collection.on("request", function(){
            // todo

        });

        this.collection.pager({prefill: true});


        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.createDefaultSurfaces();
        this.createDefaultLightboxes();


        // Using a SequentialLayout
        this.layout = new SequentialLayout({
            // size: [undefined, 300]
        });

        this.contentLayout = new SequentialLayout({
            // size: [undefined, 300]
        });
        this.contentLayout.Views = [];

        this.createAddHighlightButton();

        // this.createAddBar();


        // Sequence main layout from the event surfaces, and the buttons
        // debugger;
        this.layout.sequenceFrom([
            // this.contentAddBar,
            this.optionButtons,
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

    SubView.prototype.createDefaultSurfaces = function(){
        var that = this;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: "Loading",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.loadingSurface.pipe(this._eventOutput);
        this.emptyListSurface = new Surface({
            content: "No Comments",
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
                // backgroundColor: 'red'
            }
        });
        this.emptyListSurface.pipe(this._eventOutput);


        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default']
        });
        this.infinityLoadingSurface.pipe(this._eventOutput);

        // Loaded 'em all!
        // - shows "X total events"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default']
        });
        this.infinityLoadedAllSurface.pipe(this._eventOutput);

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default']
        });
        this.infinityShowMoreSurface.pipe(this._eventOutput);
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });
    };

    SubView.prototype.createDefaultLightboxes = function(){
        var that = this;

        // Content Lightbox
        this.lightbox = new RenderController();
        this.lightbox.show(this.loadingSurface);
        this.lightbox.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    return [undefined, s[1]];
                }
            }catch(err){}
            return [undefined, true];
        };

        // Buttons lightbox
        this.lightboxButtons = new RenderController();
        this.lightboxButtons.show(this.infinityLoadingSurface);
        this.lightboxButtons.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    return [undefined, s[1]];
                }
            }catch(err){}
            return [undefined, true];
        };

    };

    SubView.prototype.createAddHighlightButton = function() { 
        var that = this;

        this.optionButtons = new View();

        this.createButton = new Surface({
            content: '<div class="outward-button">Add a Highlight</div>',
            size: [undefined, 60],
            classes: ['button-outwards-default']
        });
        this.createButton.on('click', function(){
            // anyone is allowed to create a Game Result in here?
            if(1==0){
                return;
            }

            // if(!event.detail){
            //     return;
            // }

            // Options and details
            App.Cache.OptionModal = {
                list: [
                    {
                        text: "Photo Upload",
                        value: "media"
                    },
                    {
                        text: "Text Entry",
                        value: "text"
                    }
                ],
                on_choose: function(chosen_type){
                    switch(chosen_type.value){
                        case 'text':
                            Timer.setTimeout(function(){
                                var t = prompt("Enter your text");
                                if(t && t.length > 0){
                                    that.saveSpot({
                                        type: 'text',
                                        text: t
                                    });
                                }
                            },350);

                            break;
                        case 'media':
                            Timer.setTimeout(function(){

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
                                    title: 'Choose Image Source'
                                };

                                // Change history (must)
                                App.history.navigate('modal/list', {history: false});

                            },350);

                            break;
                        default:
                            return;
                    }
                    // App.history.navigate(that.previousPage);
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                },
                title: 'What type of Highlight?'
            };

            // Change history (must)
            App.history.navigate('modal/list', {history: false});

        });
        this.createButton.pipe(this._eventOutput);

        this.optionButtons.add(this.createButton);

    };


    // Upload image to server
    SubView.prototype.uploadImage = function(imageURI){
        // upload = function (imageURI) {
        var that = this;

        console.log('uploading...');
        console.log({
            token : App.Data.UserToken,
            event_id : this.event_id,
            extra: {
                "description": "Uploaded from my phone testing 98jf98ewfh923f"
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
            event_id : this.event_id,
            extra: {
                "description": "Uploaded from my phone testing 2049832n94732n9"
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
        ft.upload(imageURI, Credentials.server_root + "/spot/new/media", // no event_id needed, added it to the body
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


    SubView.prototype.saveSpot = function(spotOpts) { 
        var that = this;

        var spotData = {
            type: '', // text/media
            event_id: that.event_id,
            player_id: App.Data.Players.findMe().get('_id'),
            spot_template_id: "53cc75759518f759ff982d40",
            // text: 'Here is some sample text'

        };

        spotData = _.defaults(spotData, spotOpts);

        var Spot = new SpotModel.Spot(spotData);
        Spot.save()
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

    SubView.prototype.addOne = function(Spot) { 
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

        var SpotIndex = this.contentLayout.Views.length;


        // Media or Text?

        switch(Spot.get('type')){
            case 'text':

                var spotView = new View();
                spotView.Surface = new Surface({
                    content: template({
                        spot: Spot.toJSON(),
                        player_id: Spot.get('player_id'),
                        ago: moment(Spot.get('created')).format('MMM Do, h:mma'),
                        text: Spot.get('details.text')
                    }), //Utils.htmlEncode(Spot.get('details.text')),
                    size: [undefined, true],
                    classes: ['spot-list-default','spot-list-default-item']
                });
                spotView.Surface.getSize = function(){
                    return [undefined, this._size ? this._size[1]:undefined];
                };
                Utils.dataModelReplaceOnSurface(spotView.Surface);
                spotView.Surface.pipe(this._eventOutput);
                spotView.Surface.Model = Spot;
                this.contentLayout.Views.push(spotView.Surface);
                this.collection.infiniteResults += 1;

                // if(!this.contentLayout.isSeq){
                    // this.contentLayout.isSeq = true;
                    // this.contentLayout.sequenceFrom(this.contentLayout.Views);
                // }

                return;

                break;

            case 'media':

                var media = Spot.get('media_id');
                if(!media){
                    return; // media not ready yet? or invalid?
                }
                var spotView = new View();
                var imageSrc = '';
                try {
                    imageSrc = media.urls.thumb300x300;
                }catch(err){
                    // Not yet assembled
                    imageSrc = 'img/ajax-loader.gif'; // spinner
                    Timer.setTimeout(function(){
                        that.collection.once('sync', function(){
                            media = Spot.get('media_id');
                            imageSrc = media.urls.thumb300x300;
                            spotView.Surface.setContent(template({
                                player_id: Spot.get('player_id'),
                                ago: moment(Spot.get('created')).format('MMM Do, h:mma'),
                                image_src: imageSrc
                            }));
                        },2000);
                        that.collection.fetch();
                    }, 10000);
                }

                spotView.Surface = new Surface({
                    content: template({
                        spot: Spot.toJSON(),
                        player_id: Spot.get('player_id'),
                        ago: moment(Spot.get('created')).format('MMM Do, h:mma'),
                        image_src: imageSrc
                    }), //Utils.htmlEncode(Spot.get('details.text')),
                    size: [undefined, true],
                    classes: ['spot-list-default','spot-list-default-item']
                });
                spotView.Surface.getSize = function(){
                    return [undefined, this._size ? this._size[1]:undefined];
                };
                Utils.dataModelReplaceOnSurface(spotView.Surface);
                spotView.Surface.pipe(this._eventOutput);
                spotView.Surface.Model = Spot;
                spotView.Surface.on('click', function(){
                    // View full image

                    App.history.navigate('spot/' + Spot.get('_id'));

                    return;
                    // Ask what they want to do

                    App.Cache.OptionModal = {
                        list: [
                            {
                                text: 'View Image',
                                value: 'view'
                            },
                            {
                                text: 'Share Image and Link to Highlight',
                                value: 'share_highlight'
                            }
                        ],
                        on_choose: function(chosen_type){
                            // that.PlayerFilterChanger.Data = chosen_type.value;

                            switch(chosen_type.value){
                                case 'view':
                                    window.open(media.urls.original, '_system');
                                    break;
                                case 'share_highlight':
                                    window.plugins.socialsharing.share('',null,media.urls.original,'www.nemesisapp.net/highlight/public/' + Spot.get('_id'));
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


                    // window.plugins.socialsharing.share('',null,'','www.nemesisapp.net/event/public/' + that.model.get('_id'));
                    // window.open(media.urls.original, '_system');

                });
                this.contentLayout.Views.push(spotView.Surface);
                this.collection.infiniteResults += 1;

                // if(!this.contentLayout.isSeq){
                    // this.contentLayout.isSeq = true;
                    // this.contentLayout.sequenceFrom(this.contentLayout.Views);
                // }

                return;

                break;

            default:
                console.error('unsupported Spot.type');
                console.log(Spot.toJSON());
                debugger;
                break;
        }




        return;





        // // eventContent creation function, created at runtime
        // var spotFunc = function(){

        //     var tmpSpot = Spot.toJSON();

        //     var bgImage = '';
        //     if(tmpSpot.template_data.bg_pattern){
        //         bgImage = 'url(img/transparenttextures/' + tmpSpot.template_data.bg_pattern.toString() + '.png)';
        //     }

        //     return {
        //         // content: template({
        //         //     paginator: {
        //         //         currentPage: that.collection.currentPage + 1,
        //         //         firstPage: that.collection.firstPage,
        //         //         totalPages: that.collection.totalPages,
        //         //         totalResults: that.collection.totalResults
        //         //     },
        //         //     spot: tmpSpot
        //         // }),
        //         properties: {
        //             backgroundColor: tmpSpot.template_data.bg_color,
        //             backgroundImage: bgImage,
        //             color: tmpSpot.template_data.text_color,
        //         }
        //     };

        // };

        // var spotView = new View();

        // spotView.height = window.innerWidth;
        // if(spotView.height > 400){
        //     spotView.height = 400;
        // }
        // // use media_id height if included? (scaled correctly)
        // // -todo..

        // spotView.SizeMod = new StateModifier({
        //     size: [undefined, spotView.height]
        // });

        // var sc = spotFunc();

        // // Background surface (Image or Pattern Color)
        // spotView.BgSurface = new Surface({
        //     size: [undefined, undefined],
        //     content: '',
        //     properties: sc.properties
        // });

        // // Create layout
        // // - expands to size of container (using .SizeMod above)
        // spotView.Layout = new HeaderFooterLayout({
        //     headerSize: 40,
        //     footerSize: 40
        // });

        // // header (name of sport and time)
        // spotView.Layout._header = new View();
        // spotView.Layout._header.Grid = new GridLayout({
        //     dimensions: [2,1]
        // });
        // spotView.Layout._header.add(spotView.Layout._header.Grid);
        // // Player Name
        // spotView.Layout._header.Player = new Surface({
        //     content: '<div data-replace-id="'+Spot.get('event_id')+'" data-replace-model="Player" data-replace-field="Profile.name">&nbsp;</div>',
        //     size: [undefined,undefined],
        //     properties: {
        //         color: Spot.get('template_data').text_color,
        //         fontWeight: "400",
        //         paddingLeft: "8px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderBottom: "1px solid #f8f8f8"
        //     }
        // });
        // Utils.dataModelReplaceOnSurface(spotView.Layout._header.Player);
        // spotView.Layout._header.Player.pipe(this._eventOutput);
        // // Datetime (ago)
        // spotView.Layout._header.DateTime = new Surface({
        //     content: moment(Spot.get('created')).fromNow(true),
        //     size: [undefined,undefined],
        //     properties: {
        //         color: Spot.get('template_data').text_color,
        //         fontWeight: "100",
        //         textAlign: "right",
        //         paddingRight: "8px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderBottom: "1px solid #f8f8f8"
        //     }
        // });
        // spotView.Layout._header.DateTime.pipe(this._eventOutput);
        // // SequenceFrom
        // spotView.Layout._header.Grid.sequenceFrom([
        //     spotView.Layout._header.Player,
        //     spotView.Layout._header.DateTime
        // ]);
        // // Add header to local HeaderFooterLayout
        // spotView.Layout.header.add(spotView.Layout._header)

        // // content
        // spotView.Layout._content = new View();
        // spotView.Layout._content.BgSurface = new Surface({
        //     size: [undefined, undefined]
        // });
        // spotView.Layout._content.BgSurface.pipe(this._eventOutput);
        // spotView.Layout._content.Surface = new Surface({
        //     content: Spot.get('template_data').headline,
        //     size: [undefined,true],
        //     properties: {
        //         textAlign: "center",
        //         color: Spot.get('template_data').text_color,
        //         fontWeight: "bold",
        //         fontSize: "21px",
        //         textShadow: "0px 0px 1px #555"
        //     }
        // });
        // spotView.Layout._content.Surface.pipe(this._eventOutput);
        // spotView.Layout._content.BgSurface.on('click', function(){
        //     App.history.navigate('event/' + Spot.get('event_id')._id);
        // });
        // spotView.Layout._content.Surface.on('click', function(){
        //     App.history.navigate('event/' + Spot.get('event_id')._id);
        // });
        // var originMod = new StateModifier({
        //     origin: [0, 0.5]
        // });
        // var sizeMod = new StateModifier({
        //     size: [undefined, undefined],
        // });
        // spotView.Layout._content.add(spotView.Layout._content.BgSurface);
        // spotView.Layout._content.add(originMod).add(spotView.Layout._content.Surface);
        // spotView.Layout.content.add(spotView.Layout._content)


        // // footer (likes and comments)
        // spotView.Layout._footer = new View();
        // // spotView.Layout._footer.BgSurface = new Surface({
        // //     size: [undefined, undefined]
        // // });
        // // spotView.Layout._footer.BgSurface.pipe(this._eventOutput);
        // spotView.Layout._footer.Grid = new FlexibleLayout({
        //     ratios: [1, true, true]
        // });
        // spotView.Layout._footer.add(spotView.Layout._footer.Grid);
        // // Sport Name
        // spotView.Layout._footer.Sport = new Surface({
        //     content: Spot.get('sport_id').name,
        //     size: [undefined,undefined],
        //     properties: {
        //         color: Spot.get('template_data').text_color,
        //         fontWeight: "400",
        //         paddingLeft: "8px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderTop: "1px solid #f8f8f8"
        //     }
        // });
        // spotView.Layout._footer.Sport.pipe(this._eventOutput);
        // // Likes
        // spotView.Layout._footer.Likes = new Surface({
        //     content: '', //'<i class="icon ion-heart"></i> 3',
        //     size: [70,undefined],
        //     properties: {
        //         color: Spot.get('template_data').text_color,
        //         // fontWeight: "100",
        //         textAlign: "left",
        //         // paddingRight: "8px",
        //         fontSize: "18px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderTop: "1px solid #f8f8f8"
        //     }
        // });
        // spotView.Layout._footer.Likes.pipe(this._eventOutput);
        // // Comments
        // spotView.Layout._footer.Comments = new Surface({
        //     content: '', //'<i class="icon ion-chatbubble"></i> 2',
        //     size: [70,undefined],
        //     properties: {
        //         color: Spot.get('template_data').text_color,
        //         // fontWeight: "100",
        //         textAlign: "left",
        //         // paddingRight: "8px",
        //         fontSize: "18px",
        //         lineHeight: "40px",
        //         textShadow: "0px 0px 1px #999",
        //         // borderTop: "1px solid #f8f8f8"
        //     }
        // });
        // spotView.Layout._footer.Comments.pipe(this._eventOutput);
        // // SequenceFrom
        // spotView.Layout._footer.Grid.sequenceFrom([
        //     spotView.Layout._footer.Sport,
        //     spotView.Layout._footer.Likes,
        //     spotView.Layout._footer.Comments
        // ]);
        // // Add header to local HeaderFooterLayout
        // spotView.Layout.footer.add(spotView.Layout._footer)

        // spotView.Layout._footer.on('click', function(){
        //     App.history.navigate('event/' + Spot.get('event_id')._id);
        // });

        // // Add layout and background to rendertree
        // var sizeNode = spotView.add(spotView.SizeMod);
        // sizeNode.add(spotView.BgSurface);
        // sizeNode.add(spotView.Layout);


        // // spotView.OriginMod = new StateModifier({
        // //     // origin: [0.5, 0.5]
        // // });
        // // spotView.add(spotView.OriginMod).add(spotView.Surface);

        // spotView.Layout.Model = Spot;

        // // Utils.dataModelReplaceOnSurface(spotView.Surface);

        // Spot.on('change', function(){
        //     // re-render the spot...
        //     // - todo...
        //     // var sc = spotContent();
        //     // spotView.Surface.setContent(sc.content);
        //     // spotView.Surface.setProperties(sc.properties);

        //     // Utils.dataModelReplaceOnSurface(spotView.Surface);

        //     console.error('not yet re-rendering a spot on "change" event');

        // }, this);

        // // spotView.Surface.pipe(this._eventOutput);
        // // spotView.Layout.on('click', function(){
        // //     App.history.navigate('event/' + Spot.get('event_id')._id);
        // // });
    

        // spotView.getSize = function(){
        //     // debugger;
        //     return [undefined, spotView.height];
        // };

        // this.contentLayout.Views.push(spotView);
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
        // Load more events
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
