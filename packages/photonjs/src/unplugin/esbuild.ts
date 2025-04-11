import { createEsbuildPlugin } from 'unplugin'
import { virtualApplyFactory } from './virtualApply.js'

export default createEsbuildPlugin(virtualApplyFactory)
