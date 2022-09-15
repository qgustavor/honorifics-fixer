# Honorifics Fixer

"Fixes" subtitles by adding honorifics to them using a reference subtitle.

## Why?

Because of [this script](https://github.com/qgustavor/subtitle-comments/) I know there was a translator that wrote in a subtitle "Brazilian people will not like this, but 'whatever'".

Before reading that I didn't care about honorifics, but if some translator knew people would not like their translation and just said "whatever" I don't need to accept that.

So I made this script.

## CLI usage

```bash
node index.js *.source.ass *.reference.ass
# creates *.honorifics.ass
```

Reference files can be other translations or closed captions (transcriptions). Tested mainly with Portuguese subtitles, may work with English subtitles.

## Programmatic usage

```javascript
const handleSubtitles = require('./path/to/index.js')

handleSubtitles(options) // return a promise
```

### Options

- `source`: a glob of the files to be used as source
- `reference`: a glob of the files to be used as references
- `sourceDirectory`: the directory to glob the source files from
- `referenceDirectory`: the directory to glob the reference files from
- `targetDirectory`: the directory to save the generated files
- `sourceFiles`: an array of source files (if defined the glob will be ignored)
- `referenceFiles`: an array of reference files (if defined the glob will be ignored)
- `targetFiles`: an array of target files (if defined the automatic naming will be ignored)
- `singleEpisode`: assume just a single episode was inputted and do not try to pair source and reference files using episode numbers
- `forceInvertNames`: force name inversion in case the reference subtitle got the names inverted
- `avoidDuplicate`: set to `true` to not duplicate honorifics in case they already exist in inconsistent subtitles
- `targetLanguage`: the language used in the source/target subtitles, used when loading pre-loaded rules, default to `pt`
- `translationRules`: if defined it sets the rules used in the translation mode
- `transliterationRules`: if defined it sets the rules used in the transliteration mode
- `nameMap`: if defined it sets a object that maps names to transliterations

Check `libs/rules` folder to check the pre-loaded rules and name map.
