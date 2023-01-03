import { fixName, getEvents } from './helpers.js'
import stringify from '@qgustavor/ass-stringify'
import anitomy from 'anitomy-js'
import glob from 'glob'
import util from 'util'
import path from 'path'
import fs from 'fs'
import { orderBy } from 'natural-orderby'
import { handleEventsFromTranslation } from './translation.js'
import { handleEventsFromTransliteration } from './transliteration.js'

const globPromise = util.promisify(glob)

export default async function handleSubtitles (options) {
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

    const [sourceEvents, sourceParsed, stringifyConfig] = await getEvents(sourceDirectory, source)
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

    const newPath = targetFiles
      ? targetFiles[sourceFiles.indexOf(source)]
      : targetDirectory
        ? path.resolve(targetDirectory, newName)
        : newName

    const newData = stringify(sourceParsed, stringifyConfig)
    await fs.promises.writeFile(newPath, newData)
    newSubtitles.push(newPath)
  }

  return { newSubtitles }
}
