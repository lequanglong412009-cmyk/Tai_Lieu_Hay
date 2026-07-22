import React from "react";

type TopupPackage = {
  amount: number;
  credits: number;
  label: string;
};

const PACKAGES: TopupPackage[] = [
  { amount: 10000, credits: 10, label: "10.000đ → 10 credit" },
  { amount: 50000, credits: 55, label: "50.000đ → 55 credit" },
  { amount: 100000, credits: 120, label: "100.000đ → 120 credit" },
];

export function TopupModal({
  open,
  onClose,
  onChoose,
  processing,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (amount: number, credits: number) => void;
  processing: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-white">Nạp tiền vào ví</h3>
            <p className="text-sm text-slate-400">
              Chọn gói phù hợp và quét mã VietQR để thanh toán.
            </p>
          </div>
          <button className="text-slate-400 hover:text-white" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div className="space-y-4">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.amount}
              disabled={processing}
              onClick={() => onChoose(pkg.amount, pkg.credits)}
              className="w-full rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:border-indigo-400/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-white">{pkg.label}</p>
                  <p className="text-xs text-slate-400">
                    Nạp trực tiếp vào ví với payOS
                  </p>
                </div>
                <span className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-bold text-white">
                  Chọn
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
