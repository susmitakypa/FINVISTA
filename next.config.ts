import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["tesseract.js", "pdfjs-dist"],
};

export default nextConfig;
