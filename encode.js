var stream = require('readable-stream')
var util = require('util')
var uint64be = require('uint64be')
var encode = require('./box-encode')

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

Encoder.prototype.mediaData =
Encoder.prototype.mdat = function (size, cb) {
  var stream = new MediaData(this)
  var length = size + 8
  if (length > 4228250625) length += 8
  this.box({type: 'mdat', length: length, stream: stream}, cb)
  return stream
}

Encoder.prototype.box = function (box, cb) {
  if (!cb) cb = noop
  if (this.destroyed) return cb(new Error('Encoder is destroyed'))

  var type = box.type
  var enc = encode[type] || encode.unknown
  var buf = enc(box)

  if (!box.length && (!buf || box.stream)) throw new Error('box.length is required')

  var length = box.length || (buf.length + 8)
  var extendedLength = 0

  if (length > 4228250625) {
    extendedLength = length
    length = 1
  }

  var header = new Buffer(8)
  var stream = box.stream

  header.writeUInt32BE(length, 0)
  header.write(box.type, 4, 4, 'ascii')

  var drained = this.push(header)
  if (extendedLength) this.push(uint64be.encode(extendedLength))

  if (!isContainer(box)) {
    if (buf) {
      drained = this.push(buf)
    } else {
      if (!stream) stream = new EmptyStream(box.length - 8 - (extendedLength ? 8 : 0))
    }
  }

  if (stream) {
    this._stream = stream
    this._stream.on('readable', this._onreadable)
    this._stream.on('end', this._onend)
    this._stream.on('end', cb)
    this._forward()
  } else {
    if (drained) return process.nextTick(cb)
    this._drain = cb
  }
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

function isContainer (box) {
  if (box.container) return true
  switch (box.type) {
    case 'mdia':
    case 'minf':
    case 'moov':
    case 'trak':
    case 'edts':
    case 'dinf':
    case 'stbl':
    case 'udta':
    return true
  }
  return false
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

function MediaData (parent) {
  this._parent = parent
  this.destroyed = false
  stream.PassThrough.call(this)
}

util.inherits(MediaData, stream.PassThrough)

MediaData.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true
  this._parent.destroy(err)
  if (err) this.emit('error', err)
  this.emit('close')
}
