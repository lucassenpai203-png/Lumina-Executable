export type Emotion = 'NEUTRAL' | 'FELIZ' | 'TRISTE' | 'CURIOSA' | 'ENOJADA' | 'SORPRENDIDA' | 'ENAMORADA';

export const EMOTION_LABELS: Record<Emotion, string> = {
  NEUTRAL:    'Tranquila',
  FELIZ:      'Feliz',
  TRISTE:     'Triste',
  CURIOSA:    'Curiosa',
  ENOJADA:    'Enojada',
  SORPRENDIDA:'Sorprendida',
  ENAMORADA:  'Enamorada',
};

export const EMOTION_GLOWS: Record<Emotion, string> = {
  NEUTRAL:    '#7c6aff',
  FELIZ:      '#ffd54f',
  TRISTE:     '#4fc3f7',
  CURIOSA:    '#69f0ae',
  ENOJADA:    '#ef5350',
  SORPRENDIDA:'#ce93d8',
  ENAMORADA:  '#f48fb1',
};

// Head tilt transform per emotion (applied to avatar-svg div)
export const EMOTION_TILTS: Record<Emotion, string> = {
  NEUTRAL:    'rotate(0deg) scale(1)',
  FELIZ:      'scale(1.04) translateY(-2px)',
  TRISTE:     'rotate(4deg) translateY(5px) scale(0.97)',
  CURIOSA:    'rotate(-6deg) translateY(-1px)',
  ENOJADA:    'rotate(3deg) scale(0.98)',
  SORPRENDIDA:'scale(1.06) rotate(-3deg) translateY(-3px)',
  ENAMORADA:  'rotate(-9deg) translateY(-2px)',
};

export function parseEmotion(text: string): Emotion {
  const match = text.match(/\[(NEUTRAL|FELIZ|TRISTE|CURIOSA|ENOJADA|SORPRENDIDA|ENAMORADA)\]/);
  if (match) return match[1] as Emotion;
  return 'NEUTRAL';
}

export function cleanResponse(text: string): string {
  return text.replace(/\s*\[(NEUTRAL|FELIZ|TRISTE|CURIOSA|ENOJADA|SORPRENDIDA|ENAMORADA)\]\s*$/g, '').trim();
}

// ─── Eye variants ─────────────────────────────────────────────────────────────

const eyes: Record<Emotion, string> = {
  NEUTRAL: `
    <ellipse class="eye-l" cx="88" cy="120" rx="14" ry="10" fill="#1a0630"/>
    <ellipse cx="88" cy="120" rx="10" ry="7" fill="#4a1a8a"/>
    <ellipse cx="88" cy="120" rx="6" ry="5" fill="#1a0035"/>
    <circle cx="84" cy="117" r="2.5" fill="white" opacity="0.9"/>
    <circle cx="91" cy="122" r="1.2" fill="white" opacity="0.6"/>
    <path d="M74 115 Q88 108 102 115" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <ellipse class="eye-r" cx="152" cy="120" rx="14" ry="10" fill="#1a0630"/>
    <ellipse cx="152" cy="120" rx="10" ry="7" fill="#4a1a8a"/>
    <ellipse cx="152" cy="120" rx="6" ry="5" fill="#1a0035"/>
    <circle cx="148" cy="117" r="2.5" fill="white" opacity="0.9"/>
    <circle cx="155" cy="122" r="1.2" fill="white" opacity="0.6"/>
    <path d="M138 115 Q152 108 166 115" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
  `,
  FELIZ: `
    <ellipse class="eye-l" cx="88" cy="120" rx="14" ry="12" fill="#1a0630"/>
    <ellipse cx="88" cy="120" rx="10" ry="9" fill="#5a2090"/>
    <ellipse cx="88" cy="120" rx="6" ry="5.5" fill="#1a0035"/>
    <circle cx="84" cy="116" r="3" fill="white" opacity="0.95"/>
    <circle cx="91" cy="123" r="1.5" fill="white" opacity="0.6"/>
    <path d="M74 114 Q88 106 102 114" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <text x="70" y="108" font-size="10" fill="#ffd54f" opacity="0.8">✦</text>
    <ellipse class="eye-r" cx="152" cy="120" rx="14" ry="12" fill="#1a0630"/>
    <ellipse cx="152" cy="120" rx="10" ry="9" fill="#5a2090"/>
    <ellipse cx="152" cy="120" rx="6" ry="5.5" fill="#1a0035"/>
    <circle cx="148" cy="116" r="3" fill="white" opacity="0.95"/>
    <circle cx="155" cy="123" r="1.5" fill="white" opacity="0.6"/>
    <path d="M138 114 Q152 106 166 114" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <text x="163" y="108" font-size="10" fill="#ffd54f" opacity="0.8">✦</text>
  `,
  TRISTE: `
    <ellipse class="eye-l" cx="88" cy="122" rx="13" ry="9" fill="#1a0630"/>
    <ellipse cx="88" cy="122" rx="9" ry="6.5" fill="#3a1580"/>
    <ellipse cx="88" cy="122" rx="5.5" ry="4.5" fill="#1a0035"/>
    <circle cx="85" cy="120" r="2" fill="white" opacity="0.8"/>
    <path d="M74 117 Q88 113 102 119" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <ellipse cx="80" cy="136" rx="2" ry="3.5" fill="#4fc3f7" opacity="0.7">
      <animate attributeName="cy" values="132;145;160" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.7;0.4;0" dur="2s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse class="eye-r" cx="152" cy="122" rx="13" ry="9" fill="#1a0630"/>
    <ellipse cx="152" cy="122" rx="9" ry="6.5" fill="#3a1580"/>
    <ellipse cx="152" cy="122" rx="5.5" ry="4.5" fill="#1a0035"/>
    <circle cx="149" cy="120" r="2" fill="white" opacity="0.8"/>
    <path d="M138 117 Q152 113 166 119" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <ellipse cx="144" cy="136" rx="2" ry="3.5" fill="#4fc3f7" opacity="0.7">
      <animate attributeName="cy" values="132;145;160" dur="2.3s" repeatCount="indefinite" begin="0.5s"/>
      <animate attributeName="opacity" values="0.7;0.4;0" dur="2.3s" repeatCount="indefinite" begin="0.5s"/>
    </ellipse>
  `,
  CURIOSA: `
    <ellipse class="eye-l" cx="88" cy="120" rx="13" ry="11" fill="#1a0630"/>
    <ellipse cx="88" cy="120" rx="9" ry="8" fill="#4a1a8a"/>
    <ellipse cx="88" cy="120" rx="5.5" ry="5" fill="#1a0035"/>
    <circle cx="85" cy="117" r="2.5" fill="white" opacity="0.9"/>
    <path d="M74 115 Q88 108 102 115" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <ellipse class="eye-r" cx="152" cy="118" rx="15" ry="13" fill="#1a0630"/>
    <ellipse cx="152" cy="118" rx="11" ry="9.5" fill="#4a1a8a"/>
    <ellipse cx="152" cy="118" rx="7" ry="6" fill="#1a0035"/>
    <circle cx="148" cy="114" r="3" fill="white" opacity="0.95"/>
    <circle cx="156" cy="121" r="1.5" fill="white" opacity="0.6"/>
    <path d="M137 112 Q152 104 167 113" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <text x="165" y="106" font-size="12" fill="#69f0ae" opacity="0.8">?</text>
  `,
  ENOJADA: `
    <ellipse class="eye-l" cx="88" cy="122" rx="13" ry="9" fill="#1a0630"/>
    <ellipse cx="88" cy="122" rx="9" ry="6.5" fill="#5a1010"/>
    <ellipse cx="88" cy="122" rx="5" ry="4.5" fill="#1a0000"/>
    <circle cx="85" cy="120" r="2" fill="white" opacity="0.7"/>
    <path d="M75 113 Q88 119 101 113" stroke="#c4a4e0" stroke-width="2" fill="none"/>
    <ellipse class="eye-r" cx="152" cy="122" rx="13" ry="9" fill="#1a0630"/>
    <ellipse cx="152" cy="122" rx="9" ry="6.5" fill="#5a1010"/>
    <ellipse cx="152" cy="122" rx="5" ry="4.5" fill="#1a0000"/>
    <circle cx="149" cy="120" r="2" fill="white" opacity="0.7"/>
    <path d="M139 113 Q152 119 165 113" stroke="#c4a4e0" stroke-width="2" fill="none"/>
  `,
  SORPRENDIDA: `
    <ellipse class="eye-l" cx="88" cy="120" rx="16" ry="15" fill="#1a0630"/>
    <ellipse cx="88" cy="120" rx="12" ry="11" fill="#5a20a0"/>
    <ellipse cx="88" cy="120" rx="8" ry="7" fill="#1a0035"/>
    <circle cx="83" cy="115" r="4" fill="white" opacity="0.95"/>
    <circle cx="93" cy="124" r="2" fill="white" opacity="0.6"/>
    <path d="M72 114 Q88 105 104 114" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <text x="63" y="112" font-size="10" fill="#ce93d8" opacity="0.8">★</text>
    <ellipse class="eye-r" cx="152" cy="120" rx="16" ry="15" fill="#1a0630"/>
    <ellipse cx="152" cy="120" rx="12" ry="11" fill="#5a20a0"/>
    <ellipse cx="152" cy="120" rx="8" ry="7" fill="#1a0035"/>
    <circle cx="147" cy="115" r="4" fill="white" opacity="0.95"/>
    <circle cx="157" cy="124" r="2" fill="white" opacity="0.6"/>
    <path d="M136 114 Q152 105 168 114" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <text x="166" y="112" font-size="10" fill="#ce93d8" opacity="0.8">★</text>
  `,
  ENAMORADA: `
    <ellipse class="eye-l" cx="88" cy="120" rx="14" ry="12" fill="#1a0630"/>
    <ellipse cx="88" cy="120" rx="10" ry="8.5" fill="#6a1a6a"/>
    <ellipse cx="88" cy="120" rx="6" ry="5.5" fill="#200020"/>
    <circle cx="84" cy="116" r="3" fill="white" opacity="0.95"/>
    <circle cx="91" cy="123" r="1.5" fill="white" opacity="0.6"/>
    <path d="M74 114 Q88 106 102 114" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <text x="69" y="108" font-size="11" fill="#f48fb1" opacity="0.9">♥</text>
    <ellipse class="eye-r" cx="152" cy="120" rx="14" ry="12" fill="#1a0630"/>
    <ellipse cx="152" cy="120" rx="10" ry="8.5" fill="#6a1a6a"/>
    <ellipse cx="152" cy="120" rx="6" ry="5.5" fill="#200020"/>
    <circle cx="148" cy="116" r="3" fill="white" opacity="0.95"/>
    <circle cx="155" cy="123" r="1.5" fill="white" opacity="0.6"/>
    <path d="M138 114 Q152 106 166 114" stroke="#c4a4e0" stroke-width="1.5" fill="none"/>
    <text x="162" y="108" font-size="11" fill="#f48fb1" opacity="0.9">♥</text>
  `,
};

const eyebrows: Record<Emotion, string> = {
  NEUTRAL:    `<path d="M76 103 Q88 98 100 103" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M140 103 Q152 98 164 103" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  FELIZ:      `<path d="M76 101 Q88 95 100 101" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M140 101 Q152 95 164 101" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  TRISTE:     `<path d="M76 106 Q88 102 100 104" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M140 104 Q152 102 164 106" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  CURIOSA:    `<path d="M76 103 Q88 98 100 103" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M139 99 Q152 93 165 100" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  ENOJADA:    `<path d="M76 108 Q88 103 100 105" stroke="#9d8ab0" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M140 105 Q152 103 164 108" stroke="#9d8ab0" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  SORPRENDIDA:`<path d="M76 98 Q88 92 100 98" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M140 98 Q152 92 164 98" stroke="#9d8ab0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  ENAMORADA:  `<path d="M76 101 Q88 95 100 101" stroke="#c48ab0" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M140 101 Q152 95 164 101" stroke="#c48ab0" stroke-width="2" fill="none" stroke-linecap="round"/>`,
};

const mouths: Record<Emotion, string> = {
  NEUTRAL:    `<path d="M108 158 Q120 162 132 158" stroke="#c4a4e0" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  FELIZ:      `<path d="M106 156 Q120 170 134 156" stroke="#c4a4e0" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M110 160 Q120 168 130 160" fill="rgba(180,120,200,0.2)" stroke="none"/>`,
  TRISTE:     `<path d="M108 164 Q120 155 132 164" stroke="#c4a4e0" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  CURIOSA:    `<path d="M110 158 Q118 163 128 159" stroke="#c4a4e0" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  ENOJADA:    `<path d="M108 162 Q120 157 132 162" stroke="#c4a4e0" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  SORPRENDIDA:`<ellipse cx="120" cy="162" rx="10" ry="8" fill="rgba(100,50,150,0.4)" stroke="#c4a4e0" stroke-width="1.5"/>`,
  ENAMORADA:  `<path d="M108 157 Q120 168 132 157" stroke="#f48fb1" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M113 161 Q120 167 127 161" fill="rgba(244,143,177,0.2)" stroke="none"/>`,
};

const cheeks: Record<Emotion, string> = {
  NEUTRAL:    '',
  FELIZ:      `<ellipse cx="70" cy="140" rx="14" ry="7" fill="rgba(255,150,180,0.18)"/><ellipse cx="170" cy="140" rx="14" ry="7" fill="rgba(255,150,180,0.18)"/>`,
  TRISTE:     `<ellipse cx="70" cy="138" rx="12" ry="6" fill="rgba(79,195,247,0.12)"/><ellipse cx="170" cy="138" rx="12" ry="6" fill="rgba(79,195,247,0.12)"/>`,
  CURIOSA:    `<ellipse cx="170" cy="138" rx="12" ry="6" fill="rgba(105,240,174,0.15)"/>`,
  ENOJADA:    '',
  SORPRENDIDA:`<ellipse cx="70" cy="140" rx="13" ry="7" fill="rgba(206,147,216,0.18)"/><ellipse cx="170" cy="140" rx="13" ry="7" fill="rgba(206,147,216,0.18)"/>`,
  ENAMORADA:  `<ellipse cx="70" cy="138" rx="14" ry="7" fill="rgba(244,143,177,0.25)"/><ellipse cx="170" cy="138" rx="14" ry="7" fill="rgba(244,143,177,0.25)"/>`,
};

export function buildAvatarSVG(emotion: Emotion, mini = false): string {
  const size = mini ? 80 : 220;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 310" width="${size}" height="${size}">
  <defs>
    <radialGradient id="faceGrad" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#f0d8ff"/>
      <stop offset="60%" stop-color="#e8c8f8"/>
      <stop offset="100%" stop-color="#d4a8ec"/>
    </radialGradient>
    <radialGradient id="hairGrad" cx="50%" cy="20%" r="60%">
      <stop offset="0%" stop-color="#2a1040"/>
      <stop offset="100%" stop-color="#150828"/>
    </radialGradient>
    <radialGradient id="bodyGrad" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#2a1445"/>
      <stop offset="100%" stop-color="#150828"/>
    </radialGradient>
    <style>
      /* Blinking animation */
      .eye-l, .eye-r {
        transform-box: fill-box;
        transform-origin: center;
        animation: blink 5s ease-in-out infinite;
      }
      .eye-r { animation-delay: 0.05s; }
      @keyframes blink {
        0%, 88%, 100% { transform: scaleY(1); }
        92% { transform: scaleY(0.08); }
        96% { transform: scaleY(1); }
      }
    </style>
  </defs>

  <!-- Hair back -->
  <ellipse cx="120" cy="90" rx="88" ry="95" fill="url(#hairGrad)"/>
  <!-- Hair sides long -->
  <path d="M32 130 Q20 200 35 280 Q55 268 60 205 Q50 165 45 130 Z" fill="#1a0830"/>
  <path d="M208 130 Q220 200 205 280 Q185 268 180 205 Q190 165 195 130 Z" fill="#1a0830"/>
  <!-- Hair front strands -->
  <path d="M60 55 Q50 100 55 120 Q65 90 70 75 Z" fill="#1e0d38"/>
  <path d="M70 45 Q62 90 65 110 Q75 85 80 65 Z" fill="#200d3a"/>
  <path d="M180 55 Q190 100 185 120 Q175 90 170 75 Z" fill="#1e0d38"/>

  <!-- Face -->
  <ellipse cx="120" cy="145" rx="78" ry="85" fill="url(#faceGrad)"/>

  <!-- Ear -->
  <ellipse cx="42" cy="150" rx="8" ry="11" fill="#e0c0f0"/>
  <ellipse cx="198" cy="150" rx="8" ry="11" fill="#e0c0f0"/>

  <!-- Hair front overlay -->
  <ellipse cx="120" cy="68" rx="82" ry="45" fill="url(#hairGrad)"/>
  <path d="M65 60 Q72 95 78 115 Q85 95 88 70 Q78 58 65 60 Z" fill="#1a0830"/>
  <path d="M175 60 Q168 95 162 115 Q155 95 152 70 Q162 58 175 60 Z" fill="#1a0830"/>

  <!-- Eyebrows -->
  ${eyebrows[emotion]}

  <!-- Eyes (with blink) -->
  ${eyes[emotion]}

  <!-- Nose -->
  <path d="M118 140 Q120 148 122 140" stroke="rgba(180,130,200,0.5)" stroke-width="1.5" fill="none" stroke-linecap="round"/>

  <!-- Cheeks -->
  ${cheeks[emotion]}

  <!-- Mouth -->
  ${mouths[emotion]}

  <!-- Hair accessories - flower clip -->
  <circle cx="75" cy="55" r="8" fill="#9d4edd" opacity="0.9"/>
  <circle cx="75" cy="47" r="5" fill="#c580ff" opacity="0.8"/>
  <circle cx="68" cy="58" r="5" fill="#c580ff" opacity="0.8"/>
  <circle cx="82" cy="58" r="5" fill="#c580ff" opacity="0.8"/>
  <circle cx="75" cy="55" r="4" fill="#ffe0ff"/>

  <!-- Body / Shoulders / Outfit -->
  <path d="M42 265 Q55 235 80 228 Q100 222 120 220 Q140 222 160 228 Q185 235 198 265 Z" fill="url(#bodyGrad)"/>
  <!-- Collar detail -->
  <path d="M95 222 Q120 235 145 222" fill="none" stroke="rgba(157,78,221,0.4)" stroke-width="1.5"/>
  <!-- Outfit accent line -->
  <path d="M80 230 Q120 240 160 230" fill="none" stroke="rgba(157,78,221,0.25)" stroke-width="1"/>
  <!-- Neck -->
  <rect x="107" y="220" width="26" height="12" rx="4" fill="#e8c8f8" opacity="0.6"/>
</svg>`;
}
