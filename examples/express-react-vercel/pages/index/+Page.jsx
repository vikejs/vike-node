export default Page

import React from 'react'

function Page() {
  return (
    <>
      <h1>Pre-rendered</h1>
      This page is pre-rendered to HTML at {new Date().toLocaleString('en')}.
    </>
  )
}
