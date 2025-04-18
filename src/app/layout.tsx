import type { Metadata } from "next";
import { inter, spaceGrotesk } from "./fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "KttyWorld",
  description: "KttyWorld NFTs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
