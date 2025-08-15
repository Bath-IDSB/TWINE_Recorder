# TWINE_Recorder
A custom JavaScript add-on was implemented within the TWINE HTML to capture participants’ choices and response times for each decision point in the interactive storyline.

## Features

- **Interaction Tracking**: Records all link clicks and tab focus changes
- **Flexible Data Storage**: Supports localStorage, automatic downloads, or server uploads
- **Configurable Completion Actions**: Handle story completion with redirects or custom callbacks
- **Debug Mode**: Optional logging for development and troubleshooting
- **External API**: Programmatic access to collected data
- **No Server Dependencies**: Works completely client-side if desired

## Quick Start

### Basic Usage

1. Include the script in your Twine story or web page:
```html
<script src="TWINE_recorder.js"></script>
```

2. The recorder will automatically start tracking with default settings:
   - Participant ID: Auto-generated
   - Storage: localStorage
   - Debug mode: Off

### Configuration

Configure the recorder by setting `window.TWINE_CONFIG` before loading the script:

```html
<script>
window.TWINE_CONFIG = {
    participant_id: 'participant_001',
    condition: 'experimental',
    storage_method: 'download',
    debug: true
};
</script>
<script src="TWINE_recorder.js"></script>
```

## Configuration Options

### Basic Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `participant_id` | string | auto-generated | Unique identifier for the participant |
| `condition` | string | 'default' | Experimental condition or group identifier |
| `debug` | boolean | false | Enable console logging for debugging |

### Storage Methods

| Option | Description | Use Case |
|--------|-------------|----------|
| `'localStorage'` | Saves data to browser's localStorage | Development, single-device studies |
| `'download'` | Triggers automatic file download | Offline studies, simple data collection |
| `'server'` | Posts data to specified endpoint | Online studies with server backend |

Configure storage method:
```javascript
window.TWINE_CONFIG = {
    storage_method: 'localStorage' // or 'download' or 'server'
};
```

### Server Configuration

For server storage, specify the endpoint:
```javascript
window.TWINE_CONFIG = {
    storage_method: 'server',
    server_endpoint: '/api/twine-data' // Your server endpoint
};
```

### Completion Actions

Control what happens when the story ends:

| Action | Description | Configuration |
|--------|-------------|---------------|
| `'none'` | No action (default) | `completion_action: 'none'` |
| `'redirect'` | Redirect to URL | `completion_action: 'redirect', redirect_url: 'https://...'` |
| `'callback'` | Call custom function | `completion_action: 'callback', completion_callback: yourFunction` |

#### Redirect Example
```javascript
window.TWINE_CONFIG = {
    completion_action: 'redirect',
    redirect_url: 'https://example.com/survey?id={participant_id}'
    // {participant_id} will be replaced with actual ID
};
```

#### Callback Example
```javascript
function onStoryComplete(summary) {
    console.log('Story completed!', summary);
    // summary contains: participant_id, condition, click_count, focus_changes
}

window.TWINE_CONFIG = {
    completion_action: 'callback',
    completion_callback: onStoryComplete
};
```

## Data Format

The recorder collects data in the following format:

```json
{
    "participant_id": "participant_123",
    "condition": "experimental",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "session_duration": 120000,
    "click_history": [
        {
            "text": "Continue",
            "raw": "Continue",
            "timestamp": "2024-01-15T10:30:15.123Z"
        }
    ],
    "focus_history": [
        {
            "timestamp": 1642248615123,
            "type": "tabVisibility",
            "isVisible": false
        }
    ]
}
```

### Click History
Each click record contains:
- `text`: The visible text of the clicked link
- `raw`: The raw link attribute data
- `timestamp`: ISO timestamp of the click

### Focus History
Each focus record contains:
- `timestamp`: Unix timestamp
- `type`: Always 'tabVisibility'
- `isVisible`: Boolean indicating if tab became visible (true) or hidden (false)

## API Access

The recorder exposes a global API at `window.TWINE_RECORDER`:

```javascript
// Get current data
const clicks = TWINE_RECORDER.getClickHistory();
const focuses = TWINE_RECORDER.getFocusHistory();
const participantId = TWINE_RECORDER.getParticipantId();

// Export all data
const allData = TWINE_RECORDER.exportData();

// Manually save data
TWINE_RECORDER.saveData(); // Uses configured method
TWINE_RECORDER.saveData('download'); // Force specific method
```

## Integration Examples

### Research Study
```javascript
window.TWINE_CONFIG = {
    participant_id: new URLSearchParams(window.location.search).get('pid'),
    condition: new URLSearchParams(window.location.search).get('condition'),
    storage_method: 'server',
    server_endpoint: '/api/research-data',
    completion_action: 'redirect',
    redirect_url: 'https://survey.example.com?pid={participant_id}',
    debug: false
};
```

### Educational Assessment
```javascript
window.TWINE_CONFIG = {
    participant_id: 'student_' + Date.now(),
    condition: 'assessment_v1',
    storage_method: 'download',
    completion_action: 'callback',
    completion_callback: function(summary) {
        alert(`Assessment complete! You made ${summary.click_count} choices.`);
    },
    debug: false
};
```

### Development/Testing
```javascript
window.TWINE_CONFIG = {
    participant_id: 'dev_test',
    condition: 'debug',
    storage_method: 'localStorage',
    debug: true
};
```

## Server Implementation

If using server storage, your endpoint should accept POST requests with JSON data:

### Express.js Example
```javascript
app.post('/api/twine-data', (req, res) => {
    const data = req.body;
    
    // Validate data
    if (!data.participant_id || !data.click_history) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    
    // Save to database
    // ... your storage logic ...
    
    res.json({ success: true, saved_at: new Date().toISOString() });
});
```

### Expected Request Format
```json
{
    "participant_id": "string",
    "condition": "string",
    "timestamp": "ISO string",
    "session_duration": "number (milliseconds)",
    "click_history": "array of click objects",
    "focus_history": "array of focus objects"
}
```

## Troubleshooting

### Common Issues

1. **Data not saving**: Check browser console for errors, ensure storage method is configured correctly
2. **Story not ending**: Verify your Twine story has proper ending passages with no more links
3. **Server errors**: Check network tab in browser developer tools, verify server endpoint

### Debug Mode

Enable debug mode to see detailed logging:
```javascript
window.TWINE_CONFIG = { debug: true };
```

This will log:
- Configuration on startup
- Passage changes
- Link discoveries
- Clicks and focus changes
- Data saving operations

### Data Recovery

If using localStorage, you can manually retrieve data:
```javascript
const data = localStorage.getItem('twine_data_' + participantId);
console.log(JSON.parse(data));
```

## Browser Compatibility

- Modern browsers (Chrome 60+, Firefox 55+, Safari 12+)
- Requires ES6 support for optional chaining (`?.`)
- LocalStorage API for local storage method
- Fetch API for server storage method

## Privacy Considerations

- No personal information is collected by default
- Only interaction data (clicks, focus changes) and timestamps
- Participant IDs should be anonymized for research
- Consider GDPR/privacy requirements for your use case
- Data remains client-side unless server storage is configured

## License

This open access version is provided for educational and research purposes. Modify and distribute freely while maintaining attribution.
