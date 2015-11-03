var TIME_OFFSET = 2082844800000

exports.ftyp = function (buf) {
  var brand = buf.toString('ascii', 0, 4)
  var version = buf.readUInt32BE(4)
  var compatibleBrands = []
  for (var i = 8; i < buf.length; i += 4) compatibleBrands.push(buf.toString('ascii', i, i + 4))
  return {type: 'ftyp', brand: brand, version: version, compatibleBrands: compatibleBrands}
}

exports.mvhd = function (buf) {
  return {
    type: 'mvhd',
    version: buf[0],
    flags: buf.slice(1, 4),
    ctime: date(buf, 4),
    mtime: date(buf, 8),
    timeScale: buf.readUInt32BE(12),
    duration: buf.readUInt32BE(16),
    preferredRate: fixed32(buf, 20),
    preferredVolume: fixed16(buf, 24),
    matrix: matrix(buf.slice(36, 72)),
    previewTime: buf.readUInt32BE(72),
    previewDuration: buf.readUInt32BE(76),
    posterTime: buf.readUInt32BE(80),
    selectionTime: buf.readUInt32BE(84),
    selectionDuration: buf.readUInt32BE(88),
    currentTime: buf.readUInt32BE(92),
    nextTrackId: buf.readUInt32BE(96)
  }
}

exports.tkhd = function (buf) {
  return {
    type: 'tkhd',
    version: buf[0],
    flags: buf.slice(1, 4),
    ctime: date(buf, 4),
    mtime: date(buf, 8),
    trackId: buf.readUInt32BE(12),
    duration: buf.readUInt32BE(20),
    layer: buf.readUInt16BE(32),
    alternateGroup: buf.readUInt16BE(34),
    volume: buf.readUInt16BE(36),
    matrix: matrix(buf.slice(40, 76)),
    trackWidth: buf.readUInt32BE(76),
    trackHeight: buf.readUInt32BE(80)
  }
}

exports.mdhd = function (buf) {
  return {
    type: 'mdhd',
    version: buf[0],
    flags: buf.slice(1, 4),
    ctime: date(buf, 4),
    mtime: date(buf, 8),
    timeScale: buf.readUInt32BE(12),
    duration: buf.readUInt32BE(16),
    language: buf.readUInt16BE(20),
    quality: buf.readUInt16BE(22)
  }
}

exports.vmhd = function (buf) {
  return {
    type: 'vmhd',
    version: buf[0],
    flags: buf.slice(1, 4),
    graphicsMode: buf.readUInt16BE(4),
    opcolor: [buf.readUInt16BE(6), buf.readUInt16BE(8), buf.readUInt16BE(10)]
  }
}

exports.smhd = function (buf) {
  return {
    type: 'smhd',
    version: buf[0],
    flags: buf.slice(1, 4),
    balance: buf.readUInt16BE(4)
  }
}

exports.stsd = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)
  var offset = 8

  for (var i = 0; i < num; i++) {
    var size = buf.readUInt32BE(offset)
    var type = buf.toString('ascii', offset + 4, offset + 8)
    var referenceIndex = buf.readUInt16BE(offset + 14)
    var data = buf.slice(offset + 16, offset + size)
    entries[i] = {type: type, referenceIndex: referenceIndex, data: data}
    offset += size
  }

  return {
    type: 'stsd',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.stco = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    entries[i] = buf.readUInt32BE(i * 4 + 8)
  }

  return {
    type: 'stco',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.stsz = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    entries[i] = buf.readUInt32BE(i * 4 + 8)
  }

  return {
    type: 'stsz',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.stss = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    entries[i] = buf.readUInt32BE(i * 4 + 8)
  }

  return {
    type: 'stss',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.stts = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var offset = i * 8 + 8
    entries[i] = {
      count: buf.readUInt32BE(offset),
      duration: buf.readUInt32BE(offset + 4)
    }
  }

  return {
    type: 'stts',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.ctts = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var offset = i * 8 + 8
    entries[i] = {
      count: buf.readUInt32BE(offset),
      compositionOffset: buf.readInt32BE(offset + 4)
    }
  }

  return {
    type: 'ctts',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.stsc = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var offset = i * 12 + 8
    entries[i] = {
      firstChunk: buf.readUInt32BE(offset),
      samplesPerChunk: buf.readUInt32BE(offset + 4),
      sampleDescriptionId: buf.readUInt32BE(offset + 8)
    }
  }

  return {
    type: 'stsc',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.dref = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)
  var offset = 8

  for (var i = 0; i < num; i++) {
    var size = buf.readUInt32BE(offset)
    var type = buf.toString('ascii', offset + 4, offset + 8)
    var tmp = buf.slice(offset + 8, offset + size)
    offset += size

    entries[i] = {
      type: type,
      buf: tmp
    }
  }

  return {
    type: 'dref',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.elst = function (buf) {
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var offset = i * 12 + 8
    entries[i] = {
      trackDuration: buf.readUInt32BE(offset),
      mediaTime: buf.readInt32BE(offset + 4),
      mediaRate: fixed32(buf, offset + 8)
    }
  }

  return {
    type: 'elst',
    version: buf[0],
    flags: buf.slice(1, 4),
    entries: entries
  }
}

exports.hdlr = function (buf) {
  return {
    type: 'hdlr',
    version: buf[0],
    flags: buf.slice(1, 4),
    componentType: buf[4] === 0 ? '' : buf.toString('ascii', 4, 8),
    componentSubType: buf.toString('ascii', 8, 12),
    componentName: buf.toString('ascii', 24, buf.length - 1)
  }
}

exports.unknown = function (type) {
  return function (buf) {
    return {type: type, unknown: true, size: buf.length, buf: buf}
  }
}

function matrix (buf) {
  var list = new Array(buf.length / 4)
  for (var i = 0; i < list.length; i++) list[i] = fixed32(buf, i * 4)
  return list
}

function date (buf, offset) {
  return new Date(buf.readUInt32BE(offset) * 1000 - TIME_OFFSET)
}

function fixed32 (buf, offset) {
  return buf.readUInt16BE(offset) + buf.readUInt16BE(offset + 2) / (256 * 256)
}

function fixed16 (buf, offset) {
  return buf[offset] + buf[offset + 1] / 256
}
