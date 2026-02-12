import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  AlertCircle,
  CalendarDays
} from 'lucide-react';

// 【重要】GASで「デプロイ」した後に発行されるウェブアプリURLをここに貼り付けてください
const GAS_WEBAPP_URL = ""; 

const App = () => {
  const [step, setStep] = useState(1); 
  const [viewDate, setViewDate] = useState(new Date()); 
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', note: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]); // GASから取得した予約済みデータ
  const [message, setMessage] = useState(null);

  // セミナーの基本時間枠
  const timeSlots = [
    "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];

  // GASから現在の予約状況を取得
  useEffect(() => {
    if (GAS_WEBAPP_URL) {
      fetchBookedData();
    }
  }, []);

  const fetchBookedData = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(GAS_WEBAPP_URL);
      const data = await response.json();
      setBookedSlots(data); // [{date: "2023-10-25", time: "10:00"}, ...]
    } catch (error) {
      console.error("Failed to fetch booked data:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isPast = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    return checkDate < today;
  };

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // 特定の日時が既に予約されているかチェック
  const isSlotBooked = (date, time) => {
    return bookedSlots.some(slot => slot.date === date && slot.time === time);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!GAS_WEBAPP_URL) {
      setMessage({ type: 'error', text: 'GAS_WEBAPP_URL が設定されていません。' });
      return;
    }

    setIsLoading(true);
    try {
      // GASはCORS制限が厳しいため、通常は no-cors を使用します
      // 送信に成功してもレスポンス内容は取得できないため、成功とみなして次に進みます
      await fetch(GAS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: selectedDate,
          time: selectedTime
        })
      });
      setStep(3);
    } catch (error) {
      setMessage({ type: 'error', text: '通信エラーが発生しました。' });
    } finally {
      setIsLoading(false);
    }
  };

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Seminar Reservation</h1>
          <p className="text-slate-500 mt-2">ご希望の日時を選択して予約を完了してください。</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
          <div className="flex border-b border-slate-100">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-1.5 transition-colors ${step >= s ? 'bg-indigo-600' : 'bg-slate-100'}`} />
            ))}
          </div>

          <div className="p-6 md:p-10">
            {step === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Calendar */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-xl text-slate-800">
                      {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft /></button>
                      <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-2 font-bold text-xs text-slate-400">
                    {['日','月','火','水','木','金','土'].map(d => <div key={d}>{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, idx) => {
                      if (day === null) return <div key={idx} />;
                      const dateStr = formatDate(viewDate.getFullYear(), viewDate.getMonth(), day);
                      const isSelected = selectedDate === dateStr;
                      const disabled = isPast(day);
                      return (
                        <button
                          key={idx}
                          disabled={disabled}
                          onClick={() => { setSelectedDate(dateStr); setSelectedTime(''); }}
                          className={`aspect-square flex items-center justify-center rounded-2xl text-sm font-bold transition-all
                            ${disabled ? 'text-slate-200 cursor-not-allowed' : 'hover:bg-indigo-50 text-slate-700'}
                            ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : ''}
                          `}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-indigo-600" />
                    {selectedDate ? `${selectedDate} の空き状況` : '日付を選択してください'}
                  </h3>
                  
                  {isFetching ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <Loader2 className="animate-spin mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">Loading slots...</p>
                    </div>
                  ) : selectedDate ? (
                    <div className="grid grid-cols-2 gap-3">
                      {timeSlots.map((time) => {
                        const booked = isSlotBooked(selectedDate, time);
                        return (
                          <button
                            key={time}
                            disabled={booked}
                            onClick={() => setSelectedTime(time)}
                            className={`py-4 rounded-2xl text-sm font-bold transition-all border
                              ${booked ? 'bg-slate-100 border-transparent text-slate-300 cursor-not-allowed line-through' : 
                                selectedTime === time ? 'bg-white border-indigo-600 text-indigo-600 ring-2 ring-indigo-100' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'}
                            `}
                          >
                            {time} {booked && '(満席)'}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                      カレンダーから日付を選択してください
                    </div>
                  )}

                  <button
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(2)}
                    className="w-full mt-10 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100"
                  >
                    次へ進む <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">お客様情報</h2>
                  <div className="mt-4 inline-flex items-center gap-4 bg-indigo-50 text-indigo-700 px-6 py-2 rounded-full font-bold text-sm">
                    <span>{selectedDate}</span>
                    <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full"></span>
                    <span>{selectedTime}</span>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="お名前" />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="メールアドレス" />
                  </div>
                  <textarea value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 h-32" placeholder="備考 (任意)" />
                </div>

                <div className="flex gap-4 mt-10">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">戻る</button>
                  <button type="submit" disabled={isLoading} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-100">
                    {isLoading ? <Loader2 className="animate-spin" /> : '予約を確定する'}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={56} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">予約を承りました</h2>
                <p className="text-slate-500 mb-10">
                  ご登録いただいたメールアドレスに詳細をお送りしました。<br/>当日お会いできるのを楽しみにしています。
                </p>
                <button onClick={() => window.location.reload()} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl">トップに戻る</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
