import {
  getAlternateBanOrder,
  getLastPickBanOrder
} from '@root/utils/shared/ban-order'
import { BanOrderPreset, Presets } from '@root/types/shared/ban-order.types'
import { Gavel, Swords } from 'lucide-react'

/**
 *
 * @param poolSize Size of the map pool
 * @param bestOf Best of X rounds
 */
export function getAvailableBanOrderPresets(poolSize: number, bestOf: number) {
  const alternate = getAlternateBanOrder(poolSize, bestOf)
  const lastPick = getLastPickBanOrder(poolSize, bestOf)

  const presets: Presets = {
    [BanOrderPreset.Alternate]: {
      icons: (
        <>
          <Gavel />
          <Swords />
          <Gavel />
        </>
      ),
      label: 'Alternate',
      description: 'Ban, Pick, Ban until decider',
      banOrders: alternate
    },
    [BanOrderPreset.LastPick]: {
      icons: (
        <>
          <Gavel />
          <Gavel />
          <Swords />
        </>
      ),
      label: 'Last Pick',
      description: `Ban until ${bestOf} maps remaining.`,
      banOrders: lastPick
    }
  }

  return presets
}
