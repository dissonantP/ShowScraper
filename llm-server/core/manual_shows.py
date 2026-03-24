"""Manual show CRUD helpers."""
import html
import json
import secrets
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field

from core.config import Config
from core.validation import normalize_field, validate_date

manual_shows_ui_basic = HTTPBasic()


class ManualShowCreate(BaseModel):
    """Request payload for adding or updating a manually-added show."""

    date: str = Field(..., description="Event date in YYYY-MM-DD format")
    artists: str = Field(..., min_length=1, max_length=220, description="Artist or lineup text")
    venue: str = Field(..., min_length=1, max_length=140, description="Venue label to show in the frontend")
    url: str = Field("", max_length=300, description="Event URL")
    img: str = Field("", description="Optional image URL")
    details: str = Field("", max_length=4000, description="Optional details text")


class ManualShowsDocumentUpdate(BaseModel):
    """Raw manual-shows JSON document payload."""

    content: str = Field(..., min_length=2)


def require_manual_shows_ui_auth(
    credentials: HTTPBasicCredentials = Depends(manual_shows_ui_basic),
) -> str:
    """Require HTTP basic auth for the manual show UI when configured."""
    expected_username = Config.MANUAL_SHOWS_UI_USERNAME
    expected_password = Config.MANUAL_SHOWS_UI_PASSWORD

    if not expected_username or not expected_password:
        raise HTTPException(status_code=503, detail="Manual shows UI basic auth is not configured")

    valid_username = secrets.compare_digest(credentials.username, expected_username)
    valid_password = secrets.compare_digest(credentials.password, expected_password)
    if not (valid_username and valid_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid manual shows UI credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    return credentials.username


def require_manual_shows_token(
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None),
) -> None:
    """Require the manual-shows token when one is configured."""
    expected = Config.MANUAL_SHOWS_API_TOKEN
    if not expected:
        return

    bearer_token = ""
    if authorization and authorization.lower().startswith("bearer "):
        bearer_token = authorization[7:].strip()

    provided = x_api_key or bearer_token
    if provided != expected:
        raise HTTPException(status_code=401, detail="Invalid manual shows API token")


def _validated_manual_show(payload: ManualShowCreate) -> Dict[str, str]:
    """Normalize and validate a manual show request."""
    artists = normalize_field(payload.artists)
    venue = normalize_field(payload.venue)
    url = normalize_field(payload.url)
    img = normalize_field(payload.img)
    details = normalize_field(payload.details)

    if not artists:
        raise HTTPException(status_code=400, detail="artists is required")
    if not venue:
        raise HTTPException(status_code=400, detail="venue is required")

    return {
        "date": validate_date(payload.date),
        "artists": artists,
        "venue": venue,
        "url": url,
        "img": img,
        "details": details,
    }


def _serialize_event(show: Dict[str, str]) -> Dict[str, str]:
    """Convert request data into the stored event format consumed by the frontend."""
    encoded_title = json.dumps(
        {"artists": show["artists"], "venue": show["venue"]},
        separators=(",", ":"),
    )
    return {
        "date": show["date"],
        "title": encoded_title,
        "url": show["url"],
        "img": show["img"],
        "details": show["details"],
    }


def _parse_stored_event(event: Dict[str, Any]) -> Dict[str, str]:
    """Extract comparable fields from an existing ManuallyAdded event."""
    parsed_title: Dict[str, Any] = {}
    title_value = event.get("title", "")
    if isinstance(title_value, str):
        try:
            parsed_title = json.loads(title_value)
        except json.JSONDecodeError:
            parsed_title = {}

    return {
        "date": normalize_field(str(event.get("date", ""))),
        "artists": normalize_field(str(parsed_title.get("artists", event.get("title", "")))),
        "venue": normalize_field(str(parsed_title.get("venue", ""))),
        "url": normalize_field(str(event.get("url", ""))),
    }


def _read_local_events() -> List[Dict[str, Any]]:
    """Read manual shows from a local file."""
    from pathlib import Path

    path = Path(Config.MANUAL_SHOWS_LOCAL_FILE)
    if not path.exists():
        return []

    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Invalid local manual shows JSON: {exc}") from exc

    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail="Local manual shows data must be a JSON array")

    return data


def _write_local_events(events: List[Dict[str, Any]]) -> None:
    """Write manual shows to a local file."""
    from pathlib import Path

    path = Path(Config.MANUAL_SHOWS_LOCAL_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(events, indent=2) + "\n")


def _read_gcs_events() -> List[Dict[str, Any]]:
    """Read manual shows from GCS."""
    try:
        from google.cloud import storage
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="google-cloud-storage is not installed") from exc

    try:
        client = storage.Client()
        bucket = client.bucket(Config.GCS_BUCKET_NAME)
        blob = bucket.get_blob(Config.MANUAL_SHOWS_OBJECT)
        if blob is None:
            return []

        raw = blob.download_as_text()
        data = json.loads(raw) if raw.strip() else []
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to read manual shows from GCS: {exc}") from exc

    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail="GCS manual shows data must be a JSON array")

    return data


def _write_gcs_events(events: List[Dict[str, Any]]) -> None:
    """Write manual shows to GCS."""
    try:
        from google.cloud import storage
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="google-cloud-storage is not installed") from exc

    try:
        payload = json.dumps(events, indent=2) + "\n"
        client = storage.Client()
        bucket = client.bucket(Config.GCS_BUCKET_NAME)
        blob = bucket.blob(Config.MANUAL_SHOWS_OBJECT)
        blob.upload_from_string(payload, content_type="application/json")
        persisted_blob = bucket.get_blob(Config.MANUAL_SHOWS_OBJECT)
        if persisted_blob is None:
            raise HTTPException(status_code=502, detail="Manual shows GCS write verification could not reload the object")
        persisted = persisted_blob.download_as_text()
        if persisted != payload:
            raise HTTPException(status_code=502, detail="Manual shows GCS write verification failed")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to write manual shows to GCS: {exc}") from exc


def _load_events() -> Tuple[str, List[Dict[str, Any]]]:
    """Load manual shows from the configured backend."""
    if Config.MANUAL_SHOWS_LOCAL_FILE:
        return "local", _read_local_events()

    if Config.GCS_BUCKET_NAME:
        return "gcs", _read_gcs_events()

    raise HTTPException(status_code=503, detail="Manual show storage is not configured")


def _save_events(backend: str, events: List[Dict[str, Any]]) -> None:
    """Persist manual shows to the configured backend."""
    if backend == "local":
        _write_local_events(events)
        return
    if backend == "gcs":
        _write_gcs_events(events)
        return
    raise HTTPException(status_code=500, detail=f"Unsupported manual shows backend: {backend}")


def upsert_manual_show(payload: ManualShowCreate) -> Dict[str, Any]:
    """Create or update a manual show entry."""
    show = _validated_manual_show(payload)
    new_event = _serialize_event(show)
    backend, events = _load_events()

    match_index = -1
    for index, event in enumerate(events):
        existing = _parse_stored_event(event)
        same_fallback_key = (
            existing["date"] == show["date"]
            and existing["artists"] == show["artists"]
            and existing["venue"] == show["venue"]
        )
        if same_fallback_key:
            match_index = index
            break

    action = "created"
    if match_index >= 0:
        events[match_index] = new_event
        action = "updated"
    else:
        events.append(new_event)

    events.sort(key=lambda item: (str(item.get("date", "")), str(item.get("title", "")), str(item.get("url", ""))))
    _save_events(backend, events)

    return {
        "ok": True,
        "action": action,
        "storage_backend": backend,
        "object": Config.MANUAL_SHOWS_OBJECT,
        "count": len(events),
        "event": new_event,
    }


def load_manual_shows_document() -> Dict[str, Any]:
    """Load the full manual-shows document as pretty-printed JSON text."""
    backend, events = _load_events()
    return {
        "storage_backend": backend,
        "object": Config.MANUAL_SHOWS_OBJECT,
        "count": len(events),
        "content": json.dumps(events, indent=2) + "\n",
    }


def save_manual_shows_document(payload: ManualShowsDocumentUpdate) -> Dict[str, Any]:
    """Validate and save a full manual-shows JSON document."""
    try:
        data = json.loads(payload.content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {exc.msg} at line {exc.lineno}, column {exc.colno}") from exc

    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Manual shows document must be a JSON array")

    for index, item in enumerate(data):
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail=f"Entry {index} must be a JSON object")
        if not isinstance(item.get("date", ""), str):
            raise HTTPException(status_code=400, detail=f"Entry {index} is missing string field 'date'")
        validate_date(item["date"])
        for key in ("title", "url", "img", "details"):
            value = item.get(key, "")
            if value is None:
                item[key] = ""
                value = ""
            if not isinstance(value, str):
                raise HTTPException(status_code=400, detail=f"Entry {index} field '{key}' must be a string")

    backend, _ = _load_events()
    data.sort(key=lambda item: (str(item.get("date", "")), str(item.get("title", "")), str(item.get("url", ""))))
    _save_events(backend, data)
    _, persisted = _load_events()
    return {
        "ok": True,
        "storage_backend": backend,
        "object": Config.MANUAL_SHOWS_OBJECT,
        "count": len(persisted),
        "content": json.dumps(persisted, indent=2) + "\n",
    }


def render_manual_shows_ui() -> str:
    """Render the manual-shows JSON editor UI."""
    object_name = html.escape(Config.MANUAL_SHOWS_OBJECT)
    api_token = html.escape(Config.MANUAL_SHOWS_API_TOKEN or "", quote=False)
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ShowScraper Manual Add</title>
    <style>
      :root {{
        color-scheme: light;
        --bg: #f4efe7;
        --panel: #fffdf9;
        --ink: #1f1a17;
        --muted: #6c625b;
        --accent: #8d3c2f;
        --accent-2: #d8b48a;
        --border: #d7c6b4;
        --ok: #e3f1df;
        --ok-border: #8caf7c;
        --err: #f8dfda;
        --err-border: #c96a5a;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top left, rgba(216,180,138,0.45), transparent 36%),
          linear-gradient(135deg, #f8f2ea, var(--bg));
        color: var(--ink);
      }}
      main {{
        max-width: 760px;
        margin: 48px auto;
        padding: 0 20px;
      }}
      .panel {{
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: 0 16px 50px rgba(54, 35, 18, 0.08);
        overflow: hidden;
      }}
      .header {{
        padding: 28px 28px 18px;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(180deg, rgba(216,180,138,0.22), rgba(255,253,249,0));
      }}
      h1 {{
        margin: 0 0 8px;
        font-size: 2rem;
        line-height: 1.1;
      }}
      p {{
        margin: 0;
        color: var(--muted);
      }}
      .body {{
        padding: 24px 28px 28px;
        display: grid;
        gap: 18px;
      }}
      textarea {{
        width: 100%;
        min-height: 460px;
        padding: 16px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: #171311;
        color: #f7efe8;
        caret-color: #f7efe8;
        font: 14px/1.5 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        resize: vertical;
      }}
      .actions {{
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }}
      button {{
        border: 0;
        border-radius: 999px;
        padding: 13px 18px;
        font: inherit;
        font-weight: 700;
        background: linear-gradient(135deg, var(--accent), #b55641);
        color: #fff;
        cursor: pointer;
      }}
      .status {{
        margin: 24px 28px 0;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid transparent;
      }}
      .status.success {{
        background: var(--ok);
        border-color: var(--ok-border);
      }}
      .status.error {{
        background: var(--err);
        border-color: var(--err-border);
      }}
      .hint {{
        font-size: 0.9rem;
        color: var(--muted);
      }}
      code {{
        background: rgba(0,0,0,0.05);
        padding: 2px 6px;
        border-radius: 6px;
      }}
      pre {{
        margin: 0;
        padding: 16px;
        border-radius: 14px;
        background: #171311;
        color: #f7efe8;
        overflow-x: auto;
        font: 13px/1.5 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      }}
      .instructions {{
        border-top: 1px solid var(--border);
        padding: 24px 28px 28px;
        display: grid;
        gap: 14px;
      }}
      .instructions h2 {{
        margin: 0;
        font-size: 1.2rem;
      }}
      main {{ margin: 20px auto; }}
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <div class="header">
          <h1>Manual Show JSON Editor</h1>
          <p>Edit <code>{object_name}</code> directly. Save validates JSON in the browser first, then on the server before writing to storage.</p>
        </div>
        <div id="status" class="status" hidden></div>
        <div class="body">
          <div class="actions">
            <button id="save-btn" type="button">Save JSON</button>
            <button id="reload-btn" type="button">Reload From Storage</button>
            <span id="meta" class="hint">Loading…</span>
          </div>
          <textarea id="editor" spellcheck="false" aria-label="Manual shows JSON"></textarea>
          <div class="hint">Expected format: a JSON array of objects with string fields like <code>date</code>, <code>title</code>, <code>url</code>, <code>img</code>, and <code>details</code>. The stored <code>title</code> value remains the JSON-encoded artist and venue payload used by the frontend.</div>
        </div>
        <section class="instructions">
          <h2>LLM Instructions</h2>
          <div class="hint">Use the template below if you want to hand instructions to an LLM so it can call the write API directly.</div>
          <pre>Use the ShowScraper manual show API.

Endpoint:
POST https://showscraper-backend.dissonant.info/manual-shows

Headers:
Content-Type: application/json
X-API-Key: {api_token}

Request body:
{{
  "date": "YYYY-MM-DD",
  "artists": "Artist Name, Support Artist",
  "venue": "Venue Name",
  "url": "https://example.com/event",
  "img": "https://example.com/flyer.jpg",
  "details": "Optional notes"
}}

Example request:
curl -X POST https://showscraper-backend.dissonant.info/manual-shows \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: {api_token}' \
  -d '{{
    "date": "2026-05-01",
    "artists": "Example Band, Support Act",
    "venue": "Rickshaw Stop",
    "url": "https://example.com/show",
    "img": "https://example.com/flyer.jpg",
    "details": "Doors 8pm"
  }}'

Expected success response:
{{
  "ok": true,
  "action": "created",
  "storage_backend": "gcs",
  "object": "ManuallyAdded.json"
}}

Notes:
- If the URL matches an existing event, the event will be updated instead of duplicated.
- Keep the JSON valid and send strings for each field.</pre>
        </section>
      </section>
    </main>
    <script>
      const editor = document.getElementById('editor');
      const statusEl = document.getElementById('status');
      const metaEl = document.getElementById('meta');
      const saveBtn = document.getElementById('save-btn');
      const reloadBtn = document.getElementById('reload-btn');

      function setStatus(kind, message) {{
        statusEl.hidden = false;
        statusEl.className = `status ${{kind}}`;
        statusEl.textContent = message;
      }}

      function clearStatus() {{
        statusEl.hidden = true;
        statusEl.textContent = '';
      }}

      async function loadDocument() {{
        clearStatus();
        metaEl.textContent = 'Loading…';
        const response = await fetch(`/manual-shows-ui/data?ts=${{Date.now()}}`, {{
          credentials: 'same-origin',
          cache: 'no-store'
        }});
        const data = await response.json();
        if (!response.ok) {{
          throw new Error(data.detail || 'Failed to load JSON');
        }}
        editor.value = data.content;
        metaEl.textContent = `Backend: ${{data.storage_backend}}. Entries: ${{data.count}}. Object: ${{data.object}}`;
      }}

      function validateClientJson(text) {{
        let parsed;
        try {{
          parsed = JSON.parse(text);
        }} catch (error) {{
          throw new Error(`Invalid JSON: ${{error.message}}`);
        }}
        if (!Array.isArray(parsed)) {{
          throw new Error('JSON must be an array');
        }}
        return parsed;
      }}

      async function saveDocument() {{
        clearStatus();
        try {{
          validateClientJson(editor.value);
        }} catch (error) {{
          setStatus('error', error.message);
          return;
        }}

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
        try {{
          const response = await fetch('/manual-shows-ui/save', {{
            method: 'POST',
            headers: {{ 'Content-Type': 'application/json' }},
            credentials: 'same-origin',
            body: JSON.stringify({{ content: editor.value }})
          }});
          const data = await response.json();
          if (!response.ok) {{
            throw new Error(data.detail || 'Save failed');
          }}
          editor.value = data.content;
          metaEl.textContent = `Backend: ${{data.storage_backend}}. Entries: ${{data.count}}. Object: ${{data.object}}`;
          setStatus('success', `Saved. Backend: ${{data.storage_backend}}. Entries: ${{data.count}}.`);
        }} catch (error) {{
          setStatus('error', error.message);
        }} finally {{
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save JSON';
        }}
      }}

      saveBtn.addEventListener('click', saveDocument);
      reloadBtn.addEventListener('click', loadDocument);
      loadDocument().catch((error) => setStatus('error', error.message));
    </script>
  </body>
</html>
"""
