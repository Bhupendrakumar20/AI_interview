/**
 * Theme-matched transparent vector visuals for the Interview Buddy CTA banner.
 */

export function InterviewBuddyTitleIcon() {
  return (
    <span
      className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-linear-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-blue-500/30 ring-1 ring-white/25 shrink-0"
      aria-hidden="true"
    >
      {/* Bold dual-chat / interview buddy icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-6 h-6 text-white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6.5" cy="6.5" r="0.9" fill="currentColor" />
        <circle cx="9.5" cy="6.5" r="0.9" fill="currentColor" />
      </svg>
    </span>
  );
}

export function InterviewBuddyScene() {
  return (
    <svg
      viewBox="0 0 340 205"
      fill="none"
      role="img"
      aria-label="Interview Buddy live practice illustration"
      className="w-64 sm:w-72 md:w-80 h-auto drop-shadow-xl select-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ib-bubble-grad" x1="124" y1="22" x2="216" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="ib-chair-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A5B4FC" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="ib-chair-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C7D2FE" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="ib-shirt-blue" x1="70" y1="84" x2="108" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="ib-shirt-cyan" x1="235" y1="84" x2="262" y2="124" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="ib-leaf-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>

      {/* Soft transparent ground shadow */}
      <ellipse cx="170" cy="186" rx="136" ry="7" fill="#6366F1" fillOpacity="0.22" />

      {/* Floating decorative dots, orb & mini analytics bars */}
      <circle cx="80" cy="36" r="7" fill="#3B82F6" />
      <circle cx="82" cy="36" r="7" stroke="#93C5FD" strokeWidth="1.5" strokeOpacity="0.7" />
      <circle cx="44" cy="64" r="2" fill="#93C5FD" fillOpacity="0.8" />
      <circle cx="53" cy="64" r="2" fill="#93C5FD" fillOpacity="0.5" />
      <circle cx="242" cy="36" r="2" fill="#93C5FD" fillOpacity="0.8" />
      <circle cx="251" cy="36" r="2" fill="#93C5FD" fillOpacity="0.5" />

      <rect x="275" y="52" width="4.5" height="8" rx="1.5" fill="#38BDF8" />
      <rect x="282.5" y="47" width="4.5" height="13" rx="1.5" fill="#60A5FA" />
      <rect x="290" y="42" width="4.5" height="18" rx="1.5" fill="#818CF8" />

      {/* Center speech bubble */}
      <path
        d="M134 22H206C211.523 22 216 26.4772 216 32V60C216 65.5228 211.523 70 206 70H154L137 82L141 70H134C128.477 70 124 65.5228 124 60V32C124 26.4772 128.477 22 134 22Z"
        fill="url(#ib-bubble-grad)"
      />
      {/* Audio / conversation bars inside bubble */}
      <rect x="150" y="42" width="5" height="8" rx="2.5" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="160" y="36" width="5" height="20" rx="2.5" fill="#FFFFFF" />
      <rect x="170" y="39" width="5" height="14" rx="2.5" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="180" y="34" width="5" height="24" rx="2.5" fill="#FFFFFF" />
      <rect x="190" y="41" width="5" height="10" rx="2.5" fill="#FFFFFF" fillOpacity="0.9" />

      {/* Left potted plant */}
      <path d="M35 162C28 148 25 138 30 130C37 136 40 148 39 162Z" fill="url(#ib-leaf-grad)" fillOpacity="0.85" />
      <path d="M41 162C39 144 43 130 50 124C53 135 50 149 45 162Z" fill="#60A5FA" />
      <path d="M46 162C50 150 56 142 62 140C60 150 54 157 48 162Z" fill="#818CF8" fillOpacity="0.9" />
      <path d="M34 162H50L47.5 184H36.5L34 162Z" fill="#1E1B4B" stroke="#6366F1" strokeOpacity="0.5" strokeWidth="1" />

      {/* Right potted plant */}
      <path d="M305 162C312 148 315 138 310 130C303 136 300 148 301 162Z" fill="url(#ib-leaf-grad)" fillOpacity="0.85" />
      <path d="M299 162C301 144 297 130 290 124C287 135 290 149 295 162Z" fill="#60A5FA" />
      <path d="M294 162C290 150 284 142 278 140C280 150 286 157 292 162Z" fill="#818CF8" fillOpacity="0.9" />
      <path d="M290 162H306L303.5 184H292.5L290 162Z" fill="#1E1B4B" stroke="#6366F1" strokeOpacity="0.5" strokeWidth="1" />

      {/* Left armchair */}
      <path d="M74 156L62 184M94 156L106 184M84 156V182" stroke="#A5B4FC" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="52" y="96" width="50" height="52" rx="14" fill="url(#ib-chair-back)" />
      <rect x="56" y="130" width="66" height="26" rx="10" fill="url(#ib-chair-front)" />

      {/* Person 1 (left - seated, facing right) */}
      {/* Head & hair */}
      <circle cx="86" cy="70" r="10.5" fill="#FDBA74" />
      <path d="M75.5 69C75.5 58 95.5 56 97.5 66C92.5 64 84 65 79.5 72C77 71.5 75.5 70.5 75.5 69Z" fill="#0F172A" />
      <rect x="83" y="79" width="6" height="7" rx="2" fill="#FDBA74" />
      {/* Sweater */}
      <path d="M70 87C72 82 97 82 101 90L106 122H70V87Z" fill="url(#ib-shirt-blue)" />
      {/* Arm & hand */}
      <path d="M93 95L117 110L113 117L86 107Z" fill="#60A5FA" />
      <circle cx="117" cy="113.5" r="3.8" fill="#FDBA74" />
      {/* Pants & shoes */}
      <path d="M71 122H113C121 122 124 127 124 134V175H111L109 138H71V122Z" fill="#0F172A" />
      <path d="M111 175L131 178C133.5 178.5 133.5 184 128.5 184H109V175Z" fill="#020617" />

      {/* Studio / interview desk mic on stand */}
      <path d="M134 184V114" stroke="#CBD5E1" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M126 184H142" stroke="#CBD5E1" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="122" y="106" width="15" height="7" rx="3.5" transform="rotate(-12 122 106)" fill="#38BDF8" />
      <circle cx="122" cy="109" r="3.2" fill="#E0F2FE" />

      {/* Right armchair */}
      <path d="M246 156L234 184M266 156L278 184M256 156V182" stroke="#A5B4FC" strokeWidth="3.2" strokeLinecap="round" />
      <rect x="238" y="96" width="50" height="52" rx="14" fill="url(#ib-chair-back)" />
      <rect x="218" y="130" width="66" height="26" rx="10" fill="url(#ib-chair-front)" />

      {/* Person 2 (right - seated, facing left) */}
      {/* Flowing back hair */}
      <path d="M248 63C260 59 269 69 270 86C270 96 265 103 257 103L249 86Z" fill="#0F172A" />
      {/* Head & front hair */}
      <circle cx="250" cy="70" r="10" fill="#FDBA74" />
      <path d="M240 68C241 58 258 57 260 68C254 65 246 65 242 70Z" fill="#0F172A" />
      <rect x="247" y="79" width="6" height="7" rx="2" fill="#FDBA74" />
      {/* Top */}
      <path d="M238 87C242 82 259 83 261 92L259 124H235L238 87Z" fill="url(#ib-shirt-cyan)" />
      {/* Arm & hand */}
      <path d="M243 94L222 117L228 122L247 104Z" fill="#38BDF8" />
      <circle cx="222" cy="120" r="3.6" fill="#FDBA74" />
      {/* Trousers & shoes */}
      <path d="M236 124H210C203 124 200 129 200 136L198 175H211L215 139H256V124H236Z" fill="#334155" />
      <path d="M198 175H212V184H190C187 184 187 179 198 175Z" fill="#020617" />
    </svg>
  );
}
