import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/types/expense";

export type ReceiptScanResult = {
  itemName: string;
  amount: number;
  category: ExpenseCategory;
};

export type ReceiptScanResponse = {
  storeName?: string;
  date?: string;
  items: ReceiptScanResult[];
};

/** 無料枠で使いやすい順に試行 */
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
] as const;

const MAX_IMAGE_EDGE = 1280;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

const CATEGORY_SET = new Set<string>(EXPENSE_CATEGORIES);

export function isReceiptScanConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim());
}

function normalizeCategory(value: string): ExpenseCategory {
  const trimmed = value.trim();
  if (CATEGORY_SET.has(trimmed)) return trimmed as ExpenseCategory;
  return "その他";
}

function parseDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  return value;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

function normalizeItems(data: unknown): ReceiptScanResult[] {
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;
  const rawItems = Array.isArray(record.items) ? record.items : [];

  const items: ReceiptScanResult[] = [];

  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const itemName = String(row.itemName ?? "").trim();
    const amount = Math.round(Number(row.amount));
    if (!itemName || !Number.isFinite(amount) || amount <= 0) continue;

    items.push({
      itemName,
      amount,
      category: normalizeCategory(String(row.category ?? "その他")),
    });
  }

  return items;
}

function parseGeminiError(status: number, detail: string): string {
  let message = detail;
  try {
    const json = JSON.parse(detail) as {
      error?: { message?: string };
    };
    message = json.error?.message ?? detail;
  } catch {
    // plain text
  }

  if (status === 429) {
    if (/limit:\s*0/i.test(message) || /quota/i.test(message)) {
      return (
        "Gemini API の無料枠が有効になっていない可能性があります。Google AI Studio で API キーのプロジェクトを確認するか、1〜2分待ってから再試行してください。"
      );
    }
    return (
      "利用回数の上限に達しました（429）。1〜2分待ってから再試行してください。今日の上限の場合は明日以降にお試しください。"
    );
  }

  if (status === 403) {
    return "Gemini API へのアクセスが拒否されました。API キーの制限（リファラー等）を確認してください。";
  }

  if (message.includes("API_KEY") || status === 400) {
    return "Gemini API キーが無効です。Google AI Studio でキーを確認してください。";
  }

  return `レシートの解析に失敗しました（${status}）`;
}

async function fileToBase64(file: Blob): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ base64, mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** アップロード前に画像を縮小（API の精度・速度向上） */
export async function compressReceiptImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  return blob ?? file;
}

async function callGemini(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string,
  prompt: string,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );
}

async function scanWithGemini(file: File): Promise<ReceiptScanResponse> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "レシート読み取り用の API キーが未設定です。.env.local に NEXT_PUBLIC_GEMINI_API_KEY を追加し、再デプロイしてください。",
    );
  }

  const compressed = await compressReceiptImage(file);
  const { base64, mimeType } = await fileToBase64(compressed);

  const categories = EXPENSE_CATEGORIES.join("、");

  const prompt = `あなたは日本のレシート画像を解析するアシスタントです。
画像から購入明細を読み取り、JSONのみで返答してください。

ルール:
- items には商品・サービスごとの明細行を入れる（最大30件）
- 「小計」「消費税」「合計」「お預かり」「お釣り」「ポイント」「値引」などは items に含めない
- 明細行が読めない場合のみ、合計金額1件として storeName を itemName にする
- amount は日本円の整数（税込）
- category は次から1つ: ${categories}
- date はレシート記載の日付を YYYY-MM-DD。読み取れなければ null
- storeName は店名。読み取れなければ null

JSON形式（この形式のみ）:
{"storeName":string|null,"date":string|null,"items":[{"itemName":string,"amount":number,"category":string}]}`;

  let lastError = "レシートの解析に失敗しました";

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await callGemini(apiKey, model, base64, mimeType, prompt);

      if (response.status === 429 && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastError = parseGeminiError(response.status, detail);
        if (response.status === 429 || response.status === 404) {
          break;
        }
        throw new Error(lastError);
      }

      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError =
          "レシートから明細を読み取れませんでした。写真を明るく、全体が写るように撮り直してください。";
        break;
      }

      let parsed: unknown;
      try {
        parsed = extractJson(text);
      } catch {
        throw new Error(
          "レシートの解析結果を解釈できませんでした。もう一度お試しください。",
        );
      }

      const record = parsed as Record<string, unknown>;
      let items = normalizeItems(parsed);

      if (items.length === 0) {
        const storeName = String(record.storeName ?? "").trim();
        throw new Error(
          storeName
            ? `「${storeName}」の明細を読み取れませんでした。レシート全体が写っているか確認してください。`
            : "明細を読み取れませんでした。レシート全体が写っているか確認してください。",
        );
      }

      const storeName = String(record.storeName ?? "").trim();
      if (storeName && items.length === 1 && items[0].itemName.length < 4) {
        items = [{ ...items[0], itemName: storeName }];
      }

      return {
        storeName: storeName || undefined,
        date: parseDate(record.date),
        items,
      };
    }
  }

  throw new Error(lastError);
}

/** レシート画像を解析（Gemini Vision） */
export async function scanReceiptFromImage(
  file: File,
): Promise<ReceiptScanResponse> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください");
  }

  return scanWithGemini(file);
}

export function createReceiptPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeReceiptPreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
