/* eslint-disable react-refresh/only-export-components */
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, redirect, RouterProvider } from '@tanstack/react-router'
import { playErrorSound } from './assets/sfx/error/error'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { Toaster } from './components/ui/sonner'
import { createRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen'
import { StrictMode } from 'react'
import './index.css'

// Setup Query Client
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError() {
      playErrorSound()
    }
  })
})

const router = createRouter({ routeTree, context: { queryClient } })
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function Root() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={100}>
          <Toaster />
          <RouterProvider
            defaultErrorComponent={() => {
              throw redirect({ to: '/' })
            }}
            defaultPendingMinMs={0}
            router={router}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
