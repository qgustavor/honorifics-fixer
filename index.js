import handleSubtitles from './libs/index.js'
import { realpathSync } from 'fs'
import { pathToFileURL } from 'url'

// https://stackoverflow.com/a/71925565
if (import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  // Seems Standard do not support top level await yet
  import('yargs-parser').then(yargs => {
    const argv = yargs.default(process.argv)
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

    return handleSubtitles(options)
  }).catch(error => {
    console.error(error)
    process.exit(1)
  })
}

export default handleSubtitles
