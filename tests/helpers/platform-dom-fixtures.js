export function renderWhatsAppChatFixture() {
  document.body.innerHTML = `
    <main role="application">
      <section role="log">
        <div data-id="wa-msg-1" data-incoming="true">
          <span class="selectable-text">Hello from WhatsApp</span>
          <span data-testid="msg-meta" title="2026-07-10 10:00">10:00</span>
        </div>
        <div data-id="wa-msg-2">
          <span class="selectable-text">Second WhatsApp message</span>
        </div>
      </section>
    </main>
    <header data-testid="conversation-info-header">John Doe</header>
  `;
}

export function renderWhatsAppChatListFixture() {
  document.body.innerHTML = `
    <div data-testid="chatlist">
      <div role="listitem">
        <span title="Jane Smith">Jane Smith</span>
        <span data-testid="conversation-info">Latest safe message</span>
        <span data-testid="icon-unread-count">2</span>
      </div>
      <div role="listitem">
        <span title="Security Team">Security Team</span>
        <span data-testid="conversation-info">Please review this link</span>
      </div>
    </div>
  `;
}

export function renderTelegramChatFixture({ channel = false, group = false } = {}) {
  document.body.innerHTML = `
    <header class="im-page_chat-header${channel ? ' im-page_chat-header-channel' : ''}${group ? ' im-page_chat-header-group' : ''}">
      ${channel ? 'Channel Name' : group ? 'Group Name' : 'John Doe'}
    </header>
    <section class="im-page_chat-content">
      <div class="im-message im-message-in" data-mid="tg-msg-1">
        <span class="im-message_author">John Doe</span>
        <span class="im-message_text">Verified message</span>
        <span class="im-message-date" title="2026-07-10 10:00">10:00</span>
        <span class="tgico-verified"></span>
      </div>
      <div class="im-message im-message-out" data-mid="tg-msg-2">
        <span class="im-message_text">Outgoing Telegram message</span>
      </div>
    </section>
  `;
}

export function renderTelegramChatListFixture() {
  document.body.innerHTML = `
    <aside data-peer-id="chat-list">
      <div class="im-dialog">
        <span class="im-dialog_title">Secure Chat</span>
        <span class="im-dialog_message">Latest Telegram message</span>
        <span class="im-dialog--unread"></span>
        <span class="tgico-verified"></span>
      </div>
      <div class="im-dialog">
        <span class="im-dialog_name">Second Chat</span>
        <span class="im-dialog_message">Another Telegram message</span>
      </div>
    </aside>
  `;
}

export function renderTelegramChannelsFixture() {
  document.body.innerHTML = `
    <section class="im-page_chat-channel">
      <span class="im-page_chat-header">Channel Name</span>
      <span class="tgico-verified"></span>
      <span class="im-page_chat-header-count">1000</span>
    </section>
  `;
}
