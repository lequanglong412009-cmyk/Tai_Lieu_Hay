import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { createTopupOrder } from "../lib/payments";

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>({ balance: 0, currency: "CREDIT" });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setWallet({ balance: 0, currency: "CREDIT" });
      setTransactions([]);
      setLoading(false);
      return;
    }

    const walletRef = doc(db, "wallets", user.uid);
    const txQuery = query(
      collection(db, "walletTransactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubWallet = onSnapshot(walletRef, (snapshot) => {
      setWallet(
        snapshot.exists()
          ? snapshot.data()
          : { balance: 0, currency: "CREDIT" },
      );
    });

    const unsubTx = onSnapshot(txQuery, (snapshot) => {
      setTransactions(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
      setLoading(false);
    });

    return () => {
      unsubWallet();
      unsubTx();
    };
  }, [user?.uid]);

  const topup = async (amount: number, credits: number) => {
    return createTopupOrder(amount, credits);
  };

  return { wallet, transactions, loading, topup };
}
