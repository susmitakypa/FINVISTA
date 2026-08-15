import { getDocumentKind, isImageFile } from "@/lib/upload-utils";

export type ExtractionResult = {
  text: string;
  error?: string;
  confidence?: number;
};

export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  if (file.size === 0) {
    return { text: "", error: "File is empty." };
  }

  const kind = getDocumentKind(file);

  try {
    switch (kind) {
      case "image":
        return await extractTextFromImage(file);
      case "pdf":
        return await extractTextFromPdf(file);
      case "csv":
        return await extractTextFromCsv(file);
      case "spreadsheet":
        return await extractTextFromSpreadsheet(file);
      case "presentation":
        return await extractTextFromPresentation(file);
      default:
        return {
          text: "",
          error: `Unsupported file type: ${file.name}`,
        };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction failed unexpectedly.";
    return { text: "", error: message };
  }
}

async function extractTextFromImage(file: File): Promise<ExtractionResult> {
  if (!isImageFile(file)) {
    return { text: "", error: "Unreadable image format." };
  }

  const prepared = await tesseractImageInput(file);
  try {
    if (typeof window === "undefined" && typeof prepared.image === "string") {
      const { recognizeImageOnServer } = await import("./server-ocr");
      const { text, confidence } = await recognizeImageOnServer(prepared.image);
      if (text.length < 10) {
        return {
          text,
          confidence,
          error: "Image text could not be read clearly. Try a sharper screenshot.",
        };
      }
      return { text, confidence };
    }

    const Tesseract = await import("tesseract.js");
    const worker = await Tesseract.createWorker("eng", 1, {
      logger: () => undefined,
    });
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });
      const result = await worker.recognize(prepared.image);
      const text = result.data.text?.trim() ?? "";
      const confidence =
        typeof result.data.confidence === "number"
          ? Math.min(1, Math.max(0, result.data.confidence / 100))
          : undefined;
      if (text.length < 10) {
        return {
          text,
          confidence,
          error: "Image text could not be read clearly. Try a sharper screenshot.",
        };
      }
      return { text, confidence };
    } finally {
      await worker.terminate();
    }
  } finally {
    await prepared.cleanup();
  }
}

async function tesseractImageInput(file: File): Promise<{
  image: File | string;
  cleanup: () => Promise<void>;
}> {
  if (typeof window !== "undefined") {
    return { image: file, cleanup: async () => undefined };
  }

  const { writeFile, unlink } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = imageExtension(file, bytes);
  const tempPath = join(
    tmpdir(),
    `finvista-ocr-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`,
  );
  await writeFile(tempPath, bytes);
  return {
    image: tempPath,
    cleanup: async () => {
      await unlink(tempPath).catch(() => undefined);
    },
  };
}

function imageExtension(file: File, bytes: Buffer): string {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return ".png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return ".jpg";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp";
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return ".jpg";
  if (name.endsWith(".webp")) return ".webp";
  return ".png";
}

async function extractTextFromPdf(file: File): Promise<ExtractionResult> {
  const pdfjs = await import("pdfjs-dist");

  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }

  const text = pages.join("\n").trim();
  if (text.length >= 80) {
    return { text };
  }

  const ocrText = await ocrPdfPages(pdf, Math.min(pdf.numPages, 12));
  const combined = [text, ocrText].filter(Boolean).join("\n").trim();
  if (combined.length < 10) {
    return {
      text: combined,
      error: "PDF contains little extractable text. It may be a scanned image.",
    };
  }
  return { text: combined };
}

async function ocrPdfPages(
  pdf: { numPages: number; getPage: (n: number) => Promise<unknown> },
  maxPages: number,
): Promise<string> {
  if (typeof document === "undefined") return "";

  const Tesseract = await import("tesseract.js");
  const chunks: string[] = [];
  const worker = await Tesseract.createWorker("eng", 1, {
    logger: () => undefined,
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK });
    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      const page = (await pdf.getPage(pageNum)) as {
        getViewport: (opts: { scale: number }) => {
          width: number;
          height: number;
        };
        render: (opts: {
          canvasContext: CanvasRenderingContext2D;
          viewport: { width: number; height: number };
        }) => { promise: Promise<void> };
      };
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d");
      if (!context) continue;
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) continue;
      const result = await worker.recognize(blob);
      const pageText = result.data.text?.trim() ?? "";
      if (pageText) chunks.push(pageText);
    }
  } finally {
    await worker.terminate();
  }
  return chunks.join("\n").trim();
}

async function extractTextFromCsv(file: File): Promise<ExtractionResult> {
  const text = await file.text();
  return { text: text.trim() };
}

async function extractTextFromSpreadsheet(file: File): Promise<ExtractionResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`--- ${sheetName} ---\n${csv}`);
  }

  const text = sheets.join("\n\n").trim();
  if (!text) {
    return { text: "", error: "Spreadsheet appears to be empty." };
  }

  return { text };
}

async function extractTextFromPresentation(file: File): Promise<ExtractionResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ppt") && !name.endsWith(".pptx")) {
    return {
      text: "",
      error:
        "Legacy PPT files cannot be read in the browser. Upload a PDF or PPTX instead.",
    };
  }

  try {
    const text = await extractPptxSlideText(await file.arrayBuffer());
    if (text.length < 10) {
      return {
        text,
        error: "Presentation contained little extractable text.",
      };
    }
    return { text };
  } catch {
    return {
      text: "",
      error: "Presentation could not be processed. Try a PDF export.",
    };
  }
}

async function extractPptxSlideText(buffer: ArrayBuffer): Promise<string> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const slides: string[] = [];
  let offset = 0;

  while (offset + 30 < bytes.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const fileName = new TextDecoder().decode(
      bytes.slice(nameStart, nameStart + nameLen),
    );
    const dataStart = nameStart + nameLen + extraLen;
    const compressed = bytes.slice(dataStart, dataStart + compSize);
    offset = dataStart + compSize;

    if (!/^ppt\/slides\/slide\d+\.xml$/i.test(fileName)) continue;

    let xmlBytes = compressed;
    if (method === 8) {
      xmlBytes = new Uint8Array(
        await new Response(
          new Blob([compressed]).stream().pipeThrough(
            new DecompressionStream("deflate-raw"),
          ),
        ).arrayBuffer(),
      );
    } else if (method !== 0) {
      continue;
    }

    const xml = new TextDecoder().decode(xmlBytes);
    const parts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(
      (match) => match[1] ?? "",
    );
    const slideText = parts.join(" ").trim();
    if (slideText) slides.push(slideText);
  }

  return slides.join("\n").trim();
}
