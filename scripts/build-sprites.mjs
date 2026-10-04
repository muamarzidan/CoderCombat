import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'


const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'ASSETS-CHARACTERS')
const OUT = join(ROOT, 'app', 'public', 'characters')

const STATES = ['idle', 'run', 'attack', 'hurt', 'die']
const CELL = 112

const CHARACTERS = [
  { id: 'samurai', dir: 'Samurai', prefix: 'char-female' },
  { id: 'shinobi', dir: 'Shinobi', prefix: 'char-male' },
]

function framesFor(dir, prefix, state) {
  const names = []
  for (let i = 1; i <= 99; i++) {
    const candidate = join(dir, `${prefix}_${state}${i}.png`)
    if (existsSync(candidate)) names.push(candidate)
  }

  if (names.length === 0) {
    const single = join(dir, `${prefix}_${state}.png`)
    if (existsSync(single)) names.push(single)
  }
  return names
}

function readPng(path) {
  return PNG.sync.read(readFileSync(path))
}

function blit(src, dst, offsetX, offsetY) {
  const ox = offsetX + Math.floor((CELL - src.width) / 2)
  const oy = offsetY + Math.floor((CELL - src.height) / 2)
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (src.width * y + x) << 2
      const alpha = src.data[si + 3]
      if (alpha === 0) continue
      const dx = ox + x
      const dy = oy + y
      if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) continue
      const di = (dst.width * dy + dx) << 2
      dst.data[di] = src.data[si]
      dst.data[di + 1] = src.data[si + 1]
      dst.data[di + 2] = src.data[si + 2]
      dst.data[di + 3] = alpha
    }
  }
}

function buildCharacter({ id, dir, prefix }) {
  const srcDir = join(SRC, dir)
  if (!existsSync(srcDir)) {
    console.error(`✗ folder tidak ditemukan: ${srcDir}`)
    process.exitCode = 1
    return
  }

  const rows = STATES.map((state) => framesFor(srcDir, prefix, state))
  const cols = Math.max(...rows.map((r) => r.length), 1)

  const sheet = new PNG({ width: cols * CELL, height: STATES.length * CELL })
  sheet.data.fill(0)

  let total = 0
  rows.forEach((frames, rowIndex) => {
    frames.forEach((file, colIndex) => {
      blit(readPng(file), sheet, colIndex * CELL, rowIndex * CELL)
      total++
    })
    console.log(`  ${id}/${STATES[rowIndex]}: ${frames.length} frame`)
  })

  mkdirSync(OUT, { recursive: true })
  const outFile = join(OUT, `${id}.png`)
  writeFileSync(outFile, PNG.sync.write(sheet))
  console.log(`✓ ${id}: ${cols}×${STATES.length} cell (${total} frame) → ${outFile}`)
}

console.log(`Membuat sprite sheet (cell ${CELL}px, baris: ${STATES.join(', ')})…`)
for (const c of CHARACTERS) buildCharacter(c)
console.log('Selesai')
