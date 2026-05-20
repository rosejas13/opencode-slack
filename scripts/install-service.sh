#!/usr/bin/env bash
set -e

SERVICE="opencode-slack.service"
UNIT_DIR="$HOME/.config/systemd/user"

echo "Installing $SERVICE as a user systemd service..."

mkdir -p "$UNIT_DIR"

# Copy and enable
cp opencode-slack.service "$UNIT_DIR/$SERVICE"
systemctl --user daemon-reload
systemctl --user enable "$SERVICE"
systemctl --user start "$SERVICE"

echo ""
echo "Done. The bot will auto-start on login and restart if it crashes."
echo ""
echo "Commands:"
echo "  systemctl --user status opencode-slack   # Check status"
echo "  systemctl --user restart opencode-slack  # Restart"
echo "  journalctl --user -u opencode-slack -f   # View logs"
