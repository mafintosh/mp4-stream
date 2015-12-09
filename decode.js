var stream = require('readable-stream')
var util = require('util')
var uint64be = require('uint64be')
var nextEvent = require('next-event')
var decode = require('./atom-decode')

module.exports = Decoder

function Decoder () {
  if (!(this instanceof Decoder)) return new Decoder()
  stream.Writable.call(this)

  var self = this

  this.destroyed = false

  this._missing = 0
  this._offset = 0
  this._buf = null
  this._str = null
  this._cb = null
  this._ondrain = null

  this._parse = parse
  this._atomHeader(parse)
  this._ondrain = null

  function parse (type, size) {
    if (size === 1) return self._extendedSize(type)
    if (type === 'mdat') return mdat(size)

    switch (type) {
      case 'mdat':
      return mdat(size)

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
      return free(size)

      default:
      return self._atom(size, decode[type] || decode.unknown(type))
    }
  }

  function free (size) {
    self.emit('atom', {type: 'free', offset: self._offset, length: size})
    self._offset += size
    self._stream(size - 8, next).resume()
  }

  function container (type, size) {
    // TODO: is container the right word here?
    self.emit('atom', {type: type, offset: self._offset, length: size, container: true})
    self._offset += 8
    next()
  }

  function mdat (size) {
    var stream = self._stream(size - 8, next)
    self.emit('atom', {type: 'mdat', offset: self._offset, length: size, stream: stream})
    self._offset += size
  }

  function next () {
    self._atomHeader(self._parse)
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
  this._buffer(size - 8, function (buf) {
    self.emit('atom', parser(buf, self._offset, size))
    self._offset += size
    self._atomHeader(self._parse)
  })
}

Decoder.prototype._write = function (data, enc, next) {
  if (this.destroyed) return
  var drained = true

  while (data.length && !this.destroyed) {
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

    if (consumed === data.length) break
    data = data.slice(consumed)
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
  this._missing = size
  this._str = new stream.PassThrough()
  this._ondrain = nextEvent(this._str, 'drain')
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
