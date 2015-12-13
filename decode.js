var stream = require('readable-stream')
var util = require('util')
var uint64be = require('uint64be')
var nextEvent = require('next-event')
var decode = require('./box-decode')

var EMPTY = new Buffer(0)

module.exports = Decoder

function Decoder () {
  if (!(this instanceof Decoder)) return new Decoder()
  stream.Writable.call(this)

  var self = this

  this.destroyed = false

  this._pending = 0
  this._missing = 0
  this._offset = 0
  this._buf = null
  this._str = null
  this._cb = null
  this._ondrain = null
  this._writeBuffer = null
  this._writeCb = null

  this._parse = parse
  this._ondrain = null
  this._kick()

  function parse (type, size) {
    if (size === 1) return self._extendedSize(type)

    switch (type) {
      case 'mdat':
      return readStream('mdat', size)

      case 'mdia':
      case 'minf':
      case 'moov':
      case 'trak':
      case 'edts':
      case 'dinf':
      case 'stbl':
      case 'udta':
      return container(type, size)

      case 'free':
      return readStream('free', size)

      default:
      return self._atom(size, decode[type] || decode.unknown(type))
    }
  }

  function container (type, size) {
    // TODO: is container the right word here?
    var offset = self._offset
    self._offset += 8
    self._pending++
    self.emit('box', {type: type, offset: offset, length: size, container: true}, dec)
  }

  function readStream (type, size) {
    var stream = self._stream(size - 8, null)
    var offset = self._offset
    self._offset += size
    self._pending++
    self.emit('box', {type: type, offset: offset, length: size, stream: stream}, dec)
  }

  function dec (err) {
    if (err) return self.destroy(err)
    self._pending--
    self._kick()
  }
}

util.inherits(Decoder, stream.Writable)

Decoder.prototype.destroy = function (err) {
  if (this.destroyed) return
  this.destroyed = true
  if (err) this.emit('error', err)
  this.emit('close')
}

Decoder.prototype._extendedSize = function (type, cb) {
  var self = this
  this._buffer(8, function (buf) {
    self._parse(type, uint64be.decode(buf) - 8)
  })
}

Decoder.prototype._atom = function (size, parser) {
  var self = this
  this._buffer(size - 8, onbuffer)

  function onbuffer (buf) {
    var offset = self._offset
    self._offset += size
    self._pending++
    self.emit('box', parser(buf, offset, size), dec)
  }

  function dec (err) {
    if (err) return self.destroy(err)
    self._pending--
    self._kick()
  }
}

Decoder.prototype._write = function (data, enc, next) {
  if (this.destroyed) return
  var drained = !this._str || !this._str._writableState.needDrain

  while (data.length && !this.destroyed) {
    if (!this._missing) {
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

Decoder.prototype._buffer = function (size, cb) {
  this._missing = size
  this._buf = new Buffer(size)
  this._cb = cb
}

Decoder.prototype._stream = function (size, cb) {
  var self = this
  this._missing = size
  this._str = new MediaData(this)
  this._ondrain = nextEvent(this._str, 'drain')
  this._pending++
  this._str.on('end', function () {
    self._pending--
    self._kick()
  })
  this._cb = cb
  return this._str
}

Decoder.prototype._atomHeader = function (cb) {
  this._buffer(8, function (buf) {
    var size = buf.readUInt32BE(0)
    var type = buf.toString('ascii', 4, 8)
    cb(type, size)
  })
}

Decoder.prototype._kick = function () {
  if (this._pending) return
  if (!this._buf && !this._str) this._atomHeader(this._parse)
  if (this._writeBuffer) {
    var next = this._writeCb
    var buffer = this._writeBuffer
    this._writeBuffer = null
    this._writeCb = null
    this._write(buffer, null, next)
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
