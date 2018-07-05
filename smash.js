const fs = require('fs-extra');
const gm = require('gm');
const im = gm.subClass({ imageMagick: true });
const FFmpeg = require('fluent-ffmpeg');
const prompt = require('prompt');
const ExifImage = require('exif').ExifImage;

class PhotoSmash
{
	constructor()
	{
		//config
		this.dir = {
			input: "./in/",
			temp: "./temp/",
			tempPhoto: "./temp/photo/",
			tempVideo: "./temp/video/",
			output: "./out/"
		}

		this.size = {
			width:1920, 
			height:1080
		};
		
		this.FPS = {
			in: 8.5,
			out: 30
		}

		let chunkSize = 350;

		this.IMG_EXT = ".jpg";
		
		//global vars
		this.list = {
			files: [],
			images: []
		}
		
		this.chunk = {
			count: chunkSize,
			length: chunkSize
		}

		this.processIndex = 0;

		this.smash();
	}

	async smash()
	{
		try
		{
			await this.start();
			await this.orderImages();
			await this.proccessImages();
			await this.buildVideos();
			await this.stitchVideos();
			
			console.log("Done");
		}
		catch(error)
		{
			console.log("Error > ", error)
		}
	
	}
	
	start()
	{
		return new Promise((resolve, reject) => 
		{
			for(let key in this.dir)
			{
				fs.ensureDirSync(this.dir[key])
			}

			fs.emptyDirSync(this.dir.tempPhoto);

			fs.emptyDirSync(this.dir.tempVideo);

			//Check for errors
			let errors = [];

			if(!this.hasInputImages())
			{
				errors.push("The input folder does not have any valid images to process. Please add .jpg images.");
			}
			
			if(errors.length == 0)
			{
				prompt.start();
				
				prompt.get(['BPM'], (err, result) =>
				{			
					if(isNaN(result.BPM))
					{
						console.info("No number set, will use IPS: " + this.FPS.in);
					}
					else
					{
						this.FPS.in = this.bpmToIps(result.BPM);
					
						console.info("Processing > BPM: " + result.BPM + " | FPS: " +  this.FPS.out + " | IPS: " + this.FPS.in);
					}

					this.list.files = this.getImageFileList();

					resolve();
				});
			}
			else
			{		
				reject(errors.join("\n"));
			}
		});
	}
	
	async orderImages()
	{
		return new Promise(async (resolve, reject) =>
		{
			console.log('Getting EXIF data');

			for(let i = 0; i < this.list.files.length; i++)
			{
				let name = this.list.files[i];
	
				if(name != '.DS_Store')
				{
					await this.orderImage(name).catch((message) =>
					{
						console.log(message);
					});
				}
			}
	
			resolve();
		});
	}
	
	orderImage(path)
	{
		return new Promise((resolve, reject) =>
		{
			console.log("Get EXIF >", this.dir.input + path);
	
			try
			{
				new ExifImage({ image : this.dir.input + path}, (error, exifData) =>
				{
					if (error)
					{
						reject(error.message, ": ", path);
					}
					else
					{
						this.list.images.push({
							"name": path,
							"date": Number(this.getImageDate(exifData))
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
	
	async proccessImages()
	{
		return new Promise(async (resolve, reject) =>
		{
			console.log("Processing images...");
			
			this.list.images.sort(this.sortImages);

			for(let i = 0; i < this.list.images.length; i++)
			{
				await this.processImage(this.list.images[i], i);
			}
	
			resolve();
		});
	}

	getFrameName(index)
	{
		let imageNumber;
			
		switch(String(index).length)
		{
			case 1:
				imageNumber = '00' + index;
				break;
			case 2:
				imageNumber = '0' + index;
				break;
			case 3:
				imageNumber = index;
				break;
		}

		return "frame_" + imageNumber + this.IMG_EXT;
	}
	
	processImage(image, index)
	{
		return new Promise((resolve, reject) =>
		{			
			//chunk time!!!
			if(index > this.chunk.count)
			{
				this.chunk.count += this.chunk.length;

				this.processIndex = 0;
			}

			var chunkDir = this.dir.tempPhoto + this.chunk.count + "/";

			/*
				"why create chunks?" You might ask.

				It appears that ffmpeg can only process around 400 frames at once into a video. 
				I have no idea why (its probably memory/machine related). So we chunk out the video 
				creation so we can process a few thousand frames and not worry about anything getting lost. 
				
				Whoop!
			*/

			fs.ensureDirSync(chunkDir);
			
			let imageName = this.getFrameName(this.processIndex);
	
			console.log("Processing chunk " + this.chunk.count +" frame: " + image.name + " >>> " + imageName);

			try
			{
				im(this.dir.input + image.name)
					.background('#000000')
					.autoOrient()
					.resize(this.size.width)
					.gravity('Center')
					.crop(this.size.width, this.size.height, 0, 0)
					//.extent(width, height)
					.noProfile()
					.write(chunkDir + imageName, (err) =>
					{
						if (!err)
						{				
							resolve('Finished processing image: ' + imageName);

							this.processIndex++;
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

	async buildVideos()
	{
		return new Promise(async (resolve, reject) =>
		{
			console.log('building video chunks data');

			let chunkDirs = fs.readdirSync(this.dir.tempPhoto);

			for(var i = 0; i < chunkDirs.length; i++)
			{
				await this.buildVideo(chunkDirs[i]).catch(function(message)
				{
					console.log(message);
				});
			}
	
			resolve();
		});
	}
	
	buildVideo(chunk)
	{
		return new Promise((resolve, reject) =>
		{
			console.log("Generating Video Chunk " + chunk + "...");

			/*
				Options 
				- '-pix_fmt yuv420p' http://superuser.com/questions/704744/video-produced-from-bmp-files-only-plays-in-vlc-but-no-other-players
			*/
	
			let outputName = this.dir.tempVideo + chunk + ".mp4";
	
			new FFmpeg({source: this.dir.tempPhoto + chunk + '/frame_%03d' + this.IMG_EXT})
				.withNoAudio()
				.withVideoCodec('libx264')
				.withSize(this.size.width + 'x' + this.size.height)
				.withVideoBitrate('2000k')
				.withFpsInput(this.FPS.in)
				.withFpsOutput(this.FPS.out)
				.addOptions(['-crf 19', '-preset slow', '-pix_fmt yuv420p'])
				.on('progress', (progress) =>
				{
					//deferred.notify("Processing frames: " + progress.frames);
					console.log("Processing chunk " + chunk + " frames: " + progress.frames);
				})
				.on('error', (err, stdout, stderr) =>
				{
					var sb = [];
					
					sb.push('Cannot process video: ' + err.message);
					sb.push("ffmpeg stdout:\n" + stdout);
					sb.push("ffmpeg stderr:\n" + stderr);
					
					reject(sb.join("\n"));
				})
				.on('end', () =>
				{
					resolve();
				})
				.saveToFile(outputName);
		});
	}

	async stitchVideos()
	{
		return new Promise((resolve, reject) =>
		{
			var fileList = fs.readdirSync(this.dir.tempVideo);

			var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

			fileList.sort(collator.compare);

			var listFileName = this.dir.temp + 'videolist.txt'; 

			var fileNames = [];

			fileList.forEach(function(fileName, index)
			{
				fileNames.push("file '" + "video/" + fileName + "'");
			});

			fs.writeFileSync(listFileName, fileNames.join("\n"));
			
			new FFmpeg()
				.input(listFileName)
				.inputOptions(['-f concat', '-safe 0'])
				.outputOptions('-c copy')
				.on('error', (err, stdout, stderr) =>
				{
					var sb = [];
					
					sb.push('Cannot process video: ' + err.message);
					sb.push("ffmpeg stdout:\n" + stdout);
					sb.push("ffmpeg stderr:\n" + stderr);
					
					reject(sb.join("\n"));
				})
				.on('end', () =>
				{
					resolve();
				})
				.save(this.genFileName());
		});
	}
	
	/* utility mehods */
	
	getImageFileList()
	{
		let files = fs.readdirSync(this.dir.input);
	
		let result = [];
	
		for(var i = 0; i < files.length; i++)
		{
			let item = files[i];
			
			let name = item.toLowerCase()

			if(name.indexOf(".jpg") > -1 || name.indexOf(".png") > -1)
			{
				result.push(item);
			}
		}
	
		return result;
	}
	
	bpmToIps(bpm)
	{
		let ipsRaw = (this.FPS.out * 60) / bpm;
		
		return Math.round(ipsRaw * 100) / 100;
	}
	
	hasInputImages()
	{	
		let entries = this.getImageFileList();
		
		return (entries.length > 0);
	}

	genFileName()
	{
		let now = new Date();
	
		let sb = [
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			now.getHours(),
			now.getMinutes()
		];
	
		return this.dir.output + sb.join("-") + ".mp4";
	}
	
	getImageDate(data)
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
	
	sortImages(a,b)
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
}

new PhotoSmash();