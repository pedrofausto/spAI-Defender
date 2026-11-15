/**
 * Chrome API Mock Helper
 * Provides comprehensive mocking for Chrome Extension APIs
 */

/**
 * Setup Chrome API mocks
 * Mocks tabs, scripting, storage, runtime, and other Chrome APIs
 */
export function setupChromeMocks() {
  // Chrome tabs API mock
  global.chrome = global.chrome || {};
  global.chrome.tabs = global.chrome.tabs || {
    query: jest.fn().mockResolvedValue([
      {
        id: 1,
        url: 'https://web.whatsapp.com',
        title: 'WhatsApp Web',
        active: true
      }
    ]),
    create: jest.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
    update: jest.fn().mockResolvedValue({ id: 1, active: true }),
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    onUpdated: {
      addListener: jest.fn()
    },
    onActivated: {
      addListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn()
    }
  };

  // Chrome scripting API mock
  global.chrome.scripting = global.chrome.scripting || {
    executeScript: jest.fn().mockResolvedValue([{ result: 'execution_success' }]),
    insertCSS: jest.fn().mockResolvedValue({}),
    removeCSS: jest.fn().mockResolvedValue({})
  };

  // Chrome storage API mock
  global.chrome.storage = global.chrome.storage || {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
      clear: jest.fn().mockResolvedValue({})
    },
    session: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
      clear: jest.fn().mockResolvedValue({})
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({})
    },
    onChanged: {
      addListener: jest.fn()
    }
  };

  // Chrome runtime API mock
  global.chrome.runtime = global.chrome.runtime || {
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    lastError: null,
    id: 'mock-extension-id',
    getManifest: jest.fn().mockReturnValue({
      manifest_version: 3,
      name: 'spAI Defender',
      version: '1.0.0'
    })
  };

  // Chrome alarms API mock
  global.chrome.alarms = global.chrome.alarms || {
    create: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    getAll: jest.fn().mockResolvedValue([]),
    clear: jest.fn(),
    clearAll: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  };

  // Chrome permissions API mock
  global.chrome.permissions = global.chrome.permissions || {
    request: jest.fn().mockResolvedValue(true),
    contains: jest.fn().mockResolvedValue(true),
    getAll: jest.fn().mockResolvedValue({
      permissions: ['scripting', 'tabs']
    })
  };

  // Chrome identity API mock
  global.chrome.identity = global.chrome.identity || {
    getAuthToken: jest.fn().mockResolvedValue('mock-token-123'),
    removeCachedAuthToken: jest.fn()
  };

  // Chrome action API mock (replaces browserAction in MV3)
  global.chrome.action = global.chrome.action || {
    setIcon: jest.fn(),
    setTitle: jest.fn(),
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  };

  return global.chrome;
}

/**
 * Reset all Chrome mock calls
 */
export function resetChromeMocks() {
  if (global.chrome) {
    Object.keys(global.chrome).forEach((key) => {
      if (global.chrome[key] && typeof global.chrome[key].mockClear === 'function') {
        global.chrome[key].mockClear();
      }
    });
  }
}

/**
 * Helper to get the last mock call arguments
 */
export function getLastChromeMockCall(mockFn) {
  if (mockFn.mock && mockFn.mock.calls.length > 0) {
    return mockFn.mock.calls[mockFn.mock.calls.length - 1];
  }
  return null;
}

/**
 * Helper to setup specific storage data
 */
export function setStorageData(data) {
  if (global.chrome && global.chrome.storage) {
    global.chrome.storage.local.get = jest.fn().mockResolvedValue(data);
  }
}

export default {
  setupChromeMocks,
  resetChromeMocks,
  getLastChromeMockCall,
  setStorageData
};
