import './globals.css';

export const metadata = {
  title: '가면 경매장의 마지막 증언',
  description: '모바일 중심 카드 추리 보드게임',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
