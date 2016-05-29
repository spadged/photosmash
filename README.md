# Photo Smash

A node.js script that  will assemble a directory of images into a video of fast-moving images, like [pummelvision.com](http://pummelvision.com) by [@jakelodwick](https://github.com/jakelodwick).

Inspired by the [Ghettovision](https://github.com/jamiew/ghettovision) script by [@jamiew](https://github.com/jamiew).

1. read a directory of input images
2. generate letterboxed 1280x720 JPEG intermediates
3. encode intermediates into sexy MPEG4 video
4. add your own music and enjoy!

##Dependencies

- node.js
- imagemagick
- FFmpeg
- [gm](https://github.com/aheckmann/gm)
- [Fluent FFmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)

##Setup
There's a fair few bits and bobs to install to get this badboy up and running:

- Download and install [ImageMagick](http://www.imagemagick.org/) (Image processing)
- Download and install [FFmpeg](http://www.ffmpeg.org/) (Video generation)
- Download and install the [x264 encoder](http://www.videolan.org/developers/x264.html) (Encoding)
- Download and install [node.js](http://nodejs.org/) - (Glue)

Then we're onto the fun stuff:

To install all the NPM dependencies, run:
`npm install`

##Usage

Add some images to the `in` folder - Open up your terminal (or command prompt) and navigate to the folder that contains `smash.js`

Once there, set it off:

`node smash.js`

You should find your finished video in the `out` folder.

##Settings
The settings are geared towards high quality, you will end up with quite weighty videos if you don't tweak the settings.

You'll find the api documentation for [mp here](https://github.com/aheckmann/gm#basic-usage) and [Fluent FFmpeg here](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#supplying-ffmpeg-options).

##Syncing Music
<inprogress>
So to sync the 2 up, you’ll need to know the BPM of the track:

https://songbpm.com/

and then convert that into frames per beat:

http://www.vjamm.com/support_av_bpm.php?lang=en

Once you know your frames per beat, var that equates to the images per second both called IPS!

So to get your required FPS lets use my one of my favourite songs: 

Freak by LFO > 135 bpm 
FPS of clip > 30 fps

= 8.02615933412604 images per second
</inprogress>

##Todo
- Add BPM var and calulate images per second by what that is set to
- ask user what the desired BPM is on run
- Check in, out, temp folders exist. Throw errors if not
- pre conversion read in image meta data, arange items by date taken if possible (rather than file number)

##License

This source code released under an MIT license
