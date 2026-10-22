interface DomaineLogoProps {
  variant?: 'dark' | 'light' | 'mono'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showWordmark?: boolean
  className?: string
}

const sizes = {
  sm: { mark: 28, text: 15 },
  md: { mark: 36, text: 18 },
  lg: { mark: 48, text: 24 },
  xl: { mark: 72, text: 36 },
}

export default function DomaineLogo({
  variant = 'dark',
  size = 'md',
  showWordmark = true,
  className = '',
}: DomaineLogoProps) {
  const { mark, text } = sizes[size]

  const colors = {
    dark: { mark: '#372308', text: '#372308', accent: '#F0D5A0', bg: 'none' },
    light: { mark: '#F5F0E8', text: '#F5F0E8', accent: '#F0D5A0', bg: 'none' },
    mono: { mark: '#372308', text: '#372308', accent: '#372308', bg: 'none' },
  }[variant]

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* The mark — D monogram in estate crest style */}
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer ring */}
        <circle
          cx="20"
          cy="20"
          r="19"
          stroke={colors.mark}
          strokeWidth="1.5"
          fill="none"
          opacity="0.25"
        />

        {/* Inner ring */}
        <circle
          cx="20"
          cy="20"
          r="15.5"
          stroke={colors.mark}
          strokeWidth="0.75"
          fill="none"
          opacity="0.15"
        />

        {/* D letterform — architectural, refined */}
        <path
          d="M13.5 11.5 H18.8 C23.6 11.5 27.5 14.9 27.5 20 C27.5 25.1 23.6 28.5 18.8 28.5 H13.5 Z"
          fill={colors.mark}
        />

        {/* D inner cutout — creates the negative space */}
        <path
          d="M15.8 13.8 H18.5 C22.0 13.8 25.0 16.4 25.0 20.0 C25.0 23.6 22.0 26.2 18.5 26.2 H15.8 Z"
          fill={variant === 'dark' ? '#F5F0E8' : variant === 'light' ? '#372308' : '#F5F0E8'}
        />

        {/* D spine */}
        <rect x="13.5" y="11.5" width="2.3" height="17" fill={colors.mark} />

        {/* Serif top */}
        <rect x="12.2" y="11.5" width="4.5" height="1.2" fill={colors.mark} />
        {/* Serif bottom */}
        <rect x="12.2" y="27.3" width="4.5" height="1.2" fill={colors.mark} />

        {/* Gold accent dot — top */}
        <circle cx="20" cy="5" r="1.5" fill={colors.accent} />
        {/* Gold accent dot — bottom */}
        <circle cx="20" cy="35" r="1.5" fill={colors.accent} />
        {/* Gold accent dot — left */}
        <circle cx="5" cy="20" r="1" fill={colors.accent} opacity="0.6" />
        {/* Gold accent dot — right */}
        <circle cx="35" cy="20" r="1" fill={colors.accent} opacity="0.6" />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          style={{
            fontSize: text,
            color: colors.text,
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          Domaine
        </span>
      )}
    </div>
  )
}
