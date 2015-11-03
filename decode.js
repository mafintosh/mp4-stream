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

  this._missing = 0
  this._offset = 0
  this._buf = null
  this._str = null
  this._cb = null
  this._ondrain = null

  this._parse = parse
  this._stack = []
  this._atomHeader(parse)

  this.on('finish', this._stackCheck)
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
      return container(type, size)

      case 'free':
      return skip(size)

      default:
      return self._atom(size, decode[type] || decode.unknown(type))
    }
  }

  function skip (size) {
    self.emit('skip', self._offset, self._offset + size)
    self._offset += size
    self._stream(size - 8, next).resume()
  }

  function container (type, size) {
    self._push(size, type)
    self._offset += 8
    next()
  }

  function mdat (size) {
    var stream = self._stream(size - 8, next)
    self.emit('atom', {type: 'mdat', stream: stream}, self._offset, self._offset + size)
    self._offset += size
  }

  function next () {
    self._atomHeader(self._parse)
  }
}

util.inherits(Decoder, stream.Writable)

Decoder.prototype._extendedSize = function (type, cb) {
  var self = this
  this._buffer(8, function (buf) {
    self._parse(type, uint64be.decode(buf) - 8)
  })
}

Decoder.prototype._push = function (size, name) {
  this.emit('atom-start', name, this._offset, this._offset + size)
  this._stack.push({event: name, missing: size - 8, length: size - 8})
}

Decoder.prototype._atom = function (size, parser) {
  var self = this
  this._buffer(size - 8, function (buf) {
    self.emit('atom', parser(buf), self._offset, self._offset + size)
    self._offset += size
    self._atomHeader(self._parse)
  })
}

Decoder.prototype._stackCheck = function () {
  while (true) {
    var last = getLast(this._stack)
    if (!last || last.missing) return
    this._stack.pop()
    var nextLast = getLast(this._stack)
    if (nextLast) nextLast.missing -= last.length
    this.emit('atom-end', last.event)
  }
}

Decoder.prototype._write = function (data, enc, next) {
  var drained = true

  while (data.length) {
    this._stackCheck()

    var consumed = data.length < this._missing ? data.length : this._missing
    if (this._buf) data.copy(this._buf, this._buf.length - this._missing)
    else if (this._str) drained = this._str.write(consumed === data.length ? data : data.slice(0, consumed))

    this._missing -= consumed
    var last = getLast(this._stack)
    if (last) last.missing -= consumed

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

function getLast (list) {
  return list.length ? list[list.length - 1] : null
}
