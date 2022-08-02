const { parsedStart, parsedEnd } = require('./helpers')

function handleEventsFromTranslation (sourceEvents, referenceEvents, options) {
  const forceInvertNames = options.forceInvertNames
  const skipInvertNames = options.skipInvertNames
  const avoidDuplicate = options.avoidDuplicate
  let foundReplacement = false
  
  let rules = options.translationRules
  if (!rules) {
    if (!options.targetLanguage) options.targetLanguage = 'pt'
    const langNormalized = options.targetLanguage.toLowerCase().replace(/[^a-z]/g, '')
    rules = require('./rules/translation.' + langNormalized + '.js').rules
  }
  const { senpaiRegex, knownAdaptationsRegex } = rules

  for (const srcEvt of sourceEvents) {
    const refEvts = referenceEvents.filter(ref => {
      const overlap = Math.min(srcEvt[parsedEnd], ref[parsedEnd]) -
        Math.max(srcEvt[parsedStart], ref[parsedStart])
      return overlap > 0.5
    })

    const refText = refEvts
      .map(e => e.Text.replace(/\\N/g, ' ').replace(/\{.+?\}/g, ''))
      .join(' ')

    // Handle name order
    if (!skipInvertNames) {
      const nameMatches = refText.matchAll(/(\p{Lu}\p{Ll}+)(?:(?:\\N|\s)+(\p{Lu}\p{Ll}+))+/gu)
      for (const match of nameMatches) {
        const names = match[0].split(/(?:\\N|\s)+/g)
        for (let i = 1; i < names.length; i++) {
          const pairRegex = new RegExp(names[i] + '((?:\\\\N|\\s)+)' + names[i - 1], 'gmi')
          const replacement = forceInvertNames
            ? names[i - 1] + '$1' + names[i]
            : names[i] + '$1' + names[i - 1]
          srcEvt.Text = srcEvt.Text.replace(pairRegex, replacement)
        }
      }
    }

    const foundHonorifics = refText.match(/\w+-(ch|sa|ku|se|kyu)\w+|(?<!-)[Ss]enpai/g)
    if (!foundHonorifics) continue

    let evtTxt = srcEvt.Text.replace(/\\N/g, '\n')
    const replacements = []

    // Handle senpai
    for (let index = 0; index < foundHonorifics.length; index++) {
      const honorific = foundHonorifics[index]
      // TODO: handle senpais in reference subtitle
      if (honorific !== 'Senpai' && honorific !== 'senpai') continue
      for (const match of evtTxt.matchAll(senpaiRegex)) {
        const fixedHonorific = match[0].endsWith('s') ? honorific + 's' : honorific
        replacements.push([match, fixedHonorific])
        foundHonorifics.splice(index, 1)
      }
    }

    // Try to replace honorific omissions
    for (const match of evtTxt.matchAll(/\p{Lu}\p{L}+/gu)) {
      const prefix = match[0].slice(0, 2)
      const matchingIndex = foundHonorifics.findIndex(e => e.slice(0, 2) === prefix)
      if (matchingIndex === -1) continue
      const honorific = foundHonorifics[matchingIndex]
      if (!avoidDuplicate || !evtTxt.includes(honorific)) {
        replacements.push([match, honorific])
      }
      foundHonorifics.splice(matchingIndex, 1)
    }

    // Try to replace adaptations
    for (const match of evtTxt.matchAll(knownAdaptationsRegex)) {
      if (!foundHonorifics[0]) break
      replacements.push([match, foundHonorifics[0]])
      foundHonorifics.splice(0, 1)
    }

    if (replacements.length === 0) continue
    foundReplacement = true

    // Apply replacements
    replacements.sort((a, b) => b[0].index - a[0].index)
    for (const [match, replacement] of replacements) {
      evtTxt = evtTxt.slice(0, match.index) + replacement +
        evtTxt.slice(match.index + match[0].length)
    }

    evtTxt = evtTxt.replace(/\n/g, '\\N')
    srcEvt.Text = evtTxt
    if (foundHonorifics.length !== 0) {
      console.log('Could not replace:', evtTxt, foundHonorifics)
    }
  }

  return foundReplacement
}

exports.handleEventsFromTranslation = handleEventsFromTranslation
