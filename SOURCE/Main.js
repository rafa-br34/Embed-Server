import * as squirrelly from "squirrelly"
//import squirrelly from "squirrelly"
import express, { response } from "express"
import process from "process"
import https from "https"
import http from "http"
import path from "path"
import url from "url"
import fs from "fs"

import m_Configs from "./Configs.js"
import m_Logging from "./Logging.js"
import m_Embeds from "./Embeds.js"


const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const c_Logger = new m_Logging.Logger()

// Globals
let g_Config = m_Configs.Loaded()

function RelativeFile(...Arguments) { return path.join(__dirname, ...Arguments) }


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
	
	return {LogsFolder, ServingFolder, LogFile}
}

function HostApplication(Application) {
	let Base = g_Config.Base
	let Port = g_Config.Port
	let SSL = g_Config.SSL

	http.createServer(Application)
		.listen(Port.HTTP, () => { c_Logger.Info(`HTTP: Listening on port ${Port.HTTP}`) })

	let SSLPath = [ RelativeFile(Base, SSL.Key), RelativeFile(Base, SSL.Certificate) ]

	if (SSLPath.find((Path) => !fs.existsSync(Path))) {
		c_Logger.Warn("No SSL certificate and/or key found. HTTPS will not be enabled.")
		return
	}

	https.createServer({ key: fs.readFileSync(SSLPath[0]), cert: fs.readFileSync(SSLPath[1]) }, Application)
		.listen(Port.HTTPS, () => { c_Logger.Info(`HTTPS: Listening on port ${Port.HTTPS}`) })
}

async function Main() {
	const Application = express()
	
	c_Logger.Info("Loading configs...")
	g_Config = m_Configs.LoadConfig(RelativeFile(g_Config.Base, g_Config.Config))
	c_Logger.Output(`Loaded config:\n${JSON.stringify(g_Config, null, 3)}\n`)

	c_Logger.Info("Setting up files...")
	await SetupFiles()

	let IndexEmbed = new m_Embeds.Embed({
		Thumbnail: {
			Height: 600,
			Width: 1200,
			Link: `https://opengraph.githubassets.com/*${Date.now()}/rafa-br34/Embed-Server`
		},
		Content: {
			Height: 600,
			Width: 1200,
			Link: `https://opengraph.githubassets.com/*${Date.now()}/rafa-br34/Embed-Server`
		},
		Provider: {
			Name: `(MIT License) Copyright © ${(new Date()).getFullYear()} rafa_br34`,
			Link: "https://github.com/rafa-br34"
		},
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
	Application.get("/api/oembed", (Request, Response) => {
		Response.json(IndexEmbed.Build_oEmbed())
		/*
			{
				"type":"rich",
				"version":"1.0",

				"title":"example title",
				"author_name":"example author",
				"author_url":"https://example-author-url.com",
				"provider_name":`(MIT License) Copyright © ${(new Date()).getFullYear()} rafa_br34`,
				"provider_url":"https://github.com/rafa-br34",
				"thumbnail_height":600,"thumbnail_width":1200,
				"thumbnail_url":`https://opengraph.githubassets.com/*${Date.now()}/rafa-br34/Embed-Server`,

				"height":113,"width":200,
				"html":"<p>example html</p>"
			}
		)
		//*/
	})
	
	// Static
	Application.get("/", (Request, Response) => {
		let Result = squirrelly.render(
			fs.readFileSync(RelativeFile("Templates/HeadTemplate.html"), "utf-8"),
			{
				oEmbedLink: `http://${Request.headers.host}/api/oembed?id=${"Identifier"}`,

				Description: "Rendered description",
				Title: "Rendered title",
				MetaTags: IndexEmbed.BuildOGP()
			},
			{ autoEscape: false }
		)
		Response.send(`<!DOCTYPE html><html>${Result}<body>test</body></html>`)
		//Response.sendFile(RelativeFile("Static/Index.html"))
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
	
	HostApplication(Application)

	process.on("SIGINT", () => {
		c_Logger.Warn("SIGINT Received, terminating...")
		m_Configs.SaveConfig(RelativeFile(g_Config.Base, g_Config.Config))

		process.exit(1)
	})
}



Main()