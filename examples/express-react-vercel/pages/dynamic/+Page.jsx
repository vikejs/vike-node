export default Page

import React from 'react'

function Page() {
  return (
    <>
      <h1>Dynamic</h1>
      This page is rendered to HTML at {new Date().toLocaleString('en')}.
    </>
  )
}
