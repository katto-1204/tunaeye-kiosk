"""One-time exact UI font vendoring; no runtime or build dependency."""
from pathlib import Path
from urllib.request import urlopen
import hashlib

root = Path(__file__).resolve().parents[1] / "public" / "fonts"
sources = {
    "instrument-serif-italic.ttf": "https://fonts.gstatic.com/s/instrumentserif/v5/jizHRFtNs2ka5fXjeivQ4LroWlx-6zATiw.ttf",
    "instrument-serif-regular.ttf": "https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-2zI.ttf",
}
for weight, suffix in [(300, "OKfMZg"), (400, "LyfMZg"), (500, "I6fMZg"), (600, "GKYMZg"), (700, "FuYMZg"), (800, "DyYMZg"), (900, "BWYMZg")]:
    sources[f"inter-{weight}.ttf"] = "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVu" + suffix + ".ttf"
for name, url in sources.items():
    data = urlopen(url, timeout=30).read()
    if data[:4] not in (b"\0\1\0\0", b"OTTO", b"ttcf"):
        raise ValueError(f"Invalid font returned for {name}")
    (root / name).write_bytes(data)
    print(name, len(data), hashlib.sha256(data).hexdigest())
for family in ("inter", "instrumentserif"):
    license_url = f"https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/OFL.txt"
    (root / f"{family}-OFL.txt").write_bytes(urlopen(license_url, timeout=30).read())
