/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { ThemeProvider } from './providers/theme-provider'
import { createRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen'
import { StrictMode } from 'react'
import './index.css'

const queryClient = new QueryClient()

//region Router Setup
const router = createRouter({ routeTree, context: {} })
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function Root() {
  return (
    <StrictMode>
      <ThemeProvider defaultTheme='dark'>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} context={{}} />
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
