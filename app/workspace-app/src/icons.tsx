// The few icons the shell needs, drawn inline so the app ships no icon font.
const svg = (path: React.ReactNode, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);
export const Play = () => svg(<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />, 14);
export const PlayAll = () => svg(<><path d="M4 4.5v15l9-7.5z" fill="currentColor" stroke="none" /><path d="M14 4.5v15l9-7.5z" fill="currentColor" stroke="none" /></>, 15);
export const Reset = () => svg(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>);
export const Panel = () => svg(<><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></>);
export const Check = () => svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, 13);
export const Cross = () => svg(<path d="M6 6l12 12M18 6L6 18" />, 13);
export const Arrow = ({ back = false }: { back?: boolean }) => svg(back ? <path d="M19 12H5M11 6l-6 6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />, 18);
export const Lock = () => svg(<><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, 14);
export const Unlock = () => svg(<><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 7.5-2" /></>, 14);
export const Chevron = () => svg(<path d="M9 6l6 6-6 6" />, 13);
