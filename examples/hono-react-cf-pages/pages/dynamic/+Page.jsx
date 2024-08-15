export default Page

import React, { useState } from 'react'
import { useData } from 'vike-react/useData'
import { getHello } from './page.telefunc'

function Page() {
  const data = useData()

  return (
    <>
      <h1>Welcome</h1>
      This page is:
      <ul>
        <li>Dynamic</li>
        <li>No static html generated</li>
        <li>Interactive</li>
        <li>Server Rendered at: {data.d}</li>
      </ul>
      <Counter />
      <TelefuncTest />
    </>
  )
}

function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Counter {count}
    </button>
  )
}

function TelefuncTest() {
  const [response, setResponse] = useState()
  return (
    <button type="button" onClick={() => getHello().then(setResponse)}>
      Call telefunc {response}
    </button>
  )
}
