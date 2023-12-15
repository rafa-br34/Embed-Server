import process from "process"
import chalk from "chalk"

class Level {
	Depth = 0
	Name = "#"

	constructor(Depth, Name) {
		this.Depth = Depth
		this.Name = Name
	}

	toString() {
		return this.Name
	}
}

class Stream {
	FileHandle = null
	Level = 0

	constructor(Input, Level=0) {
		if (Input.constructor == this.constructor) {
			this.FileHandle = Input.FileHandle
			this.Level = Input.Level
		}
		else {
			this.FileHandle = Input
			this.Level = Level
		}
	}

	Output(Data, Level) {
		if (!Level || (typeof(Level) != "object" && Level || Level.Depth) >= this.Level) { this.FileHandle.write(Data) }
	}
}

const Levels = {
	DEBUG: new Level(0, chalk.magenta("DEBUG")),
	LOG: new Level(1, chalk.gray("LOG")),
	INFO: new Level(2, chalk.cyanBright("INFO")),
	NOTE: new Level(3, chalk.cyan("NOTE")),
	WARN: new Level(4, chalk.yellow("WARN")),
	ERROR: new Level(5, chalk.red("ERROR")),
	ASSERTION: new Level(6, chalk.bgBlackBright.red("ASSERTION")),
}

class Logger {
	OutputStreams = [process.stdout]
	Modifiers = []

	constructor(OutputFiles = [process.stdout]) {
		this.OutputStreams = []
		for (let Handle of OutputFiles) { this.OutputStreams.push(new Stream(Handle)) }
	}

	Output(Payload, Level = Levels.DEBUG) {
		for (let Stream of this.OutputStreams) { Stream.Output(Payload, Level) }
	}

	FormatMessage(Content, Level) {
		return `${chalk.bgBlack.whiteBright((new Date()).toISOString())} [${Level}] ${Content}\n`
	}

	Message(Message, Level) {
		this.Output(this.FormatMessage(Message, Level), Level)
	}

	Debug(Message) { this.Message(Message, Levels.DEBUG) }
	Log(Message) { this.Message(Message, Levels.LOG) }
	Info(Message) { this.Message(Message, Levels.INFO) }
	Note(Message) { this.Message(Message, Levels.NOTE) }
	Warn(Message) { this.Message(Message, Levels.WARN) }
	Error(Message) { this.Message(Message, Levels.ERROR) }
	
	Assert(Condition, Message) { if (!Condition) { this.Message(Message, Levels.ASSERTION) } return Condition }
}

export default { Levels, Level, Logger, Stream }