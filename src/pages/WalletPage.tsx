import React, { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useAuth } from "../context/AuthContext";
import { TopupModal } from "../components/wallet/TopupModal";
import { PaymentQRCode } from "../components/wallet/PaymentQRCode";
import { TransactionHistory } from "../components/wallet/TransactionHistory";

export const WalletPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { wallet, transactions, loading, topup } = useWallet();
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleChoosePackage = async (amount: number, credits: number) => {
    setProcessing(true);
    setError("");
    try {
      const data = await topup(amount, credits);
      setPaymentData(data);
      setIsTopupOpen(false);
    } catch (err: any) {
      console.error("Topup error", err);
      setError(err?.message || "Không thể tạo đơn nạp tiền.");
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0B1221] pt-32 flex items-center justify-center text-white">
        Đang tải dữ liệu ví...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B1221] pt-32 flex items-center justify-center text-white">
        Vui lòng đăng nhập để truy cập ví.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1221] pb-20 pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-indigo-400">
                Ví thanh toán
              </p>
              <h1 className="mt-3 text-3xl font-black text-white">
                Số dư ví của bạn
              </h1>
              <p className="mt-2 text-slate-400">
                Xin chào {user.displayName || user.email}
              </p>
            </div>
            <button
              onClick={() => setIsTopupOpen(true)}
              className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Nạp tiền ngay
            </button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Số dư
              </p>
              <p className="mt-4 text-5xl font-black text-white">
                {wallet?.balance ?? 0}
              </p>
              <p className="mt-2 text-sm text-slate-500">credit</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Tổng nạp
              </p>
              <p className="mt-4 text-4xl font-black text-white">
                ₫{Number(user.totalTopup || 0).toLocaleString("vi-VN")}
              </p>
              <p className="mt-2 text-sm text-slate-500">Tổng tiền đã nạp</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Giao dịch
              </p>
              <p className="mt-4 text-4xl font-black text-white">
                {transactions.length}
              </p>
              <p className="mt-2 text-sm text-slate-500">Lịch sử giao dịch</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {paymentData ? (
          <div className="mb-8">
            <PaymentQRCode
              checkoutUrl={paymentData.checkoutUrl}
              qrCode={paymentData.qrCode}
              onBack={() => setPaymentData(null)}
            />
          </div>
        ) : null}

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-8 shadow-2xl shadow-black/20">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">
                Lịch sử giao dịch
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Các giao dịch nạp tiền sẽ hiển thị ở đây ngay khi backend xác
                nhận.
              </p>
            </div>
          </div>
          <TransactionHistory transactions={transactions} />
        </div>
      </div>

      <TopupModal
        open={isTopupOpen}
        onClose={() => setIsTopupOpen(false)}
        onChoose={handleChoosePackage}
        processing={processing}
      />
    </div>
  );
};
