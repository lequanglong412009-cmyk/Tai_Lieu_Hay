import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { checkPayOSStatus } from "../lib/payments";

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState(
    "Đang kiểm tra trạng thái thanh toán...",
  );
  const [loading, setLoading] = useState(true);
  const orderCode = searchParams.get("orderCode");

  useEffect(() => {
    if (!orderCode) {
      setStatusMessage("Không tìm thấy mã đơn hàng.");
      setLoading(false);
      return;
    }

    if (!orderCode) {
      setStatusMessage("Không tìm thấy mã đơn hàng.");
      setLoading(false);
      return;
    }

    const activeOrderCode = orderCode;
    let active = true;
    async function refreshStatus() {
      try {
        const result = await checkPayOSStatus(activeOrderCode);
        if (!active) return;
        const state = result?.status || result?.order?.status || "UNKNOWN";
        if (state === "PAID" || state === "COMPLETED") {
          setStatusMessage(
            "Thanh toán thành công! Số dư ví của bạn sẽ cập nhật ngay.",
          );
        } else if (state === "PENDING") {
          setStatusMessage(
            "Đơn hàng đang chờ xác nhận. Vui lòng đợi một vài giây.",
          );
        } else {
          setStatusMessage(`Trạng thái: ${state}`);
        }
      } catch (error: unknown) {
        const err =
          error instanceof Error
            ? error
            : new Error(
                String(error ?? "Không thể kiểm tra trạng thái thanh toán."),
              );
        setStatusMessage(
          err.message || "Không thể kiểm tra trạng thái thanh toán.",
        );
      } finally {
        setLoading(false);
      }
    }

    refreshStatus();
    const interval = window.setInterval(refreshStatus, 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [orderCode]);

  return (
    <div className="min-h-screen bg-[#0B1221] pt-28 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-10 text-center shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-black text-white">Kết quả thanh toán</h1>
          <p className="mt-6 text-base leading-relaxed text-slate-300">
            {statusMessage}
          </p>

          {orderCode ? (
            <p className="mt-4 text-sm text-slate-500">
              Mã đơn hàng: {orderCode}
            </p>
          ) : null}

          <div className="mt-8">
            <div className="inline-flex rounded-full bg-white/5 px-5 py-3 text-sm text-slate-300">
              {loading
                ? "Đang cập nhật..."
                : "Đã cập nhật trạng thái giao dịch"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
