#!/bin/bash
echo "Opening NANDA Genesis Dashboard..."
open genesis-dashboard.html || python3 -m http.server 8888
echo "Dashboard available at http://localhost:8888/genesis-dashboard.html"
