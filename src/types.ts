/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Company {
  id: string; // The unique code used to sync (e.g. "G-CODE-123")
  name: string;
  driveUrl?: string; // Google Drive or shared directory link
  createdAt?: any;
}

export interface Member {
  id: string; // Member document ID (can be user's dynamic Auth ID or UUID)
  companyId: string;
  name: string;
  avatarUrl: string; // Base64 compressed representation or preset avatar
  roleGroup: string; // Dept / Group: "財務" | "營運" | "設計" | "工程" | "一般" etc.
  linePayInfo?: string; // LINE Pay phone/ID text
  createdAt?: any;
}

export interface Schedule {
  id: string;
  companyId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  mapUrl?: string; // Google map location link or text
  description?: string; // Detailed info description
  createdAt?: any;
}

export interface Expense {
  id: string;
  companyId: string;
  amount: number;
  name: string;
  date: string; // YYYY-MM-DD
  category: string; // e.g. "伙食" | "交通" | "租金" | "辦公" | "娛樂" | "其他"
  payerId: string; // Member UID who paid
  splitWith: string[]; // List of Member UIDs splitting the expense
  splitType?: 'equal' | 'custom';
  splitAmounts?: Record<string, number>;
  invoiceImg?: string; // Base64 compressed representation of invoice/receipt photo
  createdAt?: any;
  updatedAt?: any;
}

export interface Repayment {
  id: string;
  companyId: string;
  fromMemberId: string; // Who owes money
  toMemberId: string; // Who receives money
  amount: number; // Reimbursed amount in this ledger item
  status: 'active' | 'cleared'; // 'cleared' displays crossed-out and is reversible (可回溯)
  date: string; // YYYY-MM-DD
  createdAt?: any;
  updatedAt?: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function getExpenseMemberShare(exp: any, memberId: string): number {
  if (exp.splitType === 'custom' && exp.splitAmounts) {
    return Number(exp.splitAmounts[memberId]) || 0;
  }
  const splitWith = exp.splitWith || [];
  if (splitWith.includes(memberId)) {
    return (Number(exp.amount) || 0) / (splitWith.length || 1);
  }
  return 0;
}
