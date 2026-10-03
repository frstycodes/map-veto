import { createIcon } from 'reicon-react/createIcon'

// Reicon ships no weapon icons; drawn on its 24px grid with its 1.5px stroke so it sits in the set
const BLADE = 'M4 4L6.5 4.5L16 14L14 16L4.5 6.5Z'
const HILT =
  '<path d="M12 18L18 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '<path d="M16.5 16.5L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
  '<circle cx="20" cy="20" r="1.25" stroke="currentColor" stroke-width="1.5"/>'

export const Sword = createIcon('Sword', {
  O: `<path d="${BLADE}" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>${HILT}`,
  F: `<path d="${BLADE}" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>${HILT}`
})
