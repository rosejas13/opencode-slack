# opencode-slack

Interact with opencode from anywhere via Slack. DM or @mention the bot, and it invokes opencode on your machine, returning the response in-thread.

## How It Works

```
Slack DM → @slack/bolt (Socket Mode) → opencode run --format json → Slack reply
```

The bot runs on your machine (or a server) and connects to Slack via Socket Mode — no public URL required.

## Setup

### 1. Create a Slack App

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**
2. Name it `opencode` and pick your workspace
3. Go to **Socket Mode** → toggle **Enable Socket Mode**
4. Note the **App-Level Token** (starts with `xapp-`)
5. Go to **OAuth & Permissions** → add these **Bot Token Scopes**:
   - `app_mentions:read`
   - `chat:write`
   - `im:history`
   - `im:read`
   - `reactions:write`
6. Install to workspace and copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 2. Find Your Slack User ID

1. In Slack, click your profile picture → **Profile**
2. Click **...** → **Copy member ID**
3. This is your `ALLOWED_USER_ID`

### 3. Configure the Bot

```bash
cp .env.example .env
```

Fill in `.env`:
```env
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token
ALLOWED_USER_ID=U12345678
```

### 4. Run

```bash
npm run dev
```

### 5. Use

- **DM the bot**: Type any message in the bot's DM channel
- **@mention**: @opencode in any channel

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SLACK_BOT_TOKEN` | required | Bot User OAuth Token (`xoxb-...`) |
| `SLACK_APP_TOKEN` | required | App-Level Token for Socket Mode (`xapp-...`) |
| `ALLOWED_USER_ID` | required | Your Slack user ID (only you can invoke) |
| `OPENCODE_PATH` | `/home/rosejas/.opencode/bin/opencode` | Path to opencode binary |
| `OPENCODE_WORKDIR` | `/home/rosejas/Projects` | Working directory for opencode |
| `OPENCODE_MODEL` | (default) | Model to use (provider/model format) |
| `OPENCODE_AGENT` | (default) | Agent to use |
| `MAX_RESPONSE_LENGTH` | `3000` | Max chars before truncating in Slack |
| `SHOW_THINKING` | `false` | Show thinking blocks in response |
| `OPENCODE_TIMEOUT_MS` | `300000` | Timeout in ms (5 min default) |
