import { AnimatingCard, AnimatingCardContainer } from '@/components/animating-cards'
import { CenteredPageLayout } from '@/components/centered-page-layout'
import { Route as GameRoute } from '@/routes/$game/_layout'
import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '@/components/page-header'
import { BanAction } from '@/types/ban-order.types'
import { ComponentProps, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Hammer, Swords } from 'lucide-react'
import { cn } from '@/utils/tailwind-utils'

export const Route = createFileRoute('/$game/_layout/$id/_layout/$token')({
  onEnter: async () => {},
  component: VetoPage
})

function VetoPage() {
  const { store, config } = GameRoute.useLoaderData()
  const { pool } = store.useStore('pool')
  const [selectedMaps, setSelectedMaps] = useState<string[]>([])

  const handleSelectMap = async (map: string) => {
    setSelectedMaps((prev) => [...prev, map])
  }

  //TODO: Mock variables
  type Data = {
    team1: string
    team2: string
    turn: number
    vetoType: BanAction.Ban | BanAction.Pick
  }
  const data: Data = {
    team1: 'Team 1',
    team2: 'Team 2',
    turn: 1,
    vetoType: BanAction.Pick
  }
  return (
    <CenteredPageLayout className='min-w-[300px] w-[80%] max-w-[600px] space-y-8'>
      <PageHeader className='w-full flex items-center gap-2 text-2xl justify-between italic'>
        <div className='flex-1'>
          <p className='z-10 w-fit flex gap-2 items-center relative'>
            {data.team1}
            {data.turn == 1 && <VetoTurnIndicator vetoType={data.vetoType} />}
          </p>
        </div>
        <p className='text-sm'>vs</p>
        <div className='flex-1 flex justify-end '>
          <p className='z-10 w-fit flex gap-2 items-center relative'>
            {data.turn == 2 && <VetoTurnIndicator vetoType={data.vetoType} />}
            {data.team2}
          </p>
        </div>
      </PageHeader>
      <AnimatingCardContainer className='h-60 !w-full' cardWidth={70} gap={4}>
        {pool.maps.map((map, idx) => {
          if (selectedMaps.includes(map)) return null
          const mapData = config.maps.find((m) => m.name === map)
          const mapUrl = `${window.location.origin}/maps/${mapData?.images[0]}`
          return (
            <AnimatingCard
              layoutId={map}
              onClick={() => handleSelectMap(map)}
              key={idx}
              className='overflow-hidden cursor-pointer rounded-lg'
            >
              <div
                style={{
                  backgroundImage: `url(${mapUrl})`
                }}
                className='bg-center bg-cover flex justify-center items-center transition-all h-full w-full'
              >
                <div className='h-full w-full grid place-items-center'>
                  <h1 className='relative text-white font-bold -rotate-90'>
                    <div className='h-full -z-10 w-full bg-black absolute blur-3xl' />
                    {map}
                  </h1>
                </div>
              </div>
            </AnimatingCard>
          )
        })}
      </AnimatingCardContainer>
      <motion.div className='space-y-4'>
        <h1 className='font-bold text-lg italic z-20'>Selected Maps:</h1>
        <motion.div layout className='flex gap-1 -z-10'>
          {!selectedMaps.length && (
            <motion.div
              className='text-medium text-muted-foreground italic'
              exit={{
                zoom: 0
              }}
            >
              No Maps selected
            </motion.div>
          )}
          <AnimatePresence mode='popLayout'>
            {selectedMaps.map((map) => {
              const mapData = config.maps.find((m) => m.name === map)
              const mapUrl = `/maps/${mapData?.images[3]}`
              return (
                <motion.div
                  layoutId={map}
                  key={map}
                  className='h-24 max-w-80 flex items-center min-w-24 bg-center bg-cover flex-1 overflow-hidden cursor-pointer border-[2px] border-primary rounded-lg'
                  initial={{ skewX: -8 }}
                  animate={{ skewX: -8 }}
                  transition={{
                    type: 'spring',
                    duration: 0.5
                  }}
                >
                  <motion.img
                    layout
                    transition={{
                      type: 'spring',
                      duration: 0.5
                    }}
                    src={mapUrl}
                    className='w-full absolute'
                  />
                  <motion.h1
                    layout
                    className='absolute bottom-0 left-0 h-fit bg-primary text-sm px-4 font-bold text-primary-foreground drop-shadow-lg'
                  >
                    {map}
                  </motion.h1>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </CenteredPageLayout>
  )
}

type VetoTurnIndicatorProps = ComponentProps<typeof Badge> & {
  vetoType: BanAction.Ban | BanAction.Pick
}
function VetoTurnIndicator({ vetoType, ...props }: VetoTurnIndicatorProps) {
  const ActionIcon = vetoType === BanAction.Ban ? Hammer : Swords
  const actionStyle = vetoType === BanAction.Ban ? 'text-red-500' : 'text-emerald-500'
  return <ActionIcon className={cn('h-5 w-5', actionStyle, props.className)} />
}
