// app/+html.jsx
export default function Root({ children }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bite & Co" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}