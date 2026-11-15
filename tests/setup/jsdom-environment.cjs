/**
 * jsdom test environment that exposes the jsdom instance so tests can change
 * window.location with jsdom.reconfigure(). Newer jsdom versions make
 * window.location non-configurable, so redefining it is no longer possible.
 */
const JsdomEnvironment = require('jest-environment-jsdom').default;

class ReconfigurableJsdomEnvironment extends JsdomEnvironment {
  async setup() {
    await super.setup();
    this.global.__jsdom = this.dom;
  }
}

module.exports = ReconfigurableJsdomEnvironment;
