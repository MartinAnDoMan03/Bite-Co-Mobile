export default function Root({ children }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />

        {/* iOS "Add to Home Screen" support — Safari ignores the standard web
            manifest for this, it needs its own meta tags. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Bite & Co" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />

        {/* react-native-web layouts (ScrollView + flex:1 chains especially) need
            the whole ancestor chain to have a resolved height to grow into.
            Expo Router's default template provides this — since this custom
            +html.jsx replaces that template entirely, we have to bring it back
            ourselves or screens using ScrollView render with zero height on web. */}
        <style id="expo-reset">{`
          html, body, #root { height: 100%; }
          body { margin: 0; overflow-x: hidden; }
          #root { display: flex; flex-direction: column; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}