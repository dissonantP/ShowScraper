"""Handler for concert research endpoint."""
import json
from fastapi import HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from core.config import Config
from core.logging import log_request
from core.validation import validate_event_data, validate_mode
from tasks.quick_handler import quick_research_handler
from tasks.artists_list_handler import artists_list_handler
from tasks.artists_fields_handler import artists_fields_handler


async def handle_concert_research(
    request: Request,
    date: str,
    title: str,
    venue: str,
    url: str,
    mode: str,
    artist: str,
    artists: str,
    no_cache: bool = False
) -> EventSourceResponse:
    """Handle concert research request."""
    if not Config.llm_available():
        raise HTTPException(
            status_code=503,
            detail="LLM endpoints are disabled because OPENAI_API_KEY is not configured"
        )

    # Validate and normalize input
    event_data = validate_event_data(date, title, venue, url)
    mode = validate_mode(mode)
    
    # Add no_cache flag to event_data so handlers can access it
    event_data["no_cache"] = no_cache

    # Parse artists parameter if provided
    artists_list = None
    if artists:
        try:
            artists_list = json.loads(artists)
            if not isinstance(artists_list, list):
                raise HTTPException(status_code=400, detail="artists must be a JSON array")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in artists parameter")

    # Validate artists required for artists_fields mode
    if mode == "artists_fields" and not artists_list:
        raise HTTPException(status_code=400, detail="artists parameter required for artists_fields mode")

    # Log request
    req_log = {
        "ip": request.client.host if request.client else None,
        "mode": mode,
        "query": event_data
    }
    if artists_list:
        req_log["artists"] = artists_list
    if artist:
        req_log["artist"] = artist
    log_request(req_log)

    # Dispatch to appropriate handler based on mode
    # Wrap in a generator that catches any exceptions during handler creation
    async def safe_handler():
        try:
            if mode == "quick":
                async for item in quick_research_handler(event_data):
                    yield item
            elif mode == "artists_list":
                async for item in artists_list_handler(event_data):
                    yield item
            elif mode == "artists_fields":
                async for item in artists_fields_handler(event_data, artists_list):
                    yield item
            else:
                yield {"event": "error", "data": f"Invalid mode: {mode}"}
        except Exception as e:
            error_msg = str(e)
            print(f"[handle_concert_research] Exception in handler: {error_msg}")
            import traceback
            traceback.print_exc()
            yield {"event": "error", "data": f"Error: {error_msg}"}

    return EventSourceResponse(safe_handler())
