import type { Metadata, Viewport } from "next";
import { Bebas_Neue, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const plex = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.hidrosuce.com.br"),
  title: "Hidro Suce · Manutenção",
  description:
    "Histórico de manutenção das empilhadeiras — consulte pelo QR code ou pelo painel.",
  openGraph: {
    title: "Hidro Suce · Sistema de manutenção",
    description:
      "Sistema de Gestão de Manutenção — histórico das empilhadeiras.",
    url: "https://app.hidrosuce.com.br",
    siteName: "Hidro Suce",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bebas.variable} ${plex.variable}`}>
      <body>
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              color: "var(--color-ink)",
            },
          }}
        />
      </body>
    </html>
  );
}
