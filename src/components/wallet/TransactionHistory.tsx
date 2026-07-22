import React from "react";
import { WalletTransaction } from "../../types";

export function TransactionHistory({
  transactions,
}: {
  transactions: WalletTransaction[];
}) {
  if (!transactions.length) {
    return (
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 text-center text-slate-400">
        Chưa có giao dịch nào.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx) => {
        const dateValue = tx.createdAt?.seconds
          ? tx.createdAt.seconds * 1000
          : tx.createdAt;
        const date = dateValue
          ? new Date(dateValue).toLocaleString("vi-VN")
          : "Không rõ";
        return (
          <div
            key={tx.id}
            className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">
                  {tx.type === "TOPUP" ? "Nạp tiền" : tx.type}
                </p>
                <p className="text-sm text-slate-500">{date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">
                  ₫{Number(tx.amount || 0).toLocaleString("vi-VN")}
                </p>
                <p className="text-sm text-slate-400">{tx.credits} credit</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-full bg-white/5 px-3 py-1">
                Trạng thái: {tx.status}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1">
                Đơn: {tx.orderCode}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1">
                Nguồn: {tx.source}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
