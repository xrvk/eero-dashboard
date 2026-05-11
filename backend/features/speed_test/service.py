import asyncio
import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException

from eero import EeroClient

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
SEED_DIR = Path(__file__).resolve().parent.parent.parent / "seed"
SPEED_HISTORY_FILE = DATA_DIR / "speed_history.json"
SPEED_HISTORY_SEED = SEED_DIR / "speed_history_sample.json"
SPEED_HISTORY_DAYS = int(os.environ.get("SPEED_HISTORY_DAYS", "365"))
SPEED_TEST_POLL_INTERVAL = int(os.environ.get("SPEED_TEST_POLL_INTERVAL", "10"))
SPEED_TEST_TIMEOUT = int(os.environ.get("SPEED_TEST_TIMEOUT", "120"))


def _save_speed_result(network_id: str, result: dict) -> None:
    """Append a speed test result and prune old entries."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    history: list = []
    if SPEED_HISTORY_FILE.exists():
        try:
            history = json.loads(SPEED_HISTORY_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            history = []

    up_data = result.get("up", result.get("speed", {}).get("up", {}))
    down_data = result.get("down", result.get("speed", {}).get("down", {}))
    entry = {
        "network_id": network_id,
        "date": result.get("date", datetime.now(timezone.utc).isoformat()),
        "up": up_data.get("value") if isinstance(up_data, dict) else up_data,
        "down": down_data.get("value") if isinstance(down_data, dict) else down_data,
    }
    history.append(entry)

    cutoff = datetime.now(timezone.utc) - timedelta(days=SPEED_HISTORY_DAYS)
    history = [
        h for h in history
        if datetime.fromisoformat(h["date"].replace("Z", "+00:00")) > cutoff
    ]

    SPEED_HISTORY_FILE.write_text(json.dumps(history, indent=2))


async def run_speed_test(client: EeroClient, network_id: str):
    # Snapshot the current speed date so we can detect when it changes
    pre_resp = await client.get_network(network_id, refresh_cache=True)
    pre_data = pre_resp.get("data", pre_resp)
    pre_speed = pre_data.get("speed", {})
    pre_date = pre_speed.get("date") if isinstance(pre_speed, dict) else None

    # Kick off the speed test (returns 202 accepted)
    await client.run_speed_test(network_id)

    # Poll until the speed date changes or we time out
    deadline = time.monotonic() + SPEED_TEST_TIMEOUT
    while time.monotonic() < deadline:
        await asyncio.sleep(SPEED_TEST_POLL_INTERVAL)
        poll_resp = await client.get_network(network_id, refresh_cache=True)
        poll_data = poll_resp.get("data", poll_resp)
        poll_speed = poll_data.get("speed", {})
        poll_date = poll_speed.get("date") if isinstance(poll_speed, dict) else None

        if poll_date and poll_date != pre_date:
            _save_speed_result(network_id, poll_speed)
            return poll_speed

    raise HTTPException(
        status_code=504,
        detail={
            "code": "speed_test_timeout",
            "message": "Speed test timed out waiting for results",
        },
    )


async def get_speed_history(network_id: str):
    using_seed = not SPEED_HISTORY_FILE.exists()
    history_file = SPEED_HISTORY_SEED if using_seed else SPEED_HISTORY_FILE
    if not history_file.exists():
        return {"history": [], "retention_days": SPEED_HISTORY_DAYS}
    try:
        history = json.loads(history_file.read_text())
        if not using_seed:
            history = [h for h in history if h.get("network_id") == network_id]
        return {"history": history, "retention_days": SPEED_HISTORY_DAYS}
    except (json.JSONDecodeError, OSError):
        return {"history": [], "retention_days": SPEED_HISTORY_DAYS}
