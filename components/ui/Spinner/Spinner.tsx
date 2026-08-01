interface SpinnerProps {
  size?: number
  style?: React.CSSProperties
}

export function Spinner({ size = 24, style }: SpinnerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spinner-rotate 0.8s linear infinite' }}>
        <style>{`@keyframes spinner-rotate { to { transform: rotate(360deg) } }`}</style>
        <circle cx="12" cy="12" r="10" stroke="var(--color-border)" strokeWidth="3" fill="none" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-brand-dark)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  )
}
