# LLM Task Server

General-purpose LLM API server using LangChain and OpenAI GPT-4o with Serper web search and AgentOps monitoring.

## Docker

From the repo root:

```bash
cp llm-server/.env.example llm-server/.env
# edit llm-server/.env with your API keys
docker compose up --build llm-server
```

The container listens on `http://localhost:8000`.

Container data is persisted to:
- `llm-server/logs/`
- `llm-server/tasks/logs/cache/`

To enable the manual-show writer against GCS inside Docker, also pass Google credentials and, if needed, mount the credentials file referenced by `GOOGLE_APPLICATION_CREDENTIALS`.

## Setup

1. Create virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys:
   # - OPENAI_API_KEY
   # - SERPER_API_KEY (for web search)
   # - AGENTOPS_API_KEY (for monitoring)
   # - SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET (optional)
   ```

4. Run server:
   ```bash
   python main.py
   ```

Server will start on `http://localhost:8000`

If `OPENAI_API_KEY` is absent, the server still starts; the AI research endpoint returns `503` until that key is configured.

## Manual Show Writer

`POST /manual-shows` adds or updates an event in `ManuallyAdded.json`.

`GET /manual-shows-ui` provides a small built-in JSON editor for `ManuallyAdded.json`, protected by HTTP basic auth.

Request body:

```json
{
  "date": "2026-04-10",
  "artists": "Example Band, Support Act",
  "venue": "Rickshaw Stop",
  "url": "https://example.com/show",
  "img": "https://example.com/flyer.jpg",
  "details": "Doors 8pm"
}
```

Behavior:
- Stores the event in the same format the frontend already expects for `ManuallyAdded`
- Updates an existing entry when `url` matches, or when `date + artists + venue` matches
- Writes to GCS by default (`GCS_BUCKET_NAME` + `MANUAL_SHOWS_OBJECT`)
- Can use a local file instead via `MANUAL_SHOWS_LOCAL_FILE`
- If `MANUAL_SHOWS_API_TOKEN` is set, the endpoint requires `Authorization: Bearer <token>` or `X-API-Key: <token>`
- In Docker, mount the service-account JSON under `/app/credentials/` and point `GOOGLE_APPLICATION_CREDENTIALS` at it
- `/manual-shows-ui` requires `MANUAL_SHOWS_UI_USERNAME` and `MANUAL_SHOWS_UI_PASSWORD`
- The editor loads the full JSON document, validates it in the browser before save, and the server re-validates it before writing to storage

Example:

```bash
curl -X POST http://localhost:8000/manual-shows \
  -H 'Content-Type: application/json' \
  -d '{
    "date": "2026-04-10",
    "artists": "Example Band",
    "venue": "Rickshaw Stop",
    "url": "https://example.com/show"
  }'
```

UI example:

```bash
open https://showscraper-backend.dissonant.info/manual-shows-ui
```

## Testing Outside the API

You can test the concert research functionality directly without running the API server:

```bash
python test_concert_research.py
```

This will:
- Initialize AgentOps monitoring (if API key is set)
- Verify Serper web search tool access
- Run a sample concert research query
- Save the result to `test_output.md`
- Show detailed output including tool calls

Make sure your `.env` file has all required API keys before running the test.

## Available Tasks

### Concert Research

**Endpoint:** `GET /tasks/concert-research`

**Query Parameters:**
- `date` (required): Event date (YYYY-MM-DD)
- `title` (required): Event title/artist names
- `venue` (required): Venue name
- `url` (optional): Event URL
- `mode` (optional): `quick`, `detailed`, `artist_fields`, or `artists_fields`
- `no_cache` (optional): `true` to bypass file cache

**Features:**
- Uses Serper for web search to find artist information
- Two-phase processing: draft generation + editing/proofreading
- AgentOps monitoring for tracking agent behavior
- Streams results via Server-Sent Events (SSE)

**Example:**
```bash
curl "http://localhost:8000/tasks/concert-research?date=2025-12-15&title=Test+Band&venue=Test+Venue"
```

## Monitoring

When `AGENTOPS_API_KEY` is set, all concert research sessions are tracked in AgentOps:
- View sessions at https://app.agentops.ai
- Each session is tagged with `concert-research` and the event title
- Sessions track tool calls (web searches), LLM interactions, and success/failure states

## Adding New Tasks

1. Create new file in `tasks/` directory
2. Implement handler function that yields SSE data
3. Add route in `main.py`


## Security

Security scanner runs on Github.
