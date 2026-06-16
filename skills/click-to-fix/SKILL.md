---
name: click-to-fix
description: Visual editing skill that requires no browser extension. Click anywhere in the browser to enter edit instructions, which are sent via a local server, saved to a file, and read by Claude for implementation. Works with any Claude interface (VS Code, Claude Desktop, terminal) and any framework (Astro, Vite, HTML, etc.). Trigger phrases: "click-to-fix", "クリックして修正", "ブラウザで修正", "ブラウザで編集", "visual edit". Cleanup phrase: "編集終了".
---

## Overview

A browser-extension-free visual editing skill.

- The overlay sends instructions via `POST http://127.0.0.1:47753/instruction`
- The bundled local server writes them to `/tmp/__click-to-fix-instruction.json`
- Claude reads the file with the Read tool and implements the change

## Supported Environments

Works with any combination below — no browser extension required:

| Claude Interface | Framework |
|---|---|
| VS Code extension | Astro |
| Claude Desktop | Vite |
| Terminal Claude Code | Next.js / React |
| | Plain HTML |

**Prerequisite:** Node.js must be installed (standard in any dev environment).

## Flow

### Step 1: Check / start the dev server

Check `package.json` scripts or the project config file to identify the port.

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>
```

- Returns 200 → already running, leave it as-is
- Not running → start it: `npm run dev &` (or equivalent)

### Step 2: Start the click-to-fix server

```bash
# Check if already running
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:47753/instruction 2>/dev/null || echo "not running"
```

If not running:

```bash
node ~/.claude/skills/click-to-fix/scripts/server.js &
```

Verify startup (after 1 second):

```bash
sleep 1 && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:47753/instruction
```

A 404 response means the server is running correctly (the endpoint only accepts POST).

### Step 3: Deploy the overlay script

Copy to the project's static file directory (typically `public/` in most frameworks):

```bash
cp ~/.claude/skills/click-to-fix/scripts/__click-to-fix-overlay.js <project>/<static-dir>/__click-to-fix-overlay.js
```

### Step 4: Add the script tag to HTML

**Standard HTML / Vite:**
```html
<!-- __CLICK_TO_FIX_START__ -->
<script src="/__click-to-fix-overlay.js"></script>
<!-- __CLICK_TO_FIX_END__ -->
```

**Astro (`is:inline` required):**
```html
<!-- __CLICK_TO_FIX_START__ -->
<script is:inline src="/__click-to-fix-overlay.js"></script>
<!-- __CLICK_TO_FIX_END__ -->
```

Place just before `</head>` or `</body>`.

### Step 5: Guide the user

```
準備完了です。

使い方：
1. ブラウザ右下の「✦ 修正モード ON」をクリック
2. 修正したい場所をクリック → 指示を入力 → 「送信」
3. ポップアップに「✓ 送信しました」と表示されたら、ここで「送信した」と教えてください
4. 修正後は自動で次の指示を受け付けます
5. 終わったら「編集終了」と言ってください
```

### Step 6: Read the instruction and implement

When the user says "送信した" (or similar):

1. Read the instruction file:

```
Read /tmp/__click-to-fix-instruction.json
```

2. Extract `instruction`, `x`, `y`, `element` and implement the change.
3. Reply concisely: "〇〇を修正しました。次の指示をどうぞ（終わる場合は「編集終了」）"

### Step 7: Finish editing (cleanup)

When the user says "編集終了" (or similar):

1. Remove the script block from HTML using the Edit tool (`<!-- __CLICK_TO_FIX_START__ -->` to `<!-- __CLICK_TO_FIX_END__ -->`).
2. Delete the overlay script from the static directory:

```bash
rm <project>/<static-dir>/__click-to-fix-overlay.js
```

3. Delete the temp file:

```bash
rm -f /tmp/__click-to-fix-instruction.json
```

4. Stop the click-to-fix server:

```bash
lsof -ti:47753 | xargs kill
```

## Security

- Server binds to `127.0.0.1` (loopback) only — not accessible from external networks
- CORS restricted to `localhost` / `127.0.0.1` origins
- Writes only to `/tmp/`
- Uses Node.js standard library only — no `npm install` needed

## Troubleshooting

### Popup shows "サーバーに接続できません"

The server is not running. Repeat Step 2.

### Port conflict (server already running on 47753)

```bash
lsof -ti:47753 | xargs kill -9
node ~/.claude/skills/click-to-fix/scripts/server.js &
```
