import { auth } from "./firebase";

async function getIdToken() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Vui lòng đăng nhập để thực hiện thanh toán.");
  }
  return currentUser.getIdToken();
}

export async function createTopupOrder(amount: number, credits: number) {
  const idToken = await getIdToken();
  const res = await fetch("/api/create-topup-order", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, credits }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Không thể tạo đơn thanh toán.");
  }

  return res.json();
}

export async function checkPayOSStatus(orderCode: string) {
  const idToken = await getIdToken();
  const res = await fetch(
    `/api/check-payos-status?orderCode=${encodeURIComponent(orderCode)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  );

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Không thể kiểm tra trạng thái thanh toán.");
  }

  return res.json();
}
