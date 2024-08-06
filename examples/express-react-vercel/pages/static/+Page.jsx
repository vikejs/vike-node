export default Page

import React, { useState } from 'react'

function Page() {
  return (
    <>
      <h1>Welcome</h1>
      This page is:
      <ul>
        <li>Pre-rendered</li>
        <li>Static html generated</li>
        <li>Not interactive (no javascript is downloaded for this page)</li>
      </ul>
      <Counter />
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
