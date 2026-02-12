import React, { useState, useEffect } from 'react';
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
  Search
} from 'lucide-react';

/**
 * 環境変数の取得ロジック (Vercel/Vite/CRA 全対応版)
 * ターゲット環境による制限を回避しつつ、確実にURLを取得します。
 */
const getGasUrl = () => {
  try {
    // 1. Vite (import.meta.env) - 警告回避の安全なアクセス
    const meta = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
    if (meta.VITE_GAS_URL) return meta.VITE_GAS_URL.trim();

    // 2. process.env (Webpack / Create React App)
    const proc = (typeof process !== 'undefined' && process.env) ? process.env : {};
    if (proc.VITE_GAS_URL) return proc.VITE_GAS_URL.trim();
    if (proc.REACT_APP_GAS_URL) return proc.REACT_APP_GAS_URL.trim();

    // 3. デバッグ用: URLパラメータ
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('gas_url');
    if (queryUrl) return queryUrl.trim();

    return "";
  } catch (e) {
    return "";
  }
};

const GAS_WEB_APP_URL = getGasUrl();

export default function App() {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  // 予約枠の取得
  const fetchAvailableSlots = async () => {
    if (!GAS_WEB_APP_URL) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setStatusMessage('');
    setDebugInfo(null);

    try {
      // タイムアウト設定
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(GAS_WEB_APP_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        setDebugInfo({
          status: response.status,
          statusText: response.statusText,
          url: GAS_WEB_APP_URL
        });
        throw new Error(`GAS側から ${response.status} エラーが返されました。URLが正しいか確認してください。`);
      }

      const data = await response.json();
      const sortedSlots = data.sort((a, b) => new Date(a.start) - new Date(b.start));
      setSlots(sortedSlots);
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage(err.name === 'AbortError' ? "通信がタイムアウトしました。再試行してください。" : err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableSlots();
  }, []);

  // 予約送信
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !formData.name || !formData.email) return;
    setBookingStatus('submitting');
    
    try {
      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          eventId: selectedSlot.id,
          userName: formData.name,
          userEmail: formData.email,
        }),
      });

      if (!response.ok) throw new Error(`送信失敗: ${response.status}`);

      const result = await response.json();
      if (result.success) {
        setBookingStatus('success');
        setStatusMessage(result.message);
        setTimeout(() => {
          setSelectedSlot(null);
          setFormData({ name: '', email: '' });
          setBookingStatus('idle');
          fetchAvailableSlots();
        }, 5000);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setBookingStatus('error');
      setStatusMessage(err.message || "通信エラーが発生しました。");
    }
  };

  const formatDate = (isoString) => new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(isoString));
  const formatTime = (isoString) => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(isoString));

  // 環境変数が未設定、またはURLが明らかに異常な場合
  if (!GAS_WEB_APP_URL || !GAS_WEB_APP_URL.startsWith('https')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full border border-slate-100 animate-in fade-in zoom-in duration-300">
          <Settings className="w-12 h-12 text-amber-500 mx-auto mb-6 animate-spin-slow" />
          <h1 className="text-2xl font-bold text-slate-800 mb-4">初期設定が完了していません</h1>
          <div className="text-left space-y-4 text-slate-600 text-sm leading-relaxed mb-8">
            <p>Vercelの管理画面で環境変数を設定し、<strong>再デプロイ</strong>してください。</p>
            <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-[11px] space-y-2">
              <p><span className="text-pink-400">Key:</span> VITE_GAS_URL</p>
              <p><span className="text-pink-400">Value:</span> https://script.google.com/macros/s/.../exec</p>
            </div>
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>URLの末尾が <code>/exec</code> になっていることを必ず確認してください。</p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
            <RefreshCcw className="w-4 h-4" /> ページを更新
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-10">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200"><CalendarCheck className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-black tracking-tight text-slate-800">Seminar Booking</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 shadow-inner">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-slate-500 font-mono font-bold truncate max-w-[120px]">
              API: {GAS_WEB_APP_URL.split('/').pop().substring(0, 10)}...
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-10">
        {/* 左側：日程選択 */}
        <div className="lg:col-span-7">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" />予約可能な日程</h2>
          
          {statusMessage && bookingStatus === 'idle' && (
            <div className="mb-6 p-5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex flex-col gap-3 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-bold">{statusMessage}</p>
              </div>
              {debugInfo && (
                <div className="text-[10px] bg-white/50 p-3 rounded-lg font-mono border border-red-100 overflow-x-auto">
                  <p className="font-bold text-red-400">DEBUG INFO:</p>
                  <p>HTTP {debugInfo.status} {debugInfo.statusText}</p>
                  <p className="truncate">URL: {debugInfo.url}</p>
                </div>
              )}
              <button onClick={fetchAvailableSlots} className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                <RefreshCcw className="w-3 h-3" /> 再読み込み
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-3xl p-24 flex flex-col items-center justify-center shadow-sm border border-slate-200">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-400 font-medium tracking-wide">カレンダーを取得中</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {slots.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">現在、予約可能な枠が見つかりませんでした。</p>
                  <button onClick={fetchAvailableSlots} className="mt-4 text-sm text-blue-600 font-bold hover:underline">最新の状態に更新</button>
                </div>
              ) : (
                slots.map((slot) => (
                  <button key={slot.id} onClick={() => setSelectedSlot(slot)} className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 ${selectedSlot?.id === slot.id ? 'bg-blue-50 border-blue-600 shadow-xl scale-[1.02]' : 'bg-white border-white hover:border-blue-200 hover:shadow-md'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${selectedSlot?.id === slot.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500'}`}>
                          <span className="text-[10px] uppercase font-bold">{new Date(slot.start).toLocaleDateString('ja-JP', {weekday: 'short'})}</span>
                          <span className="text-xl font-bold">{new Date(slot.start).getDate()}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{formatDate(slot.start)}</h3>
                          <p className="text-slate-500 text-sm font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(slot.start)} 〜 {formatTime(slot.end)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`w-6 h-6 transition-transform ${selectedSlot?.id === slot.id ? 'text-blue-600 translate-x-1' : 'text-slate-300'}`} />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 右側：フォーム */}
        <div className="lg:col-span-5">
          <div className={`bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden transition-all duration-500 sticky top-28 ${!selectedSlot ? 'opacity-40 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><User className="w-24 h-24" /></div>
              <h2 className="text-xl font-bold flex items-center gap-3 relative z-10"><User className="w-6 h-6 text-blue-400" />予約申し込み</h2>
              <p className="text-slate-400 text-xs mt-2 relative z-10">選択した日程でセミナー予約を確定します。</p>
            </div>
            
            <div className="p-8">
              {bookingStatus === 'success' ? (
                <div className="text-center py-10 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <p className="font-bold text-xl text-slate-800">予約が完了しました！</p>
                  <p className="text-sm text-slate-500 mt-3 leading-relaxed">{statusMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  {selectedSlot && (
                    <div className="bg-blue-50/80 p-5 rounded-2xl text-blue-900 text-sm font-bold flex items-center gap-3 border border-blue-100">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-[10px] text-blue-500 uppercase tracking-tighter">Selected Date</p>
                        <p className="text-base">{formatDate(selectedSlot.start)} {formatTime(selectedSlot.start)}開始</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="group relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input required disabled={!selectedSlot || bookingStatus === 'submitting'} className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="お名前" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="group relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input required disabled={!selectedSlot || bookingStatus === 'submitting'} type="email" className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="メールアドレス" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>

                  <button type="submit" disabled={!selectedSlot || bookingStatus === 'submitting'} className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:shadow-none">
                    {bookingStatus === 'submitting' ? <Loader2 className="w-6 h-6 animate-spin" /> : '予約を確定する'}
                  </button>
                </form>
              )}

              {bookingStatus === 'error' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 animate-in fade-in duration-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold">{statusMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
