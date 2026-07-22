import type { ApiRequest, ApiResponse } from "./utils/apiTypes.js";
import { verifyFirebaseToken } from "./utils/auth.js";
import { adminDb } from "./utils/firebaseAdmin.js";
import { getPayOSOrderStatus } from "./utils/payos.js";
import { claimPayOSOrder } from "./utils/orderProcessor.js";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "Server error");
  }
  return String(error);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const uid = await verifyFirebaseToken(req.headers.authorization);
    const orderCode = String(req.query.orderCode || req.query.order_code || "");
    if (!orderCode) {
      return res.status(400).json({ message: "Missing orderCode" });
    }

    const orderSnap = await adminDb
      .collection("paymentOrders")
      .doc(orderCode)
      .get();
    if (!orderSnap.exists) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderSnap.data();
    if (!order) {
      return res.status(404).json({ message: "Invalid order record" });
    }
    if (order.userId !== uid) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const statusResponse = await getPayOSOrderStatus(order.paymentLinkId);
    const status =
      statusResponse.status || statusResponse.paymentStatus || order.status;

    if (status === "PAID" || status === "COMPLETED") {
      await claimPayOSOrder(orderCode, { status });
    }

    return res
      .status(200)
      .json({ order: { ...order, status }, statusResponse });
  } catch (error: unknown) {
    console.error("check-payos-status error", error);
    return res.status(500).json({ message: getErrorMessage(error) });
  }
}
