/** Vite `?url` imports resolve to the emitted asset's public path. */
declare module '*?url' {
  const src: string;
  export default src;
}
