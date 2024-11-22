import { useState } from 'react'

export function useRerender() {
  const [, setRerender] = useState(false)
  return () => setRerender((prev) => !prev)
}
