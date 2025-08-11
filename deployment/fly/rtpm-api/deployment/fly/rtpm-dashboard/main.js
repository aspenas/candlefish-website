const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>RTPM Analytics Dashboard API</h1><p>Multi-tenant analytics system deployed on Fly.io</p>');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF < /dev/null
