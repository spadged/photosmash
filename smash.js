const fs = require('fs');
const gm = require('gm');
const im = gm.subClass({ imageMagick: true });
const FFmpeg = require('fluent-ffmpeg');
const prompt = require('prompt');
const ExifImage = require('exif').ExifImage;

class PhotoSmash
{
	constructor()
	{
		this.dir = {
			input: "./in/",
			temp: "./temp/",
			output: "./out/"
		}
		
		this.list = {
			files: [],
			images: []
		}
		
		this.size = {
			width:1920, 
			height:1080
		};
		
		this.FPS = {
			in: 8,
			out: 30
		}

		this.smash();
	}

	async smash()
	{
		try
		{
			await this.start();
			await this.clearDirTemp();
			await this.orderImages();
			await this.proccessImages();
			await this.buildVideo();
			
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
			let errors = [];
	
			this.checkFolders();
		
			if(!this.hasInputImages())
			{
				errors.push("The input folder does not have any valid images to process. Please add .jpg images.");
			}
			
			if(errors.length == 0)
			{
				prompt.start();
				
				prompt.get(['BPM'], (err, result) =>
				{			
					this.FPS.in = this.bpmToIps(result.BPM);
					
					console.info("Processing > BPM: " + result.BPM + " | FPS: " +  this.FPS.out + " | IPS: " + this.FPS.in);
			
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
	
	clearDirTemp()
	{
		return new Promise((resolve, reject) =>
		{
			console.log("Clearing out temp files");
	
			fs.readdir(
				this.dir.temp,
				(err, files) =>
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
	
								fs.unlinkSync(this.dir.temp + fileName);
							}
	
							resolve();
						}
					}
				}
			);
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
	
	processImage(image, index)
	{
		return new Promise((resolve, reject) =>
		{			
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
				im(this.dir.input + image.name)
					.background('#000000')
					.autoOrient()
					.resize(this.size.width)
					.gravity('Center')
					.crop(this.size.width, this.size.height, 0, 0)
					//.extent(width, height)
					.noProfile()
					.write(this.dir.temp + imageName, (err) =>
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
	
	buildVideo()
	{
		return new Promise((resolve, reject) =>
		{
			console.log("Generating Video...");
		
			/*
				Options 
				- '-pix_fmt yuv420p' http://superuser.com/questions/704744/video-produced-from-bmp-files-only-plays-in-vlc-but-no-other-players
			*/
	
			let outputName = this.genFileName();
	
			new FFmpeg({source: this.dir.temp + 'frame_%04d.png' })
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
					console.log("Processing frames: " + progress.frames);
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
				.saveToFile(this.dir.output + outputName);
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
	
			if(item.toLowerCase().indexOf(".jpg") > -1)
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
	
	checkFolders()
	{
		for(let key in this.dir)
		{
			if(!fs.existsSync(this.dir[key]))
			{
				fs.mkdirSync(this.dir[key]);
			}
		}
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
	
		return sb.join("-") + ".mp4";
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

//todo: need to chunk out video generation to 100 images or so at a time then 
//stitch them all together. Currently craps out at about 620.