'use client'

/**
 * Decorative "tool town" illustration under the footer links. Layers move with the pointer through
 * CSS variables (--px, --py, --cx, --cy) set by the footer, so the SVG itself stays static markup.
 */
export function FooterScene() {
  const buildings = [
    { x: 40, w: 70, h: 110, fill: '#e3ebfb', windows: 3 },
    { x: 118, w: 46, h: 150, fill: '#d9e4fa', windows: 2 },
    { x: 172, w: 88, h: 92, fill: '#e8edf9', windows: 4 },
    { x: 980, w: 60, h: 128, fill: '#dbe5fa', windows: 2 },
    { x: 1048, w: 92, h: 96, fill: '#e6ecf9', windows: 4 },
    { x: 1300, w: 74, h: 118, fill: '#e1e9fa', windows: 3 },
  ]
  return <div className="footer-scene" data-scene aria-hidden="true">
    <svg viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="scene-balloon" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#8f83d9" /><stop offset=".5" stopColor="#6d84e6" /><stop offset="1" stopColor="#5b7fe8" /></linearGradient>
        <linearGradient id="scene-hill-a" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#e6edfb" /><stop offset="1" stopColor="#dce6f9" /></linearGradient>
        <linearGradient id="scene-hill-b" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#d9f3e8" /><stop offset="1" stopColor="#cdebdd" /></linearGradient>
        <radialGradient id="scene-sun"><stop stopColor="#ffe6a3" /><stop offset=".6" stopColor="#ffd97a" stopOpacity=".9" /><stop offset="1" stopColor="#ffd97a" stopOpacity="0" /></radialGradient>
      </defs>

      <g className="scene-layer" style={{ '--depth': -1 } as React.CSSProperties}>
        <circle className="scene-sun" cx="1100" cy="70" r="44" fill="url(#scene-sun)" />
      </g>

      <g className="scene-layer scene-clouds" style={{ '--depth': .6 } as React.CSSProperties}>
        {[[160, 96, 1], [520, 70, .8], [860, 100, 1.1], [1340, 88, .7]].map(([x, y, s], index) => <g key={index} transform={`translate(${x} ${y}) scale(${s})`}><g className="scene-cloud" style={{ '--i': index } as React.CSSProperties}><ellipse cx="0" cy="0" rx="46" ry="16" fill="#eef2fb" /><circle cx="-16" cy="-10" r="17" fill="#eef2fb" /><circle cx="10" cy="-14" r="21" fill="#eef2fb" /><circle cx="30" cy="-6" r="14" fill="#eef2fb" /></g></g>)}
      </g>

      <g className="scene-balloon-track">
        <g className="scene-balloon">
          <path d="M0-92c-34 0-56 26-56 58 0 36 34 58 46 78h20c12-20 46-42 46-78 0-32-22-58-56-58Z" fill="url(#scene-balloon)" />
          <path d="M-18-90c-14 20-16 78-4 134M18-90c14 20 16 78 4 134" fill="none" stroke="#ffffff" strokeOpacity=".55" strokeWidth="2" />
          <path d="M-10 44 -16 70M10 44 16 70" stroke="#5b6f9a" strokeWidth="1.5" />
          <rect x="-18" y="70" width="36" height="22" rx="5" fill="#f5e2b8" stroke="#c9a86a" strokeWidth="1.5" />
          <path d="M-8 74 0 70l8 4-8 4Z" fill="#5b4fe6" />
        </g>
      </g>

      <g className="scene-layer" style={{ '--depth': 1.4 } as React.CSSProperties}>
        {buildings.map((building, index) => <g key={index} transform={`translate(${building.x} ${300 - building.h})`}><rect width={building.w} height={building.h + 40} rx="6" fill={building.fill} />{Array.from({ length: building.windows * 3 }, (_, w) => <rect key={w} x={10 + (w % building.windows) * ((building.w - 20) / building.windows)} y={16 + Math.floor(w / building.windows) * 26} width="10" height="14" rx="2" fill="#ffffff" opacity=".9" />)}</g>)}

        <g transform="translate(300 150)">
          <rect x="0" y="0" width="120" height="190" rx="10" fill="#dfe7fb" stroke="#c9d6f3" strokeWidth="1.5" />
          <rect x="14" y="14" width="92" height="34" rx="6" fill="#ffffff" stroke="#c9d6f3" />
          <text x="98" y="38" textAnchor="end" fontFamily="ui-monospace, monospace" fontSize="18" fontWeight="700" fill="#2f4470">42</text>
          {Array.from({ length: 12 }, (_, i) => <rect key={i} x={14 + (i % 4) * 23} y={62 + Math.floor(i / 4) * 24} width="18" height="16" rx="4" fill={i === 11 ? '#5b7fe8' : '#ffffff'} stroke="#c9d6f3" />)}
        </g>

        <g transform="translate(450 60)">
          <rect x="0" y="0" width="42" height="280" rx="6" fill="#fff2d5" stroke="#efd9a4" strokeWidth="1.5" />
          {Array.from({ length: 16 }, (_, i) => <line key={i} x1="0" y1={16 + i * 16} x2={i % 4 === 0 ? 20 : 11} y2={16 + i * 16} stroke="#d9a541" strokeWidth="1.5" />)}
        </g>

        <g transform="translate(560 300)">
          <rect x="-28" y="-140" width="56" height="140" rx="8" fill="#e9dfff" stroke="#d6c7f7" strokeWidth="1.5" />
          <rect x="-8" y="-40" width="16" height="40" rx="3" fill="#ffffff" />
          <g transform="translate(0 -150)"><g className="scene-windmill">
            <circle className="scene-windmill-ring" r="46" fill="none" stroke="#8f83d9" strokeWidth="6" strokeDasharray="20 10" />
            <circle cx="-16" cy="-16" r="10" fill="#8f83d9" /><circle cx="16" cy="16" r="10" fill="#8f83d9" />
            <line x1="-26" y1="26" x2="26" y2="-26" stroke="#8f83d9" strokeWidth="7" strokeLinecap="round" />
          </g></g>
        </g>

        <g transform="translate(700 300)">
          {[0, 1, 2, 3, 4].map((i) => <g key={i} transform={`translate(${(i % 2) * 6} ${-14 - i * 12})`}><ellipse cx="0" cy="0" rx="34" ry="9" fill="#ffd978" stroke="#e0a03a" strokeWidth="1.5" /><ellipse cx="0" cy="-4" rx="34" ry="9" fill="#ffe7a8" stroke="#e0a03a" strokeWidth="1.5" /></g>)}
          <text x="6" y="-70" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontSize="14" fontWeight="800" fill="#b9791c">₺</text>
        </g>

        <g transform="translate(820 300)">
          <path d="M-50 0v-90l50-46 50 46V0Z" fill="#ffe3ea" stroke="#f0c1cf" strokeWidth="1.5" />
          <path d="M-58-86 0-140l58 54" fill="none" stroke="#e56589" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="-14" y="-52" width="28" height="52" rx="4" fill="#ffffff" stroke="#f0c1cf" />
          <rect x="-40" y="-70" width="18" height="18" rx="3" fill="#ffffff" stroke="#f0c1cf" /><rect x="22" y="-70" width="18" height="18" rx="3" fill="#ffffff" stroke="#f0c1cf" />
        </g>

        <g transform="translate(1210 300)">
          <rect x="-26" y="-190" width="52" height="190" rx="8" fill="#dceefc" stroke="#bfdcf5" strokeWidth="1.5" />
          <circle cy="-160" r="20" fill="#ffffff" stroke="#8fbde6" strokeWidth="2" />
          <g className="scene-clock" transform="translate(0 -160)"><line x1="0" y1="0" x2="0" y2="-13" stroke="#2f4470" strokeWidth="2.5" strokeLinecap="round" /><line className="scene-clock-minute" x1="0" y1="0" x2="9" y2="4" stroke="#5b7fe8" strokeWidth="2" strokeLinecap="round" /></g>
          <path d="M-34-190h68l-34-24Z" fill="#8fbde6" />
        </g>
      </g>

      <g className="scene-layer" style={{ '--depth': 2.4 } as React.CSSProperties}>
        <path d="M-40 300c180-70 380-58 560-30 170 26 340 44 520-8 160-46 300-54 440-20V330H-40Z" fill="url(#scene-hill-a)" />
        <path d="M-40 300c220-40 420-30 620 4 200 32 400 30 600-10 120-24 220-22 300 2V330H-40Z" fill="url(#scene-hill-b)" />
        {[200, 640, 1010, 1380].map((x, i) => <g key={i} transform={`translate(${x} 262)`}><circle r="11" fill="#bfe3d1" /><circle cx="-12" cy="6" r="9" fill="#a9dcc3" /><circle cx="11" cy="7" r="8" fill="#a9dcc3" /></g>)}
      </g>

      <g className="scene-plane"><path d="M0 0 26-8 4 14l-2-8Z" fill="#ffffff" stroke="#5b7fe8" strokeWidth="1.8" strokeLinejoin="round" /><path d="M2 6 12 2" stroke="#5b7fe8" strokeWidth="1.5" /></g>
    </svg>
  </div>
}
