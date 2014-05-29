# Photo Smash

A node.js script that  will assemble a directory of images into a video of fast-moving images, like [pummelvision.com](http://pummelvision.com) by [@jakelodwick](https://github.com/jakelodwick).

Inspired by the [Ghettovision](https://github.com/jamiew/ghettovision) script by [@jamiew](https://github.com/jamiew).

1. read a directory of input images
2. generate letterboxed 1280x720 JPEG intermediates
3. encode intermediates into sexy MPEG4 video
4. add your own music and enjoy!

##Dependancies

- node.js
- imagemagick
- FFmpeg

##Setup
There's a fair few bits and bobs to install to get this badboy up and running:

- Download and install [ImageMagick](http://www.imagemagick.org/) (Image processing)
- Download and install [FFmpeg](http://www.ffmpeg.org/) (Video generation)
- Download and install the [x264 encoder](http://www.videolan.org/developers/x264.html) (Encoding)
- Download and install [node.js](http://nodejs.org/) - (Glue)

Then we're onto the fun stuff:

- Install [gm](https://github.com/aheckmann/gm) through npm 
`npm install gm`
- Install [Fluent FFmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) through npm 
`npm install fluent-ffmpeg`

##Usage

Add some images to the `in` folder - Open up your terminal (or command prompt) and navigate to the folder that contains `smash.js`

Once there, set it off:

`node smash.js`

You should find your finished video in the `out` folder.

##Settings
The settings are geared towards high quality, you will end up with quite weighty videos if you don't tweak the settings.

You'll find the api documentation for [mp here](https://github.com/aheckmann/gm#basic-usage) and [Fluent FFmpeg here](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#supplying-ffmpeg-options).

##License

This source code released under an MIT license
