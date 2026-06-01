/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useCompany } from './CompanyContext';
import { getExpenseMemberShare } from '../types';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart2, 
  Users, 
  Activity, 
  DollarSign,
  Briefcase
} from 'lucide-react';
import { motion } from 'motion/react';
import { CATEGORIES } from '../utils/image';

export default function FinancialReports() {
  const { members, expenses, repayments } = useCompany();
  
  // Extract all unique months (YYYY-MM style) from expenses and repayments
  const availableMonths = Array.from(new Set([
    ...expenses.map(e => e.date?.substring(0, 7)),
    ...repayments.map(r => r.date?.substring(0, 7))
  ]))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a)); // Newest month first

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  // Merge current month and sorted months
  const monthsSet = new Set([currentMonthStr, ...availableMonths]);
  const monthsList = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return currentMonthStr;
  });

  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    return members[0]?.id || '';
  });

  // Make sure selected member is updated if members list changes and default was empty
  const activeMemberId = selectedMemberId || (members[0]?.id || '');

  // Filtered lists based on selectedMonth
  const filteredExpenses = selectedMonth === 'all'
    ? expenses
    : expenses.filter(e => e.date?.startsWith(selectedMonth));

  const filteredRepayments = selectedMonth === 'all'
    ? repayments
    : repayments.filter(r => r.date?.startsWith(selectedMonth));

  // 1. Calculate Group Spending Category Totals for Bar Chart
  const categoryTotals: Record<string, number> = {};
  CATEGORIES.forEach(c => { categoryTotals[c.name] = 0; });
  let totalCompanySpent = 0;

  filteredExpenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    const cat = exp.category || '其他';
    totalCompanySpent += amt;
    if (categoryTotals[cat] !== undefined) {
      categoryTotals[cat] += amt;
    } else {
      categoryTotals[cat] = amt;
    }
  });

  const barChartData = Object.entries(categoryTotals).map(([name, amount]) => {
    const origCat = CATEGORIES.find(c => c.name === name);
    return {
      name,
      '總金額': amount,
      color: origCat ? getHexColorForTailwind(origCat.color) : '#94a3b8'
    };
  }).filter(item => item['總金額'] > 0);

  // 2. Calculate Personal Spending Category Breakdown for Pie Chart
  // Person's spending is determined by their splits. If a bill is split, their share is amount / splitLength
  const personalCategoryTotals: Record<string, number> = {};
  CATEGORIES.forEach(c => { personalCategoryTotals[c.name] = 0; });
  let totalPersonalShare = 0;

  filteredExpenses.forEach(exp => {
    const share = getExpenseMemberShare(exp, activeMemberId);
    if (share > 0) {
      const cat = exp.category || '其他';
      totalPersonalShare += share;
      if (personalCategoryTotals[cat] !== undefined) {
        personalCategoryTotals[cat] += share;
      }
    }
  });

  const pieChartData = Object.entries(personalCategoryTotals).map(([name, amount]) => {
    return {
      name,
      value: Math.round(amount * 100) / 100
    };
  }).filter(item => item.value > 0);

  // Recharts Pie Colors
  const COLORS = ['#DFA775', '#A3B19B', '#CCA090', '#AAC4D1', '#D2B48C', '#D8C3A5', '#8E8D8A'];

  // Hex color extractors
  function getHexColorForTailwind(twClass: string) {
    if (twClass.includes('orange-100')) return '#FF9F43';
    if (twClass.includes('blue-100')) return '#54A0FF';
    if (twClass.includes('green-100')) return '#1DD1A1';
    if (twClass.includes('amber-100')) return '#FECA57';
    if (twClass.includes('purple-100')) return '#5F27CD';
    if (twClass.includes('rose-100')) return '#FF6B6B';
    return '#8395A7';
  }

  // 3. Calculate Reimbursement Progress Bar list (還款進度條總表)
  // We calculate standard debts base, any repayments paid between them reduces it.
  // Debtors and Creditors relationship computation:
  const getReimbursementProgressList = () => {
    // Cumulative expenses and repayments up to and including the selected month
    const cumulativeExpenses = selectedMonth === 'all'
      ? expenses
      : expenses.filter(e => {
          if (!e.date) return false;
          const m = e.date.substring(0, 7);
          return m <= selectedMonth;
        });

    const cumulativeRepayments = selectedMonth === 'all'
      ? repayments
      : repayments.filter(r => {
          if (!r.date) return false;
          const m = r.date.substring(0, 7);
          return m <= selectedMonth;
        });

    // A owes B dynamic ledger
    // First, let's find raw debt relationships based on cumulative expenses:
    // Raw balance = (Total money paid by member directly) - (Total shares they share)
    const netExpenses: Record<string, number> = {};
    members.forEach(m => { netExpenses[m.id] = 0; });

    cumulativeExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      netExpenses[exp.payerId] += amt;

      members.forEach(m => {
        const share = getExpenseMemberShare(exp, m.id);
        netExpenses[m.id] -= share;
      });
    });

    // Run greedy match to find raw debt connections prior to repayments
    const rawDebtors = Object.entries(netExpenses)
      .map(([id, bal]) => ({ id, bal }))
      .filter(x => x.bal < -0.05)
      .map(x => ({ id: x.id, amount: Math.abs(x.bal) }))
      .sort((a, b) => b.amount - a.amount);

    const rawCreditors = Object.entries(netExpenses)
      .map(([id, bal]) => ({ id, bal }))
      .filter(x => x.bal > 0.05)
      .map(x => ({ id: x.id, amount: x.bal }))
      .sort((a, b) => b.amount - a.amount);

    const rawDebts: { fromId: string; toId: string; initialOwed: number }[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < rawDebtors.length && cIdx < rawCreditors.length) {
      const dbtr = rawDebtors[dIdx];
      const crdtr = rawCreditors[cIdx];
      const match = Math.min(dbtr.amount, crdtr.amount);
      if (match > 0.05) {
        rawDebts.push({
          fromId: dbtr.id,
          toId: crdtr.id,
          initialOwed: Math.round(match * 100) / 100
        });
      }
      dbtr.amount -= match;
      crdtr.amount -= match;
      if (dbtr.amount <= 0.05) dIdx++;
      if (crdtr.amount <= 0.05) cIdx++;
    }

    // Now, let's map each raw connection against active repayments logged between them!
    return rawDebts.map(raw => {
      // Find payments from raw.fromId to raw.toId from cumulative list
      const matchedRepayments = cumulativeRepayments.filter(rep => 
        rep.fromMemberId === raw.fromId && 
        rep.toMemberId === raw.toId &&
        (rep.status === 'active' || rep.status === 'cleared')
      );

      // Separate into previous months and current month
      const prevRepayments = matchedRepayments.filter(rep => {
        if (selectedMonth === 'all') return false;
        if (!rep.date) return false;
        return rep.date.substring(0, 7) < selectedMonth;
      });

      const currentMonthRepayments = matchedRepayments.filter(rep => {
        if (selectedMonth === 'all') return true;
        if (!rep.date) return false;
        return rep.date.substring(0, 7) === selectedMonth;
      });

      const prevRepaidAmount = prevRepayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
      const currentPeriodRepaidAmount = currentMonthRepayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      const totalRepaid = prevRepaidAmount + currentPeriodRepaidAmount;

      // June denominator = June cumulative debts (raw.initialOwed) - May payments (prevRepaidAmount)
      const visibleInitialOwed = Math.max(0, raw.initialOwed - prevRepaidAmount);
      const currentOwed = raw.initialOwed - totalRepaid;

      const progressPct = visibleInitialOwed > 0 
        ? Math.round((currentPeriodRepaidAmount / visibleInitialOwed) * 100) 
        : 0;

      return {
        fromId: raw.fromId,
        toId: raw.toId,
        initialOwed: visibleInitialOwed,
        repaid: currentPeriodRepaidAmount,
        currentOwed: currentOwed,
        progressPct: progressPct
      };
    });
  };

  const progressList = getReimbursementProgressList();

  const selectedMemberObj = members.find(m => m.id === activeMemberId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      {/* Month Filter Selector Card */}
      <div className="bg-white p-4 rounded-2xl border-2 border-[#2A2421] shadow-[3px_3px_0px_0px_#2A2421] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-[#2A2421] flex items-center gap-1.5">
            <span className="text-lg">📅</span>
            <span>報表月份切換</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">
            可點選或選擇切換不同月份，查看該月份之開銷細目、個人分攤與還款理賠進度。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-black rounded-xl border-2 border-[#2A2421] bg-[#FCF9F2] text-[#2A2421] outline-none cursor-pointer"
          >
            <option value="all">🌐 顯示全部月份 (不限)</option>
            {monthsList.map(m => {
              const [year, month] = m.split('-');
              return (
                <option key={m} value={m}>
                  📅 {year}年 {month}月
                </option>
              );
            })}
          </select>
          {selectedMonth !== 'all' && (
            <button
              onClick={() => setSelectedMonth('all')}
              className="px-2.5 py-1.5 text-[10px] bg-[#CCA090] hover:bg-[#B38879] border border-[#2A2421] rounded-lg font-black text-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421] transition-all cursor-pointer"
            >
              重設 (全部)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: General Bar Charts & Reimbursements Progression (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Group General Bar Chart (總表長條圖) */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421]">
            <h3 className="text-base font-black text-[#2A2421] mb-1.5 flex items-center gap-1.5">
              <BarChart2 className="w-4.5 h-4.5 text-indigo-500" />
              <span>全會社開銷總表 (長條圖)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mb-3 font-bold">
              {selectedMonth === 'all' ? '歷史累計總支出：' : `${selectedMonth.split('-')[1]}月份累計總支出：`}${totalCompanySpent.toLocaleString()} 元。呈現選定期間內各項目的花用比重。
            </p>
 
            <div className="h-[240px] w-full">
              {barChartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <span className="text-3xl">📊</span>
                  <p className="text-xs mt-2 font-bold">選定月份尚無任何記帳數據，無法產生統計圖。</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#2A2421" fontSize={11} fontWeight="bold" />
                    <YAxis stroke="#2A2421" fontSize={11} fontWeight="bold" />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="總金額" radius={[6, 6, 0, 0]} maxBarSize={35}>
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#2A2421" strokeWidth={1.5} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
 
          {/* Reimbursement Progress bar total lists (還款進度條總表) */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421]">
            <h3 className="text-base font-black text-[#2A2421] mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-4.5 h-4.5 text-pink-500" />
              <span>還款進度條總表</span>
            </h3>
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed font-semibold">
              真實呈現各成員還款狀況。當還款金額送出登記後，進度條同步更新；<b>全部繳清後即結算寫 0，溢繳則會顯示溢繳金額與超出 100% 的進度！</b>
            </p>
 
            <div className="space-y-3">
              {progressList.length === 0 ? (
                <div className="text-center py-5 text-gray-300 font-bold text-xs border border-dashed border-gray-100 rounded-xl">
                  此月份暫時沒有需要結算的債務關係 🕊️
                </div>
              ) : (
                progressList.map((prog, idx) => {
                  const fromU = members.find(m => m.id === prog.fromId);
                  const toU = members.find(m => m.id === prog.toId);
 
                  return (
                    <div 
                      key={`progress-${idx}`} 
                      className="border border-[#2A2421] rounded-xl p-3 bg-[#FDFBF7] shadow-[1px_1px_0px_0px_#2A2421]"
                    >
                      <div className="flex justify-between items-center text-[11px] font-black mb-1.5 text-[#2A2421]">
                        <div className="flex items-center gap-1">
                          <span>👤 {fromU?.name || '未知'}</span>
                          <span className="text-slate-400 font-bold">尚欠</span>
                          <span>👤 {toU?.name || '未知'}</span>
                        </div>
                        <div>
                          {prog.currentOwed < -0.5 ? (
                            <span className="text-blue-600 font-extrabold bg-blue-50 px-1.5 py-0.5 border border-blue-200 rounded-md">
                              💰 溢繳：${Math.round(Math.abs(prog.currentOwed)).toLocaleString()} 元
                            </span>
                          ) : prog.currentOwed <= 0.5 ? (
                            <span className="text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 rounded-md">
                              🎉 結清：0 元
                            </span>
                          ) : (
                            <span>
                              剩餘：<b className="text-[#2A2421] font-black">${Math.round(prog.currentOwed).toLocaleString()}</b> / ${Math.round(prog.initialOwed).toLocaleString()} 
                            </span>
                          )}
                        </div>
                      </div>
 
                      {/* Cute Progress bar grid */}
                      <div className="w-full bg-slate-100 border border-[#2A2421] h-3 rounded-full overflow-hidden flex">
                        <div 
                          className={`${
                            prog.progressPct > 100 ? 'bg-[#AAC4D1]' : 'bg-[#A3B19B]'
                          } border-r border-[#2A2421] h-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, prog.progressPct)}%` }}
                        ></div>
                      </div>
 
                      <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-400 font-extrabold">
                        <span>已還理賠: ${Math.round(prog.repaid).toLocaleString()} 元</span>
                        <span>
                          完成百分比:{' '}
                          <span className={prog.progressPct > 100 ? "text-blue-600 font-black" : "text-slate-500"}>
                            {prog.progressPct}%
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Personal Spending PIE charts with easy selectors (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-[#FCF9F2] p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421] h-full flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-[#2A2421] mb-1.5 flex items-center gap-1.5">
                <PieIcon className="w-4.5 h-4.5 text-amber-500" />
                <span>個人開銷種類佔比 (圓餅圖)</span>
              </h3>
              
              {/* Member Toggle select scroll */}
              <div className="flex gap-1 overflow-x-auto pb-2 pt-0.5 scrollbar-none">
                {members.map(m => (
                  <button
                    key={`pie-toggle-${m.id}`}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`px-2.5 py-1 rounded-lg border font-black text-xs transition-all whitespace-nowrap cursor-pointer
                      ${activeMemberId === m.id
                        ? 'bg-[#DFA775] border-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421]'
                        : 'bg-white border-transparent hover:border-gray-200'
                      }
                    `}
                  >
                    <span>{m.avatarUrl}</span>
                    <span className="ml-1 z-10">{m.name}</span>
                  </button>
                ))}
              </div>

              {selectedMemberObj && (
                <div className="my-1.5 p-2.5 bg-white border border-[#2A2421] rounded-xl flex items-center gap-2.5">
                  <span className="text-2xl">{selectedMemberObj.avatarUrl}</span>
                  <div>
                    <h4 className="font-extrabold text-[10px] text-slate-400 leading-none">目前檢視成員</h4>
                    <span className="font-black text-xs text-[#2A2421] mt-0.5 block">
                      {selectedMemberObj.name} (身份：{selectedMemberObj.roleGroup || '普通'})
                    </span>
                  </div>
                </div>
              )}

              {/* Pie Chart Display block */}
              <div className="h-[210px] w-full flex items-center justify-center mt-4">
                {pieChartData.length === 0 ? (
                  <div className="text-center text-gray-400 py-10">
                    <span className="text-3xl">🥣</span>
                    <p className="text-xs font-bold mt-2">該成員在本月暫無相關待分攤費用</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            stroke="#2A2421" 
                            strokeWidth={1.5} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Custom Legend list mapping */}
            {pieChartData.length > 0 && (
              <div className="bg-white border border-[#2A2421] rounded-xl p-3 mt-3 space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 block uppercase">
                  費用分配種類比例
                </span>
                <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto">
                  {pieChartData.map((data, index) => {
                    const percent = Math.round((data.value / totalPersonalShare) * 100);
                    return (
                      <div key={`legend-${index}`} className="flex items-center gap-1.5 text-xs font-extrabold text-gray-700">
                        <span 
                          className="w-2.5 h-2.5 rounded-full border border-[#2A2421] inline-block shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></span>
                        <span className="truncate">{data.name}</span>
                        <span className="text-gray-400 text-[9px] font-mono">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </motion.div>
  );
}
