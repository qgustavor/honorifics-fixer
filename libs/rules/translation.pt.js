const senpaiRegex = /(?<=, )\p{L}+(?=[.?!,;])|veteran[oa]/gu
const knownAdaptationsRegex = /((Sr|Sra|Srta)\.||Senhorita|Senhor)( \p{Lu}\p{L}+){1,2}|Menino Dourado/gu

exports.rules = { senpaiRegex, knownAdaptationsRegex }
