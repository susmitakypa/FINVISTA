import { NextResponse } from "next/server";
import {
  excelExtractClientId,
  isExcelExtractRateLimited,
} from "@/lib/excel/excel-public-rate-limit";
import {
  extractScreenshotsForExcel,
  isAllowedScreenshot,
  parseUploadCategory,
  toExcelCsv,
  toExcelExtractResponse,
} from "@/lib/excel/run-excel-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILES = 8;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UPLOAD_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FinVista Excel extract</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; color: #111; }
    p { line-height: 1.5; color: #333; }
    form { display: grid; gap: 0.75rem; margin-top: 1.5rem; }
    button { padding: 0.6rem 1rem; }
  </style>
</head>
<body>
  <h1>FinVista → Excel</h1>
  <p>Choose a Screener screenshot. FinVista extracts the numbers on the server and downloads a CSV you can open in Excel on Mac. No API key is used in the browser or Excel.</p>
  <form method="post" enctype="multipart/form-data">
    <input name="files" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple required />
    <button type="submit">Download CSV for Excel</button>
  </form>
</body>
</html>
`;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

function csvResponse(csv: string) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="finvista-extract.csv"',
    },
  });
}

function serverKeyConfigured(): boolean {
  const key = process.env.FINVISTA_API_KEY?.trim();
  if (process.env.VERCEL_ENV === "production") {
    return Boolean(key);
  }
  return true;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function GET() {
  return new NextResponse(UPLOAD_PAGE, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  if (!serverKeyConfigured()) {
    return json(
      { error: "Excel extract is not configured on the server." },
      503,
    );
  }

  if (isExcelExtractRateLimited(excelExtractClientId(request))) {
    return json({ error: "Too many extract requests. Try again in a few minutes." }, 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Expected multipart/form-data with screenshot files." }, 400);
  }

  const category = parseUploadCategory(
    typeof form.get("category") === "string" ? String(form.get("category")) : null,
  );

  const uploads = form
    .getAll("files")
    .concat(form.getAll("file"))
    .filter((entry): entry is File => typeof File !== "undefined" && entry instanceof File);

  if (uploads.length === 0) {
    return json(
      { error: "No files received. Attach PNG/JPG/WEBP screenshots as form field `files`." },
      400,
    );
  }
  if (uploads.length > MAX_FILES) {
    return json({ error: `Send at most ${MAX_FILES} screenshots per request.` }, 400);
  }

  const images: File[] = [];
  for (const upload of uploads) {
    if (upload.size === 0) {
      return json({ error: `File ${upload.name || "unnamed"} is empty.` }, 400);
    }
    if (upload.size > MAX_FILE_BYTES) {
      return json({ error: `File ${upload.name} exceeds 8 MB.` }, 400);
    }
    if (!isAllowedScreenshot(upload)) {
      return json(
        { error: `File ${upload.name} is not a PNG, JPG, or WEBP screenshot.` },
        400,
      );
    }
    images.push(upload);
  }

  try {
    const data = await extractScreenshotsForExcel(images, category);
    return csvResponse(toExcelCsv(toExcelExtractResponse(data)));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Screenshot extraction failed.";
    return json({ error: message }, 500);
  }
}
