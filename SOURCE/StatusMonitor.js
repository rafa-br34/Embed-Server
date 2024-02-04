

class IOCounter {
	// Private
	TimePerSample = 60 * 1000
	SampleCount = 8192

	// Public
	_Last = { V: 0, T: 0, I: 0 }

	Samples = []
	Total = 0

	// Methods
	Increase(ByteCount) {
		let Total = this.Total += ByteCount
		let Last = this._Last

		let CurrentTime = Date.now()
		if (CurrentTime - Last.T > this.TimePerSample) {
			this.Samples[Last.I = (Last.I + 1) % this.SampleCount] = Total - Last.V
			Last.T = CurrentTime
			Last.V = Total
		}
	}

	Decrease(ByteCount) {
		let Total = this.Total -= ByteCount
		let Last = this._Last

		let CurrentTime = Date.now()
		if (CurrentTime - Last.T > this.TimePerSample) {
			this.Samples[Last.I = (Last.I + 1) % this.SampleCount] = Total - Last.V
			Last.T = CurrentTime
			Last.V = Total
		}
	}

	Get() {
		return {
			Total: this.Total,
			Samples: this.Samples
		}
	}
}

class StatusMonitor {
	// Private
	TimePerSample = 60 * 1000
	SampleCount = 8192

	// Public
	StartTime = Date.now()
	Bandwidth = { RX: new IOCounter(), TX: new IOCounter() }
	Embeds = {
		Access: 0,
		Stored: 0
	}
	Limits = {
		EmbedCount: { Current: 0, Max: 0 },
		Storage: { Current: 0, Max: 0 }
	}
	
	// Methods
	RegisterRX(Bytes) { this.Bandwidth.RX.Increase(Bytes) }
	RegisterTX(Bytes) { this.Bandwidth.TX.Increase(Bytes) }


	GetBandwidth() {
		return {
			RX: RX.Get(),
			TX: TX.Get()
		}
	}
	GetEmbeds() {
		return this.Embeds
	}
	GetLimits() {
		return this.Limits
	}
	GetUptime() {
		return Date.now() - this.StartTime
	}
}


export default { IOCounter, StatusMonitor }