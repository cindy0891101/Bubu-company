/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useCompany } from './CompanyContext';
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  FolderLock, 
  Check, 
  Link2,
  ExternalLink,
  Shield,
  Phone,
  Settings,
  HelpCircle,
  UploadCloud
} from 'lucide-react';
import { motion } from 'motion/react';
import { compressImageFile, PRESET_AVATARS, DEPARTMENTS } from '../utils/image';

export default function TeammateProfiles() {
  const { 
    company, 
    members, 
    myMemberId, 
    setMyMemberId, 
    upsertMember, 
    deleteMember, 
    updateDriveLink 
  } = useCompany();

  // Create member form toggles
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('🐱');
  const [roleGroup, setRoleGroup] = useState('一般');
  const [linePayInfo, setLinePayInfo] = useState('');
  const [imgUploading, setImgUploading] = useState(false);

  // Cloud Drive link fields
  const [driveUrl, setDriveUrl] = useState(company?.driveUrl || '');
  const [isUpdatingDrive, setIsUpdatingDrive] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImgUploading(true);
    try {
      // Auto downscale as requested: "上傳照片後自動減小照片大小"
      const base64Str = await compressImageFile(file, 100, 100, 0.7);
      setAvatarUrl(base64Str);
    } catch (err) {
      console.error("Downscale image failed:", err);
      alert("照片處理失敗，請換一張大小適中、常見格式的照片試試！");
    } finally {
      setImgUploading(false);
    }
  };

  const handleOpenAdd = () => {
    setName('');
    setAvatarUrl('🐶');
    setRoleGroup('一般');
    setLinePayInfo('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (m: any) => {
    setEditingId(m.id);
    setName(m.name);
    setAvatarUrl(m.avatarUrl || '👤');
    setRoleGroup(m.roleGroup || '一般');
    setLinePayInfo(m.linePayInfo || '');
    setShowEditModal(true);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const generatedId = `MEM-${Date.now()}`;
      await upsertMember(generatedId, name, avatarUrl, roleGroup, linePayInfo);
      
      // Auto bind as me if there is no active member bound
      if (!myMemberId) {
        setMyMemberId(generatedId);
      }
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editingId) return;

    try {
      await upsertMember(editingId, name, avatarUrl, roleGroup, linePayInfo);
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const saveDriveLink = async () => {
    setIsUpdatingDrive(true);
    try {
      await updateDriveLink(driveUrl.trim());
      alert("共享雲端硬碟連結更新成功！成員皆可隨時連入。");
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingDrive(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Grid: Members Roster List mapping (8 columns) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center bg-white px-3.5 py-2.5 rounded-xl border border-[#2A2421]">
            <div>
              <h3 className="text-sm font-black text-[#2A2421]">會社會員名冊</h3>
              <p className="text-[9px] text-gray-400 font-bold">目前公司共有 {members.length} 名合作夥伴</p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#A3B19B] hover:bg-[#8FAD83] border border-[#2A2421] rounded-lg text-xs font-black shadow-[1px_1px_0px_0px_#2A2421] text-[#2A2421] active:translate-y-0.5 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>招募隊員</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map(m => {
              const isMe = myMemberId === m.id;
              
              // Get custom styling color based on department
              let deptColor = "bg-gray-100 border-gray-300 text-gray-600";
              if (m.roleGroup === "財務") deptColor = "bg-amber-100 border-amber-300 text-amber-700 font-black";
              if (m.roleGroup === "營運") deptColor = "bg-emerald-100 border-emerald-300 text-emerald-700 font-black";
              if (m.roleGroup === "股東") deptColor = "bg-rose-100 border-rose-300 text-rose-700 font-black";
              if (m.roleGroup === "貴賓") deptColor = "bg-sky-100 border-sky-300 text-sky-700 font-black";

              return (
                <div 
                   key={m.id}
                   className={`relative border border-[#2A2421] rounded-2xl p-3.5 bg-[#FDFBF7] shadow-[1.5px_1.5px_0px_0px_#2A2421] transition-all flex justify-between items-start
                     ${isMe ? 'ring-2 ring-blue-400' : ''}
                   `}
                >
                  <div className="flex items-center gap-3">
                    {/* Visual Avatar frame (大頭貼圖框) */}
                    <div className="w-10 h-10 rounded-full border border-[#2A2421] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-[1px_1px_0px_0px_#2A2421]">
                      {m.avatarUrl?.startsWith('data:image') ? (
                        <img 
                          src={m.avatarUrl} 
                          alt={m.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-2xl">{m.avatarUrl || '👤'}</span>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#2A2421] text-base">{m.name}</span>
                        {isMe && (
                          <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-300">
                            我本人 🙋🏻
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border ${deptColor}`}>
                          🏬 {m.roleGroup || '普通'}
                        </span>
                        {m.linePayInfo && (
                          <span className="text-[9px] bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-semibold">
                            <Phone className="w-2.5 h-2.5" />
                            {m.linePayInfo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1 px-1.5 hover:bg-slate-100 border border-transparent hover:border-slate-300 rounded-lg text-slate-500 hover:text-black text-xs font-bold transition-all"
                      title="編輯成員"
                    >
                      <Edit3 className="w-3.5 h-3.5 inline mr-0.5" /> 編輯名字
                    </button>
                    
                    {!isMe ? (
                      <button
                        onClick={() => setMyMemberId(m.id)}
                        className="p-1 px-1.5 bg-blue-50 border border-blue-300 text-blue-700 text-[10px] font-black rounded-lg transition-all"
                      >
                        切換為我
                      </button>
                    ) : (
                      <button
                        onClick={() => setMyMemberId(null)}
                        className="p-1 px-1.5 bg-gray-50 border border-gray-300 text-gray-500 text-[10px] font-bold rounded-lg transition-all"
                      >
                        登出本人
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`確定要將 ${m.name} 移出本公司嗎？這可能會使對應帳目和分攤失去記錄。`)) {
                          deleteMember(m.id);
                        }
                      }}
                      className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg justify-end flex items-center"
                      title="移出成員"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Grid: Cloud Drive Directory Area (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#FFF9E6] p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421] space-y-3">
            <div className="flex items-center gap-1.5">
              <FolderLock className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-[#2A2421]">會社聯名儲存櫃</h3>
            </div>
            
            <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
              點對點對接雲端硬碟 (例如 Google Drive, Notion) 連結，用作儲存大夥的出遊合照、支出收據快遞、或合營資料檔案。
            </p>

            {/* Google Drive click helper */}
            {company?.driveUrl ? (
              <a 
                href={company.driveUrl.startsWith('http') ? company.driveUrl : `https://${company.driveUrl}`}
                target="_blank" 
                rel="noreferrer"
                className="block text-center p-4 bg-white border border-[#2A2421] rounded-xl hover:bg-amber-50 shadow-[1px_1px_0px_0px_#2A2421] active:translate-y-0.5 transition-all cursor-pointer group no-underline"
              >
                <span className="text-3xl block group-hover:scale-110 transition-transform">📂</span>
                <span className="font-black text-xs text-[#2A2421] mt-1.5 block flex items-center justify-center gap-0.5 group-hover:text-amber-600">
                  開啟雲端共享硬碟 <ExternalLink className="w-3 h-3 inline" />
                </span>
                <span className="text-[9px] text-gray-400 font-mono truncate block mt-0.5">
                  {company.driveUrl}
                </span>
              </a>
            ) : (
              <div className="p-3 bg-white border border-dashed border-[#2A2421] rounded-xl text-center text-gray-400 text-xs font-bold">
                ⚠️ 目前尚未設定雲端連結。請在下方輸入網址以完成對接！
              </div>
            )}

            {/* Cloud Drive URL Link updater form */}
            <div className="space-y-1.5 pt-2 border-t border-amber-200">
              <label className="block text-[10px] font-bold text-gray-500">
                🔗 設定共享雲端連結
              </label>
              <div className="flex gap-1.5">
                <input 
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-[#2A2421] rounded-lg text-xs font-bold text-[#2A2421] outline-none placeholder-gray-300"
                />
                <button
                  onClick={saveDriveLink}
                  disabled={isUpdatingDrive}
                  className="px-2.5 bg-[#DFA775] hover:bg-[#d2945d] border border-[#2A2421] rounded-lg text-xs font-black shadow-[1px_1px_0px_0px_#2A2421]"
                >
                  設定
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Add Teammate dialog modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#FCF9F2] border-2 border-[#2A2421] rounded-2xl p-5 max-w-sm w-full shadow-[3px_3px_0px_0px_#2A2421]"
          >
            <h3 className="text-base font-black text-[#2A2421] mb-3">加入會社新戰友</h3>

            <form onSubmit={submitAdd} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                  ✏️ 成員名稱
                </label>
                <input 
                  type="text"
                  placeholder="請輸入暱稱/名號"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                    🏢 身份/組別分工
                  </label>
                  <select
                    value={roleGroup}
                    onChange={(e) => setRoleGroup(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                    🟢 LINE Pay 名稱
                  </label>
                  <input 
                    type="text"
                    placeholder="LINE轉帳用ID"
                    value={linePayInfo}
                    onChange={(e) => setLinePayInfo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                  />
                </div>
              </div>

              {/* Avatar Selector and Custom Drag upload (上傳大頭貼以及選Preset) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                  🖼️ 大頭貼選擇 / 上傳照片 (自動縮小)
                </label>
                
                <div className="flex items-center gap-2.5 bg-white border border-[#2A2421] p-2.5 rounded-xl justify-between mb-2">
                  <div className="w-10 h-10 rounded-full border border-gray-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl.startsWith('data:image') ? (
                       <img src={avatarUrl} alt="壓縮預覽" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{avatarUrl}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center">
                    <label className="cursor-pointer bg-[#CCA090] hover:bg-[#B38879] border border-[#2A2421] rounded-lg px-2 py-1 text-[10px] font-black inline-flex items-center gap-1 active:scale-95 transition-all select-none">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{imgUploading ? "壓縮中..." : "上傳自訂照片"}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        disabled={imgUploading}
                      />
                    </label>
                  </div>
                </div>

                {/* Preset Picker */}
                <div className="grid grid-cols-6 gap-1.5 max-h-[85px] overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-gray-100">
                  {PRESET_AVATARS.map(sticker => (
                    <button
                      key={`sticker-add-${sticker}`}
                      type="button"
                      onClick={() => setAvatarUrl(sticker)}
                      className={`text-lg p-0.5 rounded hover:bg-slate-200 transition-colors 
                        ${avatarUrl === sticker ? 'bg-[#DFA775] border border-[#2A2421]' : ''}
                      `}
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-1.5 bg-gray-200 border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#DFA775] border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  確認創立
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Teammate dialog modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#FCF9F2] border-2 border-[#2A2421] rounded-2xl p-5 max-w-sm w-full shadow-[3px_3px_0px_0px_#2A2421]"
          >
            <h3 className="text-base font-black text-[#2A2421] mb-3">修改戰友資料</h3>

            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                  ✏️ 成員名稱
                </label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                    🏢 身份/組別分工
                  </label>
                  <select
                    value={roleGroup}
                    onChange={(e) => setRoleGroup(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                    🟢 LINE Pay 名稱
                  </label>
                  <input 
                    type="text"
                    value={linePayInfo}
                    onChange={(e) => setLinePayInfo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                  />
                </div>
              </div>

              {/* Avatar Selector and Custom upload (修改) */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-0.5">
                  🖼️ 大頭貼選擇 / 上傳照片 (自動縮小)
                </label>
                
                <div className="flex items-center gap-2.5 bg-white border border-[#2A2421] p-2.5 rounded-xl justify-between mb-2">
                  <div className="w-10 h-10 rounded-full border border-gray-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl.startsWith('data:image') ? (
                      <img src={avatarUrl} alt="壓縮預覽" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{avatarUrl}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center">
                    <label className="cursor-pointer bg-[#CCA090] hover:bg-[#B38879] border border-[#2A2421] rounded-lg px-2 py-1 text-[10px] font-black inline-flex items-center gap-1 active:scale-95 transition-all select-none">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{imgUploading ? "壓縮中..." : "上傳自訂照片"}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        disabled={imgUploading}
                      />
                    </label>
                  </div>
                </div>

                {/* Preset Picker */}
                <div className="grid grid-cols-6 gap-1.5 max-h-[85px] overflow-y-auto p-1.5 bg-slate-50 rounded-lg border border-gray-100">
                  {PRESET_AVATARS.map(sticker => (
                    <button
                      key={`sticker-edit-${sticker}`}
                      type="button"
                      onClick={() => setAvatarUrl(sticker)}
                      className={`text-lg p-0.5 rounded hover:bg-slate-200 transition-colors 
                        ${avatarUrl === sticker ? 'bg-[#DFA775] border border-[#2A2421]' : ''}
                      `}
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-1.5 bg-gray-200 border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#DFA775] border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  保存修改
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
}
