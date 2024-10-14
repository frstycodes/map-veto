import { convexAuth } from '@convex-dev/auth/server'
import Discord from '@auth/core/providers/discord'

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Discord],
})
