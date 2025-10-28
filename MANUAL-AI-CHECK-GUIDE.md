# How to Manually Check Chrome Built-in AI Availability

## Quick Check (30 seconds)

### Method 1: Chrome Flags
1. Open Chrome
2. Navigate to: `chrome://flags`
3. Search for: `prompt-api-for-gemini-nano`
4. Status should show: **Enabled**
5. If it says "Enabled", Chrome will restart automatically

### Method 2: Chrome Console
1. Open any website
2. Press F12 to open DevTools
3. Go to Console tab
4. Type: `ai.languageModel`
5. Hit Enter
6. **If you see**: `languageModel` object → ✅ AI is available
7. **If you see**: `undefined` → ❌ AI not available

### Method 3: Extension Console
1. Go to `chrome://extensions/`
2. Find "spAI-Defender Tab Reader"
3. Click "service worker" link (under the extension)
4. Check console for:
   - `self.ai.languageModel` should not be `undefined`
   - Should see logs about AI availability

## Detailed Diagnosis

### Check 1: Feature Flag Status

```javascript
// In Chrome Console (F12)
chrome://version

// Look for:
// AI Model: Available (or Download Required)
```

### Check 2: Direct API Test

Open Chrome Console (F12) and run:

```javascript
// Test 1: Check if ai exists
console.log('AI API:', ai);

// Test 2: Check language model
console.log('Language Model:', ai?.languageModel);

// Test 3: Check availability
ai?.languageModel?.availability().then(result => {
  console.log('Availability:', result);
});

// Test 4: Check capabilities
ai?.languageModel?.capabilities().then(result => {
  console.log('Capabilities:', result);
});
```

### Check 3: Service Worker Context

1. Go to `chrome://extensions/`
2. Find "spAI-Defender Tab Reader"
3. Click "service worker"
4. In console, type:

```javascript
// Check if self.ai exists
console.log('self.ai:', self.ai);

// Check language model
console.log('languageModel:', self.ai?.languageModel);

// Test availability
self.ai?.languageModel?.availability().then(result => {
  console.log('Availability:', result);
});
```

## Common Issues & Solutions

### Issue 1: "Built-in AI API not available"

**Possible causes:**
1. Chrome version too old (need 138+)
   - **Solution**: Update Chrome
   - Check version: `chrome://version`

2. Feature flag not enabled
   - **Solution**: Enable at `chrome://flags/#prompt-api-for-gemini-nano`
   - Restart Chrome after enabling

3. Incompatible system
   - **Solution**: Check system requirements:
     - GPU with 4GB+ VRAM OR
     - CPU with 16GB+ RAM and 4+ cores

4. Model not downloaded
   - **Solution**: Click any AI button in extension
   - Allow download when prompted
   - Wait for download to complete (1-2 GB)

### Issue 2: "unavailable" when checking

**Symptoms:**
- Extension shows: "AI Status: Unavailable"

**Diagnosis:**
```javascript
// In service worker console (chrome://extensions/)
self.ai?.languageModel?.availability().then(console.log);

// Expected results:
// - 'readily' → ✅ Ready to use
// - 'after-download' → ⬇️ Needs download
// - 'no' → ❌ Not available
```

**Solutions:**

1. **If result is 'no':**
   - Check Chrome version (must be 138+)
   - Check feature flag is Enabled
   - Restart Chrome

2. **If result is 'after-download':**
   - Click any AI button in popup
   - Allow download
   - Wait for completion

3. **If undefined:**
   - Re-check feature flag
   - Restart Chrome
   - Check system compatibility

### Issue 3: Model Download Fails

**Symptoms:**
- Download stuck or fails
- Console shows download errors

**Solutions:**
```bash
# 1. Check available disk space (need 22GB+)
# Linux:
df -h

# Windows:
dir C:\

# 2. Check internet connection
# Need stable, unmetered connection

# 3. Clear Chrome cache
chrome://settings/clearBrowserData
```

## Verification Commands

### Test AI Availability
```javascript
// Run in Chrome Console (F12)
(async () => {
  const avail = await ai.languageModel.availability();
  console.log('Status:', avail);
  
  if (avail === 'readily') {
    console.log('✅ AI is ready to use');
  } else if (avail === 'after-download') {
    console.log('⬇️ AI model needs download');
  } else {
    console.log('❌ AI not available');
  }
})();
```

### Test Creating a Session
```javascript
// Run in Chrome Console (F12)
(async () => {
  try {
    const session = await ai.languageModel.create();
    console.log('✅ Session created:', session);
    
    // Test a prompt
    const response = await session.prompt('Hello!');
    console.log('✅ Response:', response);
    
    // Cleanup
    await session.destroy();
    console.log('✅ Test successful!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
```

### Test Service Worker Access
```javascript
// Run in service worker console
(async () => {
  console.log('self.ai:', self.ai);
  console.log('languageModel:', self.ai?.languageModel);
  
  if (self.ai?.languageModel) {
    const avail = await self.ai.languageModel.availability();
    console.log('Availability:', avail);
  } else {
    console.log('❌ API not available in service worker');
  }
})();
```

## Quick Checklist

- [ ] Chrome version 138 or later
- [ ] Feature flag enabled: `prompt-api-for-gemini-nano`
- [ ] Chrome restarted after enabling flag
- [ ] At least 22GB free disk space
- [ ] Compatible system (GPU 4GB+ or CPU 16GB+/4+ cores)
- [ ] Stable internet connection
- [ ] Run availability check in console

## Expected Results

### ✅ Success
```
Availability: readily
AI Status: Available
Session: Successfully created
Test prompt: Working
```

### ⬇️ Download Required
```
Availability: after-download
AI Status: Download Required
Model size: ~1-2 GB
Time: ~5-10 minutes
```

### ❌ Not Available
```
Error: Built-in AI API not available
Reason: Check feature flag, version, or compatibility
```

## Debug Output

When extension loads, you should see in console:

```
✅ Extension loaded
✅ AI Availability: readily
✅ Using Optimized Summarization API
```

If you see:

```
⚠️ Built-in AI API not available
```

Then check:
1. Feature flag
2. Chrome version
3. System compatibility
4. Service worker console for details

## Still Not Working?

1. **Check service worker logs:**
   - `chrome://extensions/` → Click "service worker"
   - Look for errors in console

2. **Verify feature flag:**
   - `chrome://flags` → Search "prompt-api"
   - Must say "Enabled"

3. **Try manual test:**
   - Run commands from "Verification Commands" section above

4. **System compatibility:**
   - Windows: Check GPU/RAM in Task Manager
   - Linux: `lspci | grep VGA` and `free -h`
   - Mac: Check About This Mac

5. **Report error:**
   - Copy full error from service worker console
   - Include Chrome version (`chrome://version`)
   - Include system specs if possible

