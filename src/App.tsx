/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CompanyProvider, useCompany } from './components/CompanyContext';
import CompanyBulletin from './components/CompanyBulletin';
import AccountingCounter from './components/AccountingCounter';
import FinancialReports from './components/FinancialReports';
import TeammateProfiles from './components/TeammateProfiles';
import { 
  Plus, 
  DoorOpen, 
  Copy, 
  Check, 
  Sparkles, 
  Calendar, 
  Receipt, 
  PieChart as ChartIcon, 
  Users, 
  LogOut,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function LedgerAppContent() {
  const { 
    company, 
    members, 
    myMemberId, 
    setMyMemberId, 
    joinCompany, 
    createNewCompany, 
    upsertMember,
    isLoading, 
    errorMsg 
  } = useCompany();

  // Navigation panel: 'bulletin' | 'counter' | 'reports' | 'members'
  const [activeTab, setActiveTab] = useState<'bulletin' | 'counter' | 'reports' | 'members'>('bulletin');

  // Input fields for landing flow
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [isCreatingMode, setIsCreatingMode] = useState(false);

  // New teammate creation flow when inside a company with unlinked identity
  const [newTeammateName, setNewTeammateName] = useState('');
  const [newTeammateAvatar, setNewTeammateAvatar] = useState('🐹');
  const [newTeammateRole, setNewTeammateRole] = useState('一般');

  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    if (!company?.id) return;
    navigator.clipboard.writeText(company.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    await joinCompany(joinCodeInput);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createNewCompany(newCompanyName, newCompanyCode);
    if (success) {
      // Create first member automatically so the company is not empty
      const generatedId = `MEM-${Date.now()}`;
      await upsertMember(generatedId, "創始隊長", "🐯", "營運", "");
      setMyMemberId(generatedId);
    }
  };

  const handleQuickRegisterTeammate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeammateName.trim()) return;
    const generatedId = `MEM-${Date.now()}`;
    await upsertMember(generatedId, newTeammateName.trim(), newTeammateAvatar, newTeammateRole, "");
    setMyMemberId(generatedId);
  };

  // 🔌 GATED SCREEN 1: No company loaded yet (Landing Screen)
  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F5EE]">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-[#FCF9F2] border-2 border-[#2A2421] rounded-[24px] p-5 shadow-[4px_4px_0px_0px_#2A2421]"
        >
          {/* Whimsical branding head */}
          <div className="text-center space-y-2 mb-6">
            <img
              src="/logo2.PNG"
              alt="咘咘株式會社"
              className="w-16 h-16 object-contain inline-block animate-bounce"
            />
            <h1 className="text-2xl font-black text-[#2A2421] tracking-tight">咘咘株式會社</h1>
            <p className="text-xs text-amber-900 font-bold max-w-[280px] mx-auto leading-relaxed">
              歡迎來到咘咘株式會社，一鍵共享，雲端即時同步！
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 text-xs font-bold p-3 rounded-2xl mb-4 text-center">
              🧋 {errorMsg}
            </div>
          )}

          {/* Form panels switching create vs join */}
          <AnimatePresence mode="wait">
            {!isCreatingMode ? (
              <motion.form 
                key="join-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleJoin} 
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-black text-amber-800 mb-1">
                      🔑 輸入朋友分享的「共享代碼 / Code」
                    </label>
                    <input 
                      type="text" 
                      placeholder="例如: BUBUCOMPANY"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      className="w-full px-3 py-2 border border-[#2A2421] rounded-xl bg-white text-center font-black placeholder-gray-300 text-[#2A2421] text-sm outline-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-[#DFA775] hover:bg-[#d2945d] active:translate-y-0.5 border border-[#2A2421] rounded-xl text-xs font-black text-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421] transition-all cursor-pointer"
                >
                  {isLoading ? '正在讀取雲端庫...' : '🚀 進入共享拆帳空間'}
                </button>

                <div className="relative flex py-0.5 items-center">
                  <div className="flex-grow border-t border-dashed border-gray-300"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-gray-400 font-bold">還沒有專屬代碼嗎？</span>
                  <div className="flex-grow border-t border-dashed border-gray-300"></div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingMode(true)}
                  className="w-full py-2 bg-white hover:bg-slate-50 border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421] transition-colors cursor-pointer"
                >
                  🆕 創立一間新會社代號
                </button>
              </motion.form>
            ) : (
              <motion.form 
                key="create-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleCreate} 
                className="space-y-4"
              >
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-black text-amber-800 mb-1">
                      🏨 會社/團隊名稱
                    </label>
                    <input 
                      type="text" 
                      placeholder="例如: 咘咘株式會社"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-[#2A2421] rounded-xl bg-white font-bold text-[#2A2421] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-amber-800 mb-1">
                      🔑 貼心約定共享 Code (大寫英文、數字)
                    </label>
                    <input 
                      type="text" 
                      placeholder="例如: CITRUS-TEAM2026"
                      value={newCompanyCode}
                      onChange={(e) => setNewCompanyCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 text-xs border border-[#2A2421] rounded-xl bg-white font-black text-[#2A2421] outline-none placeholder-gray-300"
                      required
                    />
                    <span className="text-[9px] text-gray-450 font-bold leading-tight block mt-0.5">
                      * 其他好朋友輸入此 Code 即可加入。僅限英文數字與中劃線！
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-[#A3B19B] hover:bg-[#8FAD83] border border-[#2A2421] rounded-xl text-xs font-black text-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421] transition-all cursor-pointer"
                >
                  {isLoading ? '正在配置雲端...' : '✨ 開創合辦拆帳會社'}
                </button>

                <button
                  type="button"
                  onClick={() => { setIsCreatingMode(false); }}
                  className="w-full py-2 text-xs font-bold text-gray-400 hover:text-[#2A2421] transition-colors"
                >
                  ⬅ 倒回「加入既有會社」
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // 🔌 GATED SCREEN 2: Company is selected, but device user identity is unlinked
  const currentMe = members.find(m => m.id === myMemberId);
  if (!myMemberId || !currentMe) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F5EE]">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-[#FCF9F2] border-2 border-[#2A2421] rounded-[24px] p-5 shadow-[4px_4px_0px_0px_#2A2421] space-y-4"
        >
          <div className="text-center space-y-0.5">
            <span className="text-3xl">🙋🏻‍♀️</span>
            <h2 className="text-base font-black text-[#2A2421]">確認您在本會社中的身份</h2>
            <p className="text-[11px] text-slate-400 font-bold">
              您已進入「<b>{company.name}</b>」。在拆帳記帳前，請幫我們選取或建立一張您的成員名片：
            </p>
          </div>

          {/* Option A: Map existing unlinked member tabs */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-amber-800">☝️ 開啟點擊選擇「我是名冊中的誰」</span>
              <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto p-0.5 scrollbar-none">
                {members.map(m => (
                  <button
                    key={`bind-me-${m.id}`}
                    onClick={() => setMyMemberId(m.id)}
                    className="flex items-center gap-1.5 p-1.5 bg-white hover:bg-blue-50 border border-[#2A2421] rounded-lg text-left active:scale-95 transition-all text-xs font-black"
                  >
                    <span>{m.avatarUrl}</span>
                    <span className="truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Option B: Quick Register a new card */}
          <form onSubmit={handleQuickRegisterTeammate} className="border-t border-dashed border-gray-200 pt-3 space-y-2">
            <span className="text-[11px] font-black text-amber-800 block">🆕 名冊內沒有我？在此快注一張新卡：</span>
            
            <div className="flex gap-1.5">
              <input 
                type="text"
                placeholder="輸入您的暱稱"
                value={newTeammateName}
                onChange={(e) => setNewTeammateName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-[#2A2421] rounded-lg bg-white text-xs font-bold outline-none"
                required
              />
              <select
                value={newTeammateRole}
                onChange={(e) => setNewTeammateRole(e.target.value)}
                className="px-1.5 py-1.5 border border-[#2A2421] bg-white rounded-lg text-xs font-bold outline-none text-[#2A2421]"
              >
                <option value="貴賓">貴賓</option>
                <option value="財務">財務</option>
                <option value="營運長">營運長</option>
                <option value="股東">股東</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-1.5 bg-[#CCA090] hover:bg-[#B38879] border border-[#2A2421] rounded-lg text-xs font-black text-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421] transition-all cursor-pointer"
            >
              🎉 加入並自動選我
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => {
                localStorage.removeItem('g_code_session');
                localStorage.setItem('g_is_logged_out', 'true');
                window.location.reload();
              }}
              className="text-xs font-bold text-gray-400 hover:text-red-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>退出此會社代號，返回大廳</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 💎 STAGE 3: Main dashboard shell view
  return (
    <div className="min-h-screen pb-20 bg-[#F8F5EE]">
      
      {/* Upper Cozy Navbar banner (頂部小看版) */}
      <header className="bg-[#FCF9F2] border-b border-[#2A2421] sticky top-0 z-30 px-4 py-2.5 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-2">
          
          <div className="flex items-center gap-1.5">
           <img
              src="/logo.png"
              alt="咘咘株式會社"
              className="w-10 h-10 rounded-full object-cover"
            />
            
            <div>
              <h1 className="text-xs font-black text-[#2A2421] leading-tight flex items-center gap-1">
                <span>{company.name}</span>
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] bg-[#DFA775] border border-[#2A2421] px-1 py-0.5 rounded font-extrabold text-[#2A2421]">
                  G-Code: {company.id}
                </span>
                <button 
                  onClick={handleCopyCode}
                  className="p-0.5 hover:bg-slate-100 rounded transition-colors"
                  title="複製共享代碼"
                >
                  {copiedCode ? <Check className="w-2.5 h-2.5 text-green-600" /> : <Copy className="w-2.5 h-2.5 text-slate-400" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <span className="text-[9px] text-gray-400 font-bold block">CURRENT IDENTITY</span>
              <span className="text-[11px] font-black text-[#2A2421]">
                {currentMe.avatarUrl} {currentMe.name} ({currentMe.roleGroup})
              </span>
            </div>
            
            <button
              onClick={() => {
                if (confirm("確認要移出或登出此分帳空間嗎？")) {
                  localStorage.removeItem('g_code_session');
                  localStorage.removeItem('g_member_session');
                  localStorage.setItem('g_is_logged_out', 'true');
                  window.location.reload();
                }
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-gray-200 bg-white transition-colors cursor-pointer"
              title="登出並更換團隊/公司"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Primary dynamic screen core mapping */}
      <main className="max-w-4xl mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'bulletin' && <CompanyBulletin key="bulletin-tab" />}
          {activeTab === 'counter' && <AccountingCounter key="counter-tab" />}
          {activeTab === 'reports' && <FinancialReports key="reports-tab" />}
          {activeTab === 'members' && <TeammateProfiles key="members-tab" />}
        </AnimatePresence>
      </main>

      {/* Gorgeous Responsive Bottom Nav Deck Dock, satisfying requested phone view interfaces (底部導覽按鈕) */}
      <div
        className="fixed inset-x-0 bottom-0 bg-[#FCF9F2] border-t border-[#2A2421] px-4 z-40 shadow-md"
        style={{  paddingBottom: 'max(8px, env(safe-area-inset-bottom))   }} >
        <div className="max-w-md mx-auto flex justify-between items-center">
          
          <button
            onClick={() => setActiveTab('bulletin')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black transition-all cursor-pointer
              ${activeTab === 'bulletin' ? 'text-[#A05C33] scale-102 font-bold' : 'text-slate-400 hover:text-[#2A2421]'}
            `}
          >
            <div className={`p-1.5 rounded-full border transition-all
              ${activeTab === 'bulletin' ? 'bg-[#DFA775] border-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421]' : 'bg-transparent border-transparent'}
            `}>
              <Calendar className="w-4 h-4" />
            </div>
            <span>會社公布欄</span>
          </button>

          <button
            onClick={() => setActiveTab('counter')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black transition-all cursor-pointer
              ${activeTab === 'counter' ? 'text-[#3B5446] scale-102 font-bold' : 'text-slate-400 hover:text-[#2A2421]'}
            `}
          >
            <div className={`p-1.5 rounded-full border transition-all
              ${activeTab === 'counter' ? 'bg-[#A3B19B] border-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421]' : 'bg-transparent border-transparent'}
            `}>
              <Receipt className="w-4 h-4" />
            </div>
            <span>會計櫃檯</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black transition-all cursor-pointer
              ${activeTab === 'reports' ? 'text-[#4F6C7D] scale-102 font-bold' : 'text-slate-400 hover:text-[#2A2421]'}
            `}
          >
            <div className={`p-1.5 rounded-full border transition-all
              ${activeTab === 'reports' ? 'bg-[#AAC4D1] border-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421]' : 'bg-transparent border-transparent'}
            `}>
              <ChartIcon className="w-4 h-4" />
            </div>
            <span>財務報表</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-black transition-all cursor-pointer
              ${activeTab === 'members' ? 'text-[#824F3F] scale-102 font-bold' : 'text-slate-400 hover:text-[#2A2421]'}
            `}
          >
            <div className={`p-1.5 rounded-full border transition-all
              ${activeTab === 'members' ? 'bg-[#CCA090] border-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421]' : 'bg-transparent border-transparent'}
            `}>
              <Users className="w-4 h-4" />
            </div>
            <span>公司成員</span>
          </button>

        </div>
      </div>

    </div>
  );
}

export default function App() {
  return (
    <CompanyProvider>
      <LedgerAppContent />
    </CompanyProvider>
  );
}
