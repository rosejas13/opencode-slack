import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })

export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''
export const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN || ''
export const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || ''

export const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID || ''

export const OPENCODE_PATH = process.env.OPENCODE_PATH || '/home/rosejas/.opencode/bin/opencode'
export const OPENCODE_WORKDIR = process.env.OPENCODE_WORKDIR || '/home/rosejas/Projects'
export const OPENCODE_MODEL = process.env.OPENCODE_MODEL || ''
export const OPENCODE_AGENT = process.env.OPENCODE_AGENT || ''

export const MAX_RESPONSE_LENGTH = parseInt(process.env.MAX_RESPONSE_LENGTH || '3000', 10)
export const SHOW_THINKING = process.env.SHOW_THINKING === 'true'

export const OPENCODE_TIMEOUT_MS = parseInt(process.env.OPENCODE_TIMEOUT_MS || '300000', 10)

export function validate(): string[] {
  const missing: string[] = []
  if (!SLACK_BOT_TOKEN || SLACK_BOT_TOKEN === 'xoxb-...') missing.push('SLACK_BOT_TOKEN')
  if (!SLACK_APP_TOKEN || SLACK_APP_TOKEN === 'xapp-...') missing.push('SLACK_APP_TOKEN')
  if (!ALLOWED_USER_ID || ALLOWED_USER_ID === 'U...') missing.push('ALLOWED_USER_ID')
  return missing
}
