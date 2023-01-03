const titles = [
  ['お嬢様', 'Ojou-sama', /Miss|Lady/g],
  ['せんぱい', 'Senpai', /Upperclassman/gi],
  ['先輩', 'Senpai', /Upperclassman/gi],
  ['お兄さん', 'Onii-san', /(?<!my(?:\s|\\N)+)(Big )?Brother/gi],
  ['お姉さん', 'Onee-san', /(?<!my(?:\s|\\N)+)(Big )?Sis(ter)?/gi],
  ['あ姉さん', 'Anee-san', /(?<!my(?:\s|\\N)+)(Big )?Sis(ter)?/gi],
  ['義兄さん', 'Nii-san', /(?<!my(?:\s|\\N)+)(Big )?Brother/gi],
  ['義姉さん', 'Nee-san', /(?<!my(?:\s|\\N)+)(Big )?Sis(ter)?/gi],
  ['お兄様', 'Onii-sama', /(?<!my(?:\s|\\N)+)(Big )?Brother/gi],
  ['お姉様', 'Onee-sama', /(?<!my(?:\s|\\N)+)(Big )?Sis(ter)?/gi],
  ['あ姉様', 'Anee-sama', /(?<!my(?:\s|\\N)+)(Big )?Sis(ter)?/gi],
  ['お義兄様', 'Onii-sama', /(?<!my(?:\s|\\N)+)(Big )?Brother/gi],
  ['お義姉様', 'Onee-sama', /(?<!my(?:\s|\\N)+)(Big )?Sis(ter)?/gi],
  ['あ義姉様', 'Anee-sama', /(?<!my(?:\s|\\N)+)(Big )?Sis(ter)?/gi],
  ['兄様', 'Nii-sama', /(?<!my(?:\s|\\N)+)(Big )?Brother/gi],
  ['お兄ちゃん', 'Onii-chan', /(?<!my(?:\s|\\N)+)Brother/gi],
  ['お姉ちゃん', 'Onee-chan', /(?<!my(?:\s|\\N)+)Sis(ter)?/gi],
  ['兄ちゃん', 'Nii-chan', /(?<!my(?:\s|\\N)+)Brother/gi],
  ['姉ちゃん', 'Nee-chan', /(?<!my(?:\s|\\N)+)Sis(ter)?/gi]
].map(e => ({
  jp: e[0],
  romaji: e[1],
  replacer: e[2]
}))

const honorifics = [
  ['お兄さん', 'oniisan'],
  ['お姉さん', 'oneesan'],
  ['あ姉さん', 'aneesan'],
  ['お義兄様', 'oniisama'],
  ['お義姉様', 'oneesama'],
  ['あ義姉様', 'aneesama'],
  ['お兄様', 'oniisama'],
  ['お姉様', 'oneesama'],
  ['あ姉様', 'aneesama'],
  ['兄様', 'niisama', /(?<!^|\s|“|お|義)兄様/g],
  ['姉様', 'neesama', /(?<!^|\s|“|お|あ|義)姉様/g],
  ['お兄ちゃん', 'oniichan'],
  ['お姉ちゃん', 'oneechan'],
  ['兄ちゃん', 'niichan', /(?<!^|\s|“|お)兄ちゃん/g],
  ['姉ちゃん', 'neechan', /(?<!^|\s|“|お)姉ちゃん/g],
  ['兄さん', 'niisan', /(?<!^|\s|“|義|お)兄さん/g],
  ['姉さん', 'neesan', /(?<!^|\s|“|義|お|あ)姉さん/g],
  ['ちゃん', 'chan', /(?<!^|\s|“|兄|姉)ちゃん/g],
  ['さん', 'san', /(?<!^|\s|“|兄|姉)さん/g],
  ['くん', 'kun'],
  ['君', 'kun'],
  ['きゅん', 'kyun'],
  ['お嬢', 'ojou'],
  ['嬢', 'jou', /(?<!^|\s|“|お)嬢/g],
  ['さま', 'sama', /(?<!^|\s|“|兄|姉|嬢)さま/g],
  ['様', 'sama', /(?<!^|\s|“|兄|姉|嬢)様/g],
  ['先生', 'sensei'],
  ['せんせい', 'sensei'],
  ['先輩', 'senpai'],
  ['せんぱい', 'senpai']
].map(e => ({
  jp: e[0],
  romaji: e[1],
  regex: e[2] || new RegExp(`(?<!^|\\s|“)${e[0]}`, 'g')
}))

const knownAdaptationsRegex = /(?:(?:my|your)(?:\s|\\N)+)?(?:(?:Mr|Miss|Mrs|Sir)\.|Lady|Lord|Princess|Prince|Brother|Sister)(?:\s|\\N)+(\p{Lu}\p{L}+(?: \p{Lu}\p{L}+)*)/gu

const nameNormalizationFns = [
  e => e
]

export const rules = { titles, honorifics, knownAdaptationsRegex, nameNormalizationFns }
