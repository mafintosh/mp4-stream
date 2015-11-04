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

The decoder is a a writable stream you should write a mp4 file to.
The stream will emit `atom` when a new atom is found.

#### `var stream = mp4.encode()`

Create a new encoder.

Currently not implemented

## License

MIT
