import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app as reclip

# Same shape as a LinkedIn title: post text with blank lines and a curly quote.
MULTILINE_TITLE = (
    "We’re launching something new today.\n\n"
    "Here is the first line of the post, and then a lot more text follows it."
)


class SafeFilenameTest(unittest.TestCase):
    def test_newlines_collapse_to_spaces(self):
        name = reclip.safe_filename(MULTILINE_TITLE)
        self.assertNotIn("\n", name)
        self.assertTrue(name.startswith("We’re launching something new today. Here is"))

    def test_control_chars_and_path_chars_removed(self):
        self.assertEqual(reclip.safe_filename('a/b\\c:d*e?f"g<h>i|j\x00k\x1bl\tm'), "abcdefghijkl m")

    def test_truncates_to_100(self):
        self.assertLessEqual(len(reclip.safe_filename("x" * 300)), 100)

    def test_empty_when_nothing_usable(self):
        self.assertEqual(reclip.safe_filename("\n\n  /:*"), "")

    def test_file_endpoint_serves_multiline_title(self):
        # End to end: this request returned HTTP 500 before safe_filename existed.
        with tempfile.NamedTemporaryFile(suffix=".mp4") as f:
            f.write(b"fake video")
            f.flush()
            reclip.jobs["t1"] = {
                "status": "done",
                "file": f.name,
                "filename": reclip.safe_filename(MULTILINE_TITLE) + ".mp4",
            }
            try:
                resp = reclip.app.test_client().get("/api/file/t1")
                self.assertEqual(resp.status_code, 200)
                self.assertNotIn("\n", resp.headers["Content-Disposition"])
                resp.close()
            finally:
                del reclip.jobs["t1"]


if __name__ == "__main__":
    unittest.main()
