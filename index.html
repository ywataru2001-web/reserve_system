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
  Globe,
  ArrowRight
} from 'lucide-react';

/**
 * 環境変数の取得ロジック
 */
const getInitialGasUrl = () => {
  try {
    // 1. ローカルストレージに保存された手動設定値があれば優先
    const saved = localStorage.getItem('DEBUG_GAS_URL');
    if (saved && saved.startsWith('https')) return saved.trim();

    // 2. Vite (import.meta.env)
    const meta = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
    if (meta.VITE_GAS_URL) return meta.VITE_GAS_URL.trim();

    // 3. process.env
    const proc = (typeof process !== 'undefined' && process.env) ? process.env : {};
    if (proc.VITE_GAS_URL) return proc.VITE_GAS_URL.trim();

    // 4. URLパラメータ
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('gas_url');
    if (queryUrl) return queryUrl.trim();

    return "";
  } catch (e) {
    return "";
  }
};

export default function App() {
  const [gasUrl, setGasUrl] = useState(getInitialGasUrl());
  const [manualUrl, setManualUrl] = useState("");
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  // 予約枠の取得
  const fetchAvailableSlots = useCallback(async (targetUrl = gasUrl) => {
    if (!targetUrl || !targetUrl.startsWith('https')) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setStatusMessage('');
    setDebugInfo(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        setDebugInfo({
          status: response.status,
          statusText: response.statusText,
          url: targetUrl
        });
        throw new Error(`接続先から ${response.status} エラーが返されました。URLが正しいか確認してください。`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("データの形式が正しくありません。");
      
      const sortedSlots = data.sort((a, b) => new Date(a.start) - new Date(b.start));
      setSlots(sortedSlots);
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage(err.name === 'AbortError' ? "通信がタイムアウトしました。" : err.message);
    } finally {
      setIsLoading(false);
    }
  }, [gasUrl]);

  useEffect(() => {
    if (gasUrl) fetchAvailableSlots();
  }, [gasUrl, fetchAvailableSlots]);

  // 手動でURLを設定してテストする
  const handleManualUrlSubmit = (e) => {
    e.preventDefault();
    if (!manualUrl.startsWith('https')) {
      setStatusMessage("URLは https:// から始まる必要があります。");
      return;
    }
    localStorage.setItem('DEBUG_GAS_URL', manualUrl);
    setGasUrl(manualUrl);
    fetchAvailableSlots(manualUrl);
  };

  const clearManualUrl = () => {
    localStorage.removeItem('DEBUG_GAS_URL');
    window.location.reload();
  };

  // 予約送信
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !formData.name || !formData.email) return;
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

  // 1. URLが全く設定されていない場合、または診断が必要な場合
  if (!gasUrl) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-xl w-full border border-slate-100 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center text-center">
            <div className="bg-amber-100 p-4 rounded-3xl mb-6">
              <Settings className="w-10 h-10 text-amber-600 animate-spin-slow" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-4">接続設定が見つかりません</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 px-4">
              Vercelの環境変数 <code>VITE_GAS_URL</code> が読み込めていないか、まだ設定されていません。<br/>
              <strong>デバッグ用に、以下に直接GASのデプロイURLを入力してテストできます：</strong>
            </p>

            <form onSubmit={handleManualUrlSubmit} className="w-full space-y-4">
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-600 outline-none transition-all text-sm font-mono"
                />
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2">
                URLを設定して接続テスト <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-100 w-full text-left">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">本来の設定方法 (Vercel)</h3>
              <ol className="text-xs text-slate-500 space-y-2 list-decimal ml-4">
                <li>Vercel Project Settings {'>'} Environment Variables</li>
                <li>Key: <code>VITE_GAS_URL</code> / Value: (GASのURL) を追加</li>
                <li><strong>Deployments 画面から "Redeploy" を実行</strong>（重要）</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-10">
      {/* 診断バー: 手動設定中の場合のみ表示 */}
      {localStorage.getItem('DEBUG_GAS_URL') && (
        <div className="bg-amber-500 text-white text-[10px] font-bold py-1 px-4 flex justify-between items-center">
          <span>⚠️ 診断モード: ブラウザに一時保存されたURLを使用中</span>
          <button onClick={clearManualUrl} className="underline hover:no-underline">リセットして環境変数に戻す</button>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg"><CalendarCheck className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-black tracking-tight text-slate-800">Seminar Booking</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-slate-500 font-mono font-bold truncate max-w-[150px]">
              ID: {gasUrl.split('/')[5]?.substring(0, 10)}...
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" />予約可能な日程</h2>
          
          {statusMessage && bookingStatus === 'idle' && (
            <div className="mb-6 p-5 bg-red-50 border border-red-200 text-red-800 rounded-2xl animate-in slide-in-from-top-4">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-bold">{statusMessage}</p>
              </div>
              {debugInfo && (
                <div className="text-[10px] bg-white/50 p-3 rounded-lg font-mono border border-red-100 mb-3">
                  <p className="font-bold text-red-400 mb-1">診断データ:</p>
                  <p>Status: {debugInfo.status} {debugInfo.statusText}</p>
                  <p className="break-all text-slate-400">Target: {debugInfo.url}</p>
                </div>
              )}
              <div className="flex gap-4">
                <button onClick={() => fetchAvailableSlots()} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  <RefreshCcw className="w-3 h-3" /> 再試行
                </button>
                <button onClick={() => setGasUrl("")} className="text-xs font-bold text-slate-500 hover:underline flex items-center gap-1">
                  URLを再設定する
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-3xl p-24 flex flex-col items-center justify-center shadow-sm border border-slate-200">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-400 font-medium">カレンダー取得中...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {slots.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">予約可能な枠が見つかりませんでした。</p>
                  <p className="text-xs text-slate-400 mt-2">カレンダーに「予約可能」という名前の予定があるか確認してください。</p>
                </div>
              ) : (
                slots.map((slot) => (
                  <button 
                    key={slot.id} 
                    onClick={() => setSelectedSlot(slot)} 
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                      selectedSlot?.id === slot.id 
                      ? 'bg-blue-50 border-blue-600 shadow-xl scale-[1.02]' 
                      : 'bg-white border-white hover:border-blue-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${
                          selectedSlot?.id === slot.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'
                        }`}>
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

        <div className="lg:col-span-5">
          <div className={`bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden transition-all duration-500 sticky top-28 ${!selectedSlot ? 'opacity-40 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className="bg-slate-900 p-8 text-white relative">
              <h2 className="text-xl font-bold flex items-center gap-3"><User className="w-6 h-6 text-blue-400" />予約申し込み</h2>
              <p className="text-slate-400 text-xs mt-2 italic">ご入力内容を確認して確定ボタンを押してください。</p>
            </div>
            
            <div className="p-8">
              {bookingStatus === 'success' ? (
                <div className="text-center py-10 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
                        <p className="text-[10px] text-blue-500 uppercase">Selected Date</p>
                        <p className="text-base">{formatDate(selectedSlot.start)} {formatTime(selectedSlot.start)}開始</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required disabled={!selectedSlot || bookingStatus === 'submitting'} className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all font-medium" placeholder="お名前" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required disabled={!selectedSlot || bookingStatus === 'submitting'} type="email" className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all font-medium" placeholder="メールアドレス" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>

                  <button type="submit" disabled={!selectedSlot || bookingStatus === 'submitting'} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:bg-slate-200">
                    {bookingStatus === 'submitting' ? <Loader2 className="w-6 h-6 animate-spin" /> : '予約を確定する'}
                  </button>
                </form>
              )}

              {bookingStatus === 'error' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3">
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
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}
