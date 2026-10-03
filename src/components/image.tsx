import { getImageNameAndExtFromPath, isRemoteImage } from '@/utils/image'
import { motion } from 'framer-motion'
import { ComponentProps } from 'react'

type MotionImage = typeof motion.img

type SrcSet = Record<number, number> // { imageSize: screenWidth }
type ImageProps<T extends boolean> = Omit<ComponentProps<T extends true ? MotionImage : 'img'>, 'srcSet'> & {
  src: string
  srcSet: SrcSet
  asMotion?: T
}

/**
 *
 * @param {[number,number]} setSizes - A tuple where left determines the image size and right determines the screen width
 */
export function Image<T extends boolean>({ src, srcSet, asMotion, ...props }: ImageProps<T>) {
  const Comp = asMotion ? motion.img : 'img'

  // No sized variants exist yet; crossOrigin keeps the WebGL ripple and PNG export from tainting
  // @ts-expect-error - Same generic props as below
  if (isRemoteImage(src)) return <Comp src={src} crossOrigin='anonymous' {...props} />

  const { name, ext } = getImageNameAndExtFromPath(src)
  const _srcSet = Object.entries(srcSet)
    .map(([imageSize, screenWidth]) => {
      return `/optimized/${name}-${imageSize}w.${ext} ${screenWidth}w`
    })
    .join(', ')

  // Only sized variants exist in /optimized, so src must name one: srcset-unaware consumers
  // (html-to-image's PNG export) fetch src directly and fail on the bare name
  const largest = Math.max(...Object.keys(srcSet).map(Number))
  const fallbackSrc = `/optimized/${name}-${largest}w.${ext}`

  // @ts-expect-error - Don't complain now, I already used generics for you!!
  return <Comp src={fallbackSrc} srcSet={_srcSet} {...props} />
}
