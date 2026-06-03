import valConfig from '../src/config/games/valorant.json'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const API_URL = 'https://valorant-api.com/v1/maps'
const OUT_DIR = './public/maps'

interface MapData {
  displayName: string
  splash: string
  listViewIconTall: string
  premierBackgroundImage: string
}

const maps = valConfig.maps.map((m) => m.name.toLowerCase())

const res = await fetch(API_URL)
const { data }: { data: MapData[] } = await res.json()

await mkdir(OUT_DIR, { recursive: true })

const downloads = data
  .filter((map) => maps.includes(map.displayName.toLowerCase()))
  .flatMap((map) =>
    [
      { url: map.premierBackgroundImage, type: 'premier' },
      { url: map.splash, type: 'splash' },
      { url: map.listViewIconTall, type: 'tall' }
    ].map(({ url, type }) => ({ url, filename: `${map.displayName}-${type}.png` }))
  )

const batches = arrayToBatch(downloads, 5)

for (const batch of batches) {
  await Promise.all(batch.map(({ url, filename }) => downloadAndSaveImage(url, filename)))
  await new Promise((resolve) => setTimeout(resolve, 2000))
}

console.log(`\nDone. ${downloads.length} files → ${OUT_DIR}`)

function arrayToBatch<T>(arr: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize))
  }
  return batches
}

async function downloadAndSaveImage(url: string, filename: string) {
  if (existsSync(join(OUT_DIR, filename))) {
    console.log(`✓ ${filename} (cached)`)
    return
  }
  console.log(`Downloading ${filename}...`)
  if (!url) return
  const imgRes = await fetch(url, {
    signal: AbortSignal.timeout(5000)
  })
  if (!imgRes.ok) {
    console.error(`FAILED ${filename}: ${imgRes.status}`)
    return
  }
  await Bun.file(join(OUT_DIR, filename)).write(imgRes)
  console.log(`✓ ${filename}`)
}
