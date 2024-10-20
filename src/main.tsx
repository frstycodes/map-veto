/* eslint-disable react-refresh/only-export-components */
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { ThemeProvider } from './providers/theme-provider'
import { queryClient, trpc, trpcClient } from './lib/trpc'
import { Toaster } from './components/ui/sonner'
import { createRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen'
import { StrictMode } from 'react'
import './index.css'

const router = createRouter({ routeTree, context: {} })
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function Root() {
  return (
    <StrictMode>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <ThemeProvider defaultTheme='dark'>
          <Toaster />
          <RouterProvider router={router} context={{}} />
        </ThemeProvider>
      </trpc.Provider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
