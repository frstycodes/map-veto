import { getImageNameAndExtFromPath } from '@/utils/image'
import { motion } from 'framer-motion'
import { ComponentProps } from 'react'

type SetSize = {
  imageSize: number
  screenWidth: number
}

type ImageProps<T extends boolean> = ComponentProps<T extends true ? typeof motion.img : 'img'> & {
  src: string
  setSizes: (SetSize | number)[]
  asMotion?: T
}

/**
 *
 * @param {[number,number]} setSizes - A tuple where left determines the image size and right determines the screen width
 */
export function Image<T extends boolean>({ src, setSizes, asMotion, ...props }: ImageProps<T>) {
  const { name, ext } = getImageNameAndExtFromPath(src)
  const srcSet = setSizes
    .map((size) => {
      let imageSize: number, screenWidth: number

      if (typeof size == 'number') {
        imageSize = size
        screenWidth = size
      } else {
        imageSize = size.imageSize
        screenWidth = size.screenWidth
      }

      return `/optimized/${name}-${imageSize}w.${ext} ${screenWidth}w`
    })
    .join(', ')

  const Comp = asMotion ? motion.img : 'img'

  // @ts-expect-error - Don't complain now, I already used generics for you!!
  return <Comp src={src} srcSet={srcSet} {...props} />
}
