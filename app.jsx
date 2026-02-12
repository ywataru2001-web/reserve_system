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
  Info
} from 'lucide-react';

/**
 * 環境変数の取得
 * ES2015ターゲットでの互換性を保つため、process.env を使用して参照します。
 * Vercelの環境変数設定で VITE_GAS_URL というキー名でGASのURLを保存してください。
 */
const getGasUrl = () => {
  // Vite, Next.js, Webpackなど複数の環境に対応するためのフォールバック
  try {
    return process.env.VITE_GAS_URL || "";
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

  const fetchAvailableSlots = async () => {
    if (!GAS_WEB_APP_URL) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(GAS_WEB_APP_URL);
      
      if (!response.ok) {
        throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const sortedSlots = data.sort((a, b) => new Date(a.start) - new Date(b.start));
      setSlots(sortedSlots);
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage(`予約枠の取得に失敗しました: ${err.message}`);
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
        throw new Error(`送信エラー: ${response.status} ${response.statusText}`);
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

  if (!GAS_WEB_APP_URL) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full border border-slate-100">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">環境変数の設定が必要です</h1>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            Vercelのダッシュボードで <code>VITE_GAS_URL</code> を設定してください。<br/>
            設定後、Vercelで一度<strong>再デプロイ（Redeploy）</strong>を行う必要があります。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-10">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><CalendarCheck className="w-6 h-6 text-white" /></div>
          <span className="text-xl font-black tracking-tight">Seminar Booking</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-600" />予約可能な日程</h2>
          
          {statusMessage && bookingStatus === 'idle' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{statusMessage}</p>
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center shadow-sm border border-slate-200">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500">読み込み中...</p>
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
          <div className={`bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden transition-all ${!selectedSlot ? 'opacity-40' : 'opacity-100'}`}>
            <div className="bg-slate-900 p-8 text-white"><h2 className="text-xl font-bold flex items-center gap-3"><User className="w-6 h-6 text-blue-400" />予約申し込み</h2></div>
            <div className="p-8">
              {bookingStatus === 'success' ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <p className="font-bold text-lg">予約が完了しました！</p>
                  <p className="text-sm text-slate-500 mt-2">{statusMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  {selectedSlot && (
                    <div className="bg-blue-50 p-4 rounded-xl text-blue-900 text-sm font-bold">
                      {formatDate(selectedSlot.start)} {formatTime(selectedSlot.start)}開始
                    </div>
                  )}
                  <div className="space-y-4">
                    <input required disabled={!selectedSlot || bookingStatus === 'submitting'} className="w-full px-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all" placeholder="お名前" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    <input required disabled={!selectedSlot || bookingStatus === 'submitting'} type="email" className="w-full px-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all" placeholder="メールアドレス" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <button type="submit" disabled={!selectedSlot || bookingStatus === 'submitting'} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3">
                    {bookingStatus === 'submitting' ? <Loader2 className="w-6 h-6 animate-spin" /> : '予約を確定する'}
                  </button>
                </form>
              )}

              {bookingStatus === 'error' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3">
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
