import "./globals.css";
import "./homepage.css";

export const metadata = {
  title: "Restora | Made for the love of food",
  description:
    "Discover Restora: thoughtfully prepared favorites, easy ordering, and a restaurant experience worth coming back for.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
