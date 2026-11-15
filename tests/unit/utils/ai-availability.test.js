import {
  AVAILABILITY,
  normalizeAvailability,
  isAvailabilityReady
} from '../../../chrome-extension/src/utils/ai-availability.js';

describe('ai-availability', () => {
  test('exposes exactly the four documented Chrome availability states', () => {
    expect(Object.values(AVAILABILITY).sort()).toEqual(['available', 'downloadable', 'downloading', 'unavailable']);
  });

  test.each(['unavailable', 'downloadable', 'downloading', 'available'])('keeps documented value %s', (value) => {
    expect(normalizeAvailability(value)).toBe(value);
  });

  test.each(['readily', 'after-download', 'no', '', null, undefined, 42, {}])(
    'maps legacy or unknown value %p to unavailable',
    (value) => {
      expect(normalizeAvailability(value)).toBe('unavailable');
    }
  );

  test('only the available state is ready', () => {
    expect(isAvailabilityReady('available')).toBe(true);
    expect(isAvailabilityReady('downloadable')).toBe(false);
    expect(isAvailabilityReady('downloading')).toBe(false);
    expect(isAvailabilityReady('readily')).toBe(false);
  });
});
