import { NextResponse } from "next/server";
import {
  extractScreenshotsForExcel,
  isAllowedScreenshot,
  parseUploadCategory,
  toExcelCsv,
} from "@/lib/excel/run-excel-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILES = 8;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Api-Key",
};

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

function authorized(request: Request): boolean {
  const expected = process.env.FINVISTA_API_KEY?.trim();
  if (!expected) {
    return process.env.VERCEL_ENV !== "production";
  }
  const header =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return header.trim() === expected;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function GET() {
  return json({
    ok: true,
    endpoint: "/api/extract",
    method: "POST",
    usage:
      "Send one or more Screener screenshots as multipart form field `files`. Optional `category` (default screener) and `format=csv`.",
  });
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return json(
      { error: "Unauthorized. Set header X-Api-Key or Authorization: Bearer <FINVISTA_API_KEY>." },
      401,
    );
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
  const format = String(form.get("format") ?? new URL(request.url).searchParams.get("format") ?? "")
    .toLowerCase();

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
    const payload = await extractScreenshotsForExcel(images, category);
    if (format === "csv") return csvResponse(toExcelCsv(payload));
    return json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Screenshot extraction failed.";
    return json({ error: message }, 500);
  }
}
