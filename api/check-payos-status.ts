import { verifyFirebaseToken } from "./utils/auth";
import { adminDb } from "./utils/firebaseAdmin";
import { getPayOSOrderStatus } from "./utils/payos";
import { claimPayOSOrder } from "./utils/orderProcessor";

export default async function handler(req: any, res: any) {
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
  } catch (error: any) {
    console.error("check-payos-status error", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
}
