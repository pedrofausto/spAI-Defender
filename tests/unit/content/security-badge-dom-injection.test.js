import { SecurityBadge } from '../../../chrome-extension/src/content/security-badge.js';

describe('SecurityBadge DOM injection resistance', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    global.chrome = {
      runtime: {
        sendMessage: jest.fn()
      }
    };
  });

  test('renders untrusted indicators as text instead of HTML', () => {
    const badge = new SecurityBadge();
    const payload = '<img src=x onerror="window.__spaiInjected=true">';

    badge.create('HIGH', 90, [payload]);

    expect(document.querySelector('#spai-security-badge img')).toBeNull();
    expect(document.querySelector('.spai-indicator').textContent).toBe(payload);
    expect(window.__spaiInjected).toBeUndefined();
  });

  test('updates untrusted indicators as text instead of HTML', () => {
    const badge = new SecurityBadge();
    const payload = '<svg onload="window.__spaiInjected=true"></svg>';

    badge.create('LOW', 10, []);
    badge.update('HIGH', 95, [payload]);

    expect(document.querySelector('#spai-security-badge svg')).toBeNull();
    expect(document.querySelector('.spai-indicator').textContent).toBe(payload);
    expect(window.__spaiInjected).toBeUndefined();
  });
});
