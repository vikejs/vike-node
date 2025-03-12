export default Page

import type { Todo } from '@prisma/client'
import React, { useState } from 'react'
import { TodoList } from './TodoList'

function Page({ todoItemsInitial, xRuntime }: { todoItemsInitial: Todo[]; xRuntime?: string }) {
  return (
    <>
      <h1>To-do List</h1>
      <TodoList todoItemsInitial={todoItemsInitial} />
      <Counter />
      {xRuntime}
    </>
  )
}

function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      This page is interactive:
      <button type="button" onClick={() => setCount((count) => count + 1)}>
        Counter {count}
      </button>
    </div>
  )
}
