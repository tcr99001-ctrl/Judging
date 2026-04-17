import './globals.css';

export const metadata = {
  title: '가면 경매장의 마지막 증언',
  description: '단서를 정리하고 기록을 대조해 범인, 동기, 수법을 특정하는 모바일 추리 게임.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
