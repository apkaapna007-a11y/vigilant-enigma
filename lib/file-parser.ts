// File parser: extracts text from various file formats
// All parsers run client-side in the browser

export interface ParsedFile {
  text: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const supported = ["txt", "md", "markdown", "docx", "pdf", "html", "htm"];
  if (!supported.includes(ext)) {
    return `Unsupported file type ".${ext}". Supported: ${supported.join(", ")}.`;
  }

  return null;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  let text: string;

  switch (ext) {
    case "txt":
    case "md":
    case "markdown":
      text = await file.text();
      break;

    case "html":
    case "htm":
      text = await parseHtml(file);
      break;

    case "docx":
      text = await parseDocx(file);
      break;

    case "pdf":
      text = await parsePdf(file);
      break;

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }

  return {
    text: text.trim(),
    fileName: file.name,
    fileSize: file.size,
    fileType: ext,
  };
}

async function parseHtml(file: File): Promise<string> {
  const html = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  // Remove script and style elements
  doc.querySelectorAll("script, style, noscript, iframe").forEach(el => el.remove());
  return doc.body.textContent || "";
}

async function parseDocx(file: File): Promise<string> {
  // Dynamic import to avoid bundling mammoth if not needed
  const mammoth = (await import("mammoth")).default;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parsePdf(file: File): Promise<string> {
  // Dynamic import pdfjs-dist — uses CDN worker
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker source to CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(" ");
    textParts.push(pageText);
  }

  return textParts.join("\n\n");
}
