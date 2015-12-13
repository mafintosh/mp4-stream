var tape = require('tape')
var mp4 = require('./')

tape('generates and parses', function (t) {
  var encode = mp4.encode()
  var decode = mp4.decode()
  var nextOffset = 0

  decode.on('box', function (box, next) {
    if (!box.stream) {
      t.same(box.type, 'ftyp')
      t.same(box.offset, nextOffset)
      t.same(box.brand, 'mafi')
      t.same(box.version, 1)
      nextOffset += box.length
    } else {
      t.same(box.type, 'mdat')
      t.same(box.offset, nextOffset)
      t.same(box.length, 8 + 11)
      var buffer = []
      box.stream.on('data', function (data) {
        buffer.push(data)
      })
      box.stream.on('end', function () {
        t.same(Buffer.concat(buffer).toString(), 'hello world')
        t.end()
      })
    }

    next()
  })

  encode.box({
    type: 'ftyp',
    brand: 'mafi',
    version: 1
  })

  var stream = encode.mediaData(11)
  stream.end('hello world')

  encode.finalize()
  encode.pipe(decode)
})

tape('generates and parses with decoder/encoder in between', function (t) {
  var encode = mp4.encode()
  var decode = mp4.decode()
  var encode2 = mp4.encode()
  var decode2 = mp4.decode()
  var nextOffset = 0

  decode.on('box', function (box, next) {
    if (!box.stream) {
      t.same(box.type, 'ftyp')
      t.same(box.offset, nextOffset)
      t.same(box.brand, 'mafi')
      t.same(box.version, 1)
      nextOffset += box.length
    } else {
      t.same(box.type, 'mdat')
      t.same(box.offset, nextOffset)
      t.same(box.length, 8 + 11)
      var buffer = []
      box.stream.on('data', function (data) {
        buffer.push(data)
      })
      box.stream.on('end', function () {
        t.same(Buffer.concat(buffer).toString(), 'hello world')
        t.end()
      })
    }

    next()
  })

  encode.box({
    type: 'ftyp',
    brand: 'mafi',
    version: 1
  })

  var stream = encode.mediaData(11)
  stream.end('hello world')

  encode.finalize()
  encode.pipe(decode2)
  decode2.on('box', function (box, next) {
    encode2.box(box, next)
  })
  decode2.on('end', function () {
    encode2.finalize()
  })
  encode2.pipe(decode)
})
