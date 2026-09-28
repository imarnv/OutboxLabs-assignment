import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: React.ReactNode, displayName: string) {
  const Icon = ({ size = 18, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const SearchIcon = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, 'SearchIcon');
export const FilterIcon = make(<path d="M3 5h18l-7 8v6l-4 2v-8z" />, 'FilterIcon');
export const RefreshIcon = make(<><path d="M20 11A8 8 0 0 0 6.3 5.7L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0 0 13.7 5.3L20 16" /><path d="M20 21v-5h-5" /></>, 'RefreshIcon');
export const StarIcon = make(<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />, 'StarIcon');
export const ClockIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, 'ClockIcon');
export const SendIcon = make(<><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>, 'SendIcon');
export const ChevronDownIcon = make(<path d="m6 9 6 6 6-6" />, 'ChevronDownIcon');
export const ArrowLeftIcon = make(<><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>, 'ArrowLeftIcon');
export const PaperclipIcon = make(<path d="m21 11-8.6 8.6a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7L10 17.4a1.7 1.7 0 0 1-2.4-2.4l8-8" />, 'PaperclipIcon');
export const UploadIcon = make(<><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" /></>, 'UploadIcon');
export const ArchiveIcon = make(<><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" /><path d="M10 12h4" /></>, 'ArchiveIcon');
export const TrashIcon = make(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></>, 'TrashIcon');
export const LogOutIcon = make(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>, 'LogOutIcon');
export const XIcon = make(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>, 'XIcon');
export const CheckIcon = make(<path d="m5 12 5 5L20 7" />, 'CheckIcon');
export const AlertIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></>, 'AlertIcon');
export const InfoIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>, 'InfoIcon');
export const ExternalLinkIcon = make(<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>, 'ExternalLinkIcon');
export const InboxIcon = make(<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></>, 'InboxIcon');
export const MailIcon = make(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></>, 'MailIcon');
export const UndoIcon = make(<><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-4" /></>, 'UndoIcon');
export const RedoIcon = make(<><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h4" /></>, 'RedoIcon');
export const BoldIcon = make(<><path d="M6 4h7a4 4 0 0 1 0 8H6z" /><path d="M6 12h8a4 4 0 0 1 0 8H6z" /></>, 'BoldIcon');
export const ItalicIcon = make(<><path d="M19 4h-9" /><path d="M14 20H5" /><path d="M15 4 9 20" /></>, 'ItalicIcon');
export const UnderlineIcon = make(<><path d="M6 4v6a6 6 0 0 0 12 0V4" /><path d="M4 20h16" /></>, 'UnderlineIcon');
export const AlignLeftIcon = make(<><path d="M3 6h18" /><path d="M3 12h12" /><path d="M3 18h16" /></>, 'AlignLeftIcon');
export const AlignCenterIcon = make(<><path d="M3 6h18" /><path d="M6 12h12" /><path d="M4 18h16" /></>, 'AlignCenterIcon');
export const AlignRightIcon = make(<><path d="M3 6h18" /><path d="M9 12h12" /><path d="M5 18h16" /></>, 'AlignRightIcon');
export const ListIcon = make(<><path d="M9 6h12" /><path d="M9 12h12" /><path d="M9 18h12" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></>, 'ListIcon');
export const ListOrderedIcon = make(<><path d="M10 6h11" /><path d="M10 12h11" /><path d="M10 18h11" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></>, 'ListOrderedIcon');
export const QuoteIcon = make(<><path d="M3 21c3 0 7-1 7-8V5H3v7h4" /><path d="M14 21c3 0 7-1 7-8V5h-7v7h4" /></>, 'QuoteIcon');
export const StrikeIcon = make(<><path d="M16 4H9a3 3 0 0 0-2.8 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><path d="M4 12h16" /></>, 'StrikeIcon');
export const TypeIcon = make(<><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></>, 'TypeIcon');

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SlackIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 122.8 122.8" aria-hidden="true">
      <path fill="#E01E5A" d="M25.8 77.6a12.9 12.9 0 1 1-12.9-12.9h12.9zm6.5 0a12.9 12.9 0 0 1 25.8 0v32.3a12.9 12.9 0 1 1-25.8 0z" />
      <path fill="#36C5F0" d="M45.2 25.8a12.9 12.9 0 1 1 12.9-12.9v12.9zm0 6.5a12.9 12.9 0 0 1 0 25.8H12.9a12.9 12.9 0 0 1 0-25.8z" />
      <path fill="#2EB67D" d="M97 45.2a12.9 12.9 0 1 1 12.9 12.9H97zm-6.5 0a12.9 12.9 0 0 1-25.8 0V12.9a12.9 12.9 0 1 1 25.8 0z" />
      <path fill="#ECB22E" d="M77.6 97a12.9 12.9 0 1 1-12.9 12.9V97zm0-6.5a12.9 12.9 0 0 1 0-25.8h32.3a12.9 12.9 0 0 1 0 25.8z" />
    </svg>
  );
}
