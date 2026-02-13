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
 * 各種ビルド環境（Vite, Webpack, Vercel）でクラッシュしないように
 * 段階的に安全なアクセスを試みます。
 */
const getInitialGasUrl = () => {
  try {
    // 1. ブラウザのローカルストレージ（診断モードで保存した値）
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('DEBUG_GAS_URL');
      if (saved && saved.startsWith('https')) return saved.trim();
    }

    // 2. Viteの環境変数 (Vercelのデプロイで一般的に使用)
    // 直接 import.meta.env を参照すると未定義時にクラッシュするため、存在確認を行う
    let viteEnv = "";
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        viteEnv = import.meta.env.VITE_GAS_URL || "";
      }
    } catch (e) {
      // ignore
    }
    if (viteEnv) return viteEnv.trim();

    // 3. Node.js/Webpack系の環境変数
    let nodeEnv = "";
    try {
      if (typeof process !== 'undefined' && process.env) {
        nodeEnv = process.env.VITE_GAS_URL || process.env.REACT_APP_GAS_URL || "";
      }
    } catch (e) {
      // ignore
    }
    if (nodeEnv) return nodeEnv.trim();

    // 4. URLパラメータ (?gas_url=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryUrl = params.get('gas_url');
      if (queryUrl) return queryUrl.trim();
    }

    return "";
  } catch (e) {
    console.error("Critical error in environment variable resolution:", e);
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
  const [bookingStatus, setBookingStatus] = useState('idle'); // idle | submitting | success | error
  const [statusMessage, setStatusMessage] = useState('');

  // マウント時にURLを一度だけ解決
  useEffect(() => {
    setGasUrl(getInitialGasUrl());
  }, []);

  // 予約可能枠の取得
  const fetchAvailableSlots = useCallback(async (targetUrl = gasUrl) => {
    if (!targetUrl || !targetUrl.startsWith('https')) return;
    
    setIsLoading(true);
    setStatusMessage('');

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`GASサーバーからエラーが返されました (${response.status})`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setSlots(data.sort((a, b) => new Date(a.start) - new Date(b.start)));
      } else {
        setSlots([]);
        console.warn("Received data is not an array:", data);
      }
    } catch (err) {
      console.error("Fetch failure:", err);
      setStatusMessage("予約データの取得に失敗しました。URLとGASの「全員」への公開設定を確認してください。");
    } finally {
      setIsLoading(false);
    }
  }, [gasUrl]);

  // URLが決まったらフェッチを開始
  useEffect(() => {
    if (gasUrl) {
      fetchAvailableSlots();
    }
  }, [gasUrl, fetchAvailableSlots]);

  // 手動でURLを設定する（診断用）
  const handleManualUrlSubmit = (e) => {
    e.preventDefault();
    if (!manualUrl.startsWith('https')) {
      alert("https:// から始まるGASのURLを入力してください。");
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG_GAS_URL', manualUrl);
    }
    setGasUrl(manualUrl);
  };

  // 予約処理の送信
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

      if (!response.ok) throw new Error("送信中にエラーが発生しました。");

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
        throw new Error(result.message || "予約の受け付けに失敗しました。");
      }
    } catch (err) {
      setBookingStatus('error');
      setStatusMessage(err.message || "通信エラーが発生しました。");
    }
  };

  const formatDate = (iso) => new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(iso));
  const formatTime = (iso) => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

  // --- 設定が完了していない場合の画面 ---
  if (!gasUrl) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-slate-100 animate-in fade-in zoom-in duration-500">
          <div className="bg-amber-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Settings className="w-10 h-10 text-amber-600 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 text-center mb-4 italic tracking-tight">System Initialization</h1>
          <p className="text-slate-500 text-sm text-center mb-10 leading-relaxed px-2">
            バックエンドのURLが取得できませんでした。<br/>
            以下に直接GASのURL（/execで終わるもの）を入力して動作を確認してください。
          </p>
          <form onSubmit={handleManualUrlSubmit} className="space-y-4">
            <div className="relative">
              <input 
                type="text" 
                value={manualUrl} 
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://script.google.com/..."
                className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-600 outline-none text-sm transition-all shadow-inner font-mono text-xs"
              />
            </div>
            <button className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform">
              接続設定を保存して開始 <ArrowRight size={20} />
            </button>
          </form>
          <div className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
            Vercel Env: VITE_GAS_URL
          </div>
        </div>
      </div>
    );
  }

  // --- メイン画面 ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-10">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
              <CalendarCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-800">Reservation Platform</span>
          </div>
          <button 
            onClick={() => { if(window.confirm('設定をリセットしますか？')){ localStorage.removeItem('DEBUG_GAS_URL'); window.location.reload(); } }} 
            className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors bg-slate-50 px-4 py-2 rounded-full uppercase tracking-tighter border border-slate-100 shadow-sm"
          >
            System Reset
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-12 mt-8">
        {/* スロット一覧 */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-black text-slate-400 flex items-center gap-3 uppercase tracking-[0.2em] text-[11px]">
              <Clock size={16} className="text-blue-600" /> 
              Available Slots
            </h2>
            <button 
              onClick={() => fetchAvailableSlots()} 
              disabled={isLoading}
              className="p-2 hover:bg-white hover:shadow-lg rounded-full transition-all active:scale-90 bg-white shadow-sm"
            >
              <RefreshCcw size={16} className={`text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-[2.5rem] p-32 flex flex-col items-center border border-slate-100 shadow-sm">
              <Loader2 className="animate-spin text-blue-600 mb-6" size={40} />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Synchronizing...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] p-24 text-center border-2 border-dashed border-slate-200 shadow-sm">
              <Search className="mx-auto text-slate-100 mb-8" size={64} />
              <p className="text-slate-500 font-bold text-lg">空き枠が見つかりませんでした</p>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">管理カレンダーに「予約可能」枠があるか<br/>確認してください。</p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {slots.map(slot => (
                <button 
                  key={slot.id} 
                  onClick={() => setSelectedSlot(slot)}
                  className={`group w-full p-8 rounded-[2rem] border-2 text-left transition-all duration-500 flex justify-between items-center ${
                    selectedSlot?.id === slot.id 
                    ? 'border-blue-600 bg-blue-50 shadow-2xl shadow-blue-900/10 -translate-y-2' 
                    : 'border-white bg-white hover:border-blue-100 hover:shadow-xl hover:-translate-y-1'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 shadow-inner ${
                      selectedSlot?.id === slot.id ? 'bg-blue-600 text-white shadow-blue-400' : 'bg-slate-50 text-slate-400'
                    }`}>
                      <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(slot.start).toLocaleDateString('ja-JP', {weekday: 'short'})}</span>
                      <span className="text-2xl font-black leading-none">{new Date(slot.start).getDate()}</span>
                    </div>
                    <div>
                      <p className={`font-black text-xl tracking-tight ${selectedSlot?.id === slot.id ? 'text-blue-900' : 'text-slate-800'}`}>
                        {formatDate(slot.start)}
                      </p>
                      <p className="text-xs text-slate-400 font-black flex items-center gap-2 mt-2 uppercase tracking-wide opacity-70">
                        <Clock size={12} className="text-blue-500" /> {formatTime(slot.start)} — {formatTime(slot.end)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={24} className={`transition-all duration-500 ${selectedSlot?.id === slot.id ? 'text-blue-600 translate-x-2' : 'text-slate-200 group-hover:text-slate-400'}`} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* フォーム */}
        <section>
          <div className={`bg-white p-10 md:p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 sticky top-32 transition-all duration-700 ${!selectedSlot ? 'opacity-30 pointer-events-none translate-y-12 grayscale-[0.5]' : 'opacity-100 translate-y-0'}`}>
            <div className="flex items-center gap-5 mb-12">
              <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-200">
                <User className="text-blue-400" size={28} />
              </div>
              <div>
                <h2 className="font-black text-3xl text-slate-900 tracking-tighter leading-none">Booking</h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Information Form</p>
              </div>
            </div>

            {bookingStatus === 'success' ? (
              <div className="text-center py-12 animate-in fade-in zoom-in duration-700">
                <div className="bg-green-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
                  <CheckCircle size={56} className="text-green-500" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">予約完了</h3>
                <p className="text-slate-500 text-sm leading-relaxed px-8 font-medium italic">{statusMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-8">
                {selectedSlot && (
                  <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 flex items-center gap-5 shadow-inner">
                    <div className="bg-white p-3 rounded-xl shadow-sm text-blue-600 font-black"><Calendar size={20} /></div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Selected schedule</p>
                      <p className="text-lg font-black text-slate-800">{formatDate(selectedSlot.start)} {formatTime(selectedSlot.start)}開始</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-5">
                  <div className="group relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors duration-300" size={20} />
                    <input 
                      required 
                      disabled={!selectedSlot || bookingStatus === 'submitting'}
                      placeholder="お名前（フルネーム）" 
                      className="w-full pl-16 pr-8 py-6 rounded-[1.25rem] bg-slate-50/50 outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 transition-all duration-300 font-bold placeholder:text-slate-300 shadow-inner text-base" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div className="group relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors duration-300" size={20} />
                    <input 
                      required 
                      disabled={!selectedSlot || bookingStatus === 'submitting'}
                      type="email" 
                      placeholder="メールアドレス" 
                      className="w-full pl-16 pr-8 py-6 rounded-[1.25rem] bg-slate-50/50 outline-none focus:bg-white border-2 border-transparent focus:border-blue-600 transition-all duration-300 font-bold placeholder:text-slate-300 shadow-inner text-base" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                </div>

                <button 
                  disabled={!selectedSlot || bookingStatus === 'submitting'}
                  className="w-full bg-slate-900 hover:bg-black text-white font-black py-7 rounded-[1.5rem] transition-all duration-500 shadow-2xl shadow-slate-300 flex items-center justify-center gap-4 active:scale-[0.98] mt-6 text-lg tracking-tight"
                >
                  {bookingStatus === 'submitting' ? (
                    <Loader2 className="animate-spin" size={28} />
                  ) : (
                    <>予約を確定する <ArrowRight size={24} className="text-blue-400" /></>
                  )}
                </button>
              </form>
            )}

            {bookingStatus === 'error' && (
              <div className="mt-10 p-5 bg-red-50 border border-red-100 text-red-600 rounded-[1.25rem] flex items-start gap-4 animate-shake shadow-sm">
                <AlertCircle size={22} className="shrink-0 mt-1" />
                <p className="text-xs font-black leading-relaxed tracking-tight">{statusMessage}</p>
              </div>
            )}
          </div>
          
          <div className="text-center mt-12 opacity-30">
            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">Secure Reservation Protocol v2.5</p>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default App;
