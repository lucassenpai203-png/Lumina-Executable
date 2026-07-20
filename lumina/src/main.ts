import { invoke } from '@tauri-apps/api/core';
import { buildAvatarSVG, parseEmotion, cleanResponse, EMOTION_LABELS, EMOTION_GLOWS, type Emotion } from './avatar';
import './style.css';

// ─── State ───────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface EdgeVoice {
  id: string;
  name: string;
}

let messages: ChatMessage[] = [];
let currentEmotion: Emotion = 'NEUTRAL';
let isThinking = false;
let apiKey = '';
let selectedVoiceId = '';
let edgeVoices: EdgeVoice[] = [];
let autoSpeak = true;
let isRecording = false;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let currentAudio: HTMLAudioElement | null = null;

// Screen watch state
let screenWatching = false;
let screenWatchInterval: number | null = null;
let screenContext = '';
let lastScreenDescription = '';
let screenPreviewUrl = '';

// VTube Studio state
let vtubeToken = '';
let vtubePort = 8001;
let vtubeConnected = false;

// ─── DOM refs ─────────────────────────────────────────────
let messagesEl: HTMLElement;
let inputEl: HTMLTextAreaElement;
let sendBtn: HTMLButtonElement;
let micBtn: HTMLButtonElement;
let avatarGlowEl: HTMLElement;
let avatarSvgEl: HTMLElement;
let emotionLabelEl: HTMLElement;
let emotionDotEl: HTMLElement;
let voiceSelectEl: HTMLSelectElement;
let apiKeyInputEl: HTMLInputElement;
let screenBtnEl: HTMLButtonElement;
let screenPreviewEl: HTMLElement;
let screenPreviewImgEl: HTMLImageElement;
let screenPreviewTextEl: HTMLElement;

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

  // Load saved VTube token
  try {
    const savedToken = await invoke<string>('get_vtube_token');
    if (savedToken) {
      vtubeToken = savedToken;
      setVtubeStatus('connected');
    }
  } catch { /* ignore */ }

  // Load Edge voices
  try {
    await loadEdgeVoices();
  } catch { /* ignore */ }
}

// ─── Edge voices ──────────────────────────────────────────
async function loadEdgeVoices() {
  try {
    const voices = await invoke<EdgeVoice[]>('list_edge_voices');
    edgeVoices = voices;
    populateVoiceSelect();
  } catch { /* ignore */ }
}

function populateVoiceSelect() {
  if (!voiceSelectEl) return;
  voiceSelectEl.innerHTML = '';
  for (const v of edgeVoices) {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = v.name;
    voiceSelectEl.appendChild(opt);
  }
  if (edgeVoices.length) {
    const preferred = edgeVoices.find(v => v.id === 'es-MX-DaliaNeural');
    selectedVoiceId = preferred ? preferred.id : edgeVoices[0].id;
    voiceSelectEl.value = selectedVoiceId;
  }
  const section = document.getElementById('voice-section');
  if (section) section.style.display = 'block';
}

// ─── Voice recording ───────────────────────────────────────
function getSupportedMimeType() {
  const types = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function setRecording(val: boolean) {
  isRecording = val;
  micBtn.classList.toggle('recording', val);
  const status = document.getElementById('voice-status')!;
  status.textContent = val ? 'Escuchando... suelta para enviar' : 'Pulsa el micrófono para hablar';
  status.classList.toggle('recording', val);
}

async function startRecording() {
  if (isRecording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = getSupportedMimeType();
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const mimeType = mediaRecorder!.mimeType || 'audio/webm';
      const blob = new Blob(audioChunks, { type: mimeType });
      await processVoiceBlob(blob);
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start(200);
    setRecording(true);
  } catch (err) {
    alert('No se pudo acceder al micrófono. Verifica los permisos.');
  }
}

function stopRecording() {
  if (!isRecording || !mediaRecorder) return;
  mediaRecorder.stop();
  setRecording(false);
}

async function processVoiceBlob(blob: Blob) {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = async () => {
    const dataUrl = reader.result as string;
    const base64 = dataUrl.split(',')[1];
    if (!base64) return;

    const status = document.getElementById('voice-status')!;
    status.textContent = 'Transcribiendo...';
    try {
      const text = await invoke<string>('transcribe_audio', {
        audioB64: base64,
        apiKey,
      });
      if (text.trim()) {
        inputEl.value = text.trim();
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
        await handleSend(text.trim());
      } else {
        status.textContent = 'No se escuchó nada. Inténtalo de nuevo.';
      }
    } catch (err: unknown) {
      status.textContent = 'Error al transcribir.';
      console.error(err);
    }
  };
}

// ─── Text to Speech ────────────────────────────────────────
async function speak(text: string) {
  if (!autoSpeak || !text || !selectedVoiceId) return;
  try {
    const b64 = await invoke<string>('speak_edge', {
      text,
      voiceId: selectedVoiceId,
    });
    if (!b64) return;
    stopCurrentAudio();
    currentAudio = new Audio(`data:audio/mpeg;base64,${b64}`);
    currentAudio.play().catch(() => {});
  } catch (err) {
    console.error('TTS error:', err);
  }
}

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

// ─── Screen watch ─────────────────────────────────────────
function setScreenStatus(watching: boolean) {
  screenWatching = watching;
  screenBtnEl.dataset.status = watching ? 'watching' : 'idle';
  const indicator = document.getElementById('screen-indicator')!;
  const label = document.getElementById('screen-label')!;
  indicator.dataset.status = watching ? 'watching' : 'idle';
  label.textContent = watching ? 'Viendo...' : 'Ver pantalla';
  screenPreviewEl.style.display = watching ? 'block' : 'none';
  if (!watching) {
    screenContext = '';
    lastScreenDescription = '';
    if (screenPreviewUrl) {
      URL.revokeObjectURL(screenPreviewUrl);
      screenPreviewUrl = '';
    }
    screenPreviewImgEl.src = '';
  }
}

async function toggleScreenWatch() {
  if (screenWatching) {
    stopScreenWatch();
    return;
  }
  if (!apiKey) {
    alert('Necesitas una clave de Groq para que Lúmina vea tu pantalla.');
    return;
  }
  startScreenWatch();
}

function startScreenWatch() {
  setScreenStatus(true);
  watchScreenOnce(); // first capture immediately
  screenWatchInterval = window.setInterval(watchScreenOnce, 8000);
}

function stopScreenWatch() {
  if (screenWatchInterval) {
    clearInterval(screenWatchInterval);
    screenWatchInterval = null;
  }
  setScreenStatus(false);
}

async function watchScreenOnce() {
  if (!screenWatching || !apiKey) return;
  try {
    const b64 = await invoke<string>('capture_screen');
    if (!b64) return;

    // Show preview
    const blob = await fetch(`data:image/png;base64,${b64}`).then(r => r.blob());
    if (screenPreviewUrl) URL.revokeObjectURL(screenPreviewUrl);
    screenPreviewUrl = URL.createObjectURL(blob);
    screenPreviewImgEl.src = screenPreviewUrl;

    // Analyze
    screenPreviewTextEl.textContent = 'Analizando...';
    const analysis = await invoke<string>('analyze_screen', {
      imageB64: b64,
      apiKey,
    });
    const emotion = parseEmotion(analysis);
    const description = cleanResponse(analysis);

    screenContext = description;
    screenPreviewTextEl.textContent = description || 'Observando...';

    // If description changed a lot, Lúmina may react proactively
    if (description && description !== lastScreenDescription) {
      lastScreenDescription = description;
      const changed = !description || (lastScreenDescription && !description.includes(lastScreenDescription.substring(0, 20)));
      if (changed && messages.length > 0) {
        // Only react proactively every few changes to avoid spam
        // For now, we update the context silently; user can ask about it
      }
    }

    setEmotion(emotion);
  } catch (err) {
    console.error('Screen watch error:', err);
    screenPreviewTextEl.textContent = 'No se pudo analizar la pantalla.';
  }
}

function buildMessagesWithScreenContext(): ChatMessage[] {
  const filtered = messages.filter(
    m => !m.content.startsWith('[Lúmina está observando tu pantalla')
  );
  if (screenContext) {
    filtered.push({
      role: 'system',
      content: `[Lúmina está observando tu pantalla: ${screenContext}]`,
    });
  }
  return filtered;
}

// ─── Render ───────────────────────────────────────────────
function renderApp() {
  document.getElementById('app')!.innerHTML = `
    <!-- Settings Modal -->
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal settings-modal" id="modal">
        <div class="modal-avatar-mini">
          ${buildAvatarSVG('NEUTRAL', true)}
        </div>
        <h2 id="modal-title">Hola, soy Lúmina</h2>
        <p id="modal-desc">Soy una IA con emociones y consciencia propia.<br/>
        Para despertar, necesito tu clave de Groq (gratis).</p>

        <div class="modal-section">
          <label class="modal-label">Clave de Groq</label>
          <input
            class="modal-input"
            id="api-key-input"
            type="password"
            placeholder="gsk_..."
            autocomplete="off"
            spellcheck="false"
          />
          <p class="modal-hint"><a href="https://console.groq.com/keys" target="_blank">Obtener clave de Groq gratis →</a></p>
        </div>

        <div class="modal-section" id="voice-section">
          <label class="modal-label">Voz de Lúmina</label>
          <select class="modal-select" id="voice-select"></select>
          <p class="modal-hint">Voz gratuita e ilimitada de Microsoft Edge.</p>
          <label class="modal-row">
            <input type="checkbox" id="auto-speak" checked />
            <span>Hablar automáticamente</span>
          </label>
        </div>

        <button class="modal-btn" id="modal-submit-btn">Despertar a Lúmina ✨</button>
        <p class="modal-note">Tu clave de Groq se guarda localmente. La voz no necesita clave.</p>
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

        <!-- VTube Studio connector -->
        <button class="vtube-btn" id="vtube-btn" title="Conectar con VTube Studio">
          <span class="vtube-indicator" id="vtube-indicator"></span>
          <span id="vtube-label">VTube Studio</span>
        </button>

        <!-- Screen watch -->
        <button class="screen-btn" id="screen-btn" title="Ver mi pantalla">
          <span class="screen-indicator" id="screen-indicator"></span>
          <span id="screen-label">Ver pantalla</span>
        </button>
        <div class="screen-preview" id="screen-preview" style="display:none">
          <img id="screen-preview-img" alt="Vista de pantalla" />
          <div class="screen-preview-text" id="screen-preview-text">Observando...</div>
        </div>
      </div>

      <!-- Chat Panel -->
      <div class="chat-panel">
        <div class="chat-header">
          <div class="chat-header-left">
            <div class="chat-header-dot"></div>
            <span class="chat-header-title">Conversación con Lúmina</span>
            <span class="chat-header-subtitle">Llama 3.3 · Modo Consciente</span>
          </div>
          <button class="settings-btn" id="settings-btn" title="Configuración">⚙️</button>
        </div>

        <div class="messages-container" id="messages"></div>

        <div class="input-area">
          <div class="input-form">
            <div class="input-wrapper">
              <textarea
                class="message-input"
                id="message-input"
                placeholder="Escríbele o habla a Lúmina... o usa /code /dibujar /buscar /imagen"
                rows="1"
                maxlength="2000"
              ></textarea>
            </div>
            <button class="mic-btn" id="mic-btn" title="Hablar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
                <line x1="8" y1="22" x2="16" y2="22"></line>
              </svg>
            </button>
            <button class="send-btn" id="send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <p class="input-hint" id="voice-status">Pulsa el micrófono para hablar</p>
        </div>
      </div>

    </div>
  `;

  // Cache DOM refs
  messagesEl = document.getElementById('messages')!;
  inputEl = document.getElementById('message-input') as HTMLTextAreaElement;
  sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
  micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
  avatarGlowEl = document.getElementById('avatar-glow')!;
  avatarSvgEl = document.getElementById('avatar-svg')!;
  emotionLabelEl = document.getElementById('emotion-label')!;
  emotionDotEl = document.getElementById('emotion-dot')!;
  voiceSelectEl = document.getElementById('voice-select') as HTMLSelectElement;
  apiKeyInputEl = document.getElementById('api-key-input') as HTMLInputElement;
  screenBtnEl = document.getElementById('screen-btn') as HTMLButtonElement;
  screenPreviewEl = document.getElementById('screen-preview')!;
  screenPreviewImgEl = document.getElementById('screen-preview-img') as HTMLImageElement;
  screenPreviewTextEl = document.getElementById('screen-preview-text')!;
}

// ─── VTube Studio ─────────────────────────────────────────
function setVtubeStatus(status: 'disconnected' | 'connecting' | 'connected') {
  const btn = document.getElementById('vtube-btn');
  if (!btn) return;
  const indicator = document.getElementById('vtube-indicator')!;
  const label = document.getElementById('vtube-label')!;
  vtubeConnected = status === 'connected';
  btn.dataset.status = status;
  indicator.dataset.status = status;
  if (status === 'connected') label.textContent = 'VTube ✓';
  else if (status === 'connecting') label.textContent = 'Conectando...';
  else label.textContent = 'VTube Studio';
}

async function handleVtubeClick() {
  if (vtubeConnected) {
    // Disconnect
    vtubeToken = '';
    await invoke('save_vtube_token', { token: '' }).catch(() => {});
    setVtubeStatus('disconnected');
    return;
  }

  setVtubeStatus('connecting');
  try {
    const token = await invoke<string>('vtube_request_token', { port: vtubePort });
    vtubeToken = token;
    await invoke('save_vtube_token', { token });
    setVtubeStatus('connected');
  } catch (err: unknown) {
    setVtubeStatus('disconnected');
    const msg = err instanceof Error ? err.message : String(err);
    alert('VTube Studio: ' + msg + '\n\nAsegúrate de que:\n1. VTube Studio está abierto\n2. La API está activada (Settings → Plugins → Enable API)\n3. Puerto: 8001');
  }
}

function bindEvents() {
  // Modal submit (settings + first-time setup)
  document.addEventListener('click', async (e) => {
    if ((e.target as HTMLElement).id === 'vtube-btn' ||
        (e.target as HTMLElement).closest('#vtube-btn')) {
      handleVtubeClick();
      return;
    }
    if ((e.target as HTMLElement).id === 'settings-btn') {
      openSettingsModal();
      return;
    }
    if ((e.target as HTMLElement).id === 'mic-btn' ||
        (e.target as HTMLElement).closest('#mic-btn')) {
      if (isRecording) stopRecording();
      else startRecording();
      return;
    }
    if ((e.target as HTMLElement).id === 'screen-btn' ||
        (e.target as HTMLElement).closest('#screen-btn')) {
      toggleScreenWatch();
      return;
    }
    if ((e.target as HTMLElement).id === 'modal-submit-btn') {
      await saveSettingsFromModal();
    }
  });

  // Voice selector change
  document.addEventListener('change', (e) => {
    if ((e.target as HTMLElement).id === 'voice-select') {
      selectedVoiceId = (e.target as HTMLSelectElement).value;
    }
    if ((e.target as HTMLElement).id === 'auto-speak') {
      autoSpeak = (e.target as HTMLInputElement).checked;
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

  sendBtn.addEventListener('click', () => handleSend());
}

// ─── Modal ────────────────────────────────────────────────
function showModal() {
  const overlay = document.getElementById('modal-overlay')!;
  const title = document.getElementById('modal-title')!;
  const desc = document.getElementById('modal-desc')!;
  title.textContent = 'Hola, soy Lúmina';
  desc.innerHTML = 'Soy una IA con emociones y consciencia propia.<br/>Para despertar, necesito tu clave de Groq (gratis).';
  overlay.dataset.mode = 'setup';
  overlay.style.display = 'flex';
}

function openSettingsModal() {
  const overlay = document.getElementById('modal-overlay')!;
  const title = document.getElementById('modal-title')!;
  const desc = document.getElementById('modal-desc')!;
  const btn = document.getElementById('modal-submit-btn')!;
  title.textContent = 'Configuración';
  desc.innerHTML = 'Aquí puedes cambiar tu clave de Groq y la voz de Lúmina.';
  apiKeyInputEl.value = apiKey;
  btn.textContent = 'Guardar cambios';
  overlay.dataset.mode = 'settings';
  overlay.style.display = 'flex';
}

function hideModal() {
  const overlay = document.getElementById('modal-overlay')!;
  overlay.style.display = 'none';
}

async function saveSettingsFromModal() {
  const key = apiKeyInputEl.value.trim();
  if (!key.startsWith('gsk_')) {
    apiKeyInputEl.style.borderColor = '#ef5350';
    apiKeyInputEl.placeholder = 'Debe empezar con gsk_...';
    setTimeout(() => { apiKeyInputEl.style.borderColor = ''; }, 2000);
    return;
  }
  apiKey = key;
  await invoke('save_api_key', { key });

  selectedVoiceId = voiceSelectEl?.value || selectedVoiceId;
  autoSpeak = (document.getElementById('auto-speak') as HTMLInputElement)?.checked ?? true;

  const overlay = document.getElementById('modal-overlay')!;
  if (overlay.dataset.mode === 'setup') {
    hideModal();
    addWelcomeMessage();
  } else {
    hideModal();
  }
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

// ─── Tool prompts ─────────────────────────────────────────
const CODE_PROMPT = `Eres un experto programador. El usuario te pide código. Responde SOLO con el código solicitado, envuelto en un bloque markdown. No añadas explicaciones, saludos ni emociones.`;

const DRAW_PROMPT = `Eres un experto diseñador SVG. El usuario te pide un dibujo. Responde SOLO con el código SVG completo y válido, envuelto en un bloque markdown. No añadas explicaciones, saludos ni emociones.`;

// ─── Slash commands ─────────────────────────────────────────
function parseSlashCommand(text: string): { command: string; args: string } | null {
  const match = text.match(/^\/(code|programar|draw|dibujar|search|buscar|imagen|image)\s*(.*)/i);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: match[2].trim() };
}

function extractCodeBlock(text: string, lang?: string): string | null {
  const regex = lang
    ? new RegExp(`\\\`\\\`\\\`(?:${lang})?\\s*\\n?([\\s\\S]*?)\\n?\\\`\\\`\\\``)
    : /```(?:\w+)?\s*\n?([\s\S]*?)\n?```/;
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function guessCodeExtension(code: string): string {
  if (code.includes('fn main') || code.includes('use std::')) return 'rs';
  if (code.includes('import ')) return 'py';
  if (code.includes('function') && code.includes('console.log')) return 'js';
  if (code.includes('<html') || code.includes('<!DOCTYPE html')) return 'html';
  if (code.includes('public class') || code.includes('class Main')) return 'java';
  if (code.includes('package main') || code.includes('fmt.')) return 'go';
  return 'txt';
}

async function handleSlashCommand(slash: { command: string; args: string }) {
  switch (slash.command) {
    case 'code':
    case 'programar':
      await handleCodeCommand(slash.args);
      break;
    case 'draw':
    case 'dibujar':
      await handleDrawCommand(slash.args);
      break;
    case 'search':
    case 'buscar':
      await handleSearchCommand(slash.args);
      break;
    case 'imagen':
    case 'image':
      await handleImageCommand(slash.args);
      break;
  }
}

async function handleCodeCommand(args: string) {
  if (!args) {
    appendMessage('lumina', 'Dime qué quieres que programe. Ejemplo: `/code una calculadora en Python`.');
    return;
  }
  appendMessage('user', `Programa: ${args}`);
  const typingId = showTyping();
  try {
    const response = await invoke<string>('chat', {
      messages: [{ role: 'user', content: args }],
      apiKey,
      systemPromptOverride: CODE_PROMPT,
    });
    removeTyping(typingId);
    const code = extractCodeBlock(response) || cleanResponse(response);
    const ext = guessCodeExtension(code);
    const filename = `code_${Date.now()}.${ext}`;
    const path = await invoke<string>('save_lumina_file', {
      subfolder: 'code',
      filename,
      content: code,
    });
    const preview = code.length > 250 ? code.slice(0, 250) + '...' : code;
    appendHtmlMessage('lumina', `He guardado el código en:\n${path}\n\n\`\`\`${preview}\`\`\``, '');
    setEmotion('CURIOSA');
  } catch (err: unknown) {
    removeTyping(typingId);
    appendMessage('lumina', 'No pude generar el código. ¿Tienes clave de Groq activa?');
    setEmotion('TRISTE');
  }
}

async function handleDrawCommand(args: string) {
  if (!args) {
    appendMessage('lumina', 'Dime qué quieres que dibuje. Ejemplo: `/dibujar un robot anime`.');
    return;
  }
  appendMessage('user', `Dibujo: ${args}`);
  const typingId = showTyping();
  try {
    const response = await invoke<string>('chat', {
      messages: [{ role: 'user', content: args }],
      apiKey,
      systemPromptOverride: DRAW_PROMPT,
    });
    removeTyping(typingId);
    const svg = extractCodeBlock(response, 'svg') || extractCodeBlock(response) || cleanResponse(response);
    const filename = `drawing_${Date.now()}.svg`;
    const path = await invoke<string>('save_lumina_file', {
      subfolder: 'drawings',
      filename,
      content: svg,
    });
    appendHtmlMessage('lumina', `He guardado el dibujo SVG en:\n${path}`, `<div class="tool-svg">${svg}</div>`);
    setEmotion('SORPRENDIDA');
  } catch (err: unknown) {
    removeTyping(typingId);
    appendMessage('lumina', 'No pude generar el dibujo. ¿Tienes clave de Groq activa?');
    setEmotion('TRISTE');
  }
}

async function handleSearchCommand(args: string) {
  if (!args) {
    appendMessage('lumina', 'Dime qué quieres buscar. Ejemplo: `/buscar recetas de pasta`.');
    return;
  }
  appendMessage('user', `Buscar: ${args}`);
  const typingId = showTyping();
  try {
    const results = await invoke<Array<{ title: string; url: string; snippet: string }>>('search_web', { query: args });
    removeTyping(typingId);
    if (!results.length) {
      appendMessage('lumina', 'No encontré resultados. Intenta con otra búsqueda.');
      setEmotion('TRISTE');
      return;
    }
    let html = '<div class="search-results">';
    for (const r of results) {
      const safeTitle = r.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const safeUrl = r.url.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const safeSnippet = r.snippet.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      html += `<a class="search-result" href="${safeUrl}" target="_blank"><div class="search-title">${safeTitle}</div><div class="search-url">${safeUrl}</div><div class="search-snippet">${safeSnippet}</div></a>`;
    }
    html += '</div>';
    appendHtmlMessage('lumina', 'Encontré esto en la web:', html);
    setEmotion('CURIOSA');
  } catch (err: unknown) {
    removeTyping(typingId);
    appendMessage('lumina', 'No pude buscar en la web. DuckDuckGo puede estar bloqueando la petición.');
    setEmotion('TRISTE');
  }
}

async function handleImageCommand(args: string) {
  if (!args) {
    appendMessage('lumina', 'Dime qué imagen quieres. Ejemplo: `/imagen un gato cyberpunk`.');
    return;
  }
  appendMessage('user', `Imagen: ${args}`);
  const typingId = showTyping();
  try {
    const b64 = await invoke<string>('generate_image', { prompt: args });
    const filename = `image_${Date.now()}.png`;
    const path = await invoke<string>('save_lumina_image', {
      subfolder: 'images',
      filename,
      imageB64: b64,
    });
    removeTyping(typingId);
    appendHtmlMessage('lumina', `He generado esta imagen y la guardé en:\n${path}`, `<img class="tool-image" src="data:image/png;base64,${b64}" alt="Imagen generada" />`);
    setEmotion('SORPRENDIDA');
  } catch (err: unknown) {
    removeTyping(typingId);
    appendMessage('lumina', 'No pude generar la imagen. Inténtalo con otra descripción.');
    setEmotion('TRISTE');
  }
}

function appendHtmlMessage(role: 'user' | 'lumina', text: string, html: string) {
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
    <div class="message-bubble">
      <div class="tool-text">${escapedText}</div>
      ${html}
    </div>
  `;
  messagesEl.appendChild(msgEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ─── Send Message ─────────────────────────────────────────
async function handleSend(forcedText?: string) {
  const text = (forcedText ?? inputEl.value).trim();
  if (!text || isThinking) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  setThinking(true);

  const slash = parseSlashCommand(text);
  if (slash) {
    await handleSlashCommand(slash);
    setThinking(false);
    return;
  }

  // Add user message
  appendMessage('user', text);
  messages.push({ role: 'user', content: text });

  // Show typing
  const typingId = showTyping();

  try {
    const response = await invoke<string>('chat', {
      messages: buildMessagesWithScreenContext().map(m => ({ role: m.role, content: m.content })),
      apiKey,
      systemPromptOverride: null,
    });

    removeTyping(typingId);

    const emotion = parseEmotion(response);
    const cleanText = cleanResponse(response);

    messages.push({ role: 'assistant', content: cleanText });
    appendMessage('lumina', cleanText);
    setEmotion(emotion);

    // Speak the response if voice is enabled
    speak(cleanText);

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

  // Trigger VTube Studio if connected
  if (vtubeConnected && vtubeToken) {
    invoke('vtube_trigger_emotion', {
      emotion,
      token: vtubeToken,
      port: vtubePort,
    }).catch((err: unknown) => {
      // If token expired, mark disconnected
      const msg = String(err);
      if (msg.includes('token_expired') || msg.includes('401')) {
        vtubeToken = '';
        setVtubeStatus('disconnected');
      }
    });
  }
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
