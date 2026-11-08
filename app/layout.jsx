import "./globals.css";

export const metadata = {
  title: "Restora | Restaurant Management",
  description: "Restaurant operations, thoughtfully organized.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
