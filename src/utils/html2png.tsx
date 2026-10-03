import { getFontEmbedCSS, toPng } from 'html-to-image'

type PngOptions = {
  name: string
  scale: number
}
export default async function convertToPng(
  ref: React.RefObject<HTMLElement | null>,
  options: Partial<PngOptions> = {
    name: 'image',
    scale: 2
  }
) {
  if (!ref.current) return

  const element = ref.current

  const fontEmbedCSS = await getFontEmbedCSS(element)

  toPng(element, {
    pixelRatio: options.scale,
    fontEmbedCSS
  }).then((dataUrl) => {
    const link = document.createElement('a')
    link.download = options.name + '.png'
    link.href = dataUrl
    link.click()
  })
}
