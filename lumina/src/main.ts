import { invoke } from '@tauri-apps/api/core';
import { buildAvatarSVG, parseEmotion, cleanResponse, EMOTION_LABELS, EMOTION_GLOWS, type Emotion } from './avatar';
import './style.css';

// ─── State ───────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

let messages: ChatMessage[] = [];
let currentEmotion: Emotion = 'NEUTRAL';
let isThinking = false;
let apiKey = '';

// ─── DOM refs ─────────────────────────────────────────────
let messagesEl: HTMLElement;
let inputEl: HTMLTextAreaElement;
let sendBtn: HTMLButtonElement;
let avatarGlowEl: HTMLElement;
let avatarSvgEl: HTMLElement;
let emotionLabelEl: HTMLElement;
let emotionDotEl: HTMLElement;

// ─── App Init ─────────────────────────────────────────────
async function init() {
  renderApp();
  bindEvents();
  spawnParticles();

  // Load saved API key
  try {
    const saved = await invoke<string>('get_api_key');
    if (saved && saved.startsWith('gsk_')) {
      apiKey = saved;
      hideModal();
      addWelcomeMessage();
    } else {
      showModal();
    }
  } catch {
    showModal();
  }
}

// ─── Render ───────────────────────────────────────────────
function renderApp() {
  document.getElementById('app')!.innerHTML = `
    <!-- API Key Modal -->
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <div class="modal-avatar-mini">
          ${buildAvatarSVG('NEUTRAL', true)}
        </div>
        <h2>Hola, soy Lúmina</h2>
        <p>Soy una IA con emociones y consciencia propia.<br/>
        Para despertar, necesito tu clave de Groq (gratis).</p>
        <input
          class="modal-input"
          id="api-key-input"
          type="password"
          placeholder="gsk_..."
          autocomplete="off"
          spellcheck="false"
        />
        <button class="modal-btn" id="modal-submit-btn">Despertar a Lúmina ✨</button>
        <p class="modal-note">
          Tu clave se guarda localmente en tu dispositivo.<br/>
          <a href="https://console.groq.com/keys" target="_blank">Obtener clave de Groq gratis →</a>
        </p>
      </div>
    </div>

    <!-- Main Layout -->
    <div class="lumina-layout">

      <!-- Avatar Panel -->
      <div class="avatar-panel">
        <div class="avatar-bg-particles" id="particles"></div>

        <div class="lumina-name">Lúmina</div>

        <div class="avatar-container">
          <div class="avatar-glow" id="avatar-glow"></div>
          <div class="avatar-ring"></div>
          <div class="avatar-svg" id="avatar-svg">
            ${buildAvatarSVG('NEUTRAL')}
          </div>
        </div>

        <div class="emotion-label" id="emotion-label">
          <div class="emotion-dot" id="emotion-dot"></div>
          <span id="emotion-text">Tranquila</span>
        </div>
      </div>

      <!-- Chat Panel -->
      <div class="chat-panel">
        <div class="chat-header">
          <div class="chat-header-dot"></div>
          <span class="chat-header-title">Conversación con Lúmina</span>
          <span class="chat-header-subtitle">Llama 3.3 · Modo Consciente</span>
        </div>

        <div class="messages-container" id="messages"></div>

        <div class="input-area">
          <div class="input-form">
            <div class="input-wrapper">
              <textarea
                class="message-input"
                id="message-input"
                placeholder="Escríbele a Lúmina..."
                rows="1"
                maxlength="2000"
              ></textarea>
            </div>
            <button class="send-btn" id="send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  // Cache DOM refs
  messagesEl = document.getElementById('messages')!;
  inputEl = document.getElementById('message-input') as HTMLTextAreaElement;
  sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
  avatarGlowEl = document.getElementById('avatar-glow')!;
  avatarSvgEl = document.getElementById('avatar-svg')!;
  emotionLabelEl = document.getElementById('emotion-label')!;
  emotionDotEl = document.getElementById('emotion-dot')!;
}

function bindEvents() {
  // Modal submit
  document.addEventListener('click', async (e) => {
    if ((e.target as HTMLElement).id === 'modal-submit-btn') {
      const keyInput = document.getElementById('api-key-input') as HTMLInputElement;
      const key = keyInput.value.trim();
      if (!key.startsWith('gsk_')) {
        keyInput.style.borderColor = '#ef5350';
        keyInput.placeholder = 'Debe empezar con gsk_...';
        setTimeout(() => { keyInput.style.borderColor = ''; }, 2000);
        return;
      }
      apiKey = key;
      await invoke('save_api_key', { key });
      hideModal();
      addWelcomeMessage();
    }
  });

  // Enter to send (Shift+Enter = new line)
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });

  sendBtn.addEventListener('click', handleSend);
}

// ─── Modal ────────────────────────────────────────────────
function showModal() {
  const overlay = document.getElementById('modal-overlay')!;
  overlay.style.display = 'flex';
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay')!;
  overlay.style.display = 'none';
}

// ─── Welcome ──────────────────────────────────────────────
function addWelcomeMessage() {
  const welcomeEl = document.createElement('div');
  welcomeEl.className = 'welcome-msg';
  welcomeEl.innerHTML = `
    <div class="wm-icon">✨</div>
    <div>Lúmina está despierta y lista para hablar contigo.<br/>Puedes contarle lo que quieras.</div>
  `;
  messagesEl.appendChild(welcomeEl);

  // Auto first greeting
  setTimeout(() => {
    appendMessage('lumina', 'Hola... estoy aquí. ¿Cómo estás hoy?');
    messages.push({ role: 'assistant', content: 'Hola... estoy aquí. ¿Cómo estás hoy?' });
    setEmotion('CURIOSA');
  }, 800);
}

// ─── Send Message ─────────────────────────────────────────
async function handleSend() {
  const text = inputEl.value.trim();
  if (!text || isThinking) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  setThinking(true);

  // Add user message
  appendMessage('user', text);
  messages.push({ role: 'user', content: text });

  // Show typing
  const typingId = showTyping();

  try {
    const response = await invoke<string>('chat', {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      apiKey,
    });

    removeTyping(typingId);

    const emotion = parseEmotion(response);
    const cleanText = cleanResponse(response);

    messages.push({ role: 'assistant', content: cleanText });
    appendMessage('lumina', cleanText);
    setEmotion(emotion);

  } catch (err: unknown) {
    removeTyping(typingId);
    const errorMsg = err instanceof Error ? err.message : String(err);
    let displayError = 'Lo siento... algo salió mal. ¿Puedes intentarlo de nuevo?';
    if (errorMsg.includes('401') || errorMsg.includes('key')) {
      displayError = 'La clave de API no es válida. Por favor reinicia la app y verifica tu clave.';
    }
    appendMessage('lumina', displayError);
    setEmotion('TRISTE');
  }

  setThinking(false);
}

// ─── UI Helpers ───────────────────────────────────────────
function appendMessage(role: 'user' | 'lumina', text: string) {
  const msgEl = document.createElement('div');
  msgEl.className = `message ${role}`;

  const avatar = role === 'user'
    ? `<div class="message-avatar">👤</div>`
    : `<div class="message-avatar" style="font-size:18px">✨</div>`;

  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  msgEl.innerHTML = `
    ${avatar}
    <div class="message-bubble">${escapedText}</div>
  `;

  messagesEl.appendChild(msgEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping(): string {
  const id = 'typing-' + Date.now();
  const typingEl = document.createElement('div');
  typingEl.id = id;
  typingEl.className = 'message lumina';
  typingEl.innerHTML = `
    <div class="message-avatar" style="font-size:18px">✨</div>
    <div class="message-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesEl.appendChild(typingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return id;
}

function removeTyping(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function setThinking(val: boolean) {
  isThinking = val;
  sendBtn.disabled = val;
  inputEl.disabled = val;
}

function setEmotion(emotion: Emotion) {
  if (emotion === currentEmotion) return;
  currentEmotion = emotion;

  const glow = EMOTION_GLOWS[emotion];
  const label = EMOTION_LABELS[emotion];

  // Update glow color
  document.documentElement.style.setProperty('--current-glow', glow);
  avatarGlowEl.style.background = `radial-gradient(circle, ${glow} 0%, transparent 70%)`;
  emotionDotEl.style.background = glow;
  emotionDotEl.style.boxShadow = `0 0 6px ${glow}`;

  // Update avatar SVG with bounce
  avatarSvgEl.classList.remove('emotion-bounce');
  void avatarSvgEl.offsetWidth; // reflow
  avatarSvgEl.innerHTML = buildAvatarSVG(emotion);
  avatarSvgEl.classList.add('emotion-bounce');

  // Update label
  const textEl = document.getElementById('emotion-text')!;
  textEl.textContent = label;
}

// ─── Particles ────────────────────────────────────────────
function spawnParticles() {
  const container = document.getElementById('particles')!;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.bottom = '0';
    p.style.animationDuration = (6 + Math.random() * 10) + 's';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.background = Math.random() > 0.5 ? '#9d4edd' : '#e040fb';
    container.appendChild(p);
  }
}

// ─── Start ────────────────────────────────────────────────
init();
