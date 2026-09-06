#!/bin/bash
# Starts the Telegram bot as a detached daemon.
cd /home/z/my-project/mini-services/tg-expense-bot

# Kill any existing bot process
pkill -9 -f "tg-expense-bot/src/index.ts" 2>/dev/null
sleep 1

# Start the bot fully detached
nohup setsid bun run dev > /home/z/my-project/bot.log 2>&1 < /dev/null &
PID=$!
disown

# Wait for the bot to connect to Telegram (up to 20s)
for i in $(seq 1 20); do
  if grep -q "started with long polling" /home/z/my-project/bot.log 2>/dev/null; then
    echo "Bot connected to Telegram (pid $PID)"
    exit 0
  fi
  if ! kill -0 $PID 2>/dev/null; then
    echo "Bot process died during startup"
    echo "=== bot.log ==="
    tail -20 /home/z/my-project/bot.log
    exit 1
  fi
  sleep 1
done

echo "Bot did not confirm startup in 20s"
echo "=== bot.log ==="
tail -20 /home/z/my-project/bot.log
exit 1
