// =======================================================================
// ===== SUPPRESS NON-CRITICAL ERRORS THAT BLOCK PAYMENTS =====
// =======================================================================
(function suppressNonCriticalErrors() {
  // Suppress OneSignal errors
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    var msg = '';
    
    if (typeof reason === 'string') {
      msg = reason;
    } else if (reason && reason.message) {
      msg = reason.message;
    } else if (reason && reason.toString) {
      msg = reason.toString();
    }
    
    // OneSignal errors - non-critical
    if (msg.indexOf('OneSignal') !== -1 || 
        msg.indexOf('app ID does not match') !== -1 ||
        msg.indexOf('onesignal') !== -1) {
      event.preventDefault();
      console.warn('[Suppressed] OneSignal:', msg);
      return;
    }
    
    // Push notification errors - non-critical
    if (msg.indexOf('push') !== -1 && msg.indexOf('permission') !== -1) {
      event.preventDefault();
      console.warn('[Suppressed] Push:', msg);
      return;
    }
    
    // Service worker errors - non-critical
    if (msg.indexOf('service-worker') !== -1 || msg.indexOf('Service Worker') !== -1) {
      event.preventDefault();
      console.warn('[Suppressed] SW:', msg);
      return;
    }
  });
  
  // Also suppress in console.error to keep it clean
  var origConsoleError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    var msg = args.join(' ');
    if (msg.indexOf('OneSignal') !== -1 || 
        msg.indexOf('app ID does not match') !== -1) {
      return; // Don't log OneSignal noise
    }
    origConsoleError.apply(console, arguments);
  };
})();

/* v2 - Ultra Complete Translation */
window.currentPage = getPageFromHash() || 'numbers';
if (!window.activeNumbers) window.activeNumbers = [];
if (!window.historyData) window.historyData = [];
if (!window.currentFilter) window.currentFilter = 'all';
if (!window.refreshInterval) window.refreshInterval = null;
if (!window.autoRefreshInterval) window.autoRefreshInterval = null;
var _isTranslating = false;

// ===== CACHING SYSTEM =====
var _balanceCache = { value: 0, timestamp: 0, loading: false };
var _numbersCache = { data: [], timestamp: 0, loading: false };
var _historyCache = { data: [], timestamp: 0, loading: false };
var _depositHistoryCache = { data: [], timestamp: 0, loading: false };
var CACHE_TTL = 30000;

window.invalidateBalanceCache = function() { _balanceCache.timestamp = 0; };
window.invalidateNumbersCache = function() { _numbersCache.timestamp = 0; };
window.invalidateHistoryCache = function() { _historyCache.timestamp = 0; };
window.invalidateDepositHistoryCache = function() { _depositHistoryCache.timestamp = 0; };

document.addEventListener('DOMContentLoaded', function() {
  initSidebar(); initNavigation(); initSearch(); initDropdowns(); initKeyboard();
  changeLanguage(currentLang); checkDepositReturn(); startIntervals(); bootSequence();
  setupTranslationObserver();
});

function setupTranslationObserver() {
  var targets = [document.getElementById('mainContent'), document.getElementById('sidebar'), document.getElementById('appPages'), document.getElementById('authPages'), document.body].filter(Boolean);
  var observer = new MutationObserver(function(mutations) {
    if (_isTranslating) return;
    var shouldTranslate = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].type === 'childList' && mutations[i].addedNodes.length > 0) { 
        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
          var node = mutations[i].addedNodes[j];
          if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
            shouldTranslate = true;
            break;
          }
        }
        if (shouldTranslate) break;
      }
    }
    if (shouldTranslate) { 
      clearTimeout(window._translateTimeout); 
      window._translateTimeout = setTimeout(function() { 
        _isTranslating = true; 
        applyTranslations(); 
        _isTranslating = false; 
      }, 50);
    }
  });
  for (var i = 0; i < targets.length; i++) { 
    observer.observe(targets[i], { childList: true, subtree: true, characterData: true }); 
  }
}

function initSidebar() {
  var hamburger = document.getElementById('hamburger'); var sidebar = document.getElementById('sidebar'); var overlay = document.getElementById('sidebarOverlay');
  if (!hamburger || !sidebar) return;
  if (!overlay) { overlay = document.createElement('div'); overlay.id = 'sidebarOverlay'; overlay.className = 'sidebar-overlay'; document.body.appendChild(overlay); }
  hamburger.addEventListener('click', function(e) {
    e.stopPropagation();
    if (sidebar.classList.contains('active')) { closeMobileSidebar(); } else {
      var emailEl = document.getElementById('mobileEmail'); if (emailEl && typeof getUserEmail === 'function') emailEl.textContent = getUserEmail();
      sidebar.classList.add('active'); document.body.classList.add('menu-open'); overlay.style.display = 'block'; overlay.style.pointerEvents = 'all';
      requestAnimationFrame(function() { overlay.classList.add('visible'); });
    }
  });
  overlay.addEventListener('click', closeMobileSidebar);
  var mobileLangDrop = document.getElementById('mobileLangDrop'); var mobileLangBtn = document.getElementById('mobileLangBtn');
  if (sidebar && mobileLangDrop && mobileLangBtn) { sidebar.addEventListener('click', function(e) { if (!mobileLangBtn.contains(e.target) && !mobileLangDrop.contains(e.target)) { mobileLangDrop.classList.remove('show','open','active'); mobileLangBtn.classList.remove('open'); } }); }
}

function closeMobileSidebar() {
  var sidebar = document.getElementById('sidebar'); var overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('active'); document.body.classList.remove('menu-open');
  if (overlay) { overlay.classList.remove('visible','active'); overlay.style.display = 'none'; }
  var mobileLangDrop = document.getElementById('mobileLangDrop'); var mobileLangBtn = document.getElementById('mobileLangBtn');
  if (mobileLangDrop) mobileLangDrop.classList.remove('show','open','active'); if (mobileLangBtn) mobileLangBtn.classList.remove('open');
}

function goToPage(page) {
  closeMobileSidebar(); window.scrollTo(0, 0);
  var pageMap = { 'home':'numbers', 'add-funds':'deposit' }; page = pageMap[page] || page;
  window.currentPage = page; updateHash(page);
  document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); }); var btn = document.querySelector(".nav-link[data-page='" + page + "']"); if (btn) btn.classList.add('active');
  document.querySelectorAll('.menu-nav-btn').forEach(function(b) { b.classList.remove('active'); }); var mobileBtn = document.querySelector(".menu-nav-btn[data-page='" + page + "']"); if (mobileBtn) mobileBtn.classList.add('active');
  document.querySelectorAll('.dropdown-menu button[data-page]').forEach(function(b) { b.classList.remove('active-link'); }); var dropdownBtn = document.querySelector(".dropdown-menu button[data-page='" + page + "']"); if (dropdownBtn) dropdownBtn.classList.add('active-link');
  renderMainContent();
  preLoadPageData(page);
}

window.handleNav = function(page) { goToPage(page); };
window.closeSidebar = function() { closeMobileSidebar(); };
window.toggleMobileLang = function() { var b = document.getElementById('mobileLangBtn'); var d = document.getElementById('mobileLangDrop'); if (!b||!d) return; d.classList.toggle('show', !d.classList.contains('show')); b.classList.toggle('open', !b.classList.contains('open')); };

function getPageFromHash() {
  var h = window.location.hash.replace('#','').trim();
  var m = {
    'numbers':'numbers',
    'home':'numbers',
    'add-funds':'deposit',
    'deposit':'deposit',
    'history':'history',
    'referral':'settings',
    'settings':'settings',
    'help':'help',
    'contacts':'contacts'
  };
  return m[h] || h || 'numbers';
}
function updateHash(page) { if (window.location.hash.replace('#','') !== page) window.history.replaceState(null,'','#'+page); }
function navigateTo(page) { goToPage(page); }
function initNavigation() { document.querySelectorAll('.nav-link[data-page]').forEach(function(link) { link.addEventListener('click', function() { goToPage(this.dataset.page); }); }); }
window.addEventListener('hashchange', function() { var page = getPageFromHash(); if (page !== window.currentPage) goToPage(page); });

function preLoadPageData(page) {
  if (page === 'history') loadHistory();
  else if (page === 'numbers') loadNumbers();
  else if (page === 'deposit') { loadBalance(); if (typeof loadDepositHistory === 'function') loadDepositHistory(); }
  else loadBalance();
  return Promise.resolve();
}

function initSearch() { var s = document.getElementById('serviceSearch'); if (s) s.addEventListener('input', function() { if (typeof renderSidebar === 'function') renderSidebar(this.value); }); }
function initDropdowns() {
  var u = document.querySelector('.user-info'); var l = document.getElementById('desktopLangBtn');
  if (u) u.addEventListener('click', function(e) { e.stopPropagation(); toggleDropdown('.user-dropdown'); });
  if (l) l.addEventListener('click', function(e) { e.stopPropagation(); toggleDropdown('#desktopLangDrop'); });
  document.addEventListener('click', function(e) { if (!e.target.closest('.user-menu')) closeDropdown('.user-dropdown'); if (!e.target.closest('.language-menu')) closeDropdown('#desktopLangDrop'); });
}
function toggleDropdown(sel) { var d = document.querySelector(sel); if (d) d.style.display = d.style.display === 'block' ? 'none' : 'block'; }
function closeDropdown(sel) { var d = document.querySelector(sel); if (d) d.style.display = 'none'; }
function initKeyboard() { document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { if (typeof closeModal === 'function') closeModal(); closeDropdown('.user-dropdown'); closeDropdown('#desktopLangDrop'); closeMobileSidebar(); } }); }

function startIntervals() { refreshInterval = setInterval(checkExpiredNumbers, 1000); }
function stopIntervals() { if (refreshInterval) clearInterval(refreshInterval); if (autoRefreshInterval) clearInterval(autoRefreshInterval); }

async function checkExpiredNumbers() {
  if (!window.activeNumbers || window.activeNumbers.length === 0) return;
  var changed = false;
  window.activeNumbers.forEach(function(n) {
    if (n.status !== 'waiting' && n.status !== 'received') return;
    var timerEl = document.getElementById('timer-active-' + n.id); var waitTimer = document.getElementById('timer-wait-' + n.id); var currentTimerEl = timerEl || waitTimer;
    if (!currentTimerEl) return;
    var timeStr = currentTimerEl.textContent.trim(); var parts = timeStr.split(':'); var totalSeconds = (parseInt(parts[0],10)||0)*60 + (parseInt(parts[1],10)||0);
    if (totalSeconds <= 0) { n.status = 'expired'; changed = true; currentTimerEl.textContent = '00:00'; fetch('/api/numbers/' + n.id + '/expire', { method:'POST' }).catch(function(){}); showToast(t('Number expired'), 'error'); return; }
    totalSeconds--; var newTimeStr = String(Math.floor(totalSeconds/60)).padStart(2,'0') + ':' + String(totalSeconds%60).padStart(2,'0');
    if (timerEl) timerEl.textContent = newTimeStr; if (waitTimer) waitTimer.textContent = newTimeStr;
  });
  if (changed) { window.invalidateBalanceCache(); window.invalidateNumbersCache(); await loadBalance(true); await loadNumbers(true); if (window.currentPage === 'numbers') renderMainContent(); }
}

function formatTime(seconds) { var m = Math.floor(seconds/60); var s = seconds%60; return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }

function showToast(message, type) {
  type = type || 'success'; var container = document.getElementById('toastContainer'); if (!container) return;
  var toast = document.createElement('div'); toast.className = 'toast ' + type;
  var icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
  var colors = { success:'var(--accent)', error:'var(--danger)', info:'var(--info)' };
  toast.innerHTML = '<i class="fas '+(icons[type]||icons.info)+'" style="color:'+(colors[type]||colors.info)+'"></i> ' + message;
  container.appendChild(toast); setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3000);
}

function updateBalanceDisplay(amount) { var el = document.getElementById('balanceAmount'); if (el) el.textContent = '$' + amount.toFixed(2); _balanceCache.value = amount; }
window.syncBalance = updateBalanceDisplay;

async function loadBalance(forceRefresh) {
  if (typeof getUserEmail !== 'function') return _balanceCache.value;
  var now = Date.now();
  if (!forceRefresh && _balanceCache.timestamp && (now - _balanceCache.timestamp) < CACHE_TTL) { updateBalanceDisplay(_balanceCache.value); return _balanceCache.value; }
  if (_balanceCache.loading) return new Promise(function(resolve) { var check = setInterval(function() { if (!_balanceCache.loading) { clearInterval(check); resolve(_balanceCache.value); } }, 50); });
  _balanceCache.loading = true;
  try { var r = await fetch('/api/user/' + getUserEmail()); if (!r.ok) throw new Error(); var d = await r.json(); _balanceCache.value = d.balance; _balanceCache.timestamp = now; updateBalanceDisplay(d.balance); return d.balance; } catch(e) { return _balanceCache.value; } finally { _balanceCache.loading = false; }
}

async function loadNumbers(forceRefresh) {
  if (typeof getUserEmail !== 'function') { window.activeNumbers = []; return; }
  var now = Date.now();
  if (!forceRefresh && _numbersCache.timestamp && (now - _numbersCache.timestamp) < CACHE_TTL) { window.activeNumbers = _numbersCache.data; return; }
  if (_numbersCache.loading) return;
  _numbersCache.loading = true;
  try { var r = await fetch('/api/numbers/' + getUserEmail()); if (!r.ok) throw new Error(); _numbersCache.data = await r.json(); _numbersCache.timestamp = now; window.activeNumbers = _numbersCache.data; } catch(e) { window.activeNumbers = _numbersCache.data || []; } finally { _numbersCache.loading = false; }
}

async function loadHistory(forceRefresh) {
  if (typeof getUserEmail !== 'function') { window.historyData = []; return; }
  var now = Date.now();
  if (!forceRefresh && _historyCache.timestamp && (now - _historyCache.timestamp) < CACHE_TTL) { window.historyData = _historyCache.data; return; }
  if (_historyCache.loading) return;
  _historyCache.loading = true;
  try { var r = await fetch('/api/history/' + getUserEmail()); if (!r.ok) throw new Error(); _historyCache.data = await r.json(); _historyCache.timestamp = now; window.historyData = _historyCache.data; } catch(e) { window.historyData = _historyCache.data || []; } finally { _historyCache.loading = false; }
}

function renderMainContent() {
  var main = document.getElementById('mainContent'); if (!main) return;
  var page = window.currentPage; var functionName = 'render' + page.charAt(0).toUpperCase() + page.slice(1) + 'Page';
  if (typeof window[functionName] === 'function') { try { window[functionName](main); } catch(error) { main.innerHTML = '<div style="padding:20px;background:#ffebee;border:2px solid red;border-radius:12px;color:#c62828;">CRASH: '+error.message+'</div>'; } }
  else { main.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>'+t('Page')+' "'+page+'" '+t('is missing')+'</p></div>'; }
  if (page === 'deposit') { var el = document.getElementById('depositCurrentBalance'); if (el) el.textContent = '$' + _balanceCache.value.toFixed(2); }
  setTimeout(function() { applyTranslations(); }, 100);
}

function copyNumber(phone) { navigator.clipboard.writeText(phone.replace(/\s/g,'')).then(function() { showToast(t('Number copied to clipboard'), 'success'); }).catch(function() { showToast(t('Copy failed'), 'error'); }); }
async function cancelNumber(id) { if (!confirm(t('Are you sure you want to cancel this number?'))) return; try { var r = await fetch('/api/numbers/'+id, {method:'DELETE'}); if (!r.ok) throw new Error(); var d = await r.json(); if (d.error) { showToast(d.error, 'error'); return; } window.invalidateBalanceCache(); updateBalanceDisplay(d.balance); renderMainContent(); showToast(t('Number cancelled, balance refunded'), 'info'); } catch(e) { showToast(t('Error cancelling number'), 'error'); } }
async function refreshNumber(id) { try { var r = await fetch('/api/numbers/'+id+'/expire', {method:'POST'}); if (!r.ok) throw new Error(); renderMainContent(); showToast(t('Requesting new number...'), 'info'); } catch(e) { showToast(t('Error refreshing number'), 'error'); } }
function setFilter(filter) { window.currentFilter = filter; renderMainContent(); }
function refreshAllNumbers() { window.invalidateNumbersCache(); loadNumbers(true).then(function() { showToast(t('All numbers refreshed'), 'info'); renderMainContent(); }); }

var depositPollingInterval = null;
function checkDepositReturn() {
  var p = new URLSearchParams(window.location.search);
  var s = p.get('deposit');
  var ref = p.get('ref');
  
  if (s) window.history.replaceState({}, '', window.location.pathname);
  
  Promise.all([loadBalance(true), (typeof loadDepositHistory === 'function' ? loadDepositHistory(true) : Promise.resolve())]).then(function() {
    if (s === 'success' && ref) {
      showToast(t('Payment submitted! Checking status...'), 'info');
      startDepositPollingByRef(ref);
    } else if (s === 'cancel' || s === 'cancelled') {
      showToast(t('Payment was cancelled.'), 'error');
    } else if (s === 'failed' || s === 'declined') {
      showToast(t('Payment failed.'), 'error');
    } else {
      if (window.depositHistoryData && window.depositHistoryData.length > 0) {
        var pendingDep = window.depositHistoryData.find(function(d) { return d.status === 'pending'; });
        if (pendingDep && pendingDep.reference) {
          startDepositPollingByRef(pendingDep.reference);
        }
      }
    }
  });
}

function startDepositPollingByRef(reference) {
  if (depositPollingInterval) clearInterval(depositPollingInterval);
  
  var attempts = 0;
  var balanceRetryCount = 0;
  
  depositPollingInterval = setInterval(function() {
    attempts++;
    
    fetch('/api/deposit/status/' + reference)
      .then(function(res) {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then(function(data) {
        if (data.status === 'completed') {
          showToast(t('Payment successful! Balance updated.'), 'success');
          stopDepositPolling();
          
          window.invalidateBalanceCache();
          window.invalidateDepositHistoryCache();
          balanceRetryCount = 0;
          (function keepRefreshingBalance() {
            balanceRetryCount++;
            if (balanceRetryCount > 24) return;
            setTimeout(function() {
              loadBalance(true);
              keepRefreshingBalance();
            }, 5000);
          })();
          
          if (typeof loadDepositHistory === 'function') loadDepositHistory(true);
          if (window.currentPage === 'deposit') renderMainContent();
          return;
        }
        
        if (data.status === 'failed' || data.status === 'declined' || data.status === 'cancelled') {
          var msg = data.status === 'declined' ? t('Payment was declined.') :
                    data.status === 'cancelled' ? t('Payment was cancelled.') : t('Payment failed.');
          showToast(msg, 'error');
          stopDepositPolling();
          if (typeof loadDepositHistory === 'function') loadDepositHistory(true);
          if (window.currentPage === 'deposit') renderMainContent();
          return;
        }
        
        if (attempts >= 36) {
          stopDepositPolling();
          showToast(t('Payment is still processing. It will update automatically.'), 'info');
          if (typeof startBackgroundPolling === 'function') {
            startBackgroundPolling(reference);
          }
        }
      })
      .catch(function(err) {
        console.error('Deposit status check error:', err);
        if (attempts >= 36) {
          stopDepositPolling();
          showToast(t('Could not verify payment status. Please check deposit history.'), 'error');
        }
      });
  }, 5000);
}

function stopDepositPolling() {
  if (depositPollingInterval) {
    clearInterval(depositPollingInterval);
    depositPollingInterval = null;
  }
}

window.handleLogout = function() { closeMobileSidebar(); if (typeof logout === 'function') logout(); };
window.handleDeleteAccount = function() { closeMobileSidebar(); deleteAccount(); };
function deleteAccount() { if (confirm(t('Are you sure you want to delete your account? This action cannot be undone.'))) showToast(t('Account deletion not implemented yet'), 'error'); }

// ================================================================
// ====== MEGA TRANSLATION DICTIONARY (ALL PAGES) ======
// ================================================================
var translations = {
  en: {
    'Home':'Home','History':'History','Pricing':'Pricing','Help':'Help',
    'Settings':'Settings','Contacts':'Contacts','Add Funds':'Add Funds',
    'Logout':'Logout','Delete Account':'Delete Account',
    'Menu':'Menu','Language':'Language',
    'Referral Program':'Referral Program','Help Center':'Help Center',
    'English':'English','Chinese':'中文','Russian':'Русский',
    'Search services...':'Search services...',
    'Recommended':'Recommended','Popular Services':'Popular Services',
    'Social Media':'Social Media','E-Commerce':'E-Commerce',
    'All Services':'All Services','numbers':'numbers',
    'Get Virtual Number':'Get Virtual Number',
    'Service':'Service','Select a service...':'Select a service...',
    'Country / Region':'Country / Region','Select country...':'Select country...',
    'Payment Method':'Payment Method',
    'Tether - Lowest fees':'Tether - Lowest fees',
    'Enter service name (e.g., MyApp, CustomService)':'Enter service name (e.g., MyApp, CustomService)',
    'Cancel':'Cancel','Get Number':'Get Number','Close':'Close',
    'Active':'Active','Waiting':'Waiting','Expired':'Expired',
    'Received':'Received','Cancelled':'Cancelled','Failed':'Failed',
    'Pending':'Pending','Completed':'Completed','Timeout':'Timeout',
    'Copy':'Copy','Cancel Number':'Cancel Number',
    'Number copied to clipboard':'Number copied to clipboard',
    'Copy failed':'Copy failed',
    'Number cancelled, balance refunded':'Number cancelled, balance refunded',
    'Error cancelling number':'Error cancelling number',
    'Requesting new number...':'Requesting new number...',
    'Error refreshing number':'Error refreshing number',
    'All numbers refreshed':'All numbers refreshed',
    'Number expired':'Number expired',
    'Waiting for SMS':'Waiting for SMS','Time remaining':'Time remaining',
    'Refresh':'Refresh','Copy Number':'Copy Number',
    'No active numbers':'No active numbers',
    'Your virtual numbers will appear here':'Your virtual numbers will appear here',
    'No history yet':'No history yet',
    'Your transaction history will appear here':'Your transaction history will appear here',
    'No deposit history':'No deposit history',
    'No results found':'No results found','Loading...':'Loading...',
    'All':'All','Filter':'Filter',
    'Date':'Date','Amount':'Amount','Status':'Status',
    'Number':'Number','Country':'Country',
    'Phone':'Phone','Code':'Code','Message':'Message',
    'SMS History':'SMS History',
    'Top Up Balance':'Top Up Balance',
    'USDT':'USDT','Bank Cards':'Bank Cards','Cryptocurrency':'Cryptocurrency',
    'USDT - TRC20':'USDT - TRC20',
    'Recent Deposits':'Recent Deposits',
    'Custom amount':'Custom amount',
    'Enter amount':'Enter amount',
    'Top Up':'Top Up','Deposit':'Deposit','Pay':'Pay',
    'Current Balance':'Current Balance',
    'Select amount':'Select amount',
    'Minimum deposit':'Minimum deposit','Minimum':'Minimum',
    'Maximum deposit':'Maximum deposit','Maximum':'Maximum',
    'Deposit History':'Deposit History',
    'Payment submitted! Checking status...':'Payment submitted! Checking status...',
    'Payment successful! Balance updated.':'Payment successful! Balance updated.',
    'Payment was cancelled.':'Payment was cancelled.',
    'Payment failed or cancelled.':'Payment failed or cancelled.',
    'Payment is still processing. It will update automatically.':'Payment is still processing. It will update automatically.',
    'Recommend the service and earn money':'Recommend the service and earn money',
    'Share your referral link and earn 10% commission on every purchase':'Share your referral link and earn 10% commission on every purchase',
    'Read more...':'Read more...',
    'TOTAL COMMISSIONS':'TOTAL COMMISSIONS',
    'Lifetime earnings':'Lifetime earnings',
    'REFERRAL COUNT':'REFERRAL COUNT',
    'invited friends':'invited friends',
    'Copy referral link':'Copy referral link',
    'Referral link copied':'Referral link copied',
    'Withdraw Commissions':'Withdraw Commissions',
    'Withdrawal method':'Withdrawal method',
    'Select withdrawal method...':'Select withdrawal method...',
    'Amount (USD)':'Amount (USD)',
    'Enter withdrawal amount':'Enter withdrawal amount',
    'Minimum withdrawal':'Minimum withdrawal',
    'Request Withdrawal':'Request Withdrawal',
    'Withdrawal requested successfully':'Withdrawal requested successfully',
    'Error requesting withdrawal':'Error requesting withdrawal',
    'Referral History':'Referral History',
    'Withdrawal History':'Withdrawal History',
    'No referrals yet':'No referrals yet',
    'No withdrawals yet':'No withdrawals yet',
    'When someone signs up using your link, they will appear here':'When someone signs up using your link, they will appear here',
    'Your withdrawal history will appear here':'Your withdrawal history will appear here',
    'Commission':'Commission','User':'User',
    'Withdrawn':'Withdrawn',
    'Earn':'Earn','for each referral':'for each referral',
    'Your referral link':'Your referral link','Copy Link':'Copy Link',
    'Referral earnings':'Referral earnings','Total referrals':'Total referrals',
    'Share your link':'Share your link',
    'commission':'commission','purchase':'purchase',
    'earn 10%':'earn 10%','10% commission':'10% commission',
    'Contact Us':'Contact Us','Get in Touch':'Get in Touch',
    'Send Message':'Send Message',
    'Subject':'Subject','Your message':'Your message',
    'Name':'Name','Email':'Email','Telegram Support':'Telegram Support',
    'Message sent successfully':'Message sent successfully',
    'Error sending message':'Error sending message',
    'Type your message...':'Type your message...',
    'Enter your name':'Enter your name',
    'Enter subject':'Enter subject',
    'Enter your email':'Enter your email',
    'FAQ':'FAQ','Frequently Asked Questions':'Frequently Asked Questions',
    'How it works':'How it works','Support':'Support',
    'User Guide':'User Guide',
    'Virtual Number Service – User Guide':'Virtual Number Service – User Guide',
    'How to Use Our Service':'How to Use Our Service',
    'Service Updates':'Service Updates',
    'Join our Telegram channel for the latest service updates and notifications':'Join our Telegram channel for the latest service updates and notifications',
    'Telegram channel':'Telegram channel',
    'Purchase Not Showing?':'Purchase Not Showing?',
    'Tap Restore Purchases to retrieve your purchase':'Tap Restore Purchases to retrieve your purchase',
    'Restore Purchases':'Restore Purchases',
    'If the issue persists, contact our support team with a screenshot of your receipt or payment confirmation':'If the issue persists, contact our support team with a screenshot of your receipt or payment confirmation',
    'contact our support team with a screenshot of your receipt or payment confirmation':'contact our support team with a screenshot of your receipt or payment confirmation',
    'receipt or payment confirmation':'receipt or payment confirmation',
    'Step 1':'Step 1','Step 2':'Step 2','Step 3':'Step 3','Step 4':'Step 4',
    'Select the service you need (e.g., WhatsApp, Telegram)':'Select the service you need (e.g., WhatsApp, Telegram)',
    'Choose the country or region for your number':'Choose the country or region for your number',
    'Get a virtual number and paste it during registration':'Get a virtual number and paste it during registration',
    'The verification SMS will appear in our app':'The verification SMS will appear in our app',
    'Select a service':'Select a service',
    'Choose a country':'Choose a country',
    'Get your number':'Get your number',
    'Service Types':'Service Types',
    'Activations':'Activations',
    'Short-term numbers valid for approximately 20 minutes':'Short-term numbers valid for approximately 20 minutes',
    'approximately 20 minutes':'approximately 20 minutes',
    'SMS Not Received?':'SMS Not Received?',
    'Wait at least 3 minutes before canceling':'Wait at least 3 minutes before canceling',
    'at least 3 minutes':'at least 3 minutes',
    'Cancel to receive a refund and try a different number':'Cancel to receive a refund and try a different number',
    'receive a refund and try a different number':'receive a refund and try a different number',
    'Some services may have delays':'Some services may have delays',
    'Account Bans':'Account Bans',
    'Using virtual numbers may result in account restrictions on some platforms':'Using virtual numbers may result in account restrictions on some platforms',
    'may result in account restrictions on some platforms':'may result in account restrictions on some platforms',
    'We are not responsible for third-party account actions':'We are not responsible for third-party account actions',
    'not responsible for third-party account actions':'not responsible for third-party account actions',
    'Privacy & Security':'Privacy & Security',
    'We do not store your SMS messages':'We do not store your SMS messages',
    'do not store your SMS messages':'do not store your SMS messages',
    'All numbers are temporary and anonymous':'All numbers are temporary and anonymous',
    'temporary and anonymous':'temporary and anonymous',
    'Your personal data is protected':'Your personal data is protected',
    'personal data is protected':'personal data is protected',
    'Need Help?':'Need Help?',
    'Our support team is available 24/7':'Our support team is available 24/7',
    'available 24/7':'available 24/7',
    'Troubleshooting':'Troubleshooting',
    'If you didn\'t receive a code':'If you didn\'t receive a code',
    'Try requesting a new number':'Try requesting a new number',
    'Check if the service is available':'Check if the service is available',
    'Contact support':'Contact support',
    'No Cancellations Within 45s':'No Cancellations Within 45s',
    'Please wait at least 45 seconds before canceling to allow the system to process your request properly':'Please wait at least 45 seconds before canceling to allow the system to process your request properly',
    'wait at least 45 seconds before canceling':'wait at least 45 seconds before canceling',
    'allow the system to process your request properly':'allow the system to process your request properly',
    'If you don\'t receive an SMS within 3 minutes, you can cancel and get a refund, then try a different number':'If you don\'t receive an SMS within 3 minutes, you can cancel and get a refund, then try a different number',
    'within 3 minutes':'within 3 minutes',
    'cancel and get a refund':'cancel and get a refund',
    'try a different number':'try a different number',
    'Automatic Refunds':'Automatic Refunds',
    'If a number doesn\'t receive an SMS before it expires, you\'ll be automatically refunded':'If a number doesn\'t receive an SMS before it expires, you\'ll be automatically refunded',
    'doesn\'t receive an SMS before it expires':'doesn\'t receive an SMS before it expires',
    'you\'ll be automatically refunded':'you\'ll be automatically refunded',
    'Why use temporary phone numbers':'Why use temporary phone numbers',
    'Create multiple accounts on platforms without using your real phone number':'Create multiple accounts on platforms without using your real phone number',
    'Create multiple accounts':'Create multiple accounts',
    'without using your real phone number':'without using your real phone number',
    'Protect your privacy when signing up for new services':'Protect your privacy when signing up for new services',
    'Protect your privacy':'Protect your privacy',
    'when signing up for new services':'when signing up for new services',
    'Bypass regional restrictions and access content from anywhere':'Bypass regional restrictions and access content from anywhere',
    'Bypass regional restrictions':'Bypass regional restrictions',
    'access content from anywhere':'access content from anywhere',
    'Avoid spam and unwanted marketing messages on your personal number':'Avoid spam and unwanted marketing messages on your personal number',
    'Avoid spam':'Avoid spam',
    'unwanted marketing messages':'unwanted marketing messages',
    'on your personal number':'on your personal number',
    'No SMS received?':'No SMS received?',
    'Cancel and try another number':'Cancel and try another number',
    'Wait for the timer to expire':'Wait for the timer to expire',
    'The code will appear here automatically':'The code will appear here automatically',
    'Profile':'Profile','Referral':'Referral',
    'Save':'Save','Submit':'Submit','Update':'Update',
    'Password':'Password','Change Password':'Change Password',
    'Confirm Password':'Confirm Password',
    'Login':'Login','Sign Up':'Sign Up','Register':'Register',
    'Forgot Password?':'Forgot Password?',
    'Don\'t have an account?':'Don\'t have an account?',
    'Already have an account?':'Already have an account?',
    'Sign in':'Sign in','Create account':'Create account',
    'Logging in...':'Logging in...','Creating account...':'Creating account...',
    'Login successful':'Login successful','Registration successful':'Registration successful',
    'Invalid email or password':'Invalid email or password',
    'Passwords do not match':'Passwords do not match',
    'Account already exists':'Account already exists',
    'Reset Password':'Reset Password',
    'Welcome back':'Welcome back','Create your account':'Create your account',
    'Enter your email':'Enter your email','Enter your password':'Enter your password',
    'Remember me':'Remember me',
    'Error':'Error','Success':'Success','Info':'Info',
    'Logging out...':'Logging out...',
    'Account deletion not implemented yet':'Account deletion not implemented yet',
    'Are you sure you want to delete your account? This action cannot be undone.':'Are you sure you want to delete your account? This action cannot be undone.',
    'Are you sure you want to cancel this number?':'Are you sure you want to cancel this number?',
    'Language changed to':'Language changed to',
    'Page':'Page','is missing':'is missing',
    'or':'or','USD':'USD','per':'per',
    'available':'available','online':'online',
    'Back':'Back','Next':'Next','Continue':'Continue',
    'Show more':'Show more','Show less':'Show less',
    'View all':'View all','See all':'See all',
    'Copied!':'Copied!','Link copied':'Link copied',
    'Nothing here yet':'Nothing here yet',
    'You have no items':'You have no items',
    'Rent Number': 'Rent Number',
    'Virtual Cards': 'Virtual Cards',
    '租用号码': 'Rent Number',
    '虚拟卡': 'Virtual Cards',
    'Аренда номера': 'Rent Number',
    'Виртуальные карты': 'Virtual Cards', 
    'Start by getting a number':'Start by getting a number',
    'Get started':'Get started'
  },
  zh: {
    'Home':'首页','History':'历史记录','Pricing':'价格','Help':'帮助',
    'Settings':'设置','Contacts':'联系我们','Add Funds':'充值',
    'Logout':'退出登录','Delete Account':'删除账户',
    'Menu':'菜单','Language':'语言',
    'Referral Program':'推荐计划','Help Center':'帮助中心',
    'English':'English','Chinese':'中文','Russian':'Русский',
    'Search services...':'搜索服务...',
    'Recommended':'推荐','Popular Services':'热门服务',
    'Social Media':'社交媒体','E-Commerce':'电子商务',
    'All Services':'所有服务','numbers':'个号码',
    'Get Virtual Number':'获取虚拟号码',
    'Service':'服务','Select a service...':'选择服务...',
    'Country / Region':'国家/地区','Select country...':'选择国家...',
    'Payment Method':'支付方式',
    'Tether - Lowest fees':'泰达币 - 最低手续费',
    'Enter service name (e.g., MyApp, CustomService)':'输入服务名称（如：MyApp）',
    'Cancel':'取消','Get Number':'获取号码','Close':'关闭',
    'Active':'活跃','Waiting':'等待中','Expired':'已过期',
    'Received':'已接收','Cancelled':'已取消','Failed':'失败',
    'Pending':'处理中','Completed':'已完成','Timeout':'超时',
    'Copy':'复制','Cancel Number':'取消号码',
    'Number copied to clipboard':'号码已复制到剪贴板',
    'Copy failed':'复制失败',
    'Number cancelled, balance refunded':'号码已取消，余额已退款',
    'Error cancelling number':'取消号码时出错',
    'Requesting new number...':'正在请求新号码...',
    'Error refreshing number':'刷新号码时出错',
    'All numbers refreshed':'所有号码已刷新',
    'Number expired':'号码已过期',
    'Waiting for SMS':'等待短信','Time remaining':'剩余时间',
    'Refresh':'刷新','Copy Number':'复制号码',
    'No active numbers':'暂无活跃号码',
    'Your virtual numbers will appear here':'您的虚拟号码将显示在这里',
    'No history yet':'暂无历史记录',
    'Your transaction history will appear here':'您的交易历史将显示在这里',
    'No deposit history':'暂无充值记录',
    'No results found':'未找到结果','Loading...':'加载中...',
    'All':'全部','Filter':'筛选',
    'Date':'日期','Amount':'金额','Status':'状态',
    'Number':'号码','Country':'国家',
    'Phone':'电话','Code':'验证码','Message':'消息',
    'SMS History':'短信历史',
    'Top Up Balance':'充值余额',
    'USDT':'USDT','Bank Cards':'银行卡','Cryptocurrency':'加密货币',
    'USDT - TRC20':'USDT - TRC20',
    'Recent Deposits':'最近充值',
    'Custom amount':'自定义金额',
    'Enter amount':'输入金额',
    'Top Up':'充值','Deposit':'充值','Pay':'支付',
    'Current Balance':'当前余额',
    'Select amount':'选择金额',
    'Minimum deposit':'最低充值','Minimum':'最低',
    'Maximum deposit':'最高充值','Maximum':'最高',
    'Deposit History':'充值记录',
    'Payment submitted! Checking status...':'支付已提交！正在检查状态...',
    'Payment successful! Balance updated.':'支付成功！余额已更新。',
    'Payment was cancelled.':'支付已取消。',
    'Payment failed or cancelled.':'支付失败或已取消。',
    'Payment is still processing. It will update automatically.':'支付仍在处理中，将自动更新。',
    'Recommend the service and earn money':'推荐服务赚取佣金',
    'Share your referral link and earn 10% commission on every purchase':'分享您的推荐链接，每笔购买可赚取10%佣金',
    'Read more...':'阅读更多...',
    'TOTAL COMMISSIONS':'总佣金',
    'Lifetime earnings':'终身收益',
    'REFERRAL COUNT':'邀请人数',
    'invited friends':'位好友',
    'Copy referral link':'复制推荐链接',
    'Referral link copied':'推荐链接已复制',
    'Withdraw Commissions':'提现佣金',
    'Withdrawal method':'提现方式',
    'Select withdrawal method...':'选择提现方式...',
    'Amount (USD)':'金额（美元）',
    'Enter withdrawal amount':'输入提现金额',
    'Minimum withdrawal':'最低提现',
    'Request Withdrawal':'申请提现',
    'Withdrawal requested successfully':'提现申请已提交',
    'Error requesting withdrawal':'提现申请失败',
    'Referral History':'推荐记录',
    'Withdrawal History':'提现记录',
    'No referrals yet':'暂无推荐记录',
    'No withdrawals yet':'暂无提现记录',
    'When someone signs up using your link, they will appear here':'当有人通过您的链接注册时，将显示在这里',
    'Your withdrawal history will appear here':'您的提现记录将显示在这里',
    'Commission':'佣金','User':'用户',
    'Withdrawn':'已提现',
    'Earn':'赚取','for each referral':'每个推荐',
    'Your referral link':'您的推荐链接','Copy Link':'复制链接',
    'Referral earnings':'推荐收益','Total referrals':'总推荐数',
    'Share your link':'分享您的链接',
    'commission':'佣金','purchase':'购买',
    'earn 10%':'赚取10%','10% commission':'10%佣金',
    'Contact Us':'联系我们','Get in Touch':'联系我们',
    'Send Message':'发送消息',
    'Subject':'主题','Your message':'您的消息',
    'Name':'姓名','Email':'邮箱',
    'Message sent successfully':'消息发送成功',
    'Error sending message':'消息发送失败',
    'Type your message...':'输入您的消息...',
    'Enter your name':'输入您的姓名',
    'Enter subject':'输入主题',
    'Enter your email':'输入您的邮箱',
    'FAQ':'常见问题','Frequently Asked Questions':'常见问题解答',
    'How it works':'使用方法','Support':'技术支持',
    'User Guide':'用户指南',
    'Virtual Number Service – User Guide':'虚拟号码服务 – 用户指南',
    'How to Use Our Service':'如何使用我们的服务',
    'Service Updates':'服务更新',
    'Join our Telegram channel for the latest service updates and notifications':'加入我们的Telegram频道获取最新服务更新和通知',
    'Telegram channel':'Telegram频道',
    'Purchase Not Showing?':'购买未显示？',
    'Tap Restore Purchases to retrieve your purchase':'点击恢复购买以获取您的购买',
    'Restore Purchases':'恢复购买',
    'If the issue persists, contact our support team with a screenshot of your receipt or payment confirmation':'如果问题仍然存在，请联系我们的支持团队并提供收据或付款确认截图',
    'contact our support team with a screenshot of your receipt or payment confirmation':'请联系支持团队并提供收据或付款确认截图',
    'receipt or payment confirmation':'收据或付款确认',
    'Step 1':'第一步','Step 2':'第二步','Step 3':'第三步','Step 4':'第四步',
    'Select the service you need (e.g., WhatsApp, Telegram)':'选择您需要的服务（如WhatsApp、Telegram）',
    'Choose the country or region for your number':'选择号码的国家或地区',
    'Get a virtual number and paste it during registration':'获取虚拟号码并在注册时粘贴',
    'The verification SMS will appear in our app':'验证短信将显示在我们的应用中',
    'Select a service':'选择服务',
    'Choose a country':'选择国家',
    'Get your number':'获取号码',
    'Service Types':'服务类型',
    'Activations':'短期激活',
    'Short-term numbers valid for approximately 20 minutes':'短期号码，有效期约20分钟',
    'approximately 20 minutes':'约20分钟',
    'SMS Not Received?':'没收到短信？',
    'Wait at least 3 minutes before canceling':'取消前请至少等待3分钟',
    'at least 3 minutes':'至少3分钟',
    'Cancel to receive a refund and try a different number':'取消以获得退款并尝试其他号码',
    'receive a refund and try a different number':'获得退款并尝试其他号码',
    'Some services may have delays':'某些服务可能会有延迟',
    'Account Bans':'账户封禁',
    'Using virtual numbers may result in account restrictions on some platforms':'使用虚拟号码可能导致某些平台上的账户限制',
    'may result in account restrictions on some platforms':'可能导致某些平台上的账户限制',
    'We are not responsible for third-party account actions':'我们对第三方账户操作不承担责任',
    'not responsible for third-party account actions':'对第三方账户操作不承担责任',
    'Privacy & Security':'隐私与安全',
    'We do not store your SMS messages':'我们不会存储您的短信',
    'do not store your SMS messages':'不会存储您的短信',
    'All numbers are temporary and anonymous':'所有号码都是临时且匿名的',
    'temporary and anonymous':'临时且匿名的',
    'Your personal data is protected':'您的个人数据受到保护',
    'personal data is protected':'个人数据受到保护',
    'Need Help?':'需要帮助？',
    'Our support team is available 24/7':'我们的支持团队全天候24/7在线',
    'available 24/7':'全天候在线',
    'Troubleshooting':'故障排除',
    'If you didn\'t receive a code':'如果没有收到验证码',
    'Try requesting a new number':'尝试请求新号码',
    'Check if the service is available':'检查服务是否可用',
    'Contact support':'联系客服',
    'No Cancellations Within 45s':'45秒内不可取消',
    'Please wait at least 45 seconds before canceling to allow the system to process your request properly':'取消前请至少等待45秒，以便系统正确处理您的请求',
    'wait at least 45 seconds before canceling':'取消前请至少等待45秒',
    'allow the system to process your request properly':'以便系统正确处理您的请求',
    'If you don\'t receive an SMS within 3 minutes, you can cancel and get a refund, then try a different number':'如果3分钟内未收到短信，您可以取消并获得退款，然后尝试其他号码',
    'within 3 minutes':'3分钟内',
    'cancel and get a refund':'取消并获得退款',
    'try a different number':'尝试其他号码',
    'Automatic Refunds':'自动退款',
    'If a number doesn\'t receive an SMS before it expires, you\'ll be automatically refunded':'如果号码在到期前未收到短信，您将自动获得退款',
    'doesn\'t receive an SMS before it expires':'在到期前未收到短信',
    'you\'ll be automatically refunded':'您将自动获得退款',
    'Why use temporary phone numbers':'为什么使用临时手机号码',
    'Create multiple accounts on platforms without using your real phone number':'在平台上创建多个账户，无需使用真实手机号码',
    'Create multiple accounts':'创建多个账户',
    'without using your real phone number':'无需使用真实手机号码',
    'Protect your privacy when signing up for new services':'注册新服务时保护您的隐私',
    'Protect your privacy':'保护您的隐私',
    'when signing up for new services':'注册新服务时',
    'Bypass regional restrictions and access content from anywhere':'绕过地区限制，从任何地方访问内容',
    'Bypass regional restrictions':'绕过地区限制',
    'access content from anywhere':'从任何地方访问内容',
    'Avoid spam and unwanted marketing messages on your personal number':'避免个人号码收到垃圾邮件和不需要的营销信息',
    'Avoid spam':'避免垃圾邮件',
    'unwanted marketing messages':'不需要的营销信息',
    'on your personal number':'在您的个人号码上',
    'No SMS received?':'没收到短信？',
    'Cancel and try another number':'取消并尝试其他号码',
    'Wait for the timer to expire':'等待计时器到期',
    'The code will appear here automatically':'验证码将自动显示在这里',
    'Profile':'个人资料','Referral':'推荐',
    'Save':'保存','Submit':'提交','Update':'更新',
    'Password':'密码','Change Password':'修改密码',
    'Confirm Password':'确认密码',
    'Login':'登录','Sign Up':'注册','Register':'注册',
    'Forgot Password?':'忘记密码？',
    'Don\'t have an account?':'没有账户？',
    'Already have an account?':'已有账户？',
    'Sign in':'登录','Create account':'创建账户',
    'Logging in...':'正在登录...','Creating account...':'正在创建账户...',
    'Login successful':'登录成功','Registration successful':'注册成功',
    'Invalid email or password':'邮箱或密码错误',
    'Passwords do not match':'两次密码不一致',
    'Account already exists':'账户已存在',
    'Reset Password':'重置密码',
    'Welcome back':'欢迎回来','Create your account':'创建您的账户',
    'Enter your email':'输入您的邮箱','Enter your password':'输入您的密码',
    'Remember me':'记住我',
    'Error':'错误','Success':'成功','Info':'信息',
    'Logging out...':'正在退出...',
    'Account deletion not implemented yet':'账户删除功能尚未实现',
    'Are you sure you want to delete your account? This action cannot be undone.':'确定要删除账户吗？此操作无法撤销。',
    'Are you sure you want to cancel this number?':'确定要取消此号码吗？',
    'Language changed to':'语言已更改为',
    'Page':'页面','is missing':'缺失',
    'or':'或','USD':'美元','per':'每',
    'available':'可用','online':'在线',
    'Back':'返回','Next':'下一步','Continue':'继续',
    'Show more':'显示更多','Show less':'显示更少',
    'View all':'查看全部','See all':'查看全部',
    'Copied!':'已复制！','Link copied':'链接已复制',
    'Nothing here yet':'这里还没有内容',
    'Rent Number': '租用号码',
    'Virtual Cards': '虚拟卡',
    '租用号码': '租用号码',
    '虚拟卡': '虚拟卡',
    'Аренда номера': '租用号码',
    'Виртуальные карты': '虚拟卡',
    'You have no items':'您没有项目',
    'Start by getting a number':'从获取一个号码开始',
    'Get started':'开始使用'
  },
  ru: {
    'Home':'Главная','History':'История','Pricing':'Цены','Help':'Помощь',
    'Settings':'Настройки','Contacts':'Контакты','Add Funds':'Пополнить',
    'Logout':'Выйти','Delete Account':'Удалить аккаунт',
    'Menu':'Меню','Language':'Язык',
    'Referral Program':'Реферальная программа','Help Center':'Центр помощи',
    'English':'English','Chinese':'中文','Russian':'Русский',
    'Search services...':'Поиск сервисов...',
    'Recommended':'Рекомендуемые','Popular Services':'Популярные',
    'Social Media':'Соц. сети','E-Commerce':'Интернет-магазины',
    'All Services':'Все сервисы','numbers':'номеров',
    'Get Virtual Number':'Получить номер',
    'Service':'Сервис','Select a service...':'Выберите сервис...',
    'Country / Region':'Страна / Регион','Select country...':'Выберите страну...',
    'Payment Method':'Способ оплаты',
    'Tether - Lowest fees':'Tether - Низкие комиссии',
    'Enter service name (e.g., MyApp, CustomService)':'Введите название (напр., MyApp)',
    'Cancel':'Отмена','Get Number':'Получить номер','Close':'Закрыть',
    'Active':'Активен','Waiting':'Ожидание','Expired':'Истек',
    'Received':'Получен','Cancelled':'Отменен','Failed':'Ошибка',
    'Pending':'Ожидает','Completed':'Завершен','Timeout':'Таймаут',
    'Copy':'Копировать','Cancel Number':'Отменить номер',
    'Number copied to clipboard':'Номер скопирован',
    'Copy failed':'Ошибка копирования',
    'Number cancelled, balance refunded':'Номер отменен, баланс возвращен',
    'Error cancelling number':'Ошибка отмены',
    'Requesting new number...':'Запрос нового номера...',
    'Error refreshing number':'Ошибка обновления',
    'All numbers refreshed':'Все номера обновлены',
    'Number expired':'Номер истек',
    'Waiting for SMS':'Ожидание SMS','Time remaining':'Осталось',
    'Refresh':'Обновить','Copy Number':'Копировать номер',
    'No active numbers':'Нет активных номеров',
    'Your virtual numbers will appear here':'Ваши номера появятся здесь',
    'No history yet':'Истории пока нет',
    'Your transaction history will appear here':'История появится здесь',
    'No deposit history':'Нет истории пополнений',
    'No results found':'Ничего не найдено','Loading...':'Загрузка...',
    'All':'Все','Filter':'Фильтр',
    'Date':'Дата','Amount':'Сумма','Status':'Статус',
    'Number':'Номер','Country':'Страна',
    'Phone':'Телефон','Code':'Код','Message':'Сообщение',
    'SMS History':'История SMS',
    'Top Up Balance':'Пополнить баланс',
    'USDT':'USDT','Bank Cards':'Банковские карты','Cryptocurrency':'Криптовалюта',
    'USDT - TRC20':'USDT - TRC20',
    'Recent Deposits':'Последние пополнения',
    'Custom amount':'Другая сумма',
    'Enter amount':'Введите сумму',
    'Top Up':'Пополнить','Deposit':'Пополнить','Pay':'Оплатить',
    'Current Balance':'Текущий баланс',
    'Select amount':'Выберите сумму',
    'Minimum deposit':'Мин. пополнение','Minimum':'Минимум',
    'Maximum deposit':'Макс. пополнение','Maximum':'Максимум',
    'Deposit History':'История пополнений',
    'Payment submitted! Checking status...':'Платеж отправлен! Проверка...',
    'Payment successful! Balance updated.':'Платеж успешен! Баланс обновлен.',
    'Payment was cancelled.':'Платеж отменен.',
    'Payment failed or cancelled.':'Платеж не удался или отменен.',
    'Payment is still processing. It will update automatically.':'Платеж обрабатывается. Обновится автоматически.',
    'Recommend the service and earn money':'Рекомендуйте сервис и зарабатывайте',
    'Share your referral link and earn 10% commission on every purchase':'Поделитесь реферальной ссылкой и получайте 10% с каждой покупки',
    'Read more...':'Подробнее...',
    'TOTAL COMMISSIONS':'ВСЕГО КОМИССИЙ',
    'Lifetime earnings':'За все время',
    'REFERRAL COUNT':'КОЛИЧЕСТВО РЕФЕРАЛОВ',
    'invited friends':'друзей приглашено',
    'Copy referral link':'Копировать реферальную ссылку',
    'Referral link copied':'Реферальная ссылка скопирована',
    'Withdraw Commissions':'Вывод комиссий',
    'Withdrawal method':'Способ вывода',
    'Select withdrawal method...':'Выберите способ вывода...',
    'Amount (USD)':'Сумма (USD)',
    'Enter withdrawal amount':'Введите сумму вывода',
    'Minimum withdrawal':'Мин. вывод',
    'Request Withdrawal':'Запросить вывод',
    'Withdrawal requested successfully':'Запрос на вывод отправлен',
    'Error requesting withdrawal':'Ошибка запроса вывода',
    'Referral History':'История рефералов',
    'Withdrawal History':'История выводов',
    'No referrals yet':'Рефералов пока нет',
    'No withdrawals yet':'Выводов пока нет',
    'When someone signs up using your link, they will appear here':'Когда кто-то зарегистрируется по вашей ссылке, он появится здесь',
    'Your withdrawal history will appear here':'История выводов появится здесь',
    'Commission':'Комиссия','User':'Пользователь',
    'Withdrawn':'Выведено',
    'Earn':'Зарабатывайте','for each referral':'за каждого реферала',
    'Your referral link':'Ваша реф. ссылка','Copy Link':'Копировать ссылку',
    'Referral earnings':'Реф. заработок','Total referrals':'Всего рефералов',
    'Share your link':'Поделитесь ссылкой',
    'commission':'комиссия','purchase':'покупка',
    'earn 10%':'зарабатывайте 10%','10% commission':'10% комиссия',
    'Contact Us':'Связаться с нами','Get in Touch':'Связаться с нами',
    'Send Message':'Отправить сообщение',
    'Subject':'Тема','Your message':'Ваше сообщение',
    'Name':'Имя','Email':'Email',
    'Message sent successfully':'Сообщение отправлено',
    'Error sending message':'Ошибка отправки',
    'Type your message...':'Введите ваше сообщение...',
    'Enter your name':'Введите ваше имя',
    'Enter subject':'Введите тему',
    'Enter your email':'Введите ваш email',
    'FAQ':'Частые вопросы','Frequently Asked Questions':'Часто задаваемые вопросы',
    'How it works':'Как это работает','Support':'Поддержка',
    'User Guide':'Руководство',
    'Virtual Number Service – User Guide':'Виртуальные номера – Руководство',
    'How to Use Our Service':'Как использовать наш сервис',
    'Service Updates':'Обновления сервиса',
    'Join our Telegram channel for the latest service updates and notifications':'Присоединяйтесь к нашему Telegram каналу для последних обновлений',
    'Telegram channel':'Telegram канал',
    'Purchase Not Showing?':'Покупка не отображается?',
    'Tap Restore Purchases to retrieve your purchase':'Нажмите «Восстановить покупки» для получения покупки',
    'Restore Purchases':'Восстановить покупки',
    'If the issue persists, contact our support team with a screenshot of your receipt or payment confirmation':'Если проблема сохраняется, свяжитесь с поддержкой со скриншотом чека или подтверждения оплаты',
    'contact our support team with a screenshot of your receipt or payment confirmation':'свяжитесь с поддержкой со скриншотом чека',
    'receipt or payment confirmation':'чека или подтверждения оплаты',
    'Step 1':'Шаг 1','Step 2':'Шаг 2','Step 3':'Шаг 3','Step 4':'Шаг 4',
    'Select the service you need (e.g., WhatsApp, Telegram)':'Выберите нужный сервис (напр., WhatsApp, Telegram)',
    'Choose the country or region for your number':'Выберите страну или регион для номера',
    'Get a virtual number and paste it during registration':'Получите виртуальный номер и вставьте при регистрации',
    'The verification SMS will appear in our app':'SMS с кодом появится в нашем приложении',
    'Select a service':'Выберите сервис',
    'Choose a country':'Выберите страну',
    'Get your number':'Получите номер',
    'Service Types':'Типы сервисов',
    'Activations':'Активации',
    'Short-term numbers valid for approximately 20 minutes':'Краткосрочные номера, действительны около 20 минут',
    'approximately 20 minutes':'около 20 минут',
    'SMS Not Received?':'Нет SMS?',
    'Wait at least 3 minutes before canceling':'Подождите минимум 3 минуты перед отменой',
    'at least 3 minutes':'минимум 3 минуты',
    'Cancel to receive a refund and try a different number':'Отмените для возврата средств и попробуйте другой номер',
    'receive a refund and try a different number':'получите возврат и попробуйте другой номер',
    'Some services may have delays':'Некоторые сервисы могут иметь задержки',
    'Account Bans':'Блокировки аккаунтов',
    'Using virtual numbers may result in account restrictions on some platforms':'Использование виртуальных номеров может привести к ограничениям на некоторых платформах',
    'may result in account restrictions on some platforms':'может привести к ограничениям аккаунта',
    'We are not responsible for third-party account actions':'Мы не несём ответственности за действия сторонних аккаунтов',
    'not responsible for third-party account actions':'не несём ответственности за сторонние аккаунты',
    'Privacy & Security':'Конфиденциальность',
    'We do not store your SMS messages':'Мы не храним ваши SMS',
    'do not store your SMS messages':'не храним ваши SMS',
    'All numbers are temporary and anonymous':'Все номера временные и анонимные',
    'temporary and anonymous':'временные и анонимные',
    'Your personal data is protected':'Ваши личные данные защищены',
    'personal data is protected':'личные данные защищены',
    'Need Help?':'Нужна помощь?',
    'Our support team is available 24/7':'Наша поддержка доступна 24/7',
    'available 24/7':'доступна 24/7',
    'Troubleshooting':'Решение проблем',
    'If you didn\'t receive a code':'Если код не пришел',
    'Try requesting a new number':'Попробуйте запросить новый номер',
    'Check if the service is available':'Проверьте доступность сервиса',
    'Contact support':'Обратитесь в поддержку',
    'No Cancellations Within 45s':'Нет отмен в течение 45 сек',
    'Please wait at least 45 seconds before canceling to allow the system to process your request properly':'Подождите минимум 45 секунд перед отменой, чтобы система могла обработать запрос',
    'wait at least 45 seconds before canceling':'подождите минимум 45 секунд перед отменой',
    'allow the system to process your request properly':'чтобы система обработала ваш запрос',
    'If you don\'t receive an SMS within 3 minutes, you can cancel and get a refund, then try a different number':'Если SMS не приходит 3 минуты, отмените для возврата и попробуйте другой номер',
    'within 3 minutes':'в течение 3 минут',
    'cancel and get a refund':'отмените и получите возврат',
    'try a different number':'попробуйте другой номер',
    'Automatic Refunds':'Автоматические возвраты',
    'If a number doesn\'t receive an SMS before it expires, you\'ll be automatically refunded':'Если номер не получает SMS до истечения, возврат будет автоматическим',
    'doesn\'t receive an SMS before it expires':'не получает SMS до истечения срока',
    'you\'ll be automatically refunded':'возврат будет автоматическим',
    'Why use temporary phone numbers':'Зачем использовать временные номера',
    'Create multiple accounts on platforms without using your real phone number':'Создавайте несколько аккаунтов без реального номера',
    'Create multiple accounts':'Создавайте несколько аккаунтов',
    'without using your real phone number':'без использования реального номера',
    'Protect your privacy when signing up for new services':'Защитите конфиденциальность при регистрации',
    'Protect your privacy':'Защитите конфиденциальность',
    'when signing up for new services':'при регистрации в новых сервисах',
    'Bypass regional restrictions and access content from anywhere':'Обходите региональные ограничения и доступайте к контенту отовсюду',
    'Bypass regional restrictions':'Обходите региональные ограничения',
    'access content from anywhere':'доступ к контенту отовсюду',
    'Avoid spam and unwanted marketing messages on your personal number':'Избегайте спама на личном номере',
    'Avoid spam':'Избегайте спама',
    'unwanted marketing messages':'нежелательные маркетинговые сообщения',
    'on your personal number':'на вашем личном номере',
    'No SMS received?':'Нет SMS?',
    'Cancel and try another number':'Отмените и попробуйте другой номер',
    'Wait for the timer to expire':'Подождите окончания таймера',
    'The code will appear here automatically':'Код появится здесь автоматически',
    'Profile':'Профиль','Referral':'Реферал',
    'Save':'Сохранить','Submit':'Отправить','Update':'Обновить',
    'Password':'Пароль','Change Password':'Сменить пароль',
    'Confirm Password':'Подтвердите пароль',
    'Login':'Вход','Sign Up':'Регистрация','Register':'Регистрация',
    'Forgot Password?':'Забыли пароль?',
    'Don\'t have an account?':'Нет аккаунта?',
    'Already have an account?':'Уже есть аккаунт?',
    'Sign in':'Войти','Create account':'Создать аккаунт',
    'Logging in...':'Вход...','Creating account...':'Создание...',
    'Login successful':'Вход выполнен','Registration successful':'Регистрация успешна',
    'Invalid email or password':'Неверный email или пароль',
    'Passwords do not match':'Пароли не совпадают',
    'Account already exists':'Аккаунт уже существует',
    'Reset Password':'Сбросить пароль',
    'Welcome back':'С возвращением','Create your account':'Создайте аккаунт',
    'Enter your email':'Введите email','Enter your password':'Введите пароль',
    'Remember me':'Запомнить меня',
    'Error':'Ошибка','Success':'Успех','Info':'Информация',
    'Logging out...':'Выход...',
    'Account deletion not implemented yet':'Удаление не реализовано',
    'Are you sure you want to delete your account? This action cannot be undone.':'Вы уверены? Это нельзя отменить.',
    'Are you sure you want to cancel this number?':'Отменить этот номер?',
    'Language changed to':'Язык изменен на',
    'Page':'Страница','is missing':'отсутствует',
    'or':'или','USD':'USD','per':'за',
    'available':'доступно','online':'онлайн',
    'Back':'Назад','Next':'Далее','Continue':'Продолжить',
    'Show more':'Показать больше','Show less':'Показать меньше',
    'View all':'Смотреть все','See all':'Смотреть все',
    'Copied!':'Скопировано!','Link copied':'Ссылка скопирована',
    'Nothing here yet':'Здесь пока пусто',
    'You have no items':'У вас нет элементов',
    'Rent Number': 'Аренда номера',
    'Virtual Cards': 'Виртуальные карты',
    '租用号码': 'Аренда номера',
    '虚拟卡': 'Виртуальные карты',
    'Аренда номера': 'Аренда номера',
    'Виртуальные карты': 'Виртуальные карты',  
    'Start by getting a number':'Начните с получения номера',
    'Get started':'Начать'
  }
};

var currentLang = localStorage.getItem('language') || 'en';
var langData = { en:{flag:'🇬🇧',label:'English'}, zh:{flag:'🇨🇳',label:'中文'}, ru:{flag:'🇷🇺',label:'Русский'} };

function t(key) { return (translations[currentLang] && translations[currentLang][key]) || key; }

function changeLanguage(lang) {
  if (!langData[lang]) lang = 'en';
  var info = langData[lang];
  var dFlag = document.getElementById('desktopLangFlag'); if (dFlag) dFlag.textContent = info.flag;
  var mFlag = document.getElementById('mobileLangFlag'); if (mFlag) mFlag.textContent = info.flag;
  closeDropdown('#desktopLangDrop');
  var mld = document.getElementById('mobileLangDrop'); if (mld) mld.classList.remove('show','open','active');
  var mlb = document.getElementById('mobileLangBtn'); if (mlb) mlb.classList.remove('open');
  currentLang = lang;
  localStorage.setItem('language', lang);
  applyTranslations();
  if (typeof renderSidebar === 'function') {
    var s = document.getElementById('serviceSearch');
    renderSidebar(s ? s.value : '');
  }
  renderMainContent();
  setTimeout(function() { applyTranslations(); }, 100);
  setTimeout(function() { applyTranslations(); }, 300);
  closeMobileSidebar();
}

function applyTranslations() {
  var tr = translations[currentLang];
  if (!tr) return;
  document.querySelectorAll('[data-i18n]').forEach(function(el) { 
    var k = el.getAttribute('data-i18n'); 
    if (tr[k] !== undefined) el.textContent = tr[k]; 
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) { 
    var k = el.getAttribute('data-i18n-placeholder'); 
    if (tr[k] !== undefined) el.placeholder = tr[k]; 
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function(el) { 
    var k = el.getAttribute('data-i18n-title'); 
    if (tr[k] !== undefined) el.title = tr[k]; 
  });
  document.querySelectorAll('select option:not([data-i18n])').forEach(function(opt) { 
    var txt = opt.textContent.trim(); 
    if (txt && tr[txt] !== undefined) opt.textContent = tr[txt]; 
  });
  ultraScanTextNodes(tr);
}

function ultraScanTextNodes(tr) {
  var root = document.documentElement;
  var sortedKeys = Object.keys(tr).filter(function(k) { return k.length >= 2; });
  sortedKeys.sort(function(a, b) { return b.length - a.length; });
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      var parent = node.parentNode;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest && parent.closest('[data-notranslate]')) return NodeFilter.FILTER_REJECT;
      var tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
      if (parent.hasAttribute && parent.hasAttribute('data-i18n')) return NodeFilter.FILTER_REJECT;
      if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var nodes = []; 
  var n; 
  while (n = walker.nextNode()) nodes.push(n);
  function hasCJK(str) { return /[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/.test(str); }
  var cjkKeys = [];
  var nonCjkKeys = [];
  for (var k = 0; k < sortedKeys.length; k++) {
    if (hasCJK(sortedKeys[k])) { cjkKeys.push(sortedKeys[k]); }
    else { nonCjkKeys.push(sortedKeys[k]); }
  }
  for (var i = 0; i < nodes.length; i++) {
    var textNode = nodes[i]; 
    var original = textNode.textContent; 
    var result = original;
    var trimmed = original.trim();
    if (tr[trimmed] !== undefined) {
      var prefix = original.substring(0, original.indexOf(trimmed));
      var suffix = original.substring(original.indexOf(trimmed) + trimmed.length);
      textNode.textContent = prefix + tr[trimmed] + suffix;
      continue;
    }
    var isCJK = hasCJK(trimmed);
    if (isCJK) {
      for (var j = 0; j < cjkKeys.length; j++) {
        var key = cjkKeys[j]; var val = tr[key];
        if (result.indexOf(key) !== -1) { result = result.split(key).join(val); }
      }
    } else {
      for (var j = 0; j < nonCjkKeys.length; j++) {
        var key = nonCjkKeys[j]; var val = tr[key];
        var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp('\\b' + escaped + '\\b', 'gi');
        if (regex.test(result)) { result = result.replace(regex, val); }
      }
    }
    if (result !== original) textNode.textContent = result;
  }
}

async function bootSequence() {
  if (typeof showApp === 'function') {
    var orig = showApp;
    showApp = async function() { await orig(); await loadBalance(true); await loadNumbers(true); window.currentPage = getPageFromHash(); preLoadPageData(window.currentPage); renderMainContent(); };
  }
  if (typeof checkSession === 'function') checkSession();
  initTheme();
}

function initTheme() {
  var isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) applyDarkMode();
  updateThemeButton();
}

function toggleTheme() {
  var isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    localStorage.setItem('darkMode', 'false');
    removeDarkMode();
  } else {
    localStorage.setItem('darkMode', 'true');
    applyDarkMode();
  }
  updateThemeButton();
}

function applyDarkMode() {
  document.documentElement.setAttribute('data-theme', 'dark');
}

function removeDarkMode() {
  document.documentElement.removeAttribute('data-theme');
}

function updateThemeButton() {
  var isDark = localStorage.getItem('darkMode') === 'true';
  var btn = document.getElementById('themeToggle');
  var label = document.getElementById('themeLabel');
  var mobileBtn = document.getElementById('mobileThemeBtn');
  var mobileLabel = document.getElementById('mobileThemeLabel');
  
  if (btn && label) {
    var icon = btn.querySelector('i');
    if (isDark) {
      if (icon) icon.className = 'fas fa-sun';
      label.textContent = 'Light Mode';
    } else {
      if (icon) icon.className = 'fas fa-moon';
      label.textContent = 'Dark Mode';
    }
  }
  
  if (mobileBtn && mobileLabel) {
    var mobileIcon = mobileBtn.querySelector('i');
    if (isDark) {
      if (mobileIcon) mobileIcon.className = 'fas fa-sun';
      mobileLabel.textContent = 'Light Mode';
    } else {
      if (mobileIcon) mobileIcon.className = 'fas fa-moon';
      mobileLabel.textContent = 'Dark Mode';
    }
  }
}