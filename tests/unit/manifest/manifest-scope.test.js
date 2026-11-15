/**
 * Manifest scope tests: the extension must only run on WhatsApp Web and Telegram Web.
 */
import fs from 'fs';
import path from 'path';

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../chrome-extension/manifest.json'), 'utf8')
);
const SUPPORTED = ['https://web.whatsapp.com/*', 'https://web.telegram.org/*'];

describe('manifest scope', () => {
  test('limits host permissions to WhatsApp Web and Telegram Web', () => {
    expect(manifest.host_permissions).toEqual(SUPPORTED);
  });

  test('injects the content script only on the supported hosts', () => {
    expect(manifest.content_scripts).toHaveLength(1);
    expect(manifest.content_scripts[0].matches).toEqual(SUPPORTED);
  });

  test('does not request broad permissions', () => {
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain('<all_urls>');
    expect(manifest.permissions).not.toContain('tabs');
    expect(manifest.permissions).not.toContain('activeTab');
    expect(manifest.permissions.sort()).toEqual(['declarativeContent', 'offscreen', 'scripting', 'storage']);
  });
});
