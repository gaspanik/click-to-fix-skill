---
name: click-to-fix
description: >-
  Visual editing skill that requires no browser extension. Click anywhere in the browser to enter edit instructions, which are sent via a local server, saved to a file, and read by Claude for implementation. Works with any Claude interface (VS Code, Claude Desktop, terminal) and any framework (Astro, Vite, HTML, etc.). Trigger phrases: "click-to-fix", "クリックして修正", "ブラウザで修正", "ブラウザで編集", "visual edit". Cleanup phrase: "編集終了".
---

## Overview

A browser-extension-free visual editing skill.

- The overlay sends instructions via `POST http://127.0.0.1:47753/instruction`
- The bundled local server stores them in a temp file (`os.tmpdir()`)
- Claude fetches the instruction via `GET http://127.0.0.1:47753/instruction`

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

### Step 0: Check CSS approach

Check `package.json` and config files (`tailwind.config.*`, `vite.config.*`, etc.) to determine whether the project uses Tailwind CSS or original CSS.

- **Tailwind detected** → proceed normally
- **Original CSS detected** → warn the user upfront:

```
⚠️ このプロジェクトはオリジナルCSSを使用しています。
CSSのクラスやセレクタを変更すると、同じクラスを使っている他の要素にも影響が出る可能性があります。
修正後は意図しない変更が起きていないか確認してください。
```

### Step 1: Check / start the dev server

Check `package.json` scripts or the project config file to identify the port.

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>
```

- Returns 200 → already running, leave it as-is
- Not running → detect the package manager from lockfiles, then start the dev server:

```bash
# Detect package manager
if [ -f "bun.lockb" ] || [ -f "bun.lock" ]; then
  PM="bun"
elif [ -f "pnpm-lock.yaml" ]; then
  PM="pnpm"
elif [ -f "yarn.lock" ]; then
  PM="yarn"
else
  PM="npm"
fi
$PM run dev &
```

### Step 2: Start the click-to-fix server

```bash
# Check if already running
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:47753/instruction 2>/dev/null || echo "not running"
```

If not running, locate the skill scripts directory (project-local takes priority over global):

```bash
SKILL_DIR=".claude/skills/click-to-fix/scripts"
if [ ! -f "$SKILL_DIR/server.js" ]; then
  SKILL_DIR="$HOME/.claude/skills/click-to-fix/scripts"
fi
node "$SKILL_DIR/server.js" &
```

Verify startup (after 1 second):

```bash
sleep 1 && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:47753/instruction
```

A 404 response means the server is running correctly (GET /instruction returns 404 when no instruction has been submitted yet).

### Step 3: Deploy the overlay script

Copy to the project's static file directory (typically `public/` in most frameworks).
Use the same `$SKILL_DIR` resolved in Step 2:

```bash
cp "$SKILL_DIR/__click-to-fix-overlay.js" <project>/<static-dir>/__click-to-fix-overlay.js
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

1. Fetch the instruction from the server:

```bash
curl -s http://127.0.0.1:47753/instruction
```

2. Extract `instruction`, `x`, `y`, `element`, `windowWidth`, `breakpoint`, `scope` and implement the change.

3. **Apply breakpoint-aware changes based on `scope` (Tailwind CSS):**

| scope | Meaning | How to apply in Tailwind |
|-------|---------|--------------------------|
| `all` | All sizes | No prefix (e.g. `text-sm`) |
| `below` | This size and smaller | `max-{bp}:` prefix (e.g. `max-md:text-sm`). When `breakpoint` is `base` (< 640px), use `max-sm:` |
| `exact` | This size only | Apply as `{bp}:new-value {next-bp}:original-value`. **Check the element's existing classes before implementing to determine what value to restore at the next breakpoint** |

**Breakpoint reference (Tailwind defaults):**

| `breakpoint` value | Width | Next breakpoint |
|---|---|---|
| `base` | < 640px | `sm` |
| `sm` | 640–767px | `md` |
| `md` | 768–1023px | `lg` |
| `lg` | 1024–1279px | `xl` |
| `xl` | 1280–1535px | `2xl` |
| `2xl` | ≥ 1536px | (none) |

4. **If the project uses original CSS (not Tailwind):** use media queries instead of Tailwind prefixes.
   - `scope: "below"` → `@media (max-width: {windowWidth}px) { ... }`
   - `scope: "exact"` → `@media (min-width: {currentBpMin}px) and (max-width: {nextBpMin - 1}px) { ... }`
   - Mention that the change may affect other elements sharing the same class or selector.

5. **画像URLが含まれる指示の場合（`http://` / `https://` で始まる画像URL）:**

   URLをそのままコードに埋め込まず、ローカルにダウンロードしてから挿入する。

   **5-1. 画像の保存先を決める**

   フレームワークと既存の慣習に従う：

   | フレームワーク | 優先保存先 | 参照方法 |
   |---|---|---|
   | Astro | `src/assets/` | `import img from '@/assets/xxx.jpg'` → `<Image src={img} alt="..." width={N} height={N} />` （`astro:assets` の `<Image />` コンポーネントを使う） |
   | Vite / React | `src/assets/` | `import img from './assets/xxx.jpg'` → `<img src={img} />` |
   | Plain HTML | `public/` または `assets/` | `<img src="/assets/xxx.jpg" />` |

   **Astro の `<Image />` 使用時の注意:**
   - `import { Image } from 'astro:assets'` をフロントマターに追加する
   - `width` と `height` は必須（元画像のサイズか、表示したいサイズを指定）
   - `alt` も必須

   既存の画像ファイルがどこに置かれているかを `find src public -name "*.jpg" -o -name "*.png" -o -name "*.webp" | head -5` で確認し、同じディレクトリに合わせる。

   **5-2. ダウンロード**

   ```bash
   # ファイル名はURLの末尾から取得。クエリパラメータは除去する
   curl -sL -o <保存先>/<filename>.<ext> "<url>"
   ```

   **5-3. コードへの挿入**

   - **Astro / Vite（`src/assets/` 等）**: フロントマターに `import` を追加し、`src={変数名}` で参照
   - **Plain HTML / `public/`**: `src="/assets/<filename>"` 形式で直接参照

   **5-4. 外部URLは残さない**

   ダウンロード後、元の `http://...` URLがコードに残っていないことを確認する。

6. Reply concisely: "〇〇を修正しました。次の指示をどうぞ（終わる場合は「編集終了」）"

### Step 7: Finish editing (cleanup)

When the user says "編集終了" (or similar):

1. Remove the script block from HTML using the Edit tool (`<!-- __CLICK_TO_FIX_START__ -->` to `<!-- __CLICK_TO_FIX_END__ -->`).
2. Delete the overlay script from the static directory:

```bash
rm <project>/<static-dir>/__click-to-fix-overlay.js
```

3. Stop the click-to-fix server (also deletes the temp file):

```bash
curl -s -X POST http://127.0.0.1:47753/stop 2>/dev/null || true
```

## Security

- Server binds to `127.0.0.1` (loopback) only — not accessible from external networks
- CORS restricted to `localhost` / `127.0.0.1` origins
- Temp file written to `os.tmpdir()` (cross-platform)
- Uses Node.js standard library only — no `npm install` needed
- Edit history is saved to `.claude/click-to-fix-history.jsonl` in the project root — add to `.gitignore` if needed

## Troubleshooting

### Popup shows "サーバーに接続できません"

The server is not running. Repeat Step 2.

### Port conflict (server already running on 47753)

```bash
curl -s -X POST http://127.0.0.1:47753/stop 2>/dev/null || true
SKILL_DIR=".claude/skills/click-to-fix/scripts"
if [ ! -f "$SKILL_DIR/server.js" ]; then
  SKILL_DIR="$HOME/.claude/skills/click-to-fix/scripts"
fi
node "$SKILL_DIR/server.js" &
```
