import type { ApiRequest, ApiResponse } from "./utils/apiTypes.js";
import { verifyWebhookSignature } from "./utils/payos.js";
import { claimPayOSOrder } from "./utils/orderProcessor.js";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Webhook error");
  }
  return String(error);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const headers = req.headers || {};
    const signatureHeader = String(
      headers["x-payos-signature"] || headers["x-signature"] || "",
    );
    const body = req.body as Record<string, unknown> | undefined;
    const payload = JSON.stringify(body || {});

    if (signatureHeader && !verifyWebhookSignature(payload, signatureHeader)) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const orderCode =
      (body?.orderCode as string | undefined) ||
      ((body?.data as Record<string, unknown> | undefined)?.orderCode as
        | string
        | undefined) ||
      (req.query?.orderCode as string | undefined) ||
      "";
    if (!orderCode) {
      return res
        .status(400)
        .json({ message: "Missing orderCode in webhook payload" });
    }

    await claimPayOSOrder(orderCode, req.body);
    return res.status(200).json({ ok: true });
  } catch (error: unknown) {
    console.error("payOS webhook error", error);
    return res.status(500).json({ message: getErrorMessage(error) });
  }
}
