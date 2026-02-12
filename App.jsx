import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  Settings, 
  User, 
  Mail, 
  AlertCircle 
} from 'lucide-react';

/**
 * GASのウェブアプリURL設定
 * Vercelの環境変数 VITE_GAS_API_URL を読み込みますが、
 * エラー回避のため安全な取得方法に変更しました。
 */
const getGasUrl = () => {
  try {
    // Viteの環境変数。コンパイルエラー回避のためブラウザのグローバルチェック的な扱いにする
    const env = (import.meta && import.meta.env) ? import.meta.env.VITE_GAS_API_URL : "";
    return env || "";
  } catch (e) {
    return "";
  }
};

const GAS_API_URL = getGasUrl();

const App = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', note: '' });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  // 予約枠を取得
  const fetchSlots = useCallback(async () => {
    if (!GAS_API_URL) return;
    setLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?action=getSlots&date=${selectedDate.toISOString()}`);
      const data = await response.json();
      setSlots(data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (GAS_API_URL) {
      fetchSlots();
    }
  }, [fetchSlots]);

  // 予約を送信
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    
    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createBooking',
          ...formData,
          rawStart: selectedSlot.rawStart,
          rawEnd: selectedSlot.rawEnd
        })
      });
      
      setStatus('success');
      setFormData({ name: '', email: '', note: '' });
      setTimeout(fetchSlots, 1500);
    } catch (err) {
      console.error("Booking Error:", err);
      setStatus('error');
    }
  };

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  return (
    <div className="min-h-screen flex flex-col items-center py-8 md:py-16 px-4 bg-slate-50 font-sans text-slate-900">
      <div className="w-full max-w-5xl">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="inline-block bg-indigo-600 px-6 py-2 rounded-2xl shadow-xl shadow-indigo-100 mb-4 animate-bounce">
            <span className="text-white text-xs font-black tracking-widest uppercase">Smart Booking</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight italic">ONLINE RESERVE</h1>
          <p className="text-slate-400 mt-3 font-medium underline decoration-indigo-200 decoration-2 underline-offset-4">
            ご希望の日程を選択してください
          </p>
        </div>

        {/* API未設定時の警告 */}
        {!GAS_API_URL && (
          <div className="mb-12 p-8 bg-white border-2 border-amber-200 rounded-[2.5rem] shadow-xl shadow-amber-100/20 text-center flex flex-col items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-full">
              <AlertCircle className="text-amber-600 w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-amber-800 tracking-tight">API連携が必要です</h3>
            <p className="text-slate-500 text-sm max-w-md">
              Vercelの管理画面（Settings {'>'} Environment Variables）にて、<br/>
              <code className="bg-slate-100 px-2 py-1 rounded text-indigo-600 font-bold">VITE_GAS_API_URL</code> 
              にGASのURLを設定してください。
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* カレンダーセクション */}
          <div className="lg:col-span-5">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white sticky top-8">
              <div className="flex justify-between items-center mb-8 px-2">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  {currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 font-bold border border-slate-50 shadow-sm"><ChevronLeft /></button>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 font-bold border border-slate-50 shadow-sm"><ChevronRight /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-300 mb-6 tracking-[0.2em] uppercase">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {[...Array(firstDay(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => <div key={`e-${i}`} />)}
                {[...Array(daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => {
                  const day = i + 1;
                  const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                  const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth();
                  return (
                    <button 
                      key={day} 
                      onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                      className={`aspect-square flex items-center justify-center rounded-2xl font-bold text-sm transition-all relative ${
                        isSelected 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110 z-10' 
                        : isToday ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-indigo-50 text-slate-600'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* スロットセクション */}
          <div className="lg:col-span-7">
            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white min-h-[550px]">
              <div className="mb-10 flex justify-between items-end border-b border-slate-50 pb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    TIME SLOTS
                  </h3>
                  <p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center h-80 space-y-6">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  <p className="text-slate-300 font-black text-[10px] tracking-[0.3em] uppercase">Syncing...</p>
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {slots.map(s => (
                    <button 
                      key={s.id} 
                      disabled={s.isBooked} 
                      onClick={() => { setSelectedSlot(s); setModalOpen(true); setStatus('idle'); }} 
                      className={`group p-8 rounded-[2.5rem] border-2 transition-all text-left relative overflow-hidden ${
                        s.isBooked 
                        ? 'bg-slate-50 border-slate-100 opacity-40 grayscale cursor-not-allowed' 
                        : 'bg-white border-slate-100 hover:border-indigo-600 hover:shadow-2xl hover:-translate-y-2'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-colors ${s.isBooked ? 'bg-slate-200' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                        {s.isBooked ? '×' : '✓'}
                      </div>
                      <p className={`text-2xl font-black tracking-tight ${s.isBooked ? 'text-slate-400' : 'text-slate-900'}`}>{s.start} - {s.end}</p>
                      <p className="text-[10px] text-slate-400 font-black mt-3 uppercase tracking-[0.2em]">{s.isBooked ? '予約不可' : '予約する'}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 p-10">
                  <p className="text-slate-400 font-black text-xl tracking-tight">No Slots Available</p>
                  <p className="text-slate-300 text-sm mt-3 font-medium underline decoration-slate-200">別の日付をタップして空き状況を確認してください。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 予約フォームモーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 relative border border-white">
            <button onClick={() => setModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-600 text-3xl font-bold transition-all hover:rotate-90">×</button>
            
            {status === 'success' ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-10" />
                <h2 className="text-4xl font-black text-slate-800 mb-6 tracking-tighter uppercase">Accepted</h2>
                <p className="text-slate-500 mb-12 font-medium leading-relaxed px-6">
                  予約リクエストを送信しました。<br/>カレンダーへの登録完了をお待ちください。
                </p>
                <button onClick={() => { setModalOpen(false); setStatus('idle'); }} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-black active:scale-95 transition-all uppercase tracking-widest text-xs">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-3xl font-black text-slate-800 mb-10 tracking-tighter uppercase border-l-4 border-indigo-600 pl-4">Reservation</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 font-black text-[10px] text-slate-400 text-center uppercase tracking-widest">
                    {selectedDate.toLocaleDateString()}
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 font-black text-[10px] text-slate-400 text-center uppercase tracking-widest">
                    {selectedSlot?.start} - {selectedSlot?.end}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input required className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-sm shadow-inner" placeholder="お名前" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input required type="email" className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-sm shadow-inner" placeholder="メールアドレス" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <textarea rows="3" className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-sm resize-none shadow-inner" placeholder="備考・メッセージ（任意）" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                </div>

                <button disabled={status === 'loading'} className="w-full mt-12 py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-[10px]">
                  {status === 'loading' ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : "Confirm Reserve"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
