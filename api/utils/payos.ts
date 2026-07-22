import crypto from "crypto";

const PAYOS_API_BASE = process.env.PAYOS_API_BASE || "https://api.payos.vn/v1";
const CLIENT_ID = process.env.PAYOS_CLIENT_ID || "";
const API_KEY = process.env.PAYOS_API_KEY || "";
const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY || "";

if (!CLIENT_ID || !API_KEY || !CHECKSUM_KEY) {
  throw new Error(
    "Missing PayOS environment variables. Ensure PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY are set.",
  );
}

function buildSignature(payload: string) {
  return crypto
    .createHmac("sha256", CHECKSUM_KEY)
    .update(payload)
    .digest("hex");
}

export async function createPayOSOrder({
  amount,
  orderCode,
  returnUrl,
  cancelUrl,
}: {
  amount: number;
  orderCode: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const body = {
    clientId: CLIENT_ID,
    amount,
    orderCode,
    currency: "VND",
    provider: "VIETQR",
    returnUrl,
    cancelUrl,
  };

  const signature = buildSignature(JSON.stringify(body));
  const response = await fetch(`${PAYOS_API_BASE}/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "x-signature": signature,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `payOS create order failed: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

export async function getPayOSOrderStatus(paymentLinkId: string) {
  const body = {
    clientId: CLIENT_ID,
    paymentLinkId,
  };
  const signature = buildSignature(JSON.stringify(body));
  const response = await fetch(`${PAYOS_API_BASE}/checkout/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "x-signature": signature,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`payOS status failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

export function verifyWebhookSignature(payload: string, signature: string) {
  const expected = buildSignature(payload);
  return expected === signature;
}
