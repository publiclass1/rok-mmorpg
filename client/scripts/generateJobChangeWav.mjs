import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../public/sounds/job-change')
mkdirSync(outDir, { recursive: true })

function writeToneWav(fileName, frequencies, durationSec = 0.65, sampleRate = 22050) {
  const samples = Math.floor(sampleRate * durationSec)
  const data = Buffer.alloc(samples * 2)
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const env = Math.min(1, i / (sampleRate * 0.03)) * Math.max(0, 1 - (i - samples * 0.5) / (samples * 0.5))
    let v = 0
    for (const f of frequencies) {
      v += Math.sin(2 * Math.PI * f * t) / frequencies.length
    }
    const amp = Math.max(-32767, Math.min(32767, Math.floor(v * env * 24000)))
    data.writeInt16LE(amp, i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  writeFileSync(join(outDir, fileName), Buffer.concat([header, data]))
}

writeToneWav('job-change.wav', [392, 523, 659, 784, 988], 0.65)

console.log('Wrote job-change.wav to', outDir)
