import express from "express"
import process from "process"
import https from "https"
import path from "path"
import url from "url"
import fs from "fs"

import m_Configs from "./Configs.js"
import m_Logging from "./Logging.js"


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


async function Main() {
	const Application = express()
	
	c_Logger.Info("Loading configs...")
	g_Config = m_Configs.LoadConfig(RelativeFile(g_Config.Base, g_Config.Config))
	c_Logger.Output(`Loaded:\n${JSON.stringify(g_Config, null, 3)}\n`)

	c_Logger.Info("Setting up files...")
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
	Application.get("/api", (Request, Response) => {
		Response.json(
			{
				"title":"example title",
				"author_name":"example author",
				"author_url":"https://example-author-url.com",
				"type":"video",
				"height":113,"width":200,
				"version":"1.0",
				"provider_name":"example provider",
				"provider_url":"https://example-provider-url.com/",
				"thumbnail_height":360,"thumbnail_width":480,
				"thumbnail_url":"example thumbnail url",
				"html":"<p>example html</p>"
			}
		)
	})
	
	// Static
	Application.use(express.static(RelativeFile("Static/")))
	Application.get("/*", (Request, Response) => { Response.redirect("/") })
	Application.get("/", (Request, Response) => { Response.sendFile(RelativeFile("Static/Index.html")) })


	// @note This should always be the last middleware
	Application.use((ErrorObject, Request, Result, NextHandler) => {
		if (ErrorObject) {
			c_Logger.Error(`${ErrorObject.message}\n${ErrorObject.stack}`)
			return Result.sendStatus(500)
		}
		NextHandler()
	})
	
	Application.listen(g_Config.Port, () => {
		c_Logger.Info(`Listening on port ${g_Config.Port}`)
	})


	process.on("SIGINT", () => {
		c_Logger.Warn("SIGINT Received, terminating...")
		m_Configs.SaveConfig(RelativeFile(g_Config.Base, g_Config.Config))

		process.exit(1)
	})
}



Main()