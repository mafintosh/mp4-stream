var stream = require('readable-stream')
var Box = require('mp4-box-encoding')

function noop () {}

class Encoder extends stream.Readable {
  constructor (opts) {
    super(opts)

    this.destroyed = false

    this._finalized = false
    this._reading = false
    this._stream = null
    this._drain = null
    this._want = false

    this._onreadable = () => {
      if (!this._want) return
      this._want = false
      this._read()
    }

    this._onend = () => {
      this._stream = null
    }
  }

  mdat (size, cb) {
    this.mediaData(size, cb)
  }

  mediaData (size, cb) {
    var stream = new MediaData(this)
    this.box({ type: 'mdat', contentLength: size, encodeBufferLen: 8, stream: stream }, cb)
    return stream
  }

  box (box, cb) {
    if (!cb) cb = noop
    if (this.destroyed) return cb(new Error('Encoder is destroyed'))

    var buf
    if (box.encodeBufferLen) {
      buf = Buffer.alloc(box.encodeBufferLen)
    }
    if (box.stream) {
      box.buffer = null
      buf = Box.encode(box, buf)
      this.push(buf)
      this._stream = box.stream
      this._stream.on('readable', this._onreadable)
      this._stream.on('end', this._onend)
      this._stream.on('end', cb)
      this._forward()
    } else {
      buf = Box.encode(box, buf)
      var drained = this.push(buf)
      if (drained) return process.nextTick(cb)
      this._drain = cb
    }
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    if (this._stream && this._stream.destroy) this._stream.destroy()
    this._stream = null
    if (this._drain) {
      var cb = this._drain
      this._drain = null
      cb(err)
    }
    if (err) this.emit('error', err)
    this.emit('close')
  }

  finalize () {
    this._finalized = true
    if (!this._stream && !this._drain) {
      this.push(null)
    }
  }

  _forward () {
    if (!this._stream) return

    while (!this.destroyed) {
      var buf = this._stream.read()

      if (!buf) {
        this._want = !!this._stream
        return
      }

      if (!this.push(buf)) return
    }
  }

  _read () {
    if (this._reading || this.destroyed) return
    this._reading = true

    if (this._stream) this._forward()
    if (this._drain) {
      var drain = this._drain
      this._drain = null
      drain()
    }

    this._reading = false
    if (this._finalized) {
      this.push(null)
    }
  }
}

class MediaData extends stream.PassThrough {
  constructor (parent) {
    super()
    this._parent = parent
    this.destroyed = false
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    this._parent.destroy(err)
    if (err) this.emit('error', err)
    this.emit('close')
  }
}

module.exports = Encoder
