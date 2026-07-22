import { randomUUID } from "crypto";
import { adminDb } from "./utils/firebaseAdmin";
import { createPayOSOrder } from "./utils/payos";
import { verifyFirebaseToken } from "./utils/auth";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const uid = await verifyFirebaseToken(req.headers.authorization);
    const { amount, credits } = req.body;

    if (!amount || !credits || Number(amount) <= 0 || Number(credits) <= 0) {
      return res.status(400).json({ message: "Invalid amount or credits" });
    }

    const orderCode = `PO-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const returnUrl = `${process.env.PAYOS_RETURN_URL}?orderCode=${encodeURIComponent(orderCode)}`;
    const cancelUrl = `${process.env.PAYOS_CANCEL_URL}?orderCode=${encodeURIComponent(orderCode)}`;

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
  } catch (error: any) {
    console.error("create-topup-order error", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
}
