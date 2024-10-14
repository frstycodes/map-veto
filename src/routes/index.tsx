import { createFileRoute } from '@tanstack/react-router'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { useMutation, useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const countQuery = useQuery(convexQuery(api.counter.getCounter, {}))

  const incrementMutation = useMutation({
    mutationFn: useConvexMutation(api.counter.incrementCounter),
  })

  return (
    <div className='grid place-items-center h-full w-full'>
      <Button
        variant='outline'
        loading={countQuery.isFetching || incrementMutation.isPending}
        onClick={() => incrementMutation.mutate({})}
      >
        Count: {countQuery.data ?? 0}
      </Button>
    </div>
  )
}
