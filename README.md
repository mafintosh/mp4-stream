# mp4-stream

Streaming mp4 encoder and decoder (WIP)

```
npm install mp4-stream
```

## Usage

``` js
var mp4 = require('mp4-stream')
var fs = require('fs')

var decode = mp4.decode()

fs.createReadStream('video.mp4')
  .pipe(decode)
  .on('atom', function (atom) {
    console.log('found atom (' + atom.type + ') at ' + atom.offset + ' (' + atom.length + ')')
    if (atom.container) {
      console.log('atom has child atoms (will be emitted next)')
    }
    if (atom.stream) {
      console.log('atom has stream data (consume stream to continue)')
      atom.stream.resume()
    }
  })
```

All atoms have a type thats a 4 char string with a type name.

## API

#### `var stream = mp4.decode()`

Create a new decoder.

The decoder is a writable stream you should write a mp4 file to.
The stream will emit `atom` when a new atom is found.

``` js
var fs = require('fs')
var stream = mp4.decode()

stream.on('atom', function (atom) {
  console.log('found new atom:', atom)
})

fs.createReadStream('my-video.mp4').pipe(stream)
```

#### `var stream = mp4.encode()`

Create a new encoder.

The encoder is a readable stream you can use to generate a mp4 file with.
Call `stream.atom(atom, [callback])` with a new mp4 atom to generate one and `stream.finalize()` to end it.

``` js
var fs = require('fs')
var stream = mp4.encode()

stream.pipe(fs.createWriteStream('my-new-video.mp4'))

stream.atom(anMP4Atom, function (err) {
  // atom flushed
})
```

## Decode and encode a file

To decode and encode an mp4 file with this module do

``` js
var encoder = mp4.encode()
var decoder = mp4.decode()

decoder.on('atom', function (atom) {
  encoder.atom(atom)
})

fs.createReadStream('my-movie.mp4').pipe(decoder)
encoder.pipe(fs.createWriteStream('my-movie-copy.mp4'))
```

## Atoms

Mp4 supports a wide range of atoms.
See the [encoders](atom-encode.js) and [decoders](atom-decode.js) for more information on how to create atoms with this module.

## License

MIT
