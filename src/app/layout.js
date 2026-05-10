export const metadata = {
  title: "Byggkalkylen",
  description: "Hantverkarapp – Kalkyl, Offert, Tid, Kvitto, Export",
};
 
export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0e1012" }}>
        {children}
      </body>
    </html>
  );
}
