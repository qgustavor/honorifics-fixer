const parser = require('ass-parser')
const cp = require('child_process')
const util = require('util')
const path = require('path')
const fs = require('fs')

const execFile = util.promisify(cp.execFile)
const parsedStart = Symbol('Parsed Start')
const parsedEnd = Symbol('Parsed End')

// Fix common parsing issues from Anitomy
function fixName (e) {
  return e
    .replace(/Epis.dio/g, 'Episode')
    .replace(/\.[a-z]{2}[A-Z]{2}\./, '.')
}

async function getEvents (directory, file) {
  const absolutePath = path.resolve(directory, file)
  let data = await fs.promises.readFile(absolutePath, 'utf-8')

  // Check for SRT files and convert those to ASS
  if (data.includes('-->') && !data.includes('[Script Info]')) {
    let stdoutBuffer = []
    const ffmpegProcess = cp.spawn('ffmpeg', [
      '-i', absolutePath, '-f', 'ass', '-'
    ])
    ffmpegProcess.stdout.on('data', data => stdoutBuffer.push(data))
    await new Promise(resolve => ffmpegProcess.on('exit', resolve))
    data = Buffer.concat(stdoutBuffer).toString()
  }

  const parsed = parser(data)
  const events = parsed
    .find(e => e.section === 'Events')
    .body
    .filter(e => e.key === 'Dialogue')
    .map(e => e.value)

  for (const evt of events) {
    evt[parsedStart] = parseTime(evt.Start)
    evt[parsedEnd] = parseTime(evt.End)
  }

  return [events, parsed, data]
}

function parseTime (e) {
  return new Date('1970-01-01T0' + e).valueOf()
}

exports.fixName = fixName
exports.getEvents = getEvents
exports.parseTime = parseTime
exports.parsedStart = parsedStart
exports.parsedEnd = parsedEnd
