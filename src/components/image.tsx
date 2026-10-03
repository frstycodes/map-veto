import { motion } from 'framer-motion'
import { ComponentProps } from 'react'
import { env } from '@root/env'

type MotionImage = typeof motion.img

type ImageProps<T extends boolean> = Omit<
  ComponentProps<T extends true ? MotionImage : 'img'>,
  'src' | 'srcSet'
> & {
  src: string
  widths: number[]
  /** height / width; crops to cover instead of keeping the source's shape */
  aspect?: number
  asMotion?: T
}

export function Image<T extends boolean>({ src, widths, aspect, asMotion, ...props }: ImageProps<T>) {
  const Comp = asMotion ? motion.img : 'img'
  const srcSet = widths.map((w) => `${resizedUrl(src, w, aspect)} ${w}w`).join(', ')
  // src is for srcset-unaware consumers (html-to-image's PNG export)
  const fallbackSrc = resizedUrl(src, Math.max(...widths), aspect)

  return (
    // @ts-expect-error - Comp is a union the generic props can't narrow
    <Comp src={fallbackSrc} srcSet={srcSet} crossOrigin='anonymous' {...props} />
  )
}

function resizedUrl(src: string, width: number, aspect?: number) {
  const crop = aspect ? `,height=${Math.round(width * aspect)},fit=cover` : ''
  return `${env.VITE_IMAGE_CDN}/width=${width}${crop},format=auto/${src}`
}
