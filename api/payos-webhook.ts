import { adminDb } from "./utils/firebaseAdmin";
import { verifyWebhookSignature } from "./utils/payos";
import { claimPayOSOrder } from "./utils/orderProcessor";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const signatureHeader = String(
      req.headers["x-payos-signature"] || req.headers["x-signature"] || "",
    );
    const payload = JSON.stringify(req.body || {});

    if (signatureHeader && !verifyWebhookSignature(payload, signatureHeader)) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const orderCode =
      req.body.orderCode ||
      req.body.data?.orderCode ||
      req.query.orderCode ||
      "";
    if (!orderCode) {
      return res
        .status(400)
        .json({ message: "Missing orderCode in webhook payload" });
    }

    await claimPayOSOrder(orderCode, req.body);
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("payOS webhook error", error);
    return res.status(500).json({ message: error.message || "Webhook error" });
  }
}
