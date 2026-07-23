// ─── Audio Listener: Escucha continua del micrófono ────────────────────────
// Módulo que captura audio en tiempo real y detecta silencio automáticamente

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Stream, StreamConfig};
use ringbuf::RingBuffer;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use parking_lot::Mutex;
use anyhow::Result;

const SILENCE_THRESHOLD: u16 = 500;  // Umbral de volumen para silencio
const SILENCE_DURATION_MS: u64 = 1500; // Milisegundos de silencio antes de procesar
const MIN_DURATION_MS: u64 = 800;    // Duración mínima de audio para procesar

pub struct AudioListener {
    stream: Option<Stream>,
    is_recording: Arc<AtomicBool>,
    audio_buffer: Arc<Mutex<Vec<f32>>>,
    recording_start: Arc<Mutex<Option<std::time::Instant>>>,
}

impl AudioListener {
    pub fn new() -> Result<Self> {
        Ok(AudioListener {
            stream: None,
            is_recording: Arc::new(AtomicBool::new(false)),
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
            recording_start: Arc::new(Mutex::new(None)),
        })
    }

    /// Inicia la grabación de audio
    pub fn start(&mut self) -> Result<()> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or(anyhow::anyhow!("No se encontró dispositivo de entrada de audio"))?;

        let config = device.default_input_config()?;
        let sample_rate = config.sample_rate().0 as f32;

        let is_recording = Arc::clone(&self.is_recording);
        let audio_buffer = Arc::clone(&self.audio_buffer);
        let recording_start = Arc::clone(&self.recording_start);

        // Crear callback para procesar audio
        let channels = config.channels() as usize;
        let is_recording_clone = Arc::clone(&is_recording);
        let audio_buffer_clone = Arc::clone(&audio_buffer);
        let recording_start_clone = Arc::clone(&recording_start);

        let err_fn = |err| {
            log::error!("❌ Error de audio: {}", err);
        };

        let stream = match config.sample_format() {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &cpal::Data, _: &cpal::InputCallbackInfo| {
                        if is_recording_clone.load(Ordering::Relaxed) {
                            // Inicializar tiempo de grabación si es la primera vez
                            if recording_start_clone.lock().is_none() {
                                *recording_start_clone.lock() = Some(std::time::Instant::now());
                            }

                            // Procesar audio como f32
                            if let Ok(slice) = data.as_slice::<f32>() {
                                let mut buf = audio_buffer_clone.lock();
                                buf.extend_from_slice(slice);
                            }
                        }
                    },
                    err_fn,
                )?
            }
            cpal::SampleFormat::I16 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &cpal::Data, _: &cpal::InputCallbackInfo| {
                        if is_recording_clone.load(Ordering::Relaxed) {
                            if recording_start_clone.lock().is_none() {
                                *recording_start_clone.lock() = Some(std::time::Instant::now());
                            }

                            // Procesar audio como i16 y convertir a f32
                            if let Ok(slice) = data.as_slice::<i16>() {
                                let converted: Vec<f32> = slice
                                    .iter()
                                    .map(|s| *s as f32 / 32768.0)
                                    .collect();
                                let mut buf = audio_buffer_clone.lock();
                                buf.extend_from_slice(&converted);
                            }
                        }
                    },
                    err_fn,
                )?
            }
            cpal::SampleFormat::U16 => {
                device.build_input_stream(
                    &config.into(),
                    move |data: &cpal::Data, _: &cpal::InputCallbackInfo| {
                        if is_recording_clone.load(Ordering::Relaxed) {
                            if recording_start_clone.lock().is_none() {
                                *recording_start_clone.lock() = Some(std::time::Instant::now());
                            }

                            if let Ok(slice) = data.as_slice::<u16>() {
                                let converted: Vec<f32> = slice
                                    .iter()
                                    .map(|s| (*s as f32 - 32768.0) / 32768.0)
                                    .collect();
                                let mut buf = audio_buffer_clone.lock();
                                buf.extend_from_slice(&converted);
                            }
                        }
                    },
                    err_fn,
                )?
            }
        };

        stream.play()?;
        self.stream = Some(stream);
        self.is_recording.store(true, Ordering::Relaxed);

        log::info!("🎤 Escucha de audio iniciada");
        Ok(())
    }

    /// Detiene la grabación
    pub fn stop(&mut self) -> Result<()> {
        self.is_recording.store(false, Ordering::Relaxed);
        self.stream = None;
        log::info!("🛑 Escucha de audio detenida");
        Ok(())
    }

    /// Obtiene el audio grabado como WAV
    pub fn get_audio_wav(&self) -> Result<Vec<u8>> {
        let buffer = self.audio_buffer.lock();
        
        if buffer.is_empty() {
            return Err(anyhow::anyhow!("No hay audio grabado"));
        }

        // Convertir a i16
        let i16_samples: Vec<i16> = buffer
            .iter()
            .map(|&s| (s * 32767.0).clamp(-32768.0, 32767.0) as i16)
            .collect();

        let sample_rate = 44100u32; // Tasa de muestreo estándar
        let channels = 1u16; // Mono
        let bytes_per_sample = 2u16;

        // Construir header WAV manualmente (RIFF format)
        let mut wav = Vec::new();

        // RIFF header
        wav.extend_from_slice(b"RIFF");
        let file_size = (36 + i16_samples.len() * 2) as u32;
        wav.extend_from_slice(&file_size.to_le_bytes());
        wav.extend_from_slice(b"WAVE");

        // fmt subchunk
        wav.extend_from_slice(b"fmt ");
        wav.extend_from_slice(&16u32.to_le_bytes()); // Tamaño del subchunk
        wav.extend_from_slice(&1u16.to_le_bytes()); // Audio format (1 = PCM)
        wav.extend_from_slice(&channels.to_le_bytes());
        wav.extend_from_slice(&sample_rate.to_le_bytes());
        wav.extend_from_slice(&(sample_rate * channels as u32 * bytes_per_sample as u32).to_le_bytes());
        wav.extend_from_slice(&(channels * bytes_per_sample).to_le_bytes());
        wav.extend_from_slice(&16u16.to_le_bytes()); // Bits per sample

        // data subchunk
        wav.extend_from_slice(b"data");
        wav.extend_from_slice(&(i16_samples.len() as u32 * 2).to_le_bytes());
        for sample in i16_samples {
            wav.extend_from_slice(&sample.to_le_bytes());
        }

        Ok(wav)
    }

    /// Detecta si hay silencio en el buffer actual
    pub fn detect_silence(&self) -> bool {
        let buffer = self.audio_buffer.lock();
        
        if buffer.is_empty() {
            return true;
        }

        // Calcular RMS (root mean square) del audio reciente
        let sample_count = (buffer.len()).min(4410); // Últimos ~0.1s a 44.1kHz
        let start_idx = buffer.len().saturating_sub(sample_count);
        
        let sum_squares: f32 = buffer[start_idx..]
            .iter()
            .map(|s| s * s)
            .sum();
        
        let rms = (sum_squares / sample_count as f32).sqrt();
        
        // Convertir a rango 0-1000 para comparar con umbral
        let volume = (rms * 1000.0) as u16;
        volume < SILENCE_THRESHOLD
    }

    /// Obtiene la duración de la grabación actual
    pub fn get_duration_ms(&self) -> u64 {
        if let Some(start) = *self.recording_start.lock() {
            start.elapsed().as_millis() as u64
        } else {
            0
        }
    }

    /// Limpia el buffer de audio
    pub fn clear_buffer(&self) {
        self.audio_buffer.lock().clear();
        *self.recording_start.lock() = None;
    }

    /// Obtiene el estado de grabación
    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::Relaxed)
    }
}

impl Default for AudioListener {
    fn default() -> Self {
        Self::new().unwrap_or_else(|_| AudioListener {
            stream: None,
            is_recording: Arc::new(AtomicBool::new(false)),
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
            recording_start: Arc::new(Mutex::new(None)),
        })
    }
}
