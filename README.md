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
  .on('atom', function (atom, start, end) {
    console.log('found atom (' + atom.type + ') at ' + start + ' -> ' + end)
    if (atom.stream) {
      console.log('has data')
      atom.stream.resume()
    }
  })
  .on('atom-start', function (type, start, end) {
    console.log('nested atom (' + type + ') at ' + start + ' -> ' + end)
  })
  .on('atom-end', function (type) {
    console.log('nested atom (' + type + ') ended')
  })
```

All atoms have a type thats a 4 char string with a type name.

## API

#### `var stream = mp4.decode()`

Create a new decoder.

The decoder is a a writable stream you should write a mp4 file to.
The stream will emit `atom` when a new atom is found and `atom-start` and `atom-end` when a
nested atom is found (an atom that contains child atoms)

#### `var stream = mp4.encode()`

Create a new encoder.

Currently not implemented

## License

MIT
