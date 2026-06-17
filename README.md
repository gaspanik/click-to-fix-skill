# click-to-fix — Visual Browser Editing Skill

A Claude Code skill that lets you click anywhere in the browser to send edit instructions directly to Claude — no browser extension required.

---

## What this is

`click-to-fix` is a slash command skill for Claude Code that:

1. **Injects a visual overlay** into your running dev server page
2. **Captures clicks** — click any element, type your instruction, hit Send
3. **Routes instructions via a local server** — no clipboard, no copy-paste, no browser extension
4. **Claude reads and implements** the change immediately

```
Click on element  →  Type instruction  →  Send  →  Claude implements
```

---

## How it differs from browser-extension-based approaches

Most visual editing tools for Claude Code rely on the **Claude in Chrome** browser extension, which only connects when using Claude Desktop's chat UI. This skill works without any extension — via a tiny local HTTP server that bridges the browser and Claude.

| | click-to-fix | Claude in Chrome |
|---|---|---|
| VS Code extension | ✅ | ❌ |
| Claude Desktop | ✅ | ✅ |
| Terminal Claude Code | ✅ | ❌ |
| Framework-agnostic | ✅ | ✅ |

---

## Supported environments

| Claude Interface | Framework |
|---|---|
| VS Code extension | Astro |
| Claude Desktop | Vite |
| Terminal Claude Code | Next.js / React |

**OS:** macOS / Linux only — Windows is not supported (path resolution and process management rely on Unix commands).

**OS:** macOS / Linux のみ対応。Windows は非対応（パス解決とプロセス管理に Unix コマンドを使用しています）。

**Project type:** npm-based projects with a `package.json` and a running dev server. Plain HTML files without a dev server are not supported.

**プロジェクト:** `package.json` があり、dev サーバーが起動できる npm プロジェクトが対象です。dev サーバーなしの純粋な HTML ファイルは非対応です。

**Prerequisite:** Node.js must be installed (standard in any dev environment).

**前提条件:** Node.js がインストールされていること（通常の開発環境であれば標準で入っています）。

---

## Repo structure

```
skills/
  click-to-fix/
    SKILL.md                        — skill definition loaded by Claude Code
    scripts/
      server.js                     — local HTTP server (Node.js, no dependencies)
      __click-to-fix-overlay.js     — browser overlay injected into the dev page
```

---

## Getting started

**1. Clone this repo**

```bash
git clone https://github.com/gaspanik/click-to-fix-skill
```

**2. Install the skill into Claude Code**

```bash
cp -r skills/click-to-fix ~/.claude/skills/
```

**3. Run the skill**

```
/click-to-fix
```

Natural language trigger phrases also work:

```
クリックして修正
ブラウザで修正
ブラウザで編集
visual edit
```

---

## What happens when you run it

1. **CSS check** — detects whether the project uses Tailwind or original CSS; warns upfront if original CSS is detected, since changes to shared selectors may affect other elements
2. **Dev server check** — verifies your dev server is running (starts it if not)
3. **Local server start** — launches `server.js` on `127.0.0.1:47753`
3. **Overlay deploy** — copies the overlay script to your project's static directory
4. **Script tag inject** — adds a `<script>` tag to your HTML layout file
5. **Edit loop** — you click, type, send; Claude reads and implements; repeat
6. **Cleanup** — on "編集終了", removes the script tag, overlay file, temp file, and stops the server

---

## Notes on Astro projects

Astro requires `is:inline` on script tags that reference `public/` assets, otherwise the build fails. The skill handles this automatically.

```html
<!-- Astro -->
<script is:inline src="/__click-to-fix-overlay.js"></script>

<!-- Other frameworks -->
<script src="/__click-to-fix-overlay.js"></script>
```

---

## Security

- The local server binds to `127.0.0.1` only — not reachable from external networks
- CORS restricted to `localhost` / `127.0.0.1` origins
- Writes only to `/tmp/`
- Uses Node.js standard library only — no `npm install` needed

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Overlay button doesn't appear | Reload the page after the skill adds the script tag |
| "サーバーに接続できません" in popup | The local server isn't running — re-run Step 2 |
| Port 47753 already in use | `lsof -ti:47753 \| xargs kill -9` then restart the server |

---

Built by Masaaki Komori - [@cipher](https://x.com/cipher) · Skill for [Claude Code](https://claude.ai/code)
