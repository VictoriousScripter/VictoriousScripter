export interface PageInfo {
  type: 'PAGE_INFO'
  url: string
  title: string
  html: string
  text: string
  links: Array<{ text: string; href: string }>
  buttons: Array<{ text: string; id: string; className: string }>
  inputs: Array<{ type: string; name: string; id: string; placeholder: string; value: string }>
}

export interface AgentAction {
  action: string
  selector?: string | null
  description?: string
  text?: string
  clear?: boolean
  direction?: string
  amount?: number
  url?: string
  dataType?: string
  reason?: string
  duration?: number
  focus?: string | null
  status?: 'starting' | 'in_progress' | 'completed' | 'error' | 'waiting_for_user'
  message?: string
  percentComplete?: number | null
  summary?: string
  results?: string | null
  success: boolean
}

export interface MousePosition {
  x: number
  y: number
  visible: boolean
  clicking: boolean
}

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed'

export interface BrowserState {
  url: string
  isLoading: boolean
  error: string | null
  pageInfo: PageInfo | null
}
