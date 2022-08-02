const titles = [
  ['お嬢様', 'Ojou-sama', /Senhorita|Dama|Lady/g],
  ['せんぱい', 'Senpai', /Veteran[oa]|Capitão?|President[ea]/gi],
  ['先輩', 'Senpai', /Veteran[oa]|Capitão?|President[ea]/gi],
  ['先生', 'Sensei', /Mestr[ea]|Treinadora?|Professora?/gi],
  ['お兄さん', 'Onii-san', /(?<!meu(?:\s|\\N)+)(Grande )?Irmão(zão)?( Maior)?|\bMan(inh)?o\b|Moço/gi],
  ['お姉さん', 'Onee-san', /(?<!minha(?:\s|\\N)+)(Grande )?Irmã(zona)?( Maior)?|\bMan(inh)?a\b|Moça/gi],
  ['あ姉さん', 'Anee-san', /(?<!minha(?:\s|\\N)+)(Grande )?Irmã(zona)?( Maior)?|\bMan(inh)?a\b|Moça/gi],
  ['義兄さん', 'Nii-san', /(?<!meu(?:\s|\\N)+)(Grande )?Irmão(zão)?( Maior)?|\bMan(inh)?o\b|Moço/gi],
  ['義姉さん', 'Nee-san', /(?<!minha(?:\s|\\N)+)(Grande )?Irmã(zona)?( Maior)?|\bMan(inh)?a\b|Moça/gi],
  ['お兄様', 'Onii-sama', /(?<!meu(?:\s|\\N)+)(Grande )?Irmão(zão)?( Maior)?|\bMan(inh)?o\b/gi],
  ['お姉様', 'Onee-sama', /(?<!minha(?:\s|\\N)+)(Grande )?Irmã(zona)?( Maior)?|\bMan(inh)?a\b/gi],
  ['あ姉様', 'Anee-sama', /(?<!minha(?:\s|\\N)+)(Grande )?Irmã(zona)?( Maior)?|\bMan(inh)?a\b/gi],
  ['お義兄様', 'Onii-sama', /(?<!meu(?:\s|\\N)+)(Grande )?Irmão(zão)?( Maior)?|\bMan(inh)?o\b/gi],
  ['お義姉様', 'Onee-sama', /(?<!minha(?:\s|\\N)+)(Grande )?Irmã(zona)?( Maior)?|\bMan(inh)?a\b/gi],
  ['あ義姉様', 'Anee-sama', /(?<!minha(?:\s|\\N)+)(Grande )?Irmã(zona)?( Maior)?|\bMan(inh)?a\b/gi],
  ['兄様', 'Nii-sama', /(?<!meu(?:\s|\\N)+)(Grande )?Irmão(zão)?( Maior)?|\bMan(inh)?o\b/gi],
  ['お兄ちゃん', 'Onii-chan', /(?<!meu(?:\s|\\N)+)Irmão|\bMan(inh)?o\b|Moço/gi],
  ['お姉ちゃん', 'Onee-chan', /(?<!minha(?:\s|\\N)+)Irmã|\bMan(inh)?a\b|Moça/gi],
  ['兄ちゃん', 'Nii-chan', /(?<!meu(?:\s|\\N)+)Irmão|\bMan(inh)?o\b|Moço/gi],
  ['姉ちゃん', 'Nee-chan', /(?<!minha(?:\s|\\N)+)Irmã|\bMan(inh)?a\b|Moça/gi]
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

const knownAdaptationsRegex = /(?:(?:meu|minha|seu|sua)(?:\s|\\N)+)?(?:(?:Sr|Sra|Srta)\.|Senhorita|Senhor|Princesa|Príncipe|Lady|[Ii]rmão?|Professora?|Capitão?|President[ea]|Mestr[ea])(?:\s|\\N)+(\p{Lu}\p{L}+(?: \p{Lu}\p{L}+)*)/gu

const nameNormalizationFns = [
  e => e,
  e => e.replace(/(zinh|nh)[ao]$/, ''),
  e => e.replace(/(zinh|nh)([ao])$/, '$2'),
  e => e.replace(/(zinh|nh)([ao])$/, 'cchan')
]

exports.rules = { titles, honorifics, knownAdaptationsRegex, nameNormalizationFns }
