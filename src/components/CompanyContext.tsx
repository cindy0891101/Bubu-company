/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  doc, 
  collection, 
  setDoc, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db, ensureAuth, handleFirestoreError } from '../lib/firebase';
import { Company, Member, Schedule, Expense, Repayment, OperationType } from '../types';

interface CompanyContextType {
  company: Company | null;
  members: Member[];
  schedules: Schedule[];
  expenses: Expense[];
  repayments: Repayment[];
  myMemberId: string | null;
  setMyMemberId: (id: string | null) => void;
  isLoading: boolean;
  errorMsg: string | null;
  
  // Transactions
  joinCompany: (code: string) => Promise<boolean>;
  createNewCompany: (name: string, code: string) => Promise<boolean>;
  updateDriveLink: (url: string) => Promise<void>;
  
  // Member Operations
  upsertMember: (id: string, name: string, avatarUrl: string, roleGroup: string, linePayInfo: string) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  
  // Schedule Operations
  addScheduleEvent: (title: string, date: string, time: string, mapUrl?: string, description?: string) => Promise<void>;
  deleteScheduleEvent: (id: string) => Promise<void>;
  
  // Expense Operations
  addExpenseBill: (amount: number, name: string, date: string, category: string, payerId: string, splitWith: string[], splitType?: 'equal' | 'custom', splitAmounts?: Record<string, number>, invoiceImg?: string) => Promise<void>;
  updateExpenseBill: (id: string, amount: number, name: string, date: string, category: string, payerId: string, splitWith: string[], splitType?: 'equal' | 'custom', splitAmounts?: Record<string, number>, invoiceImg?: string) => Promise<void>;
  deleteExpenseBill: (id: string) => Promise<void>;
  
  // Repayment Operations
  addRepaymentRecord: (fromMemberId: string, toMemberId: string, amount: number, date: string) => Promise<void>;
  toggleRepaymentCleared: (id: string, currentStatus: 'active' | 'cleared') => Promise<void>;
  deleteRepaymentRecord: (id: string) => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [myMemberId, setMyMemberIdState] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Read active connection G-code session on init, only auto-loading if a valid room code is found in localStorage
  useEffect(() => {
    const savedCode = localStorage.getItem('g_code_session');
    const savedMember = localStorage.getItem('g_member_session');
    const isLoggedOut = localStorage.getItem('g_is_logged_out') === 'true';

    // If there's no saved company code or the user explicitly chose to log out, don't auto-boot
    if (!savedCode || isLoggedOut) {
      return;
    }

    const autoBoot = async () => {
      try {
        await ensureAuth();
        const success = await joinCompany(savedCode);
        if (success && savedMember) {
          setMyMemberIdState(savedMember);
        }
      } catch (err) {
        console.error("Auto boot failed:", err);
        setErrorMsg("自動載入會社失敗，請確認網路連線。");
      }
    };

    autoBoot();
  }, []);

  const setMyMemberId = (id: string | null) => {
    setMyMemberIdState(id);
    if (id) {
      localStorage.setItem('g_member_session', id);
    } else {
      localStorage.removeItem('g_member_session');
    }
  };

  // Setup Real-time Synchronizations (onSnapshot) whenever the active companyId changes
  useEffect(() => {
    if (!company?.id) {
      setMembers([]);
      setSchedules([]);
      setExpenses([]);
      setRepayments([]);
      return;
    }

    const companyId = company.id;
    setIsLoading(true);

    // 1. Members Snapshot Listener
    const membersPath = `companies/${companyId}/members`;
    const unsubMembers = onSnapshot(
      collection(db, 'companies', companyId, 'members'),
      (snapshot) => {
        const list: Member[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Member);
        });
        setMembers(list);
        setIsLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, membersPath)
    );

    // 2. Schedules Snapshot Listener
    const schedulesPath = `companies/${companyId}/schedules`;
    const unsubSchedules = onSnapshot(
      collection(db, 'companies', companyId, 'schedules'),
      (snapshot) => {
        const list: Schedule[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Schedule);
        });
        // Sort chronologically
        list.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
        setSchedules(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, schedulesPath)
    );

    // 3. Expenses Snapshot Listener
    const expensesPath = `companies/${companyId}/expenses`;
    const unsubExpenses = onSnapshot(
      collection(db, 'companies', companyId, 'expenses'),
      (snapshot) => {
        const list: Expense[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Expense);
        });
        // Sort latest date first
        list.sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, expensesPath)
    );

    // 4. Repayments Snapshot Listener
    const repaymentsPath = `companies/${companyId}/repayments`;
    const unsubRepayments = onSnapshot(
      collection(db, 'companies', companyId, 'repayments'),
      (snapshot) => {
        const list: Repayment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Repayment);
        });
        // Sort latest date first
        list.sort((a, b) => b.date.localeCompare(a.date));
        setRepayments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, repaymentsPath)
    );

    return () => {
      unsubMembers();
      unsubSchedules();
      unsubExpenses();
      unsubRepayments();
    };
  }, [company?.id]);

  // Core functions
  const joinCompany = async (code: string): Promise<boolean> => {
    const formattedCode = code.trim().toUpperCase();
    if (!formattedCode) return false;
    
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await ensureAuth();
      const compRef = doc(db, 'companies', formattedCode);
      const compSnap = await getDoc(compRef);
      
      if (compSnap.exists()) {
        const data = compSnap.data();
        setCompany({ id: compSnap.id, name: data.name, driveUrl: data.driveUrl || "" });
        localStorage.setItem('g_code_session', formattedCode);
        localStorage.removeItem('g_is_logged_out');
        setIsLoading(false);
        return true;
      } else {
        setErrorMsg("找不到該公司代碼/Code，請確認輸入是否正確！");
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error("Error joining company:", err);
      setErrorMsg("連線讀取公司時發生錯誤，請稍後再試。");
      setIsLoading(false);
      return false;
    }
  };

  const createNewCompany = async (name: string, code: string): Promise<boolean> => {
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanName || !cleanCode) {
      setErrorMsg("請填寫完公司名稱與共享代碼/Code！");
      return false;
    }

    if (!/^[A-Z0-9_\-]+$/.test(cleanCode)) {
      setErrorMsg("共享代碼只能包含英文、數字、底線或中劃線，不可有空格及中文字！");
      return false;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      await ensureAuth();
      const compRef = doc(db, 'companies', cleanCode);
      const compSnap = await getDoc(compRef);
      if (compSnap.exists()) {
        setErrorMsg("Code已被其他人使用了，請換一個獨特好記的名稱！");
        setIsLoading(false);
        return false;
      }

      const newCompanyObj = {
        id: cleanCode,
        name: cleanName,
        driveUrl: "",
        createdAt: new Date().toISOString()
      };

      await setDoc(compRef, newCompanyObj);
      setCompany(newCompanyObj);
      localStorage.setItem('g_code_session', cleanCode);
      localStorage.removeItem('g_is_logged_out');
      
      // Auto pre-add a default helper member if list is empty, done automatically later inside views
      setIsLoading(false);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${cleanCode}`);
      setIsLoading(false);
      return false;
    }
  };

  const updateDriveLink = async (url: string) => {
    if (!company?.id) return;
    const path = `companies/${company.id}`;
    try {
      await updateDoc(doc(db, 'companies', company.id), { driveUrl: url });
      setCompany(prev => prev ? { ...prev, driveUrl: url } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  // Member Operations
  const upsertMember = async (id: string, name: string, avatarUrl: string, roleGroup: string, linePayInfo: string) => {
    if (!company?.id) return;
    const path = `companies/${company.id}/members/${id}`;
    try {
      await setDoc(doc(db, 'companies', company.id, 'members', id), {
        companyId: company.id,
        name: name.trim(),
        avatarUrl,
        roleGroup,
        linePayInfo: linePayInfo.trim(),
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const deleteMember = async (id: string) => {
    if (!company?.id) return;
    const path = `companies/${company.id}/members/${id}`;
    try {
      await deleteDoc(doc(db, 'companies', company.id, 'members', id));
      if (myMemberId === id) {
        setMyMemberId(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Schedule Operations
  const addScheduleEvent = async (title: string, date: string, time: string, mapUrl?: string, description?: string) => {
    if (!company?.id) return;
    const tempId = `SCH-${Date.now()}`;
    const path = `companies/${company.id}/schedules/${tempId}`;
    try {
      await setDoc(doc(db, 'companies', company.id, 'schedules', tempId), {
        id: tempId,
        companyId: company.id,
        title: title.trim(),
        date,
        time,
        mapUrl: mapUrl?.trim() || '',
        description: description?.trim() || '',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const deleteScheduleEvent = async (id: string) => {
    if (!company?.id) return;
    const path = `companies/${company.id}/schedules/${id}`;
    try {
      await deleteDoc(doc(db, 'companies', company.id, 'schedules', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Expense Operations
  const addExpenseBill = async (amount: number, name: string, date: string, category: string, payerId: string, splitWith: string[], splitType: 'equal' | 'custom' = 'equal', splitAmounts: Record<string, number> = {}, invoiceImg?: string) => {
    if (!company?.id) return;
    const tempId = `EXP-${Date.now()}`;
    const path = `companies/${company.id}/expenses/${tempId}`;
    try {
      await setDoc(doc(db, 'companies', company.id, 'expenses', tempId), {
        id: tempId,
        companyId: company.id,
        amount,
        name: name.trim(),
        date,
        category,
        payerId,
        splitWith,
        splitType,
        splitAmounts,
        invoiceImg: invoiceImg || '',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const updateExpenseBill = async (id: string, amount: number, name: string, date: string, category: string, payerId: string, splitWith: string[], splitType: 'equal' | 'custom' = 'equal', splitAmounts: Record<string, number> = {}, invoiceImg?: string) => {
    if (!company?.id) return;
    const path = `companies/${company.id}/expenses/${id}`;
    try {
      await setDoc(doc(db, 'companies', company.id, 'expenses', id), {
        id,
        companyId: company.id,
        amount,
        name: name.trim(),
        date,
        category,
        payerId,
        splitWith,
        splitType,
        splitAmounts,
        invoiceImg: invoiceImg || '',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteExpenseBill = async (id: string) => {
    if (!company?.id) return;
    const path = `companies/${company.id}/expenses/${id}`;
    try {
      await deleteDoc(doc(db, 'companies', company.id, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Repayment Operations
  const addRepaymentRecord = async (fromMemberId: string, toMemberId: string, amount: number, date: string) => {
    if (!company?.id) return;
    const tempId = `PAY-${Date.now()}`;
    const path = `companies/${company.id}/repayments/${tempId}`;
    try {
      await setDoc(doc(db, 'companies', company.id, 'repayments', tempId), {
        id: tempId,
        companyId: company.id,
        fromMemberId,
        toMemberId,
        amount,
        status: 'active',
        date,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const toggleRepaymentCleared = async (id: string, currentStatus: 'active' | 'cleared') => {
    if (!company?.id) return;
    const path = `companies/${company.id}/repayments/${id}`;
    try {
      const nextStatus = currentStatus === 'active' ? 'cleared' : 'active';
      await updateDoc(doc(db, 'companies', company.id, 'repayments', id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteRepaymentRecord = async (id: string) => {
    if (!company?.id) return;
    const path = `companies/${company.id}/repayments/${id}`;
    try {
      await deleteDoc(doc(db, 'companies', company.id, 'repayments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <CompanyContext.Provider value={{
      company,
      members,
      schedules,
      expenses,
      repayments,
      myMemberId,
      setMyMemberId,
      isLoading,
      errorMsg,
      joinCompany,
      createNewCompany,
      updateDriveLink,
      upsertMember,
      deleteMember,
      addScheduleEvent,
      deleteScheduleEvent,
      addExpenseBill,
      updateExpenseBill,
      deleteExpenseBill,
      addRepaymentRecord,
      toggleRepaymentCleared,
      deleteRepaymentRecord
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
