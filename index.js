const handleSubtitles = require('./libs')

if (require.main === module) {
  const argv = require('yargs')(process.argv).argv
  const options = {
    source: argv._[2],
    reference: argv._[3],
    sourceDirectory: argv.sourceDir || argv.dir || process.cwd(),
    targetDirectory: argv.targetDir || argv.dir || process.cwd(),
    referenceDirectory: argv.referenceDir || argv.dir || process.cwd(),
    singleEpisode: argv.singleEpisode,
    forceInvertNames: !!argv.forceInvertNames,
    avoidDuplicate: !!argv.avoidDuplicate,
    targetLanguage: argv.targetLanguage
  }

  handleSubtitles(options).catch(error => {
    console.error(error)
    process.exit(1)
  })
}

module.exports = handleSubtitles
