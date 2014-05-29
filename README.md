# Photo Smash

A node.js script that makes a video out of a directory of photos - sorta like pummelvision.com

##Getting started!
There's a fair few bits and bobs to install to get this badboy up and running

Download and install [ImageMagick](http://www.imagemagick.org/) - This is for resizing your images into the required format.

Download and install [FFmpeg](http://www.ffmpeg.org/) - This is for merging the images into a video.

Download and install the [x264](http://www.videolan.org/developers/x264.html) encoder - This enables us to encode the video in shiney HD.

Download and install [node.js](http://nodejs.org/) - The glue that holds everything together.

Then we're onto the fun stuff:

Install [gm](https://github.com/aheckmann/gm) through npm

`npm install gm`

Install Fluent [FFmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) through npm

`npm install fluent-ffmpeg`

Then you should be good to go - Add some images to the `in` folder - Open up terminal and navigate to the folder that contains `smash.js`

Once you're there set it off:

`node smash.js`
