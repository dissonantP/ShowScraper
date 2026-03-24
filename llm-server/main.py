"""FastAPI application for LLM task server."""
from fastapi import Depends, FastAPI, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBasicCredentials
from core.config import Config
from core.rate_limiting import setup_rate_limiting
from core.cors import setup_cors
from core.logging import init_agentops
from core.handlers.concert_research import handle_concert_research
from core.manual_shows import (
    ManualShowCreate,
    ManualShowsDocumentUpdate,
    load_manual_shows_document,
    render_manual_shows_ui,
    require_manual_shows_token,
    require_manual_shows_ui_auth,
    save_manual_shows_document,
    upsert_manual_show,
)

Config.ensure_dirs()
init_agentops()
app = FastAPI(title="LLM Task Server", version="1.0.0")
limiter = setup_rate_limiting(app)
setup_cors(app)

@app.get("/")
def root():
    """Root endpoint with service information."""
    return {
        "service": "LLM Task Server",
        "version": "1.0.0",
        "tasks": ["concert-research"],
        "llm_enabled": Config.llm_available(),
        "manual_shows_backend": Config.manual_shows_storage_backend(),
    }


@app.get("/tasks/concert-research")
@limiter.limit(Config.CONCERT_RESEARCH_RATE_LIMIT)
async def concert_research(
    request: Request,
    date: str = Query(..., description="Event date (YYYY-MM-DD)"),
    title: str = Query(..., description="Event title/artists"),
    venue: str = Query(..., description="Venue name"),
    url: str = Query("", description="Event URL (optional)"),
    mode: str = Query("quick", description="Research mode"),
    artist: str = Query("", description="Single artist name (required for 'artist_fields' mode)"),
    artists: str = Query("", description="JSON array of artist names (required for 'artists_fields' mode)"),
    no_cache: bool = Query(False, description="Skip cache and force fresh data")
):
    """Stream concert research via SSE."""
    return await handle_concert_research(request, date, title, venue, url, mode, artist, artists, no_cache)


@app.post("/manual-shows")
@limiter.limit("30/minute")
async def create_manual_show(
    request: Request,
    payload: ManualShowCreate,
    _: None = Depends(require_manual_shows_token),
):
    """Create or update an event in the ManuallyAdded source."""
    return upsert_manual_show(payload)


@app.get("/manual-shows-ui", response_class=HTMLResponse)
async def manual_shows_ui(
    _: str = Depends(require_manual_shows_ui_auth),
):
    """Render the manual show entry form."""
    return HTMLResponse(render_manual_shows_ui())


@app.get("/manual-shows-ui/data")
async def manual_shows_ui_data(
    _: str = Depends(require_manual_shows_ui_auth),
):
    """Return the current manual-shows document."""
    return load_manual_shows_document()


@app.post("/manual-shows-ui/save")
@limiter.limit("30/minute")
async def manual_shows_ui_save(
    request: Request,
    payload: ManualShowsDocumentUpdate,
    _: str = Depends(require_manual_shows_ui_auth),
):
    """Save the full manual-shows document."""
    return save_manual_shows_document(payload)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=Config.HOST, port=Config.PORT)
