import { createSlackApp } from './slack-bot'

async function main() {
  const app = createSlackApp()

  await app.start()
  console.log('opencode-slack is running. DM or @mention the bot to interact with opencode.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
