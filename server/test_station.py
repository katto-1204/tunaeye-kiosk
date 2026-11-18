"""Real SQLite transaction/restart checks, using only the Python standard library."""
import base64
from contextlib import closing
import http.client
import importlib.util
import json
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import unittest

SCRIPT = Path(__file__).with_name('station.py').resolve()
spec = importlib.util.spec_from_file_location('tunaeye_station', SCRIPT)
station = importlib.util.module_from_spec(spec)
spec.loader.exec_module(station)


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.database = str(Path(self.directory.name) / 'station.sqlite3')
        self.record = {'id': 'record-1', 'sessionId': 'session-1', 'capturedImageId': 'image-1', 'grade': 'B'}
        self.evidence = {'id': 'image-1', 'mimeType': 'image/png', 'image': base64.b64encode(b'original image bytes').decode()}

    def tearDown(self):
        self.directory.cleanup()

    def execute(self, method, path, body=None):
        return station.execute(method, path, body, self.database)

    def save(self, **changes):
        return self.execute('POST', '/local-api/records', {'record': {**self.record, **changes}, 'evidence': self.evidence})

    def test_atomic_row_image_and_idempotent_replay(self):
        self.assertEqual(self.save(), {'saved': 'record-1'})
        self.save(grade='A')
        records = self.execute('GET', '/local-api/records')['records']
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['grade'], 'A')
        image = self.execute('GET', '/local-api/evidence/image-1')['evidence']
        self.assertEqual(base64.b64decode(image['image']), b'original image bytes')
        with closing(sqlite3.connect(self.database)) as db, db:
            self.assertEqual(db.execute('SELECT count(*) FROM evidence').fetchone()[0], 1)

    def test_failed_record_write_rolls_back_image_replacement(self):
        self.save()
        with closing(sqlite3.connect(self.database)) as db, db:
            db.execute("CREATE TRIGGER reject_write BEFORE INSERT ON records BEGIN SELECT RAISE(ABORT, 'simulated disk write failure'); END")
        self.evidence['image'] = base64.b64encode(b'rejected replacement bytes').decode()
        with self.assertRaises(sqlite3.IntegrityError):
            self.save(grade='C')
        self.assertEqual(self.execute('GET', '/local-api/records')['records'][0]['grade'], 'B')
        image = self.execute('GET', '/local-api/evidence/image-1')['evidence']
        self.assertEqual(base64.b64decode(image['image']), b'original image bytes')

    def test_missing_evidence_rejects_record(self):
        with self.assertRaises(ValueError):
            self.execute('POST', '/local-api/records', {'record': self.record})
        self.assertEqual(self.execute('GET', '/local-api/records'), {'records': []})

    def test_restart_reads_committed_bytes(self):
        self.save()
        result = subprocess.run([sys.executable, str(SCRIPT), '--request', '--database', self.database], input=json.dumps({'method': 'GET', 'path': '/local-api/evidence/image-1'}), text=True, capture_output=True, check=True)
        self.assertEqual(base64.b64decode(json.loads(result.stdout)['evidence']['image']), b'original image bytes')

    def test_health_rolls_back_probe_and_rejects_write_failure(self):
        self.assertEqual(self.execute('GET', '/local-api/health'), {'sqlite': 'ready', 'writable': True})
        self.assertEqual(self.execute('GET', '/local-api/records'), {'records': []})
        with closing(sqlite3.connect(self.database)) as db, db:
            db.execute("CREATE TRIGGER reject_probe BEFORE INSERT ON records BEGIN SELECT RAISE(ABORT, 'not writable'); END")
        with self.assertRaises(sqlite3.IntegrityError):
            self.execute('GET', '/local-api/health')
        self.assertEqual(self.execute('GET', '/local-api/records'), {'records': []})

    def test_http_rejects_cross_origin_access(self):
        with socket.socket() as reservation:
            reservation.bind(('127.0.0.1', 0)); port = reservation.getsockname()[1]
        process = subprocess.Popen([sys.executable, str(SCRIPT), '--database', self.database, '--dist', self.directory.name, '--port', str(port)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for _ in range(50):
                try:
                    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=1)
                    connection.request('GET', '/local-api/health')
                    response = connection.getresponse(); response.read(); connection.close()
                    self.assertEqual(response.status, 200); break
                except ConnectionRefusedError:
                    time.sleep(.05)
            else:
                self.fail('Station HTTP server failed to start')
            connection = http.client.HTTPConnection('127.0.0.1', port, timeout=2)
            connection.request('GET', '/local-api/health', headers={'Origin': 'https://untrusted.example'})
            response = connection.getresponse(); response.read(); connection.close()
            self.assertEqual(response.status, 403)
        finally:
            process.terminate(); process.wait(timeout=5)


if __name__ == '__main__':
    unittest.main()
