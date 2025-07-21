import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import ClientLayout from "./ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ABIC Realty Accounting System",
  description: "Accounting System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
        <head>
          <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="font-sans antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
