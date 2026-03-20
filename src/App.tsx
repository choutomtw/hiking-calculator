import React, { useState, useMemo, useEffect } from 'react';
import { Mountain, Clock, Zap, ChevronRight, Info, Trash2, Map, MapPin, CheckCircle2, Calendar, Flag, Database, AlertTriangle, Search } from 'lucide-react';
import CONNECTIONS from './data/connections.json';

interface Node {
  name: string;
}

interface Park {
  id: string;
  name: string;
  entryPoints: string[];
}

interface DayPlan {
  startTime: string;
  nodes: string[]; // 僅儲存節點名稱，時間由系統動態計算以確保一致性
}

const PARKS_DATA: Park[] = [
  {
    id: "yushan",
    name: "玉山國家公園 (Yushan)",
    entryPoints: [
      "上東埔停車場", "塔塔加鞍部", "東埔溫泉", "八通關登山口",
      "大關山隧道", "塔關山登山口", "進涇橋"
    ]
  },
  {
    id: "sheipa",
    name: "雪霸國家公園 (Shei-Pa)",
    entryPoints: ["雪山登山口管制站", "0.3K檢查哨(大鹿林道)", "神木區登山口(鎮西堡)", "武陵山莊", "仁壽橋", "環山部落"]
  },
  {
    id: "taroko",
    name: "太魯閣國家公園 (Taroko)",
    entryPoints: [
      "勝光登山口", "思源埡口", "820林道0K", "羊頭山登山口", "11.7K行車終點(730林道)",
      "北合歡山登山口", "松泉崗・天巒池登山口", "武嶺", "合歡山莊/松雪樓", 
      "克難關", "合歡山管理站", "舊滑訓中心", "合歡山莊", "奇萊山登山口(滑雪山莊)", "大禹嶺", "岳王亭"
    ]
  },
  {
    id: "others",
    name: "其他 (Others)",
    entryPoints: [
      "111.2K 屏風山新登山口", "華岡登山口", "屯原登山口", "奇萊保線所", 
      "最後農家", "7.8K停車處(武界林道)", "新登山口(北大武)", "林道入口", "七彩湖", 
      "六順山新登山口", "33K行車終點(郡大林道)", "45.3K登山口", "15.5K行車終點", 
      "34K登山口", "14.6K水泥路止", "中平林道", "16.5K行車終點",
      "向陽森林遊樂區登山口", "戒茂斯登山口(南橫公路)", "南安登山口",
      "登山口 (小關山林道端)", "石山林道登山口 (7K特生中心)"
    ]
  }
];

// 全域登山口清單，用於最後一日驗證
const ALL_ENTRY_POINTS = PARKS_DATA.flatMap(p => p.entryPoints);

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes + minutesToAdd);
  
  const newHours = String(date.getHours()).padStart(2, '0');
  const newMinutes = String(date.getMinutes()).padStart(2, '0');
  return `${newHours}:${newMinutes}`;
}

const getTimeBetween = (startName: string, endName: string) => {
  return (CONNECTIONS as any)[startName]?.[endName] || 0;
};

export default function App() {
  const [multiplier, setMultiplier] = useState(1.0);
  const [selectedParkId, setSelectedParkId] = useState('');
  const [selectedEntryPoint, setSelectedEntryPoint] = useState('');
  
  // 多日規劃狀態
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([{ startTime: '02:00', nodes: [] }]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  // 儲存已確認的每日終點，作為隔日判斷起點的依據
  const [confirmedDestinations, setConfirmedDestinations] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'planner' | 'data'>('planner');
  const [showAudit, setShowAudit] = useState(false);
  const [dataSearch, setDataSearch] = useState('');
  const [auditParkFilter, setAuditParkFilter] = useState<string>('');

  const selectedPark = useMemo(() => 
    PARKS_DATA.find(p => p.id === selectedParkId), [selectedParkId]);
  
  // 獲取當前正在編輯的天數的起始節點名稱 (僅依賴已確認的資料)
  const currentDayStartNodeName = useMemo(() => {
    if (!selectedEntryPoint) return "";
    if (activeDayIndex === 0) return selectedEntryPoint;
    
    // 取得前一天確認的終點
    return confirmedDestinations[activeDayIndex - 1] || "";
  }, [confirmedDestinations, activeDayIndex, selectedEntryPoint]);

  const timelines = useMemo(() => {
    if (!selectedEntryPoint) return null;

    return dayPlans.map((day, dayIdx) => {
      let currentStandardTime = day.startTime;
      let currentCustomTime = day.startTime;

      // 每一天的起始點：第一天用登山口，其餘用前一天確認的終點
      let prevNodeName = "";
      if (dayIdx === 0) {
        prevNodeName = selectedEntryPoint;
      } else {
        prevNodeName = confirmedDestinations[dayIdx - 1] || "";
      }

      // 如果起點尚未判定（前一天未確認），則該天不顯示路徑
      if (!prevNodeName) return null;

      const points = [{
        name: prevNodeName,
        standardTime: currentStandardTime,
        customTime: currentCustomTime,
        duration: 0,
        customDuration: 0,
        isStart: true
      }];

      day.nodes.forEach((nodeName) => {
        const duration = getTimeBetween(prevNodeName, nodeName);
        const customMinutes = Math.round(duration * multiplier);
        currentStandardTime = addMinutesToTime(currentStandardTime, duration);
        currentCustomTime = addMinutesToTime(currentCustomTime, customMinutes);

        points.push({
          name: nodeName,
          standardTime: currentStandardTime,
          customTime: currentCustomTime,
          duration: duration,
          customDuration: customMinutes,
          isStart: false
        });
        prevNodeName = nodeName;
      });

      return points;
    });
  }, [dayPlans, confirmedDestinations, selectedEntryPoint, multiplier]);

  const triggerHaptic = () => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };

  const handleAddDestination = (targetNodeName: string) => {
    if (!selectedEntryPoint) return;
    triggerHaptic();

    const currentNodes = dayPlans[activeDayIndex].nodes;
    const currentLocation = currentNodes.length > 0 
      ? currentNodes[currentNodes.length - 1] 
      : currentDayStartNodeName;

    if (targetNodeName !== currentLocation) {
      setDayPlans(prev => {
        const next = [...prev];
        const dayNodes = next[activeDayIndex].nodes;
        
        next[activeDayIndex] = {
          ...next[activeDayIndex],
          nodes: [...dayNodes, targetNodeName]
        };
        return next;
      });
    }
  };

  const handleCompleteDay = () => {
      const currentNodes = dayPlans[activeDayIndex].nodes;
      const currentDest = currentNodes[currentNodes.length - 1];
      if (!currentDest) return;

      // 驗證：如果是最後一天的最後一個行程，必須選擇登山口
      const isLastDay = activeDayIndex === dayPlans.length - 1;
      if (isLastDay && !ALL_ENTRY_POINTS.includes(currentDest)) {
        alert("最終行程必須回到登山口才能結束規劃！");
        return;
      }

      triggerHaptic();
    
    // 更新確認的終點清單
    setConfirmedDestinations(prev => {
      const next = [...prev];
      next[activeDayIndex] = currentDest;
      return next;
    });

    // 自動跳轉至下一天 (如果有的話)
    if (activeDayIndex < dayPlans.length - 1) {
      setActiveDayIndex(activeDayIndex + 1);
    }
  };

  const handleAddNextDay = () => {
    setDayPlans(prev => [...prev, { startTime: '04:00', nodes: [] }]);
    setActiveDayIndex(dayPlans.length);
  };

  const handleEditDay = (index: number) => {
    setActiveDayIndex(index);
    // 清除該天之後的所有確認狀態，因為起點可能會變
    setConfirmedDestinations(prev => prev.slice(0, index));
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}小時${m}分`;
    return `${m}分`;
  };

  const handleParkChange = (id: string) => {
    setSelectedParkId(id);
    setSelectedEntryPoint('');
    setDayPlans(prev => prev.map(day => ({ ...day, nodes: [] })));
    setConfirmedDestinations([]);
    setActiveDayIndex(0);
  };

  const handleEntryPointChange = (name: string) => {
    setSelectedEntryPoint(name);
    setDayPlans(prev => prev.map(day => ({ ...day, nodes: [] })));
    setConfirmedDestinations([]);
    setActiveDayIndex(0);
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-stone-800 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="bg-emerald-900 text-white py-8 px-4 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50px] left-[-50px] w-[200px] h-[200px] rounded-full bg-white blur-3xl"></div>
            <div className="absolute bottom-[-50px] right-[-50px] w-[200px] h-[200px] rounded-full bg-white blur-3xl"></div>
          </div>
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 relative z-10">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Mountain size={40} className="text-emerald-300" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-1">百岳時程規劃器</h1>
              <p className="text-emerald-200/80 text-sm font-medium tracking-wide uppercase">Professional Trekking Planner</p>
            </div>

            <div className="flex bg-emerald-950/50 p-1 rounded-xl border border-white/10 mt-4">
              <button 
                onClick={() => setActiveTab('planner')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'planner' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-400 hover:text-emerald-200'}`}
              >
                行程規劃
              </button>
              <button 
                onClick={() => setActiveTab('data')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'data' ? 'bg-emerald-600 text-white shadow-lg' : 'text-emerald-400 hover:text-emerald-200'}`}
              >
                數據稽核
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'planner' ? (
          <div className="space-y-8">
            {/* Route Selection & Configuration */}
            <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Map size={16} /> 1. 選擇國家公園
              </label>
              <select
                value={selectedParkId}
                onChange={(e) => handleParkChange(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- 請選擇國家公園 --</option>
                {PARKS_DATA.map(park => (
                  <option key={park.id} value={park.id}>{park.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <MapPin size={16} /> 2. 選擇起點登山口
              </label>
              <select
                value={selectedEntryPoint}
                onChange={(e) => handleEntryPointChange(e.target.value)}
                disabled={!selectedParkId}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none cursor-pointer disabled:opacity-50 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- 請選擇登山口 --</option>
                {selectedPark?.entryPoints.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-100">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Calendar size={16} /> 3. 預計行走天數
              </label>
              <select
                value={dayPlans.length}
                onChange={(e) => {
                  const count = parseInt(e.target.value);
                  const newPlans = [...dayPlans];
                  if (count > newPlans.length) {
                    for (let i = newPlans.length; i < count; i++) {
                      newPlans.push({ startTime: '04:00', nodes: [] });
                    }
                  } else if (count < newPlans.length) {
                    newPlans.splice(count);
                    setConfirmedDestinations(prev => prev.slice(0, count - 1));
                  }
                  setDayPlans(newPlans);
                  setActiveDayIndex(Math.min(activeDayIndex, count - 1));
                }}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>{n} 天</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Zap size={16} /> 4. 全程速度倍率
              </label>
              <div className="flex items-center gap-4 h-[50px]">
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="text-lg font-mono font-bold text-emerald-700 w-12 text-center">
                  {multiplier.toFixed(1)}x
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Clock size={16} /> 當日起登時間 (第 {activeDayIndex + 1} 天)
              </label>
              <input
                type="time"
                value={dayPlans[activeDayIndex].startTime}
                onChange={(e) => {
                  const newPlans = [...dayPlans];
                  newPlans[activeDayIndex].startTime = e.target.value;
                  setDayPlans(newPlans);
                }}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* Multi-day Tabs & Destination Selection */}
        <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
              {dayPlans.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleEditDay(idx)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    activeDayIndex === idx 
                      ? 'bg-emerald-800 text-white shadow-md' 
                      : confirmedDestinations[idx]
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  第 {idx + 1} 天
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              {confirmedDestinations[activeDayIndex] ? (
                <div className="flex gap-2">
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-400 rounded-xl text-xs font-bold cursor-not-allowed border border-stone-200"
                  >
                    <CheckCircle2 size={16} /> 已完成規劃
                  </button>
                  {activeDayIndex === dayPlans.length - 1 && (
                    <button
                      onClick={handleAddNextDay}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      <Zap size={16} /> 新增下一天
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleCompleteDay}
                  disabled={dayPlans[activeDayIndex].nodes.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-800 text-white rounded-xl text-sm font-bold hover:bg-emerald-900 transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <CheckCircle2 size={18} /> 
                  {activeDayIndex === dayPlans.length - 1 ? '確認最終行程' : '完成本日路程'}
                </button>
              )}
            </div>
          </div>

          {selectedEntryPoint && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-700 flex items-center gap-2">
                  <Flag size={16} className="text-emerald-600" /> 
                  選擇下一個目的地 
                  <span className="text-xs font-normal text-stone-400 ml-2">
                    {currentDayStartNodeName 
                      ? `(當前位置: ${dayPlans[activeDayIndex].nodes.length > 0 ? dayPlans[activeDayIndex].nodes[dayPlans[activeDayIndex].nodes.length - 1] : currentDayStartNodeName})` 
                      : '(等待前日行程確認)'}
                  </span>
                </h3>
                {dayPlans[activeDayIndex].nodes.length > 0 && (
                  <button
                    onClick={() => {
                      setDayPlans(prev => {
                        const next = [...prev];
                        const newNodes = [...next[activeDayIndex].nodes];
                        newNodes.pop();
                        next[activeDayIndex] = { ...next[activeDayIndex], nodes: newNodes };
                        return next;
                      });
                      triggerHaptic();
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-500 text-xs font-bold rounded-lg hover:bg-stone-200 transition-all"
                  >
                    <Trash2 size={12} /> 撤銷上一步
                  </button>
                )}
              </div>
              
              {!currentDayStartNodeName && activeDayIndex > 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  <p className="text-stone-400 text-sm">請先完成前一天的路徑規劃並點擊「完成本日路徑」</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {(() => {
                    const currentNodes = dayPlans[activeDayIndex].nodes;
                    const currentLocation = currentNodes.length > 0 
                      ? currentNodes[currentNodes.length - 1] 
                      : currentDayStartNodeName;
                    
                    // 獲取鄰近節點
                    const neighbors = Object.keys((CONNECTIONS as any)[currentLocation] || {});
                    
                    if (neighbors.length === 0) {
                      return (
                        <div className="col-span-full p-4 bg-orange-50 text-orange-700 rounded-xl text-xs border border-orange-100">
                          此處暫無後續路徑數據。
                        </div>
                      );
                    }

                    return neighbors.map((nodeName) => {
                      const isConfirmed = !!confirmedDestinations[activeDayIndex];
                      const isEntryPoint = ALL_ENTRY_POINTS.includes(nodeName);
                      const isLastDay = activeDayIndex === dayPlans.length - 1;
                      
                      return (
                        <button
                          key={nodeName}
                          disabled={isConfirmed}
                          onClick={() => handleAddDestination(nodeName)}
                          className={`p-3 rounded-xl text-sm font-medium transition-all border text-left flex flex-col gap-1 bg-white border border-stone-200 text-stone-700 hover:border-emerald-500 hover:text-emerald-600 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isEntryPoint ? 'ring-1 ring-emerald-100' : ''
                          }`}
                        >
                          <span className="truncate">{nodeName}</span>
                          {isEntryPoint && (
                            <span className="text-[10px] text-emerald-600 font-bold">登山口</span>
                          )}
                          <span className="text-[10px] text-stone-400">
                            +{(CONNECTIONS as any)[currentLocation][nodeName]} 分鐘
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              )}

              {activeDayIndex === dayPlans.length - 1 && dayPlans[activeDayIndex].nodes.length > 0 && !ALL_ENTRY_POINTS.includes(dayPlans[activeDayIndex].nodes[dayPlans[activeDayIndex].nodes.length - 1]) && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-100">
                  <AlertTriangle size={14} className="shrink-0" />
                  <p className="text-[10px] font-medium">
                    注意：最終行程必須回到登山口（標示有「登山口」字樣的地點）才能結束規劃。
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Results Display */}
        <div className="space-y-6">
          {timelines?.map((dayTimeline, dayIdx) => {
            if (!dayTimeline) return null;
            
            return (
              <section key={dayIdx} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="p-4 bg-emerald-50 border-b border-stone-200 flex items-center justify-between">
                  <h2 className="font-bold text-emerald-900 flex items-center gap-2">
                    <Calendar size={18} /> 第 {dayIdx + 1} 天行程表
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-stone-400">起登 {dayPlans[dayIdx].startTime}</div>
                      <div className="text-[10px] font-bold text-emerald-600">
                        行進 {formatDuration(dayTimeline.reduce((acc, curr) => acc + (curr.customDuration || 0), 0))}
                      </div>
                    </div>
                    {dayIdx === dayPlans.length - 1 && dayPlans.length > 1 && (
                      <button 
                        onClick={() => {
                          const newPlans = dayPlans.slice(0, -1);
                          setDayPlans(newPlans);
                          setActiveDayIndex(Math.min(activeDayIndex, newPlans.length - 1));
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-[10px] uppercase tracking-wider">
                        <th className="px-6 py-3 font-semibold">地點</th>
                        <th className="px-6 py-3 font-semibold text-center">上河 (1.0x)</th>
                        <th className="px-6 py-3 font-semibold text-center text-emerald-700">你的時間 ({multiplier.toFixed(1)}x)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {dayTimeline.map((item, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && (
                            <tr className="bg-stone-50/30">
                              <td colSpan={3} className="px-6 py-1">
                                <div className="flex items-center gap-4 text-[10px] text-stone-400 ml-1">
                                  <div className="w-px h-4 bg-stone-200 ml-0.5" />
                                  <span className="flex items-center gap-1 italic">
                                    <Zap size={10} /> 移動: {item.duration}分 / 
                                    <span className="text-orange-500 font-bold">{item.customDuration}分</span>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr className="hover:bg-stone-50 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-2">
                              {item.isStart ? (
                                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                              ) : ALL_ENTRY_POINTS.includes(item.name) ? (
                                <Flag size={14} className="text-emerald-600" />
                              ) : (
                                <ChevronRight size={14} className="text-stone-300" />
                              )}
                              <span className={`text-sm ${item.isStart ? 'font-bold text-emerald-900' : (ALL_ENTRY_POINTS.includes(item.name) ? 'font-bold text-emerald-700' : 'text-stone-700')}`}>
                                {item.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-xs text-stone-400">
                              {item.standardTime}
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-sm font-bold text-orange-600">
                              {item.customTime}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
          
          {!timelines && (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 py-12 text-center text-stone-400 space-y-2">
              <MapPin size={48} className="mx-auto opacity-20" />
              <p className="text-sm">請選擇路線並開始規劃您的多日行程。</p>
            </div>
          )}
        </div>
      </div>
    ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!auditParkFilter ? (
            <section className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Database size={32} />
                </div>
                <h2 className="text-xl font-bold text-stone-800">數據稽核系統</h2>
                <p className="text-stone-500 max-w-md mx-auto text-sm">
                  請選擇國家公園以查看其步程數據
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setAuditParkFilter('all')}
                  className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-stone-800 group-hover:text-emerald-700">所有國家公園</h3>
                      <p className="text-xs text-stone-400 mt-1">查看系統內所有步程數據</p>
                    </div>
                    <ChevronRight className="text-stone-300 group-hover:text-emerald-500" />
                  </div>
                </button>
                {PARKS_DATA.map(park => (
                  <button
                    key={park.id}
                    onClick={() => setAuditParkFilter(park.id)}
                    className="p-6 bg-white rounded-2xl border border-stone-200 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-stone-800 group-hover:text-emerald-700">{park.name}</h3>
                        <p className="text-xs text-stone-400 mt-1">查看該區域的步程數據</p>
                      </div>
                      <ChevronRight className="text-stone-300 group-hover:text-emerald-500" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setAuditParkFilter('')}
                    className="flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    <ChevronRight className="rotate-180" size={18} /> 返回分類
                  </button>
                  <h3 className="font-bold text-stone-700">
                    {auditParkFilter === 'all' ? '所有國家公園' : PARKS_DATA.find(p => p.id === auditParkFilter)?.name}
                  </h3>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input
                      type="text"
                      placeholder="搜尋地點 (例如：排雲, 主峰...)"
                      value={dataSearch}
                      onChange={(e) => setDataSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                    />
                  </div>
                </div>
              </section>

              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 text-stone-500 text-[10px] uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold">起點</th>
                        <th className="px-6 py-4 font-semibold">終點</th>
                        <th className="px-6 py-4 font-semibold text-right">上河步程 (分)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(() => {
                        // Pre-calculate reachable nodes for the selected park if filter is active
                        const parkNodes = new Set<string>();
                        if (auditParkFilter !== 'all' && auditParkFilter !== '') {
                          const selectedPark = PARKS_DATA.find(p => p.id === auditParkFilter);
                          if (selectedPark) {
                            const queue = [...selectedPark.entryPoints];
                            queue.forEach(node => parkNodes.add(node));
                            
                            let i = 0;
                            while(i < queue.length) {
                              const current = queue[i++];
                              const neighbors = (CONNECTIONS as any)[current];
                              if (neighbors) {
                                Object.keys(neighbors).forEach(neighbor => {
                                  if (!parkNodes.has(neighbor)) {
                                    parkNodes.add(neighbor);
                                    queue.push(neighbor);
                                  }
                                });
                              }
                            }
                          }
                        }

                        return Object.entries(CONNECTIONS).flatMap(([start, targets]) => 
                          Object.entries(targets)
                            .filter(([end]) => {
                              const matchesSearch = start.includes(dataSearch) || end.includes(dataSearch);
                              const matchesPark = auditParkFilter === 'all' || parkNodes.has(start) || parkNodes.has(end);
                              return matchesSearch && matchesPark;
                            })
                            .map(([end, time]) => (
                              <tr key={`${start}-${end}`} className="hover:bg-stone-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-stone-700">{start}</td>
                                <td className="px-6 py-4 text-sm text-stone-700">{end}</td>
                                <td className="px-6 py-4 text-sm font-mono font-bold text-emerald-700 text-right">{time}</td>
                              </tr>
                            ))
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

        {/* Data Audit Panel */}
        <section className="mt-8">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex items-center gap-2 text-stone-400 hover:text-stone-600 transition-colors text-xs font-medium mx-auto"
          >
            <Database size={14} />
            {showAudit ? '隱藏步程數據核對表' : '顯示步程數據核對表 (上河 1.0x)'}
          </button>

          {showAudit && (
            <div className="mt-4 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-stone-50 px-6 py-3 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-stone-700">
                    步程數據核對表 (Source: connections.json)
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Map className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                    <select
                      value={auditParkFilter}
                      onChange={(e) => setAuditParkFilter(e.target.value)}
                      className="pl-7 pr-4 py-1.5 bg-white border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-[10px] appearance-none"
                    >
                      <option value="all">所有國家公園</option>
                      {PARKS_DATA.map(park => (
                        <option key={park.id} value={park.id}>{park.name}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[10px] text-stone-400 italic">
                    * 數據與上河文化步程圖核對中
                  </span>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-stone-50 shadow-sm">
                    <tr className="text-[10px] text-stone-500 uppercase tracking-wider">
                      <th className="px-6 py-2 font-semibold">起點</th>
                      <th className="px-6 py-2 font-semibold">終點</th>
                      <th className="px-6 py-2 font-semibold text-right">時間 (分)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(() => {
                      const parkNodes = new Set<string>();
                      if (auditParkFilter !== 'all') {
                        const selectedPark = PARKS_DATA.find(p => p.id === auditParkFilter);
                        if (selectedPark) {
                          const queue = [...selectedPark.entryPoints];
                          queue.forEach(node => parkNodes.add(node));
                          let i = 0;
                          while(i < queue.length) {
                            const current = queue[i++];
                            const neighbors = (CONNECTIONS as any)[current];
                            if (neighbors) {
                              Object.keys(neighbors).forEach(neighbor => {
                                if (!parkNodes.has(neighbor)) {
                                  parkNodes.add(neighbor);
                                  queue.push(neighbor);
                                }
                              });
                            }
                          }
                        }
                      }

                      return Object.entries(CONNECTIONS).flatMap(([start, targets]) => 
                        Object.entries(targets)
                          .filter(([end]) => {
                            return auditParkFilter === 'all' || parkNodes.has(start) || parkNodes.has(end);
                          })
                          .map(([end, time]) => (
                            <tr key={`${start}-${end}`} className="hover:bg-stone-50/50 transition-colors">
                              <td className="px-6 py-2 text-xs text-stone-600">{start}</td>
                              <td className="px-6 py-2 text-xs text-stone-600">{end}</td>
                              <td className="px-6 py-2 text-xs font-mono font-bold text-emerald-700 text-right">{time}</td>
                            </tr>
                          ))
                      );
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-emerald-50 border-t border-emerald-100">
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  <strong>提示：</strong> 如果您發現上述數據與地圖不符，請告知我具體的起點、終點與正確時間，我將立即更新 <code>connections.json</code>。
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center text-stone-400 text-[10px] pb-8">
          &copy; {new Date().getFullYear()} 登山路線規劃器 • 祝您平安登頂
        </footer>
      </div>

      {/* Database Status Check (Debug Panel) */}
      <div className="max-w-4xl mx-auto mt-12 mb-8 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
          <Database size={20} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-stone-800">資料庫狀態檢查 (Debug Panel)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 1. 統計資訊 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
              <Info size={16} /> 1. 系統載入統計
            </h3>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-sm text-stone-600">
                目前系統共載入 <span className="font-mono font-bold text-emerald-700 text-lg">{Object.keys(CONNECTIONS).length}</span> 條起始節點路徑
              </p>
            </div>

            <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2 pt-2">
              <AlertTriangle size={16} /> 3. 異常數據檢查
            </h3>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 max-h-60 overflow-y-auto space-y-2">
              {(() => {
                const issues: string[] = [];
                const allNodes = new Set(Object.keys(CONNECTIONS));
                const destinationNodes = new Set<string>();

                Object.entries(CONNECTIONS).forEach(([startNode, neighbors]: [string, any]) => {
                  const neighborKeys = Object.keys(neighbors);
                  
                  // 檢查是否有後續路徑
                  if (neighborKeys.length === 0) {
                    issues.push(`[${startNode}] 沒有定義任何後續路徑數據`);
                  }

                  neighborKeys.forEach(neighbor => {
                    destinationNodes.add(neighbor);
                    const time = neighbors[neighbor];
                    
                    // 檢查時間異常
                    if (time === 0) {
                      issues.push(`[${startNode} -> ${neighbor}] 預估時間為 0`);
                    } else if (time === "" || time === undefined || time === null) {
                      issues.push(`[${startNode} -> ${neighbor}] 預估時間為空白或未定義`);
                    }
                  });
                });

                // 檢查哪些目的地節點沒有作為起點出現在資料庫中 (死胡同)
                destinationNodes.forEach(node => {
                  if (!allNodes.has(node) && !ALL_ENTRY_POINTS.includes(node)) {
                    issues.push(`[${node}] 為路徑終點，但資料庫中沒有其作為起點的後續數據`);
                  }
                });

                if (issues.length === 0) {
                  return <p className="text-xs text-emerald-600 font-medium">✅ 所有數據檢查正常，未發現異常。</p>;
                }

                return (
                  <ul className="space-y-1">
                    {issues.map((issue, idx) => (
                      <li key={idx} className="text-xs text-red-500 font-medium flex items-start gap-2">
                        <span className="mt-1 w-1 h-1 bg-red-500 rounded-full shrink-0" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </div>

          {/* 2. 路線清單 */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
              <Search size={16} /> 2. 路線節點清單
            </h3>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 max-h-[340px] overflow-y-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="sticky top-0 bg-stone-50 shadow-sm">
                  <tr className="text-stone-400 uppercase">
                    <th className="pb-2">路線/起點名稱</th>
                    <th className="pb-2 text-right">包含節點數</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {Object.entries(CONNECTIONS)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([name, neighbors]: [string, any]) => (
                      <tr key={name} className="hover:bg-white transition-colors">
                        <td className="py-2 text-stone-600 font-medium">{name}</td>
                        <td className="py-2 text-right font-mono text-emerald-700 font-bold">
                          {Object.keys(neighbors).length}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
