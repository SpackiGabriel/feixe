import { spawn } from 'node:child_process';

// Python's http.server sends Last-Modified but no Cache-Control, so the
// browser caches ES modules heuristically and serves them without asking:
// after an edit, a stale module next to a fresh one breaks an import and
// the game never starts. `Cache-Control: no-cache` makes it revalidate
// every file (unchanged ones still come back as a cheap 304).
// Dual-stack (IPv6 + IPv4) like `python -m http.server`, so both
// localhost (::1) and 127.0.0.1 reach it.
const NO_CACHE_SERVER = `
import http.server, socket
class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
class DualStackServer(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()
print('Feixe em http://localhost:8000', flush=True)
DualStackServer(('::', 8000), Handler).serve_forever()
`;

const command = process.platform === 'win32' ? 'python' : 'python3';
const server = spawn(command, ['-c', NO_CACHE_SERVER], {
  stdio: 'inherit',
});

server.on('error', (error) => {
  console.error(`Could not start Python (${command}): ${error.message}`);
  process.exitCode = 1;
});

server.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
