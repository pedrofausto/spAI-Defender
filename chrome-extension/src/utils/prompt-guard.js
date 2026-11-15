/**
 * Prompt Guard
 * Helpers that keep untrusted page or message text separate from trusted prompt instructions.
 */

const UNTRUSTED_TOKEN_PATTERN = /UNTRUSTED_CONTENT(?:_[A-Za-z0-9]*)*/g;

/**
 * Create a random per-request nonce used to build unguessable delimiters.
 * Uses Web Crypto when available and falls back to Math.random otherwise.
 * @returns {string} 32 character lowercase hex string
 */
export function createPromptNonce() {
  const bytes = new Uint8Array(16);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the start and end markers for an untrusted block.
 * @param {string} nonce - Per-request nonce
 * @returns {{ start: string, end: string }}
 */
export function untrustedMarkers(nonce) {
  return {
    start: `UNTRUSTED_CONTENT_${nonce}_START`,
    end: `UNTRUSTED_CONTENT_${nonce}_END`
  };
}

/**
 * Remove delimiter-like tokens from untrusted text so it cannot forge a block boundary.
 * Every marker form is removed, including markers built from any nonce.
 * @param {*} text - Untrusted value
 * @returns {string}
 */
export function sanitizeUntrustedText(text) {
  const value = text === undefined || text === null ? '' : String(text);
  return value.replace(UNTRUSTED_TOKEN_PATTERN, '');
}

/**
 * Coerce a value to a string and cap its length.
 * @param {*} value - Input value
 * @param {number} maxLength - Maximum number of characters to keep
 * @returns {string}
 */
export function capText(value, maxLength) {
  const text = value === undefined || value === null ? '' : String(value);
  return text.slice(0, maxLength);
}
