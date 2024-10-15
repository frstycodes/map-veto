/* eslint-disable react-refresh/only-export-components */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ThemeProvider } from './providers/theme-provider'
import { ConvexReactClient } from 'convex/react'
import { createRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen'
import { StrictMode } from 'react'
import './index.css'

//region Convex Setup
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
const convexQueryClient = new ConvexQueryClient(convex)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn()
    }
  }
})
convexQueryClient.connect(queryClient)

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
        <ConvexAuthProvider client={convex}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} context={{}} />
          </QueryClientProvider>
        </ConvexAuthProvider>
      </ThemeProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
