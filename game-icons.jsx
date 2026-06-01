// game-icons.jsx — minimal line icons. Exports window.Icon
function Icon({ name, size = 20, color = 'currentColor', sw = 1.8, fill = 'none', style = {} }) {
  const p = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    tag: <><path {...p} d="M3 11.5 11.5 3H20a1 1 0 0 1 1 1v8.5L12.5 21a1.5 1.5 0 0 1-2.1 0L3 13.6a1.5 1.5 0 0 1 0-2.1Z"/><circle cx="16" cy="8" r="1.4" fill={color} stroke="none"/></>,
    plus: <><path {...p} d="M12 5v14M5 12h14"/></>,
    spark: <><path {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"/></>,
    image: <><rect {...p} x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6" {...p}/><path {...p} d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4"/></>,
    gift: <><rect {...p} x="3.5" y="9" width="17" height="4" rx="1"/><path {...p} d="M5 13v7h14v-7M12 9v11"/><path {...p} d="M12 9S10.5 4 7.5 5 9.5 9 12 9Zm0 0s1.5-5 4.5-4-1.5 4-4.5 4Z"/></>,
    frame: <><rect {...p} x="4" y="3.5" width="16" height="17" rx="1.5"/><rect {...p} x="7.5" y="7" width="9" height="10" rx="1"/></>,
    crown: <><path {...p} d="M4 8l3.5 4L12 6l4.5 6L20 8l-1.5 11h-13L4 8Z"/></>,
    wallet: <><rect {...p} x="3" y="6" width="18" height="13" rx="3"/><path {...p} d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3" fill={color} stroke="none"/></>,
    share: <><circle cx="6" cy="12" r="2.6" {...p}/><circle cx="17.5" cy="6" r="2.6" {...p}/><circle cx="17.5" cy="18" r="2.6" {...p}/><path {...p} d="m8.3 10.8 6.9-3.6M8.3 13.2l6.9 3.6"/></>,
    users: <><circle cx="9" cy="8.5" r="3" {...p}/><path {...p} d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path {...p} d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14.8c2.2.5 3.5 2.4 3.5 4.7"/></>,
    trophy: <><path {...p} d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path {...p} d="M7 5H4v1.5A3.5 3.5 0 0 0 7 10M17 5h3v1.5A3.5 3.5 0 0 1 17 10M9.5 13.5 9 18h6l-.5-4.5M7 21h10"/></>,
    spin: <><path {...p} d="M21 12a9 9 0 1 1-3.2-6.9"/><path {...p} d="M21 4v4h-4"/></>,
    info: <><circle cx="12" cy="12" r="9" {...p}/><path {...p} d="M12 11v5"/><circle cx="12" cy="7.8" r="1" fill={color} stroke="none"/></>,
    check: <><path {...p} d="M4 12.5 9.5 18 20 6"/></>,
    x: <><path {...p} d="M6 6l12 12M18 6 6 18"/></>,
    fire: <><path {...p} d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s1 1.5 2 1.5C11 9 9 7 12 3Z"/></>,
    clock: <><circle cx="12" cy="12" r="8.5" {...p}/><path {...p} d="M12 7.5V12l3 2"/></>,
    lock: <><rect {...p} x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path {...p} d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></>,
    grid: <><rect {...p} x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect {...p} x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect {...p} x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect {...p} x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/></>,
    bolt: <><path {...p} d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z"/></>,
    copy: <><rect {...p} x="8" y="8" width="12" height="12" rx="2.5"/><path {...p} d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    arrow: <><path {...p} d="M5 12h14M13 6l6 6-6 6"/></>,
    card: <><rect {...p} x="3" y="5.5" width="18" height="13" rx="2.5"/><path {...p} d="M3 9.5h18"/><path {...p} d="M6.5 14.5h3"/></>,
    apple: <><path d="M16.3 12.9c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .7 1 1.4 2 2.4 2 1 0 1.3-.6 2.5-.6 1.1 0 1.5.6 2.5.6 1 0 1.7-.9 2.3-1.9.7-1.1 1-2.2 1-2.2s-1.7-.7-1.7-3.3Z" fill={color} stroke="none"/><path d="M14.4 6.8c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.8-.4 2.3-1.1Z" fill={color} stroke="none"/></>,
    google: <><path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.1c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1Z" fill="#4285F4" stroke="none"/><path d="M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.4c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.5C5.4 19.1 8.5 21 12 21Z" fill="#34A853" stroke="none"/><path d="M7.1 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.8H3.9C3.3 9.1 3 10.5 3 12s.3 2.9.9 4.2l3.2-2.5Z" fill="#FBBC05" stroke="none"/><path d="M12 6.7c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.5 3.9 14.4 3 12 3 8.5 3 5.4 4.9 3.9 7.8l3.2 2.5C7.8 8.2 9.7 6.7 12 6.7Z" fill="#EA4335" stroke="none"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0, ...style }}>
      {paths[name] || null}
    </svg>
  );
}
window.Icon = Icon;
