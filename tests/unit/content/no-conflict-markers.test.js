import fs from 'fs';
import path from 'path';

describe('extension source hygiene', () => {
  test('content script does not contain unresolved merge conflict markers', () => {
    const sourcePath = path.join(process.cwd(), 'chrome-extension/src/content/content-script.js');
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).not.toMatch(/^<<<<<<< /m);
    expect(source).not.toMatch(/^=======\s*$/m);
    expect(source).not.toMatch(/^>>>>>>> /m);
  });
});
