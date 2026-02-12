<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>セミナー予約システム</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
            animation: spin-slow 12s linear infinite;
        }
        [v-cloak] { display: none; }
    </style>
</head>
<body class="bg-[#F8FAFC] text-slate-900 font-sans min-h-screen pb-10">

    <!-- 診断バー: 手動設定中の場合のみ表示 -->
    <div id="debug-bar" class="hidden bg-amber-500 text-white text-[10px] font-bold py-1 px-4 flex justify-between items-center">
        <span>⚠️ 診断モード: ブラウザに一時保存されたURLを使用中</span>
        <button onclick="clearManualUrl()" class="underline hover:no-underline">リセット</button>
    </div>

    <!-- 接続設定が見つからない場合の表示 -->
    <div id="setup-view" class="hidden min-h-screen flex items-center justify-center p-6">
        <div class="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-xl w-full border border-slate-100">
            <div class="flex flex-col items-center text-center">
                <div class="bg-amber-100 p-4 rounded-3xl mb-6">
                    <i data-lucide="settings" class="w-10 h-10 text-amber-600 animate-spin-slow"></i>
                </div>
                <h1 class="text-2xl font-black text-slate-800 mb-4">接続設定が必要です</h1>
                <p class="text-slate-500 text-sm leading-relaxed mb-8 px-4">
                    GASのデプロイURLが設定されていません。以下にURLを入力して開始してください。
                </p>

                <form id="setup-form" class="w-full space-y-4">
                    <div class="relative">
                        <i data-lucide="globe" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                        <input 
                            type="text" 
                            id="setup-url-input"
                            placeholder="https://script.google.com/macros/s/.../exec"
                            class="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-600 outline-none transition-all text-sm font-mono"
                            required
                        >
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2">
                        URLを設定して接続 <i data-lucide="arrow-right" class="w-4 h-4"></i>
                    </button>
                </form>
            </div>
        </div>
    </div>

    <!-- メインコンテンツ -->
    <div id="main-view" class="hidden">
        <nav class="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 py-4">
            <div class="max-w-6xl mx-auto px-6 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="bg-blue-600 p-2 rounded-lg shadow-lg"><i data-lucide="calendar-check" class="w-6 h-6 text-white"></i></div>
                    <span class="text-xl font-black tracking-tight text-slate-800">Seminar Booking</span>
                </div>
                <div class="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span id="endpoint-display" class="text-[10px] text-slate-500 font-mono font-bold truncate max-w-[150px]"></span>
                </div>
            </div>
        </nav>

        <main class="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-12 gap-10">
            <!-- 左側：日程選択 -->
            <div class="lg:col-span-7">
                <h2 class="text-lg font-bold mb-6 flex items-center gap-2"><i data-lucide="clock" class="w-5 h-5 text-blue-600"></i>予約可能な日程</h2>
                
                <div id="error-container" class="hidden mb-6 p-5 bg-red-50 border border-red-200 text-red-800 rounded-2xl">
                    <div class="flex items-center gap-3 mb-3">
                        <i data-lucide="alert-circle" class="w-5 h-5 shrink-0"></i>
                        <p id="error-message" class="text-sm font-bold"></p>
                    </div>
                    <div id="debug-info" class="hidden text-[10px] bg-white/50 p-3 rounded-lg font-mono border border-red-100 mb-3 break-all"></div>
                    <div class="flex gap-4">
                        <button onclick="fetchSlots()" class="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                            <i data-lucide="refresh-ccw" class="w-3 h-3"></i> 再試行
                        </button>
                        <button onclick="clearManualUrl()" class="text-xs font-bold text-slate-500 hover:underline">URLを再設定</button>
                    </div>
                </div>

                <div id="loading-state" class="bg-white rounded-3xl p-24 flex flex-col items-center justify-center shadow-sm border border-slate-200">
                    <i data-lucide="loader-2" class="w-10 h-10 text-blue-600 animate-spin mb-4"></i>
                    <p class="text-slate-400 font-medium">カレンダー取得中...</p>
                </div>

                <div id="empty-state" class="hidden bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                    <i data-lucide="search" class="w-12 h-12 text-slate-300 mx-auto mb-4"></i>
                    <p class="text-slate-500 font-medium">予約可能な枠が見つかりませんでした。</p>
                </div>

                <div id="slots-container" class="grid gap-4"></div>
            </div>

            <!-- 右側：フォーム -->
            <div class="lg:col-span-5">
                <div id="booking-card" class="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden transition-all duration-500 sticky top-28 opacity-40 pointer-events-none translate-y-4">
                    <div class="bg-slate-900 p-8 text-white relative">
                        <h2 class="text-xl font-bold flex items-center gap-3"><i data-lucide="user" class="w-6 h-6 text-blue-400"></i>予約申し込み</h2>
                        <p class="text-slate-400 text-xs mt-2 italic">ご入力内容を確認して確定ボタンを押してください。</p>
                    </div>
                    
                    <div class="p-8">
                        <div id="success-state" class="hidden text-center py-10">
                            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <i data-lucide="check-circle" class="w-10 h-10 text-green-600"></i>
                            </div>
                            <p class="font-bold text-xl text-slate-800">予約が完了しました！</p>
                            <p id="success-message" class="text-sm text-slate-500 mt-3 leading-relaxed"></p>
                        </div>

                        <form id="booking-form" class="space-y-6">
                            <div id="selected-slot-info" class="hidden bg-blue-50/80 p-5 rounded-2xl text-blue-900 text-sm font-bold flex items-center gap-3 border border-blue-100">
                                <i data-lucide="calendar" class="w-5 h-5 text-blue-600"></i>
                                <div>
                                    <p class="text-[10px] text-blue-500 uppercase">Selected Date</p>
                                    <p id="selected-date-text" class="text-base"></p>
                                </div>
                            </div>
                            
                            <div class="space-y-4">
                                <div class="relative">
                                    <i data-lucide="user" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                    <input required id="user-name" class="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all font-medium" placeholder="お名前">
                                </div>
                                <div class="relative">
                                    <i data-lucide="mail" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                    <input required id="user-email" type="email" class="w-full pl-11 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all font-medium" placeholder="メールアドレス">
                                </div>
                            </div>

                            <button type="submit" id="submit-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3">
                                <span>予約を確定する</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script>
        // 状態管理
        let state = {
            gasUrl: localStorage.getItem('DEBUG_GAS_URL') || '',
            slots: [],
            selectedSlot: null,
            isLoading: false,
            isSubmitting: false
        };

        // 初期化
        function init() {
            const params = new URLSearchParams(window.location.search);
            const queryUrl = params.get('gas_url');
            if (queryUrl) {
                state.gasUrl = queryUrl;
                localStorage.setItem('DEBUG_GAS_URL', queryUrl);
            }

            if (!state.gasUrl) {
                showView('setup-view');
            } else {
                showView('main-view');
                if (localStorage.getItem('DEBUG_GAS_URL')) {
                    document.getElementById('debug-bar').classList.remove('hidden');
                }
                document.getElementById('endpoint-display').textContent = `ID: ${state.gasUrl.split('/')[5]?.substring(0, 10)}...`;
                fetchSlots();
            }
            lucide.createIcons();
        }

        // 予約枠の取得
        async function fetchSlots() {
            state.isLoading = true;
            updateUI();

            try {
                const response = await fetch(state.gasUrl);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const data = await response.json();
                state.slots = data.sort((a, b) => new Date(a.start) - new Date(b.start));
                showError(null);
            } catch (err) {
                showError(err.message);
            } finally {
                state.isLoading = false;
                updateUI();
            }
        }

        // 予約の送信
        async function handleBookingSubmit(e) {
            e.preventDefault();
            if (!state.selectedSlot || state.isSubmitting) return;

            state.isSubmitting = true;
            updateUI();

            const payload = {
                eventId: state.selectedSlot.id,
                userName: document.getElementById('user-name').value,
                userEmail: document.getElementById('user-email').value
            };

            try {
                const response = await fetch(state.gasUrl, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (result.success) {
                    showSuccess(result.message);
                    setTimeout(() => {
                        state.selectedSlot = null;
                        document.getElementById('success-state').classList.add('hidden');
                        document.getElementById('booking-form').classList.remove('hidden');
                        fetchSlots();
                    }, 5000);
                } else {
                    throw new Error(result.message);
                }
            } catch (err) {
                alert("予約エラー: " + err.message);
            } finally {
                state.isSubmitting = false;
                updateUI();
            }
        }

        // UI更新
        function updateUI() {
            // Loading
            document.getElementById('loading-state').classList.toggle('hidden', !state.isLoading);
            
            // Slots Container
            const container = document.getElementById('slots-container');
            container.innerHTML = '';
            
            if (!state.isLoading && state.slots.length === 0) {
                document.getElementById('empty-state').classList.remove('hidden');
            } else {
                document.getElementById('empty-state').classList.add('hidden');
                state.slots.forEach(slot => {
                    const isSelected = state.selectedSlot?.id === slot.id;
                    const btn = document.createElement('button');
                    btn.className = `w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                        isSelected ? 'bg-blue-50 border-blue-600 shadow-xl scale-[1.02]' : 'bg-white border-white hover:border-blue-200 hover:shadow-md'
                    }`;
                    btn.onclick = () => selectSlot(slot);
                    
                    const dateObj = new Date(slot.start);
                    const dateStr = dateObj.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
                    const timeStr = `${formatTime(slot.start)} 〜 ${formatTime(slot.end)}`;
                    
                    btn.innerHTML = `
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-6">
                                <div class="w-14 h-14 rounded-xl flex flex-col items-center justify-center ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}">
                                    <span class="text-[10px] uppercase font-bold">${dateObj.toLocaleDateString('ja-JP', {weekday: 'short'})}</span>
                                    <span class="text-xl font-bold">${dateObj.getDate()}</span>
                                </div>
                                <div>
                                    <h3 class="text-lg font-bold text-slate-800">${dateStr}</h3>
                                    <p class="text-slate-500 text-sm font-medium flex items-center gap-1 mt-0.5">
                                        <i data-lucide="clock" class="w-3.5 h-3.5"></i> ${timeStr}
                                    </p>
                                </div>
                            </div>
                            <i data-lucide="chevron-right" class="w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-slate-300'}"></i>
                        </div>
                    `;
                    container.appendChild(btn);
                });
            }

            // Booking Card
            const card = document.getElementById('booking-card');
            if (state.selectedSlot) {
                card.classList.remove('opacity-40', 'pointer-events-none', 'translate-y-4');
                document.getElementById('selected-slot-info').classList.remove('hidden');
                document.getElementById('selected-date-text').textContent = 
                    new Date(state.selectedSlot.start).toLocaleString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }) + '開始';
            } else {
                card.classList.add('opacity-40', 'pointer-events-none', 'translate-y-4');
            }

            // Submit Button
            const btn = document.getElementById('submit-btn');
            btn.disabled = state.isSubmitting;
            btn.innerHTML = state.isSubmitting 
                ? `<i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i><span>送信中...</span>`
                : `<span>予約を確定する</span>`;

            lucide.createIcons();
        }

        function selectSlot(slot) {
            state.selectedSlot = slot;
            updateUI();
        }

        function showView(viewId) {
            document.getElementById('setup-view').classList.add('hidden');
            document.getElementById('main-view').classList.add('hidden');
            document.getElementById(viewId).classList.remove('hidden');
        }

        function showError(msg) {
            const container = document.getElementById('error-container');
            if (msg) {
                container.classList.remove('hidden');
                document.getElementById('error-message').textContent = msg;
                document.getElementById('debug-info').textContent = "Target: " + state.gasUrl;
                document.getElementById('debug-info').classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }

        function showSuccess(msg) {
            document.getElementById('booking-form').classList.add('hidden');
            document.getElementById('success-state').classList.remove('hidden');
            document.getElementById('success-message').textContent = msg;
        }

        function clearManualUrl() {
            localStorage.removeItem('DEBUG_GAS_URL');
            window.location.href = window.location.pathname;
        }

        function formatTime(iso) {
            return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        }

        // Event Listeners
        document.getElementById('setup-form').onsubmit = (e) => {
            e.preventDefault();
            const url = document.getElementById('setup-url-input').value;
            localStorage.setItem('DEBUG_GAS_URL', url);
            state.gasUrl = url;
            init();
        };

        document.getElementById('booking-form').onsubmit = handleBookingSubmit;

        window.onload = init;
    </script>
</body>
</html>
