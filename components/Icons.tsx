import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// 1. Network / Signal / Antenna Icon (replaces 📡, 📶)
export const NetworkIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#0ea5e9]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" />
  </svg>
);

// 2. Plane / Travel Icon (replaces ✈️)
export const PlaneIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#0ea5e9]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

// 3. Infinity / Eco Icon (replaces ♾️)
export const InfinityIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c2.485 0 4.5-2.015 4.5-4.5S18.985 3 16.5 3 12 5.015 12 7.5 9.515 12 7.5 12 3 9.985 3 7.5 5.015 3 7.5 3 12 5.015 12 7.5c0 2.485 2.015 4.5 4.5 4.5s4.5-2.015 4.5-4.5S18.985 12 16.5 12z" />
  </svg>
);

// 4. Bolt / Pro Icon (replaces ⚡)
export const BoltIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#0ea5e9]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

// 5. Globe Icon (replaces 🌍, 🌐)
export const GlobeIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0a8.997 8.997 0 017.843-4.582M12 21a8.997 8.997 0 00-7.843-4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
  </svg>
);

// 6. Tag / Price Icon (replaces 💶, 🏷️)
export const TagIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#0ea5e9]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.125 1.125 0 001.591 0l4.318-4.318a1.125 1.125 0 000-1.591L9.568 3.659A2.25 2.25 0 008.97 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h.008v.008H6V7.5z" />
  </svg>
);

// 7. Shield / Check / Secure Icon (replaces 🔒, ✅)
export const ShieldIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
  </svg>
);

// 8. Cart Icon (replaces 🛒)
export const CartIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
  </svg>
);

// 9. Trash Icon (replaces 🗑️)
export const TrashIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#ef4444]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9 9m12 6a12 12 0 01-3 1.25m-3 1.25H9M3 9h18M9 4.5h6" />
  </svg>
);

// 10. Phone / Mobile Icon (replaces 📱)
export const PhoneIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H13.5A2.25 2.25 0 0115.75 3.75v16.5a2.25 2.25 0 01-2.25 2.25H10.5a2.25 2.25 0 01-2.25-2.25V3.75a2.25 2.25 0 012.25-2.25z" />
  </svg>
);

// 11. Calendar Icon (replaces 📅)
export const CalendarIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

// 12. Book Icon (replaces 📖)
export const BookIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

// 13. Pen / Write Icon (replaces ✍️)
export const PenIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#0ea5e9]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

// 14. Search Icon (replaces 🔍)
export const SearchIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

// 15. Mail / Envelope Icon (replaces ✉️)
export const MailIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

// 16. Eye Icon (replaces 👁️)
export const EyeIcon: React.FC<IconProps> = ({ size = 20, className = 'text-slate-400', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// 17. EyeOff / Hide Icon (replaces 🙈)
export const EyeOffIcon: React.FC<IconProps> = ({ size = 20, className = 'text-slate-400', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.895 7.895L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

// 20. NoPhone Icon (replaces 📵)
export const NoPhoneIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#ef4444]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.5 1.5H13.5A2.25 2.25 0 0115.75 3.75v12m-6 6H10.5A2.25 2.25 0 018.25 19.5v-12" />
  </svg>
);

// 21. Gift / Cashback Icon (replaces 🎁, 💰)
export const GiftIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#0ea5e9]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5h-18M21 7.5a2.25 2.25 0 00-2.25-2.25H15M3 7.5a2.25 2.25 0 012.25-2.25H9m12 2.25v12A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75V7.5m18 0v-2.25A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25V7.5m9-4.5v18m0-18a2.25 2.25 0 00-2.25 2.25v2.25h4.5v-2.25A2.25 2.25 0 0012 3z" />
  </svg>
);

// 22. Wrench / Tools / Admin Icon (replaces 🛠️)
export const WrenchIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.83-5.83m-3.75 3.75l-.375-.375M21 3a2.652 2.652 0 00-3.75 0l-8.59 8.59m0 0l-.375-.375M13.5 13.5l.375.375M21 3h-.008V3H21zm0 0v.008H21V3zm0 0h-.008V3H21z" />
  </svg>
);

// 23. Hourglass / Wait / Progress Icon (replaces ⏳)
export const HourglassIcon: React.FC<IconProps> = ({ size = 20, className = 'text-amber-500', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

// 24. Info Icon (replaces ℹ️)
export const InfoIcon: React.FC<IconProps> = ({ size = 20, className = 'text-slate-400', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.086.797l-1.047 3.328a.75.75 0 001.08.852l.045-.022M9 10.5h.008v.008H9V10.5zm0 2.25h.008v.008H9v-.008z" />
  </svg>
);

// 25. CreditCard Icon (replaces 💳)
export const CreditCardIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#0ea5e9]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-10.5-12h18a2.25 2.25 0 012.25 2.25v13.5a2.25 2.25 0 01-2.25 2.25h-18a2.25 2.25 0 01-2.25-2.25V5.25A2.25 2.25 0 012.25 5.25z" />
  </svg>
);

// 26. Camera / Scan Icon (replaces 📷)
export const CameraIcon: React.FC<IconProps> = ({ size = 20, className = 'text-[#1d4ed8]', ...props }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className={`${className} shrink-0`} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);
