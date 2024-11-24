/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { WelcomeDialog } from './components/welcome-dialog'
import { ThemeProvider } from './providers/theme-provider'
import { TooltipProvider } from '@radix-ui/react-tooltip'
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
// Setup Query Client
const queryClient = new QueryClient()

function Root() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme='dark'>
          <TooltipProvider delayDuration={100}>
            <Toaster />
            <WelcomeDialog />
            <RouterProvider router={router} context={{}} />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
