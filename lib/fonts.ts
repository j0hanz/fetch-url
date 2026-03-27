import localFont from 'next/font/local';

export const geistSans = localFont({
  src: '../assets/fonts/GeistSans-Variable.woff2',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  variable: '--font-geist-sans',
  weight: '100 900',
});

export const geistMono = localFont({
  src: '../assets/fonts/GeistMono-Variable.woff2',
  adjustFontFallback: false,
  display: 'swap',
  fallback: ['ui-monospace', 'SFMono-Regular', 'monospace'],
  variable: '--font-geist-mono',
  weight: '100 900',
});
