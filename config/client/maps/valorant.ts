import mapsData from '@root/data/maps/valorant.json'
import { Boxes, Medal } from 'lucide-react'

export default {
  name: 'Valorant',
  maps: mapsData,
  pools: {
    all: {
      id: 'all',
      name: 'All Maps',
      icon: Boxes,
      maps: ['Ascent', 'Bind', 'Breeze', 'Fracture', 'Haven', 'Icebox', 'Lotus', 'Sunset', 'Abyss', 'Pearl', 'Split']
    },
    comp: {
      id: 'comp',
      name: 'Competitive Pool',
      icon: Medal,
      maps: ['Ascent', 'Bind', 'Haven', 'Icebox', 'Lotus', 'Sunset', 'Abyss']
    }
  },
  defaultPool: 'comp',
  bestOfOptions: [1, 3, 5],
  defaultBestOf: 3
  // color: '355 100% 60%'
} as const
