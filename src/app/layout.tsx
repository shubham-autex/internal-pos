import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mela Stall POS",
  description: "Internal stall POS for mela sales, cart, profit, and payments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
