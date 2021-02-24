var stream = require('readable-stream')
var nextEvent = require('next-event')
var Box = require('mp4-box-encoding')

var EMPTY = Buffer.alloc(0)

class Decoder extends stream.Writable {
  constructor (opts) {
    super(opts)

    this.destroyed = false

    this._pending = 0
    this._missing = 0
    this._ignoreEmpty = false
    this._buf = null
    this._str = null
    this._cb = null
    this._ondrain = null
    this._writeBuffer = null
    this._writeCb = null

    this._ondrain = null
    this._kick()
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    if (err) this.emit('error', err)
    this.emit('close')
  }

  _write (data, enc, next) {
    if (this.destroyed) return
    var drained = !this._str || !this._str._writableState.needDrain

    while (data.length && !this.destroyed) {
      if (!this._missing && !this._ignoreEmpty) {
        this._writeBuffer = data
        this._writeCb = next
        return
      }

      var consumed = data.length < this._missing ? data.length : this._missing
      if (this._buf) data.copy(this._buf, this._buf.length - this._missing)
      else if (this._str) drained = this._str.write(consumed === data.length ? data : data.slice(0, consumed))

      this._missing -= consumed

      if (!this._missing) {
        var buf = this._buf
        var cb = this._cb
        var stream = this._str

        this._buf = this._cb = this._str = this._ondrain = null
        drained = true

        this._ignoreEmpty = false
        if (stream) stream.end()
        if (cb) cb(buf)
      }

      data = consumed === data.length ? EMPTY : data.slice(consumed)
    }

    if (this._pending && !this._missing) {
      this._writeBuffer = data
      this._writeCb = next
      return
    }

    if (drained) next()
    else this._ondrain(next)
  }

  _buffer (size, cb) {
    this._missing = size
    this._buf = Buffer.alloc(size)
    this._cb = cb
  }

  _stream (size, cb) {
    this._missing = size
    this._str = new MediaData(this)
    this._ondrain = nextEvent(this._str, 'drain')
    this._pending++
    this._str.on('end', () => {
      this._pending--
      this._kick()
    })
    this._cb = cb
    return this._str
  }

  _readBox () {
    const bufferHeaders = (len, buf) => {
      this._buffer(len, additionalBuf => {
        if (buf) {
          buf = Buffer.concat([buf, additionalBuf])
        } else {
          buf = additionalBuf
        }
        var headers = Box.readHeaders(buf)
        if (typeof headers === 'number') {
          bufferHeaders(headers - buf.length, buf)
        } else {
          this._pending++
          this._headers = headers
          this.emit('box', headers)
        }
      })
    }

    bufferHeaders(8)
  }

  stream () {
    if (!this._headers) throw new Error('this function can only be called once after \'box\' is emitted')
    var headers = this._headers
    this._headers = null

    return this._stream(headers.contentLen, () => {
      this._pending--
      this._kick()
    })
  }

  decode (cb) {
    if (!this._headers) throw new Error('this function can only be called once after \'box\' is emitted')
    var headers = this._headers
    this._headers = null

    this._buffer(headers.contentLen, buf => {
      var box = Box.decodeWithoutHeaders(headers, buf)
      cb(box)
      this._pending--
      this._kick()
    })
  }

  ignore () {
    if (!this._headers) throw new Error('this function can only be called once after \'box\' is emitted')
    var headers = this._headers
    this._headers = null

    this._missing = headers.contentLen
    if (this._missing === 0) {
      this._ignoreEmpty = true
    }
    this._cb = () => {
      this._pending--
      this._kick()
    }
  }

  _kick () {
    if (this._pending) return
    if (!this._buf && !this._str) this._readBox()
    if (this._writeBuffer) {
      var next = this._writeCb
      var buffer = this._writeBuffer
      this._writeBuffer = null
      this._writeCb = null
      this._write(buffer, null, next)
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

module.exports = Decoder
