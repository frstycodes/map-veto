import { DefaultError, useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query'
import { BanOrder } from '@/types/ban-order.types'

type StartVetoProps = {
  banOrders: BanOrder[]
  maps: string[]
  rounds: number
  game: string
}
type StartVetoMutationOpts = UseMutationOptions<{ id: string }, DefaultError, StartVetoProps>
type StartVetoMutation = UseMutationResult<{ id: string }, DefaultError, StartVetoProps>
export const useStartVetoMutation = (opts?: StartVetoMutationOpts): StartVetoMutation =>
  useMutation({
    ...opts,
    mutationFn: async (props) => {
      const res = await fetch('/api/veto/start', {
        method: 'POST',
        body: JSON.stringify(props)
      })
      return res.json()
    }
  })
