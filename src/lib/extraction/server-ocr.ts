import { existsSync } from "node:fs";
import { join } from "node:path";
import type Tesseract from "tesseract.js";

type Worker = Tesseract.Worker;

let workerPromise: Promise<Worker> | null = null;
let recognizeChain: Promise<void> = Promise.resolve();

function tessdataDir(): string {
  const candidates = [
    join(process.cwd(), "tessdata"),
    join(process.cwd(), "..", "tessdata"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "eng.traineddata"))) return dir;
  }
  throw new Error("Missing bundled tessdata/eng.traineddata for server OCR.");
}

async function createServerWorker(): Promise<Worker> {
  const langDir = tessdataDir();
  const Tesseract = await import("tesseract.js");
  return Tesseract.createWorker("eng", 1, {
    logger: () => undefined,
    langPath: langDir,
    cachePath: langDir,
    cacheMethod: "readOnly",
    gzip: false,
  });
}

function getServerWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createServerWorker().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

export async function recognizeImageOnServer(imagePath: string): Promise<{
  text: string;
  confidence?: number;
}> {
  const Tesseract = await import("tesseract.js");
  const run = recognizeChain.then(async () => {
    const worker = await getServerWorker();
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    });
    const result = await worker.recognize(imagePath);
    const text = result.data.text?.trim() ?? "";
    const confidence =
      typeof result.data.confidence === "number"
        ? Math.min(1, Math.max(0, result.data.confidence / 100))
        : undefined;
    return { text, confidence };
  });
  recognizeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
