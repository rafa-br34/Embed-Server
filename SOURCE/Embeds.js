import path from "path"
import fs from "fs"

import m_Logging from "./Logging.js"


const EmbedFlags = Object.freeze({
	AUTOMATIC_COLORING: 1,

})


function OGP_MetaTag(Property, Value) {
	return `<meta property="${Property}" content="${Value}"/>`
}

function OGP_BuildTags(Tags) {
	let Built = ""

	for (let Key in Tags) if (Tags[Key]) Built += OGP_MetaTag(Key, Tags[Key])

	return Built
}

class Embed {
	// Embed specific
	Provider = { Name: "", Link: "" } // oEmbed
	Author = { Name: "", Link: "" } // oEmbed
	
	Description = "" // OGP
	Title = "" // OGP, oEmbed

	Thumbnail = { Height: 0, Width: 0, Link: ""} // OGP, oEmbed
	Content = undefined

	Type = {
		oEmbed: "",
		OGP: ""
	}

	ThemeColor = "" // Other

	constructor(Obj) {
		// From JSON
		if (typeof(Obj) == "object") {
			for (let Key in Obj) this[Key] = Obj[Key]
		}
	}

	Build_oEmbed() {
		let Base = {
			version: "1.0",
			type: this.Type.oEmbed,
			
			thumbnail_height: this.Thumbnail.Height,
			thumbnail_width: this.Thumbnail.Width,
			thumbnail_url: this.Thumbnail.Link,

			provider_name: this.Provider.Name,
			provider_url: this.Provider.Link,
			
			author_name: this.Author.Name,
			author_url: this.Author.Link,
			
			title: this.Title,
		}

		let Content = this.Content
		let Extra = null
		switch (this.Type.oEmbed) {
			case "photo": {
				Extra = {
					height: Content.Height,
					width: Content.Width,
					url: Content.Link,
				}
				break
			}

			case "video":
			case "rich": {
				Extra = {
					height: Content.Height,
					width: Content.Width,
					html: Content.Frame,
				}
				break
			}

			case "link":
			default:
				break;
		}

		return {...Base, ...Extra}
	}

	BuildOGP(EmbedLink) {
		let Graph = {
			// Required
			"og:title": this.Title,
			"og:type": this.Type.OGP,
			"og:url": EmbedLink,

			// Optional
			"og:description": this.Description,
			"og:site_name": this.Title,
			// @note More tags at: https://ogp.me/#optional

			// Image (og:image is required, the rest is optional)
			"og:image": this.Thumbnail.Link,
			"og:image:alt": this.Description, // Should be the same as description(?)
			"og:image:url": this.Thumbnail.Link,
			"og:image:secure_url": this.Thumbnail.Link,
			// "og:image:type": "image/*", // Let the consumer decide

			"twitter:url": this.Provider.Link,
			"twitter:card": "summary_large_image",
			"twitter:title": this.Title,
			"twitter:image": this.Thumbnail.Link,
			"twitter:description": this.Description,
		}

		// @todo Add extended support for other types

		return OGP_BuildTags(Graph)
	}

	BuildTags(EmbedLink) {
		return this.BuildOGP(EmbedLink) + `<meta name="theme-color" content="${this.ThemeColor}" data-react-helmet="true">`
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

export default { EmbedFlags, Embed, EmbedManager }