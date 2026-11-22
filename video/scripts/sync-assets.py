"""Copy the storyboard assets without touching the source kiosk."""
import hashlib
import json
from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parents[2]
dest = root / 'video' / 'public'
doc = (root / 'docs/TUNAEYE_ANIMATED_DEMO_VIDEO_FLOW.md').read_text(encoding='utf-8')
referenced = set(re.findall(r'kiosk-screens/([\w.-]+\.png)', doc))
sources = [root / 'public/assets/applogo.svg', *sorted((root / 'public/kiosk-screens').glob('*.png'))]
sources += [root / 'public/fonts' / name for name in ['OpenRunde-Regular.woff2', 'OpenRunde-Bold.woff2', 'inter-400.ttf', 'inter-600.ttf', 'instrument-serif-italic.ttf']]
assert referenced <= {s.name for s in sources}, referenced - {s.name for s in sources}
manifest = []
for source in sources:
    target = dest / source.relative_to(root / 'public')
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert hashlib.sha256(target.read_bytes()).hexdigest() == digest
    manifest.append({'file': target.relative_to(dest).as_posix(), 'sha256': digest})
qa = root / 'video/qa'
qa.mkdir(exist_ok=True)
(qa / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(f'Copied and hash-verified {len(sources)} assets; all {len(referenced)} storyboard screenshots present.')
