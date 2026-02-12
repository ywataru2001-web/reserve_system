import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  CalendarCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';

/**
 * 1. CONFIGURATION
 * Vercelの環境変数 VITE_GAS_API_URL を取得します。
 */
const getGasUrl = () => {
  try {
    // Vite環境変数。import.meta.env が使えない環境でもエラーにならないように保護
    const url = (import.meta && import.meta.env) ? import.meta.env.VITE_GAS_API_URL : "";
    return url || "";
  } catch (e) {
    return "";
  }
};

const GAS_API_URL = getGasUrl();

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', note: '' });
  const [status, setStatus] = useState('idle');

  /**
   * 2. FETCH SLOTS FROM GAS
   */
  const fetchSlots = useCallback(async () => {
    if (!GAS_API_URL) return;
    setLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?action=getSlots&date=${selectedDate.toISOString()}`);
      const data = await response.json();
      // dataが配列であることを確認してセット
      setSlots(Array.isArray(data) ? data : []);
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

  /**
   * 3. SUBMIT BOOKING TO GAS
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    
    try {
      // GASの doPost(e) に対してリクエストを送信
      await fetch(GAS_API_URL, {
        method: 'POST',
        mode: 'no-cors', // GASの制限を回避
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createBooking',
          ...formData,
          rawStart: selectedSlot.rawStart,
          rawEnd: selectedSlot.rawEnd
        })
      });
      
      // no-cors のためレスポンス内容は確認できないが、完了とみなす
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100">
            <CalendarCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tighter text-slate-800 uppercase">Smart Reserve</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {!GAS_API_URL && (
          <div className="mb-12 p-8 bg-white border-2 border-amber-200 rounded-[2.5rem] shadow-xl text-center flex flex-col items-center gap-4">
            <AlertCircle className="text-amber-600 w-8 h-8" />
            <h3 className="text-xl font-black text-amber-800">API URL 未設定</h3>
            <p className="text-slate-500 text-sm">Vercelの環境変数 VITE_GAS_API_URL を設定してください。</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white sticky top-24">
              <div className="flex justify-between items-center mb-8 px-2">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  {currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><ChevronLeft /></button>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><ChevronRight /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-300 mb-6 tracking-widest uppercase">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {[...Array(firstDay(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => <div key={`e-${i}`} />)}
                {[...Array(daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => {
                  const day = i + 1;
                  const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth();
                  return (
                    <button 
                      key={day} 
                      onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                      className={`aspect-square flex items-center justify-center rounded-2xl font-bold text-sm transition-all ${
                        isSelected ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'hover:bg-indigo-50 text-slate-600'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-white min-h-[550px]">
              <div className="mb-10 flex justify-between items-end border-b pb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">TIME SLOTS</h3>
                  <p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-[0.2em]">
                    {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center h-80 space-y-6">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  <p className="text-slate-300 font-black text-[10px] tracking-widest uppercase tracking-widest">Loading...</p>
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {slots.map(s => (
                    <button 
                      key={s.id} 
                      disabled={s.isBooked} 
                      onClick={() => { setSelectedSlot(s); setModalOpen(true); setStatus('idle'); }} 
                      className={`p-8 rounded-[2.5rem] border-2 transition-all text-left ${
                        s.isBooked ? 'bg-slate-50 border-slate-100 opacity-40 grayscale' : 'bg-white border-slate-100 hover:border-indigo-600 hover:shadow-xl'
                      }`}
                    >
                      <p className={`text-2xl font-black ${s.isBooked ? 'text-slate-400' : 'text-slate-900'}`}>{s.start} - {s.end}</p>
                      <p className="text-[10px] text-slate-400 font-black mt-3 uppercase tracking-widest">{s.isBooked ? '不可' : '予約'}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-300 font-bold">枠が見つかりません</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10 relative border border-white">
            <button onClick={() => setModalOpen(false)} className="absolute top-10 right-10 text-slate-300 text-3xl font-bold">×</button>
            {status === 'success' ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-10" />
                <h2 className="text-4xl font-black text-slate-800 mb-6 uppercase">Accepted</h2>
                <button onClick={() => { setModalOpen(false); setStatus('idle'); }} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-3xl font-black text-slate-800 mb-10 tracking-tighter uppercase border-l-4 border-indigo-600 pl-4">Reservation</h2>
                <div className="space-y-5">
                  <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input required className="w-full pl-14 pr-8 py-5 bg-slate-50 rounded-[1.5rem] outline-none font-bold text-sm" placeholder="お名前" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-
