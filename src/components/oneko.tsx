import { AppStore } from '@/state/app-store'
import { useEffect } from 'react'

export function OnekoCat() {
  const { onekoEnabled: enabled } = AppStore.useStore('onekoEnabled')

  useEffect(() => {
    if (!enabled) return removeOneko()
    addOneko()
    return removeOneko
  }, [enabled])

  return null
}

function addOneko() {
  const script = document.createElement('script')
  script.src = '/oneko/oneko.js'
  script.setAttribute('id', 'oneko-script')
  script.async = true
  document.body.appendChild(script)
}

function removeOneko() {
  const script = document.getElementById('oneko-script')
  if (script) document.body.removeChild(script)

  const oneko = document.getElementById('oneko')
  if (oneko) document.body.removeChild(oneko)
}
