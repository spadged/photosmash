var fs = require('fs');
var gm = require('gm');
var im = gm.subClass({ imageMagick: true });
var FFmpeg = require('fluent-ffmpeg');
var prompt = require('prompt');
var ExifImage = require('exif').ExifImage;

var input = "./in/";
var temp = "./temp/";
var output = "./out/";

// 720
var size = {width:1280,height:720};

//1080
//var size = {width:1920,height:1080};

var fileList = [];

var fileIndex = 0;

var imageList = [];

var imageIndex = 0;

var IPS = 8;

var FPS = 30;

function smash()
{
	var errors = [];
	
	if(!hasFolders())
	{
		errors.push("One or more of the required folders are missing (in, out, temp). Try running 'npm install' first");
	}
	
	if(!hasInputImages())
	{
		errors.push("The input folder does not have any valid images to process. Please add .jpeg images.");
	}
	
	if(errors.length == 0)
	{
		prompt.start();
		
		prompt.get(['BPM'], function (err, result)
		{
			console.log('Command-line input received:');
			
			IPS = bpmToIps(result.BPM);
			
			console.info("Processing > BPM: " + result.BPM + " | FPS: " +  FPS + " | IPS: " + IPS);
			
			startProcess();
		});
	}
	else
	{
		for(var i = 0; i < errors.length; i++)
		{
			console.error(errors[i]);
		}
	}
}

function hasInputImages()
{
	return true;
}

function hasFolders()
{
	return true;
}

function startProcess()
{
	console.log("Processing images...");
	
	fileList = fs.readdirSync(input);
	
	orderImages();
}

function orderImages()
{
	var file = fileList[fileIndex];
	
	getExifData(file, function(data)
	{
		imageList.push({
			"name": file,
			"date": Number(getImageDate(data))
		});
		
		var targetFile = fileIndex++;
				
		if(targetFile != fileList.length-1)
		{
			orderImages();
		}
		else
		{
			console.log('Images ordered!');
			
			imageList.sort(sortImages);
			
			processImage();
		}
	});
}

function getImageDate(data)
{
	var fileDate = "";
	
	if(data.exif.hasOwnProperty("CreateDate"))
	{
		fileDate = data.exif.CreateDate;
	}
	else if(data.exif.hasOwnProperty("DateTimeOriginal"))
	{
		fileDate = data.exif.DateTimeOriginal;
	}
	else if(data.image.hasOwnProperty("ModifyDate"))
	{
		fileDate = data.image.ModifyDate;
	}
	else
	{
		console.error("Could not get date for image");
	}
	
	return fileDate.split(":").join("").replace(" ", "");
}

function bpmToIps(bpm)
{
	var ipsRaw = (FPS * 60) / bpm;
	
	return Math.round(ipsRaw * 100) / 100;
}

function sortImages(a,b)
{
	if (a.date < b.date)
	{
		return -1;
	}
	else if (a.date > b.date)
	{
		return 1;
	}
	else
	{
		 return 0;
	} 
}

function getExifData(imagePath, callback)
{
	try
	{
		new ExifImage({ image : input + imagePath }, function (error, exifData)
		{
			if (error)
			{
				console.log('Error: '+error.message);
			}
			else
			{
				callback(exifData);
			}
		});
	}
	catch (error)
	{
		console.log('Error: ' + error.message);
	}	
}

function processImage()
{
	var image = imageList[imageIndex];
	
	console.log("Processing image: " + image.name);
	
	var width = size.width;
	var height = size.height;
	
	var imageNumber;
	
	switch(String(imageIndex).length)
	{
		case 1:
			imageNumber = '000' + imageIndex;
			break;
		case 2:
			imageNumber = '00' + imageIndex;
			break;
		case 3:
			imageNumber = '0' + imageIndex;
			break;
		default:
			imageNumber = imageIndex;
			break;
	}
	
	var imageName = "frame_" + imageNumber + ".png";
	
	im(input + image.name)
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
			
			var targetImage = imageIndex++;
			
			if(targetImage != imageList.length - 1)
			{
				processImage();
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
	
	new FFmpeg({source: temp + 'frame_%04d.png' })
		.withNoAudio()
		.withVideoCodec('libx264')
		.withSize(size.width + 'x' + size.height)
		.withVideoBitrate('2000k')
		.withFpsInput(IPS)
		.withFpsOutput(FPS)
		.addOptions(['-crf 19', '-preset slow'])
		.on('progress', function(progress) {
			console.log("Processing frames: ", progress.frames);
		})
		.on('error', function(err, stdout, stderr) {
			console.log('Cannot process video: ' + err.message);
			console.log("ffmpeg stdout:\n" + stdout);
  			console.log("ffmpeg stderr:\n" + stderr);
		})
		.on('end', function() {
			console.log('Finished !');
		})
		.saveToFile(output + 'output.mp4');
}

smash();