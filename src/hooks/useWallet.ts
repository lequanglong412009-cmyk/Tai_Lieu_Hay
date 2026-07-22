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
import { Wallet, WalletTransaction } from "../types";

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | { balance: number; currency: string }>(
    { balance: 0, currency: "CREDIT" },
  );
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
