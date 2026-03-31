"""
Lightweight i18n module for ReClip.

Language resolution order:
  1. RECLIP_LANG environment variable  (e.g. RECLIP_LANG=fr)
  2. Accept-Language HTTP header       (first locale whose .json file exists)
  3. Default: "en"

To add a new language:
  - Copy translations/en.json to translations/<lang_code>.json
  - Translate the values (keep the keys unchanged)
  - That's it — no code changes required.
"""

import json
import os
from pathlib import Path

TRANSLATIONS_DIR = Path(__file__).parent / "translations"
DEFAULT_LANG = "en"

_cache: dict = {}


def _load(lang: str) -> dict:
    """Load and cache a translation file. Returns {} if not found."""
    if lang in _cache:
        return _cache[lang]
    path = TRANSLATIONS_DIR / f"{lang}.json"
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as fh:
        _cache[lang] = json.load(fh)
    return _cache[lang]


def detect_lang(accept_language: str = "") -> str:
    """
    Return the best supported language code.

    Checks RECLIP_LANG env var first, then the Accept-Language header,
    then falls back to DEFAULT_LANG.
    """
    forced = os.environ.get("RECLIP_LANG", "").strip().lower()
    if forced and (TRANSLATIONS_DIR / f"{forced}.json").exists():
        return forced

    for token in accept_language.split(","):
        lang = token.split(";")[0].strip().split("-")[0].lower()
        if lang and (TRANSLATIONS_DIR / f"{lang}.json").exists():
            return lang

    return DEFAULT_LANG


def get_translator(lang: str):
    """
    Return (t, strings) for the given language.

    - t(key) returns the translated string; falls back to English,
      then to the key itself if still not found.
    - strings is the complete merged dict exposed as window.i18n in JS.
    """
    base = _load(DEFAULT_LANG)
    overlay = _load(lang) if lang != DEFAULT_LANG else {}
    strings = {**base, **overlay}

    def t(key: str) -> str:
        return strings.get(key, key)

    return t, strings
