import { randomUUID } from "crypto";
<<<<<<< HEAD
import type { ApiRequest, ApiResponse } from "./utils/apiTypes.js";
=======
>>>>>>> da511b7daabee24e1c7e731ca8688e686abb7370
import { adminDb } from "./utils/firebaseAdmin.js";
import { createPayOSOrder } from "./utils/payos.js";
import { verifyFirebaseToken } from "./utils/auth.js";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Server error");
  }
  return String(error);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const uid = await verifyFirebaseToken(req.headers?.authorization);
    const body = req.body as Record<string, unknown> | undefined;
    const amount = Number(body?.amount);
    const credits = Number(body?.credits);

    if (!amount || !credits || amount <= 0 || credits <= 0) {
      return res.status(400).json({ message: "Invalid amount or credits" });
    }

    const orderCode = `PO-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const baseUrl =
      process.env.PAYOS_RETURN_URL ||
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const cancelBaseUrl =
      process.env.PAYOS_CANCEL_URL ||
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

    if (!baseUrl || !cancelBaseUrl) {
      throw new Error(
        "Missing PAYOS_RETURN_URL or PAYOS_CANCEL_URL and no fallback app URL is configured",
      );
    }

    const returnUrl = `${baseUrl}?orderCode=${encodeURIComponent(orderCode)}`;
    const cancelUrl = `${cancelBaseUrl}?orderCode=${encodeURIComponent(orderCode)}`;

    const payosResponse = await createPayOSOrder({
      amount: Number(amount),
      orderCode,
      returnUrl,
      cancelUrl,
    });

    const paymentLinkId =
      payosResponse.paymentLinkId || payosResponse.orderId || "";
    const checkoutUrl =
      payosResponse.checkoutUrl || payosResponse.paymentUrl || "";
    const qrCode =
      payosResponse.qrCode || payosResponse.qr || payosResponse.paymentQr || "";

    await adminDb
      .collection("paymentOrders")
      .doc(orderCode)
      .set({
        userId: uid,
        orderCode,
        amount: Number(amount),
        credits: Number(credits),
        currency: "CREDIT",
        status: "PENDING",
        provider: "payOS",
        paymentLinkId,
        checkoutUrl,
        qrCode,
        createdAt: new Date(),
        webhookVerified: false,
      });

    return res.status(200).json({
      orderCode,
      paymentLinkId,
      checkoutUrl,
      qrCode,
    });
  } catch (error: unknown) {
    console.error("create-topup-order error", error);
    return res.status(500).json({ message: getErrorMessage(error) });
  }
}
