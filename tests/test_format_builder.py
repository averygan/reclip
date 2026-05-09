import pytest

from app import build_format_string


def test_none_returns_best_available():
    assert build_format_string(None) == "bv*+ba/b"


def test_caps_height_at_2160():
    assert build_format_string(2160) == "bv*[height<=2160]+ba/b[height<=2160]"


def test_caps_height_at_4320():
    assert build_format_string(4320) == "bv*[height<=4320]+ba/b[height<=4320]"


def test_caps_height_at_irregular_value():
    # Non-standard heights (3072, 6K-ish, etc.) must be supported without a whitelist.
    assert build_format_string(3072) == "bv*[height<=3072]+ba/b[height<=3072]"


def test_zero_height_raises_value_error():
    with pytest.raises(ValueError):
        build_format_string(0)


def test_negative_height_raises_value_error():
    with pytest.raises(ValueError):
        build_format_string(-720)


def test_non_integer_height_raises_value_error():
    with pytest.raises(ValueError):
        build_format_string("1080")


def test_float_height_raises_value_error():
    with pytest.raises(ValueError):
        build_format_string(1080.5)
