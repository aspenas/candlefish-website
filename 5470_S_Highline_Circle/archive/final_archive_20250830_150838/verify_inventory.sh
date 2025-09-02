#!/bin/bash

echo "=== Inventory Verification Script ==="
echo ""
echo "1. Local Database:"
sqlite3 inventory.db "SELECT COUNT(*) as items, printf('$%.2f', SUM(asking_price)) as value FROM items;" | awk -F'|' '{print "   Items: "$1"\n   Value: "$2}'

echo ""
echo "2. Deployed API:"
curl -s https://5470-inventory.fly.dev/api/v1/analytics/summary 2>/dev/null | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'   Items: {d[\"totalItems\"]}\n   Value: \${d[\"totalValue\"]:,.2f}')" 2>/dev/null || echo "   API Error"

echo ""
echo "3. Categories in Local DB:"
sqlite3 inventory.db "SELECT category, COUNT(*) FROM items GROUP BY category ORDER BY COUNT(*) DESC LIMIT 5;" | awk -F'|' '{printf "   %-20s %s items\n", $1, $2}'

echo ""
echo "=== Recent Additions ==="
sqlite3 inventory.db "SELECT name, asking_price FROM items ORDER BY id DESC LIMIT 5;" | awk -F'|' '{printf "   %-30s $%s\n", $1, $2}'