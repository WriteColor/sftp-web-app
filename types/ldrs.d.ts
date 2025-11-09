declare namespace JSX {
  interface IntrinsicElements {
    "l-line-spinner": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        size?: string
        stroke?: string
        speed?: string
        color?: string
      },
      HTMLElement
    >
  }
}
