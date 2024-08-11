// https://vike.dev/render-modes#html-only

export default {
  prerender: true,
  meta: {
    Page: {
      env: { server: true, client: false }
    }
  }
}
