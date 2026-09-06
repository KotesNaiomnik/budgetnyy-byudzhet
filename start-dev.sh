#!/bin/bash
# Starts the Next.js dev server as a detached daemon that survives shell exit.
cd /home/z/my-project

# Kill any existing dev server
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
sleep 2

# Clear cache to avoid stale compilation issues
rm -rf .next

# Start the dev server fully detached
export NODE_OPTIONS="--max-old-space-size=2048"
nohup setsid bun run dev > dev.log 2>&1 < /dev/null &
PID=$!
disown

# Wait for the server to be ready (up to 30s)
for i in $(seq 1 30); do
  if curl -s -m 2 http://localhost:3000/api/auth/me > /dev/null 2>&1; then
    echo "Server is ready (pid $PID)"
    exit 0
  fi
  # Check if process is still alive
  if ! kill -0 $PID 2>/dev/null; then
    echo "Server process died during startup"
    exit 1
  fi
  sleep 1
done

echo "Server did not become ready in 30s"
exit 1
