# RecallOS Extension Testing Guide

## Overview
The RecallOS Chrome extension has been updated to use the same search functionality as the frontend application. It automatically injects relevant memories into ChatGPT conversations.

## Key Updates Made

### 1. Search Endpoint Integration
- **Updated**: `getMemorySummary()` function now uses the same `/search` endpoint as the frontend
- **Added**: Proper request structure with `contextOnly: false` parameter
- **Enhanced**: Better error handling and logging for debugging

### 2. Response Handling
- **Improved**: Handles the same response structure as the frontend (`answer`, `meta_summary`, `results`)
- **Added**: Comprehensive logging to track search requests and responses
- **Enhanced**: Fallback logic for different response types

### 3. Health Check Updates
- **Updated**: `checkApiHealth()` function uses the same search endpoint structure
- **Added**: Proper parameter structure for health checks

### 4. Debug Functions
- **Added**: `testRecallOSSearch(query)` - Test search functionality directly
- **Added**: `checkRecallOSStatus()` - Check extension status and configuration
- **Added**: Enhanced logging throughout the search process

## Testing the Extension

### 1. Load the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `/Users/art3mis/Developer/RecallOS/extension/dist` folder
4. The RecallOS extension should appear in your extensions list

### 2. Configure the Extension
1. Click the RecallOS extension icon in your browser toolbar
2. Set the API endpoint to: `http://localhost:3000/api/memory/process`
3. Set your wallet address: `0x01b7b2bc30c958ba3bc0852bf1bd4efb165281ba`
4. Click "Save Configuration"

### 3. Test on ChatGPT
1. Go to `https://chatgpt.com`
2. Look for the RecallOS icon (star/sparkle icon) next to the input field
3. Type a query like "what is storacha" or "test search"
4. Wait 1.5 seconds - the extension should automatically inject relevant memories
5. The input should be updated with: `[RecallOS Memory Context]` followed by the memory summary

### 4. Debug Functions (Open Browser Console)
```javascript
// Test search functionality directly
await testRecallOSSearch("what is storacha");

// Check extension status
await checkRecallOSStatus();

// Test memory injection with current input text
await testMemoryInjection();

// Debug ChatGPT elements
debugRecallOS();
```

## Expected Behavior

### Successful Search
- Extension detects ChatGPT input field
- Shows RecallOS icon next to input
- Automatically searches memories when you type (1.5s delay)
- Injects memory context into your message
- Icon changes color to indicate status (yellow = processing, green = success, gray = no results)

### Search Response Structure
The extension now handles the same response structure as the frontend:
```json
{
  "query": "user query",
  "results": [...],
  "answer": "AI-generated answer based on memories",
  "meta_summary": "Summary of relevant memories",
  "citations": [...],
  "job_id": "optional-job-id"
}
```

## Troubleshooting

### If Extension Doesn't Work
1. Check browser console for errors
2. Verify API endpoint is correct: `http://localhost:3000/api/memory/process`
3. Verify wallet address is set correctly
4. Test API health: `await checkRecallOSStatus()`

### If Search Returns No Results
1. Check if backend is running on `http://localhost:3000`
2. Verify the wallet address has memories in the database
3. Test search directly: `await testRecallOSSearch("test query")`

### If Icon Doesn't Appear
1. Refresh the ChatGPT page
2. Check if extension is enabled in `chrome://extensions/`
3. Try the debug function: `debugRecallOS()`

## API Endpoint Structure
The extension now uses the same endpoint structure as the frontend:
- **Base URL**: `http://localhost:3000/api/memory/process` (from extension settings)
- **Search URL**: `http://localhost:3000/api/search` (automatically derived)
- **Request**: POST with `{wallet, query, limit, contextOnly: false}`
- **Response**: Same structure as frontend search results

This ensures consistency between the web application and the Chrome extension.
