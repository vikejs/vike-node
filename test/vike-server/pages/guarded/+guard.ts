import { redirect } from 'vike/abort'

export default function guard() {
  throw redirect('/')
}
