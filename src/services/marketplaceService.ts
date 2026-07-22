import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  orderBy,
  setDoc,
  serverTimestamp,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import {
  Document,
  UserProfile,
  AccessRequest,
  Course,
  CourseRegistration,
} from "../types";

export const MARKEPLTACE_COLLECTIONS = {
  DOCUMENTS: "documents",
  DOC_FILES: "documentFiles",
  USERS: "users",
  PURCHASES: "purchases",
  REQUESTS: "accessRequests",
  GLOBAL_STATS: "globalStats",
  COURSES: "courses",
  COURSE_REGISTRATIONS: "courseRegistrations",
  COURSE_VIDEOS: "courseVideos",
};

// --- Documentation Service ---

export async function getDocuments(filters?: {
  category?: string;
  status?: string;
}) {
  let q = query(
    collection(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS),
    orderBy("createdAt", "desc"),
  );

  if (filters?.category && filters.category !== "All") {
    q = query(q, where("category", "==", filters.category));
  }

  if (filters?.status) {
    q = query(q, where("status", "==", filters.status));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Document);
}

export async function getDocumentById(id: string) {
  const docRef = doc(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Document;
}

export async function getSecureFileUrl(id: string) {
  const docData = await getDocumentById(id);
  const isFree = docData?.price === 0;
  const isPurchased = await checkPurchase(id);

  if (!isPurchased && !isFree) {
    throw new Error("Cần được Admin phê duyệt để tải file");
  }

  const fileRef = doc(db, MARKEPLTACE_COLLECTIONS.DOC_FILES, id);
  const snap = await getDoc(fileRef);
  if (!snap.exists()) return null;
  return snap.data().fileUrl as string;
}

// --- Purchase Service ---

export async function submitAccessRequest(
  documentData: Document,
  regData?: Partial<AccessRequest>,
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Vui lòng đăng nhập");

  const requestId = `${user.uid}_${documentData.id}`;
  const requestRef = doc(db, MARKEPLTACE_COLLECTIONS.REQUESTS, requestId);
  const isAutoApprove = !documentData.requiresManualAccess;

  await setDoc(requestRef, {
    userId: user.uid,
    userEmail: user.email,
    documentId: documentData.id,
    documentTitle: documentData.title,
    priceAtPurchase: documentData.price,
    ...regData,
    status: isAutoApprove ? "approved" : "pending",
    requestedAt: serverTimestamp(),
  });

  if (isAutoApprove) {
    await grantAccess(user.uid, documentData.id, requestId);
  }
}

export async function checkRequestStatus(docId: string) {
  const user = auth.currentUser;
  if (!user) return null;
  const requestRef = doc(
    db,
    MARKEPLTACE_COLLECTIONS.REQUESTS,
    `${user.uid}_${docId}`,
  );
  const snap = await getDoc(requestRef);
  if (!snap.exists()) return null;
  return snap.data().status as string;
}

export async function checkPurchase(docId: string) {
  const user = auth.currentUser;
  if (!user) return false;
  const purchaseRef = doc(
    db,
    MARKEPLTACE_COLLECTIONS.PURCHASES,
    `${user.uid}_${docId}`,
  );
  const snap = await getDoc(purchaseRef);
  return snap.exists();
}

// --- User Service ---

export async function checkUsername(username: string) {
  const q = query(
    collection(db, MARKEPLTACE_COLLECTIONS.USERS),
    where("username", "==", username),
  );
  const snap = await getDocs(q);
  return snap.empty;
}

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export async function signInWithGoogle() {
  const browserWindow = window as Window & { opera?: string };
  const ua = navigator.userAgent || navigator.vendor || browserWindow.opera || "";
  const isInAppBrowser =
    ua.indexOf("FBAN") > -1 ||
    ua.indexOf("FBAV") > -1 ||
    ua.indexOf("Instagram") > -1 ||
    ua.indexOf("Zalo") > -1 ||
    ua.indexOf("Line") > -1 ||
    ua.indexOf("FB_IAB") > -1 ||
    ua.indexOf("GSA") > -1 ||
    ua.indexOf("Messenger") > -1;

  if (isInAppBrowser) {
    alert(
      "⚠️ Lỗi trình duyệt được nhúng!\n\nVui lòng nhấn vào biểu tượng 3 chấm (⋮) ở góc phải màn hình và chọn 'Mở bằng trình duyệt' (Chrome/Safari) để có thể đăng nhập.",
    );
    throw new Error("In-app browser detected.");
  }

  const provider = new GoogleAuthProvider();
  try {
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Get profile
    (window as Window & { __lastDbOp?: string }).__lastDbOp = "getProfile";
    let profile = await getProfile(user.uid);
    const shouldBeAdmin = user.email === "tailieuhay53@gmail.com";

    if (!profile) {
      // Create profile if doesn't exist
      (window as Window & { __lastDbOp?: string }).__lastDbOp = "syncProfile";
      profile = await syncProfile(user);
    } else {
      // Update profile if data changed
      const dbIsAdmin = profile.isAdmin || false; // Defaults to false
      const authPhotoUrl = user.photoURL || null;
      const dbPhotoUrl = profile.photoURL || null;

      const needsUpdate =
        dbIsAdmin !== shouldBeAdmin ||
        dbPhotoUrl !== authPhotoUrl ||
        profile.displayName !== user.displayName;

      if (needsUpdate) {
        const updates: Partial<UserProfile> = {};

        // Only attempt to update isAdmin if it's the admin changing their own status
        // OR downgrading a corrupted admin status
        if (dbIsAdmin !== shouldBeAdmin) {
          updates.isAdmin = shouldBeAdmin;
        }

        if (dbPhotoUrl !== authPhotoUrl && authPhotoUrl)
          updates.photoURL = authPhotoUrl;
        if (profile.displayName !== user.displayName) {
          updates.displayName = user.displayName || profile.displayName;
          updates.username = user.displayName || profile.username;
        }

        if (Object.keys(updates).length > 0) {
          (window as Window & { __lastDbOp?: string }).__lastDbOp =
            "updateProfile";
          await updateDoc(
            doc(db, MARKEPLTACE_COLLECTIONS.USERS, user.uid),
            updates,
          );
        }
        profile = { ...profile, ...updates };
      }
    }
    return profile;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (
      err &&
      (err.code === "auth/missing-initial-state" ||
        err.code === "auth/web-storage-unsupported" ||
        (err.message && err.message.includes("missing initial state")))
    ) {
      alert(
        "⚠️ Lỗi trình duyệt Zalo/Facebook!\n\nVui lòng nhấn vào biểu tượng 3 chấm (⋮) ở góc phải màn hình và chọn 'Mở bằng trình duyệt' (Chrome/Safari) để có thể đăng nhập.",
      );
    } else if (err && err.code === "permission-denied") {
      console.error(
        "Login error:",
        err.message,
        "operation:",
        (window as Window & { __lastDbOp?: string }).__lastDbOp,
      );
    } else if (err && err.code === "auth/popup-closed-by-user") {
      // User closed the popup, do nothing
    } else {
      console.error("Login error:", error);
    }
    throw error;
  }
}

export async function syncProfile(user: {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}) {
  const email = user.email || "";
  const displayName = user.displayName || email.split("@")[0] || "User";

  const profile: UserProfile = {
    uid: user.uid,
    email: email,
    displayName: displayName,
    username: displayName,
    photoURL: user.photoURL || undefined,
    isAdmin: email === "tailieuhay53@gmail.com",
    totalTopup: 0,
    purchasedDocs: [],
    purchasedCourses: [],
    createdAt: serverTimestamp() as unknown as Date,
  };

  await setDoc(doc(db, MARKEPLTACE_COLLECTIONS.USERS, user.uid), profile);

  // Increment global users count
  const statsRef = doc(db, MARKEPLTACE_COLLECTIONS.GLOBAL_STATS, "main");
  (window as Window & { __lastDbOp?: string }).__lastDbOp =
    "syncProfile_globalStats";
  await setDoc(statsRef, { totalUsers: increment(1) }, { merge: true });

  return profile;
}

export async function getProfile(usernameOrUid: string) {
  const userRef = doc(db, MARKEPLTACE_COLLECTIONS.USERS, usernameOrUid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    // Strict enforcement in memory
    if (data.email !== "tailieuhay53@gmail.com") {
      data.isAdmin = false;
    }
    return data;
  }

  // Try finding by username field if ID is different
  const q = query(
    collection(db, MARKEPLTACE_COLLECTIONS.USERS),
    where("username", "==", usernameOrUid),
  );
  const qSnap = await getDocs(q);
  if (!qSnap.empty) {
    const data = qSnap.docs[0].data() as UserProfile;
    // Strict enforcement in memory
    if (data.email !== "tailieuhay53@gmail.com") {
      data.isAdmin = false;
    }
    return data;
  }

  return null;
}

export async function grantAccess(
  userId: string,
  documentId: string,
  customReqId?: string,
) {
  const purchaseId = customReqId || `${userId}_${documentId}`;

  // 1. Get request to check price at purchase
  const requestRef = doc(db, MARKEPLTACE_COLLECTIONS.REQUESTS, purchaseId);
  const requestSnap = await getDoc(requestRef);
  let pricePaid = 0;

  if (requestSnap.exists()) {
    const requestData = requestSnap.data();
    pricePaid = requestData.priceAtPurchase ?? 0;
    // Mark request as approved if pending
    if (requestData.status !== "approved") {
      await updateDoc(requestRef, { status: "approved" });
    }
  }

  const purchaseRef = doc(db, MARKEPLTACE_COLLECTIONS.PURCHASES, purchaseId);

  // Set purchase record
  await setDoc(purchaseRef, {
    userId: userId,
    documentId: documentId,
    pricePaid: pricePaid,
    purchasedAt: serverTimestamp(),
  });

  const docRef = doc(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS, documentId);

  // Update user profile
  const userRef = doc(db, MARKEPLTACE_COLLECTIONS.USERS, userId);
  const profile = await getProfile(userId);
  if (profile) {
    await updateDoc(userRef, {
      purchasedDocs: (profile.purchasedDocs || []).concat(documentId),
    });
  }

  // Increment sales count and total revenue (document)
  await updateDoc(docRef, {
    salesCount: increment(1),
    totalRevenue: increment(pricePaid),
  });

  // Increment global sales and revenue
  const statsRef = doc(db, MARKEPLTACE_COLLECTIONS.GLOBAL_STATS, "main");
  await setDoc(
    statsRef,
    {
      totalSales: increment(1),
      totalRevenue: increment(pricePaid),
    },
    { merge: true },
  );
}

export async function rejectAccess(
  userId: string,
  documentId: string,
  customReqId?: string,
) {
  const requestId = customReqId || `${userId}_${documentId}`;
  const requestRef = doc(db, MARKEPLTACE_COLLECTIONS.REQUESTS, requestId);
  await updateDoc(requestRef, { status: "rejected" });
}

// --- Course Service ---

export async function getCourses() {
  const q = query(
    collection(db, MARKEPLTACE_COLLECTIONS.COURSES),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Course);
}

export async function getCourseById(id: string) {
  const docRef = doc(db, MARKEPLTACE_COLLECTIONS.COURSES, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Course;
}

export async function getSecureCourseVideoUrl(courseId: string) {
  const courseData = await getCourseById(courseId);
  const regStatus = await checkCourseRegistration(courseId);
  const isFree = courseData?.price === 0;

  if (regStatus !== "approved" && !isFree) {
    throw new Error("Cần được Admin phê duyệt để xem video");
  }

  const videoRef = doc(db, MARKEPLTACE_COLLECTIONS.COURSE_VIDEOS, courseId);
  const snap = await getDoc(videoRef);
  if (!snap.exists()) return null;
  return snap.data().videoUrl as string;
}

export async function getCourseVideoUrlAdmin(courseId: string) {
  const videoRef = doc(db, MARKEPLTACE_COLLECTIONS.COURSE_VIDEOS, courseId);
  const snap = await getDoc(videoRef);
  if (!snap.exists()) return null;
  return snap.data().videoUrl as string;
}

export async function submitCourseRegistration(
  courseData: Course,
  regData?: Partial<CourseRegistration>,
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Vui lòng đăng nhập");

  const registrationId = `${user.uid}_${courseData.id}`;
  const regRef = doc(
    db,
    MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS,
    registrationId,
  );
  const isAutoApprove = !courseData.requiresManualAccess;

  await setDoc(regRef, {
    userId: user.uid,
    userEmail: user.email,
    courseId: courseData.id,
    courseTitle: courseData.title,
    priceAtPurchase: courseData.price,
    ...regData,
    status: isAutoApprove ? "approved" : "pending",
    registeredAt: serverTimestamp(),
  });

  if (isAutoApprove) {
    await grantCourseAccess(user.uid, courseData.id, registrationId);
  }
}

export async function checkCourseRegistration(courseId: string) {
  const user = auth.currentUser;
  if (!user) return null;
  const regRef = doc(
    db,
    MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS,
    `${user.uid}_${courseId}`,
  );
  const snap = await getDoc(regRef);
  if (!snap.exists()) return null;
  return snap.data().status as string;
}

export async function grantCourseAccess(
  userId: string,
  courseId: string,
  customRegId?: string,
) {
  const registrationId = customRegId || `${userId}_${courseId}`;

  // 1. Get registration to check price at purchase
  const regRef = doc(
    db,
    MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS,
    registrationId,
  );
  const regSnap = await getDoc(regRef);
  let pricePaid = 0;

  if (regSnap.exists()) {
    const regData = regSnap.data();
    pricePaid = regData.priceAtPurchase ?? 0;
    // Mark reg as approved if pending
    if (regData.status !== "approved") {
      await updateDoc(regRef, { status: "approved" });
    }
  }

  // 2. Fetch course document reference
  const courseRef = doc(db, MARKEPLTACE_COLLECTIONS.COURSES, courseId);

  // 3. Increment student count and total revenue
  await updateDoc(courseRef, {
    studentsCount: increment(1),
    totalRevenue: increment(pricePaid),
  });

  // 4. Increment global stats
  const statsRef = doc(db, MARKEPLTACE_COLLECTIONS.GLOBAL_STATS, "main");
  await setDoc(
    statsRef,
    {
      totalSales: increment(1), // Treating course signup as a sale
      totalRevenue: increment(pricePaid),
    },
    { merge: true },
  );

  // 5. Update user profile
  const userRef = doc(db, MARKEPLTACE_COLLECTIONS.USERS, userId);
  const profile = await getProfile(userId);
  if (profile) {
    await updateDoc(userRef, {
      purchasedCourses: (profile.purchasedCourses || []).concat(courseId),
    });
  }
}

export async function rejectCourseRegistration(
  userId: string,
  courseId: string,
  customRegId?: string,
) {
  const registrationId = customRegId || `${userId}_${courseId}`;
  const regRef = doc(
    db,
    MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS,
    registrationId,
  );
  await updateDoc(regRef, { status: "rejected" });
}

export async function uploadCourse(
  data: Omit<Course, "id" | "createdAt" | "studentsCount"> & {
    link?: string;
    videoUrl?: string;
  },
) {
  const { videoUrl, link, ...rest } = data;
  const targetLink = link || videoUrl;

  const batch = writeBatch(db);
  const courseRef = doc(collection(db, MARKEPLTACE_COLLECTIONS.COURSES));

  batch.set(courseRef, {
    ...rest,
    studentsCount: 0,
    totalRevenue: 0,
    createdAt: serverTimestamp(),
  });

  if (targetLink) {
    const videoRef = doc(
      db,
      MARKEPLTACE_COLLECTIONS.COURSE_VIDEOS,
      courseRef.id,
    );
    batch.set(videoRef, {
      videoUrl: targetLink,
    });
  }

  await batch.commit();
  return courseRef.id;
}

export async function updateCourse(
  courseId: string,
  data: Partial<Course> & { link?: string; videoUrl?: string },
) {
  const { videoUrl, link, ...rest } = data;
  const targetLink = link || videoUrl;

  const courseRef = doc(db, MARKEPLTACE_COLLECTIONS.COURSES, courseId);

  const batch = writeBatch(db);
  batch.update(courseRef, {
    ...rest,
    updatedAt: serverTimestamp(),
  });

  if (targetLink !== undefined) {
    const videoRef = doc(db, MARKEPLTACE_COLLECTIONS.COURSE_VIDEOS, courseId);
    batch.set(videoRef, { videoUrl: targetLink }, { merge: true });
  }

  await batch.commit();
}

export async function getAdminCourseVideoUrl(courseId: string) {
  const videoRef = doc(db, MARKEPLTACE_COLLECTIONS.COURSE_VIDEOS, courseId);
  const snap = await getDoc(videoRef);
  if (!snap.exists()) return null;
  return snap.data().videoUrl as string;
}

export async function deleteCourse(courseId: string) {
  await deleteDoc(doc(db, MARKEPLTACE_COLLECTIONS.COURSES, courseId));
}

export async function getPendingCourseRegistrations(): Promise<
  CourseRegistration[]
> {
  const q = query(
    collection(db, MARKEPLTACE_COLLECTIONS.COURSE_REGISTRATIONS),
    where("status", "==", "pending"),
    orderBy("registeredAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as CourseRegistration,
  );
}

// --- Admin Service ---

export async function uploadDocument(
  data: Omit<Document, "id" | "createdAt" | "salesCount">,
  fileUrl: string,
) {
  const batch = writeBatch(db);
  const docRef = doc(collection(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS));

  batch.set(docRef, {
    ...data,
    salesCount: 0,
    totalRevenue: 0,
    createdAt: serverTimestamp(),
  });

  // Secure URL stored separately
  const fileRef = doc(db, MARKEPLTACE_COLLECTIONS.DOC_FILES, docRef.id);
  batch.set(fileRef, {
    fileUrl,
  });

  // Increment global docs count
  const statsRef = doc(db, MARKEPLTACE_COLLECTIONS.GLOBAL_STATS, "main");
  batch.set(statsRef, { totalDocs: increment(1) }, { merge: true });

  await batch.commit();
  return docRef.id;
}

export async function updateDocument(
  docId: string,
  data: Partial<Document>,
  fileUrl?: string,
) {
  const docRef = doc(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS, docId);

  const batch = writeBatch(db);
  batch.update(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });

  if (fileUrl) {
    const fileRef = doc(db, MARKEPLTACE_COLLECTIONS.DOC_FILES, docId);
    batch.set(fileRef, { fileUrl }, { merge: true });
  }

  await batch.commit();
}

export async function resetAllStats() {
  const batch = writeBatch(db);

  // Reset Documents
  const docsSnap = await getDocs(
    collection(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS),
  );
  docsSnap.forEach((d) => {
    batch.update(d.ref, {
      salesCount: 0,
      totalRevenue: 0,
      updatedAt: serverTimestamp(),
    });
  });

  // Reset Courses
  const coursesSnap = await getDocs(
    collection(db, MARKEPLTACE_COLLECTIONS.COURSES),
  );
  coursesSnap.forEach((c) => {
    batch.update(c.ref, {
      studentsCount: 0,
      totalRevenue: 0,
      updatedAt: serverTimestamp(),
    });
  });

  // Reset Global Stats
  const statsRef = doc(db, MARKEPLTACE_COLLECTIONS.GLOBAL_STATS, "main");
  batch.set(
    statsRef,
    {
      totalSales: 0,
      totalRevenue: 0,
      totalViews: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

export async function deleteDocument(docId: string) {
  await deleteDoc(doc(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS, docId));
  await deleteDoc(doc(db, MARKEPLTACE_COLLECTIONS.DOC_FILES, docId));
}

export async function getDocumentFileUrl(docId: string) {
  const fileRef = doc(db, MARKEPLTACE_COLLECTIONS.DOC_FILES, docId);
  const snap = await getDoc(fileRef);
  if (!snap.exists()) return null;
  return snap.data().fileUrl as string;
}

export async function getPendingRequests(): Promise<AccessRequest[]> {
  const q = query(
    collection(db, MARKEPLTACE_COLLECTIONS.REQUESTS),
    where("status", "==", "pending"),
    orderBy("requestedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AccessRequest);
}

export async function trackSiteVisit() {
  // Simple session-based tracking to avoid overcounting refreshes
  const sessionKey = "site_visited_session";
  if (sessionStorage.getItem(sessionKey)) return;

  const statsRef = doc(db, MARKEPLTACE_COLLECTIONS.GLOBAL_STATS, "main");
  try {
    await updateDoc(statsRef, {
      totalViews: increment(1),
    });
    sessionStorage.setItem(sessionKey, "true");
  } catch {
    // If doc doesn't exist, create it
    await setDoc(statsRef, { totalViews: 1 }, { merge: true });
    sessionStorage.setItem(sessionKey, "true");
  }
}

export async function getGlobalStats() {
  const globalSnap = await getDoc(
    doc(db, MARKEPLTACE_COLLECTIONS.GLOBAL_STATS, "main"),
  );

  if (!globalSnap.exists()) {
    return {
      totalDocs: 0,
      totalUsers: 0,
      totalSales: 0,
      totalViews: 0,
      totalRevenue: 0,
    };
  }

  const data = globalSnap.data();
  return {
    totalDocs: data.totalDocs || 0,
    totalUsers: data.totalUsers || 0,
    totalSales: data.totalSales || 0,
    totalViews: data.totalViews || 0,
    totalRevenue: data.totalRevenue || 0,
  };
}

export async function trackDownload(docId: string) {
  const statsRef = doc(db, MARKEPLTACE_COLLECTIONS.GLOBAL_STATS, "main");
  const docRef = doc(db, MARKEPLTACE_COLLECTIONS.DOCUMENTS, docId);

  try {
    await Promise.all([
      updateDoc(statsRef, {
        totalSales: increment(1),
      }),
      updateDoc(docRef, {
        salesCount: increment(1),
      }),
    ]);
  } catch (error) {
    console.warn("Could not track download automatically:", error);
  }
}
