/// <reference types="vite/client" />

declare type Result<E extends Error, T> = [E, null] | [null, T]

declare type El<T extends React.ELementType> = T extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[T]
  : T extends keyof SVGElementTagNameMap
    ? SVGElementTagNameMap[T]
    : T extends 'svg'
      ? SVGSVGElement
      : HTMLElement

type EventHandlerKeys<TElement extends Element = HTMLElement> = {
  [K in keyof React.DOMAttributes<TElement>]: K extends `on${string}` ? K : never
}[keyof React.DOMAttributes<TElement>]

type DOMAttributeEventHandlers<TElement extends Element = HTMLElement> = {
  [K in EventHandlerKeys<TElement>]: React.DOMAttributes<TElement>[K]
}

/**
 * Extract the event type from an element attribute key and element type.
 * @template TEvent - The event key.
 * @template TElement - The element type.
 * @example
 * const handleClick: EvHandler<TEvent, TElement> = (e) => {
 *  // e: React.MouseEvent<HTMLButtonElement>
 * }
 */
declare type EvHandler<
  TEvent extends EventHandlerKeys<TElement>,
  TElement extends React.ElementType = HTMLElement
> = DOMAttributeEventHandlers<El<TElement>>[TEvent]

/**
 * Extract the event type from an element attribute key and element type.
 * @template TEvent - The event key.
 * @template TElement - The element type.
 * @example
 * const handleClick = (e: Ev<'onClick', 'button'>) => {
 *  // e: React.MouseEvent<HTMLButtonElement>
 * }
 */
declare type Ev<
  TEvent extends EventHandlerKeys<TElement>,
  TElement extends React.ElementType = HTMLElement
> = Parameters<EvHandler<TEvent, TElement>>[0]
