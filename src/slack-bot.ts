import { App } from '@slack/bolt'
import {
  SLACK_BOT_TOKEN,
  SLACK_APP_TOKEN,
  ALLOWED_USER_ID,
  MAX_RESPONSE_LENGTH,
  SHOW_THINKING,
  validate,
} from './config'
import { runOpenCode } from './opencode'

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}

function formatThinking(blocks: string[]): string {
  if (!blocks.length) return ''
  const truncated = blocks.map(b => truncate(b, 500)).join('\n\n')
  return `*Thinking:*\n\`\`\`${truncated}\`\`\`\n`
}

function formatToolUses(tools: string[]): string {
  if (!tools.length) return ''
  return `*Tools used:* ${tools.join(', ')}\n\n`
}

function buildSlackBlocks(text: string, thinking: string[], tools: string[]): unknown[] {
  const blocks: unknown[] = []

  const toolText = formatToolUses(tools)
  const thinkingText = SHOW_THINKING ? formatThinking(thinking) : ''

  const body = truncate(text, MAX_RESPONSE_LENGTH)

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${thinkingText}${toolText}${body}`,
    },
  })

  if (text.length > MAX_RESPONSE_LENGTH) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_Response truncated (${text.length} chars total)._`,
        },
      ],
    })
  }

  return blocks
}

async function handleMessage(
  text: string,
  userId: string,
  channel: string,
  threadTs: string,
  say: (msg: Record<string, unknown>) => Promise<unknown>,
  client: { reactions: { add: (args: Record<string, string>) => Promise<unknown> } },
) {
  if (userId !== ALLOWED_USER_ID) {
    await say({ text: 'Only an authorized user can interact with this bot.', thread_ts: threadTs })
    return
  }

  const userMessage = text
    .replace(/<@[^>]+>/g, '')
    .trim()

  if (!userMessage) {
    await say({ text: 'What would you like me to do?', thread_ts: threadTs })
    return
  }

  try {
    await client.reactions.add({ channel, name: 'eyes', timestamp: threadTs })

    const result = await runOpenCode(userMessage)

    if (result.error) {
      await say({ text: `Error: ${result.error}`, thread_ts: threadTs })
      return
    }

    const responseText = result.response || 'Done (no output).'
    const blocks = buildSlackBlocks(responseText, result.thinking, result.toolUses)

    await say({
      blocks,
      text: truncate(responseText, 300),
      thread_ts: threadTs,
      mrkdwn: true,
    })
  } catch (err: unknown) {
    await say({
      text: `Internal error: ${err instanceof Error ? err.message : String(err)}`,
      thread_ts: threadTs,
    })
  }
}

export function createSlackApp(): App {
  const missing = validate()
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    console.error('Copy .env.example to .env and fill in the values.')
    process.exit(1)
  }

  const app = new App({
    token: SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: SLACK_APP_TOKEN,
  })

  app.event('app_mention', async ({ event, say, client }) => {
    if (event.subtype) return
    const raw = event as unknown as Record<string, unknown>
    await handleMessage(
      (event.text || '') as string,
      (event.user || raw.user) as string,
      event.channel,
      event.ts,
      (msg) => say(msg as Parameters<typeof say>[0]),
      client as unknown as { reactions: { add: (args: Record<string, string>) => Promise<unknown> } },
    )
  })

  app.event('message', async ({ event, say, client }) => {
    if (event.subtype) return
    const raw = event as unknown as Record<string, unknown>
    if (raw.channel_type !== 'im') return
    await handleMessage(
      (raw.text as string) || '',
      raw.user as string,
      raw.channel as string,
      raw.ts as string,
      (msg) => say(msg as Parameters<typeof say>[0]),
      client as unknown as { reactions: { add: (args: Record<string, string>) => Promise<unknown> } },
    )
  })

  return app
}
