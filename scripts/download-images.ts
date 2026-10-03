import valConfig from '../src/config/games/valorant.json'
import { mkdir } from 'fs/promises'
import { join } from 'path'

const API_URL = 'https://valorant-api.com/v1/maps'
const OUT_DIR = './public/maps'
const CONFIG_PATH = './src/config/games/valorant.json'

interface ApiMap {
  displayName: string
  tacticalDescription: string | null
  splash: string
  listViewIconTall: string
  premierBackgroundImage: string
}

const res = await fetch(API_URL)
const { data }: { data: ApiMap[] } = await res.json()

// Same filter as the server's /api/pool refresh: only plant/defuse maps have a tacticalDescription
const known = new Set(valConfig.maps.map((m) => m.name))
const newMaps = data.filter((m) => m.tacticalDescription && !known.has(m.displayName))

if (newMaps.length === 0) {
  console.log('No new maps.')
  process.exit(0)
}

await mkdir(OUT_DIR, { recursive: true })

for (const map of newMaps) {
  const stem = map.displayName.replace(/\s+/g, '-')
  await Promise.all([
    download(map.premierBackgroundImage, `${stem}-premier.png`),
    download(map.splash, `${stem}-splash.png`),
    download(map.listViewIconTall, `${stem}-tall.png`)
  ])
  valConfig.maps.push({
    id: Math.max(...valConfig.maps.map((m) => m.id)) + 1,
    name: map.displayName,
    poolImage: `${stem}-premier.webp`,
    cardImage: `${stem}-premier.webp`,
    selectedImage: `${stem}-tall.webp`,
    sidePickImage: `${stem}-splash.webp`
  })
  valConfig.pools.all.maps.push(map.displayName)
}

await Bun.write(CONFIG_PATH, JSON.stringify(valConfig, null, 2) + '\n')
console.log(`Added ${newMaps.map((m) => m.displayName).join(', ')} → ${CONFIG_PATH}`)

async function download(url: string, filename: string) {
  const imgRes = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!imgRes.ok) throw new Error(`${filename}: ${imgRes.status}`)
  // Streaming the Response straight into Bun.write hung at 100% CPU on Bun 1.3.14
  await Bun.write(join(OUT_DIR, filename), await imgRes.arrayBuffer())
  console.log(`✓ ${filename}`)
}
