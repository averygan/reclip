import pytest

from app import format_height


@pytest.mark.parametrize("height,expected", [
    (4320, "8K (4320p)"),
    (2160, "4K (2160p)"),
    (1440, "2K (1440p)"),
    (1080, "Full HD (1080p)"),
    (720, "HD (720p)"),
    (480, "SD (480p)"),
    (360, "360p"),
    (240, "240p"),
    (144, "144p"),
])
def test_known_heights_get_friendly_labels(height, expected):
    assert format_height(height) == expected


@pytest.mark.parametrize("height,expected", [
    (3072, "3072p"),   # irregular near-4K
    (5400, "5400p"),   # 6K-ish
    (8640, "8640p"),   # future 16K
    (1024, "1024p"),
    (2880, "2880p"),
])
def test_unknown_heights_fall_back_to_raw_label(height, expected):
    # Spec: "Any other height → {height}p (no friendly name; future-proofs 6K, 16K, irregular sources)"
    assert format_height(height) == expected
