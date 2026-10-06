import https from 'https'
import fs from 'fs'

const OUT = new URL('../content/ro/expTables.json', import.meta.url)

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (r) => {
        let d = ''
        r.on('data', (c) => (d += c))
        r.on('end', () => resolve(d))
      })
      .on('error', reject)
  })
}

function extractExpBlock(lines, startIdx) {
  const out = []
  for (let j = startIdx + 1; j < lines.length; j++) {
    const lv = lines[j].match(/^\s+- Level: (\d+)\s*$/)
    if (!lv) {
      if (out.length > 0) break
      continue
    }
    const level = Number(lv[1])
    const em = lines[j + 1]?.match(/^\s+Exp: (\d+)\s*$/)
    if (!em) break
    out.push(Number(em[1]))
    j++
    if (level === 99) break
  }
  return out
}

function extractValBlock(lines, startIdx, valueKey) {
  const valueRe = new RegExp(`^\\s+${valueKey}: (\\d+)\\s*$`)
  const out = []
  for (let j = startIdx + 1; j < lines.length; j++) {
    const lv = lines[j].match(/^\s+- Level: (\d+)\s*$/)
    if (!lv) {
      if (out.length > 0) break
      continue
    }
    const level = Number(lv[1])
    const em = lines[j + 1]?.match(valueRe)
    if (!em) break
    out.push(Number(em[1]))
    j++
    if (level === 99) break
  }
  return out
}

const expYaml = (
  await get('https://raw.githubusercontent.com/rathena/rathena/refs/heads/master/db/pre-re/job_exp.yml')
).split('\n')
const baseIdx = expYaml.findIndex((l, i) => i > 80 && l.trim() === 'BaseExp:')
const jobIdx = expYaml.findIndex((l, i) => i > 560 && l.trim() === 'JobExp:')
const baseExpToNext = extractExpBlock(expYaml, baseIdx)
const jobExpToNext = extractExpBlock(expYaml, jobIdx).slice(0, 50)

const bp = (
  await get('https://raw.githubusercontent.com/rathena/rathena/refs/heads/master/db/pre-re/job_basepoints.yml')
).split('\n')
const hpIdx = bp.findIndex((l, i) => i > 80 && l.trim() === 'BaseHp:')
const spIdx = bp.findIndex((l, i) => i > hpIdx && l.trim() === 'BaseSp:')
const noviceHp = extractValBlock(bp, hpIdx, 'Hp')
const noviceSp = extractValBlock(bp, spIdx, 'Sp')

const statYaml = (
  await get('https://raw.githubusercontent.com/rathena/rathena/refs/heads/master/db/pre-re/statpoint.yml')
).split('\n')
const cumulative = new Array(100).fill(0)
for (let j = 0; j < statYaml.length; j++) {
  const m = statYaml[j].match(/^\s+- Level: (\d+)\s*$/)
  if (!m) continue
  const p = statYaml[j + 1]?.match(/^\s+Points: (\d+)\s*$/)
  if (p) cumulative[Number(m[1])] = Number(p[1])
}
const statPointsOnBaseLevelUp = []
for (let lv = 1; lv <= 99; lv++) {
  statPointsOnBaseLevelUp.push(lv === 1 ? 0 : cumulative[lv] - cumulative[lv - 1])
}

const pack = {
  sourceUrl: 'https://github.com/rathena/rathena/tree/master/db/pre-re',
  baseLevelCap: 99,
  jobLevelCap: 50,
  baseExpToNext,
  jobExpToNext,
  jobBaseHp: { novice: noviceHp },
  jobBaseSp: { novice: noviceSp },
  statPointsOnBaseLevelUp,
}

fs.writeFileSync(OUT, `${JSON.stringify(pack, null, 2)}\n`)
console.log('Wrote', OUT.pathname, {
  baseExpToNext: baseExpToNext.length,
  jobExpToNext: jobExpToNext.length,
  noviceHp: noviceHp.length,
  noviceSp: noviceSp.length,
})
