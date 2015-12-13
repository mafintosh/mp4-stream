var TIME_OFFSET = 2082844800000
var FLAGS = new Buffer([0, 0, 0])

exports.mdia =
exports.minf =
exports.moov =
exports.trak =
exports.edts =
exports.dinf =
exports.stbl =
exports.udta =
exports.mdat =
exports.free = function () {
  return null
}

exports.ftyp = function (box) {
  var brands = box.compatibleBrands || []
  var buf = new Buffer(8 + brands.length * 4)
  buf.write(box.brand, 0)
  buf.writeUInt32BE(box.version, 4)
  for (var i = 0; i < brands.length; i++) buf.write(brands[i], 8 + (i * 4))
  return buf
}

exports.mvhd = function (box) {
  var buf = new Buffer(100)
  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  date(box.ctime || new Date(), buf, 4)
  date(box.mtime || new Date(), buf, 8)
  buf.writeUInt32BE(box.timeScale || 0, 12)
  buf.writeUInt32BE(box.duration || 0, 16)
  fixed32(box.preferredRate || 0, buf, 20)
  fixed16(box.preferredVolume || 0, buf, 24)
  reserved(buf, 26, 36)
  matrix(box.matrix, buf, 36)
  buf.writeUInt32BE(box.previewTime || 0, 72)
  buf.writeUInt32BE(box.previewDuration || 0, 76)
  buf.writeUInt32BE(box.posterTime || 0, 80)
  buf.writeUInt32BE(box.selectionTime || 0, 84)
  buf.writeUInt32BE(box.selectionDuration || 0, 88)
  buf.writeUInt32BE(box.currentTime || 0, 92)
  buf.writeUInt32BE(box.nextTrackId || 0, 96)
  return buf
}

exports.tkhd = function (box) {
  var buf = new Buffer(84)
  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  date(box.ctime || new Date(), buf, 4)
  date(box.mtime || new Date(), buf, 8)
  buf.writeUInt32BE(box.trackId || 0, 12)
  reserved(buf, 16, 20)
  buf.writeUInt32BE(box.duration || 0, 20)
  reserved(buf, 24, 32)
  buf.writeUInt16BE(box.layer || 0, 32)
  buf.writeUInt16BE(box.alternateGroup || 0, 34)
  buf.writeUInt16BE(box.volume || 0, 36)
  matrix(box.matrix, buf, 40)
  buf.writeUInt32BE(box.trackWidth || 0, 76)
  buf.writeUInt32BE(box.trackHeight || 0, 80)
  return buf
}

exports.mdhd = function (box) {
  var buf = new Buffer(24)
  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  date(box.ctime || new Date(), buf, 4)
  date(box.mtime || new Date(), buf, 8)
  buf.writeUInt32BE(box.timeScale || 0, 12)
  buf.writeUInt32BE(box.duration || 0, 16)
  buf.writeUInt16BE(box.language || 0, 20)
  buf.writeUInt16BE(box.quality || 0, 22)
  return buf
}

exports.vmhd = function (box) {
  var buf = new Buffer(12)
  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt16BE(box.graphicsMode || 0, 4)
  var opcolor = box.opcolor || [0, 0, 0]
  buf.writeUInt16BE(opcolor[0], 6)
  buf.writeUInt16BE(opcolor[1], 8)
  buf.writeUInt16BE(opcolor[2], 10)
  return buf
}

exports.smhd = function (box) {
  var buf = new Buffer(8)
  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt16BE(box.balance || 0, 4)
  reserved(buf, 6, 8)
  return buf
}

exports.stsd = function (box) {
  var buf = new Buffer(stsdSize(box))
  var entries = box.entries || []

  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt32BE(entries.length, 4)

  var ptr = 8
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i]
    var size = (entry.data ? entry.data.length : 0) + 4 + 4 + 2 + 6

    buf.writeUInt32BE(size, ptr)
    ptr += 4

    buf.write(entry.type, ptr, 4, 'ascii')
    ptr += 4

    reserved(buf, ptr, ptr + 6)
    ptr += 6

    buf.writeUInt16BE(entry.referenceIndex || 0, ptr)
    ptr += 2

    if (entry.data) {
      entry.data.copy(buf, ptr)
      ptr += entry.data.length
    }
  }

  return buf
}

exports.stsz =
exports.stss =
exports.stco = function (box) {
  var data = box.data
  var entries = box.entries || []
  var buf = new Buffer(8 + entries.length * 4 + (data ? data.length : 0))

  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt32BE(entries.length, 4)

  for (var i = 0; i < entries.length; i++) {
    buf.writeUInt32BE(entries[i], i * 4 + 8)
  }

  if (data) data.copy(buf, entries.length * 4 + 8)

  return buf
}

exports.stts = function (box) {
  var entries = box.entries || []
  var buf = new Buffer(8 + entries.length * 8)

  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt32BE(entries.length, 4)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 8 + 8
    buf.writeUInt32BE(entries[i].count || 0, ptr)
    buf.writeUInt32BE(entries[i].duration || 0, ptr + 4)
  }

  return buf
}

exports.ctts = function (box) {
  var entries = box.entries || []
  var buf = new Buffer(8 + entries.length * 8)

  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt32BE(entries.length, 4)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 8 + 8
    buf.writeUInt32BE(entries[i].count || 0, ptr)
    buf.writeUInt32BE(entries[i].compositionOffset || 0, ptr + 4)
  }

  return buf
}

exports.stsc = function (box) {
  var entries = box.entries || []
  var buf = new Buffer(8 + entries.length * 12)

  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt32BE(entries.length, 4)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 12 + 8
    buf.writeUInt32BE(entries[i].firstChunk || 0, ptr)
    buf.writeUInt32BE(entries[i].samplesPerChunk || 0, ptr + 4)
    buf.writeUInt32BE(entries[i].sampleDescriptionId || 0, ptr + 8)
  }

  return buf
}

exports.dref = function (box) {
  var buf = new Buffer(drefSize(box))
  var entries = box.entries || []

  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt32BE(entries.length, 4)

  var ptr = 8
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i]
    var size = (entry.buf ? entry.buf.length : 0) + 4 + 4

    buf.writeUInt32BE(size, ptr)
    ptr += 4

    buf.write(entry.type, ptr, 4, 'ascii')
    ptr += 4

    if (entry.buf) {
      entry.buf.copy(buf, ptr)
      ptr += entry.buf.length
    }
  }

  return buf
}

exports.elst = function (box) {
  var entries = box.entries || []
  var buf = new Buffer(8 + entries.length * 12)

  buf[0] = box.version || 0
  flags(box.flags, buf, 1)
  buf.writeUInt32BE(entries.length, 4)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 12 + 8
    buf.writeUInt32BE(entries[i].trackDuration || 0, ptr)
    buf.writeUInt32BE(entries[i].mediaTime || 0, ptr + 4)
    fixed32(entries[i].mediaRate || 0, buf, ptr + 8)
  }

  return buf
}

exports.hdlr = function (box) {
  var buf = new Buffer(24 + (box.componentName ? Buffer.byteLength(box.componentName) : 0) + 1)

  buf[0] = box.version || 0
  flags(box.flags, buf, 1)

  if (box.componentType) buf.write(box.componentType, 4, 4, 'ascii')
  else reserved(buf, 4, 8)

  if (box.componentSubType) buf.write(box.componentSubType, 8, 4, 'ascii')
  else reserved(buf, 8, 12)

  reserved(buf, 12, 24)

  if (box.componentName) buf.write(box.componentName, 24, buf.length - 24, 'ascii')
  else reserved(buf, 24, buf.length)

  buf[buf.length - 1] = 0

  return buf
}

exports.unknown = function (box) {
  return box.buffer
}

function drefSize (box) {
  var totalSize = 8
  if (!box.entries) return totalSize
  for (var i = 0; i < box.entries.length; i++) {
    var buf = box.entries[i].buf
    totalSize += (buf ? buf.length : 0) + 4 + 4
  }
  return totalSize
}

function stsdSize (box) {
  var totalSize = 8
  if (!box.entries) return totalSize
  for (var i = 0; i < box.entries.length; i++) {
    var data = box.entries[i].data
    totalSize += (data ? data.length : 0) + 4 + 4 + 2 + 6
  }
  return totalSize
}

function flags (flags, buf, offset) {
  if (!flags) flags = FLAGS
  flags.copy(buf, offset)
}

function reserved (buf, offset, end) {
  for (var i = offset; i < end; i++) buf[i] = 0
}

function date (date, buf, offset) {
  buf.writeUInt32BE(Math.floor((date.getTime() + TIME_OFFSET) / 1000), offset)
}

function fixed32 (num, buf, offset) {
  buf.writeUInt16BE(Math.floor(num) % (256 * 256), offset)
  buf.writeUInt16BE(Math.floor(num * 256 * 256) % (256 * 256), offset + 2)
}

function fixed16 (num, buf, offset) {
  buf[offset] = Math.floor(num) % 256
  buf[offset + 1] = Math.floor(num * 256) % 256
}

function matrix (list, buf, offset) {
  if (!list) list = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (var i = 0; i < list.length; i++) {
    fixed32(list[i], buf, offset + i * 4)
  }
}
