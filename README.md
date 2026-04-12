# Chat Token Counter

Disclaimer: This plugin is made a 100% by Claude. I can't code.

A minimal [SillyTavern](https://github.com/SillyTavern/SillyTavern) extension that displays the total token count of the current chat, broken down into chat and preset tokens. Always visible just above the message input.

![screenshot](Screenshots/screenshot.jpg)

## Features

- Shows total token count with a breakdown: **chat tokens** (messages) and **preset tokens** (system prompt, character card, lorebook, author's notes, etc.)
- Uses your active tokenizer for accurate counts
- Updates automatically on send, receive, edit, delete, swipe, and chat switch
- Lightweight — no settings, no dependencies

## Installation

1. Open SillyTavern and go to **Extensions** > **Install Extension**
2. Paste this URL:
   ```
   https://github.com/diamond-shark-art/st_token_counter
   ```
3. Click **Install** and reload the page

Or clone manually:

```bash
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/diamond-shark-art/st_token_counter
```

## Usage

Open any chat. A token counter appears at the bottom of the screen, just above the message textarea.

- **Before first generation:** displays `Chat tokens: N` (chat messages only)
- **After first generation:** displays `Total tokens: X (Y chat - Z preset)` with the full breakdown
