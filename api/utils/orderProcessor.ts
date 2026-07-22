import { adminDb } from "./firebaseAdmin.js";
import type { Transaction } from "firebase-admin/firestore";

export async function claimPayOSOrder(
  orderCode: string,
  payosPayload: Record<string, unknown>,
) {
  const orderRef = adminDb.collection("paymentOrders").doc(orderCode);

  await adminDb.runTransaction(async (tx: Transaction) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) {
      throw new Error("Order not found");
    }

    const order = orderSnap.data();
    if (!order) {
      throw new Error("Order payload invalid");
    }

    if (order.status === "PAID") {
      return;
    }

    const status =
      payosPayload.status || payosPayload.paymentStatus || "PENDING";
    if (status !== "PAID" && status !== "COMPLETED") {
      return;
    }

    const walletRef = adminDb.collection("wallets").doc(order.userId);
    const userRef = adminDb.collection("users").doc(order.userId);
    const transactionId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const txRef = adminDb.collection("walletTransactions").doc(transactionId);

    const walletSnap = await tx.get(walletRef);
    const currentBalance = walletSnap.exists
      ? Number(walletSnap.data()?.balance || 0)
      : 0;
    const newBalance = currentBalance + Number(order.credits || 0);

    const userSnap = await tx.get(userRef);
    const currentTotalTopup = userSnap.exists
      ? Number(userSnap.data()?.totalTopup || 0)
      : 0;

    tx.set(
      walletRef,
      {
        userId: order.userId,
        balance: newBalance,
        currency: order.currency || "CREDIT",
        updatedAt: new Date(),
      },
      { merge: true },
    );

    tx.set(
      userRef,
      {
        updatedAt: new Date(),
        totalTopup: currentTotalTopup + Number(order.amount || 0),
      },
      { merge: true },
    );

    tx.set(txRef, {
      userId: order.userId,
      type: "TOPUP",
      amount: Number(order.amount || 0),
      credits: Number(order.credits || 0),
      status: "SUCCESS",
      orderCode: order.orderCode,
      source: "payOS",
      createdAt: new Date(),
    });

    tx.update(orderRef, {
      status: "PAID",
      paidAt: new Date(),
      webhookVerified: true,
    });
  });
}
