var stream = require('readable-stream')
var util = require('util')
var uint64be = require('uint64be')
var encode = require('./atom-encode')

var BLANK = new Buffer(65536)
BLANK.fill(0)

module.exports = Encoder

function Encoder () {
  if (!(this instanceof Encoder)) return new Encoder()
  stream.Readable.call(this)

  this.destroyed = false

  this._reading = false
  this._stream = null
  this._drain = null
  this._want = false
  this._onreadable = onreadable
  this._onend = onend

  var self = this

  function onreadable () {
    if (!self._want) return
    self._want = false
    self._read()
  }

  function onend () {
    self._stream = null
  }
}

util.inherits(Encoder, stream.Readable)

Encoder.prototype.atom = function (atom, cb) {
  if (!cb) cb = noop
  if (this.destroyed) return cb(new Error('Encoder is destroyed'))

  var type = atom.type
  var enc = encode[type] || encode.unknown
  var buf = enc(atom)
  var length = atom.length || (buf.length + 8)
  var extendedLength = 0

  if (length > 4228250625) {
    extendedLength = length
    length = 1
  }

  var header = new Buffer(8)
  var stream = atom.stream

  header.writeUInt32BE(length, 0)
  header.write(atom.type, 4, 4, 'ascii')

  this.push(header)
  if (extendedLength) this.push(uint64be.encode(extendedLength))

  if (!atom.container) {
    if (buf) {
      this.push(buf)
    } else {
      if (!stream) stream = new EmptyStream(atom.length - 8 - (extendedLength ? 8 : 0))
    }
  }

  if (stream) {
    this._stream = stream
    this._stream.on('readable', this._onreadable)
    this._stream.on('end', this._onend)
    this._forward()
  }

  this._drain = cb
}

Encoder.prototype.destroy = function (err) {
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

Encoder.prototype.finalize = function () {
  this.push(null)
}

Encoder.prototype._forward = function () {
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

Encoder.prototype._read = function () {
  if (this._reading || this.destroyed) return
  this._reading = true

  if (this._stream) this._forward()
  if (this._drain) {
    var drain = this._drain
    this._drain = null
    drain()
  }

  this._reading = false
}

function noop () {}

function EmptyStream (size) {
  this._size = size
  stream.Readable.call(this)
}

util.inherits(EmptyStream, stream.Readable)

EmptyStream.prototype._read = function () {
  if (!this._size) return
  if (this._size <= BLANK.length) {
    var free = this._size
    this._size = 0
    this.push(BLANK.slice(0, free))
    this.push(null)
  } else {
    this._size -= BLANK.length
    this.push(BLANK)
  }
}
