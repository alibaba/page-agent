# Native Messaging Host for page-agent

This package provides a Native Messaging Host that allows external applications (such as AI agents running in Docker or on remote servers) to control the page-agent extension via HTTP or WebSocket.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  External Agent (Python, Node.js, etc.)                     │
│  - HTTP Client or WebSocket                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Native Messaging Host (Node.js)                            │
│  - HTTP Server (port 1133) or WebSocket                     │
│  - Chrome Native Messaging Protocol                         │
└─────────────────────────────────────────────────────────────┘
                           │ chrome.runtime.connectNative
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  page-agent Extension (Chrome Extension)                    │
│  - background.ts (Service Worker)                           │
│  - content.ts (PageController)                              │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Build the Native Host

```bash
cd packages/launcher
npm install
npm run build
```

### Register the Native Messaging Host

#### macOS/Linux

```bash
# Create the Native Messaging Host directory
mkdir -p ~/.config/google-chrome/NativeMessagingHosts

# Create the manifest file
cat > ~/.config/google-chrome/NativeMessagingHosts/page-agent.launcher.json << EOF
{
    "name": "page-agent.launcher",
    "description": "page-agent Native Messaging Host",
    "path": "/absolute/path/to/page-agent/packages/launcher/dist/index.js",
    "type": "stdio",
    "allowed_origins": [
        "chrome-extension://<your-extension-id>/"
    ]
}
EOF
```

**Note:** Replace `<your-extension-id>` with your actual extension ID. You can find it by:
1. Going to `chrome://extensions/`
2. Enabling "Developer mode"
3. Copying the ID of the page-agent extension

#### Windows

```powers759
# Create the manifest file in the appropriate location
# For Chrome: %LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\page-agent.launcher.json
```

## Usage

### HTTP Mode

Start the Native Host:

```bash
node dist/index.js
```

Send commands via HTTP:

```bash
# Get page state
curl -X POST http://localhost:1133/command \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req-1",
    "tabId": 123,
    "action": "GET_STATE",
    "payload": {}
  }'

# Click element
curl -X POST http://localhost:1133/command \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req-2",
    "tabId": 123,
    "action": "CLICK",
    "payload": {"index": 5}
  }'

# Input text
curl -X POST http://localhost:1133/command \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "req-3",
    "tabId": 123,
    "action": "TYPE",
    "payload": {"index": 2, "text": "Hello World"}
  }'
```

### API Reference

| Action | Payload | Description |
|--------|---------|-------------|
| `GET_STATE` | `{}` | Get page state (URL, title, interactive elements) |
| `CLICK` | `{index: number}` | Click element at index |
| `TYPE` | `{index: number, text: string}` | Input text into element |
| `SELECT_OPTION` | `{index: number, optionText: string}` | Select dropdown option |
| `SCROLL` | `{down: boolean, numPages?: number, pixels?: number}` | Scroll vertically |
| `SCROLL_HORIZONTALLY` | `{right: boolean, pixels: number}` | Scroll horizontally |
| `SCREENSHOT` | `{}` | Capture tab screenshot |
| `EXECUTE_JS` | `{script: string}` | Execute JavaScript |

## Python Example

```python
import requests

def send_command(action, payload, tab_id=123):
    response = requests.post(
        'http://localhost:1133/command',
        json={
            'requestId': f'req-{int(time.time())}',
            'tabId': tab_id,
            'action': action,
            'payload': payload
        }
    )
    return response.json()

# Get page state
state = send_command('GET_STATE', {})
print(f"Page URL: {state['result']['url']}")
print(f"Elements: {len(state['result']['elements'])} interactive elements")

# Click first button
if state['result']['elements']:
    send_command('CLICK', {'index': 0})
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build
```

## License

MIT - Same as page-agent
