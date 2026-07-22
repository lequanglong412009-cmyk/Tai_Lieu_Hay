import React from "react";

export function PaymentQRCode({
  checkoutUrl,
  qrCode,
  onBack,
}: {
  checkoutUrl: string;
  qrCode?: string;
  onBack: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-6 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white">Quét mã VietQR</h3>
          <p className="text-sm text-slate-400">
            Dùng app ngân hàng để quét và thanh toán.
          </p>
        </div>
        <button onClick={onBack} className="text-slate-400 hover:text-white">
          Đóng
        </button>
      </div>

      <div className="flex flex-col items-center gap-4">
        {qrCode ? (
          <img
            src={qrCode}
            alt="QR VietQR"
            className="h-72 w-72 rounded-3xl border border-white/10 bg-white/5 object-cover"
          />
        ) : (
          <div className="flex h-72 w-72 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-slate-500">
            Mã QR đang tải...
          </div>
        )}

        <a
          href={checkoutUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400"
        >
          Mở liên kết thanh toán
        </a>
      </div>
    </div>
  );
}
