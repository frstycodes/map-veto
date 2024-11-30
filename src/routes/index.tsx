import { CenteredPageLayout } from '@/components/centered-page-layout'
import { createFileRoute, Link } from '@tanstack/react-router'
import { playHoverSound } from '@/assets/sfx/hover/hover'
import { PageHeader } from '@/components/page-header'
import { PageLoader } from '@/components/page-loader'
import { Image } from '@/components/image'
import { Logo } from '@/components/logo'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/')({
  loader: () => import('@/config/games/config-list').then((m) => m.gameConfigList),
  pendingComponent: PageLoader,
  component: IndexPage
})

function IndexPage() {
  const gameConfigList = Route.useLoaderData()
  return (
    <CenteredPageLayout>
      <PageHeader>
        <Logo />
      </PageHeader>
      <motion.p layoutId='logo-description' className='py-2' transition={{ type: 'spring', duration: 0.8 }}>
        Quickly veto maps for follwing games:
      </motion.p>
      <p className='pb-1 pt-4 text-lg font-bold'>Choose your game:</p>
      <div className='flex gap-4'>
        {gameConfigList.map((game) => {
          const imageURL = `/optimized/${game.slug}.webp`
          return (
            <Link to='/$game' params={{ game: game.slug }} key={game.name} className='py-2'>
              <button
                onMouseEnter={() => playHoverSound()}
                className='group relative bg-foreground transition-transform hover:scale-105 active:scale-100'
              >
                <Image
                  src={imageURL}
                  alt={game.name}
                  className='relative z-10 w-48 object-cover object-center'
                  role='presentation'
                  srcSet={{
                    360: 800,
                    480: 1400,
                    640: 1920
                  }}
                  sizes='(max-width: 400px) 50vw, 192px'
                />
                <Image
                  src={imageURL}
                  className='absolute left-0 top-0 size-full opacity-100 transition-all group-hover:opacity-100 group-hover:blur-xl'
                  role='presentation'
                  srcSet={{
                    360: 800,
                    480: 1400,
                    640: 1920
                  }}
                  sizes='(max-width: 400px) 50vw, 192px'
                />
              </button>
            </Link>
          )
        })}
      </div>
    </CenteredPageLayout>
  )
}
