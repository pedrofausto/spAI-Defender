/**
 * Security Badge
 * Injeta badge de segurança nas páginas
 */

export class SecurityBadge {
  constructor() {
    this.badge = null;
    this.isVisible = false;
    this.currentRiskLevel = 'UNKNOWN';
  }

  /**
   * Cria e exibe o badge
   */
  create(riskLevel, riskScore, indicators = []) {
    if (this.badge) {
      this.remove();
    }

    this.currentRiskLevel = riskLevel;
    
    const badge = document.createElement('div');
    badge.id = 'spai-security-badge';
    badge.className = `spai-badge spai-risk-${riskLevel.toLowerCase()}`;
    
    badge.innerHTML = `
      <div class="spai-badge-header">
        <span class="spai-badge-icon">🛡️</span>
        <span class="spai-badge-title">spAI Security</span>
        <button class="spai-badge-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="spai-badge-body">
        <div class="spai-risk-indicator">
          <div class="spai-risk-level">Risk: ${riskLevel}</div>
          <div class="spai-risk-score">${riskScore}/100</div>
          <div class="spai-risk-bar">
            <div class="spai-risk-fill" style="width: ${riskScore}%"></div>
          </div>
        </div>
        ${indicators.length > 0 ? `
          <div class="spai-indicators">
            ${indicators.slice(0, 3).map(ind => `<span class="spai-indicator">${ind}</span>`).join('')}
          </div>
        ` : ''}
        <div class="spai-badge-footer">
          <button class="spai-action-btn" onclick="chrome.runtime.sendMessage({type: 'SHOW_DETAILS'})">
            View Details
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(badge);
    this.badge = badge;
    this.isVisible = true;

    // Auto-hide após 10 segundos se LOW risk
    if (riskLevel === 'LOW' && riskScore < 30) {
      setTimeout(() => this.remove(), 10000);
    }

    // Adiciona estilos se ainda não foram adicionados
    this.injectStyles();
  }

  /**
   * Remove o badge
   */
  remove() {
    if (this.badge) {
      this.badge.remove();
      this.badge = null;
      this.isVisible = false;
    }
  }

  /**
   * Atualiza o badge
   */
  update(riskLevel, riskScore, indicators = []) {
    if (!this.badge) {
      this.create(riskLevel, riskScore, indicators);
      return;
    }

    this.currentRiskLevel = riskLevel;
    const body = this.badge.querySelector('.spai-badge-body');
    
    if (body) {
      body.innerHTML = `
        <div class="spai-risk-indicator">
          <div class="spai-risk-level">Risk: ${riskLevel}</div>
          <div class="spai-risk-score">${riskScore}/100</div>
          <div class="spai-risk-bar">
            <div class="spai-risk-fill" style="width: ${riskScore}%"></div>
          </div>
        </div>
        ${indicators.length > 0 ? `
          <div class="spai-indicators">
            ${indicators.slice(0, 3).map(ind => `<span class="spai-indicator">${ind}</span>`).join('')}
          </div>
        ` : ''}
        <div class="spai-badge-footer">
          <button class="spai-action-btn">View Details</button>
        </div>
      `;
    }
  }

  /**
   * Injeta estilos CSS
   */
  injectStyles() {
    if (document.getElementById('spai-badge-styles')) {
      return; // Já foi injetado
    }

    const style = document.createElement('style');
    style.id = 'spai-badge-styles';
    style.textContent = `
      #spai-security-badge {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 280px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from { transform: translateX(320px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      #spai-security-badge .spai-badge-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
        background: #f8f9fa;
        border-radius: 12px 12px 0 0;
      }

      #spai-security-badge .spai-badge-icon {
        font-size: 20px;
        margin-right: 8px;
      }

      #spai-security-badge .spai-badge-title {
        flex: 1;
        font-weight: 600;
        font-size: 14px;
        color: #202124;
      }

      #spai-security-badge .spai-badge-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #5f6368;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }

      #spai-security-badge .spai-badge-close:hover {
        background: #e0e0e0;
      }

      #spai-security-badge .spai-badge-body {
        padding: 16px;
      }

      #spai-security-badge .spai-risk-indicator {
        margin-bottom: 12px;
      }

      #spai-security-badge .spai-risk-level {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      #spai-security-badge .spai-risk-score {
        font-size: 12px;
        color: #5f6368;
        margin-bottom: 8px;
      }

      #spai-security-badge .spai-risk-bar {
        height: 6px;
        background: #e0e0e0;
        border-radius: 3px;
        overflow: hidden;
      }

      #spai-security-badge .spai-risk-fill {
        height: 100%;
        transition: width 0.3s ease;
      }

      #spai-security-badge.spai-risk-low .spai-risk-level { color: #34a853; }
      #spai-security-badge.spai-risk-low .spai-risk-fill { background: #34a853; }

      #spai-security-badge.spai-risk-medium .spai-risk-level { color: #fbbc04; }
      #spai-security-badge.spai-risk-medium .spai-risk-fill { background: #fbbc04; }

      #spai-security-badge.spai-risk-high .spai-risk-level { color: #ea4335; }
      #spai-security-badge.spai-risk-high .spai-risk-fill { background: #ea4335; }

      #spai-security-badge.spai-risk-critical .spai-risk-level { color: #d93025; }
      #spai-security-badge.spai-risk-critical .spai-risk-fill { background: #d93025; }

      #spai-security-badge .spai-indicators {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }

      #spai-security-badge .spai-indicator {
        font-size: 11px;
        padding: 4px 8px;
        background: #f1f3f4;
        border-radius: 4px;
        color: #5f6368;
      }

      #spai-security-badge .spai-badge-footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e0e0e0;
      }

      #spai-security-badge .spai-action-btn {
        width: 100%;
        padding: 8px 12px;
        background: #4285f4;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }

      #spai-security-badge .spai-action-btn:hover {
        background: #3367d6;
      }
    `;

    document.head.appendChild(style);
  }
}

export default SecurityBadge;

