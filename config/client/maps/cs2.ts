import mapsData from '@root/data/maps/cs2.json'
import { Boxes, Medal } from 'lucide-react'

export default {
  name: 'Counter Strike 2',
  maps: mapsData,
  pools: {
    all: {
      id: 'all',
      name: 'All Maps',
      icon: Boxes,
      maps: [
        'Ancient',
        'Anubis',
        'Inferno',
        'Mirage',
        'Nuke',
        'Overpass',
        'Vertigo',
        'Office',
        'Dust2',
        'Train',
        'Cache'
      ]
    },
    comp: {
      id: 'comp',
      name: 'Competitive Pool',
      icon: Medal,
      maps: ['Ancient', 'Inferno', 'Mirage', 'Overpass', 'Vertigo', 'Dust2', 'Cache']
    }
  },
  defaultPool: 'comp',
  bestOfOptions: [1, 3, 5],
  defaultBestOf: 3,
  color: '36 100% 50%'
} as const
