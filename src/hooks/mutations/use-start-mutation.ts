import { DefaultError, useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query'
import { Stage } from '@/types/ban-order.types'

type StartVetoProps = {
  stages: Stage[]
  maps: string[]
  rounds: number
  game: string
}
type StartVetoResponse = {
  id: string
  creatorToken: string
}
type StartVetoMutationOpts = UseMutationOptions<StartVetoResponse, DefaultError, StartVetoProps>
type StartVetoMutation = UseMutationResult<StartVetoResponse, DefaultError, StartVetoProps>
export const useStartVetoMutation = (opts?: StartVetoMutationOpts): StartVetoMutation =>
  useMutation({
    ...opts,
    mutationFn: async (props) => {
      const res = await fetch('/api/veto/start', {
        method: 'POST',
        body: JSON.stringify(props)
      })
      if (!res.ok) {
        throw new Error('Failed to start veto')
      }

      return res.json()
    }
  })
