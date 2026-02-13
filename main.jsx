import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  Loader2,
  CalendarCheck,
  Info,
  Settings,
  RefreshCcw,
  Search,
  ArrowRight
} from 'lucide-react';

/**
 * 環境変数の取得ヘルパー
 * Vite/Vercel環境で安全に動作するように構成しています。
 */
const getInitialGasUrl = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('DEBUG_GAS_URL');
      if (saved && saved.startsWith('https')) return saved.trim();
    }

    const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) 
      ? import.meta.env.VITE_GAS_URL 
      : undefined;
    
    if (viteEnv) return viteEnv.trim();

    const nodeEnv = (typeof process !== 'undefined' && process.env)
      ? process.env.VITE_GAS_URL || process.env.REACT_APP_GAS_URL
      : undefined;

    if (nodeEnv) return nodeEnv.trim();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryUrl = params.get('gas_url');
      if (queryUrl) return queryUrl.trim();
    }

    return "";
  } catch (e) {
    console.error("Environment variable access error:", e);
    return "";
  }
};

const App = () => {
  const [gasUrl, setGasUrl] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setGasUrl(getInitialGasUrl());
  }, []);

  const fetchAvailableSlots = useCallback(async (targetUrl = gasUrl) => {
    if (!targetUrl || !targetUrl.startsWith('https')) return;
    
    setIsLoading(true);
    setStatusMessage('');

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`サーバーエラー: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setSlots(data.sort((a, b) => new Date(a.start) - new Date(b.start)));
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage("データの取得に失敗しました。URLとGASの公開設定を確認してください。");
    } finally {
      setIsLoading(false);
    }
  }, [gasUrl]);

  useEffect(() => {
    if (gasUrl) {
      fetchAvailableSlots();
    }
  }, [gasUrl, fetchAvailableSlots]);

  const handleManualUrlSubmit = (e) => {
    e.preventDefault();
    if (!manualUrl.startsWith('https')) {
      alert("https:// から始まるURLを入力してください。");
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG_GAS_URL', manualUrl);
    }
    setGasUrl(manualUrl);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setBookingStatus('submitting');
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          eventId: selectedSlot.id,
          userName: formData.name,
          userEmail: formData.email,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setBookingStatus('success');
        setStatusMessage(result.message || "予約が完了しました。");
        setTimeout(() => {
          setSelectedSlot(null);
          setFormData({ name: '', email: '' });
          setBookingStatus('idle');
          fetchAvailableSlots();
        }, 5000);
      } else {
        throw new Error(result.message || "予約に失敗しました。");
      }
    } catch (err) {
      setBookingStatus('error');
      setStatusMessage(err.message || "通信エラーが発生しました。");
    }
  };

  const formatDate = (iso) => new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(iso));
  const formatTime = (iso) => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

  if (!gasUrl) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100 animate-in fade-in zoom-in duration-300">
          <div className="bg-amber-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 text-center mb-4">接続設定</h1>
          <p className="text-slate-500 text-sm text-center mb-8 leading-relaxed">
            GASのURLが設定されていません。<br/>
            以下に直接入力するか、Vercelの環境変数を設定してください。
          </p>
          <form onSubmit={handleManualUrlSubmit} className="space-y-4">
            <input 
              type="text" 
              value={manualUrl} 
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-600 outline-none text-sm transition-all shadow-inner"
            />
            <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-transform active:scale-95">
              設定を保存して開始 <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-10">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200"><CalendarCheck className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-black tracking-tight text-slate-800">Seminar Booking</span>
          </div>
          <button 
            onClick={() => { localStorage.removeItem('DEBUG_GAS_URL'); window.location.reload(); }} 
            className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter"
          >
            Settings Reset
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-10 mt-6">
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-bold text-slate-700 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Clock size={16} className="text-blue-600" /> 
              予約可能な日程
            </h2>
            <button 
              onClick={() => fetchAvailableSlots()} 
              disabled={isLoading}
              className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all active:scale-90"
            >
              <RefreshCcw size={16} className={`text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-[2rem] p-24 flex flex-col items-center border border-slate-100 shadow-sm">
              <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
              <p className="text-slate-400 text-sm font-medium">取得中...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-slate-200 shadow-sm">
              <Search className="mx-auto text-slate-200 mb-6" size={48} />
              <p className="text-slate-500 font-medium">予約可能な枠はありません。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {slots.map(slot => (
                <button 
                  key={slot.id} 
                  onClick={() => setSelectedSlot(slot)}
                  className={`group w-full p-6 rounded-2xl border-2 text-left transition-all duration-300 flex justify-between items-center ${
                    selectedSlot?.id === slot.id 
                    ? 'border-blue-600 bg-blue-50 shadow-2xl shadow-blue-900/10 -translate-y-1' 
                    : 'border-white bg-white hover:border-blue-200 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-colors ${selectedSlot?.id === slot.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <span className="text-[10px] font-bold uppercase">{new Date(slot.start).toLocaleDateString('ja-JP', {weekday: 'short'})}</span>
                      <span className="text-lg font-black leading-none">{new Date(slot.start).getDate()}</span>
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${selectedSlot?.id === slot.id ? 'text-blue-900' : 'text-slate-800'}`}>{formatDate(slot.start)}</p>
                      <p className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-1 opacity-80">
                        <Clock size={12} /> {formatTime(slot.start)} - {formatTime(slot.end)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className={`transition-all ${selectedSlot?.id === slot.id ? 'text-blue-600 translate-x-1' : 'text-slate-300 group-hover:text-slate-400'}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className={`bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-slate-100 sticky top-28 transition-all duration-500 ${!selectedSlot ? 'opacity-30 pointer-events-none translate-y-6 blur-[1px]' : 'opacity-100 translate-y-0'}`}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <User className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="font-black text-2xl text-slate-800 leading-tight">予約申し込み</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Reservation Form</p>
              </div>
            </div>

            {bookingStatus === 'success' ? (
              <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
                <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-green-900/5">
                  <CheckCircle size={48} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3">予約が確定しました</h3>
                <p className="text-slate-500 text-sm leading-relaxed px-6">{statusMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-6">
                {selectedSlot && (
                  <div className="bg-slate-900 p-5 rounded-2xl text-white text-sm font-bold flex items-center gap-4 shadow-xl shadow-slate-200">
                    <div className="bg-blue-600 p-2 rounded-lg"><Info size={20} /></div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter mb-0.5">Selected Schedule</p>
                      <p className="text-base">{formatDate(selectedSlot.start)} {formatTime(selectedSlot.start)}開始</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4 pt-4">
                  <div className="group relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                      required 
                      disabled={!selectedSlot || bookingStatus === 'submitting'}
                      placeholder="お名前" 
                      className="w-full pl-12 pr-4 py-5 rounded-2xl bg-slate-50 outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 transition-all font-bold placeholder:text-slate-300 shadow-inner" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div className="group relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                      required 
                      disabled={!selectedSlot || bookingStatus === 'submitting'}
                      type="email" 
                      placeholder="メールアドレス" 
                      className="w-full pl-12 pr-4 py-5 rounded-2xl bg-slate-50 outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 transition-all font-bold placeholder:text-slate-300 shadow-inner" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                </div>

                <button 
                  disabled={!selectedSlot || bookingStatus === 'submitting'}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-3xl transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-[0.98] mt-4"
                >
                  {bookingStatus === 'submitting' ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>予約内容を確定する <ArrowRight size={20} /></>
                  )}
                </button>
              </form>
            )}

            {bookingStatus === 'error' && (
              <div className="mt-8 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 animate-shake">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed">{statusMessage}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default App;
