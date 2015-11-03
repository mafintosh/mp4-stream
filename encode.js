var stream = require('readable-stream')
var util = require('util')

function Encoder () {
  if (!(this instanceof Encoder)) return new Encoder()
  stream.Readable.call(this)
}

util.inherits(Encoder, stream.Readable)
