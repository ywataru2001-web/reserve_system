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
 * 設定: GASの「ウェブアプリ」URLをここに設定します
 * デプロイ後のURL (https://script.google.com/macros/s/.../exec) を貼り付けてください
 */
const GAS_WEB_APP_URL = ""; 

export default function App() {
  // ステート管理
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [bookingStatus, setBookingStatus] = useState('idle'); // idle | submitting | success | error
  const [statusMessage, setStatusMessage] = useState('');

  // 予約枠の取得 (GASからGET)
  const fetchAvailableSlots = async () => {
    if (!GAS_WEB_APP_URL) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(GAS_WEB_APP_URL);
      const data = await response.json();
      // 未来の日時順に並び替え
      const sortedSlots = data.sort((a, b) => new Date(a.start) - new Date(b.start));
      setSlots(sortedSlots);
    } catch (err) {
      console.error("Fetch error:", err);
      setStatusMessage("予約枠の取得に失敗しました。接続設定を確認してください。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableSlots();
  }, []);

  // 予約の実行 (GASへPOST)
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !formData.name || !formData.email) return;

    setBookingStatus('submitting');
    
    try {
      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        mode: 'cors', // CORS対応
        headers: {
          'Content-Type': 'text/plain', // GASのPOST制約による
        },
        body: JSON.stringify({
          eventId: selectedSlot.id,
          userName: formData.name,
          userEmail: formData.email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBookingStatus('success');
        setStatusMessage(result.message || "予約が確定しました！");
        // 成功後、リストを更新するために少し待ってからリセット
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
      console.error("Submit error:", err);
      setBookingStatus('error');
      setStatusMessage(err.message || "通信エラーが発生しました。");
    }
  };

  // 日時フォーマット関数
  const formatDate = (isoString) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }).format(new Date(isoString));
  };

  const formatTime = (isoString) => {
    return new Intl.DateTimeFormat('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  };

  // URL未設定時のプレースホルダ
  if (!GAS_WEB_APP_URL) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center border border-slate-100">
          <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">初期設定が必要です</h1>
          <p className="text-slate-600 leading-relaxed mb-6">
            <code>GAS_WEB_APP_URL</code> 変数にデプロイしたGASのURLを設定してください。<br/>
            これによりGoogleカレンダーとの通信が有効になります。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* ナビゲーション */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CalendarCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-800">Seminar Booking</span>
          </div>
          <div className="hidden md:block text-sm text-slate-500 font-medium">
            管理者カレンダーと同期中
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* 左カラム: 日時選択 */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                予約可能な日程
              </h2>
              <span className="text-xs font-semibold bg-slate-200 px-3 py-1 rounded-full text-slate-600">
                {slots.length}件の空き
              </span>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-20 flex flex-col items-center justify-center shadow-sm">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium text-lg">カレンダーを読み込み中...</p>
              </div>
            ) : slots.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center shadow-sm">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">現在、受付中の枠はありません。</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`group w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                      selectedSlot?.id === slot.id
                        ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-50 shadow-lg'
                        : 'bg-white border-white hover:border-blue-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-colors ${
                          selectedSlot?.id === slot.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className="text-[10px] uppercase font-bold">{new Date(slot.start).toLocaleDateString('ja-JP', {weekday: 'short'})}</span>
                          <span className="text-xl font-bold leading-none">{new Date(slot.start).getDate()}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{formatDate(slot.start)}</h3>
                          <div className="flex items-center gap-2 text-slate-500 mt-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{formatTime(slot.start)} 〜 {formatTime(slot.end)}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-6 h-6 transition-all ${
                        selectedSlot?.id === slot.id ? 'translate-x-1 text-blue-600' : 'text-slate-300 group-hover:text-slate-400'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右カラム: 予約フォーム */}
          <div className="lg:col-span-5">
            <div className="sticky top-28">
              <div className={`bg-white rounded-[2rem] shadow-2xl shadow-blue-900/5 border border-slate-200 overflow-hidden transition-all duration-500 ${!selectedSlot ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}`}>
                <div className="bg-slate-900 p-8 text-white">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <User className="w-6 h-6 text-blue-400" />
                    予約申し込み
                  </h2>
                  <p className="text-slate-400 mt-2 text-sm">必要事項を入力して送信してください。</p>
                </div>

                <div className="p-8">
                  {bookingStatus === 'success' ? (
                    <div className="py-10 text-center animate-in fade-in zoom-in duration-500">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">送信完了！</h3>
                      <p className="text-slate-500">{statusMessage}</p>
                      <p className="text-xs text-slate-400 mt-10 italic">この画面は数秒後にリセットされます...</p>
                    </div>
                  ) : (
                    <form onSubmit={handleBookingSubmit} className="space-y-6">
                      {/* 選択中の枠情報 */}
                      {selectedSlot ? (
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">選択中の日時</p>
                            <p className="text-blue-900 font-bold">{formatDate(selectedSlot.start)} {formatTime(selectedSlot.start)}開始</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl text-center text-slate-400">
                          <p className="text-sm font-medium">予約枠を選択するとフォームが有効になります</p>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">お名前</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              required
                              disabled={!selectedSlot || bookingStatus === 'submitting'}
                              type="text"
                              className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 disabled:cursor-not-allowed"
                              placeholder="山田 太郎"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">メールアドレス</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                              required
                              disabled={!selectedSlot || bookingStatus === 'submitting'}
                              type="email"
                              className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 disabled:cursor-not-allowed"
                              placeholder="tanaka@example.com"
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={!selectedSlot || bookingStatus === 'submitting'}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-200 active:scale-[0.98] flex items-center justify-center gap-3 disabled:shadow-none"
                      >
                        {bookingStatus === 'submitting' ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            送信中...
                          </>
                        ) : (
                          'この日時で予約を確定する'
                        )}
                      </button>
                    </form>
                  )}

                  {bookingStatus === 'error' && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 animate-shake">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">{statusMessage}</p>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-center mt-6 text-slate-400 text-xs px-10 leading-relaxed">
                ※予約確定後、管理者がカレンダーを確認し、詳細を別途メールでご案内いたします。
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out infinite;
          animation-iteration-count: 2;
        }
      `}</style>
    </div>
  );
}
