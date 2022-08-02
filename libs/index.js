const { fixName, getEvents } = require('./helpers')
const stringify = require('ass-stringify')
const anitomy = require('anitomy-js')
const glob = require('glob')
const util = require('util')
const path = require('path')
const fs = require('fs')
const { orderBy } = require('natural-orderby')
const { handleEventsFromTranslation } = require('./translation')
const { handleEventsFromTransliteration } = require('./transliteration')

const globPromise = util.promisify(glob)

async function handleSubtitles (options) {
  const sourceDirectory = options.sourceDirectory
  const targetDirectory = options.targetDirectory || options.sourceDirectory
  const referenceDirectory = options.referenceDirectory || options.sourceDirectory
  let sourceFiles = options.sourceFiles || (await globPromise(options.source, {
    cwd: sourceDirectory
  }))
  let referenceFiles = options.referenceFiles || (await globPromise(options.reference, {
    cwd: referenceDirectory
  }))
  const targetFiles = options.targetFiles
  if (targetFiles && targetFiles.length !== sourceFiles.length) {
    throw Error('The count of target files should be equal to the count of source files')
  }

  if (!targetFiles) {
    sourceFiles = orderBy(sourceFiles)
    referenceFiles = orderBy(referenceFiles)
  }

  const newSubtitles = []
  const mappedSources = []
  if (options.singleEpisode) {
    if (referenceFiles.length === 0) {
      throw Error('Found no reference files')
    }
    for (const source of sourceFiles) {
      mappedSources.push([source, referenceFiles[0]])
    }
  } else {
    // Map source to reference files
    const parsedSources = await anitomy.parse(sourceFiles.map(fixName))
    const parsedReferences = await anitomy.parse(referenceFiles.map(fixName))
    for (let i = 0; i < sourceFiles.length; i++) {
      const file = sourceFiles[i]
      const parsedSource = parsedSources[i]
      const episode = Number(parsedSource.episode_number)
      const referenceIndex = parsedReferences.findIndex(e => {
        return Number(e.episode_number) === episode
      })
      if (referenceIndex === -1) continue
      mappedSources.push([file, referenceFiles[referenceIndex]])
    }
  }

  // Apply replacements on each mapped source
  for (const [source, reference] of mappedSources) {
    console.log('Got', source)

    const [sourceEvents, sourceParsed, sourceData] = await getEvents(sourceDirectory, source)
    const [referenceEvents] = await getEvents(referenceDirectory, reference)

    if (referenceEvents.length < 5) throw Error(`Too few reference events: ${referenceEvents.length}`)
    const japaneseEvents = referenceEvents.filter(e => /[ぁ-んァ-ン一-龯]+/.test(e.Text))
    const isTransliteration = japaneseEvents.length > referenceEvents.length * 0.5

    const gotReplacement = isTransliteration
      ? await handleEventsFromTransliteration(sourceEvents, referenceEvents, options)
      : await handleEventsFromTranslation(sourceEvents, referenceEvents, options)

    if (!gotReplacement) {
      console.log('Found nothing to replace')
      continue
    }

    const newName = (targetDirectory ? path.basename(source) : source)
      .replace(/((?:.(?!-\d+\.[a-z])){10,80}.).*(-\d+\.[a-z])/, '$1$2')
      .replace(/\.ass$/, '.honorifics.ass')

    // Keep format lines spacing
    const originalFormatLines = sourceData.split(/\r?\n/g).filter(e => e.startsWith('Format: '))

    const newPath = targetFiles
      ? targetFiles[sourceFiles.indexOf(source)]
      : targetDirectory
        ? path.resolve(targetDirectory, newName)
        : newName
    const newData = stringify(sourceParsed)
      .replace(/^Format: .*/gm, () => originalFormatLines.shift())
    await fs.promises.writeFile(newPath, newData)
    newSubtitles.push(newPath)
  }

  return { newSubtitles }
}

module.exports = handleSubtitles
