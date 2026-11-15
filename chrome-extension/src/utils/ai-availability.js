/**
 * Chrome built-in AI availability states.
 * Source: https://developer.chrome.com/docs/ai/get-started (Model download section).
 * The legacy strings 'readily', 'after-download' and 'no' are not part of the current API.
 */
export const AVAILABILITY = Object.freeze({
  UNAVAILABLE: 'unavailable',
  DOWNLOADABLE: 'downloadable',
  DOWNLOADING: 'downloading',
  AVAILABLE: 'available'
});

const VALID = new Set(Object.values(AVAILABILITY));

/** Returns a documented availability value, or 'unavailable' for anything else. */
export function normalizeAvailability(value) {
  return typeof value === 'string' && VALID.has(value) ? value : AVAILABILITY.UNAVAILABLE;
}

/** Only 'available' means a session can be created immediately. */
export function isAvailabilityReady(value) {
  return value === AVAILABILITY.AVAILABLE;
}
