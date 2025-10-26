# API Documentation

## Chrome Built-in AI Integration

### AISessionManager

The `AISessionManager` class provides a simplified interface for working with Chrome's Built-in AI Prompt API.

#### Methods

##### `checkAvailability()`
Check if the AI model is available on the device.

```javascript
const manager = new AISessionManager();
const availability = await manager.checkAvailability();
// Returns: 'readily' | 'after-download' | 'no'
```

##### `getCapabilities()`
Get information about the AI model's capabilities.

```javascript
const capabilities = await manager.getCapabilities();
// Returns: {
//   available: boolean,
//   defaultTemperature: number,
//   defaultTopK: number,
//   maxTopK: number
// }
```

##### `createSession(options)`
Create a new AI session with optional configuration.

```javascript
const session = await manager.createSession({
  temperature: 0.8,  // Controls randomness (0-1)
  topK: 40          // Number of tokens to consider
});
```

##### `prompt(promptText, session)`
Send a prompt to the AI model and get a response.

```javascript
const response = await manager.prompt('Summarize this text: ...');
```

##### `promptStreaming(promptText, onChunk, session)`
Send a prompt and receive streaming response.

```javascript
await manager.promptStreaming(
  'Analyze this content...',
  (chunk) => console.log(chunk)
);
```

##### `destroySession(session)`
Clean up and destroy an AI session.

```javascript
await manager.destroySession();
```

## Message API

### Background Script Messages

All messages follow this structure:

```javascript
{
  type: 'MESSAGE_TYPE',
  data: { /* message-specific data */ }
}
```

#### Available Messages

##### CHECK_AI_AVAILABILITY
Check if AI is available.

**Request**:
```javascript
chrome.runtime.sendMessage(
  { type: 'CHECK_AI_AVAILABILITY' },
  (response) => {
    console.log(response.availability);
  }
);
```

**Response**:
```javascript
{
  success: true,
  availability: 'readily',
  capabilities: { ... }
}
```

##### GET_TAB_CONTENT
Extract content from a tab.

**Request**:
```javascript
chrome.runtime.sendMessage({
  type: 'GET_TAB_CONTENT',
  tabId: 123  // Optional
}, (response) => {
  console.log(response.content);
});
```

**Response**:
```javascript
{
  success: true,
  content: {
    title: 'Page Title',
    url: 'https://example.com',
    text: 'Page text content...',
    headings: [...],
    links: [...],
    images: [...],
    meta: {...},
    stats: {...}
  }
}
```

##### SUMMARIZE_CONTENT
Generate a summary.

**Request**:
```javascript
chrome.runtime.sendMessage({
  type: 'SUMMARIZE_CONTENT',
  data: {
    content: 'Long text to summarize...',
    maxLength: 150  // Optional
  }
}, (response) => {
  console.log(response.summary);
});
```

##### ANALYZE_TAB_CONTENT
Analyze content with custom prompt.

**Request**:
```javascript
chrome.runtime.sendMessage({
  type: 'ANALYZE_TAB_CONTENT',
  data: {
    content: 'Content to analyze...',
    prompt: 'What are the main topics?',
    options: {
      temperature: 0.8,
      topK: 40
    }
  }
}, (response) => {
  console.log(response.analysis);
});
```

## Content Script API

### Messages to Content Script

##### EXTRACT_CONTENT
Extract all content from the current page.

```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'EXTRACT_CONTENT'
}, (response) => {
  console.log(response.content);
});
```

##### EXTRACT_SELECTION
Extract currently selected text.

```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'EXTRACT_SELECTION'
}, (response) => {
  console.log(response.selection);
});
```

##### START_MONITORING
Start monitoring page changes.

```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'START_MONITORING'
});
```

##### STOP_MONITORING
Stop monitoring page changes.

```javascript
chrome.tabs.sendMessage(tabId, {
  type: 'STOP_MONITORING'
});
```

## Error Handling

All API responses include error information when operations fail:

```javascript
{
  success: false,
  error: 'Error message describing what went wrong'
}
```

Common errors:
- `'AI model is not available on this device'`
- `'Failed to create AI session'`
- `'No active AI session'`
- `'Failed to extract content'`

## Best Practices

### Session Management
- Always check availability before creating a session
- Destroy sessions when done to free resources
- Reuse sessions for multiple prompts when possible
- Use `clone()` to preserve context with lower resource usage

### Error Handling
- Always handle both success and error cases
- Provide user-friendly error messages
- Log errors for debugging
- Implement retry logic for transient failures

### Performance
- Extract content once and reuse for multiple operations
- Use streaming for long responses
- Monitor session usage with `getSessionStats()`
- Destroy sessions promptly after use

### Privacy
- All processing happens on-device
- No data is sent to external servers
- Content is not persisted unless explicitly saved
- Sessions are isolated and secure
