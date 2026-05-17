"use client";

import { Camera, Check, ImageUp, Loader2 } from "lucide-react";
import { useCallback, useId, useState } from "react";
import {
  createReceiptPreviewUrl,
  isReceiptScanConfigured,
  isReceiptScanError,
  revokeReceiptPreviewUrl,
  scanReceiptFromImage,
  type ReceiptScanErrorDetails,
  type ReceiptScanResponse,
  type ReceiptScanResult,
} from "@/lib/receipt-scan";

type ReceiptCameraSectionProps = {
  formDate: string;
  onApplyItem: (item: ReceiptScanResult, date?: string) => void;
  onReceiptDate?: (date: string) => void;
  onSaveSelected: (items: ReceiptScanResult[], date: string) => Promise<void>;
  disabled?: boolean;
};

export function ReceiptCameraSection({
  formDate,
  onApplyItem,
  onReceiptDate,
  onSaveSelected,
  disabled = false,
}: ReceiptCameraSectionProps) {
  const baseId = useId();
  const cameraInputId = `${baseId}-camera`;
  const uploadInputId = `${baseId}-upload`;
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ReceiptScanResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ReceiptScanErrorDetails | null>(
    null,
  );
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const configured = isReceiptScanConfigured();
  const cameraBusy = disabled || scanning || saving;
  const canPickImage = configured && !cameraBusy;

  const clearPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) revokeReceiptPreviewUrl(prev);
      return null;
    });
  }, []);

  const clearScan = useCallback(() => {
    setScanResult(null);
    setSelected(new Set());
    clearPreview();
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
  }, [clearPreview]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setScanResult(null);
    setSelected(new Set());
    setScanning(true);

    const preview = createReceiptPreviewUrl(file);
    setPreviewUrl((prev) => {
      if (prev) revokeReceiptPreviewUrl(prev);
      return preview;
    });

    try {
      const result = await scanReceiptFromImage(file);
      setScanResult(result);
      setSelected(new Set(result.items.map((_, i) => i)));

      if (result.date) {
        onReceiptDate?.(result.date);
      }
    } catch (err) {
      clearPreview();
      if (isReceiptScanError(err)) {
        setError(err.message);
        setErrorDetails(err.details);
        console.error("[receipt-scan]", err.message, err.details);
      } else {
        setError(
          err instanceof Error ? err.message : "読み取りに失敗しました",
        );
        setErrorDetails(null);
        console.error("[receipt-scan]", err);
      }
    } finally {
      setScanning(false);
    }
  };

  const toggleItem = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApplyRow = (item: ReceiptScanResult) => {
    onApplyItem(item, scanResult?.date);
  };

  const handleSaveSelected = async () => {
    if (!scanResult || selected.size === 0) return;

    const date = scanResult.date || formDate;
    if (!date) {
      setError("日付をフォームで指定してから保存してください");
      return;
    }

    const items = scanResult.items.filter((_, i) => selected.has(i));
    setSaving(true);
    setError(null);
    try {
      await onSaveSelected(items, date);
      clearScan();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "保存に失敗しました",
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedTotal =
    scanResult?.items
      .filter((_, i) => selected.has(i))
      .reduce((sum, item) => sum + item.amount, 0) ?? 0;

  const pickButtonClass =
    "flex w-full items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-white px-2 py-2.5 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100";

  return (
    <section
      className="rounded-xl border border-dashed border-teal-200 bg-teal-50/60 p-3"
      aria-busy={scanning || saving}
    >
      {/* スマホでは label 経由の方がカメラ起動が安定する */}
      <input
        id={cameraInputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
      />
      <input
        id={uploadInputId}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <div className="flex gap-3">
        {previewUrl && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-teal-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="選択したレシート"
              className="h-full w-full object-cover"
            />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {scanning ? (
            <div
              className={`${pickButtonClass} cursor-wait opacity-80`}
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              レシートを解析中…
            </div>
          ) : canPickImage ? (
            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor={cameraInputId}
                className={`${pickButtonClass} cursor-pointer`}
              >
                <Camera className="h-4 w-4 shrink-0" aria-hidden />
                撮影
              </label>
              <label
                htmlFor={uploadInputId}
                className={`${pickButtonClass} cursor-pointer`}
              >
                <ImageUp className="h-4 w-4 shrink-0" aria-hidden />
                写真を選ぶ
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled
                className={`${pickButtonClass} cursor-not-allowed opacity-60`}
              >
                <Camera className="h-4 w-4 shrink-0" aria-hidden />
                撮影
              </button>
              <button
                type="button"
                disabled
                className={`${pickButtonClass} cursor-not-allowed opacity-60`}
              >
                <ImageUp className="h-4 w-4 shrink-0" aria-hidden />
                写真を選ぶ
              </button>
            </div>
          )}

          {!configured ? (
            <p className="mt-2 text-xs leading-relaxed text-amber-800">
              API キー未設定です。再デプロイ（npm run deploy:hosting）が必要な場合があります。
            </p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-teal-800/80">
              撮影または保存済みの写真から、レシート明細を AI が読み取れます。
            </p>
          )}
        </div>
      </div>

      {scanResult && scanResult.items.length > 0 && (
        <div className="mt-3 space-y-2 rounded-xl border border-teal-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {scanResult.items.length}件を検出
              {scanResult.storeName ? `（${scanResult.storeName}）` : ""}
            </p>
            <button
              type="button"
              onClick={clearScan}
              className="shrink-0 text-xs text-slate-500 underline"
            >
              クリア
            </button>
          </div>

          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {scanResult.items.map((item, index) => (
              <li key={`${item.itemName}-${index}`}>
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 p-2">
                  <button
                    type="button"
                    onClick={() => toggleItem(index)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selected.has(index)
                        ? "border-teal-600 bg-teal-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                    aria-label={`${item.itemName}を選択`}
                  >
                    {selected.has(index) && <Check className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyRow(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.itemName}
                    </p>
                    <p className="text-xs text-slate-500">
                      ¥{item.amount.toLocaleString()} · {item.category}
                    </p>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-xs text-slate-500">
            行をタップするとフォームに反映。チェックした項目をまとめて保存できます。
          </p>

          <button
            type="button"
            onClick={handleSaveSelected}
            disabled={disabled || saving || selected.size === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中…
              </>
            ) : (
              `選択した${selected.size}件を保存（合計 ¥${selectedTotal.toLocaleString()}）`
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5" role="alert">
          <p className="text-xs font-medium text-red-700">{error}</p>
          {errorDetails && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowErrorDetails((v) => !v)}
                className="text-xs text-red-600 underline"
              >
                {showErrorDetails ? "詳細を隠す" : "エラーの詳細を見る"}
              </button>
              {showErrorDetails && (
                <dl className="mt-2 space-y-1 text-[11px] leading-relaxed text-red-800/90">
                  {errorDetails.status != null && (
                    <>
                      <dt className="font-medium">HTTP</dt>
                      <dd className="mb-1 font-mono">
                        {errorDetails.status}
                        {errorDetails.statusText
                          ? ` ${errorDetails.statusText}`
                          : ""}
                      </dd>
                    </>
                  )}
                  {errorDetails.model && (
                    <>
                      <dt className="font-medium">モデル</dt>
                      <dd className="mb-1 font-mono">{errorDetails.model}</dd>
                    </>
                  )}
                  {errorDetails.reason && (
                    <>
                      <dt className="font-medium">種別</dt>
                      <dd className="mb-1 font-mono">{errorDetails.reason}</dd>
                    </>
                  )}
                  {errorDetails.apiMessage && (
                    <>
                      <dt className="font-medium">API メッセージ</dt>
                      <dd className="mb-1 break-all whitespace-pre-wrap">
                        {errorDetails.apiMessage}
                      </dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
