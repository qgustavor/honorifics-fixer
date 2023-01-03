import parse, { detectStringifyOptions } from '@qgustavor/ass-parser'
import cp from 'child_process'
import path from 'path'
import fs from 'fs'

// Fix common parsing issues from Anitomy
export function fixName (e) {
  return e
    .replace(/Epis.dio/g, 'Episode')
    .replace(/\.[a-z]{2}[A-Z]{2}\./, '.')
}

export async function getEvents (directory, file) {
  const absolutePath = path.resolve(directory, file)
  let data = await fs.promises.readFile(absolutePath, 'utf-8')

  // Check for SRT files and convert those to ASS
  if (data.includes('-->') && !data.includes('[Script Info]')) {
    const stdoutBuffer = []
    const ffmpegProcess = cp.spawn('ffmpeg', [
      '-i', absolutePath, '-f', 'ass', '-'
    ])
    ffmpegProcess.stdout.on('data', data => stdoutBuffer.push(data))
    await new Promise(resolve => ffmpegProcess.on('exit', resolve))
    data = Buffer.concat(stdoutBuffer).toString()
  }

  const parsed = parse(data, { comments: true, parseTimestamps: true })
  const events = parsed
    .find(e => e.section === 'Events')
    .body
    .filter(e => e.key === 'Dialogue')
    .map(e => e.value)
  const stringifyConfig = detectStringifyOptions(data)

  return [events, parsed, stringifyConfig, data]
}
