/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useCompany } from './CompanyContext';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Coins, 
  User, 
  Check, 
  RotateCcw, 
  DollarSign, 
  Calendar,
  Layers,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  Share2,
  Copy,
  Info,
  Camera,
  Image as ImageIcon,
  Eye,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, compressImageFile } from '../utils/image';
import { getExpenseMemberShare } from '../types';

export default function AccountingCounter() {
  const { 
    members, 
    expenses, 
    repayments, 
    addExpenseBill, 
    updateExpenseBill, 
    deleteExpenseBill,
    addRepaymentRecord,
    toggleRepaymentCleared,
    deleteRepaymentRecord,
    myMemberId
  } = useCompany();

  // Selected date management
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Calendar Zoom State: 'month' | 'week'
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('week');
  
  // Navigate calendars
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());

  // Dialog Control
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form Fields
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('伙食');
  const [payerId, setPayerId] = useState('');
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});
  const [invoiceImg, setInvoiceImg] = useState('');
  const [isCompressingImg, setIsCompressingImg] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Detailed Card Drawer State
  const [viewingExpenseId, setViewingExpenseId] = useState<string | null>(null);

  // Repayment form popup states
  const [repayFormState, setRepayFormState] = useState<{
    show: boolean;
    fromId: string;
    toId: string;
    suggestedAmount: number;
    customAmount: string;
    date: string;
  }>({
    show: false,
    fromId: '',
    toId: '',
    suggestedAmount: 0,
    customAmount: '',
    date: ''
  });

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper date list generators
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeeklyIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  // Switch to week or month
  const getDaysArray = () => {
    if (calendarView === 'month') {
      return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    } else {
      // Return 7 days centering around the selected day's week
      const current = new Date(selectedDate + 'T00:00:00');
      const dayOfWeek = current.getDay();
      const startOfWeek = new Date(current);
      startOfWeek.setDate(current.getDate() - dayOfWeek);

      const weekDays: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        weekDays.push(d);
      }
      return weekDays;
    }
  };

  // Convert day click to string
  const handleDaySelect = (dayInfo: number | Date) => {
    if (typeof dayInfo === 'number') {
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(dayInfo).padStart(2, '0');
      setSelectedDate(`${currentYear}-${mm}-${dd}`);
    } else {
      setSelectedDate(dayInfo.toISOString().split('T')[0]);
      setCurrentMonth(dayInfo.getMonth());
      setCurrentYear(dayInfo.getFullYear());
    }
  };

  // Filter expenses matching selected date
  const dayExpenses = expenses.filter(exp => exp.date === selectedDate);

  // Compute Net Balance for each member (Expenses + Active Repayments)
  // Balance = Money Spent as Payer - Share Owed in Bills + Repayments Made - Repayments Received
  const computeMembersNetFlow = () => {
    const net: Record<string, number> = {};
    members.forEach(m => { net[m.id] = 0; });

    // 1. Process Expenses
    expenses.forEach(exp => {
      const billAmount = Number(exp.amount) || 0;

      // Add full amount credit to the payer
      if (net[exp.payerId] !== undefined) {
        net[exp.payerId] += billAmount;
      }

      // Deduct shared amount from all contributors using helper
      members.forEach(m => {
        const shareAmount = getExpenseMemberShare(exp, m.id);
        net[m.id] -= shareAmount;
      });
    });

    // 2. Process Repayments
    // Active repayments directly decrease the sender's debts (increases net balance) and decrease the receiver's credits (decreases net balance)
    repayments.forEach(repay => {
      if (repay.status !== 'active') return; // Cancelled/cleared list is crossed out, hence not computed
      const repAmount = Number(repay.amount) || 0;

      if (net[repay.fromMemberId] !== undefined) {
        net[repay.fromMemberId] += repAmount;
      }
      if (net[repay.toMemberId] !== undefined) {
        net[repay.toMemberId] -= repAmount;
      }
    });

    return net;
  };

  // Debt simplification utility (Greedy matching)
  const resolveSimplifiedDebts = () => {
    const balances = computeMembersNetFlow();
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    Object.entries(balances).forEach(([id, bal]) => {
      const absBal = Math.round(bal * 100) / 100;
      if (absBal < -0.05) {
        debtors.push({ id, amount: Math.abs(absBal) });
      } else if (absBal > 0.05) {
        creditors.push({ id, amount: absBal });
      }
    });

    // Sort descending
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: {
      fromMemberId: string;
      toMemberId: string;
      amount: number;
    }[] = [];

    let dIdx = 0;
    let cIdx = 0;

    // Deep clones to preserve values
    const dList = debtors.map(item => ({ ...item }));
    const cList = creditors.map(item => ({ ...item }));

    while (dIdx < dList.length && cIdx < cList.length) {
      const debtor = dList[dIdx];
      const creditor = cList[cIdx];

      const transferAmount = Math.min(debtor.amount, creditor.amount);
      const roundedTransfer = Math.round(transferAmount * 100) / 100;

      if (roundedTransfer > 0) {
        transactions.push({
          fromMemberId: debtor.id,
          toMemberId: creditor.id,
          amount: roundedTransfer
        });
      }

      debtor.amount -= roundedTransfer;
      creditor.amount -= roundedTransfer;

      if (debtor.amount <= 0.05) dIdx++;
      if (creditor.amount <= 0.05) cIdx++;
    }

    return transactions;
  };

  const simplifiedDebts = resolveSimplifiedDebts();

  // Handle bill editing mapping
  const handleOpenEdit = (exp: any) => {
    setEditingExpenseId(exp.id);
    setAmount(String(exp.amount));
    setName(exp.name);
    setCategory(exp.category);
    setPayerId(exp.payerId);
    setSplitWith(exp.splitWith || []);
    setSplitType(exp.splitType || 'equal');
    setInvoiceImg(exp.invoiceImg || '');

    const amountsMap: Record<string, string> = {};
    if (exp.splitAmounts) {
      Object.entries(exp.splitAmounts).forEach(([mId, val]) => {
        amountsMap[mId] = String(val);
      });
    }
    setCustomSplitAmounts(amountsMap);

    setViewingExpenseId(null);
    setShowAddForm(true);
  };

  const handleOpenAdd = () => {
    setEditingExpenseId(null);
    setAmount('');
    setName('');
    setCategory('伙食');
    setPayerId(myMemberId || (members[0]?.id || ''));
    setSplitWith(members.map(m => m.id)); // Default split equally among everyone
    setSplitType('equal');
    setCustomSplitAmounts({});
    setInvoiceImg('');
    setIsCompressingImg(false);
    setShowAddForm(true);
  };

  const handleSplitTypeToggle = (type: 'equal' | 'custom') => {
    setSplitType(type);
    if (type === 'custom') {
      const currentTotal = Number(amount) || 0;
      const count = splitWith.length;
      if (count > 0 && currentTotal > 0) {
        const equalShare = Math.round((currentTotal / count) * 100) / 100;
        const newAmounts: Record<string, string> = { ...customSplitAmounts };
        splitWith.forEach(mId => {
          if (!newAmounts[mId]) {
            newAmounts[mId] = String(equalShare);
          }
        });
        setCustomSplitAmounts(newAmounts);
        const sum = splitWith.reduce((acc, currentId) => {
          const val = Number(newAmounts[currentId]) || 0;
          return acc + val;
        }, 0);
        setAmount(String(sum));
      }
    }
  };

  const handleCustomAmountChange = (mId: string, value: string) => {
    const updated = { ...customSplitAmounts, [mId]: value };
    setCustomSplitAmounts(updated);

    const sum = splitWith.reduce((acc, currentId) => {
      const val = Number(updated[currentId]) || 0;
      return acc + val;
    }, 0);
    setAmount(String(sum));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!name.trim() || isNaN(numAmt) || numAmt <= 0 || !payerId || splitWith.length === 0) {
      alert("請確實填入消費名稱、金額、付款付款人，並勾選至少一位分擔者！");
      return;
    }

    const finalSplitAmounts: Record<string, number> = {};
    if (splitType === 'custom') {
      splitWith.forEach(mId => {
        finalSplitAmounts[mId] = Number(customSplitAmounts[mId]) || 0;
      });
    }

    try {
      if (editingExpenseId) {
        await updateExpenseBill(editingExpenseId, numAmt, name, selectedDate, category, payerId, splitWith, splitType, finalSplitAmounts, invoiceImg);
      } else {
        await addExpenseBill(numAmt, name, selectedDate, category, payerId, splitWith, splitType, finalSplitAmounts, invoiceImg);
      }
      setShowAddForm(false);
      setName('');
      setAmount('');
      setInvoiceImg('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerRepayment = (fromId: string, toId: string, amountOwed: number) => {
    setRepayFormState({
      show: true,
      fromId,
      toId,
      suggestedAmount: amountOwed,
      customAmount: String(amountOwed),
      date: todayStr
    });
  };

  const submitRepaymentRecord = async () => {
    const amt = Number(repayFormState.customAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("請輸入有效的還款金額。");
      return;
    }

    try {
      await addRepaymentRecord(repayFormState.fromId, repayFormState.toId, amt, repayFormState.date || todayStr);
      setRepayFormState(prev => ({ ...prev, show: false }));
    } catch (err) {
      console.error(err);
    }
  };

  const copyLinePay = async (payee: any) => {
  const info = payee?.linePayInfo || payee?.name || "";

    try {
      await navigator.clipboard.writeText(info);
  
      setCopiedText(payee.id);
      setTimeout(() => setCopiedText(null), 1800);
  
      setTimeout(() => {
        window.location.href = "line://";
      }, 300);
  
    } catch (err) {
      console.error(err);
  
      window.location.href = "line://";
    }
  };

  const toggleSplitCheck = (mId: string) => {
    const nextSplitWith = splitWith.includes(mId)
      ? splitWith.filter(x => x !== mId)
      : [...splitWith, mId];
    setSplitWith(nextSplitWith);

    if (splitType === 'custom') {
      const sum = nextSplitWith.reduce((acc, currentId) => {
        const val = Number(customSplitAmounts[currentId]) || 0;
        return acc + val;
      }, 0);
      setAmount(String(sum));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Scalable Mini-Calendar and Transaction Logger */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Calendar Block (小月曆) */}
          <div className="bg-[#FCF9F2] p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-bold text-[#2A2421] flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-amber-500" />
                <span>把餔記帳簿</span>
              </h3>
              
              <div className="flex items-center gap-1.5">
                {/* Scale View Control (縮放控制) */}
                <button
                  onClick={() => setCalendarView(prev => prev === 'month' ? 'week' : 'month')}
                  className="px-2.5 py-1 bg-white border border-[#2A2421] rounded-lg text-xs font-bold shadow-[1px_1px_0px_0px_#2A2421]"
                >
                  {calendarView === 'month' ? '📅 縮小為週' : '📆 放大為月'}
                </button>

                {calendarView === 'month' && (
                  <div className="flex items-center">
                    <button onClick={handlePrevMonth} className="p-1 text-gray-700 hover:text-black">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-sm text-[#2A2421] min-w-[70px] text-center">
                      {currentYear}/{currentMonth + 1}
                    </span>
                    <button onClick={handleNextMonth} className="p-1 text-gray-700 hover:text-black">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Weeks display */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 mb-1">
              <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarView === 'month' && Array.from({ length: firstDayWeeklyIndex }).map((_, idx) => (
                <div key={`blank-${idx}`} className="aspect-square"></div>
              ))}

              {getDaysArray().map((dayInfo, idx) => {
                let dayNum = 0;
                let fullDateStr = "";
                let isSelected = false;

                if (typeof dayInfo === 'number') {
                  dayNum = dayInfo;
                  const mm = String(currentMonth + 1).padStart(2, '0');
                  const dd = String(dayNum).padStart(2, '0');
                  fullDateStr = `${currentYear}-${mm}-${dd}`;
                  isSelected = selectedDate === fullDateStr;
                } else {
                  dayNum = dayInfo.getDate();
                  fullDateStr = dayInfo.toISOString().split('T')[0];
                  isSelected = selectedDate === fullDateStr;
                }

                // Has expense dot
                const dayHasBills = expenses.some(e => e.date === fullDateStr);
                const isCurrentToday = todayStr === fullDateStr;

                return (
                  <button
                    key={`counter-day-${idx}`}
                    onClick={() => handleDaySelect(dayInfo)}
                    className={`aspect-square relative rounded-lg border font-bold text-[11px] flex flex-col items-center justify-center transition-all
                      ${isSelected 
                        ? 'bg-[#DFA775] border-[#2A2421] text-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421]' 
                        : isCurrentToday
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'bg-white border-transparent hover:border-gray-300 text-gray-800'
                      }
                    `}
                  >
                    <span>{dayNum}</span>
                    {dayHasBills && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day List Details (下方記帳紀錄) */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421] flex-1">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-tight">Selected Date Purchases</span>
                <span className="font-extrabold text-sm text-[#2A2421]">{selectedDate}</span>
              </div>
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#DFA775] border border-[#2A2421] rounded-xl text-xs font-bold shadow-[1px_1px_0px_0px_#2A2421] text-[#2A2421] active:translate-y-0.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增項目</span>
              </button>
            </div>

            <div className="space-y-3">
              {dayExpenses.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl">🧾</span>
                  <p className="text-sm font-bold text-gray-400 mt-2">這天沒有任何消費登錄</p>
                  <p className="text-xs text-gray-300 mt-1">點擊「新增項目」來填報第一筆帳單吧！</p>
                </div>
              ) : (
                dayExpenses.map(exp => {
                  const categoryInfo = CATEGORIES.find(c => c.name === exp.category) || CATEGORIES[6];
                  const payer = members.find(m => m.id === exp.payerId);

                  return (
                    <div 
                      key={exp.id}
                      className="group relative border border-[#2A2421] rounded-xl p-3 bg-[#FDFBF7] shadow-[1px_1px_0px_0px_#2A2421] hover:shadow-[2px_2px_0px_0px_#2A2421] transition-all cursor-pointer"
                      onClick={() => setViewingExpenseId(viewingExpenseId === exp.id ? null : exp.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{categoryInfo.icon}</span>
                          <div>
                            <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full border border-gray-200">
                              {exp.category}
                            </span>
                            <h4 className="font-extrabold text-sm text-[#2A2421] mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>{exp.name}</span>
                              {exp.invoiceImg && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] bg-blue-50 border border-blue-300 rounded font-black text-blue-600 animate-pulse">
                                  <Paperclip className="w-2.5 h-2.5" />
                                  <span>有發票</span>
                                </span>
                              )}
                            </h4>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-[#2A2421] block">
                            ${exp.amount.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 block">
                            由 {payer?.name || '未知成員'} 付款
                          </span>
                        </div>
                      </div>

                      {/* Sliding Action Detail Drawer (點下去後能看到詳細資訊與修改編輯) */}
                      <AnimatePresence>
                        {viewingExpenseId === exp.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 overflow-hidden text-xs text-gray-700 space-y-3"
                          >
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-gray-100">
                              <div>
                                <span className="font-bold text-slate-400 block mb-1">👑 誰付錢</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-lg">{payer?.avatarUrl || '👤'}</span>
                                  <span className="font-bold text-[#2A2421]">{payer?.name || '未知'}</span>
                                </div>
                              </div>
                              <div>
                                <span className="font-bold text-slate-400 block mb-1">👥 分攤名單 ({exp.splitWith?.length || 0}人)</span>
                                <div className="flex flex-wrap gap-1">
                                  {exp.splitWith?.map(sId => {
                                    const splitMem = members.find(m => m.id === sId);
                                    let shareStr = "";
                                    if (exp.splitType === 'custom' && exp.splitAmounts) {
                                      shareStr = ` ($${Math.round(exp.splitAmounts[sId] || 0)})`;
                                    } else {
                                      shareStr = ` ($${Math.round((exp.amount / (exp.splitWith.length || 1)) * 100) / 100})`;
                                    }
                                    return (
                                      <span key={sId} className="bg-white border border-[#2A2421] rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                                        {splitMem?.name || '未知'}{shareStr}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {exp.invoiceImg && (
                              <div className="bg-amber-50/50 p-2.5 rounded-xl border border-[#DFA775]">
                                <span className="font-extrabold text-[#A05C33] block mb-1.5 flex items-center gap-1 text-[10px]">
                                  <Camera className="w-3.5 h-3.5 shrink-0 text-[#A05C33]" />
                                  <span>🧾 關聯發票 / 收據照片紀錄</span>
                                </span>
                                <div className="flex gap-3 items-center">
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLightboxImg(exp.invoiceImg);
                                    }}
                                    className="relative w-14 h-14 rounded-lg border border-[#2A2421] overflow-hidden bg-white shadow-[1px_1px_0px_0px_#2A2421] hover:scale-105 active:scale-95 transition-all cursor-zoom-in shrink-0"
                                    title="點擊放大圖片"
                                  >
                                    <img 
                                      src={exp.invoiceImg} 
                                      alt="compressed receipt thumb" 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[7px] text-white py-0.5 text-center font-black">
                                      點開大圖
                                    </div>
                                  </div>
                                  
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-[#2A2421]">點擊左方縮圖即可放大檢視</p>
                                    <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">圖片已通過高壓優化（約 15-30KB）防止流量延遲。</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteExpenseBill(exp.id); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 rounded-xl font-bold text-[11px]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>刪除</span>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(exp); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-300 rounded-xl font-bold text-[11px]"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>修改編輯</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Smart Simplified Debts Resolvers */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Minimum Debt Transfer Table (最少轉帳方式計算誰欠誰多少) */}
          <div className="bg-[#A3B19B] p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421]">
            <h3 className="text-base font-black text-[#2A2421] mb-1.5 flex items-center gap-1.5">
              <Coins className="w-4.5 h-4.5 text-emerald-600" />
              <span>結算方案</span>
            </h3>

            <div className="space-y-2.5">
              {simplifiedDebts.length === 0 ? (
                <div className="bg-white/70 p-4 rounded-xl text-center border border-dashed border-[#2A2421]">
                  <span className="text-3xl">☕</span>
                  <p className="text-xs font-bold text-gray-500 mt-1.5">太優秀了，目前無人欠款！</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">所有大夥日常的款項都分配得剛剛好。</p>
                </div>
              ) : (
                simplifiedDebts.map((deb, idx) => {
                  const fromUser = members.find(m => m.id === deb.fromMemberId);
                  const toUser = members.find(m => m.id === deb.toMemberId);

                  return (
                    <div 
                      key={`simplified-deb-${idx}`}
                      className="bg-white border border-[#2A2421] rounded-xl p-3 shadow-[1px_1px_0px_0px_#2A2421] space-y-2"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{fromUser?.avatarUrl || '👤'}</span>
                          <span className="font-extrabold text-[#2A2421]">{fromUser?.name || '未知'}</span>
                        </div>
                        
                        <div className="text-center font-bold px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-[10px] animate-pulse">
                          應還款 ${deb.amount.toLocaleString()}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[#2A2421]">{toUser?.name || '未知'}</span>
                          <span className="text-lg">{toUser?.avatarUrl || '👤'}</span>
                        </div>
                      </div>

                      {/* Repay Control Panel */}
                      <div className="flex gap-1.5 pt-1 border-t border-slate-100 text-xs">
                        <button
                          onClick={() => handleTriggerRepayment(deb.fromMemberId, deb.toMemberId, deb.amount)}
                          className="flex-1 py-1 bg-[#DFA775] hover:bg-[#d2945d] border border-[#2A2421] rounded-lg font-bold text-[#2A2421] flex justify-center items-center gap-1 active:translate-y-0.5 transition-all text-[11px]"
                        >
                          💸 登記還款 (可微調)
                        </button>
                        
                        {/* LINE Pay Fast launch (LINE Pay 連結) */}
                        <button
                          onClick={() => copyLinePay(toUser)}
                          className="px-2.5 py-1 bg-[#06C755] hover:bg-[#05b34cf2] text-white border border-[#2A2421] rounded-lg font-bold flex items-center justify-center gap-1 text-[11px]"
                          title="複製 LINE Pay 資訊"
                        >
                          <span className="font-black text-[10.5px]">LINE Pay</span>
                          {copiedText === toUser?.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Copy prompt feedback */}
                      {copiedText === toUser?.id && (
                        <div className="text-[10px] text-center font-bold text-green-600 bg-green-50 rounded-lg p-1 border border-green-200">
                          已複製 <b>{toUser?.name}</b> 的 LINE Pay：{toUser?.linePayInfo || "名稱"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Repayment History list - Clear/Mark off hand controls with Undo backtrace (手動點掉，已讀劃掉，可復原避免誤觸) */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421]">
            <h3 className="text-sm font-black text-[#2A2421] mb-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>還款歷史紀錄簿</span>
            </h3>
            <span className="text-[10px] font-bold text-[#201d1c44] leading-tight block mb-2.5">
              點擊前方圓框，即可完成手動「劃掉/結清」消帳；對已劃掉的項目點擊「復原」即可回溯，防止誤觸！
            </span>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {repayments.length === 0 ? (
                <div className="text-center py-5 text-gray-300 font-bold text-[11px]">
                  目前尚未有還款紀錄
                </div>
              ) : (
                repayments.map(rep => {
                  const fromU = members.find(m => m.id === rep.fromMemberId);
                  const toU = members.find(m => m.id === rep.toMemberId);
                  const isCleared = rep.status === 'cleared';

                  return (
                    <div 
                      key={rep.id}
                      className={`flex justify-between items-center p-2 border border-[#2A2421] rounded-lg transition-all
                        ${isCleared 
                          ? 'bg-slate-50 border-gray-300 text-slate-400 line-through opacity-70' 
                          : 'bg-[#FDFBF7]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {/* 手動消帳圓框 */}
                        <button
                          onClick={() => toggleRepaymentCleared(rep.id, rep.status)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                            ${isCleared 
                              ? 'bg-slate-300 border-slate-400 text-white' 
                              : 'bg-white border-[#2A2421] hover:bg-emerald-50'
                            }
                          `}
                          title={isCleared ? "恢還未結清" : "消帳劃掉"}
                        >
                          {isCleared && <Check className="w-3 h-3" />}
                        </button>

                        <div className="text-xs">
                          <span className="font-black">
                            {fromU?.name || '未知'} ➜ {toU?.name || '未知'}
                          </span>
                          <span className="block text-[10px] text-gray-400 font-mono">
                            {rep.date}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs">
                          ${rep.amount.toLocaleString()}
                        </span>
                        
                        {/* Reversion (可回溯以防誤觸) */}
                        {isCleared ? (
                          <button
                            onClick={() => toggleRepaymentCleared(rep.id, 'cleared')}
                            className="p-1 text-xs bg-slate-200 hover:bg-slate-300 border border-slate-400 text-[#2A2421] rounded-md flex items-center gap-0.5 no-underline cursor-pointer"
                            title="復原此筆還款"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-black">復原</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => deleteRepaymentRecord(rep.id)}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md"
                            title="徹底刪除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Creator/Editor Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#FCF9F2] border-2 border-[#2A2421] rounded-xl p-5 max-w-md w-full shadow-[3px_3px_0px_0px_#2A2421]"
          >
            <h3 className="text-base font-black text-[#2A2421] mb-3 flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-amber-500" />
              <span>{editingExpenseId ? '修改會社登載開銷' : '登載一筆開銷'}</span>
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <<div className="grid grid-cols-[2fr_1fr] gap-2.5 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                    💰 消費金額 {splitType === 'custom' && <span className="text-blue-500 font-bold">(自動加總)</span>}
                  </label>
                  <input 
                    type="number"
                    placeholder={splitType === 'custom' ? "依分攤金額加總" : "請輸入台幣金額"}
                    value={amount}
                    onChange={(e) => {
                      if (splitType === 'equal') {
                        setAmount(e.target.value);
                      }
                    }}
                    readOnly={splitType === 'custom'}
                     className={`w-full h-11 px-2.5 text-xs rounded-lg border border-[#2A2421] text-[#2A2421] font-black outline-none ${
                        splitType === 'custom' ? 'bg-blue-50 border-blue-300' : 'bg-white'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                    🏷️ 費用種類
                  </label>
                  <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-11 px-2.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none appearance-none"
                    >
                    {CATEGORIES.map(c => (
                      <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
                <div className="grid grid-cols-[2fr_1fr] gap-2.5 items-end">
                
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                      ✏️ 消費說明/名稱
                    </label>
                
                    <input
                      type="text"
                      placeholder="例如: 全聯採買辦公用品"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 px-2.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                      required
                    />
                  </div>
                
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                      👑 誰付的錢
                    </label>
                
                    <select
                      value={payerId}
                      onChange={(e) => setPayerId(e.target.value)}
                      className="w-full h-11 px-2.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                    >
                      {members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.avatarUrl} {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                    📅 日期
                  </label>
                
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                
                    <div
                      className="
                        w-full
                        h-11
                        px-3
                        rounded-lg
                        border border-[#2A2421]
                        bg-white
                        flex items-center
                        text-xs
                        font-bold
                        text-[#2A2421]
                      "
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{selectedDate.replaceAll('-', '/')}</span>
                      </div>
                    </div>
                  </div>
                </div>

      

              {/* Split Method Toggle (分攤方式切換) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">
                  ⚖️ 分攤金額方法
                </label>
                <div className="grid grid-cols-2 gap-1 bg-white border border-[#2A2421] p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleSplitTypeToggle('equal')}
                    className={`py-1 text-xs font-bold rounded-md transition-all ${
                      splitType === 'equal'
                        ? 'bg-[#DFA775] border border-[#2A2421] text-[#2A2421] shadow-xs'
                        : 'text-gray-500 hover:text-black hover:bg-gray-100'
                    }`}
                  >
                    均分 (Equal)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSplitTypeToggle('custom')}
                    className={`py-1 text-xs font-bold rounded-md transition-all ${
                      splitType === 'custom'
                        ? 'bg-[#DFA775] border border-[#2A2421] text-[#2A2421] shadow-xs'
                        : 'text-gray-500 hover:text-black hover:bg-gray-100'
                    }`}
                  >
                    自訂金額 (Custom)
                  </button>
                </div>
              </div>

              {/* Multiselect Checkbox list for split proportion (分攤給誰) */}
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="block text-[10px] font-bold text-gray-500">
                    👥 分攤名單 (已選 {splitWith.length} 人)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = members.map(m => m.id);
                      setSplitWith(allIds);
                      if (splitType === 'custom') {
                        const sum = allIds.reduce((acc, currentId) => {
                          const val = Number(customSplitAmounts[currentId]) || 0;
                          return acc + val;
                        }, 0);
                        setAmount(String(sum));
                      }
                    }}
                    className="text-[9px] text-blue-600 hover:underline font-bold"
                  >
                    全選
                  </button>
                </div>
                <div className="space-y-1.5 bg-white border border-[#2A2421] rounded-xl p-2.5 max-h-[160px] overflow-y-auto w-full">
                  {members.map(m => {
                    const checked = splitWith.includes(m.id);
                    return (
                      <div 
                        key={`form-split-${m.id}`}
                        className={`flex items-center justify-between p-1.5 rounded-lg border transition-all
                          ${checked 
                            ? 'bg-blue-50/50 border-blue-400 font-bold' 
                            : 'border-transparent font-medium text-gray-500 hover:bg-slate-50'
                          }
                        `}
                      >
                        <label className="flex items-center gap-1.5 cursor-pointer select-none grow">
                          <input 
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSplitCheck(m.id)}
                            className="w-3.5 h-3.5 accent-[#2A2421] cursor-pointer"
                          />
                          <span>{m.avatarUrl}</span>
                          <span className="text-xs truncate max-w-[100px]">{m.name}</span>
                        </label>

                        {/* Input amount if splitType is custom */}
                        {splitType === 'custom' ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-gray-400 font-bold">$</span>
                            <input
                              type="number"
                              disabled={!checked}
                              placeholder="0"
                              value={checked ? (customSplitAmounts[m.id] || '') : ''}
                              onChange={(e) => handleCustomAmountChange(m.id, e.target.value)}
                              className="w-16 px-1.5 py-0.5 text-right text-xs rounded border border-[#2A2421] bg-white font-black text-[#2A2421] outline-none disabled:bg-slate-100 disabled:border-gray-200"
                            />
                          </div>
                        ) : (
                          // Show theoretical share in equal split mode
                          checked && (
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-bold">
                              ${Math.round((Number(amount) || 0) / (splitWith.length || 1))}
                            </span>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Receipt Image upload & Camera */}
              <div className="border border-[#2A2421] rounded-xl bg-white p-2.5">
                <span className="block text-[10px] font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                  📸 發票/收據明細 (非必填，平常收折點開看大圖)
                </span>
                
                {invoiceImg ? (
                  <div className="flex items-center gap-3 bg-green-50/50 p-2 rounded-lg border border-green-200">
                    <div className="relative group/thumb shrink-0 w-12 h-12 rounded-md border border-[#2A2421] overflow-hidden bg-white shadow-xs">
                      <img 
                        src={invoiceImg} 
                        alt="invoice preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setInvoiceImg('')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white text-[10px] uppercase font-black transition-opacity"
                        title="重設/刪除圖片"
                      >
                        刪除
                      </button>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-gray-700 truncate">發票已存入並自動高壓節省空間</p>
                      <p className="text-[9px] text-[#8FAD83] font-bold">適合輕量化儲存，文字依然清晰</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setInvoiceImg('')}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : isCompressingImg ? (
                  <div className="flex items-center justify-center gap-2 py-3 bg-[#FCF9F2] border border-dashed border-[#A05C33] rounded-lg text-xs font-bold text-[#A05C33]">
                    <span className="animate-spin text-sm">⏳</span>
                    <span>正在進行高壓圖片壓縮處理...</span>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center py-3 bg-slate-50 border-2 border-dashed border-gray-300 rounded-lg hover:bg-slate-100 hover:border-gray-400 transition-all cursor-pointer active:scale-98 select-none">
                    <div className="flex items-center gap-1.5 text-slate-500 hover:text-black">
                      <Camera className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-extrabold text-slate-600">拍攝照片 / 上傳發票收據</span>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-0.5 font-bold">支援相機拍照或圖庫上傳。文字清晰好辨識</span>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsCompressingImg(true);
                            // Compress with balanced receipt reading dimensions (max width/height 640px range)
                            const base64Str = await compressImageFile(file, 640, 640, 0.75);
                            setInvoiceImg(base64Str);
                          } catch (err) {
                            console.error(err);
                            alert('圖片處理失敗！請嘗試其他照片格式。');
                          } finally {
                            setIsCompressingImg(false);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-1.5 bg-gray-200 hover:bg-gray-300 border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#DFA775] hover:bg-[#d2945d] border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  確認登入
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Mini Repayment Registry Form Modal (A欠B大額，但B先收局部款項) */}
      {repayFormState.show && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#FCF9F2] border-2 border-[#2A2421] rounded-2xl p-5 max-w-sm w-full shadow-[3px_3px_0px_0px_#2A2421]"
          >
            <h3 className="text-base font-black text-[#2A2421] mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-4.5 h-4.5 text-emerald-600" />
              <span>進行小額/整筆還款</span>
            </h3>
            
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed font-semibold">
              支持單筆/部分還清，例如 A 總共欠 B 12,000，但想先還 6,000，可在此直接輸入 6,000，剩餘 of 6,000 將會正確留在帳目上！
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                  📅 還款日期
                </label>
                <input 
                  type="date"
                  value={repayFormState.date || todayStr}
                  onChange={(e) => setRepayFormState(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-black outline-none mb-2"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                  💰 還款金額數位輸入 (台幣)
                </label>
                <input 
                  type="number"
                  value={repayFormState.customAmount}
                  onChange={(e) => setRepayFormState(prev => ({ ...prev, customAmount: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-black outline-none"
                />
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setRepayFormState(prev => ({ ...prev, customAmount: String(prev.suggestedAmount) }))}
                  className="px-2 py-1 bg-blue-50 border border-blue-400 text-blue-700 text-[10px] font-black rounded-lg"
                >
                  填入建議額 (${repayFormState.suggestedAmount})
                </button>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  onClick={() => setRepayFormState(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-1.5 bg-gray-200 border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  關閉
                </button>
                <button
                  onClick={submitRepaymentRecord}
                  className="flex-1 py-1.5 bg-[#DFA775] border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  確認登記
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Invoice Image Lightbox Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-lg w-full bg-[#FCF9F2] p-2 border-2 border-[#2A2421] rounded-2xl shadow-[4px_4px_0px_0px_#2A2421]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setLightboxImg(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 border-[#2A2421] bg-[#CCA090] text-xs font-black text-[#2A2421] flex items-center justify-center shadow-[1px_1px_0px_0px_#2A2421] hover:bg-[#B38879] active:translate-y-0.5 transition-all"
            >
              ✕
            </button>
            <div className="rounded-xl overflow-hidden bg-white border border-[#2A2421] max-h-[85vh] flex flex-col justify-center items-center">
              <img 
                src={lightboxImg} 
                alt="Enlarged full invoice receipt" 
                className="w-full h-auto max-h-[72vh] object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="w-full py-2.5 px-3 bg-[#FCF9F2] border-t border-[#2A2421] flex justify-between items-center text-[10px] font-black text-[#2A2421] shrink-0">
                <span>🔍 提示：長按或右鍵可儲存發票照片紀錄</span>
                <button
                  onClick={() => setLightboxImg(null)}
                  className="px-2.5 py-1 bg-white border border-[#2A2421] rounded-lg shadow-[1px_1px_0px_0px_#2A2421] font-bold text-[10px] active:translate-y-0.5 transition-all"
                >
                  關閉大圖
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
}
