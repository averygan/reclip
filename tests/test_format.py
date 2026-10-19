import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app as reclip


def selector_for(format_choice, format_id):
    """Run run_download with yt-dlp mocked out and return the -f value it used."""
    seen = {}

    def fake_run(cmd, **kwargs):
        seen["cmd"] = cmd
        return mock.Mock(returncode=1, stderr="stop here", stdout="")

    reclip.jobs["tf"] = {"status": "downloading", "url": "u", "title": ""}
    try:
        with mock.patch.object(reclip.subprocess, "run", side_effect=fake_run):
            reclip.run_download("tf", "https://example.com/v", format_choice, format_id)
    finally:
        del reclip.jobs["tf"]
    cmd = seen["cmd"]
    return cmd[cmd.index("-f") + 1] if "-f" in cmd else None


class FormatSelectorTest(unittest.TestCase):
    def test_picked_format_falls_back_to_itself_before_best(self):
        # HLS variants (LinkedIn) have audio inside, so "+bestaudio" fails.
        # The chosen id must be tried alone before yt-dlp's generic "best".
        self.assertEqual(
            selector_for("video", "1079"),
            "1079+bestaudio[ext=m4a]/1079+bestaudio/1079/best",
        )

    def test_default_prefers_h264_and_aac(self):
        self.assertEqual(
            selector_for("video", None),
            "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
        )

    def test_audio_has_no_format_selector(self):
        self.assertIsNone(selector_for("audio", "1079"))


class QualityOptionsTest(unittest.TestCase):
    # YouTube shape: VP9 has the higher bitrate at 1080p, 4K is VP9/AV1 only.
    YOUTUBE = [
        {"format_id": "137", "height": 1080, "vcodec": "avc1.640028", "tbr": 4000},
        {"format_id": "248", "height": 1080, "vcodec": "vp09.00.40.08", "tbr": 5000},
        {"format_id": "313", "height": 2160, "vcodec": "vp09.00.50.08", "tbr": 18000},
        {"format_id": "401", "height": 2160, "vcodec": "av01.0.12M.08", "tbr": 12000},
        {"format_id": "140", "height": None, "vcodec": "none", "tbr": 129},
    ]

    def test_h264_wins_over_higher_bitrate_vp9(self):
        by_height = {o["height"]: o for o in reclip.quality_options(self.YOUTUBE)}
        self.assertEqual(by_height[1080]["id"], "137")
        self.assertTrue(by_height[1080]["compatible"])
        self.assertEqual(by_height[1080]["label"], "1080p")

    def test_vp9_only_height_is_labeled(self):
        top = reclip.quality_options(self.YOUTUBE)[0]
        self.assertEqual((top["id"], top["label"], top["compatible"]), ("313", "2160p VP9", False))
        self.assertTrue(top["codec"].startswith("vp09"))

    def test_unknown_codec_counts_as_compatible(self):
        # Direct MP4 links (Opus Pro, Motion) report no vcodec.
        opts = reclip.quality_options([{"format_id": "best", "height": 720, "vcodec": None}])
        self.assertTrue(opts[0]["compatible"])


if __name__ == "__main__":
    unittest.main()
