const Decoder = require('./decode')
const Encoder = require('./encode')

exports.decode = opts => new Decoder(opts)
exports.encode = opts => new Encoder(opts)
