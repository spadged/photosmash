const fs = require('fs-extra');

class PrePhotoSmash
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

		this.presmash();
	}

	async presmash()
	{
		for(let key in this.dir)
		{
			fs.ensureDirSync(this.dir[key])
		}

		console.log("Installed!")
	}
}

new PrePhotoSmash();