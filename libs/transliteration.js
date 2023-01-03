import { getEvents } from './helpers.js'
import substrings from 'common-substrings'
import hanzist from 'hanzist'
import path from 'path'
import fs from 'fs'

export async function handleEventsFromTransliteration (sourceEvents, referenceEvents, options) {
  const sourceFolder = options.sourceDirectory || path.dirname(options.sourceFiles[0])
  let foundReplacement = false

  let rules = options.transliterationRules
  if (!rules) {
    if (!options.targetLanguage) options.targetLanguage = 'pt'
    const langNormalized = options.targetLanguage.toLowerCase().replace(/[^a-z]/g, '')
    rules = (await import('./rules/transliteration.' + langNormalized + '.js')).rules
  }
  const { titles, honorifics, knownAdaptationsRegex, nameNormalizationFns } = rules
  const { names, nameMap } = await getNames(sourceFolder, referenceEvents, options, rules)

  const replacedHonorifics = []
  const replacedTitles = []
  const invertedNames = []
  const nonInvertedNames = []

  const refEvents = referenceEvents.map(event => {
    const normalizedText = normalizeReferenceText(event)
    const foundHonorifics = []
    let clearedText = normalizedText
    for (const honorific of honorifics) {
      const count = clearedText.split(honorific.regex).length - 1
      for (let i = 0; i < count; i++) {
        foundHonorifics.push(Object.assign({}, honorific))
        clearedText = clearedText.replace(honorific.jp, '')
      }
    }

    const foundTitles = []
    for (const title of titles) {
      const count = clearedText.split(title.jp).length - 1
      for (let i = 0; i < count; i++) {
        foundTitles.push(Object.assign({}, title))
        clearedText = clearedText.replace(title.jp, '')
      }
    }

    const fallbackTitles = []
    let fallbackText = normalizedText
    for (const title of titles) {
      const count = fallbackText.split(title.jp).length - 1
      for (let i = 0; i < count; i++) {
        fallbackTitles.push(Object.assign({}, title))
        fallbackText = fallbackText.replace(title.jp, '')
      }
    }

    return { foundHonorifics, foundTitles, fallbackTitles, normalizedText, clearedText, event }
  })

  for (let pass = 0; pass < 2; pass++) {
    let shouldInvertNames = false
    if (pass !== 0) {
      shouldInvertNames = invertedNames.length === nonInvertedNames.length
        ? replacedHonorifics.length >= 3
        : invertedNames.length > nonInvertedNames.length
      console.log('shouldInvertNames:', shouldInvertNames)
    }

    for (const srcEvt of sourceEvents) {
      // Ignore signs
      if (srcEvt.Style.startsWith('sign_')) {
        continue
      }

      let evtTxt = srcEvt.Text.replace(/\\N/g, '\n')
      const originalEvtTxt = evtTxt
      const refEvts = refEvents.filter(ref => {
        const overlap = Math.min(srcEvt.End, ref.event.End) -
          Math.max(srcEvt.Start, ref.event.Start)
        return overlap > 0.1
      })
      const refTextNormalized = refEvts.map(e => e.normalizedText).join(' ')
      const refTextClear = refEvts.map(e => e.clearedText).join(' ')

      // Handle name order
      if (pass === 0) {
        // Handle known names in the first pass
        const nameMatches = evtTxt.matchAll(/(\p{Lu}\p{Ll}+)(?:(?:\s|\\N)+(\p{Lu}\p{Ll}+))+/gu)
        for (const match of nameMatches) {
          // Try to find matched names in the reference subtitle
          const matchedNames = match[0].split(/(?:\s|\\N)+/g)

          for (let i = 1; i < matchedNames.length; i++) {
            const selectedNames = matchedNames.slice(i - 1, i + 1)
            const mappedNames = selectedNames.map(e => nameMap[e])
            if (mappedNames.includes(notANameSymbol)) continue

            // Bail out if name is not mapped
            if (mappedNames.some(e => !e)) continue
            const nameIndexes = mappedNames.map(e => refTextClear.indexOf(e))

            // Bail out if name is not found in reference
            if (nameIndexes.includes(-1)) continue

            const selectedNormalized = selectedNames.slice().sort().join(' ')
            const isNotInverted = nameIndexes[0] < nameIndexes[1]
            if (isNotInverted) {
              nonInvertedNames.push([selectedNormalized, srcEvt])
              continue
            }
            invertedNames.push([selectedNormalized, srcEvt])

            const pairRegex = new RegExp(
              selectedNames[0] + '((?:\\\\N|\\s)+)' + selectedNames[1], 'gmi'
            )
            const replacement = selectedNames[1] + '$1' + selectedNames[0]
            evtTxt = evtTxt.replace(pairRegex, replacement)
          }
        }
      } else if (shouldInvertNames) {
        // Handle unknown names in the second pass
        const nameMatches = evtTxt.matchAll(/(\p{Lu}\p{Ll}+)(?:(?:\s|\\N)+(\p{Lu}\p{Ll}+))+/gu)
        for (const match of nameMatches) {
          // Try to find matched names in the reference subtitle
          const matchedNames = match[0].split(/(?:\s|\\N)+/g)

          for (let i = 1; i < matchedNames.length; i++) {
            const selectedNames = matchedNames.slice(i - 1, i + 1)
            const selectedNormalized = selectedNames.slice().sort().join(' ')
            const searchFn = e => e[0] === selectedNormalized && e[1] === srcEvt
            if (invertedNames.find(searchFn)) continue
            if (nonInvertedNames.find(searchFn)) continue
            if (!selectedNames.every(e => names.includes(e))) continue
            const mappedNames = selectedNames.map(e => nameMap[e])
            if (mappedNames.includes(notANameSymbol)) continue

            const pairRegex = new RegExp(
              selectedNames[0] + '((?:\\\\N|\\s)+)' + selectedNames[1], 'gmi'
            )
            const replacement = selectedNames[1] + '$1' + selectedNames[0]
            evtTxt = evtTxt.replace(pairRegex, replacement)
          }
        }
      }

      const foundTitles = refEvts
        .map(e => e.foundTitles).flat()
        .filter(e => !replacedTitles.includes(e))
      const fallbackTitles = refEvts
        .map(e => e.fallbackTitles).flat()
        .filter(e => !replacedTitles.includes(e))
      const foundHonorifics = refEvts
        .map(e => e.foundHonorifics).flat()
        .filter(e => !replacedHonorifics.includes(e))

      if (foundTitles.length || fallbackTitles.length || foundHonorifics.length) {
        const replacements = []

        // Try to replace adaptations
        const foundAdaptedNames = []
        for (const match of evtTxt.matchAll(knownAdaptationsRegex)) {
          if (!foundHonorifics[0]) break
          const name = match[1]
          const nameParts = name.split(' ').map(e =>
            nameNormalizationFns.map(fn => fn(e)).find(e => names.includes(e))
          )
          if (nameParts.every(name => !name)) continue
          const mappedName = nameParts.map(e => nameMap[e]).filter(e => e)
          if (mappedName.includes(notANameSymbol)) continue
          foundAdaptedNames.push(...nameParts)

          if (mappedName.length > 0) {
            if (pass === 1) continue
            const correctHonorific = foundHonorifics.find(honorific =>
              mappedName.some(name =>
                refTextNormalized.includes(name + honorific.jp) ||
                refTextNormalized.includes(name + ' ' + honorific.jp) ||
                refTextNormalized.includes(name + '　' + honorific.jp)
              )
            )
            if (!correctHonorific) continue
            replacements.push([match, name + '-' + correctHonorific.romaji])
            replacedHonorifics.push(correctHonorific)
            foundHonorifics.splice(foundHonorifics.indexOf(correctHonorific), 1)
          } else if (pass === 1) {
            replacements.push([match, name + '-' + foundHonorifics[0].romaji])
            replacedHonorifics.push(foundHonorifics[0])
            foundHonorifics.splice(0, 1)
          }
        }

        // Try to replace honorific omissions
        for (const match of evtTxt.matchAll(/\p{Lu}\p{L}+((?:\s|\\N)+\p{Lu}\p{L}+)*/gu)) {
          const fallback = foundHonorifics[0]
          if (!fallback) break
          const name = match[0]
          const nameParts = name.split(' ').map(e =>
            nameNormalizationFns.map(fn => fn(e)).find(e => names.includes(e))
          )
          if (nameParts.some(e => foundAdaptedNames.includes(e))) continue
          if (nameParts.every(name => !name)) continue
          const mappedName = nameParts.map(e => nameMap[e]).filter(e => e)
          if (mappedName.includes(notANameSymbol)) continue

          if (mappedName.length > 0) {
            if (pass === 1) continue
            const correctHonorific = foundHonorifics.find(honorific =>
              mappedName.some(name =>
                refTextNormalized.includes(name + honorific.jp) ||
                refTextNormalized.includes(name + ' ' + honorific.jp) ||
                refTextNormalized.includes(name + '　' + honorific.jp)
              )
            )
            if (!correctHonorific) continue
            replacements.push([match, name + '-' + correctHonorific.romaji])
            replacedHonorifics.push(correctHonorific)
            foundHonorifics.splice(foundHonorifics.indexOf(correctHonorific), 1)
          } else if (pass === 1) {
            replacements.push([match, name + '-' + fallback.romaji])
            replacedHonorifics.push(fallback)
            foundHonorifics.splice(0, 1)
          }
        }

        // Try to replace titles
        if (pass === 1) {
          for (const title of foundTitles) {
            if (title.replacer.test(evtTxt)) {
              evtTxt = evtTxt.replace(title.replacer, e => {
                const startChar = e.charAt(0)
                const startsWithUpper = startChar === startChar.toUpperCase()
                return startsWithUpper ? title.romaji : title.romaji.toLowerCase()
              })
              replacedTitles.push(title)
              foundTitles.splice(foundTitles.indexOf(title), 1)
            }
          }
          for (const title of fallbackTitles) {
            if (title.replacer.test(evtTxt)) {
              const missedHonorific = foundHonorifics.find(e => e.jp === title.jp)
              if (!missedHonorific) continue
              evtTxt = evtTxt.replace(title.replacer, e => {
                const startChar = e.charAt(0)
                const startsWithUpper = startChar === startChar.toUpperCase()
                return startsWithUpper ? title.romaji : title.romaji.toLowerCase()
              })
              replacedTitles.push(title)
              fallbackTitles.splice(fallbackTitles.indexOf(title), 1)
              foundHonorifics.splice(foundHonorifics.indexOf(missedHonorific), 1)
            }
          }
        }

        if (replacements.length !== 0) {
          // Apply replacements
          replacements.sort((a, b) => b[0].index - a[0].index)
          for (const [match, replacement] of replacements) {
            evtTxt = evtTxt.slice(0, match.index) + replacement +
              evtTxt.slice(match.index + match[0].length)
          }
        }
      }

      if (originalEvtTxt !== evtTxt) {
        foundReplacement = true
        srcEvt.Text = evtTxt.replace(/\n/g, '\\N')
      }

      if (pass === 0) continue
      if (foundHonorifics.length !== 0 || foundTitles.length !== 0) {
        const nameRegex = new RegExp(names.join('|'), 'g')
        const simplifiedTxt = '\x1b[1;96m' + evtTxt
          .replace(/ *\n */g, ' ')
          .replace(nameRegex, '\x1b[1;31m$&\x1b[1;96m') + '\x1b[0m'
        const jpRegex = new RegExp([foundHonorifics, foundTitles].flat().map(e => e.jp).join('|'), 'g')
        const formattedRedText = '\x1b[1;90m' + refTextNormalized
          .replace(/ *\n */g, ' ')
          .replace(jpRegex, '\x1b[1;93m$&\x1b[1;90m') + '\x1b[0m'
        console.log('Warning at:', srcEvt.Start, simplifiedTxt, formattedRedText)
      }
      if (foundHonorifics.length !== 0) {
        console.log('-- Missed honorifics:', foundHonorifics)
      }
      if (foundTitles.length !== 0) {
        console.log('-- Missed titles:', foundTitles)
      }
    }
  }

  return foundReplacement
}

const namesCache = new Map()
const notANameSymbol = Symbol('not a name')
async function getNames (folder, referenceEvents, options, rules) {
  const cached = namesCache.get(folder)
  if (cached) return cached

  let relatedFiles = options.relatedFiles
  if (!relatedFiles) {
    const sourceSiblings = await fs.promises.readdir(folder)
    relatedFiles = sourceSiblings.filter(e => e.match(/\.(ass|srt)$/i))
  }

  let names = {}
  const nameEvents = {}
  const languageEvents = {}
  for (const sibling of relatedFiles) {
    const siblingPath = typeof sibling === 'string' ? sibling : sibling.path
    const language = sibling.language || sibling.match(/\.([a-z]{2}[A-Z]{2})\./)?.[1] || '?'
    if (!languageEvents[language]) languageEvents[language] = []

    const [events] = await getEvents(folder, siblingPath)
    languageEvents[language] = languageEvents[language].concat(events)
  }

  for (const events of Object.values(languageEvents)) {
    const siblingNames = new Set()
    for (const event of events) {
      const eventNames = event.Text
        .replace(/\{.+?\}/g, '')
        .replace(/\\N/g, ' ')
        .match(/\p{Lu}\p{L}{2,}( \p{Lu}\p{L}{2,})*/gu)

      if (!eventNames) continue
      for (const name of eventNames) {
        siblingNames.add(name)
        if (!nameEvents[name]) nameEvents[name] = []
        nameEvents[name].push(event)
      }
    }
    for (const name of siblingNames) {
      names[name] = (names[name] || 0) + 1
    }
  }

  const languageCount = Object.keys(languageEvents).length
  const minEntryCount = Math.max(languageCount / 2, Math.min(languageCount, 3))

  names = Object.entries(names).filter(e => e[1] >= minEntryCount).map(e => e[0])
  console.log('Detected names:', names.join(', '))

  // Match found names with reference subtitle based on where they appear
  const { knownNames } = await import('./rules/known-names.js')
  names = names.concat(Object.keys(knownNames))

  const nameMap = Object.assign({}, knownNames)
  if (options.nameMap) {
    Object.assign(nameMap, options.nameMap)
    names = names.concat(Object.keys(options.nameMap))
  }

  for (const name of names) {
    const events = nameEvents[name]
    delete nameEvents[name]
    if (nameMap[name]) continue
    if (events.length < 5) continue

    const intervals = events
      .map(e => [e.Start, e.End])
      .sort((a, b) => a[0] - b[0])

    const intervalReferences = Array.from(new Set(intervals.map(e => referenceEvents.filter(evt => {
      const overlap = Math.min(e[1], evt.End) -
        Math.max(e[0], evt.Start)
      return overlap > 0.1
    }).map(normalizeReferenceText)).flat()))

    // FIX ME: improve name matching algorithm

    const minOccurrence = Math.ceil(events.length * 0.3)
    const candidates = substrings(intervalReferences, {
      minOccurrence,
      minLength: 2
    }).sort((a, b) => b.weight - a.weight)

    let chosenCanditate
    if (candidates[0]) {
      chosenCanditate = candidates[0].name.trim()
      for (const honorific of rules.honorifics) {
        if (chosenCanditate.endsWith(honorific.jp)) {
          chosenCanditate = chosenCanditate.slice(0, -honorific.jp.length)
          break
        }
      }
      chosenCanditate = chosenCanditate.trim()
      if (chosenCanditate) {
        console.log('Detected %s as %s', chosenCanditate, name)
      }
    }
    nameMap[name] = chosenCanditate || notANameSymbol
  }

  const cachedData = { names, nameMap }
  if (folder) namesCache.set(folder, cachedData)
  return cachedData
}

function normalizeReferenceText (event) {
  const simplifiedText = event.Text.replace(/\\N/g, ' ').replace(/\{.+?\}/g, '')
  return hanzist.fullwidthCase(simplifiedText, ['Katakana'])
    // Remove control codes
    .replace(/\p{C}/gu, '')
    // Remove spaces
    .replace(/\s+/g, '')
    // Remove ～ from さ～ん
    .replace(/～/g, '')
    // Remove ー from さーん, ちゃーん and んーん
    .replace(/(さ|ちゃ|く)ー(ん)/g, '$1$2')
    // Remove name readings
    .replace(/\(.+?\)/g, '')
    .replace(/（.+?）/g, '')
    .replace(/［.+?］/g, '')
    // Special case: Platinum End S01E02 08:50
    .replace(/ロドリゲス/g, 'ロドリゲス')
    // Special case: Sumire
    .replace(/すみれ/g, '菫')
    // Special case: Midori
    .replace(/ミドリ/g, '翠')
    .trim()
}
