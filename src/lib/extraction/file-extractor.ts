import { getDocumentKind, isImageFile } from "@/lib/upload-utils";

export type ExtractionResult = {
  text: string;
  error?: string;
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

  const Tesseract = await import("tesseract.js");
  const result = await Tesseract.recognize(file, "eng", {
    logger: () => undefined,
  });

  const text = result.data.text?.trim() ?? "";
  if (text.length < 10) {
    return {
      text,
      error: "Image text could not be read clearly. Try a sharper screenshot.",
    };
  }

  return { text };
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
  if (text.length < 10) {
    return {
      text,
      error: "PDF contains little extractable text. It may be a scanned image.",
    };
  }

  return { text };
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
