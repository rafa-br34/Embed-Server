import * as squirrelly from "squirrelly"
//import squirrelly from "squirrelly"
import express, { response } from "express"
import process from "process"
import https from "https"
import http from "http"
import path from "path"
import url from "url"
import fs from "fs"

import m_StatusMonitor from "./StatusMonitor.js"
import m_Configs from "./Configs.js"
import m_Logging from "./Logging.js"
import m_Embeds from "./Embeds.js"


const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
function RelativeFile(...Arguments) { return path.join(__dirname, ...Arguments) }


// Constants
const c_Logger = new m_Logging.Logger()

// Globals
let g_IndexEmbed = new m_Embeds.Embed({
	ThemeColor: "#FFFFFF",
	Author: {
		Name: "GitHub Repository",
		Link: "https://github.com/rafa-br34/Embed-Server"
	},

	Title: "Open Source Embed Server",

	Type: {
		"oEmbed": "photo",
		"OGP": ""
	}
})
let g_Templates = {}
let g_Config = m_Configs.Loaded()
let g_Status = new m_StatusMonitor.StatusMonitor()

function GetIndexEmbed() {
	let Image = {
		Height: 600,
		Width: 1200,
		Link: `https://opengraph.githubassets.com/*${Date.now()}/rafa-br34/Embed-Server`
	}
	g_IndexEmbed.Thumbnail = Image
	g_IndexEmbed.Content = Image

	g_IndexEmbed.Provider = {
		Name: `(GPLv3 License) Copyright © ${(new Date()).getFullYear()} rafa_br34`,
		Link: "https://github.com/rafa-br34"
	}
	return g_IndexEmbed
}
GetIndexEmbed()


async function SetupFiles() {
	let ServingFolder = null
	let LogsFolder = null
	
	let LogFile = null
	let Base = g_Config.Base

	fs.mkdirSync(ServingFolder = RelativeFile(Base, g_Config.Serving.Folder), { recursive: true })
	fs.mkdirSync(LogsFolder = RelativeFile(Base, g_Config.Logging), { recursive: true })
	
	let LogFileName = `T${Date.now()}-P${process.pid}.log`
	let LogFilePath = RelativeFile(Base, g_Config.Logging, LogFileName)

	await fs.promises.open(LogFilePath, "w+").then((Handle) => {
		LogFile = Handle
		c_Logger.OutputStreams.push(new m_Logging.Stream(Handle, -1))
		c_Logger.Info(`Acquired handle for log file "${LogFilePath}"`)
	})

	// @todo A profiler could be useful
	const CachingStart = Date.now()

	g_Templates.Index = fs.readFileSync(RelativeFile("Templates/IndexTemplate.html"), "utf-8")
	g_Templates.Head = fs.readFileSync(RelativeFile("Templates/HeadTemplate.html"), "utf-8")
	
	const TimeTaken = Date.now() - CachingStart
	c_Logger.Info(`Template caching took ${TimeTaken}ms (~${TimeTaken / Object.keys(g_Templates).length}ms per template)`)

	return { LogsFolder, ServingFolder, LogFile }
}


function BuildEmbedHead(Template, Embed, oEmbedLink, Title, Description) {
	return squirrelly.render(
		Template,
		{
			Description,
			Title,

			oEmbedLink: oEmbedLink,
			MetaTags: Embed.BuildTags()
		},
		{ autoEscape: false }
	)
}

function HostApplication(Application) {
	let Base = g_Config.Base
	let Port = g_Config.Port
	let SSL = g_Config.SSL

	let HTTP = http.createServer(Application)
		.listen(Port.HTTP, () => { c_Logger.Info(`HTTP: Listening on port ${Port.HTTP}`) })

	let SSLPath = [ RelativeFile(Base, SSL.Key), RelativeFile(Base, SSL.Certificate) ]

	if (SSLPath.find((Path) => !fs.existsSync(Path))) {
		c_Logger.Warn("No SSL certificate and/or key found. HTTPS will not be enabled.")
		return { HTTP }
	}

	let HTTPS = https.createServer({ key: fs.readFileSync(SSLPath[0]), cert: fs.readFileSync(SSLPath[1]) }, Application)
		.listen(Port.HTTPS, () => { c_Logger.Info(`HTTPS: Listening on port ${Port.HTTPS}`) })
	
	return { HTTP, HTTPS }
}


async function Main() {
	const Application = express()
	
	c_Logger.Debug("Loading configs...")
	g_Config = m_Configs.LoadConfig(RelativeFile(g_Config.Base, g_Config.Config))
	c_Logger.Output(`Loaded config:\n${JSON.stringify(g_Config, null, 3)}\n`)

	c_Logger.Debug("Setting up files...")
	await SetupFiles()

	// @note This should always be the first middleware
	Application.use((Request, Result, NextHandler) => {
		let Socket = Request.socket
		c_Logger.Log(`(${Socket.localAddress}::${Socket.localPort} <=> ${Socket.remoteAddress}::${Socket.remotePort}) -> ${Request.method} ${Request.url}\nHeaders: ${JSON.stringify(Request.headers, null, 3)}`)
		NextHandler()
	})

	// Embedded media
	Application.get("/:*", (Request, Response) => {
		c_Logger.Log(`Serving media "${Request.path}"`)
	})
	
	// Raw media
	Application.get("/raw/*", (Request, Response) => {
		c_Logger.Log(`Serving raw media "${Request.path}"`)
	})
	

	// API
	Application.get("/api/status", (Request, Response) => {

	})

	Application.get("/api/oembed", (Request, Response) => {
		let ID = Request.query.id

		if (!ID) {
			Response.json(GetIndexEmbed().Build_oEmbed())
		}
		else {
			c_Logger.Debug(`Fetching oEmbed for ${ID}`)
		}
	})
	

	// Static
	Application.get("/", (Request, Response) => {
		let Head = BuildEmbedHead(
			g_Templates.Head,
			GetIndexEmbed(),
			`http://${Request.headers.host}/api/oembed`,
			"Embed Server",
			"Embed Server is a modern, compact, and open source file sharing and hosting service"
		)
		
		Response.send(`<!DOCTYPE html><html>${Head}<body>test</body></html>`)
	})
	Application.use(express.static(RelativeFile("Static/")))
	Application.get("/*", (_Request, Response) => { Response.redirect("/") })


	// @note This should always be the last middleware
	Application.use((ErrorObject, Request, Result, NextHandler) => {
		if (ErrorObject) {
			c_Logger.Error(`${ErrorObject.message}\n${ErrorObject.stack}`)
			return Result.sendStatus(500)
		}
		NextHandler()
	})
	
	let { HTTP, HTTPS } = HostApplication(Application)

	

	process.on("SIGINT", () => {
		c_Logger.Warn("SIGINT Received, terminating...")
		m_Configs.SaveConfig(RelativeFile(g_Config.Base, g_Config.Config))

		process.exit(1)
	})
}



Main()