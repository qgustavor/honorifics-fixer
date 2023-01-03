const senpaiRegex = /(?<=, )\p{L}+(?=[.?!,;])|senior|upperclassman/gu
const knownAdaptationsRegex = /(Mr|Mrs|Miss|Ms|Mx|Sir|Dame|Dr|Cllr|Lady|Lord)\.?( ?\p{Lu}\p{L}+){1,2}/gu

export const rules = { senpaiRegex, knownAdaptationsRegex }
