import type { Plugin } from 'vite'

export function setPhotonMeta(): Plugin {
  return {
    name: 'vike-server:set-photon-meta',
    transform(_code, id) {
      if (id.match(/\+middleware\.[jt]s/)) {
        // Forces full-reload when a +middleware file is modified
        return { meta: { photonConfig: { isGlobal: true } } }
      }
    }
  }
}
