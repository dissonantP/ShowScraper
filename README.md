# ShowScraper

ShowScraper now contains two services:

- **Frontend**: React app for browsing Bay Area concert listings and running AI-powered event research.
- **LLM Server**: FastAPI backend that powers the AI research feature via streaming endpoints.

The scraper has been moved to a separate repository:

- https://github.com/dissonantP/showscraper_standalone

## Repository Layout

- `frontend/`: React application
- `llm-server/`: Python FastAPI service for AI research

## Frontend Quickstart

1. `cd frontend`
2. `npm install`
3. `npm run dev`

To build and deploy the frontend:

- `bin/deploy`

## LLM Server Quickstart

1. `cd llm-server`
2. `cp .env.example .env`
3. Add required API keys to `.env`:
   - `OPENAI_API_KEY=...`
   - `SERPAPI_API_KEY=...`
4. `uv venv venv`
5. `source venv/bin/activate`
6. `uv pip install -r requirements.txt`
7. `python main.py`

The server runs on `http://localhost:8000` by default.

## Notes

- Frontend event data is still read from the public GCS bucket (`show-scraper-data`).
- Scraper development, execution, and scraper-specific docs now live in the separate scraper repo.
