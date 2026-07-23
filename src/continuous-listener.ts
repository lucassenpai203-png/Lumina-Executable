// Módulo de escucha continua para Lumina
// Permite que la IA escuche constantemente sin presionar botones repetidamente

import { invoke } from '@tauri-apps/api/core';

export interface ContinuousListenerOptions {
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
  onStatusChange: (status: 'idle' | 'listening' | 'processing') => void;
  silenceThreshold?: number;     // Milisegundos de silencio para activar envío
  minDuration?: number;           // Duración mínima de audio
  apiKey: string;                 // Clave de API Groq
}

export class ContinuousListener {
  private isListening = false;
  private silenceCheckInterval: number | null = null;
  private lastSilenceTime: number = 0;
  private recordingStartTime: number = 0;
  
  private options: ContinuousListenerOptions;
  private silenceThreshold: number;
  private minDuration: number;

  constructor(options: ContinuousListenerOptions) {
    this.options = options;
    this.silenceThreshold = options.silenceThreshold || 1500; // 1.5s de silencio
    this.minDuration = options.minDuration || 800; // Mínimo 0.8s de audio
  }

  /**
   * Inicia la escucha continua
   */
  async start(): Promise<void> {
    if (this.isListening) return;

    try {
      // Iniciar grabación en Rust
      await invoke('start_continuous_listening');
      
      this.isListening = true;
      this.recordingStartTime = Date.now();
      this.lastSilenceTime = Date.now();
      this.options.onStatusChange('listening');

      console.log('🎤 Escucha continua iniciada');

      // Iniciar monitoreo de silencio
      this.startSilenceMonitoring();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.options.onError(`No se pudo iniciar escucha: ${msg}`);
    }
  }

  /**
   * Detiene la escucha continua
   */
  async stop(): Promise<void> {
    if (!this.isListening) return;

    this.isListening = false;

    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }

    try {
      await invoke('stop_continuous_listening');
      this.options.onStatusChange('idle');
      console.log('🛑 Escucha continua detenida');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error al detener:', msg);
    }
  }

  /**
   * Monitorea silencio y procesa audio
   */
  private startSilenceMonitoring(): void {
    this.silenceCheckInterval = window.setInterval(async () => {
      if (!this.isListening) return;

      try {
        // Detectar silencio
        const isSilent = await invoke<boolean>('detect_silence');
        const duration = await invoke<number>('get_audio_duration');

        if (isSilent) {
          this.lastSilenceTime = Date.now();
        }

        // Si detectamos silencio después de duración mínima, procesar
        const timeSinceSilence = Date.now() - this.lastSilenceTime;
        const hasMinDuration = duration >= this.minDuration;

        if (timeSinceSilence > this.silenceThreshold && hasMinDuration && duration > 0) {
          console.log('⏸️ Silencio detectado, procesando audio...');
          await this.processAudio();
        }
      } catch (err) {
        // Ignorar errores de monitoreo
      }
    }, 200); // Verificar cada 200ms
  }

  /**
   * Procesa el audio grabado
   */
  private async processAudio(): Promise<void> {
    try {
      this.options.onStatusChange('processing');

      // Obtener audio WAV desde Rust
      const audioWav = await invoke<string>('get_audio_wav');

      if (!audioWav) {
        this.options.onStatusChange('listening');
        return;
      }

      // Transcribir con Groq
      try {
        const text = await invoke<string>('transcribe_audio', {
          audioB64: audioWav,
          apiKey: this.options.apiKey,
        });

        if (text && text.trim()) {
          console.log('📝 Transcrito:', text);
          
          // Limpiar buffer para siguiente grabación
          await invoke('clear_audio_buffer');
          
          // Callback con texto transcrito
          this.options.onTranscription(text.trim());
        }
      } catch (transcribeErr) {
        console.error('Error al transcribir:', transcribeErr);
      }

      // Volver a estado de escucha
      this.options.onStatusChange('listening');
      this.recordingStartTime = Date.now();
      this.lastSilenceTime = Date.now();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error procesando audio:', msg);
      this.options.onStatusChange('listening');
    }
  }

  /**
   * Alterna escucha
   */
  async toggle(): Promise<void> {
    if (this.isListening) {
      await this.stop();
    } else {
      await this.start();
    }
  }

  /**
   * Obtiene estado
   */
  getStatus(): boolean {
    return this.isListening;
  }
}
