# ShowScraper — Agent Guide

> Audience: code assistants (Codex/Claude). Primary focus: LLM server and React frontend. Scraper details omitted unless relevant.

## Fast facts
- Live site: `bayareashows.org`
- Data: public JSON in GCS bucket `show-scraper-data/`
- Repos of interest: `frontend/react-app`, `llm-server/`

## LLM server (FastAPI)
- Entry: `llm-server/main.py`
  - CORS: `https://bayareashows.org`, `http://localhost:3000`
  - Rate limits: default `20/min, 200/day`; endpoint `/tasks/concert-research` `10/min`
  - SSE endpoint: `/tasks/concert-research` (query: `date`, `title`, `venue`, optional `url`, `mode=quick|detailed`)
  - Manual write endpoint: `POST /manual-shows` adds or updates entries in `ManuallyAdded.json`
  - Manual entry UI: `GET/POST /manual-shows-ui`, protected with HTTP basic auth from env
- Modes/stream events
  - `quick`: single GPT-4o-mini call; emits `quick`
  - `detailed`: two-phase—extract artists (title/URL via safe fetch or Serper search), then per-artist research; emits `status`, `artist_list`, `artist_progress`, `artist_result`, `complete`
- Caching: file cache `llm-server/tasks/logs/cache/` keyed by normalized date/title/venue/mode; stores quick summary and artist sections.
- Safety: `_is_safe_url` blocks private/loopback/link-local/multicast/reserved IPs; rejects non-HTTP(S); blocks `foopee.com`.
- Logging/trace: per-request JSON under `llm-server/logs/`; optional AgentOps tracing if `AGENTOPS_API_KEY` set.
- Env keys: `OPENAI_API_KEY`, `SERPER_API_KEY` (search), optional `AGENTOPS_API_KEY`.
  - Manual shows storage: default GCS bucket `show-scraper-data`, object `ManuallyAdded.json`; optional `MANUAL_SHOWS_LOCAL_FILE` for local testing; optional `MANUAL_SHOWS_API_TOKEN` for write auth.
  - Manual shows UI auth: `MANUAL_SHOWS_UI_USERNAME` and `MANUAL_SHOWS_UI_PASSWORD`
- Public reverse-proxy hostnames for the backend should preserve `llm-backend.dissonant.info` compatibility while also serving `showscraper-backend.dissonant.info` when Traefik is in use.
- If `OPENAI_API_KEY` is absent, the server should still boot and return `503` for LLM endpoints rather than failing at startup.
- Run locally: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python main.py` (serves `localhost:8000`).

## Frontend (Create React App)
- Location: `frontend/react-app/`; uses Bulma, Leaflet, Moment, React Markdown (GitHub dark CSS).
- Data flow: `src/utils/GcsDataLoader.js` fetches `sources.json` + per-venue `{venue}.json` from GCS; groups events by `MM-DD` (year omitted to avoid Dec/Jan issues).
- Views: list (image/text), text-only, map, venues list, about. Root `src/App.jsx`; route prop controls view.
- AI research UI:
  - Triggered from `EventListItem.jsx` & `MapViewManager.jsx`; modal `AIResearchModal.jsx`.
  - Endpoint config in `src/config.js`: prod `https://llm-backend.dissonant.info/tasks/concert-research`, dev `http://localhost:8000/tasks/concert-research`.
  - Workflow: request quick summary (`quick` SSE); auto-start detailed unless cached. Shows per-artist progress bars; renders markdown.
  - Caching: `localStorage` per event+mode; “Re-fetch” clears caches. Sample mode via `API_CONFIG.USE_SAMPLE_DATA=true`.
- Calendar links: Google/ICS generated in `EventListItem.jsx` & `EventModal.jsx`; missing images fallback to `MissingImage.png`.
- Dev start: `npm install && npm start` in `frontend/react-app` (talks to local LLM server).

## What to do as an agent
- Default to consulting this file first. Keep AGENTS.md updated; avoid duplicative docs.
- If editing Claude-specific guidance, keep it brief and point back here.
- Preserve existing CORS/rate-limit/env behaviors unless requirements change.
- For container work on the LLM server, keep Docker assets at repo root (`docker-compose.yml`) and `llm-server/` (`Dockerfile`, `.dockerignore`) so the backend can be built and run independently of the frontend.

## Common troubleshooting
- SSE not working: verify backend running on `localhost:8000`, CORS origins, and no adblock; check rate limits (429).
- Missing AI results: clear `localStorage` entries for the event; use “Re-fetch” button.
- Year off in dates: grouping intentionally ignores year—don’t “fix” without redesign.
