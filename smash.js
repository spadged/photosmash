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

var images;

var currentImage = 0;

var imageTotal;

var IPS = 0;

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

function startProcess()
{
	console.log("Processing images...");
		
	images = fs.readdirSync(input);
		
	imageTotal = images.length;
		
	processImage(images[currentImage]);
}

function getExifData(imagePath, callback)
{
	try
	{
		new ExifImage({ image : imagePath }, function (error, exifData)
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
	
	getExifData(image, function(exifData)
	{
		var imageName = getImageName(exifData);
		
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
		.withFpsOutput(FPS)
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

function getImageName(data)
{
	/*
		{
			image: {
				Make: 'FUJIFILM',
				Model: 'FinePix40i',
				Orientation: 1,
				XResolution: 72,
				YResolution: 72,
				ResolutionUnit: 2,
				Software: 'Digital Camera FinePix40i Ver1.39',
				ModifyDate: '2000:08:04 18:22:57',
				YCbCrPositioning: 2,
				Copyright: '          ',
				ExifOffset: 250
			},
			exif: {
				FNumber: 2.8,
				ExposureProgram: 2,
				ISO: 200,
				ExifVersion: <Buffer 30 32 31 30>,
				DateTimeOriginal: '2000:08:04 18:22:57',
				CreateDate: '2000:08:04 18:22:57',
				ComponentsConfiguration: <Buffer 01 02 03 00>,
				CompressedBitsPerPixel: 1.5,
				ShutterSpeedValue: 5.5,
				ApertureValue: 3,
				BrightnessValue: 0.26,
				ExposureCompensation: 0,
				MaxApertureValue: 3,
				MeteringMode: 5,
				Flash: 1,
				FocalLength: 8.7,
				MakerNote: <Buffer 46 55 4a 49 46 49 4c 4d 0c 00 00 00 0f 00 00 00 07 00 04 00 00 00 30 31 33 30 00 10 02 00 08 00 00 00 c6 00 00 00 01 10 03 00 01 00 00 00 03 00 00 00 02 ...>,
				FlashpixVersion: <Buffer 30 31 30 30>,
				ColorSpace: 1,
				ExifImageWidth: 2400,
				ExifImageHeight: 1800,
				InteropOffset: 926,
				FocalPlaneXResolution: 2381,
				FocalPlaneYResolution: 2381,
				FocalPlaneResolutionUnit: 3,
				SensingMethod: 2,
				FileSource: <Buffer 03>,
				SceneType: <Buffer 01>
			}
		}
		*/
	
	var fileName = "";
	
	if(data.exif.hasOwnProperty("CreateDate"))
	{
		fileName = formatDate(data.exif.CreateDate);
	}
	else if(data.exif.hasOwnProperty("DateTimeOriginal"))
	{
		fileName = formatDate(data.exif.DateTimeOriginal);
	}
	else if(data.image.hasOwnProperty("ModifyDate"))
	{
		fileName = formatDate(data.image.ModifyDate);
	}
	else
	{
		console.error("Could not get date for image");
	}
	
	return fileName;
}

function formatDate(input)
{
	//2000:08:04 18:22:57
	return input.split(":").join(".");
}

function bpmToIps(bpm)
{
	return (fps * 60) / bpm;
}

function hasInputImages()
{
	return true;
}

function hasFolders()
{
	return true;
}

smash();