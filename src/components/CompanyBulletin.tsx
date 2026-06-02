/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useCompany } from './CompanyContext';
import { Calendar, Clock, Plus, Trash2, CalendarDays, Bell, AlertCircle, MapPin, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CompanyBulletin() {
  const { schedules, addScheduleEvent, deleteScheduleEvent, members } = useCompany();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());

  // Add event states
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [eventTime, setEventTime] = useState('14:00');
  const [mapUrl, setMapUrl] = useState('');
  const [description, setDescription] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate schedules within 3 days (inclusive)
  const countdownReminders = schedules.filter(sch => {
    const schDate = new Date(sch.date + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diffTime = schDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).map(sch => {
    const schDate = new Date(sch.date + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');
    const diffTime = schDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return {
      ...sch,
      daysLeft: diffDays
    };
  });

  // Calendar setup
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const monthsList = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const selectDay = (dayNum: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    setSelectedDate(`${currentYear}-${mm}-${dd}`);
  };

  const currentSchedules = schedules.filter(sch => sch.date === selectedDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedDate) return;
    try {
      await addScheduleEvent(title.trim(), selectedDate, eventTime, mapUrl.trim() || undefined, description.trim() || undefined);
      setTitle('');
      setMapUrl('');
      setDescription('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      {/* 1. Countdown Notice at the Top (前三天跳倒數提醒) */}
      <AnimatePresence>
        {countdownReminders.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#FFF9E6] border border-[#D97706] rounded-xl p-2.5 flex flex-col gap-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 text-[#D97706] font-black text-xs">
                <Bell className="w-4 h-4 animate-bounce" />
                <span>🔔 會社重要日程倒數通知</span>
              </div>
              <div className="space-y-1">
                {countdownReminders.map(rem => (
                  <div 
                    key={rem.id} 
                    className="flex justify-between items-center text-xs bg-white/75 px-2.5 py-1.5 rounded-lg border border-[#F59E0B]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-gray-800 truncate">{rem.title}</span>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">({rem.date} {rem.time})</span>
                    </div>
                    <div className="shrink-0 ml-2">
                      {rem.daysLeft === 0 ? (
                        <span className="font-extrabold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md text-[10px]">⏰ 今天就是今天！</span>
                      ) : (
                        <span className="font-extrabold text-[#D97706] bg-[#FFFBEB] px-1.5 py-0.5 rounded-md text-[10px]">🚀 剩下 {rem.daysLeft} 天！</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Grid: The cozy Custom Calendar (8 columns on Desktop) */}
        <div className="md:col-span-7 bg-[#FCF9F2] p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold font-sans text-[#2A2421] flex items-center gap-1.5">
              <CalendarDays className="w-4.5 h-4.5 text-amber-500" />
              <span>咘咘行事曆</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-full border border-[#2A2421] bg-white flex items-center justify-center font-bold text-xs hover:bg-[#DFA775] transition-colors"
              >
                ◀
              </button>
              <span className="font-bold text-xs px-1 text-[#2A2421]">
                {currentYear}年 {monthsList[currentMonth]}
              </span>
              <button 
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-full border border-[#2A2421] bg-white flex items-center justify-center font-bold text-xs hover:bg-[#DFA775] transition-colors"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Weeks row */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-gray-500 mb-1.5">
            <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blanks */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`blank-${idx}`} className="aspect-square"></div>
            ))}
            
            {/* Days list */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const mm = String(currentMonth + 1).padStart(2, '0');
              const dd = String(dayNum).padStart(2, '0');
              const fullDateStr = `${currentYear}-${mm}-${dd}`;
              
              const isSelected = selectedDate === fullDateStr;
              const isCurrentDay = todayStr === fullDateStr;
              
              // Find if there is schedule on this day
              const dayEvents = schedules.filter(sch => sch.date === fullDateStr);

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => selectDay(dayNum)}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center font-bold text-xs transition-all
                    ${isSelected 
                      ? 'bg-[#DFA775] border-[#2A2421] shadow-[1px_1px_0px_0px_#2A2421] text-[#2A2421]' 
                      : isCurrentDay
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'bg-white border-transparent hover:border-gray-300 text-gray-800'
                    }
                  `}
                >
                  <span>{dayNum}</span>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 flex gap-0.5 justify-center">
                      <span className="w-1 h-1 rounded-full bg-red-400 ring-1 ring-white"></span>
                      {dayEvents.length > 1 && <span className="w-1 h-1 rounded-full bg-orange-400 ring-1 ring-white"></span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Grid: Event listings for clicked days with additions (5 columns on Desktop) */}
        <div className="md:col-span-5 flex flex-col gap-3">
          <div className="bg-white p-4 rounded-2xl border-2 border-[#2A2421] shadow-[2px_2px_0px_0px_#2A2421] flex-1">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-[10px] font-bold text-gray-400 block tracking-tight">SELECTED DATE</span>
                <span className="font-extrabold text-sm text-[#2A2421]">{selectedDate}</span>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#A3B19B] hover:bg-[#8FAD83] border border-[#2A2421] rounded-xl text-xs font-bold shadow-[1px_1px_0px_0px_#2A2421] text-[#2A2421] active:translate-y-0.5 transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>新增聚會</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {currentSchedules.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl">🍵</span>
                  <p className="text-xs font-bold text-gray-400 mt-1.5">這天目前沒有約定喔！</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">點擊上方「新增聚會」來安排一場吧！</p>
                </div>
              ) : (
                currentSchedules.map(sch => (
                  <div 
                    key={sch.id}
                    className="flex flex-col p-3 rounded-xl border border-[#2A2421] bg-[#FDFBF7] shadow-[1px_1px_0px_0px_#2A2421] gap-2"
                  >
                    <div className="flex justify-between items-start gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-[#DFA775] border border-[#2A2421] rounded-lg shrink-0">
                          <Clock className="w-3.5 h-3.5 text-[#2A2421]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#2A2421] text-xs truncate">{sch.title}</h4>
                          <span className="text-[10px] text-gray-400 font-mono block leading-none mt-0.5">{sch.time}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteScheduleEvent(sch.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                        title="刪除行程"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {sch.mapUrl && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold bg-[#F1F5F9] px-2 py-1 rounded-lg border border-slate-200 w-fit max-w-full">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        {sch.mapUrl.startsWith('http') ? (
                          <a 
                            href={sch.mapUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline hover:text-blue-700 truncate"
                          >
                            🔗 點此開啟 Google 地圖
                          </a>
                        ) : (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sch.mapUrl)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline hover:text-blue-700 truncate"
                          >
                            📍 {sch.mapUrl}
                          </a>
                        )}
                      </div>
                    )}

                    {sch.description && (
                      <div className="text-[10px] text-slate-600 bg-[#FFFBEB] px-2.5 py-1.5 rounded-lg border border-[#F6E3B4] leading-relaxed whitespace-pre-wrap font-medium flex gap-1.5 items-start">
                        <AlignLeft className="w-3 h-3 text-[#B45309] shrink-0 mt-0.5" />
                        <span className="break-all">{sch.description}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick instructions block */}
          <div className="bg-[#CCA090] p-3 rounded-2xl border-2 border-[#2A2421] text-[#3F231B]">
            <h4 className="font-bold text-xs mb-0.5 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>溫馨公告小看板</span>
            </h4>
            <p className="text-[11px] font-semibold leading-relaxed">
              只要隨意點選小月曆上的日期，就能即時查看當天的會社行程，或一鍵新增。三天內行程將會高高掛在最上方，貼心叮嚀！
            </p>
          </div>
        </div>
      </div>

      {/* Add schedule event modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#FCF9F2] border-2 border-[#2A2421] rounded-2xl p-5 max-w-sm w-full shadow-[3px_3px_0px_0px_#2A2421]"
          >
            <h3 className="text-base font-bold text-[#2A2421] mb-3 flex items-center gap-1.5">
              <Calendar className="w-4.5 h-4.5 text-[#2A2421]" />
              <span>新增聚聚日程</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  📅 行程日期
                </label>
            <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full box-border appearance-none px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-bold outline-none"
                required
              />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  🕒 行程時間
                </label>
                <input 
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="block w-full box-border appearance-none px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  ✏️ 行程主題/名稱
                </label>
                <input 
                  type="text"
                  placeholder="例如: 討論營運走向、辦公室聚餐"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-semibold placeholder-gray-300 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  🗺️ Google Map 地標 / 連結
                </label>
                <input 
                  type="text"
                  placeholder="例如: 台北101、https://maps.app.goo.gl/..."
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-semibold placeholder-gray-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                  📝 詳細資訊 / 備忘錄
                </label>
                <textarea 
                  placeholder="輸入本次聚會之詳細開會內容、叮嚀事項或攜帶物品..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#2A2421] bg-white text-[#2A2421] font-semibold placeholder-gray-300 outline-none h-20 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-1.5 bg-gray-200 hover:bg-gray-300 border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#DFA775] hover:bg-[#d2945d] border border-[#2A2421] rounded-xl text-xs font-bold text-[#2A2421]"
                >
                  確認新增
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
