const fs = require('fs');
const gm = require('gm');
const im = gm.subClass({ imageMagick: true });
const FFmpeg = require('fluent-ffmpeg');
const prompt = require('prompt');
const ExifImage = require('exif').ExifImage;

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

async function smash()
{
	try
	{
		await start();
		await clearDirTemp();
		await orderImages();
		await proccessImages();
		//await buildVideo();
		
		console.log("Done");
	}
	catch(error)
	{
		console.log("Error > ", error)
	}

}

function start()
{
	return new Promise(function(resolve, reject) 
	{
		let errors = [];

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
				
				resolve();
			});
		}
		else
		{		
			reject(errors.join("\n"));
		}
	});
}

function clearDirTemp()
{
	return new Promise(function(resolve, reject)
	{
		console.log("Clearing out temp files");

		fs.readdir(
			dir.temp,
			function(err, files)
			{
				if (err)
				{
					console.log(err);

					reject("Error clearing out temp dir");
				}
				else
				{
					if (files.length === 0)
					{
						resolve();
					}
					else
					{
						for(var i = 0; i < files.length; i++)
						{
							let fileName = files[i];

							fs.unlinkSync(dir.temp + fileName);
						}

						resolve();
					}
				}
			}
		);
	});
}

async function orderImages()
{
	return new Promise(async function(resolve, reject)
	{
		console.log('Getting EXIF data');

		for(let i = 0; i < list.files.length; i++)
		{
			let name = list.files[i];

			if(name != '.DS_Store')
			{
				await orderImage(name).catch(function(message)
				{
					console.log(message);
				});
			}
		}

		resolve();
	});
}

function orderImage(path)
{
	return new Promise(function(resolve, reject)
	{
		console.log("Get EXIF >", path);

		try
		{
			new ExifImage({ image : dir.input + path}, function (error, exifData)
			{
				if (error)
				{
					reject(error.message, ": ", path);
				}
				else
				{
					list.images.push({
						"name": path,
						"date": Number(getImageDate(exifData))
					});
					
					console.log("Got EXIF >", path);

					resolve();
				}
			});
		}
		catch (error)
		{				
			reject(error.message, ": ", path);	
		}
	});
}

async function proccessImages()
{
	return new Promise(async function(resolve, reject)
	{
		console.log("Processing images...");
		
		list.images.sort(sortImages);
	
		for(let i = 0; i < list.images.length; i++)
		{
			await processImage(list.images[i], i);
		}

		resolve();
	});
}

function processImage(image, index)
{
	return new Promise(function(resolve, reject)
	{
		let width = size.width;
	
		let height = size.height;
		
		let imageNumber;
		
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
		
		let imageName = "frame_" + imageNumber + ".png";

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
						resolve('Finished processing image: ' + imageName);
					}
					else
					{								
						reject('Error processing images: ' + err);
					}
				});
		}
		catch(e)
		{
			reject(e);
			console.log("Dropped frame!");
		}
	});
}

function buildVideo()
{
	return new Promise(function(resolve, reject)
	{
		console.log("Generating Video...");
	
		/*
			Options 
			- '-pix_fmt yuv420p' http://superuser.com/questions/704744/video-produced-from-bmp-files-only-plays-in-vlc-but-no-other-players
		*/

		let outputName = genFileName();

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
				//deferred.notify("Processing frames: " + progress.frames);
				console.log("Processing frames: " + progress.frames);
			})
			.on('error', function(err, stdout, stderr)
			{
				var sb = [];
				
				sb.push('Cannot process video: ' + err.message);
				sb.push("ffmpeg stdout:\n" + stdout);
				sb.push("ffmpeg stderr:\n" + stderr);
				
				reject(sb.join("\n"));
			})
			.on('end', function()
			{
				resolve();
			})
			.saveToFile(dir.output + outputName);
	});
}

/* utility mehods */

function getImageFileList()
{
	let files = fs.readdirSync(dir.input);

	let result = [];

	for(var i = 0; i < files.length; i++)
	{
		let item = files[i];

		if(item.toLowerCase().indexOf(".jpg") > -1)
		{
			result.push(item);
		}
	}

	return result;
}

function bpmToIps(bpm)
{
	let ipsRaw = (FPS.out * 60) / bpm;
	
	return Math.round(ipsRaw * 100) / 100;
}

function hasInputImages()
{	
	let entries = getImageFileList();
	
	return (entries.length > 0);
}

function checkFolders()
{
	for(let key in dir)
	{
		if(!fs.existsSync(dir[key]))
		{
			fs.mkdirSync(dir[key]);
		}
	}
}

function genFileName()
{
	let now = new Date();

	let sb = [
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		now.getHours(),
		now.getMinutes()
	];

	return sb.join("-") + ".mp4";
}

function getImageDate(data)
{
	let fileDate = "";
	
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

smash();

//todo: need to chunk out video generation to 100 images or so at a time then 
//stitch them all together. Currently craps out at about 620.