import { BRAND } from '../config';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`logo ${light ? 'logo-light' : ''}`}>
      <svg viewBox="0 0 40 28" width="36" height="25" aria-hidden>
        <g fill="#f26a1b">
          <path d="M20 0l7 7-7 7-7-7z" />
          <path d="M11 9l7 7-7 7-7-7z" />
          <path d="M29 9l7 7-7 7-7-7z" />
          <path d="M20 14l7 7-7 7-7-7z" opacity=".85" />
        </g>
      </svg>
      <span className="logo-text">
        <b>{BRAND.name}</b>
        <small>{BRAND.tagline}</small>
      </span>
    </span>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden fill="currentColor">
      <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.2-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9 0-5.9 4.9-10.6 10.9-10.6s10.9 4.8 10.9 10.6-4.8 10.6-10.8 10.6zm6-7.9c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.7-.5z" />
    </svg>
  );
}
