import { ComponentProps } from 'react'

type SvgProps = ComponentProps<'div'> & {
  svg: string
}

export function Svg({ svg, ...props }: SvgProps) {
  return <div dangerouslySetInnerHTML={{ __html: svg }} {...props} />
}
