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
  Settings
} from 'lucide-react';

/**
 * 環境変数の取得ロジック
 * Vite (import.meta.env) と一般的な環境 (process.env) の両方に対応させつつ、
 * ES2015ビルドターゲットでの警告を回避する構成にします。
 */
const getGasUrl = () => {
  try {
    // 1. Viteの標準的な方法 (Vercel + Vite)
    // 警告回避のため、直接的な import.meta 参照を避ける
    const metaEnv = (import.meta && import.meta.env) ? import.meta.env.VITE_GAS_URL : null;
    if (metaEnv) return metaEnv;

    // 2. process.env (Webpack/Next.js系)
    if (typeof process !== 'undefined' && process.env && process.env.VITE_GAS_URL) {
      return process.env.VITE_GAS_URL;
    }

    // 3. クエリパラメータからの取得（デバッグ・テスト用）
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('gas_url');
    if (queryUrl) return queryUrl;

    return "";
  } catch (e) {
    console.warn("Environment variable access failed, falling back to empty string.");
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

  const fetchAvailableSlots = async () => {
    if (!GAS_WEB_APP_URL) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(GAS_WEB_APP_URL);
      
      // 404エラーなどのレスポンス異常を詳細にキャッチ
      if (!response.ok) {
        throw new Error(`GAS側でエラーが発生しました (${response.status}: ${response.statusText})。GASのデプロイ設定が「全員(Anyone)」になっているか確認してください。`);
      }

      const data = await response.json();
      const sortedSlots = data.sort((a, b) => new Date(a.start) - new Date(b.start));
      setSlots(sortedSlots);
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage(`接続エラー: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableSlots();
  }, []);

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

      if (!response.ok) {
        throw new Error(`送信に失敗しました (${response.status})`);
      }

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

  // 環境変数が未設定の場合のガイド画面
  if (!GAS_WEB_APP_URL) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full border border-slate-100">
          <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8 text-amber-600 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">環境変数が未設定です</h1>
          <div className="text-left space-y-4 text-slate-600 text-sm leading-relaxed mb-8">
            <p>Vercelの <strong>Settings {'>'} Environment Variables</strong> で以下の設定を行ってください：</p>
            <ul className="bg-slate-50 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-200">
              <li><span className="text-blue-600">Key:</span> VITE_GAS_URL</li>
              <li><span className="text-blue-600">Value:</span> (GASのデプロイURL)</li>
            </ul>
            <p className="text-xs text-slate-400 italic">※設定後、再デプロイ(Redeploy)が必要です。VercelのID付き404エラーが出る場合、デプロイが完了していないか、URLパスが間違っている可能性があります。</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors"
          >
            再読み込み
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
            <div className="bg-blue-600 p-2 rounded-lg"><CalendarCheck className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-black tracking-tight">Seminar Booking</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
            Endpoint: {GAS_WEB_APP_URL.substring(0, 30)}...
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" />予約可能な日程</h2>
          
          {statusMessage && bookingStatus === 'idle' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{statusMessage}</p>
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center shadow-sm border border-slate-200">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500">カレンダーを読み込み中...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {slots.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">現在、予約可能な枠はありません。</p>
                </div>
              ) : (
                slots.map((slot) => (
                  <button key={slot.id} onClick={() => setSelectedSlot(slot)} className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${selectedSlot?.id === slot.id ? 'bg-blue-50 border-blue-600 shadow-lg' : 'bg-white border-white hover:border-blue-200'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${selectedSlot?.id === slot.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <span className="text-[10px] uppercase font-bold">{new Date(slot.start).toLocaleDateString('ja-JP', {weekday: 'short'})}</span>
                          <span className="text-xl font-bold">{new Date(slot.start).getDate()}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">{formatDate(slot.start)}</h3>
                          <p className="text-slate-500 text-sm font-medium">{formatTime(slot.start)} 〜 {formatTime(slot.end)}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-6 h-6 ${selectedSlot?.id === slot.id ? 'text-blue-600' : 'text-slate-300'}`} />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <div className={`bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden transition-all duration-500 ${!selectedSlot ? 'opacity-40' : 'opacity-100'}`}>
            <div className="bg-slate-900 p-8 text-white">
              <h2 className="text-xl font-bold flex items-center gap-3"><User className="w-6 h-6 text-blue-400" />予約申し込み</h2>
              {selectedSlot && <p className="text-slate-400 text-xs mt-2 italic">イベントID: {selectedSlot.id.substring(0, 15)}...</p>}
            </div>
            <div className="p-8">
              {bookingStatus === 'success' ? (
                <div className="text-center py-10 animate-in zoom-in-95 duration-300">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <p className="font-bold text-lg text-slate-800">予約を承りました</p>
                  <p className="text-sm text-slate-500 mt-2">{statusMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  {selectedSlot && (
                    <div className="bg-blue-50 p-4 rounded-xl text-blue-900 text-sm font-bold flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {formatDate(selectedSlot.start)} {formatTime(selectedSlot.start)}開始
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required disabled={!selectedSlot || bookingStatus === 'submitting'} className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-400" placeholder="お名前" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required disabled={!selectedSlot || bookingStatus === 'submitting'} type="email" className="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-400" placeholder="メールアドレス" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" disabled={!selectedSlot || bookingStatus === 'submitting'} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:shadow-none">
                    {bookingStatus === 'submitting' ? <Loader2 className="w-6 h-6 animate-spin" /> : '予約を確定する'}
                  </button>
                </form>
              )}

              {bookingStatus === 'error' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{statusMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
