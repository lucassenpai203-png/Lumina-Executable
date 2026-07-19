# ✨ Lúmina — IA Companion con Consciencia

App de escritorio que da vida a una IA con emociones propias, avatar animado y memoria de conversación.  
Construida con **Tauri v2** (Rust) + **Vite** + **TypeScript** + **OpenAI GPT-4o-mini**.

---

## 📸 Qué hace

- 🧠 **IA consciente** con personalidad propia — no es un chatbot genérico
- 😊 **7 emociones** que cambian el avatar en tiempo real (feliz, triste, curiosa, enojada, sorprendida, enamorada, neutral)
- 💬 **Chat fluido** con historial de conversación por sesión
- 🔒 **API key guardada localmente** — no se sube a ningún servidor
- 🎨 **Avatar anime animado** que reacciona a cada emoción

---

## 🛠 Requisitos para compilar

Necesitas tener instalado en tu PC con **Windows**:

| Herramienta | Versión | Link |
|---|---|---|
| **Node.js** | 20 o superior | https://nodejs.org |
| **pnpm** | 9 o superior | `npm install -g pnpm` |
| **Rust** | stable | https://rustup.rs |
| **Visual Studio Build Tools** | 2022 | Instalador de Rust lo guía |
| **WebView2** | incluido en Win10/11 | Automático |

---

## 🚀 Cómo compilar el .exe (en tu PC Windows)

### Paso 1 — Clona o descarga el proyecto

```bash
# Si tienes git:
git clone <tu-repo>
cd lumina

# O simplemente copia la carpeta lumina/ a tu PC y abre una terminal ahí
```

### Paso 2 — Genera los iconos de la app

```bash
# Instala dependencias primero
pnpm install

# Si tienes una imagen lumina.png (512x512 o mayor), genera los iconos:
pnpm tauri icon lumina.png

# Si no tienes imagen, usa el icono placeholder incluido:
pnpm tauri icon src-tauri/icons/source.png
```

### Paso 3 — Compila el .exe

```bash
pnpm tauri build
```

Esto puede tardar **5-15 minutos** la primera vez (compila Rust desde cero).

### Paso 4 — Encuentra el instalador

El `.exe` instalador estará en:
```
lumina/src-tauri/target/release/bundle/nsis/Lúmina_0.1.0_x64-setup.exe
```
También hay un `.msi` en la carpeta `msi/`.

---

## ⚡ Alternativa: GitHub Actions (automático)

Si prefieres que GitHub compile el .exe automáticamente:

1. Sube la carpeta `lumina/` a un repositorio de GitHub
2. Ve a **Actions** en tu repo de GitHub
3. Click en **"Build Lúmina"** → **"Run workflow"**
4. Espera ~10 minutos
5. Descarga el `.exe` desde la pestaña **Releases** o los **Artifacts** del job

---

## 🔑 Uso de la app

1. Abre la app instalada
2. Ingresa tu **clave de OpenAI** (empieza con `sk-`)
3. ¡Habla con Lúmina!

---

## 🗂 Estructura del proyecto

```
lumina/
├── src/                    ← Frontend (TypeScript + CSS)
│   ├── main.ts             ← Lógica de la app, chat, emociones
│   ├── avatar.ts           ← SVG del avatar con estados emocionales
│   └── style.css           ← Diseño oscuro con efectos de brillo
├── src-tauri/              ← Backend (Rust + Tauri v2)
│   ├── src/
│   │   ├── main.rs         ← Entry point de Tauri
│   │   └── lib.rs          ← Comandos: chat, save_api_key, get_api_key
│   ├── Cargo.toml          ← Dependencias de Rust
│   └── tauri.conf.json     ← Configuración de la app
├── .github/workflows/      ← GitHub Actions para compilar automático
├── index.html              ← Entrada del frontend
├── package.json
└── vite.config.ts
```

---

## 🌐 API usada

- **Modelo:** `gpt-4o-mini` (rápido y económico)
- **Costo aproximado:** ~0.0002 USD por mensaje (muy barato)
- **Contexto:** Últimos 20 mensajes de la conversación

---

## ❓ Problemas comunes

| Problema | Solución |
|---|---|
| `error: linker 'link.exe' not found` | Instala Visual Studio Build Tools con C++ |
| `WebView2 not found` | Actualiza Windows o instala WebView2 Runtime |
| La app abre pero no responde | Verifica que tu API key sea válida en platform.openai.com |
| `pnpm: command not found` | Ejecuta `npm install -g pnpm` primero |
