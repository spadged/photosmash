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

###Windows

- Download and install [ImageMagick](http://www.imagemagick.org/) (Image processing)
- Download and install [FFmpeg](http://www.ffmpeg.org/) (Video generation)
- Download and install the [x264 encoder](http://www.videolan.org/developers/x264.html) (Encoding)


###OSX
- Install [homebrew](http://brew.sh/)
- Install imagemagick `brew install imagemagick`
- Install ffmpeg `brew install ffmpeg`

###Both
- Download and install [node.js](http://nodejs.org/) - (Glue)

Then we're onto the fun stuff:

To install all the NPM dependencies, run:
`npm install`

##Usage

Add some images to the `in` folder - Open up your terminal (or command prompt) and navigate to the folder that contains `smash.js`

Once there, set it off:

`node smash`

You should find your finished video in the `out` folder.

##Settings
The settings are geared towards high quality, you will end up with quite weighty videos if you don't tweak the settings.

You'll find the api documentation for [gm here](https://github.com/aheckmann/gm#basic-usage) and [Fluent FFmpeg here](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#supplying-ffmpeg-options).

##Todo
- Check in, out, temp folders exist. Throw errors if not
- Read in music file

##License

This source code released under an MIT license
