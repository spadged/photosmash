var fs = require('fs');
var gm = require('gm');
var im = gm.subClass({ imageMagick: true });
var FFmpeg = require('fluent-ffmpeg');
var prompt = require('prompt');
var ExifImage = require('exif').ExifImage;
var Q = require('q');

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
	start()
		.then(orderImages)
		.then(proccessImages)
		.then(buildVideo);
}

function start()
{
	var errors = [];
	
	var deferred = Q.defer();
	  
	if(!hasFolders())
	{
		errors.push("One or more of the required folders are missing (in, out, temp). Try running 'npm install' first.");
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
			IPS = bpmToIps(result.BPM);
			
			console.info("Processing > BPM: " + result.BPM + " | FPS: " +  FPS + " | IPS: " + IPS);
			
			console.log("Processing images...");
	
			fileList = fs.readdirSync(input);
			
			deferred.resolve();
		});
	}
	else
	{		
		var error = new Error(errors.join("\n"));
		
        deferred.reject(error);
	}
	
	return deferred.promise;
}

function bpmToIps(bpm)
{
	var ipsRaw = (FPS * 60) / bpm;
	
	return Math.round(ipsRaw * 100) / 100;
}

function hasInputImages()
{
	return true;
}

function hasFolders()
{
	return true;
}

function orderImages()
{
	var promises = [];
	
	for(var i = 0; i < fileList.length; i++)
	{
		promises.push(orderImage(fileList[i]));
	}
	
	return Q.all(promises);
}

function orderImage(path)
{
	var deferred = Q.defer();
	
	deferred.notify("Getting EXIF data for: ", path);

	try
	{
		new ExifImage({ image : input + path}, function (error, exifData)
		{
			if (error)
			{
				var error = new Error('Error: ' + error.message);
		
        		deferred.reject(error);
			}
			else
			{
				imageList.push({
					"name": path,
					"date": Number(getImageDate(exifData))
				});
				
				deferred.resolve();
			}
		});
	}
	catch (error)
	{		
		var error = new Error('Error: ' + error.message);
		
        deferred.reject(error);	
	}
	
	return deferred.promise;
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

function proccessImages()
{
	var promises = [];
	
	imageList.sort(sortImages);
	
	for(var i = 0; i < imageList.length; i++)
	{
		promises.push(processImage(imageList[i], i));
	}
	
	return Q.all(promises);
}

function processImage(image, index)
{
	var deferred = Q.defer();
	
	deferred.notify("Processing image: " + image.name);
	
	var width = size.width;
	
	var height = size.height;
	
	var imageNumber;
	
	switch(String(index).length)
	{
		case 1:
			imageNumber = '000' + index;
			break;
		case 2:
			imageNumber = '00' + index;
			break;
		case 3:
			imageNumber = '0' + index;
			break;
		default:
			imageNumber = index;
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
				deferred.resolve('Finished processing image: ' + imageName);
			}
			else
			{				
				var error = new Error('Error processing images: ' + err);
				
				deferred.reject(error);
			}
		});
		
	return deferred.promise;
}

function buildVideo()
{
	console.log("Generating Video...");
	
	var deferred = Q.defer();
	
	new FFmpeg({source: temp + 'frame_%04d.png' })
		.withNoAudio()
		.withVideoCodec('libx264')
		.withSize(size.width + 'x' + size.height)
		.withVideoBitrate('2000k')
		.withFpsInput(IPS)
		.withFpsOutput(FPS)
		.addOptions(['-crf 19', '-preset slow'])
		.on('progress', function(progress)
		{
			deferred.notify("Processing frames: " + progress.frames);
		})
		.on('error', function(err, stdout, stderr)
		{
			var sb = [];
			
			sb.push('Cannot process video: ' + err.message);
			sb.push("ffmpeg stdout:\n" + stdout);
			sb.push("ffmpeg stderr:\n" + stderr);
			
			var error = new Error(sb.join("\n"));
			
			deferred.reject(error);
		})
		.on('end', function()
		{
			deferred.resolve();
		})
		.saveToFile(output + 'output.mp4');
	
	return deferred.promise;
}

smash();