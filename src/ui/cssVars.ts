/** The CSS custom properties that the screens set inline. */
declare module 'react' {
  interface CSSProperties {
    /** A player colour, which the mockup styles read. */
    '--pc'?: string
    /** The height of the in-game top bar. The reaction window opens under it. */
    '--top-h'?: string
    /** The width of the side column of a two-column screen. */
    '--side'?: string
  }
}

export {}
