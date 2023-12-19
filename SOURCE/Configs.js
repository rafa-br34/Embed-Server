import { Certificate } from "crypto"
import fs from "fs"

function MergeObject(A, B, Override) {
	Override = typeof (Override) == "undefined"
	for (let Key in B) {
		if (B[Key] && (Override || !(Key in A))) {
			A[Key] = (B[Key].constructor == Object) ? MergeObject({}, B[Key], Override) : B[Key]
		}
	}
	return A
}

let c_Defaults = {
	Port: 621,
	SSL: { Key: "Server.key", Certificate: "Server.crt" },

	Base: "../DATA/",
	
	Config: "Config.json",
	Logging: "LOGS/",
	Serving: {
		Folder: "EMBEDS/", // Folder used to store uploaded files & cache

		// Limits
		MaxSize: "1GB", // Maximum folder size in string format or in integer format(bytes). 0/null = unlimited
		MaxEmbeds: null, // Maximum number of embeds in folder. 0/null = unlimited
	}
}

let g_Loaded = MergeObject({}, c_Defaults, false)

function SyncWith(Data, Defaults=c_Defaults) {
	return MergeObject(Data, Defaults, true)
}

function LoadConfig(File, Defaults=c_Defaults) {
	return g_Loaded = SyncWith(fs.existsSync(File) ? JSON.parse(fs.readFileSync(File)) : {}, Defaults)
}

function SaveConfig(File, Data=g_Loaded) {
	fs.writeFileSync(File, JSON.stringify(Data))
}

function Loaded() {
	return g_Loaded
}

export default {
	c_Defaults,

	Loaded,
	SyncWith,
	LoadConfig,
	SaveConfig
}