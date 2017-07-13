var fs = require('fs');
var gm = require('gm');
var im = gm.subClass({ imageMagick: true });
var FFmpeg = require('fluent-ffmpeg');
var prompt = require('prompt');
var ExifImage = require('exif').ExifImage;
var Q = require('q');

var dir = {
	input: "./in/",
	temp: "./temp/",
	output: "./out/"
}

var list = {
	files: [],
	images: []
}

var size = {
	width:1920, 
	height:1080
};

var FPS = {
	in: 8,
	out: 30
}

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

	var sb = [
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		now.getHours(),
		now.getMinutes()
	];

	return  sb.join("-") + ".mp4";
}

function start()
{
	var errors = [];
	
	var deferred = Q.defer();
	  
	checkFolders();
	
	if(!hasInputImages())
	{
		errors.push("The input folder does not have any valid images to process. Please add .jpg images.");
	}
	
	if(errors.length == 0)
	{
		prompt.start();
		
		prompt.get(['BPM'], function (err, result)
		{			
			FPS.in = bpmToIps(result.BPM);
			
			console.info("Processing > BPM: " + result.BPM + " | FPS: " +  FPS.out + " | IPS: " + FPS.in);
	
			list.files = getImageFileList();
			
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
	var files = fs.readdirSync(dir.input);

	var result = [];

	for(var i = 0; i < files.length; i++)
	{
		var item = files[i];

		if(item.toLowerCase().indexOf(".jpg") > -1)
		{
			result.push(item);
		}
	}

	return result;
}

function bpmToIps(bpm)
{
	var ipsRaw = (FPS.out * 60) / bpm;
	
	return Math.round(ipsRaw * 100) / 100;
}

function hasInputImages()
{	
	var entries = getImageFileList();
	
	return (entries.length > 0);
}

function checkFolders()
{
	for(var key in dir)
	{
		if(!fs.existsSync(dir[key]))
		{
			fs.mkdirSync(dir[key]);
		}
	}
}

function clearDirTemp()
{
	var deferred = Q.defer();
	
	console.log("Clearing out temp files");

	fs.readdir(
		dir.temp,
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

						fs.unlinkSync(dir.temp + fileName);
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

	for(var i = 0; i < list.files.length; i++)
	{
		var name = list.files[i];

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
		new ExifImage({ image : dir.input + path}, function (error, exifData)
		{
			if (error)
			{
        		deferred.reject(error.message);
			}
			else
			{
				list.images.push({
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

	list.images.sort(sortImages);
	
	for(var i = 0; i < list.images.length; i++)
	{
		promises.push(processImage(list.images[i], i));
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

	console.log("Processing frame: " + image.name + " >>> " + imageName);

	try
	{
		im(dir.input + image.name)
			.background('#000000')
			.autoOrient()
			.resize(width)
			.gravity('Center')
			.crop(width, height, 0, 0)
			//.extent(width, height)
			.noProfile()
			.write(dir.temp + imageName, function (err)
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
	}
	catch(e)
	{
		deferred.reject('ERROR: ' + e);
		console.log("Dropped frame!");
	}
		
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

	new FFmpeg({source: dir.temp + 'frame_%04d.png' })
		.withNoAudio()
		.withVideoCodec('libx264')
		.withSize(size.width + 'x' + size.height)
		.withVideoBitrate('2000k')
		.withFpsInput(FPS.in)
		.withFpsOutput(FPS.out)
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
		.saveToFile(dir.output + outputName);

		//todo: timestamp output filename
	
	return deferred.promise;
}

smash();

//todo: need to chunk out video generation to 100 images or so at a time then 
//stitch them all together. Currently craps out at about 620.