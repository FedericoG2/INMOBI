export function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (name === 'casa') {
    return <svg {...common} strokeWidth={2}><path d="M3 11 12 3.5 21 11" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-6h4v6" /></svg>;
  }
  if (name === 'dashboard') {
    return <svg {...common}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" /></svg>;
  }
  if (name === 'users') {
    return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 4.13a3 3 0 0 1 0 5.75" /></svg>;
  }
  if (name === 'building') {
    return <svg {...common}><path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" /><path d="M14 9h5a1 1 0 0 1 1 1v11" /><path d="M8 8h2M8 12h2M8 16h2M3 21h18" /></svg>;
  }
  if (name === 'user') {
    return <svg {...common}><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>;
  }
  if (name === 'file') {
    return <svg {...common}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>;
  }
  if (name === 'receipt') {
    return <svg {...common}><path d="M6 3h12v18l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 8h6M9 12h6" /></svg>;
  }
  if (name === 'trend') {
    return <svg {...common}><path d="M4 16l6-6 4 4 6-7" /><path d="M14 7h6v6" /></svg>;
  }
  if (name === 'alert') {
    return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v5" /><path d="M12 16h.01" /></svg>;
  }
  if (name === 'edit') {
    return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></svg>;
  }
  if (name === 'trash') {
    return <svg {...common}><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M8 7l1 13h6l1-13" /></svg>;
  }
  if (name === 'eye') {
    return <svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" /></svg>;
  }
  if (name === 'eye-off') {
    return <svg {...common}><path d="M3 3l18 18" /><path d="M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.8" /><path d="M6.1 6.8C3.7 8.6 2 12 2 12s3.5 6 10 6a9 9 0 0 0 3.2-.6" /></svg>;
  }
  if (name === 'mail') {
    return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
  }
  if (name === 'lock') {
    return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
  }
  if (name === 'logout') {
    return <svg {...common}><path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" /><path d="M15 12H3" /><path d="m6 9-3 3 3 3" /></svg>;
  }
  if (name === 'calendar') {
    return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
  }
  if (name === 'download') {
    return <svg {...common}><path d="M12 4v11" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></svg>;
  }
  if (name === 'clip') {
    return <svg {...common}><path d="m21 11-8.6 8.6a5 5 0 0 1-7-7l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4L15 7" /></svg>;
  }
  if (name === 'close') {
    return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  }
  if (name === 'check') {
    return <svg {...common}><path d="M5 12l5 5L20 7" /></svg>;
  }
  return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /></svg>;
}

export function IconButton({ label, tone = 'default', onClick, name }) {
  return (
    <button type="button" className={`icon-btn icon-btn-${tone}`} onClick={onClick} title={label} aria-label={label}>
      <Icon name={name} size={16} />
    </button>
  );
}
