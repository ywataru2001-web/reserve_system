import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Lock,
  CalendarCheck,
  AlertCircle,
  Loader2,
  Info,
  LogOut,
  Settings
} from 'lucide-react';

/**
 * 環境変数の取得ヘルパー
 */
const getEnv = (key) => {
  try {
    // @ts-ignore
    return import.meta.env[key] || "";
  } catch (e) {
    return "";
  }
};

const CONFIG = {
  API_KEY: getEnv('VITE_GOOGLE_API_KEY'),
  CLIENT_ID: getEnv('VITE_GOOGLE_CLIENT_ID'),
  DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
  SCOPES: "https://www.googleapis.com/auth/calendar.events",
  SLOT_KEYWORD: "予約可能"
};

const App = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', note: '' });
  const [errorMessage, setErrorMessage] = useState("");

  // Google API 初期化
  useEffect(() => {
    const loadScripts = async () => {
      const loadScript = (src) => new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src; script.async = true; script.defer = true; script.onload = resolve;
        document.body.appendChild(script);
      });

      if (!CONFIG.API_KEY || !CONFIG.CLIENT_ID) {
        setErrorMessage("APIキーまたはクライアントIDが設定されていません。Vercelの環境変数を確認してください。");
      }

      await loadScript('https://apis.google.com/js/api.js');
      await loadScript('https://accounts.google.com/gsi/client');

      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({ apiKey: CONFIG.API_KEY, discoveryDocs: CONFIG.DISCOVERY_DOCS });
          setIsGapiLoaded(true);
        } catch (err) {
          console.error("GAPI Init Error:", err);
          setErrorMessage("Google APIの初期化に失敗しました。APIキーが正しいか確認してください。");
        }
      });
    };
    loadScripts();
  }, []);

  const fetchSlots = useCallback(async () => {
    if (!isGapiLoaded || !isAuthorized) return;
    setIsLoading(true);
    try {
      const start = new Date(selectedDate); start.setHours(0,0,0,0);
      const end = new Date(selectedDate); end.setHours(23,59,59,999);
      const res = await window.gapi.client.calendar.events.list({
        calendarId: 'primary', timeMin: start.toISOString(), timeMax: end.toISOString(),
        q: CONFIG.SLOT_KEYWORD, singleEvents: true, orderBy: 'startTime',
      });
      const slots = (res.result.items || []).map(ev => ({
        id: ev.id,
        start: new Date(ev.start.dateTime || ev.start.date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        end: new Date(ev.end.dateTime || ev.end.date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        rawStart: ev.start.dateTime, rawEnd: ev.end.dateTime,
        isBooked: ev.description?.includes('予約確定済み') 
      }));
      setAvailableSlots(slots);
    } catch (e) {
      console.error(e);
      setErrorMessage("カレンダー情報の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [isGapiLoaded, isAuthorized, selectedDate]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleAuth = () => {
    if (!window.google) return;
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID, scope: CONFIG.SCOPES,
      callback: (res) => {
        if (res.access_token) {
          setIsAuthorized(true);
          setErrorMessage("");
        }
      },
      error_callback: (err) => {
        setErrorMessage("認証に失敗しました。ドメインの許可設定を確認してください。");
      }
    });
    client.requestAccessToken();
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault(); setBookingStatus('loading');
    try {
      await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: {
          summary: `予約確定: ${formData.name}様`,
          description: `お名前: ${formData.name}\nメール: ${formData.email}\n備考: ${formData.note}\n#予約確定済み`,
          start: { dateTime: selectedSlot.rawStart }, end: { dateTime: selectedSlot.rawEnd },
          attendees: [{ email: formData.email }],
        },
      });
      setBookingStatus('success'); fetchSlots();
    } catch (e) { setBookingStatus('error'); }
  };

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100"><CalendarCheck className="text-white w-6 h-6" /></div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 uppercase">Smart Reserve</span>
        </div>
        {isAuthorized && (
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-green-500 bg-green-50 px-3 py-1 rounded-full border border-green-100">● Google同期中</span>
            <button onClick={() => setIsAuthorized(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><LogOut className="w-5 h-5" /></button>
          </div>
        )}
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {errorMessage && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5" />
            <p className="font-bold">{errorMessage}</p>
          </div>
        )}

        {!isAuthorized ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300 shadow-sm max-w-2xl mx-auto px-6">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black mb-4 tracking-tighter text-slate-800">予約管理を始めましょう</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
              Googleカレンダーと連携して、空き時間を自動公開。スケジュール調整をシンプルにします。
            </p>
            <button 
              onClick={handleAuth} 
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2 mx-auto"
            >
              <CalendarIcon className="w-5 h-5" />
              Googleカレンダーと連携
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
            {/* カレンダー & スロット表示部分は以前と同じ */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black text-slate-800">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft /></button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-300 mb-4 tracking-[0.2em] uppercase">
                  {['sun','mon','tue','wed','thu','fri','sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(firstDay(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => <div key={i} />)}
                  {[...Array(daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => {
                    const d = i + 1;
                    const isSel = selectedDate.getDate() === d && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear();
                    return (
                      <button key={d} onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))} className={`aspect-square flex items-center justify-center rounded-2xl text-sm font-bold transition-all ${isSel ? 'bg-indigo-600 text-white shadow-xl scale-110 z-10' : 'hover:bg-indigo-50 text-slate-600'}`}>{d}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white min-h-[500px]">
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-8">Availability</h3>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-80 text-slate-300 font-bold uppercase tracking-widest text-sm"><Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />Syncing...</div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableSlots.map(s => (
                      <button key={s.id} disabled={s.isBooked} onClick={() => { setSelectedSlot(s); setIsBookingModalOpen(true); }} className={`group p-6 rounded-3xl border-2 transition-all text-left relative overflow-hidden ${s.isBooked ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' : 'bg-white border-slate-100 hover:border-indigo-600 hover:shadow-2xl hover:-translate-y-1'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${s.isBooked ? 'bg-slate-200' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}><Clock className="w-5 h-5" /></div>
                        <p className={`text-xl font-black tracking-tight ${s.isBooked ? 'text-slate-400' : 'text-slate-900'}`}>{s.start} - {s.end}</p>
                        <p className="text-[10px] text-slate-400 font-black mt-2 uppercase tracking-widest">{s.isBooked ? 'Booked' : 'Reserve Now'}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-center text-slate-400 font-bold uppercase tracking-widest"><AlertCircle className="w-12 h-12 text-slate-100 mb-6" />No Slots</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-white relative animate-in zoom-in-95">
            <button onClick={() => bookingStatus !== 'loading' && setIsBookingModalOpen(false)} className="absolute top-6 right-8 text-slate-300 hover:text-slate-600 font-bold text-2xl z-20">&times;</button>
            <div className="p-8 sm:p-10">
              {bookingStatus === 'success' ? (
                <div className="text-center py-10 animate-in zoom-in-95">
                  <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-8 shadow-inner" />
                  <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">Done</h2>
                  <p className="text-slate-500 font-medium mb-10">予約をカレンダーへ送信しました。</p>
                  <button onClick={() => { setIsBookingModalOpen(false); setBookingStatus('idle'); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold transition-all active:scale-95">Close</button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Reservation</h2>
                  <div className="grid grid-cols-2 gap-2 text-center font-black text-[10px] uppercase mb-6">
                    <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-slate-500">{selectedDate.toLocaleDateString('ja-JP')}</div>
                    <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-slate-500">{selectedSlot?.start} - {selectedSlot?.end}</div>
                  </div>
                  <div className="space-y-4">
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-inner" placeholder="NAME" />
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm shadow-inner" placeholder="EMAIL" />
                    <textarea rows="3" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm resize-none shadow-inner" placeholder="MESSAGE"></textarea>
                  </div>
                  <button type="submit" disabled={bookingStatus === 'loading'} className="w-full mt-4 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
                    {bookingStatus === 'loading' ? <Loader2 className="animate-spin w-6 h-6" /> : "CONFIRM"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = document.getElementById('root');
if (root) { ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>); }

export default App;
