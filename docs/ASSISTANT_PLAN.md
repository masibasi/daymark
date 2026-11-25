# Daymark for AI assistants — plan

Drafted 2026-11-24 at the owner's request. Status: **approved in principle 2026-11-24; D1–D4 decided, D5 (license) open.** Nothing here is built yet.

## 1. Goal

While talking to an AI assistant (ChatGPT, Claude, Claude Code, Codex) or from the owner's own scheduler on the M1 server, the person can say "add this to my Daymark" and a normal Daymark Task appears on their account within a minute. It should work for any Daymark user, not just the owner, and the integration code should be open source.

Out of scope: calendar write-back, time-blocking, anything that deletes data, assistants reading calendar feeds.

## 2. What fits the product rules

- The assistant creates **Tasks only**: a dated Task, or an undated step in a folder. It never creates a CalendarEvent or a TimeBlock. Time-blocking is paused, so "3pm meeting" becomes a Task on that day, not a block at 3pm.
- An explicit request ("add this as a todo") is the user creating a Task through another input. It does not break "external events never automatically become Tasks". A scheduler that turns every email into a Task without being asked would break the spirit of that rule. So automated sources go to an **Inbox folder** (section 7, D1), where nothing reaches a day until the person moves it there.
- Every assistant-made Task carries a quiet, brand-free source line in the same style as the existing folder source label: "Added from a chat" / "대화에서 추가" for MCP, "Added automatically" / "자동으로 추가" for REST tokens (scheduler, scripts). No assistant names, badges or notifications.
- The app must still work signed out. The integration needs an account, because the server can only reach synced data.

## 3. How it works

```
ChatGPT / claude.ai / Claude Desktop ──OAuth──┐
Claude Code / Codex ──── bearer token ────────┤
M1 scheduler / scripts ─ bearer token ────────┤
                                              ▼
                     Supabase Edge Function `assistant`
                       /mcp      MCP over Streamable HTTP (stateless)
                       /v1/...   the same tools as plain JSON REST
                                              │  validated, user-scoped writes
                                              ▼
                     public.daymark_items  (kind = 'task', …)
                                              │  existing pull: ≤60 s, or on focus
                                              ▼
                     Daymark app (local-first store; nothing else changes)
```

- **One tool core, two surfaces.** MCP serves the assistants. REST serves the scheduler, curl and any future Custom GPT Action. Both call the same functions.
- **No change to the sync model.** The server writes `daymark_items` rows the same way a device would: a full `Task` JSON, `client_updated_at = now()`, an id from the same `task-<time36>-<random>` scheme. Devices pick them up on the next pull. `applyRemoteItems` already validates incoming rows.
- **Shared pure logic.** Id generation, Task construction, `nextOrder`, list/folder name matching, and the `quickAdd` parser move into a dependency-free module that both the app and the Edge Function import. The first spike must confirm that the Supabase bundler includes files outside `supabase/functions/`. If it does not, the module lives in `supabase/functions/_shared/` and the app imports it from there.

## 4. Tools (v1: add and read only)

| Tool | What it does |
|---|---|
| `list_lists` | Active lists (id, name). Lets the assistant choose or ask. |
| `list_folders` | Active folders (id, title, deadline). |
| `list_tasks` | Tasks for a date range (default today, at most 31 days) with done state. Lets the assistant answer "what's on my plate" and avoid duplicates. |
| `add_task` | `title` (≤200 chars), optional `date` (yyyy-MM-dd), `list` (name or id), `folder` (name or id), `request_id`. Returns the created Task and where it landed. |
| `add_tasks` | Up to 20 of the above in one call. |

- **Dates:** the assistant sends an explicit `date`, because it knows the user's "today" better than a UTC server does. A `text` field that goes through the quick-add parser (`내일 #공부 @졸업논문`) is allowed if a `timezone` is also sent.
- **Defaults:** if no list is given, use the folder's list, else the most recently used list, else the first active list. For no date, see D1.
- **Idempotency:** the same `request_id`, or the same title + date + list within 10 minutes, returns the existing Task. This stops assistant retries from creating duplicates.
- **MCP annotations:** read tools are `readOnlyHint`; add tools are `destructiveHint: false`.
- Completing, moving and editing Tasks are left for v2, so prompt injection (for example, an email saying "mark everything done") can only add visible, removable Tasks.

## 5. Auth

Two ways in. Both resolve to one `user_id`, and every query is filtered by it.

1. **Personal access tokens** (phase 1). Settings → "AI assistants" → Create token. The token (`dmk_…`) is shown once and stored as a SHA-256 hash in a new `daymark_tokens` table (`user_id, name, hash, scopes, created_at, last_used_at, revoked_at`, RLS limited to the owner). The token list shows names and last use, and each token can be revoked. These tokens work in Claude Code (`claude mcp add --transport http … --header "Authorization: Bearer …"`), Codex (`config.toml` with `bearer_token_env_var`), the M1 scheduler and curl. The function checks the hash with the service role key and then writes rows with an explicit `user_id`. That code path skips RLS, so it gets a dedicated cross-user test.
2. **OAuth** (phase 2), which ChatGPT and claude.ai custom connectors need. This uses Supabase Auth's OAuth 2.1 server (public beta since 2025-11), which supports MCP discovery and dynamic client registration. Daymark hosts a consent screen route (for example `/connect`; route names must not start with `daymark`) that shows "ChatGPT wants to add and read your Daymark tasks · Allow / Deny". The function verifies the Supabase-issued JWT. `offline_access` and refresh tokens must work, or ChatGPT will drop the connection. Being in beta is a real risk, so phase 2 starts with a spike.

Limits: 120 writes per user per hour and 20 per call; titles are trimmed and control characters stripped. Errors never reveal whether another user's ids exist.

## 6. Phases

Each phase ends verified (typecheck, web export, browser at 375 and 1280 px, end-to-end test), is committed, and is pushed.

**Phase 0: decisions and spikes (½ day)**
- Owner answers section 7.
- Spike A: a "hello" MCP server in an Edge Function (stateless Streamable HTTP, official TypeScript SDK through `npm:` specifiers, or a lighter library such as mcp-lite), tested with MCP Inspector.
- Spike B: whether the bundler can import shared code from outside `supabase/functions/`.

**Phase 1: personal use with tokens (Claude Code, Codex, M1 scheduler)**
- App:
  - Extract the shared core.
  - Add `Task.source?: 'chat' | 'automation'` and its muted source line (en/ko).
  - Inbox folder handling (D1).
  - Settings "AI assistants" section: create, list and revoke tokens, plus copy-paste snippets for Claude Code, Codex and curl.
- Server: `supabase/migrations/…_tokens.sql` and the `assistant` Edge Function with `/mcp` and `/v1/tasks`, `/v1/lists`, `/v1/folders`.
- **Owner steps:** run the SQL, then `npx supabase functions deploy assistant --project-ref ojsmbjerdquvtffqrxlq --use-api`, create a token in the app, and add it to their tools.
- Verify:
  - A task added from curl, Claude Code and Codex appears in the open app within 60 s, with the right list, date, order and source line.
  - A revoked token gets 401.
  - With two test accounts (the owner creates them), account A's token can never read or write account B's rows.

**Phase 2: OAuth for ChatGPT and claude.ai**
- Enable the OAuth server and dynamic registration in the Supabase dashboard (owner step), set the authorization path to the consent route, and build `/connect`.
- Add the OAuth protected-resource metadata to the function.
- Verify the connection end to end in claude.ai (custom connector), Claude Desktop and mobile, and ChatGPT (Developer mode or Plugins). ChatGPT write-tool availability depends on the plan, so check it in the owner's account.
- Settings lists connected apps with a revoke control, if the Supabase API exposes per-user grants; otherwise link to the right place.

**Phase 3: share it**
- Add a LICENSE to the repo (D5). The repo is public today but has no license, which legally means all rights reserved.
- Add `integrations/claude-code/`, a Claude Code plugin with `.mcp.json` pointing at the hosted endpoint and a short skill ("capture todos into Daymark; ask before adding more than five; prefer the Inbox when unsure"), plus a marketplace manifest so anyone can install it with `/plugin marketplace add masibasi/daymark`.
- Add `docs/ASSISTANTS.md` and a website page "Connect Daymark to your AI" with steps for ChatGPT, Claude, Claude Code, Codex and scripts.
- Update the privacy policy (LAUNCH_PLAN B4): connected assistants can read the lists, folders and tasks the tools return, and the providers' own policies then apply.
- Self-hosting: everything reads `SUPABASE_URL` and keys from env, so a fork can run its own project.
- Later and optional: a public Custom GPT, and submission to the Claude and ChatGPT connector directories, which need the privacy policy and a support page.

**Phase 4 (later, separate approval):** complete, move and rename tools; folder creation; Supabase realtime so additions show up instantly instead of within 60 s.

## 7. Owner decisions

Decided 2026-11-24: D1 Inbox folder (a backlog in the existing folder model); D2 yes, but no assistant names (wording in section 2); D3 add + read only; D4 defer the note field. D5 open. D6 follows from approving the feature and lands with phase 1.


- **D1. Where does a Task with no date go?** Recommended: an **Inbox** folder (no deadline), created on first use and reused by name afterwards. It fits the "containers first, pull into a day" model, and it is where automated sources (the M1 scheduler) always go. The alternative is today's list, which puts unreviewed items straight on the day.
- **D2. Show "Added by <assistant>" on those Tasks?** Recommended: yes, muted, reusing the folder source-label style.
- **D3. v1 scope: add and read only?** Recommended: yes. Complete and move come in phase 4.
- **D4. Add a `note` field to Task** for things like an email link or context? It is a model change (types, backup, CSV, editing UI). Recommended: defer, and put short context in the title.
- **D5. License.** MIT is simplest and most permissive. AGPL-3.0 keeps hosted forks open. A split is also possible: MIT for `integrations/` and AGPL for the app.
- **D6. Amend the CLAUDE.md hard rules** to allow "Tasks created through the `assistant` Edge Function by the signed-in user's own tokens or OAuth grants". This would be recorded in DECISIONS.md once approved.

## 8. Risks

- Supabase OAuth server is in beta, and ChatGPT's MCP OAuth handling has been inconsistent. Mitigation: phase 1 gives full value through tokens and does not depend on OAuth.
- Prompt injection from emails the assistant reads. Mitigation: additive-only tools, visible source line, Inbox default for automated sources, and rate limits.
- The service-role path bypasses RLS. Mitigation: one `userScoped(uid)` query helper is the only way the function touches `daymark_items`, plus the cross-user test.
- Clock skew in last-writer-wins: server rows use server time, which is fine because a new Task has no competing edit.
