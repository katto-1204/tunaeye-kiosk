"""Local SQLite persistence and offline static kiosk host. Python standard library only."""
import argparse
import base64
from contextlib import closing
import json
import os
from pathlib import Path
import sqlite3
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, unquote
from urllib.request import Request, urlopen
from urllib.error import HTTPError


def execute(method, path, body, database):
    Path(database).parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(database, timeout=15)) as db, db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, payload TEXT NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, metadata TEXT NOT NULL, image BLOB NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS station_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)')
        if method == 'GET' and path == '/local-api/health':
            probe_id = '__readiness__' + db.execute('SELECT lower(hex(randomblob(16)))').fetchone()[0]
            db.execute('SAVEPOINT readiness_probe')
            try:
                db.execute('INSERT INTO records VALUES (?,?)', (probe_id, '{}'))
                if not db.execute('SELECT 1 FROM records WHERE id=?', (probe_id,)).fetchone():
                    raise sqlite3.DatabaseError('SQLite readiness write could not be read')
            finally:
                db.execute('ROLLBACK TO readiness_probe')
                db.execute('RELEASE readiness_probe')
            return {'sqlite': 'ready', 'writable': True}
        if method == 'GET' and path == '/local-api/state':
            return {'state': {row[0]: row[1] for row in db.execute('SELECT key, value FROM station_state')}}
        if method == 'POST' and path == '/local-api/state':
            key = body.get('key') if isinstance(body, dict) else None
            value = body.get('value') if isinstance(body, dict) else None
            if not isinstance(key, str) or not key or len(key) > 120 or not isinstance(value, str) or len(value) > 2 * 1024 * 1024:
                raise ValueError('Invalid station state payload')
            db.execute('INSERT OR REPLACE INTO station_state VALUES (?,?,strftime(\'%s\',\'now\'))', (key, value))
            return {'saved': key}
        if method == 'GET' and path == '/local-api/records':
            return {'records': [json.loads(row[0]) for row in db.execute('SELECT payload FROM records')]}
        if method == 'GET' and path.startswith('/local-api/evidence/'):
            row = db.execute('SELECT metadata,image FROM evidence WHERE id=?', (unquote(path.split('/')[-1]),)).fetchone()
            return {'evidence': {**json.loads(row[0]), 'image': base64.b64encode(row[1]).decode()} if row else None}
        if method == 'POST' and path == '/local-api/records':
            record = body['record']
            if not isinstance(record.get('id'), str) or not record['id'] or not record.get('sessionId'):
                raise ValueError('Record ID and session required')
            evidence = body.get('evidence')
            if evidence:
                if evidence.get('id') != record.get('capturedImageId'):
                    raise ValueError('Evidence ID mismatch')
                raw = base64.b64decode(evidence['image'], validate=True)
                if not raw or len(raw) > 10 * 1024 * 1024:
                    raise ValueError('Invalid image size')
                metadata = {k: v for k, v in evidence.items() if k != 'image'}
                db.execute('INSERT OR REPLACE INTO evidence VALUES (?,?,?)', (evidence['id'], json.dumps(metadata), raw))
            elif record.get('capturedImageId') and not db.execute('SELECT 1 FROM evidence WHERE id=?', (record['capturedImageId'],)).fetchone():
                raise ValueError('Evidence required')
            db.execute('INSERT OR REPLACE INTO records VALUES (?,?)', (record['id'], json.dumps(record)))
            return {'saved': record['id']}
        raise ValueError('Unsupported local API operation')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--database', default=os.environ.get('TUNAEYE_DB', 'data/tunaeye.sqlite3'))
    parser.add_argument('--request', action='store_true')
    parser.add_argument('--dist', default='dist')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=3000)
    parser.add_argument('--pi', default='http://127.0.0.1:5000')
    args = parser.parse_args()
    if args.request:
        request = json.load(sys.stdin)
        print(json.dumps(execute(request['method'], request['path'], request.get('body'), args.database)))
        return

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=args.dist, **kw)

        def local_api(self):
            origin = self.headers.get('Origin')
            if origin and urlparse(origin).netloc != self.headers.get('Host'):
                self.send_error(403); return
            try:
                length = int(self.headers.get('Content-Length', 0))
                if length > 16 * 1024 * 1024:
                    self.send_error(413); return
                body = json.loads(self.rfile.read(length)) if length else None
                result = execute(self.command, urlparse(self.path).path, body, args.database)
                payload = json.dumps(result).encode()
                self.send_response(200); self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(payload)))
                self.end_headers(); self.wfile.write(payload)
            except (ValueError, KeyError, TypeError):
                self.send_error(400, 'Invalid persistence request')
            except sqlite3.Error:
                self.send_error(503, 'SQLite unavailable; keep browser outbox')

        def inference(self):
            try:
                length = int(self.headers.get('Content-Length', 0))
                if length > 16 * 1024 * 1024:
                    self.send_error(413); return
                request = Request(args.pi.rstrip('/') + self.path, data=self.rfile.read(length) if length else None,
                                  headers={'Content-Type': self.headers.get('Content-Type', '')}, method=self.command)
                try:
                    response = urlopen(request, timeout=None if urlparse(self.path).path == '/grade' else 30)
                except HTTPError as error:
                    response = error
                with response:
                    self.send_response(response.status)
                    self.send_header('Content-Type', response.headers.get('Content-Type', 'application/octet-stream'))
                    self.send_header('Cache-Control', 'no-store'); self.end_headers()
                    while chunk := response.read(16384):
                        self.wfile.write(chunk); self.wfile.flush()
            except (OSError, ValueError):
                if not self.wfile.closed:
                    self.close_connection = True

        def do_GET(self):
            path = urlparse(self.path).path
            if path.startswith('/local-api/'):
                return self.local_api()
            if path in ('/status', '/snapshot', '/stream'):
                return self.inference()
            return super().do_GET()

        def do_POST(self):
            if urlparse(self.path).path.startswith('/local-api/'):
                return self.local_api()
            if urlparse(self.path).path == '/grade':
                return self.inference()
            self.send_error(404)

    print(f'TunaEye kiosk http://{args.host}:{args.port} SQLite={Path(args.database).resolve()}', flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
