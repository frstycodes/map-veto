import { getImageNameAndExtFromPath } from '@/utils/image'
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
  const { name, ext } = getImageNameAndExtFromPath(src)
  const _srcSet = Object.entries(srcSet)
    .map(([imageSize, screenWidth]) => {
      return `/optimized/${name}-${imageSize}w.${ext} ${screenWidth}w`
    })
    .join(', ')

  const Comp = asMotion ? motion.img : 'img'

  // @ts-expect-error - Don't complain now, I already used generics for you!!
  return <Comp src={src} srcSet={_srcSet} {...props} />
}
