/**
 * Generates Cantonese TTS audio files using Microsoft Edge TTS (no API key needed).
 * Saves MP3s to public/tts/ for local bundling with the app.
 * Usage: node scripts/generate-tts.mjs
 */
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../public/tts')

const VOICE = 'zh-HK-WanLungNeural'

const TERMS = [
  { zh: '上',   file: 'chow' },
  { zh: '碰',   file: 'pung' },
  { zh: '槓',   file: 'kong' },
  { zh: '花牌', file: 'flower' },
  { zh: '食糊', file: 'win' },
  { zh: '自摸', file: 'zimo' },
]

mkdirSync(OUT_DIR, { recursive: true })

for (const { zh, file } of TERMS) {
  process.stdout.write(`Synthesising ${zh} (${file}) ... `)
  const tts = new MsEdgeTTS()
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)
  const { audioStream } = tts.toStream(zh)
  const chunks = []
  for await (const chunk of audioStream) chunks.push(chunk)
  const buf = Buffer.concat(chunks)
  writeFileSync(`${OUT_DIR}/${file}.mp3`, buf)
  console.log(`✓  ${buf.length} bytes → public/tts/${file}.mp3`)
}

console.log('\nAll TTS files generated.')
