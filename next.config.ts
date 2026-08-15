import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["tesseract.js", "tesseract.js-core", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/excel/extract": ["./tessdata/**/*"],
    "/api/extract": ["./tessdata/**/*"],
  },
};

export default nextConfig;
