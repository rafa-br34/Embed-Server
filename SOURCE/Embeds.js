import path from "path"
import fs from "fs"

import m_Logging from "./Logging"


const EmbedFlags = Object.freeze({
	AUTOMATIC_COLORING: 1,

})

class Embed {
	Content = ""
	Author = ""
	Title = ""
	Type = ""
	Size = 0

	Source = ""
	Pallette = []

	constructor(Obj) {
		if (typeof(Obj) == "object") {
			
		}
	}


}

class EmbedManager {
	Logger = null
	
	EmbedLimit = 0
	SizeLimit = 0
	Folder = ""
	
	Embeds = []

	constructor(Folder, SizeLimit=0, EmbedLimit=0, Logger=null) {
		this.Folder = Folder

		this.EmbedLimit = EmbedLimit || 0
		this.SizeLimit = SizeLimit || 0
		
		this.Logger = Logger || m_Logging.Logger()

		this.LoadData()
	}

	StoreData() {
		fs.writeFileSync(
			fs.openSync(path.join(this.Folder, "EmbedManager.json"), 'w'),
			JSON.stringify(this.Embeds)
		)
	}

	LoadData() {
		let Path = path.join(this.Folder, "EmbedManager.json")

		if (fs.existsSync(Path)) { this.Embeds = JSON.parse(fs.readFileSync(Path, "utf-8")) }
	}

	VerifyEmbeds() {
		for (let Embed of this.Embeds) {
			
		}
	}

	ClearEmbeds() {}

	AddEmbed() {}
}