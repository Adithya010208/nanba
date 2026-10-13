export function Brand({ small = false }: { small?: boolean }) {
  return <div className={`brand ${small ? 'small' : ''}`}><span className="brand-symbol" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M6 24V8h5l10 13V8h5v16h-5L11 11v13z" fill="currentColor" /></svg><i /></span><span>nanba<span className="brand-dot">.</span></span></div>
}
