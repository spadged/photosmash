var fs = require('fs');
var gm = require('gm');
var im = gm.subClass({ imageMagick: true });
var FFmpeg = require('fluent-ffmpeg');

var input = "./in/";
var temp = "./temp/";
var output = "./out/";

// 720
var size = {width:1280,height:720};

//1080
//var size = {width:1920,height:1080};

var images;

var currentImage = 0;

var imageTotal;

var IPS = 8;

function smash()
{
	console.log("Processing images...");
	
	images = fs.readdirSync(input);
	
	imageTotal = images.length;
	
	processImage(images[currentImage]);
}

function processImage(image)
{
	console.log("Processing image: " + image);
	
	var width = size.width;
	var height = size.height;
	
	var imageNumber;
	
	switch(String(currentImage).length)
	{
		case 1:
			imageNumber = '00' + currentImage;
			break;
		case 2:
			imageNumber = '0' + currentImage;
			break;
		default:
			imageNumber = currentImage;
			break;
	}
	
	var imageName = "img_" + imageNumber + ".png"
	
	im(input + image)
		.background('#000000')
		.autoOrient()
		.resize(width)
		.gravity('Center')
		.crop(width, height,0,0)
		//.extent(width, height)
		.noProfile()
		.write(temp + imageName, function (err)
		{
			if (!err)
			{
				console.log('Finished processing image: ' + imageName);
			}
			else
			{
				console.log('Error processing images: ' + err);
			}
			
			var targetImage = currentImage++;
			
			if(targetImage != imageTotal)
			{
				processImage(images[targetImage]);
			}
			else
			{
				console.log('Images processed!');
				
				buildVideo();
			}
		});	
}

function buildVideo()
{
	console.log("Generating Video...");
	
	new FFmpeg({source: temp + 'img_%03d.png' })
		.withNoAudio()
		.withVideoCodec('libx264')
		.withSize(size.width + 'x' + size.height)
		.withVideoBitrate('2000k')
		.withFpsInput(IPS)
		.withFpsOutput(30)
		.addOptions(['-crf 19', '-preset slow'])
		.on('progress', function(progress) {
			console.log('Processing: ' + progress.percent + '% done');
		})
		.on('error', function(err) {
			console.log('Cannot process video: ' + err.message);
		})
		.on('end', function() {
			console.log('Finished !');
		})
		.saveToFile(output + 'output.mp4');
}

smash();