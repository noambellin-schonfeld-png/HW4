import { useId } from 'react'

/**
 * Original bulldog mascot illustration (inline SVG, no image files).
 * pose: "sitting" (full body in a Y sweater), "head" (avatar/logo), "peek" (head + paws over an edge)
 * mood: "happy" or "sad" (404 / empty states)
 */

type Pose = 'sitting' | 'head' | 'peek'
type Mood = 'happy' | 'sad'

const FUR = '#f6f2ec'
const SHADE = '#ddd5ca'
const EAR = '#c9b49c'
const INK = '#1f2533'
const NAVY = '#00356b'

function Head({ mood, id }: { mood: Mood; id: string }) {
  const sad = mood === 'sad'
  return (
    <g>
      {/* ears */}
      <path d="M44 62 C30 40 40 26 62 34 C66 46 60 58 52 66 Z" fill={EAR} />
      <path d="M156 62 C170 40 160 26 138 34 C134 46 140 58 148 66 Z" fill={EAR} />
      <path d="M48 58 C42 44 48 36 60 40 C60 48 56 54 52 60 Z" fill="#a8927a" opacity="0.55" />
      <path d="M152 58 C158 44 152 36 140 40 C140 48 144 54 148 60 Z" fill="#a8927a" opacity="0.55" />
      {/* skull + jowls */}
      <path
        d="M100 34 C150 34 178 66 176 104 C175 138 158 160 132 168 C120 172 80 172 68 168 C42 160 25 138 24 104 C22 66 50 34 100 34 Z"
        fill={`url(#fur-${id})`}
      />
      {/* fawn patch over one eye */}
      <path d="M120 60 C140 54 160 66 160 88 C156 100 140 104 126 98 C116 90 112 70 120 60 Z" fill={EAR} opacity="0.85" />
      {/* brow wrinkles */}
      <g stroke={SHADE} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M78 58 Q100 50 122 58" />
        <path d="M84 66 Q100 60 116 66" />
        {!sad && <path d="M56 80 Q68 72 82 78" stroke="#b9ad9d" />}
        {!sad && <path d="M144 80 Q132 72 118 78" stroke="#b9ad9d" />}
      </g>
      {/* eyes */}
      <g>
        <ellipse cx="72" cy="92" rx="10" ry={sad ? 8 : 10} fill={INK} />
        <ellipse cx="128" cy="92" rx="10" ry={sad ? 8 : 10} fill={INK} />
        <circle cx="75" cy="88" r="3" fill="#fff" />
        <circle cx="131" cy="88" r="3" fill="#fff" />
        {sad && (
          <>
            {/* sad brows: inner ends raised */}
            <path d="M58 84 L82 76" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <path d="M142 84 L118 76" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <path d="M66 104 Q63 112 66 116 Q70 112 66 104 Z" fill="#7fb3ff" />
          </>
        )}
      </g>
      {/* muzzle */}
      <ellipse cx="100" cy="128" rx="46" ry="30" fill="#fbf9f6" />
      <path d="M58 128 Q60 112 76 108" stroke={SHADE} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M142 128 Q140 112 124 108" stroke={SHADE} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* nose */}
      <path d="M84 108 Q100 100 116 108 Q118 118 104 122 L96 122 Q82 118 84 108 Z" fill={INK} />
      <ellipse cx="94" cy="108" rx="4" ry="2" fill="#5b6475" />
      {/* mouth: jowls + underbite */}
      {sad ? (
        <path d="M76 152 Q100 136 124 152" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <path d="M100 122 L100 132 Q90 144 74 140" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M100 132 Q110 144 126 140" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M78 142 Q100 166 122 142 Q112 150 100 150 Q88 150 78 142 Z" fill="#8a3a4a" />
          <path d="M84 146 L88 136 L92 147 Z" fill="#fff" />
          <path d="M116 146 L112 136 L108 147 Z" fill="#fff" />
        </>
      )}
      {/* cheeks */}
      <circle cx="56" cy="122" r="7" fill="#f3b6b0" opacity="0.45" />
      <circle cx="144" cy="122" r="7" fill="#f3b6b0" opacity="0.45" />
    </g>
  )
}

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={`fur-${id}`} cx="50%" cy="40%" r="65%">
        <stop offset="0.6" stopColor={FUR} />
        <stop offset="1" stopColor={SHADE} />
      </radialGradient>
      <linearGradient id={`silver-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.45" stopColor="#c5ccd6" />
        <stop offset="0.55" stopColor="#e9edf2" />
        <stop offset="1" stopColor="#8f9aaa" />
      </linearGradient>
      <linearGradient id={`navy-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1a4f8a" />
        <stop offset="1" stopColor={NAVY} />
      </linearGradient>
    </defs>
  )
}

export function Bulldog({
  pose = 'head',
  mood = 'happy',
  className,
  title,
}: {
  pose?: Pose
  mood?: Mood
  className?: string
  title?: string
}) {
  const id = `bd${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const label = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true }

  if (pose === 'sitting') {
    return (
      <svg viewBox="0 0 220 300" className={className} {...label}>
        <Defs id={id} />
        {/* shadow */}
        <ellipse cx="110" cy="288" rx="86" ry="10" fill="#000" opacity="0.18" />
        {/* body in a navy varsity sweater */}
        <path
          d="M40 290 C30 230 44 176 70 156 L150 156 C176 176 190 230 180 290 Z"
          fill={`url(#navy-${id})`}
        />
        {/* silver varsity stripes on the hem + collar */}
        <path d="M34 270 L186 270 L184 280 L36 280 Z" fill={`url(#silver-${id})`} />
        <path d="M66 160 Q110 182 154 160 L150 170 Q110 192 70 170 Z" fill={`url(#silver-${id})`} />
        {/* chenille Y letter */}
        <path
          d="M84 196 h18 l8 16 l8 -16 h18 l-18 30 v24 h-16 v-24 Z"
          fill="#fff"
          stroke={`url(#silver-${id})`}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* front paws */}
        <ellipse cx="80" cy="286" rx="22" ry="12" fill={FUR} />
        <ellipse cx="140" cy="286" rx="22" ry="12" fill={FUR} />
        <path d="M72 284 v6 M80 283 v7 M88 284 v6 M132 284 v6 M140 283 v7 M148 284 v6" stroke={SHADE} strokeWidth="2" />
        <g transform="translate(10 0)">
          <Head mood={mood} id={id} />
        </g>
        {/* collar tag */}
        <circle cx="110" cy="176" r="9" fill={`url(#silver-${id})`} stroke="#8f9aaa" strokeWidth="1.5" />
        <text x="110" y="180" textAnchor="middle" fontSize="10" fontWeight="800" fill={NAVY} fontFamily="Graduate, serif">
          Y
        </text>
      </svg>
    )
  }

  if (pose === 'peek') {
    return (
      <svg viewBox="0 0 200 170" className={className} {...label}>
        <Defs id={id} />
        <Head mood={mood} id={id} />
        {/* paws over the edge */}
        <g>
          <ellipse cx="54" cy="164" rx="24" ry="14" fill={FUR} stroke={SHADE} strokeWidth="2" />
          <ellipse cx="146" cy="164" rx="24" ry="14" fill={FUR} stroke={SHADE} strokeWidth="2" />
          <path d="M44 160 v8 M54 158 v10 M64 160 v8 M136 160 v8 M146 158 v10 M156 160 v8" stroke={SHADE} strokeWidth="2" />
        </g>
      </svg>
    )
  }

  return (
    <svg viewBox="16 24 168 156" className={className} {...label}>
      <Defs id={id} />
      <Head mood={mood} id={id} />
      <path d="M62 168 Q100 184 138 168 L136 178 Q100 192 64 178 Z" fill={NAVY} />
      <circle cx="100" cy="182" r="6" fill={`url(#silver-${id})`} />
    </svg>
  )
}

/** Small paw print, used for typing dots, bullets, and decoration. */
export function Paw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <ellipse cx="12" cy="16" rx="5.5" ry="4.5" fill="currentColor" />
      <ellipse cx="5.5" cy="10" rx="2.3" ry="3" fill="currentColor" />
      <ellipse cx="9.5" cy="6" rx="2.3" ry="3" fill="currentColor" />
      <ellipse cx="14.5" cy="6" rx="2.3" ry="3" fill="currentColor" />
      <ellipse cx="18.5" cy="10" rx="2.3" ry="3" fill="currentColor" />
    </svg>
  )
}
