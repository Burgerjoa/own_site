/* ============================================
   Common JS - Shared utilities
   ============================================ */

// --- Theme Management ---
const ThemeManager = {
  init() {
    const saved = localStorage.getItem('theme') || 'dark';
    this.set(saved);
    
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        this.set(current === 'light' ? 'dark' : 'light');
      });
    }
  },

  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }
  }
};

// --- Toast Notifications ---
const Toast = {
  _el: null,
  _timeout: null,

  show(message, duration = 2000) {
    if (!this._el) {
      this._el = document.createElement('div');
      this._el.className = 'toast';
      document.body.appendChild(this._el);
    }

    clearTimeout(this._timeout);
    this._el.textContent = message;
    this._el.classList.add('show');

    this._timeout = setTimeout(() => {
      this._el.classList.remove('show');
    }, duration);
  }
};

// --- Copy to Clipboard ---
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    Toast.show('클립보드에 복사되었습니다 ✓');
    return true;
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    Toast.show('클립보드에 복사되었습니다 ✓');
    return true;
  }
}

// --- Search Filter (Main page) ---
const SearchFilter = {
  init() {
    const input = document.querySelector('#searchInput');
    if (!input) return;

    input.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const cards = document.querySelectorAll('.tool-card');
      const sections = document.querySelectorAll('.category-section');

      cards.forEach(card => {
        const title = card.getAttribute('data-title') || '';
        const desc = card.getAttribute('data-desc') || '';
        const match = !query || title.includes(query) || desc.includes(query);
        card.style.display = match ? '' : 'none';
      });

      // Hide empty sections
      sections.forEach(section => {
        const visibleCards = section.querySelectorAll('.tool-card:not([style*="display: none"])');
        section.style.display = visibleCards.length > 0 ? '' : 'none';
      });
    });
  }
};

// --- AI API Client ---
const AIClient = {
  _baseUrl: (() => {
    const saved = localStorage.getItem('ai_api_url');
    // 이전에 저장된 주소가 11434 거나 예전 클라우드플레어 주소면 무시하고 새 주소 강제 적용
    if (saved && saved.includes('11434')) {
      localStorage.removeItem('ai_api_url');
    }
    const currentSaved = localStorage.getItem('ai_api_url');
    return currentSaved || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8000' : 'https://concepts-degree-aquarium-success.trycloudflare.com');
  })(),
  _model: localStorage.getItem('ai_model') || 'llama3.1:8b',

  getConfig() {
    return {
      baseUrl: this._baseUrl,
      model: this._model
    };
  },

  setConfig(baseUrl, model) {
    this._baseUrl = baseUrl;
    this._model = model;
    localStorage.setItem('ai_api_url', baseUrl);
    localStorage.setItem('ai_model', model);
  },

  async checkStatus() {
    try {
      const res = await fetch(`${this._baseUrl}/health`, {
        signal: AbortSignal.timeout(3000)
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async generate(prompt, options = {}) {
    const res = await fetch(`${this._baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this._model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          ...options
        }
      })
    });

    if (!res.ok) throw new Error('AI 서버 응답 오류');
    const data = await res.json();
    return data.response;
  },

  async generateStream(prompt, onToken, options = {}) {
    const res = await fetch(`${this._baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this._model,
        prompt: prompt,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          ...options
        }
      })
    });

    if (!res.ok) throw new Error('AI 서버 응답 오류');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            fullText += json.response;
            onToken(json.response, fullText);
          }
        } catch {}
      }
    }

    return fullText;
  }
};

// --- Initialize on DOM ready ---
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  SearchFilter.init();
});
