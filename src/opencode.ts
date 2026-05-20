import { spawn, type ChildProcess } from 'child_process'
import { OPENCODE_PATH, OPENCODE_WORKDIR, OPENCODE_MODEL, OPENCODE_AGENT, OPENCODE_TIMEOUT_MS } from './config'

export interface OpenCodeEvent {
  type: string
  content?: string
  message?: string
  text?: string
  role?: string
  tool_calls?: unknown[]
  tool_results?: unknown[]
  [key: string]: unknown
}

export interface OpenCodeResult {
  response: string
  thinking: string[]
  toolUses: string[]
  error: string | null
  durationMs: number
}

export function buildOpenCodeArgs(message: string): string[] {
  const args: string[] = ['run', '--format', 'json']

  if (OPENCODE_MODEL) {
    args.push('--model', OPENCODE_MODEL)
  }
  if (OPENCODE_AGENT) {
    args.push('--agent', OPENCODE_AGENT)
  }

  args.push(message)
  return args
}

function parseEvent(line: string): OpenCodeEvent | null {
  try {
    return JSON.parse(line.trim())
  } catch {
    return null
  }
}

function extractResponse(events: OpenCodeEvent[]): OpenCodeResult {
  const thinking: string[] = []
  const toolUses: string[] = []
  let finalResponse = ''

  for (const ev of events) {
    if (ev.type === 'thinking' || ev.type === 'reasoning') {
      const content = ev.content || ev.text || ''
      if (content) thinking.push(content)
    }

    if (ev.type === 'tool_use' || ev.type === 'tool_call') {
      const name = (ev as Record<string, unknown>).tool_name || (ev as Record<string, unknown>).name || 'unknown'
      toolUses.push(`\`${name}\``)
    }

    if (ev.type === 'message' || ev.role === 'assistant' || ev.type === 'response') {
      const text = ev.content || ev.message || ev.text || ''
      if (text) finalResponse += text
    }

    if (ev.type === 'assistant' && !finalResponse) {
      const text = ev.content || ev.message || ev.text || ''
      if (text) finalResponse = text
    }
  }

  if (!finalResponse && events.length > 0) {
    const last = events[events.length - 1]
    finalResponse = last.content || last.message || last.text || JSON.stringify(last)
  }

  return {
    response: finalResponse || 'No response from opencode.',
    thinking,
    toolUses,
    error: null,
    durationMs: 0,
  }
}

function spawnOpenCode(message: string): { child: ChildProcess; startMs: number } {
  const startMs = Date.now()
  const args = buildOpenCodeArgs(message)
  const env = {
    ...process.env,
    HOME: process.env.HOME,
    PATH: process.env.PATH,
    OPENCODE_WORKDIR,
  }

  const child = spawn(OPENCODE_PATH, args, {
    cwd: OPENCODE_WORKDIR,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  child.stdin?.end()

  return { child, startMs }
}

export async function runOpenCode(message: string): Promise<OpenCodeResult> {
  return new Promise((resolve) => {
    const { child, startMs } = spawnOpenCode(message)

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, OPENCODE_TIMEOUT_MS)

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk.toString())
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk.toString())
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      const durationMs = Date.now() - startMs

      if (timedOut) {
        resolve({
          response: '',
          thinking: [],
          toolUses: [],
          error: `opencode timed out after ${OPENCODE_TIMEOUT_MS / 1000}s.`,
          durationMs,
        })
        return
      }

      if (code !== 0 && code !== null) {
        const stderr = stderrChunks.join('')
        resolve({
          response: '',
          thinking: [],
          toolUses: [],
          error: `opencode exited with code ${code}${stderr ? ': ' + stderr.trim().slice(0, 500) : ''}`,
          durationMs,
        })
        return
      }

      const stdout = stdoutChunks.join('')
      const lines = stdout.split('\n').filter(Boolean)
      const events = lines.map(parseEvent).filter(Boolean) as OpenCodeEvent[]

      const result = extractResponse(events)
      result.durationMs = durationMs
      resolve(result)
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({
        response: '',
        thinking: [],
        toolUses: [],
        error: `Failed to spawn opencode: ${err.message}`,
        durationMs: Date.now() - startMs,
      })
    })
  })
}
