# Native Messaging Host Integration

## Summary

This PR adds Native Messaging Host support to page-agent, enabling external AI agents (running in Docker, on remote servers, or as separate processes) to control the browser through page-agent via HTTP or WebSocket.

## What's New

### 1. New Package: `@page-agent/launcher`

A Native Messaging Host that bridges HTTP/WebSocket requests to Chrome's Native Messaging protocol.

**Features:**
- HTTP server (default port 1133) for receiving commands
- Native Messaging protocol implementation (4-byte length prefix + JSON)
- Request/response matching with timeout handling
- Support for all page-agent actions:
  - `GET_STATE` - Get page state with interactive elements
  - `CLICK` - Click elements
  - `TYPE` - Input text (with React controlled component support)
  - `SELECT_OPTION` - Select dropdown options
  - `SCROLL` / `SCROLL_HORIZONTALLY` - Scroll pages
  - `SCREENSHOT` - Capture tab screenshots
  - `EXECUTE_JS` - Execute JavaScript code

### 2. Background Script Updates

Enhanced `background.ts` to:
- Connect to Native Messaging Host on startup
- Forward HTTP commands to content scripts
- Handle SCREENSHOT action (requires browser-level API)
- Auto-reconnect on disconnect

### 3. Installation Script

Automated script to register the Native Messaging Host with Chrome:
```bash
cd packages/launcher
npm install  # Runs install script automatically
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  External Agent (Python, Node.js, etc.)                     │
│  - HTTP Client → POST http://localhost:1133/command         │
│  - WebSocket → ws://localhost:1133/ws                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  @page-agent/launcher (Node.js Native Host)                │
│  - Express HTTP server                                      │
│  - Native Messaging protocol (stdin/stdout)                │
└─────────────────────────────────────────────────────────────┘
                           │ chrome.runtime.connectNative
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  page-agent Extension (Chrome Extension)                    │
│  ├── background.ts (Service Worker)                         │
│  │   ├── Native Messaging connection                        │
│  │   ├── captureVisibleTab for SCREENSHOT                   │
│  │   └── Message routing to content scripts                 │
│  └── content.ts (PageController)                            │
│      └── DOM manipulation                                   │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Quick Start

```bash
# Build the launcher
cd packages/launcher
npm install
npm run build

# Install Native Messaging Host manifest
npm run install  # Or: node scripts/install.js

# Start the launcher
npm start

# Test with curl
curl http://localhost:1133/health
```

### Python Example

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
print(f"Found {len(state['result']['elements'])} interactive elements")

# Click element
send_command('CLICK', {'index': 0})

# Input text
send_command('TYPE', {'index': 1, 'text': 'Hello World'})
```

## Files Changed

### New Files
- `packages/launcher/README.md` - Documentation
- `packages/launcher/package.json` - Package configuration
- `packages/launcher/tsconfig.json` - TypeScript config
- `packages/launcher/src/index.ts` - Native Messaging Host
- `packages/launcher/scripts/install.js` - Installation script

### Modified Files
- `packages/extension/src/entrypoints/background.ts` - Native Messaging integration
- `packages/extension/wxt.config.js` - Added `nativeMessaging` permission

## Security Considerations

1. **Extension ID Validation**: The Native Messaging Host manifest uses `allowed_origins` to restrict access to specific extension IDs only.

2. **Local-Only HTTP Server**: The HTTP server listens on localhost (127.0.0.1) by default, preventing external network access.

3. **No Authentication Required**: Currently, no authentication is required for HTTP requests. This is acceptable for local development but should be addressed for production use.

## Testing

### Manual Testing

1. Load the extension in Chrome (Developer mode)
2. Install the Native Messaging Host
3. Start the launcher: `npm start`
4. Test health endpoint: `curl http://localhost:1133/health`
5. Test commands:
   ```bash
   curl -X POST http://localhost:1133/command \
     -H "Content-Type: application/json" \
     -d '{"requestId":"test-1","tabId":123,"action":"GET_STATE"}'
   ```

### Automated Testing

_TODO: Add integration tests_

## Future Enhancements

1. **WebSocket Support**: Enable real-time bidirectional communication
2. **Authentication**: Add token-based auth for HTTP endpoints
3. **Multi-tab Support**: Better handling of multiple browser tabs
4. **Event Streaming**: Stream browser events (navigation, clicks) to external agents
5. **Docker Support**: Pre-built container for the launcher

## Related Issues

- Fixes #XXX: Add support for remote AI agents
- Related to #YYY: Native Messaging protocol implementation

## Checklist

- [x] Code follows page-agent style guidelines
- [x] TypeScript types are properly defined
- [x] Documentation is complete
- [x] Installation script tested on macOS/Linux
- [ ] Installation script tested on Windows
- [ ] Integration tests added
- [ ] Security review completed
