# mp4-stream

Streaming mp4 encoder and decoder

```
npm install mp4-stream
```

[![build status](http://img.shields.io/travis/mafintosh/mp4-stream.svg?style=flat)](http://travis-ci.org/mafintosh/mp4-stream)

## Usage

``` js
var mp4 = require('mp4-stream')
var fs = require('fs')

var decode = mp4.decode()

fs.createReadStream('video.mp4')
  .pipe(decode)
  .on('box', function (box, next) {
    console.log('found box (' + box.type + ') at ' + box.offset + ' (' + box.length + ')')
    if (box.container) {
      console.log('box has child boxes (will be emitted next)')
    }
    if (box.stream) {
      console.log('box has stream data (consume stream to continue)')
      box.stream.resume()
    }
    next() // call this when you're done
  })
```

All boxes have a type thats a 4 char string with a type name.

## API

#### `var stream = mp4.decode()`

Create a new decoder.

The decoder is a writable stream you should write a mp4 file to. It emits the following additional events:

* `on('box', box, next)` - emitted when a new box is found.

``` js
var fs = require('fs')
var stream = mp4.decode()

stream.on('box', function (box, next) {
  if (box.stream) box.stream.resume() // boxes with media content have a stream attached
  console.log('found new box:', box)
  next()
})

fs.createReadStream('my-video.mp4').pipe(stream)
```

#### `var stream = mp4.encode()`

Create a new encoder.

The encoder is a readable stream you can use to generate a mp4 file. It has the following API:

* `stream.box(box, [callback])` - adds a new mp4 box to the stream.
* `var ws = stream.mediaData(size)` - helper that adds an `mdat` box. write the media content to this stream.
* `stream.finalize()` - finalizes the mp4 stream. call this when you're done.

``` js
var fs = require('fs')
var stream = mp4.encode()

stream.pipe(fs.createWriteStream('my-new-video.mp4'))

stream.box(anMP4Box, function (err) {
  // box flushed

  var content = stream.mediaData(lengthOfStream, function () {
    // wrote media data
    stream.finalize()
  })

  someContent.pipe(content)
})

```

## Decode and encode a file

To decode and encode an mp4 file with this module do

``` js
var encoder = mp4.encode()
var decoder = mp4.decode()

decoder.on('box', function (box, next) {
  encoder.box(box, next)
})

fs.createReadStream('my-movie.mp4').pipe(decoder)
encoder.pipe(fs.createWriteStream('my-movie-copy.mp4'))
```

## Boxes

Mp4 supports a wide range of boxes.
See the [encoders](box-encode.js) and [decoders](box-decode.js) for more information on how to create boxes with this module.

## License

MIT
