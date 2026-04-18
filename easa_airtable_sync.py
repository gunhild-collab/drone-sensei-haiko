"""
EASA → Airtable Drone Sync
Haiko AS — drone database sync script

Fetches all drones from EASA's EU Operations list and upserts them
into your Airtable base. Existing Haiko-specific fields are preserved.

SETUP:
  pip install requests pyairtable

SCHEDULE:
  Add to cron (weekly Monday 07:00):
  0 7 * * 1 /usr/bin/python3 /path/to/easa_airtable_sync.py >> /var/log/haiko_sync.log 2>&1

  Or use GitHub Actions (see .github/workflows/easa_sync.yml).
"""

import os
import requests
import logging
from pyairtable import Api

# ── CONFIG ──────────────────────────────────────────────────────────────────

AIRTABLE_API_KEY  = os.environ.get("AIRTABLE_API_KEY", "YOUR_AIRTABLE_API_KEY")   # Personal Access Token
AIRTABLE_BASE_ID  = os.environ.get("AIRTABLE_BASE_ID", "YOUR_BASE_ID")             # e.g. appXXXXXXXXXXXXXX
AIRTABLE_TABLE    = os.environ.get("AIRTABLE_TABLE", "Drones")                     # Table name in Airtable

# EASA JSON export — paginates with ?page=0, ?page=1, etc.
EASA_BASE_URL = (
    "https://www.easa.europa.eu/en/domains/drones-air-mobility"
    "/drones-evtol-designs/drones-eu-operations/export-json?_format=json&page={page}"
)

# Unique key used to match EASA records against existing Airtable records
# (avoids duplicates on re-run). "drone_name" = EASA Model field.
MATCH_FIELD = "drone_name"

# ── FIELD MAPPING ───────────────────────────────────────────────────────────
# Maps EASA JSON field names → your Airtable column names.
# EASA fields that don't exist in your table yet are added automatically.
# Your custom Haiko columns (mtom_kg, has_thermal, etc.) are NOT touched.

EASA_TO_AIRTABLE = {
    "field_drone_model":               "drone_name",
    "field_drone_commercial_name":     "commercial_name",
    "field_drone_design_organisation": "manufacturer",
    "field_drone_operations_category": "category",
    "field_drone_class_mark":          "c_class",
    "field_drone_type_category":       "type_category",
    "field_drone_sound_power_level":   "sound_power_level_db",
    "field_drone_m2_mitigation":       "m2_mitigation",
    "field_drone_containment":         "containment",
    # EASA detail page URL — useful for manual reference
    "url":                             "easa_url",
}

# ── LOGGING ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M",
)
log = logging.getLogger(__name__)

# ── FETCH FROM EASA ─────────────────────────────────────────────────────────

def fetch_easa_drones() -> list[dict]:
    """Fetches all pages from EASA JSON export and returns flat list."""
    drones = []
    page = 0

    while True:
        url = EASA_BASE_URL.format(page=page)
        log.info(f"Fetching EASA page {page} — {url}")

        resp = requests.get(url, timeout=30, headers={"Accept": "application/json"})
        resp.raise_for_status()

        batch = resp.json()

        # EASA returns an empty list when there are no more pages
        if not batch:
            log.info(f"No more results at page {page}. Done.")
            break

        # If EASA wraps results in a dict, unwrap here.
        # Current format appears to be a plain list.
        if isinstance(batch, dict):
            batch = batch.get("data", batch.get("results", []))

        drones.extend(batch)
        log.info(f"  → {len(batch)} records (total so far: {len(drones)})")

        # Safety stop — EASA has ~105 records across 3 pages
        if len(batch) < 10:
            break

        page += 1

    return drones


def map_easa_record(raw: dict) -> dict:
    """Maps a raw EASA JSON record to Airtable field names."""
    mapped = {}
    for easa_field, airtable_field in EASA_TO_AIRTABLE.items():
        value = raw.get(easa_field)
        if value not in (None, "", []):
            mapped[airtable_field] = value

    # Clean up class mark — EASA sometimes returns "C2 with low speed mode",
    # we preserve the full string but also extract the base class.
    if "c_class" in mapped:
        raw_class = str(mapped["c_class"])
        mapped["c_class"] = raw_class
        # Extract just "C0"–"C6" as a separate clean field if you want it.
        # Uncomment if you add a "c_class_clean" column in Airtable:
        # import re
        # m = re.search(r"C\d", raw_class)
        # if m:
        #     mapped["c_class_clean"] = m.group()

    return mapped


# ── AIRTABLE UPSERT ─────────────────────────────────────────────────────────

def sync_to_airtable(drones: list[dict]) -> None:
    """
    Upserts drone records into Airtable.
    - If a record with the same drone_name exists → update EASA fields only.
    - If it doesn't exist → create new record with EASA fields.
    - Haiko-specific fields (mtom_kg, has_thermal, etc.) are never overwritten.
    """
    api   = Api(AIRTABLE_API_KEY)
    table = api.table(AIRTABLE_BASE_ID, AIRTABLE_TABLE)

    # Build lookup: drone_name → record_id for all existing records
    log.info("Loading existing Airtable records...")
    existing = {}
    for record in table.all():
        name = record["fields"].get(MATCH_FIELD)
        if name:
            existing[name] = record["id"]

    log.info(f"Found {len(existing)} existing records in Airtable.")

    created = updated = skipped = 0

    for drone in drones:
        fields = map_easa_record(drone)

        if not fields.get(MATCH_FIELD):
            log.warning(f"Skipping record with no drone_name: {drone}")
            skipped += 1
            continue

        name = fields[MATCH_FIELD]

        if name in existing:
            # Update — only EASA fields, never touch Haiko columns
            table.update(existing[name], fields)
            log.info(f"  Updated: {name}")
            updated += 1
        else:
            # New record
            table.create(fields)
            log.info(f"  Created: {name}")
            created += 1

    log.info(
        f"\nSync complete — "
        f"created: {created}, updated: {updated}, skipped: {skipped}"
    )


# ── MAIN ────────────────────────────────────────────────────────────────────

def main():
    log.info("=== EASA → Airtable Drone Sync ===")
    try:
        drones = fetch_easa_drones()
        log.info(f"Total EASA records fetched: {len(drones)}")
        sync_to_airtable(drones)
    except requests.HTTPError as e:
        log.error(f"EASA fetch failed: {e}")
        raise
    except Exception as e:
        log.error(f"Sync failed: {e}")
        raise


if __name__ == "__main__":
    main()
