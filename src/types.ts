import { Timestamp } from "firebase/firestore";

export interface Document {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  difficulty: "Basic" | "Intermediate" | "Advanced";
  fileUrl?: string; // Only reachable if purchased
  previewUrl: string; // Public PDF preview
  thumbnailUrl: string;
  salesCount: number;
  status: "Hot" | "Bestseller" | "New" | "Regular";
  totalRevenue?: number;
  createdAt: Timestamp | Date | number;
  updatedAt?: Timestamp | Date | number;
  requiresManualAccess?: boolean; // New field
  originalLink?: string; // Private link for Admin reference (not public)
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  photoURL?: string;
  isAdmin: boolean;
  totalTopup?: number;
  purchasedDocs: string[]; // List of document IDs
  purchasedCourses?: string[]; // List of course IDs
  createdAt: Timestamp | Date | number;
}

export interface Wallet {
  userId: string;
  balance: number;
  currency: string;
  updatedAt: Timestamp | Date | number;
}

export interface WalletTransaction {
  id?: string;
  userId: string;
  type: "TOPUP" | "REFUND" | "ADJUSTMENT";
  amount: number;
  credits: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  orderCode: string;
  source: string;
  createdAt: Timestamp | Date | number;
}

export interface Purchase {
  id: string;
  userId: string;
  documentId: string;
  pricePaid: number;
  purchasedAt: Timestamp | Date | number;
}

export interface AccessRequest {
  id: string;
  userId: string;
  userEmail: string;
  documentId: string;
  documentTitle: string;
  fullName?: string;
  phoneNumber?: string;
  zaloNumber?: string;
  transactionCode?: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Timestamp;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  price: number;
  thumbnailUrl: string;
  driveThumbnailUrl?: string;
  previewUrl?: string;
  link?: string; // The course link (Drive/YouTube) accessible after approval
  category: string;
  status: "Hot" | "New" | "Upcoming";
  studentsCount: number;
  totalRevenue?: number;
  createdAt: Timestamp | Date | number;
  updatedAt?: Timestamp | Date | number;
  requiresManualAccess?: boolean; // New field
  originalLink?: string; // Private link for Admin reference (not public)
}

export interface CourseRegistration {
  id: string;
  userId: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  fullName?: string;
  phoneNumber?: string;
  zaloNumber?: string;
  transactionCode?: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  registeredAt: Timestamp;
}

export type Category = string; // Using string for flexible "Grade | Subject" format
