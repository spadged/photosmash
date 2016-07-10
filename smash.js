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

var directories = {
	input: "./in/",
	temp: "./temp/",
	output: "./out/"
}

var size = {width:1920, height:1080};

var fileList = [];

var imageList = [];

var IPS = 8;

var FPS = 30;

function smash()
{
	Q.fcall(start)
		.then(clearDirTemp)
		.then(orderImages)
		.then(proccessImages)
		.then(buildVideo)
		.catch(function(message)
		{
			console.log("Error > ", message);
		})
		.progress(function(message)
		{
			console.log(message);
		})
		.done(function()
		{
			console.log("Done");
		});
}

function genFileName()
{
	var now = new Date();
	
	// todo: not working as expected

	return now.getFullYear() + now.getMonth() + now.getDate() + now.getHours() + now.getMinutes() + ".mp4";
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
		errors.push("The input folder does not have any valid images to process. Please add .jpg images.");
	}
	
	if(errors.length == 0)
	{
		prompt.start();
		
		prompt.get(['BPM'], function (err, result)
		{			
			IPS = bpmToIps(result.BPM);
			
			console.info("Processing > BPM: " + result.BPM + " | FPS: " +  FPS + " | IPS: " + IPS);
	
			fileList = fs.readdirSync(input);
			
			deferred.resolve();
		});
	}
	else
	{		
        deferred.reject(errors.join("\n"));
	}
	
	return deferred.promise;
}

function getImageFileList()
{
	var list = fs.readdirSync(input);

	//todo: loop over array and remove folders, and files that don't end in .jpg from array

	return list;
}

function bpmToIps(bpm)
{
	var ipsRaw = (FPS * 60) / bpm;
	
	return Math.round(ipsRaw * 100) / 100;
}

function hasInputImages()
{	
	var entries = getImageFileList();
	
	return (entries.length > 0);
}

function hasFolders()
{
	return true; 

	//todo: detect existance of input, output & temp folders. If anyone doesn't exist, create it
}

function clearDirTemp()
{
	var deferred = Q.defer();
	
	console.log("Clearing out temp files");

	fs.readdir(
		temp,
		function(err, files)
		{
    		if (err)
			{
      			console.log(err);

				deferred.reject("Error clearing out temp dir");
    		}
			else
			{
				if (files.length === 0)
				{
					deferred.resolve();
				}
				else
				{
					for(var i = 0; i < files.length; i++)
					{
						var fileName = files[i];

						
						fs.unlinkSync(temp + fileName);
						
					}

					deferred.resolve();
				}
			}
		}
	);

	return deferred.promise;
}

function orderImages()
{
	var promises = [];
	
	console.log('Getting EXIF data');

	for(var i = 0; i < fileList.length; i++)
	{
		var name = fileList[i];

		if(name != '.DS_Store')
		{
			promises.push(orderImage(name));
		}
	}
	
	return Q.all(promises);
}

function orderImage(path)
{
	var deferred = Q.defer();

	console.log("Getting EXIF data for: ", path);

	try
	{
		new ExifImage({ image : input + path}, function (error, exifData)
		{
			if (error)
			{
        		deferred.reject(error.message);
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
        deferred.reject(error.message);	
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
	
	console.log("Processing images...");

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
	
	console.log("Processing frame: " + imageName);

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
				deferred.reject('Error processing images: ' + err);
			}
		});
		
	return deferred.promise;
}

function buildVideo()
{
	console.log("Generating Video...");
	
	var deferred = Q.defer();
	
	/*
		Options 
		- '-pix_fmt yuv420p' http://superuser.com/questions/704744/video-produced-from-bmp-files-only-plays-in-vlc-but-no-other-players
	*/

	var outputName = genFileName();

	new FFmpeg({source: temp + 'frame_%04d.png' })
		.withNoAudio()
		.withVideoCodec('libx264')
		.withSize(size.width + 'x' + size.height)
		.withVideoBitrate('2000k')
		.withFpsInput(IPS)
		.withFpsOutput(FPS)
		.addOptions(['-crf 19', '-preset slow', '-pix_fmt yuv420p'])
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
			
			deferred.reject(sb.join("\n"));
		})
		.on('end', function()
		{
			deferred.resolve();
		})
		.saveToFile(output + outputName);

		//todo: timestamp output filename
	
	return deferred.promise;
}

smash();

//todo: ignore files in input folder that are not jpg or png
//todo: need to chunk out video generation to 100 images at a time then stitch them all together