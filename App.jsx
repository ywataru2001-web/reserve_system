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
  Database,
  Send,
  RefreshCw
} from 'lucide-react';

/**
 * 1. FIREBASE INITIALIZATION
 */
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

/**
 * 2. CONFIGURATION (Environment Variables)
 */
const getEnvVar = (key) => {
  try {
    // Vite / Vercel 環境変数
    return import.meta.env[key] || "";
  } catch (e) {
    return "";
  }
};

const GOOGLE_CONFIG = {
  API_KEY: getEnvVar('VITE_GOOGLE_API_KEY'),
  CLIENT_ID: getEnvVar('VITE_GOOGLE_CLIENT_ID'),
  DISCOVERY_DOCS: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
  SCOPES: "https://www.googleapis.com/auth/calendar.events",
  SLOT_KEYWORD: "予約可能"
};

const App = () => {
  // --- UI States ---
  const [view, setView] = useState('guest');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // --- Data States ---
  const [user, setUser] = useState(null);
  const [cloudBookings, setCloudBookings] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [isGcalAuthorized, setIsGcalAuthorized] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('idle');
  const [formData, setFormData] = useState({ name: '', email: '', note: '' });

  /**
   * 3. AUTHENTICATION
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
        console.error("Firebase Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  /**
   * 4. FIRESTORE LISTENER
   */
  useEffect(() => {
    if (!user) return;
    const bookingsCol = collection(db, 'artifacts', appId, 'public', 'data', 'bookings');
    const unsubscribe = onSnapshot(bookingsCol, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCloudBookings(data);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setApiError("Database connection failed.");
      }
    );
    return () => unsubscribe();
  }, [user]);

  /**
   * 5. GOOGLE API SETUP
   */
  useEffect(() => {
    const loadGapi = async () => {
      const loadScript = (src) => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.async = true; s.defer = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(s);
      });

      try {
        await loadScript('https://apis.google.com/js/api.js');
        await loadScript('https://accounts.google.com/gsi/client');
        
        if (!window.gapi) throw new Error("GAPI not found");

        window.gapi.load('client', async () => {
          try {
            if (!GOOGLE_CONFIG.API_KEY) {
              setApiError("VITE_GOOGLE_API_KEY is missing in Environment Variables.");
              return;
            }
            await window.gapi.client.init({
              apiKey: GOOGLE_CONFIG.API_KEY,
              discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
            });
            setIsGapiLoaded(true);
          } catch (err) {
            console.error("GCal Init Error:", err);
            setApiError(`Google API Init Error: ${err.message || JSON.stringify(err)}`);
          }
        });
      } catch (err) {
        setApiError(err.message);
      }
    };
    loadGapi();
  }, []);

  /**
   * 6. FETCH SLOTS
   */
  const fetchGcalSlots = useCallback(async () => {
    // Guard: APIがロードされていない、またはエラーがある場合はスキップ
    if (!isGapiLoaded || apiError) return;
    
    setIsLoading(true);
    setApiError(null);

    try {
      const start = new Date(selectedDate); start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate); end.setHours(23, 59, 59, 999);

      // 注意: primaryカレンダーを取得するには認証が必要な場合があります
      // ゲスト向けに公開カレンダーから取得する場合は、Calendar IDを明示的に指定する必要があります
      const res = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const allEvents = res.result.items || [];
      const templateSlots = allEvents.filter(ev => 
        (ev.summary && ev.summary.includes(GOOGLE_CONFIG.SLOT_KEYWORD))
      );
      const busyEvents = allEvents.filter(ev => !templateSlots.includes(ev));

      const slots = templateSlots.map(ev => {
        const sStart = new Date(ev.start.dateTime || ev.start.date);
        const sEnd = new Date(ev.end.dateTime || ev.end.date);

        const hasConflict = busyEvents.some(busy => {
          const bStart = new Date(busy.start.dateTime || busy.start.date);
          const bEnd = new Date(busy.end.dateTime || busy.end.date);
          return sStart < bEnd && sEnd > bStart;
        });

        const isCloudBooked = cloudBookings.some(cb => cb.slotId === ev.id && cb.status !== 'deleted');

        return {
          id: ev.id,
          start: sStart.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          end: sEnd.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          rawStart: ev.start.dateTime,
          rawEnd: ev.end.dateTime,
          isBooked: hasConflict || isCloudBooked || (ev.description && ev.description.includes('予約確定済み'))
        };
      });
      setAvailableSlots(slots);
    } catch (e) {
      console.error("Fetch GCal Error:", e);
      // 401/403エラー（認証不足）の場合のハンドリング
      if (e.status === 401 || e.status === 403) {
        setApiError("カレンダーへのアクセス権限がありません。管理者はログインしてください。");
      } else {
        setApiError("Failed to fetch calendar data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isGapiLoaded, selectedDate, cloudBookings, apiError]);

  useEffect(() => {
    fetchGcalSlots();
  }, [fetchGcalSlots]);

  const handleGcalAuth = () => {
    if (!GOOGLE_CONFIG.CLIENT_ID) {
      setApiError("VITE_GOOGLE_CLIENT_ID is missing.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CONFIG.CLIENT_ID,
      scope: GOOGLE_CONFIG.SCOPES,
      callback: (res) => {
        if (res.access_token) {
          setIsGcalAuthorized(true);
          setApiError(null);
          fetchGcalSlots();
        }
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  };

  /**
   * 7. BOOKING & ADMIN ACTIONS
   */
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setBookingStatus('loading');
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        ...formData,
        date: selectedDate.toISOString(),
        slotId: selectedSlot.id,
        slotTime: `${selectedSlot.start} - ${selectedSlot.end}`,
        rawStart: selectedSlot.rawStart,
        rawEnd: selectedSlot.rawEnd,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setBookingStatus('success');
    } catch (err) {
      setBookingStatus('error');
    }
  };

  const syncToGoogle = async (booking) => {
    if (!isGcalAuthorized) return handleGcalAuth();
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
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', booking.id), { status: 'synced' });
    } catch (err) {
      console.error(err);
      setApiError("Sync failed. Check permissions.");
    }
  };

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100">
            <CalendarCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tighter">SMART RESERVE</span>
        </div>
        <button 
          onClick={() => setView(view === 'guest' ? 'admin' : 'guest')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${
            view === 'admin' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {view === 'guest' ? <Settings className="w-4 h-4" /> : <User className="w-4 h-4" />}
          {view === 'guest' ? 'Admin' : 'Guest'}
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* エラー表示エリア */}
        {apiError && (
          <div className="mb-10 p-6 bg-red-50 border-2 border-red-100 rounded-[2.5rem] flex items-center gap-4 text-red-600 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-black text-xs uppercase tracking-widest mb-1">System Message</p>
              <p className="text-sm font-bold">{apiError}</p>
            </div>
            {apiError.includes("権限") && (
              <button onClick={handleGcalAuth} className="ml-auto bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Authorize</button>
            )}
          </div>
        )}

        {view === 'guest' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white sticky top-28">
                <div className="flex justify-between items-center mb-8 px-2">
                  <h2 className="text-xl font-black text-slate-800 tracking-tighter">
                    {currentMonth.getFullYear()} / {currentMonth.getMonth() + 1}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><ChevronLeft className="w-5 h-5"/></button>
                    <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><ChevronRight className="w-5 h-5"/></button>
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
                        className={`aspect-square flex items-center justify-center rounded-2xl text-sm font-bold transition-all ${
                          isSelected ? 'bg-indigo-600 text-white shadow-2xl scale-110' : 'hover:bg-indigo-50 text-slate-600'
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
              <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white min-h-[500px]">
                <h3 className="text-3xl font-black text-slate-800 mb-10 border-b border-slate-50 pb-8 tracking-tighter uppercase">Available Slots</h3>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-80 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    <p className="text-slate-300 font-black text-[10px] tracking-widest uppercase">Syncing...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in duration-500">
                    {availableSlots.map(s => (
                      <button 
                        key={s.id} 
                        disabled={s.isBooked} 
                        onClick={() => { setSelectedSlot(s); setIsBookingModalOpen(true); }} 
                        className={`p-8 rounded-[2.5rem] border-2 text-left transition-all ${
                          s.isBooked ? 'bg-slate-50 border-slate-100 opacity-50 grayscale' : 'bg-white border-slate-100 hover:border-indigo-600 hover:shadow-2xl'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${s.isBooked ? 'bg-slate-200' : 'bg-indigo-50 text-indigo-600'}`}>
                          <Clock className="w-6 h-6" />
                        </div>
                        <p className={`text-2xl font-black tracking-tight ${s.isBooked ? 'text-slate-400' : 'text-slate-900'}`}>{s.start} - {s.end}</p>
                        <p className="text-[10px] text-slate-400 font-black mt-3 uppercase tracking-widest">{s.isBooked ? 'Reserved' : 'Available'}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 p-10">
                    <p className="text-slate-400 font-black text-xl tracking-tight uppercase">No slots found</p>
                    <p className="text-slate-300 text-sm mt-2 font-medium">別の日付を選択するか、時間を置いて再度お試しください。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ADMIN VIEW */
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-white">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tighter uppercase italic underline decoration-indigo-200 decoration-8 underline-offset-[-4px]">Admin Console</h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Incoming Requests & Synchronization</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={fetchGcalSlots} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all border border-slate-100 shadow-sm"><RefreshCw className="w-5 h-5"/></button>
                </div>
              </div>

              {!isGcalAuthorized ? (
                <div className="bg-indigo-50 p-12 rounded-[3rem] border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="space-y-3 text-center md:text-left">
                    <h4 className="font-black text-indigo-900 text-2xl tracking-tight">カレンダー連携</h4>
                    <p className="text-indigo-700/60 text-sm font-medium leading-relaxed max-w-sm">
                      予約をGoogleカレンダーに反映させるには、一度Googleアカウントで承認を行う必要があります。
                    </p>
                  </div>
                  <button onClick={handleGcalAuth} className="bg-indigo-600 text-white px-10 py-6 rounded-3xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs">Authorize Google</button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cloudBookings.length === 0 ? (
                    <div className="text-center py-24 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                      <p className="text-slate-300 font-black uppercase tracking-widest tracking-[0.3em]">Waiting for orders...</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {cloudBookings.map(booking => (
                        <div key={booking.id} className={`p-8 bg-white rounded-[2.5rem] border-2 flex flex-col md:flex-row justify-between items-center gap-8 transition-all ${booking.status === 'synced' ? 'border-green-100 bg-green-50/20' : 'border-slate-100 shadow-xl shadow-slate-100/50'}`}>
                          <div className="flex-1 w-full">
                            <div className="flex items-center gap-4 mb-3">
                              <span className="text-2xl font-black text-slate-800 tracking-tight">{booking.name} 様</span>
                              <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${booking.status === 'synced' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{booking.status}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-8 gap-y-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                              <span className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-indigo-500"/> {new Date(booking.date).toLocaleDateString()}</span>
                              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500"/> {booking.slotTime}</span>
                            </div>
                          </div>
                          <div className="flex gap-3 w-full md:w-auto">
                            {booking.status === 'pending' && (
                              <button onClick={() => syncToGoogle(booking)} className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all">
                                <Send className="w-4 h-4" /> Sync Now
                              </button>
                            )}
                            <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', booking.id))} className="p-5 text-slate-200 hover:text-red-500 transition-all">
                              <LogOut className="w-6 h-6" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-12 relative border border-white animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-600 font-bold text-3xl transition-all">&times;</button>
            
            {bookingStatus === 'success' ? (
              <div className="text-center py-10">
                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner shadow-green-100/50">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-6 tracking-tighter uppercase">Accepted</h2>
                <p className="text-slate-500 mb-12 font-medium leading-relaxed px-6 text-sm">予約リクエストを保存しました。管理者が確認次第カレンダーへ登録されます。</p>
                <button onClick={() => { setIsBookingModalOpen(false); setBookingStatus('idle'); }} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-[10px]">Close</button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <h2 className="text-3xl font-black text-slate-800 mb-10 tracking-tighter uppercase border-l-4 border-indigo-600 pl-4">Reserve</h2>
                <div className="grid grid-cols-2 gap-4 mb-10 text-center text-[10px] font-black uppercase text-slate-400">
                  <div className="bg-slate-50 py-5 rounded-[1.5rem] border border-slate-100 shadow-inner tracking-widest">{selectedDate.toLocaleDateString()}</div>
                  <div className="bg-slate-50 py-5 rounded-[1.5rem] border border-slate-100 shadow-inner tracking-widest">{selectedSlot?.start} - {selectedSlot?.end}</div>
                </div>
                <div className="space-y-5">
                  <div className="relative">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-sm shadow-inner" placeholder="お名前" />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-sm shadow-inner" placeholder="メールアドレス" />
                  </div>
                  <textarea rows="3" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-sm resize-none shadow-inner" placeholder="備考・メッセージ"></textarea>
                </div>
                <button type="submit" disabled={bookingStatus === 'loading'} className="w-full mt-10 py-7 bg-indigo-600 text-white rounded-[2.5rem] font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-4 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                  {bookingStatus === 'loading' ? <Loader2 className="animate-spin w-6 h-6" /> : "Confirm Reservation"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(<App />);
}
