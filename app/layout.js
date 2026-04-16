import './globals.css';

export const metadata = {
  title: '가면 경매장의 마지막 증언',
  description: '멀티플레이 카드 추리 보드게임',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
