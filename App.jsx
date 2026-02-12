import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
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
  Settings,
  ShieldCheck,
  RefreshCw,
  Send,
  Database
} from 'lucide-react';

/**
 * 1. FIREBASE & GOOGLE API CONFIGURATION
 */
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const getEnvVar = (key) => {
  try { return import.meta.env[key] || ""; } catch (e) { return ""; }
};

const GOOGLE_CONFIG = {
  API_KEY: getEnvVar('VITE_GOOGLE_API_KEY'),
  CLIENT_ID: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
  DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
  SCOPES: "https://www.googleapis.com/auth/calendar.events",
  SLOT_KEYWORD: "予約可能"
};

const App = () => {
  // UI States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [view, setView] = useState('guest'); // 'guest' or 'admin'
  
  // Data States
  const [user, setUser] = useState(null);
  const [cloudBookings, setCloudBookings] = useState([]);
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGcalAuthorized, setIsGcalAuthorized] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', note: '' });

  /**
   * 2. AUTHENTICATION (Rule 3)
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  /**
   * 3. FIRESTORE DATA LISTENER (Rule 1 & 2)
   */
  useEffect(() => {
    if (!user) return;
    const bookingsCol = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
    const unsubscribe = onSnapshot(bookingsCol, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCloudBookings(data);
      },
      (error) => console.error("Firestore Error:", error)
    );
    return () => unsubscribe();
  }, [user]);

  /**
   * 4. GOOGLE API INITIALIZATION
   */
  useEffect(() => {
    const loadScripts = async () => {
      const loadScript = (src) => new Promise((r) => {
        const s = document.createElement('script');
        s.src = src; s.async = true; s.defer = true; s.onload = r;
        document.body.appendChild(s);
      });
      await loadScript('https://apis.google.com/js/api.js');
      await loadScript('https://accounts.google.com/gsi/client');
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: GOOGLE_CONFIG.API_KEY,
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
          });
          setIsGapiLoaded(true);
        } catch (err) { console.error("GAPI Init Error:", err); }
      });
    };
    loadScripts();
  }, []);

  /**
   * 5. FETCH SLOTS & CHECK OVERLAPS
   */
  const fetchGcalSlots = useCallback(async () => {
    if (!isGapiLoaded) return;
    setIsLoading(true);
    try {
      const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);

      // 他の全ての予定を取得するため、qフィルタを外して取得
      const res = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const allEvents = res.result.items || [];
      
      // 1. 「予約可能」というキーワードが含まれる枠（テンプレート）を抽出
      const templateSlots = allEvents.filter(ev => 
        (ev.summary && ev.summary.includes(GOOGLE_CONFIG.SLOT_KEYWORD)) || 
        (ev.description && ev.description.includes(GOOGLE_CONFIG.SLOT_KEYWORD))
      );

      // 2. それ以外の予定（既存の会議やプライベートな予定など）を抽出
      const busyEvents = allEvents.filter(ev => !templateSlots.includes(ev));

      // 3. テンプレート枠と「他の予定」の重なりをチェックしてスロットを生成
      const slots = templateSlots.map(ev => {
        const slotStart = new Date(ev.start.dateTime || ev.start.date);
        const slotEnd = new Date(ev.end.dateTime || ev.end.date);

        // 重なり判定ロジック: 他の予定の開始が枠の終了より前、かつ他の予定の終了が枠の開始より後
        const hasConflict = busyEvents.some(busy => {
          const busyStart = new Date(busy.start.dateTime || busy.start.date);
          const busyEnd = new Date(busy.end.dateTime || busy.end.date);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        // クラウドDBに未同期の予約があるかどうかもチェック
        const isCloudBooked = cloudBookings.some(cb => cb.slotId === ev.id);

        return {
          id: ev.id,
          start: slotStart.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          end: slotEnd.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          rawStart: ev.start.dateTime,
          rawEnd: ev.end.dateTime,
          isBooked: hasConflict || isCloudBooked || (ev.description && ev.description.includes('予約確定済み'))
        };
      });

      setAvailableSlots(slots);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, [isGapiLoaded, selectedDate, cloudBookings]);

  useEffect(() => { fetchGcalSlots(); }, [fetchGcalSlots]);

  const handleGcalAuth = () => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CONFIG.CLIENT_ID,
      scope: GOOGLE_CONFIG.SCOPES,
      callback: (res) => { if (res.access_token) setIsGcalAuthorized(true); },
    });
    client.requestAccessToken({ prompt: 'consent' });
  };

  /**
   * 6. GUEST ACTION: BOOKING (SAVE TO FIRESTORE)
   */
  const handleGuestBooking = async (e) => {
    e.preventDefault();
    if (!user) return;
    setBookingStatus('loading');

    try {
      const bookingData = {
        name: formData.name,
        email: formData.email,
        note: formData.note,
        date: selectedDate.toISOString(),
        slotId: selectedSlot.id,
        slotTime: `${selectedSlot.start} - ${selectedSlot.end}`,
        rawStart: selectedSlot.rawStart,
        rawEnd: selectedSlot.rawEnd,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), bookingData);
      setBookingStatus('success');
    } catch (err) {
      console.error(err);
      setBookingStatus('error');
    }
  };

  /**
   * 7. ADMIN ACTION: SYNC TO GOOGLE CALENDAR
   */
  const syncToGoogle = async (booking) => {
    if (!isGcalAuthorized) {
      handleGcalAuth();
      return;
    }
    try {
      await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: {
          summary: `予約確定: ${booking.name}様`,
          description: `お名前: ${booking.name}\nメール: ${booking.email}\n備考: ${booking.note}\n#予約確定済み`,
          start: { dateTime: booking.rawStart },
          end: { dateTime: booking.rawEnd },
          attendees: [{ email: booking.email }],
        },
      });
      const bookingRef = doc(db, 'artifacts', appId, 'public', 'data', 'bookings', booking.id);
      await updateDoc(bookingRef, { status: 'synced' });
    } catch (err) { console.error("Sync Error:", err); }
  };

  const deleteBooking = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
  };

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
            <CalendarCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Smart Reserve</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setView(view === 'guest' ? 'admin' : 'guest')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              view === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {view === 'guest' ? <Settings className="w-4 h-4" /> : <User className="w-4 h-4" />}
            {view === 'guest' ? '管理画面へ' : '予約画面へ'}
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {view === 'guest' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black">{currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}</h2>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-slate-50 rounded-full"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-slate-50 rounded-full"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-300 mb-6 tracking-widest">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {[...Array(firstDay(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => <div key={`e-${i}`} />)}
                  {[...Array(daysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()))].map((_, i) => {
                    const d = i + 1;
                    const isSel = selectedDate.getDate() === d && selectedDate.getMonth() === currentMonth.getMonth();
                    return (
                      <button key={d} onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))} className={`aspect-square flex items-center justify-center rounded-2xl text-sm font-bold transition-all ${isSel ? 'bg-indigo-600 text-white shadow-lg scale-110 z-10' : 'hover:bg-indigo-50 text-slate-600'}`}>{d}</button>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex gap-4">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-1" />
                <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                  管理者のカレンダーに他の予定が入っている場合、その時間は自動的に予約不可として表示されます。
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white min-h-[500px]">
                <h3 className="text-3xl font-black text-slate-800 mb-8 border-b pb-4">予約枠を選択</h3>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-64"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableSlots.map(s => (
                      <button key={s.id} disabled={s.isBooked} onClick={() => { setSelectedSlot(s); setIsBookingModalOpen(true); }} className={`p-6 rounded-3xl border-2 text-left transition-all ${s.isBooked ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-slate-100 hover:border-indigo-600 hover:shadow-xl'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${s.isBooked ? 'bg-slate-200' : 'bg-indigo-50 text-indigo-600'}`}><Clock className="w-5 h-5" /></div>
                        <p className={`text-xl font-black ${s.isBooked ? 'text-slate-400' : 'text-slate-900'}`}>{s.start} - {s.end}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{s.isBooked ? '予約不可（重複あり）' : '予約可能'}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-300 font-bold">枠がありません</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Database className="w-32 h-32" /></div>
              <h2 className="text-4xl font-black text-slate-800 mb-2">管理者ダッシュボード</h2>
              {!isGcalAuthorized ? (
                <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h4 className="font-black text-indigo-900 text-lg mb-1">Google連携が必要です</h4>
                    <p className="text-indigo-700/70 text-sm">カレンダーの重複をチェックし、予約を同期するために連携してください。</p>
                  </div>
                  <button onClick={handleGcalAuth} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" /> Google連携を開始
                  </button>
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <h3 className="text-xl font-black flex items-center gap-2 text-slate-700 mb-6">
                    <Database className="w-5 h-5 text-indigo-500" />
                    リクエスト一覧 ({cloudBookings.length})
                  </h3>
                  {cloudBookings.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-3xl">リクエストはありません</div>
                  ) : (
                    <div className="grid gap-4">
                      {cloudBookings.map(booking => (
                        <div key={booking.id} className={`p-6 bg-white rounded-3xl border-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${booking.status === 'synced' ? 'border-green-100 bg-green-50/30' : 'border-slate-100 shadow-sm'}`}>
                          <div className="flex-1">
                            <span className="text-lg font-black text-slate-800">{booking.name} 様</span>
                            <div className="flex gap-4 text-xs text-slate-500 font-medium mt-1">
                              <span>{new Date(booking.date).toLocaleDateString()}</span>
                              <span>{booking.slotTime}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                            {booking.status === 'pending' && (
                              <button onClick={() => syncToGoogle(booking)} className="flex-1 md:flex-none bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold text-xs hover:bg-indigo-700 transition-all">
                                同期する
                              </button>
                            )}
                            <button onClick={() => deleteBooking(booking.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">
                              <LogOut className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 relative animate-in zoom-in-95">
            <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 font-bold text-2xl">&times;</button>
            {bookingStatus === 'success' ? (
              <div className="text-center py-6">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8"><CheckCircle2 className="w-12 h-12" /></div>
                <h2 className="text-3xl font-black mb-4">予約完了</h2>
                <button onClick={() => { setIsBookingModalOpen(false); setBookingStatus('idle'); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold">閉じる</button>
              </div>
            ) : (
              <form onSubmit={handleGuestBooking}>
                <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-tighter">予約情報を入力</h2>
                <div className="space-y-4">
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm" placeholder="お名前" />
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm" placeholder="メールアドレス" />
                  <textarea rows="3" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-bold text-sm resize-none" placeholder="メッセージ（任意）"></textarea>
                </div>
                <button type="submit" disabled={bookingStatus === 'loading'} className="w-full mt-8 py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all">
                  {bookingStatus === 'loading' ? <Loader2 className="animate-spin w-6 h-6" /> : "予約を確定する"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const root = document.getElementById('root');
if (root) { ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>); }
