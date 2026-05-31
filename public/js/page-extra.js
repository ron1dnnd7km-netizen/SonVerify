// =======================================================================
// ===== RENT NUMBER & VIRTUAL CARD PAGES (COMPLETE) =====
// =======================================================================

function addRentProfit(basePrice) { return parseFloat((basePrice * 1.2633).toFixed(2)); }
function calcCardFee(loadAmount) { return parseFloat((loadAmount * 0.30).toFixed(2)); }

var rentAreaCodeMap = {
  'us': 'US', 'gb': 'GB', 'uk': 'GB', 'ca': 'CA'
};

function getRentAreaCode(cc) { return rentAreaCodeMap[(cc || '').toLowerCase()] || null; }

// =======================================================================
// ===== FALLBACK RENT DATA =====
// =======================================================================
var fallbackRentData = {
  'US': { unit_price: 300, currency: 'USD', area_code: 'US' },
  'GB': { unit_price: 500, currency: 'USD', area_code: 'GB' },
  'CA': { unit_price: 300, currency: 'USD', area_code: 'CA' }
};

// =======================================================================
// ===== RENT API FUNCTIONS =====
// =======================================================================
window.smsbusGetRentServices = async function(cc) {
  var ac = getRentAreaCode(cc);
  if (!ac) return null;
  
  var cachedCountries = availableRentCountries || [];
  
  if (cachedCountries.length === 0) {
    try {
      cachedCountries = await window.fetchRentCountries();
    } catch (e) {
      console.warn('Failed to fetch rent countries:', e.message);
    }
  }
  
  var filtered = cachedCountries.filter(function(x) { 
    return (x.area_code || '').toUpperCase() === ac.toUpperCase(); 
  });
  
  if (filtered.length > 0) return filtered;
  return getFallbackRentData(ac);
};

function getFallbackRentData(areaCode) {
  var fb = fallbackRentData[areaCode];
  if (fb) {
    console.log('Using fallback rent data for', areaCode);
    return [fb];
  }
  return null;
}

window.smsbusCreateRent = async function(cc, months, email) {
  var ac = getRentAreaCode(cc);
  if (!ac) throw new Error('Country not available for rental: ' + cc);
  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 30000);
    
    var r = await fetch('/api/v2/rent/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area_code: ac, time: months, service: 'any', email: email || '' }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!r.ok) {
      var err = await r.json().catch(function() { return {}; });
      throw new Error(err.error || err.message || err.msg || 'Failed to create rental');
    }
    
    var j = await r.json();
    var d = j.data || j;
    var msg = (j.message || j.msg || '').toLowerCase();
    
    if (msg.includes('try again') || msg.includes('different country') || msg.includes('no number')) {
      throw new Error('No numbers available. Try a different country or try again later.');
    }
    
    if (j.code !== undefined && j.code !== 200) {
      throw new Error(j.message || j.msg || 'No numbers available right now.');
    }
    
    return d;
    
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  }
};

window.smsbusGetRentStatus = async function(rentalId) {
  var maxRetries = 2;
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function() { controller.abort(); }, 30000);
      
      var r = await fetch('/api/v2/rent/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rentalId: rentalId, order_id: rentalId, id: rentalId }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (!r.ok) throw new Error('Failed to get SMS');
      var j = await r.json();
      var result = j.data || j.sms || j.list || j;
      if (j.code === 200 && j.data) result = j.data;
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        if (attempt < maxRetries) {
          await new Promise(function(resolve) { setTimeout(resolve, 2000); });
          continue;
        }
        throw new Error('Request timed out');
      }
      throw err;
    }
  }
};

window.smsbusCancelRent = async function(rentalId) {
  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 15000);
    
    var r = await fetch('/api/v2/rent/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: rentalId }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!r.ok) throw new Error('Failed to cancel');
    var j = await r.json();
    if (j.code !== undefined && j.code !== 200) {
      throw new Error(j.message || j.msg || 'Cancel failed');
    }
    return j.data || j;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Cancel request timed out.');
    throw err;
  }
};

// =======================================================================
// ===== RENT STATE =====
// =======================================================================
var activeRentals = [];
var currentRentArea = null;
var rentLoadingPrice = false;
var selectedRentMonths = 1;
var currentRentPricePerMonth = 0;
var currentRentDollarsPerMonth = 0;
var rentCountryAvailable = null;
var rentUsingFallback = false;
var availableRentCountries = null; 
var rentCountriesLoading = false;

// =======================================================================
// ===== VIRTUAL CARD STATE =====
// =======================================================================
var userCards = [];
var cardTransactions = [];
var selectedCardForPurchase = null;
var cardTabActive = 'virtual';
var flippedCardId = null;
var giftCardStep = 1;
var selectedGiftCountry = 'us';
var selectedGiftCard = null;
var selectedGiftReloadable = null;
var cardCreationStep = 1;
var cardsLoaded = false; 

// =======================================================================
// ===== GIFT CARD DATA =====
// =======================================================================
var giftCardCountries = [
  { code: 'us', name: 'United States', flag: '🇺🇸', currency: 'USD', symbol: '$' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', symbol: '£' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', currency: 'CAD', symbol: 'C$' },
  { code: 'au', name: 'Australia', flag: '🇦🇺', currency: 'AUD', symbol: 'A$' },
  { code: 'de', name: 'Germany', flag: '🇩🇪', currency: 'EUR', symbol: '€' },
  { code: 'fr', name: 'France', flag: '🇫🇷', currency: 'EUR', symbol: '€' },
  { code: 'ng', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', symbol: '₦' }
];

var giftCardTypes = {
  us: [
    { id: 'amazon', name: 'Amazon', icon: '📦', price: 2, min: 2, max: 500 },
    { id: 'walmart', name: 'Walmart', icon: '🛒', price: 2, min: 2, max: 500 },
    { id: 'apple', name: 'Apple', icon: '🍎', price: 2, min: 2, max: 500 },
    { id: 'google', name: 'Google Play', icon: '▶️', price: 2, min: 2, max: 200 },
    { id: 'steam', name: 'Steam', icon: '🎮', price: 2, min: 2, max: 100 },
    { id: 'netflix', name: 'Netflix', icon: '🎬', price: 2, min: 2, max: 200 },
    { id: 'spotify', name: 'Spotify', icon: '🎵', price: 2, min: 2, max: 200 },
    { id: 'uber', name: 'Uber', icon: '🚗', price: 2, min: 2, max: 200 },
    { id: 'visa', name: 'Visa Prepaid', icon: '💳', price: 2, min: 2, max: 500 }
  ],
  gb: [
    { id: 'amazon-uk', name: 'Amazon UK', icon: '📦', price: 2, min: 2, max: 500 },
    { id: 'tesco', name: 'Tesco', icon: '🛒', price: 2, min: 2, max: 200 },
    { id: 'netflix-uk', name: 'Netflix UK', icon: '🎬', price: 2, min: 2, max: 200 }
  ],
  ca: [
    { id: 'amazon-ca', name: 'Amazon Canada', icon: '📦', price: 2, min: 2, max: 500 },
    { id: 'uber-eats', name: 'Uber Eats', icon: '🍔', price: 2, min: 2, max: 300 }
  ],
  au: [
    { id: 'amazon-au', name: 'Amazon AU', icon: '📦', price: 2, min: 2, max: 500 }
  ],
  de: [
    { id: 'amazon-de', name: 'Amazon DE', icon: '📦', price: 2, min: 2, max: 500 }
  ],
  fr: [
    { id: 'amazon-fr', name: 'Amazon FR', icon: '📦', price: 2, min: 2, max: 500 }
  ],
  ng: [
    { id: 'amazon-ng', name: 'Amazon NG', icon: '📦', price: 1000, min: 1000, max: 100000 }
  ]
};

var virtualCardTypes = [
  { id: 'visa-basic', name: 'Visa Basic', brand: 'VISA', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', price: 5, icon: '💳' },
  { id: 'mastercard-standard', name: 'Mastercard Standard', brand: 'MC', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b3d 50%, #4a1942 100%)', price: 7, icon: '💳' },
  { id: 'visa-premium', name: 'Visa Premium', brand: 'VISA', gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #162447 100%)', price: 12, icon: '💎', badge: 'POPULAR' }
];

// =======================================================================
// ===== CARD PERSISTENCE =====
// =======================================================================
function getCardsStorageKey() {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  return 'vcard_data_' + (ue || 'guest');
}

function saveCardsToLocal(cards) {
  try { localStorage.setItem(getCardsStorageKey(), JSON.stringify(cards)); } catch (e) {}
}

function loadCardsFromLocal() {
  try {
    var raw = localStorage.getItem(getCardsStorageKey());
    if (raw) { var parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; }
    var guestRaw = localStorage.getItem('vcard_data_guest');
    if (guestRaw) { var guestParsed = JSON.parse(guestRaw); if (Array.isArray(guestParsed) && guestParsed.length > 0) return guestParsed; }
  } catch (e) {}
  return null;
}

window.saveCardToServer = function(card) {
  userCards.unshift(card);
  saveCardsToLocal(userCards);
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (!ue) return Promise.resolve();
  return fetch('/api/cards/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ue, card: card })
  }).catch(function() {});
};

window.loadUserCards = function() {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  var localCards = loadCardsFromLocal();
  if (localCards && Array.isArray(localCards)) {
    userCards = localCards;
    cardsLoaded = true;
    if (ue) syncCardsFromServer(ue);
    return Promise.resolve();
  }
  if (!ue) { userCards = []; cardsLoaded = true; return Promise.resolve(); }
  return fetch('/api/cards/' + ue, { headers: { 'Accept': 'application/json' } })
    .then(function(r) { if (!r.ok) throw new Error('Server error'); return r.json(); })
    .then(function(data) {
      var arr = Array.isArray(data) ? data : (data && Array.isArray(data.cards) ? data.cards : []);
      userCards = arr.length > 0 ? arr : [];
      saveCardsToLocal(userCards);
      cardsLoaded = true;
    })
    .catch(function() { userCards = []; cardsLoaded = true; });
};

function syncCardsFromServer(ue) {
  if (!ue) return;
  fetch('/api/cards/' + ue, { headers: { 'Accept': 'application/json' } })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var serverCards = Array.isArray(data) ? data : (data && Array.isArray(data.cards) ? data.cards : []);
      var localCards = loadCardsFromLocal() || [];
      if (serverCards.length > localCards.length) {
        userCards = serverCards;
      } else if (serverCards.length > 0) {
        var localIds = localCards.map(function(c) { return c.id; });
        serverCards.forEach(function(sc) { if (localIds.indexOf(sc.id) === -1) localCards.push(sc); });
        userCards = localCards;
      }
      saveCardsToLocal(userCards);
    })
    .catch(function() {});
}

window.deleteCardFromServer = function(cardId) {
  userCards = userCards.filter(function(c) { return c.id !== cardId; });
  saveCardsToLocal(userCards);
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (!ue) return Promise.resolve();
  return fetch('/api/cards/' + cardId, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ue })
  }).catch(function() {});
};

// =======================================================================
// ===== CURRENCY HELPERS =====
// =======================================================================
function getCurrencySymbol(cc) { var c = giftCardCountries.find(function(x) { return x.code === cc; }); return c ? c.symbol : '$'; }
function getCurrencyCode(cc) { var c = giftCardCountries.find(function(x) { return x.code === cc; }); return c ? c.currency : 'USD'; }
function getCountryInfo(cc) { return giftCardCountries.find(function(x) { return x.code === cc; }) || { code: 'us', name: 'United States', flag: '🇺🇸', currency: 'USD', symbol: '$' }; }

// =======================================================================
// ===== RENT PRICE FUNCTIONS =====
// =======================================================================
window.fetchRentPrices = async function(countryCode) {
  if (rentLoadingPrice) return;
  rentLoadingPrice = true;
  rentCountryAvailable = null;
  rentUsingFallback = false;
  updateRentPriceDisplay();
  try {
    var areas = await window.smsbusGetRentServices(countryCode);
    if (!areas || areas.length === 0) {
      currentRentArea = null;
      currentRentPricePerMonth = 0;
      currentRentDollarsPerMonth = 0;
      rentCountryAvailable = false;
    } else {
      currentRentArea = areas[0];
      currentRentPricePerMonth = parseInt(currentRentArea.unit_price) || 0;
      currentRentDollarsPerMonth = currentRentPricePerMonth / 100;
      rentCountryAvailable = true;
      rentUsingFallback = !!currentRentArea._fallback;
    }
    updateRentPriceDisplay();
  } catch (err) {
    rentCountryAvailable = false;
    updateRentPriceDisplay();
  } finally {
    rentLoadingPrice = false;
  }
};

window.updateRentPriceDisplay = function() {
  var priceEl = document.getElementById('rentTotalPrice');
  var notAvailEl = document.getElementById('rentNotAvailable');
  var rentBtn = document.getElementById('rentNowBtn');
  var loadingEl = document.getElementById('rentPriceLoading');
  var fallbackEl = document.getElementById('rentFallbackNotice');
  if (fallbackEl) fallbackEl.style.display = 'none';
  if (notAvailEl) notAvailEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'none';
  if (rentCountryAvailable === null) {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (priceEl) priceEl.style.display = 'none';
    if (rentBtn) rentBtn.disabled = true;
  } else if (rentCountryAvailable === false) {
    if (notAvailEl) notAvailEl.style.display = 'flex';
    if (priceEl) { priceEl.textContent = '--'; priceEl.style.display = ''; }
    if (rentBtn) rentBtn.disabled = true;
  } else {
    if (priceEl) priceEl.style.display = '';
    if (rentBtn) rentBtn.disabled = false;
    if (rentUsingFallback && fallbackEl) fallbackEl.style.display = 'flex';
    updateRentTotalPrice();
  }
};

window.updateRentTotalPrice = function() {
  var priceEl = document.getElementById('rentTotalPrice');
  if (!priceEl || currentRentDollarsPerMonth <= 0) { if (priceEl) priceEl.textContent = '--'; return; }
  var total = addRentProfit(currentRentDollarsPerMonth * selectedRentMonths);
  priceEl.textContent = '$' + total.toFixed(2);
};

window.onRentMonthsChange = function(months) {
  selectedRentMonths = parseInt(months) || 1;
  var label = document.getElementById('rentMonthsLabel');
  if (label) label.textContent = selectedRentMonths + ' Month' + (selectedRentMonths > 1 ? 's' : '');
  updateRentTotalPrice();
};

// =======================================================================
// ===== FETCH RENT COUNTRIES =====
// =======================================================================
window.fetchRentCountries = async function() {
  if (rentCountriesLoading || availableRentCountries) return availableRentCountries;
  rentCountriesLoading = true;
  try {
    var r = await fetch('/api/v2/rent/areas', { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('API error');
    var j = await r.json();
    var data = j.data || j.areas || j;
    if (Array.isArray(data) && data.length > 0) {
      availableRentCountries = data;
    } else {
      availableRentCountries = [
        { area_code: 'CA', area_title: 'Canada', unit_price: 300, min_month: 1 },
        { area_code: 'GB', area_title: 'United Kingdom', unit_price: 500, min_month: 1 },
        { area_code: 'US', area_title: 'United States of America', unit_price: 300, min_month: 1 }
      ];
    }
  } catch (e) {
    availableRentCountries = [
      { area_code: 'CA', area_title: 'Canada', unit_price: 300, min_month: 1 },
      { area_code: 'GB', area_title: 'United Kingdom', unit_price: 500, min_month: 1 },
      { area_code: 'US', area_title: 'United States of America', unit_price: 300, min_month: 1 }
    ];
  } finally {
    rentCountriesLoading = false;
  }
  return availableRentCountries;
};

window.getRentCountryOptions = function() {
  var rentCountries = availableRentCountries || [
    { area_code: 'CA', area_title: 'Canada' },
    { area_code: 'GB', area_title: 'United Kingdom' },
    { area_code: 'US', area_title: 'United States of America' }
  ];
  var areaToCode = { 'CA': 'ca', 'GB': 'gb', 'UK': 'gb', 'US': 'us', 'USA': 'us', 'UNITED STATES OF AMERICA': 'us', 'UNITED STATES': 'us', 'CANADA': 'ca', 'UNITED KINGDOM': 'gb' };
  var options = [];
  rentCountries.forEach(function(rc) {
    var areaCode = (rc.area_code || '').toUpperCase();
    var areaTitle = (rc.area_title || '').toUpperCase();
    var countryCode = areaToCode[areaCode] || areaToCode[areaTitle];
    if (!countryCode) {
      for (var key in areaToCode) { if (areaTitle.indexOf(key) !== -1) { countryCode = areaToCode[key]; break; } }
    }
    if (countryCode) {
      var countryData = (typeof countries !== 'undefined') ? countries.find(function(c) { return c.code === countryCode; }) : null;
      if (countryData) {
        options.push({ code: countryData.code, flag: countryData.flag, name: countryData.name, areaCode: areaCode, unitPrice: rc.unit_price || 0, total: rc.total || 0 });
      }
    }
  });
  return options;
};

// =======================================================================
// ===== RESPONSIVE STYLES =====
// =======================================================================
(function() {
  if (document.getElementById('page-responsive-styles')) return;
  var s = document.createElement('style');
  s.id = 'page-responsive-styles';
  s.textContent = `
    @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .gift-step{display:flex;align-items:center;gap:0}
    .gift-step-num{width:28px;height:28px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text-muted);flex-shrink:0;transition:all .3s}
    .gift-step.active .gift-step-num,.gift-step.done .gift-step-num{background:var(--accent);color:#fff}
    .gift-step-label{font-size:11px;color:var(--text-muted);margin-left:8px;font-weight:500}
    .gift-step.active .gift-step-label{color:var(--accent);font-weight:600}
    .gift-step-line{width:32px;height:2px;background:var(--border);transition:all .3s}
    .gift-step-line.done{background:var(--accent)}
    textarea{font-family:inherit}
    .card-flip-wrapper{border-radius:14px 14px 0 0;overflow:hidden}
    .card-flip-inner{position:relative;width:100%;height:180px;transition:transform .6s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d}
    .card-flip-front,.card-flip-back{position:absolute;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px;overflow:hidden}
    .card-flip-back{transform:rotateY(180deg)}
    .rental-item{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;margin-bottom:12px;overflow:hidden;transition:all .2s;cursor:pointer}
    .rental-item:hover{border-color:var(--accent)}
    .renew-opt-btn{padding:10px 14px;background:var(--bg-primary);border:2px solid var(--border);border-radius:10px;color:var(--text-secondary);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;text-align:center}
    .renew-opt-btn.selected{border-color:var(--accent)!important;background:var(--accent-dim)!important;color:var(--accent)!important}
    .tap-target{min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center}
    .hide-mobile{display:inline}
    @media(max-width:768px){.hide-mobile{display:none!important}.card-flip-inner{height:160px}#detailSmsContainer{max-height:260px!important}#renewOptionsWrap{grid-template-columns:repeat(3,1fr)!important}}
    @media(max-width:400px){#detailSmsContainer{max-height:200px!important}#renewOptionsWrap{grid-template-columns:repeat(2,1fr)!important}}
    @media(min-width:1024px){.detail-three-col-grid{grid-template-columns:1fr 1fr 1.5fr!important}.detail-sms-card{order:3!important}}
    @media(max-width:1023px) and (min-width:769px){.detail-three-col-grid{grid-template-columns:1fr 1fr!important}.detail-sms-card{grid-column:1/-1!important;order:4!important}}
    @media(max-width:768px){.detail-three-col-grid{grid-template-columns:1fr!important;gap:12px!important}.detail-sms-card{order:4!important}}
    #renewOptionsWrap{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
    #detailSmsContainer::-webkit-scrollbar{width:6px}
    #detailSmsContainer::-webkit-scrollbar-track{background:transparent}
    #detailSmsContainer::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
  `;
  document.head.appendChild(s);
})();

// =======================================================================
// ===== RENDER RENT PAGE =====
// =======================================================================
function renderRentPage(main) {
  selectedRentMonths = 1;
  rentCountryAvailable = null;
  rentUsingFallback = false;
  
  main.innerHTML =
    '<div class="page-header"><div><h1 class="page-title"><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:10px;"></i>Rent Number</h1><p style="font-size:14px;color:var(--text-secondary);margin-top:8px;">Get a dedicated number for extended use</p></div></div>' +
    '<div style="display:flex;align-items:center;justify-content:center;padding:60px 20px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent);margin-right:12px;"></i><span style="color:var(--text-muted);">Loading...</span></div>';
  
  loadRentPageData(main);
}

window.loadRentPageData = async function(main) {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  
  if (ue && activeRentals.length === 0) {
    try {
      var rentBackup = localStorage.getItem('active_rentals_' + ue);
      if (rentBackup) {
        var rentParsed = JSON.parse(rentBackup);
        if (Array.isArray(rentParsed) && rentParsed.length > 0) activeRentals = rentParsed;
      }
    } catch(e) {}
  }
  
  if (ue) {
    fetch('/api/rentals/' + ue, { headers: { 'Accept': 'application/json' } })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var rentals = d;
      if (!Array.isArray(d)) {
        if (d && Array.isArray(d.rentals)) rentals = d.rentals;
        else if (d && Array.isArray(d.data)) rentals = d.data;
        else return;
      }
      if (rentals.length > 0) {
        activeRentals = rentals;
        activeRentals.sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }
        );
        try { localStorage.setItem('active_rentals_' + ue, JSON.stringify(activeRentals)); } catch(e) {}
      }
    })
    .catch(function() {});
  }
  
  var rentCountryOptions = [];
  try {
    await window.fetchRentCountries();
    rentCountryOptions = window.getRentCountryOptions();
  } catch(e) {
    rentCountryOptions = window.getRentCountryOptions();
  }
  
  renderRentPageContent(main, rentCountryOptions);
};

function renderRentPageContent(main, rentCountryOptions) {
  var activeRentalsHTML = '';
  if (activeRentals.length > 0) {
    activeRentalsHTML = activeRentals.map(function(rental) {
      var cf = rental.countryFlag || '🌍';
      var pd = (rental.phone || '').charAt(0) !== '+' ? '+' + rental.phone : rental.phone;
      var ed = new Date(rental.expiresAt);
      var hl = Math.max(0, Math.floor((ed - new Date()) / 3600000));
      var dl = Math.floor(hl / 24);
      var td = dl > 0 ? dl + 'd ' + (hl % 24) + 'h' : (hl % 24) + 'h';
      var smsCount = (rental.sms && rental.sms.length) ? rental.sms.length : 0;
      var sl = smsCount > 0
        ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-top:10px;background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;"><div style="display:flex;align-items:center;gap:8px;"><i class="fas fa-envelope" style="color:var(--accent);font-size:13px;"></i><span style="font-size:12px;color:var(--text-secondary);font-weight:500;">' + smsCount + ' message' + (smsCount > 1 ? 's' : '') + '</span></div><i class="fas fa-chevron-right" style="font-size:10px;color:var(--accent);"></i></div>'
        : '<div style="display:flex;align-items:center;gap:6px;padding:10px 12px;margin-top:10px;color:var(--text-muted);font-size:12px;"><i class="far fa-comment-dots" style="opacity:.4;"></i> No messages yet</div>';
      
      return '<div class="rental-item" onclick="showRentalDetails(\'' + rental.id + '\')">' +
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 16px;">' +
          '<div style="width:48px;height:48px;border-radius:14px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:24px;">' + cf + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-family:\'Courier New\',monospace;font-size:16px;font-weight:700;color:var(--text-primary);letter-spacing:1px;">' + pd + '</div>' +
            '<div style="display:flex;align-items:center;gap:12px;margin-top:4px;">' +
              '<div style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted);"><i class="fas fa-clock" style="font-size:10px;"></i>' + td + ' remaining</div>' +
              (smsCount > 0 ? '<div style="width:4px;height:4px;border-radius:50%;background:var(--accent);"></div><div style="font-size:12px;color:var(--accent);font-weight:600;">' + smsCount + ' SMS</div>' : '') +
            '</div>' +
          '</div>' +
        '</div>' + sl + '</div>';
    }).join('');
  } else {
    activeRentalsHTML = '<div style="padding:48px 20px;text-align:center;"><i class="fas fa-phone-alt" style="font-size:40px;color:var(--text-muted);opacity:.2;margin-bottom:16px;display:block;"></i><p style="font-size:15px;color:var(--text-muted);margin:0;">No active rentals yet</p></div>';
  }

  var countryOptionsHTML = rentCountryOptions.map(function(c) {
    return '<option value="' + c.code + '">' + c.flag + ' ' + c.name + (c.total > 0 ? ' (' + c.total + ' available)' : '') + '</option>';
  }).join('');
  
  if (rentCountryOptions.length === 0) countryOptionsHTML = '<option value="">Loading...</option>';

  main.innerHTML =
    '<div class="page-header"><div><h1 class="page-title"><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:10px;"></i>Rent Number</h1><p style="font-size:14px;color:var(--text-secondary);margin-top:8px;">Get a dedicated number for extended use</p></div></div>' +
    '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:20px;margin-bottom:24px;">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;"><div style="width:40px;height:40px;border-radius:10px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;"><i class="fas fa-cog" style="color:var(--accent);"></i></div><div><h2 style="font-size:16px;font-weight:700;margin:0;">Rental Configuration</h2></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">' +
        '<div style="background:rgba(13,155,122,.06);border:1px solid rgba(13,155,122,.15);border-radius:10px;padding:10px 8px;text-align:center;"><i class="fas fa-infinity" style="color:var(--accent);font-size:14px;margin-bottom:4px;display:block;"></i><div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Unlimited SMS</div></div>' +
        '<div style="background:rgba(13,155,122,.06);border:1px solid rgba(13,155,122,.15);border-radius:10px;padding:10px 8px;text-align:center;"><i class="fas fa-phone-alt" style="color:var(--accent);font-size:14px;margin-bottom:4px;display:block;"></i><div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Dedicated Number</div></div>' +
        '<div style="background:rgba(13,155,122,.06);border:1px solid rgba(13,155,122,.15);border-radius:10px;padding:10px 8px;text-align:center;"><i class="fas fa-sync-alt" style="color:var(--accent);font-size:14px;margin-bottom:4px;display:block;"></i><div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Auto-Extend</div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">' +
        '<div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;"><i class="fas fa-globe" style="margin-right:4px;color:var(--accent);"></i>Country</label><select id="rentCountrySelect" onchange="onRentCountryChange(this.value)" style="width:100%;padding:11px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;">' + countryOptionsHTML + '</select></div>' +
        '<div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;"><i class="far fa-clock" style="margin-right:4px;color:var(--accent);"></i>Duration</label><select id="rentMonthsSelect" onchange="onRentMonthsChange(this.value)" style="width:100%;padding:11px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;"><option value="1">1 Month</option><option value="2">2 Months</option><option value="3">3 Months</option><option value="5">5 Months</option><option value="12">12 Months</option></select></div>' +
      '</div>' +
      '<div id="rentPriceLoading" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:var(--bg-primary);border-radius:10px;border:1px solid var(--border);margin-bottom:12px;"><i class="fas fa-spinner fa-spin" style="color:var(--accent);"></i><span style="font-size:13px;color:var(--text-muted);">Checking availability...</span></div>' +
      '<div id="rentNotAvailable" style="display:none;flex-direction:column;align-items:center;gap:8px;padding:18px;background:rgba(217,48,37,.05);border:1px solid rgba(217,48,37,.12);border-radius:12px;margin-bottom:12px;text-align:center;"><i class="fas fa-map-marker-alt" style="font-size:22px;color:var(--danger);opacity:.7;"></i><span style="font-size:13px;color:var(--danger);font-weight:500;">Not available for this country.</span></div>' +
      '<div id="rentFallbackNotice" style="display:none;align-items:center;gap:8px;padding:12px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);border-radius:10px;margin-bottom:12px;"><i class="fas fa-info-circle" style="color:#f59e0b;font-size:14px;flex-shrink:0;"></i><span style="font-size:12px;color:var(--text-secondary);">Using estimated pricing.</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;padding:16px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border);">' +
        '<div style="display:flex;align-items:center;gap:8px;"><span id="rentMonthsLabel" style="font-size:13px;font-weight:600;color:var(--text-secondary);background:var(--accent-dim);padding:4px 10px;border-radius:8px;">1 Month</span><span style="font-size:13px;color:var(--text-muted);">Total:</span><span id="rentTotalPrice" style="font-size:18px;font-weight:800;color:var(--accent);">$--</span></div>' +
        '<button id="rentNowBtn" disabled style="width:100%;padding:14px;font-size:15px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);cursor:not-allowed;" onclick="executeRentNumber()"><i class="fas fa-shopping-cart"></i> Rent Now</button>' +
        '<div style="display:flex;align-items:flex-start;gap:8px;padding:12px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);border-radius:10px;"><i class="fas fa-info-circle" style="color:#f59e0b;font-size:13px;flex-shrink:0;margin-top:2px;"></i><div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">Free cancellation within 20 minutes if no SMS received.</div></div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;"><h2 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px;"><i class="fas fa-phone-alt" style="color:var(--accent);"></i> Active Rentals</h2><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:12px;padding:4px 12px;border-radius:10px;font-weight:600;background:var(--accent-dim);color:var(--accent);">' + activeRentals.length + '</span><button onclick="refreshActiveRentals()" style="padding:6px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;"><i class="fas fa-sync-alt" style="font-size:10px;"></i> Refresh</button></div></div>' +
    '<div class="active-rentals">' + activeRentalsHTML + '</div>';

  var cs = document.getElementById('rentCountrySelect');
  if (cs && cs.value) window.fetchRentPrices(cs.value);
}

window.onRentCountryChange = function(cc) {
  currentRentArea = null;
  currentRentPricePerMonth = 0;
  currentRentDollarsPerMonth = 0;
  rentCountryAvailable = null;
  rentUsingFallback = false;
  window.fetchRentPrices(cc);
};

// =======================================================================
// ===== EXECUTE RENT NUMBER =====
// =======================================================================
window.executeRentNumber = async function() {
  if (rentCountryAvailable !== true) { showToast('Please wait...', 'info'); return; }
  var btn = document.getElementById('rentNowBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...'; btn.disabled = true; }
  try {
    var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
    var cs = document.getElementById('rentCountrySelect');
    var cc = cs ? cs.value : 'us';
    var cd = (typeof countries !== 'undefined') ? countries.find(function(c) { return c.code === cc; }) : null;
    var cf = cd ? cd.flag : '🌍';
    var cn = cd ? cd.name : 'Unknown';
    if (!ue) { showToast('Please log in first', 'error'); if (btn) { btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; btn.disabled = false; } return; }
    var ur = await fetch('/api/user/' + ue);
    var ud = await ur.json();
    var sb = parseFloat(ud.balance) || 0;
    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(sb);
    var tp = currentRentDollarsPerMonth * selectedRentMonths;
    var ttl = addRentProfit(tp);
    if (sb < ttl) { showInsufficientBalanceWarning(ttl, sb); if (btn) { btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; btn.disabled = false; } return; }
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renting...';
    var ad = await window.smsbusCreateRent(cc, selectedRentMonths, ue);
    var ri = ad.order_id || ad.id || ad.orderId || ad.rental_id || 'rental-' + Date.now();
    var sf = ad.order_id || ad.id || ri;
    if (sf.indexOf('+') !== -1 || sf.indexOf('CA:') !== -1 || sf.indexOf('US:') !== -1) sf = ri;
    var rawPhone = String(ad.mobile_number || ad.phone || ad.phone_number || ad.number || '');
    var dialCode = (cd && cd.dial_code) ? cd.dial_code.replace('+', '') : '';
    var pn = rawPhone;
    if (dialCode && pn.indexOf(dialCode) !== 0) pn = dialCode + pn;
    if (pn.charAt(0) !== '+') pn = '+' + pn;
    var newRental = { id: ri, smsFetchId: sf, phone: pn, countryCode: cc, countryFlag: cf, countryName: cn, planName: selectedRentMonths + ' Month' + (selectedRentMonths > 1 ? 's' : ''), durationMonths: selectedRentMonths, providerCost: tp, cost: ttl, status: 'active', expiresAt: ad.expire_at || ad.expiresAt || new Date(Date.now() + selectedRentMonths * 30 * 24 * 3600000).toISOString(), createdAt: new Date().toISOString(), sms: [] };
    activeRentals.unshift(newRental);
    try { localStorage.setItem('active_rentals_' + ue, JSON.stringify(activeRentals)); } catch(e) {}
    try {
      var sr = await fetch('/api/rentals/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ue, rentId: ri, smsFetchId: sf, phone: pn, planName: newRental.planName, durationMonths: selectedRentMonths, providerCost: tp, cost: ttl, countryCode: cc, countryFlag: cf, countryName: cn, status: 'active', expiresAt: newRental.expiresAt, createdAt: newRental.createdAt }) });
      var sd = await sr.json();
      if (sd.balance !== undefined && typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(sd.balance);
    } catch(saveErr) {}
    showToast('Number rented! +' + pn + ' -$' + ttl.toFixed(2), 'success');
    var main = document.getElementById('appContent') || document.getElementById('mainContent');
    if (main) renderRentPage(main);
  } catch (err) {
    console.error('Rent error:', err);
    showToast(err.message || 'Failed to rent', 'error');
  } finally {
    var b2 = document.getElementById('rentNowBtn');
    if (b2) { b2.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; b2.disabled = false; }
  }
};

window.refreshActiveRentals = function() {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (!ue) return;
  fetch('/api/rentals/' + ue, { headers: { 'Accept': 'application/json' } })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    var rentals = Array.isArray(d) ? d : (d && Array.isArray(d.rentals) ? d.rentals : (d && Array.isArray(d.data) ? d.data : []));
    activeRentals = rentals;
    activeRentals.sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
    try { localStorage.setItem('active_rentals_' + ue, JSON.stringify(activeRentals)); } catch(e) {}
    var main = document.getElementById('appContent') || document.getElementById('mainContent');
    if (main) renderRentPage(main);
    showToast(activeRentals.length + ' rental(s) loaded', 'success');
  })
  .catch(function() { showToast('Failed to load rentals', 'error'); });
};

// =======================================================================
// ===== RENTAL DETAILS PAGE (3-COLUMN DESKTOP, STACKED MOBILE) =====
// =======================================================================
var currentRentalDetailId = null;
var smsPollingInterval = null;
var selectedRenewMonths = 0;
var cancelTimerInterval = null;

window.showRentalDetails = function(rentalId) {
  currentRentalDetailId = rentalId;
  if (smsPollingInterval) { clearInterval(smsPollingInterval); smsPollingInterval = null; }
  if (cancelTimerInterval) { clearInterval(cancelTimerInterval); cancelTimerInterval = null; }
  
  var rental = activeRentals.find(function(r) { return r.id === rentalId; });
  if (!rental) { showToast('Rental not found', 'error'); return; }

  var main = document.getElementById('appContent') || document.getElementById('mainContent');
  if (!main) return;

  var phone = rental.phone || '';
  var displayPhone = phone.charAt(0) !== '+' ? '+' + phone : phone;
  var flag = rental.countryFlag || '🌍';
  var countryName = rental.countryName || 'Unknown';
  var status = rental.status || 'active';
  var isActive = status === 'active';
  var statusColor = isActive ? '#0d9b7a' : '#d93025';
  var statusBg = isActive ? 'rgba(13,155,122,0.1)' : 'rgba(217,48,37,0.1)';
  var statusBorder = isActive ? 'rgba(13,155,122,0.2)' : 'rgba(217,48,37,0.2)';
  var statusText = isActive ? 'Online' : 'Offline';
  var statusDot = isActive ? '#0d9b7a' : '#d93025';

  var createdAt = rental.createdAt ? new Date(rental.createdAt) : new Date();
  var expiresAt = rental.expiresAt ? new Date(rental.expiresAt) : new Date(Date.now() + 30 * 24 * 3600000);
  var hoursLeft = Math.max(0, Math.floor((expiresAt - new Date()) / 3600000));
  var daysLeft = Math.floor(hoursLeft / 24);
  var timeLeftStr = daysLeft > 0 ? daysLeft + 'd ' + (hoursLeft % 24) + 'h' : (hoursLeft % 24) + 'h';

  var cost = typeof rental.cost === 'number' ? rental.cost : 0;
  var planName = rental.planName || '1 Month';
  var orderId = rental.id || 'N/A';

  var smsList = rental.sms || [];
  var hasSms = smsList.length > 0;
  var createdTime = new Date(createdAt).getTime();
  var canCancelByTime = (Date.now() - createdTime) < (20 * 60 * 1000);
  var canCancel = !hasSms && canCancelByTime;

  var smsHtml = hasSms 
    ? smsList.map(function(s) {
        var st = s.receivedAt ? new Date(s.receivedAt) : new Date();
        var timeStr = st.toLocaleDateString() + ' ' + st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return '<div style="padding:12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;animation:fadeIn .3s ease;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:4px;"><span style="font-size:11px;font-weight:700;color:var(--accent);background:var(--accent-dim);padding:2px 8px;border-radius:6px;">FROM: ' + (s.sender || 'UNKNOWN') + '</span><span style="font-size:11px;color:var(--text-muted);">' + timeStr + '</span></div><div style="font-size:13px;color:var(--text-primary);line-height:1.5;word-break:break-word;">' + (s.text || '') + '</div></div>';
      }).join('')
    : '<div id="smsEmptyState" style="text-align:center;padding:40px 16px;"><div style="width:50px;height:50px;border-radius:14px;background:rgba(255,255,255,.03);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;border:1px dashed rgba(255,255,255,.08);"><i class="far fa-comment-dots" style="font-size:20px;color:var(--text-muted);opacity:.3;"></i></div><p style="font-size:13px;color:var(--text-muted);margin:0;">No SMS received yet</p><div id="smsLoadingSpinner" style="margin-top:12px;"><i class="fas fa-spinner fa-spin" style="color:var(--accent);opacity:.5;"></i></div></div>';

  var cancelSectionHtml = '';
  if (canCancel) {
    var remainingMs = (20 * 60 * 1000) - (Date.now() - createdTime);
    var timerText = Math.floor(remainingMs / 60000) + ':' + String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0');
    cancelSectionHtml = '<div id="cancelSection" style="display:flex;flex-direction:column;align-items:center;padding:16px 0;"><button onclick="cancelRentalFromDetail(\'' + rentalId + '\')" class="tap-target" style="padding:12px 32px;background:rgba(217,48,37,.08);border:1px solid rgba(217,48,37,.2);border-radius:12px;color:var(--danger);font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;"><i class="fas fa-times-circle"></i> Cancel Rental</button><div id="cancelTimer" style="display:flex;align-items:center;gap:6px;margin-top:10px;padding:8px 14px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.12);border-radius:8px;"><i class="fas fa-clock" style="color:#f59e0b;font-size:11px;"></i><span style="font-size:11px;color:var(--text-secondary);">Cancel window: <strong id="cancelCountdown" style="color:#f59e0b;">' + timerText + '</strong></span></div><div style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.12);border-radius:8px;margin-top:8px;max-width:400px;"><i class="fas fa-info-circle" style="color:#f59e0b;font-size:12px;flex-shrink:0;margin-top:2px;"></i><span style="font-size:11px;color:var(--text-secondary);line-height:1.4;">Free cancellation if no SMS received within 20 minutes.</span></div></div>';
  } else if (hasSms) {
    cancelSectionHtml = '<div id="cancelSection" style="display:flex;flex-direction:column;align-items:center;padding:16px 0;"><div style="padding:12px 24px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;display:inline-flex;align-items:center;gap:8px;opacity:.5;"><i class="fas fa-lock" style="color:var(--text-muted);"></i><span style="font-size:13px;font-weight:600;color:var(--text-muted);">Cancellation Locked</span></div><div style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.12);border-radius:8px;margin-top:8px;max-width:400px;"><i class="fas fa-shield-alt" style="color:#f59e0b;font-size:12px;flex-shrink:0;margin-top:2px;"></i><span style="font-size:11px;color:var(--text-secondary);">Locked because SMS was received.</span></div></div>';
  } else {
    cancelSectionHtml = '<div id="cancelSection" style="display:flex;flex-direction:column;align-items:center;padding:16px 0;"><div style="padding:12px 24px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;display:inline-flex;align-items:center;gap:8px;opacity:.5;"><i class="fas fa-hourglass-end" style="color:var(--text-muted);"></i><span style="font-size:13px;font-weight:600;color:var(--text-muted);">Cancel Window Expired</span></div></div>';
  }

  var renewOptions = [1, 2, 3, 5, 12].map(function(m) {
    var renewCost = currentRentDollarsPerMonth > 0 ? addRentProfit(currentRentDollarsPerMonth * m) : 0;
    return '<button onclick="selectRenewMonths(' + m + ')" class="renew-opt-btn tap-target" id="renewOpt' + m + '">' + m + ' Mo' + (renewCost > 0 ? '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">$' + renewCost.toFixed(2) + '</div>' : '') + '</button>';
  }).join('');

  main.innerHTML =
    '<div style="max-width:1100px;margin:0 auto;padding:0 16px;">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;">' +
        '<button onclick="closeRentalDetails()" class="tap-target" style="width:38px;height:38px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>' +
        '<div style="flex:1;min-width:0;"><h1 style="font-size:20px;font-weight:700;color:var(--text-primary);margin:0;">Number Details</h1></div>' +
        '<button onclick="manualRefreshSms(\'' + rentalId + '\')" class="tap-target" style="padding:8px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="fas fa-sync-alt" style="font-size:10px;"></i> <span class="hide-mobile">Refresh</span></button>' +
        '<button onclick="copyRentalPhone(\'' + displayPhone + '\')" class="tap-target" style="padding:8px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;"><i class="fas fa-copy"></i> <span class="hide-mobile">Copy</span></button>' +
      '</div>' +
      '<div class="detail-three-col-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">' +
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;">' +
          '<div style="padding:20px 16px;text-align:center;border-bottom:1px solid var(--border);">' +
            '<span style="font-size:40px;display:block;margin-bottom:10px;">' + flag + '</span>' +
            '<div style="font-family:\'Courier New\',monospace;font-size:18px;font-weight:800;color:var(--text-primary);letter-spacing:1px;margin-bottom:4px;word-break:break-all;">' + displayPhone + '</div>' +
            '<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px;">' + countryName + '</div>' +
            '<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:' + statusBg + ';border:1px solid ' + statusBorder + ';border-radius:20px;"><span style="width:7px;height:7px;border-radius:50%;background:' + statusDot + ';' + (isActive ? 'animation:pulse-dot 2s infinite;' : '') + '"></span><span style="font-size:11px;font-weight:700;color:' + statusColor + ';">' + statusText.toUpperCase() + '</span></div>' +
          '</div>' +
          '<div style="padding:14px 16px;">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
              '<div style="padding:10px;background:var(--bg-primary);border-radius:10px;border:1px solid var(--border);"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Activated</div><div style="font-size:13px;font-weight:700;color:var(--text-primary);">' + createdAt.toLocaleDateString() + '</div><div style="font-size:11px;color:var(--text-muted);">' + createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div></div>' +
              '<div style="padding:10px;background:var(--bg-primary);border-radius:10px;border:1px solid var(--border);"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Expires</div><div style="font-size:13px;font-weight:700;color:var(--text-primary);">' + expiresAt.toLocaleDateString() + '</div><div style="font-size:11px;color:var(--danger);font-weight:700;">' + timeLeftStr + ' left</div></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;">' +
          '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;"><i class="fas fa-receipt" style="color:var(--accent);font-size:12px;"></i><span style="font-size:13px;font-weight:700;color:var(--text-primary);">Order History</span></div>' +
          '<div style="padding:14px 16px;flex:1;display:flex;flex-direction:column;justify-content:center;">' +
            '<div style="padding:12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:11px;color:var(--text-muted);">Order ID</span><span style="font-size:11px;font-weight:700;color:var(--text-primary);font-family:\'Courier New\',monospace;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + orderId + '">' + orderId + '</span></div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:11px;color:var(--text-muted);">Status</span><span style="font-size:10px;font-weight:700;color:#0d9b7a;background:rgba(13,155,122,.1);padding:2px 8px;border-radius:6px;">COMPLETED</span></div>' +
              '<div style="height:1px;background:var(--border);margin:8px 0;"></div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:11px;color:var(--text-muted);">Amount</span><span style="font-size:18px;font-weight:800;color:var(--accent);">$' + cost.toFixed(2) + '</span></div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:11px;color:var(--text-muted);">Duration</span><span style="font-size:13px;font-weight:600;color:var(--text-primary);">' + planName + '</span></div>' +
              '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;color:var(--text-muted);">Date</span><span style="font-size:13px;color:var(--text-secondary);">' + createdAt.toLocaleDateString() + '</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="detail-sms-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;order:4;">' +
          '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;"><div style="display:flex;align-items:center;gap:8px;"><i class="fas fa-envelope" style="color:var(--accent);font-size:12px;"></i><span style="font-size:13px;font-weight:700;color:var(--text-primary);">SMS Messages</span><span id="smsCountBadge" style="font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700;background:var(--accent-dim);color:var(--accent);">' + smsList.length + '</span></div><div id="smsAutoRefreshIndicator" class="hide-mobile" style="font-size:10px;color:var(--text-muted);display:flex;align-items:center;gap:4px;"><i class="fas fa-circle" style="font-size:6px;color:#0d9b7a;animation:pulse-dot 2s infinite;"></i> Auto</div></div>' +
          '<div style="padding:12px;max-height:320px;overflow-y:auto;flex:1;" id="detailSmsContainer">' + smsHtml + '</div>' +
        '</div>' +
      '</div>' +
      cancelSectionHtml +
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;">' +
        '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;"><i class="fas fa-redo" style="color:var(--accent);font-size:12px;"></i><span style="font-size:13px;font-weight:700;color:var(--text-primary);">Renew Number</span></div>' +
        '<div style="padding:16px;">' +
          '<div id="renewOptionsWrap">' + renewOptions + '</div>' +
          '<div id="renewSummary" style="display:none;padding:14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;margin-top:14px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;color:var(--text-muted);">Renewal cost:</span><span id="renewTotalCost" style="font-size:20px;font-weight:800;color:var(--accent);">$0.00</span></div></div>' +
          '<button id="renewNowBtn" disabled onclick="executeRenewRental(\'' + rentalId + '\')" class="tap-target" style="width:100%;padding:14px;margin-top:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-redo"></i> Select duration to renew</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  if (canCancel) startCancelCountdown(rentalId, createdAt);
  fetchSmsForRental(rentalId);
  smsPollingInterval = setInterval(function() { if (currentRentalDetailId === rentalId) fetchSmsForRental(rentalId); }, 20000);
};

// ========== CANCEL COUNTDOWN ==========
window.startCancelCountdown = function(rentalId, createdAt) {
  if (cancelTimerInterval) { clearInterval(cancelTimerInterval); cancelTimerInterval = null; }
  var createdTime = new Date(createdAt).getTime();
  cancelTimerInterval = setInterval(function() {
    var remaining = (20 * 60 * 1000) - (Date.now() - createdTime);
    var countdownEl = document.getElementById('cancelCountdown');
    var cancelSection = document.getElementById('cancelSection');
    if (!countdownEl || !cancelSection) { clearInterval(cancelTimerInterval); return; }
    var rental = activeRentals.find(function(r) { return r.id === rentalId; });
    if (rental && rental.sms && rental.sms.length > 0) {
      clearInterval(cancelTimerInterval);
      cancelSection.innerHTML = '<div style="padding:12px 24px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;display:inline-flex;align-items:center;gap:8px;opacity:.5;"><i class="fas fa-lock" style="color:var(--text-muted);"></i><span style="font-size:13px;font-weight:600;color:var(--text-muted);">Cancellation Locked</span></div>';
      return;
    }
    if (remaining <= 0) {
      clearInterval(cancelTimerInterval);
      cancelSection.innerHTML = '<div style="padding:12px 24px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;display:inline-flex;align-items:center;gap:8px;opacity:.5;"><i class="fas fa-hourglass-end" style="color:var(--text-muted);"></i><span style="font-size:13px;font-weight:600;color:var(--text-muted);">Cancel Window Expired</span></div>';
      return;
    }
    var min = Math.floor(remaining / 60000);
    var sec = Math.floor((remaining % 60000) / 1000);
    countdownEl.textContent = min + ':' + String(sec).padStart(2, '0');
    if (remaining < 60000) { countdownEl.style.color = '#d93025'; }
  }, 1000);
};

// ========== SMS FUNCTIONS ==========
window.fetchSmsForRental = async function(rentalId) {
  var rental = activeRentals.find(function(r) { return r.id === rentalId; });
  if (!rental) return;
  try {
    var d = await fetch('/api/v2/rent/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rentalId: rental.smsFetchId || rental.id, orderId: rental.id }) }).then(function(r) { return r.json(); });
    var hasNew = false;
    rental.sms = rental.sms || [];
    if (d.data) {
      if (d.data.content && !rental.sms.some(function(s) { return s.text === d.data.content; })) {
        rental.sms.unshift({ sender: d.data.sender || 'Unknown', text: d.data.content, receivedAt: d.data.receive_at || new Date().toISOString() });
        hasNew = true;
      }
      if (d.data.list && Array.isArray(d.data.list)) {
        d.data.list.forEach(function(sms) {
          var txt = sms.content || sms.text || '';
          if (txt && !rental.sms.some(function(s) { return s.text === txt; })) {
            rental.sms.unshift({ sender: sms.sender || 'Unknown', text: txt, receivedAt: sms.receive_at || new Date().toISOString() });
            hasNew = true;
          }
        });
      }
    }
    if (hasNew) { updateSmsDisplay(rentalId); saveRentalSmsToServer(rentalId, rental.sms); showToast }
  } catch (e) { console.error('SMS fetch error:', e.message); }
};

window.updateSmsDisplay = function(rentalId) {
  var rental = activeRentals.find(function(r) { return r.id === rentalId; });
  if (!rental) return;
  var container = document.getElementById('detailSmsContainer');
  var badge = document.getElementById('smsCountBadge');
  if (!container) return;
  if (badge) badge.textContent = rental.sms.length;
  container.innerHTML = rental.sms.map(function(s) {
    var st = s.receivedAt ? new Date(s.receivedAt) : new Date();
    return '<div style="padding:12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;animation:fadeIn .3s ease;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:4px;"><span style="font-size:11px;font-weight:700;color:var(--accent);background:var(--accent-dim);padding:2px 8px;border-radius:6px;">FROM: ' + (s.sender || 'UNKNOWN') + '</span><span style="font-size:11px;color:var(--text-muted);">' + st.toLocaleDateString() + ' ' + st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span></div><div style="font-size:13px;color:var(--text-primary);line-height:1.5;word-break:break-word;">' + (s.text || '') + '</div></div>';
  }).join('');
  try { var ue = (typeof getUserEmail === 'function') ? getUserEmail() : ''; if (ue) localStorage.setItem('active_rentals_' + ue, JSON.stringify(activeRentals)); } catch(e) {}
};

window.saveRentalSmsToServer = function(rentalId, smsList) {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (!ue) return;
  fetch('/api/rentals/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ue, rentalId: rentalId, sms: smsList }) }).catch(function() {});
};

window.manualRefreshSms = function(rentalId) { fetchSmsForRental(rentalId); };

window.closeRentalDetails = function() {
  currentRentalDetailId = null;
  selectedRenewMonths = 0;
  if (smsPollingInterval) { clearInterval(smsPollingInterval); smsPollingInterval = null; }
  if (cancelTimerInterval) { clearInterval(cancelTimerInterval); cancelTimerInterval = null; }
  if (typeof renderMainContent === 'function') renderMainContent();
};

window.copyRentalPhone = function(phone) {
  navigator.clipboard.writeText(phone).then(function() { showToast('Copied: ' + phone, 'success'); }).catch(function() { showToast('Failed to copy', 'error'); });
};

window.cancelRentalFromDetail = async function(rentalId) {
  if (!confirm('Cancel this rental?')) return;
  var cancelSection = document.getElementById('cancelSection');
  if (cancelSection) cancelSection.innerHTML = '<div style="padding:20px;"><i class="fas fa-spinner fa-spin" style="color:var(--accent);"></i><p style="font-size:13px;color:var(--text-muted);margin-top:10px;">Cancelling...</p></div>';
  try {
    await window.smsbusCancelRent(rentalId);
    await fetch('/api/rental/' + rentalId, { method: 'DELETE' });
    activeRentals = activeRentals.filter(function(r) { return r.id !== rentalId; });
    try { var ue = (typeof getUserEmail === 'function') ? getUserEmail() : ''; if (ue) localStorage.setItem('active_rentals_' + ue, JSON.stringify(activeRentals)); } catch(e) {}
    showToast('Rental cancelled', 'success');
    closeRentalDetails();
  } catch (e) { showToast('Failed: ' + e.message, 'error'); closeRentalDetails(); }
};

window.selectRenewMonths = function(months) {
  selectedRenewMonths = months;
  document.querySelectorAll('.renew-opt-btn').forEach(function(btn) { btn.classList.remove('selected'); });
  var selBtn = document.getElementById('renewOpt' + months);
  if (selBtn) selBtn.classList.add('selected');
  var summary = document.getElementById('renewSummary');
  var totalEl = document.getElementById('renewTotalCost');
  var btn = document.getElementById('renewNowBtn');
  if (summary && totalEl && btn) {
    var cost = currentRentDollarsPerMonth > 0 ? addRentProfit(currentRentDollarsPerMonth * months) : 0;
    totalEl.textContent = '$' + cost.toFixed(2);
    summary.style.display = 'block';
    btn.disabled = false;
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.innerHTML = '<i class="fas fa-redo"></i> Renew for ' + months + ' Month' + (months > 1 ? 's' : '') + ' — $' + cost.toFixed(2);
  }
};

window.executeRenewRental = async function(rentalId) {
  if (selectedRenewMonths <= 0) return;
  var btn = document.getElementById('renewNowBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; btn.disabled = true; }
  try {
    var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
    if (!ue) { showToast('Please log in', 'error'); if (btn) { btn.innerHTML = '<i class="fas fa-redo"></i> Renew'; btn.disabled = false; } return; }
    var renewCost = currentRentDollarsPerMonth > 0 ? addRentProfit(currentRentDollarsPerMonth * selectedRenewMonths) : 0;
    var ur = await fetch('/api/user/' + ue);
    var ud = await ur.json();
    var sb = parseFloat(ud.balance) || 0;
    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(sb);
    if (sb < renewCost) { showInsufficientBalanceWarning(renewCost, sb); if (btn) { btn.innerHTML = '<i class="fas fa-redo"></i> Renew'; btn.disabled = false; } return; }
    var rental = activeRentals.find(function(r) { return r.id === rentalId; });
    var cc = rental ? rental.countryCode : 'us';
    var ad = await window.smsbusCreateRent(cc, selectedRenewMonths, ue);
    var newExpires = ad.expire_at || new Date(Date.now() + selectedRenewMonths * 30 * 24 * 3600000).toISOString();
    if (rental) { rental.expiresAt = newExpires; rental.durationMonths = (rental.durationMonths || 0) + selectedRenewMonths; rental.planName = rental.durationMonths + ' Month' + (rental.durationMonths > 1 ? 's' : ''); rental.cost = (rental.cost || 0) + renewCost; }
    await fetch('/api/rentals/renew', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ue, rentalId: rentalId, months: selectedRenewMonths, cost: renewCost, newExpiresAt: newExpires }) }).then(function(r) { return r.json(); }).then(function(d) { if (d.balance !== undefined && typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(d.balance); }).catch(function() {});
    showToast('Renewed for ' + selectedRenewMonths + ' month(s)! -$' + renewCost.toFixed(2), 'success');
    selectedRenewMonths = 0;
    window.showRentalDetails(rentalId);
  } catch (err) { showToast(err.message || 'Renewal failed', 'error'); if (btn) { btn.innerHTML = '<i class="fas fa-redo"></i> Renew'; btn.disabled = false; } }
};

// =======================================================================
// ===== RENDER CARDS PAGE =====
// =======================================================================
function renderCardsPage(main) {
  cardTabActive = 'virtual';
  giftCardStep = 1;
  selectedGiftCard = null;
  selectedGiftCountry = 'us';
  flippedCardId = null;
  selectedCardForPurchase = null;
  cardCreationStep = 1;
  window._giftFormEmail = '';
  window._giftFormAmount = '';

  main.innerHTML =
    '<div class="page-header"><div><h1 class="page-title"><i class="far fa-credit-card" style="color:var(--accent);margin-right:10px;"></i>My Cards</h1><p style="font-size:14px;color:var(--text-secondary);margin-top:8px;">Manage your virtual and gift cards</p></div></div>' +
    '<div style="display:flex;gap:4px;margin-bottom:24px;background:var(--bg-card);border-radius:12px;padding:4px;border:1px solid var(--border);">' +
      '<button id="tabVirtual" onclick="switchCardTab(\'virtual\')" style="flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:var(--accent);color:#fff;"><i class="fas fa-credit-card" style="margin-right:6px;"></i>Virtual Cards</button>' +
      '<button id="tabGift" onclick="switchCardTab(\'gift\')" style="flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:transparent;color:var(--text-secondary);"><i class="fas fa-gift" style="margin-right:6px;"></i>Gift Cards</button>' +
    '</div>' +
    '<div id="cardsContent"></div>';
  renderCardTabContent();
}

window.switchCardTab = function(tab) {
  cardTabActive = tab;
  giftCardStep = 1;
  selectedGiftCard = null;
  flippedCardId = null;
  selectedCardForPurchase = null;
  cardCreationStep = 1;
  window._giftFormEmail = '';
  window._giftFormAmount = '';
  var tabV = document.getElementById('tabVirtual');
  var tabG = document.getElementById('tabGift');
  if (tab === 'virtual') { tabV.style.background = 'var(--accent)'; tabV.style.color = '#fff'; tabG.style.background = 'transparent'; tabG.style.color = 'var(--text-secondary)'; }
  else { tabG.style.background = 'var(--accent)'; tabG.style.color = '#fff'; tabV.style.background = 'transparent'; tabV.style.color = 'var(--text-secondary)'; }
  renderCardTabContent();
};

function renderCardTabContent() {
  var container = document.getElementById('cardsContent');
  if (!container) return;
  if (cardTabActive === 'virtual') renderVirtualCardsTab(container);
  else renderGiftCardsTab(container);
}

// =======================================================================
// ===== VIRTUAL CARDS TAB =====
// =======================================================================
function renderVirtualCardsTab(container) {
  if (selectedCardForPurchase) {
    if (cardCreationStep === 1) renderLoadAmountStep(container);
    else renderCardHolderStep(container);
    return;
  }

  if (userCards.length > 0) {
    var cardsHTML = '<div style="display:flex;flex-direction:column;gap:8px;">' +
      userCards.map(function(card) {
        var cardType = virtualCardTypes.find(function(t) { return t.id === card.cardType; });
        var gradient = cardType ? cardType.gradient : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
        var brand = cardType ? cardType.brand : 'VISA';
        var holderName = card.cardHolderName || 'CARD HOLDER';
        var maskedNum = card.fullNumber ? card.fullNumber.replace(/\d(?=.{4})/g, '•') : '•••• •••• •••• ••••';
        var expDate = card.expDate || '12/26';
        var balance = typeof card.balance === 'number' ? card.balance : 0;
        var isFlipped = flippedCardId === card.id;
        var fullNumber = card.fullNumber || '';
        var cvv = card.cvv || '***';
        var isFrozen = card.frozen === true;
        var frozenOverlay = isFrozen ? '<div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(2px);border-radius:14px;"><i class="fas fa-snowflake" style="font-size:36px;color:rgba(100,180,255,.8);margin-bottom:8px;"></i><span style="font-size:14px;font-weight:700;color:rgba(100,180,255,.9);letter-spacing:2px;">FROZEN</span></div>' : '';
        var freezeBtn = isFrozen
          ? '<button onclick="event.stopPropagation();toggleFreezeCard(\'' + card.id + '\')" class="tap-target" style="flex:1;padding:7px;background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.3);border-radius:8px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;font-weight:600;"><i class="fas fa-sun" style="font-size:10px;"></i> Unfreeze</button>'
          : '<button onclick="event.stopPropagation();toggleFreezeCard(\'' + card.id + '\')" class="tap-target" style="flex:1;padding:7px;background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.2);border-radius:8px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;font-weight:600;"><i class="fas fa-snowflake" style="font-size:10px;"></i> Freeze</button>';

        return '<div class="card-flip-wrapper" style="perspective:1000px;"><div class="card-flip-inner" style="transform:' + (isFlipped ? 'rotateY(180deg)' : 'none') + ';">' +
          '<div class="card-flip-front" style="cursor:pointer;" onclick="flipCard(\'' + card.id + '\')"><div style="width:100%;height:100%;background:' + gradient + ';padding:16px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;"><div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.03);"></div><div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;"><div style="font-size:20px;font-weight:800;color:rgba(255,255,255,.95);letter-spacing:2px;">' + brand + '</div><div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:4px 10px;text-align:right;"><div style="font-size:7px;color:rgba(255,255,255,.5);text-transform:uppercase;">Balance</div><div style="font-size:14px;font-weight:800;color:rgba(255,255,255,.95);">$' + balance.toFixed(2) + '</div></div></div><div style="position:relative;z-index:1;"><div style="width:42px;height:32px;border-radius:5px;background:linear-gradient(135deg,#d4af37 0%,#f5e6a3 25%,#d4af37 50%,#c9a52e 75%,#f5e6a3 100%);"></div></div><div style="position:relative;z-index:1;font-family:\'Courier New\',monospace;font-size:16px;letter-spacing:2px;color:rgba(255,255,255,.9);">' + maskedNum + '</div><div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1;"><div><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:2px;">Card Holder</div><div style="font-size:12px;font-weight:600;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:1px;">' + holderName + '</div></div><div style="text-align:right;"><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:2px;">Expires</div><div style="font-size:12px;color:rgba(255,255,255,.9);">' + expDate + '</div></div></div>' + frozenOverlay + '</div></div>' +
          '<div class="card-flip-back" style="cursor:pointer;" onclick="flipCard(\'' + card.id + '\')"><div style="width:100%;height:100%;background:' + gradient + ';padding:16px;display:flex;flex-direction:column;position:relative;overflow:hidden;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;"><div style="font-size:20px;font-weight:800;color:rgba(255,255,255,.95);letter-spacing:2px;">' + brand + '</div><div style="font-size:10px;color:rgba(255,255,255,.5);background:rgba(255,255,255,.1);padding:3px 8px;border-radius:6px;">Details</div></div><div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:3px;">Card Number</div><div style="font-family:\'Courier New\',monospace;font-size:12px;color:rgba(255,255,255,.9);">' + fullNumber + '</div></div><div><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:3px;">CVV</div><div style="font-family:\'Courier New\',monospace;font-size:12px;color:rgba(255,255,255,.9);">' + cvv + '</div></div><div><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:3px;">Expires</div><div style="font-size:12px;color:rgba(255,255,255,.85);">' + expDate + '</div></div><div><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:3px;">Type</div><div style="font-size:12px;color:rgba(255,255,255,.85);">' + (cardType ? cardType.name : 'Virtual Card') + '</div></div></div><div style="text-align:center;margin-top:auto;font-size:9px;color:rgba(255,255,255,.25);"><i class="fas fa-undo" style="margin-right:4px;"></i>Tap to flip back</div></div></div>' +
        '</div></div>' +
        '<div style="display:flex;gap:4px;padding:8px;background:var(--bg-card);border-radius:0 0 12px 12px;border:1px solid var(--border);border-top:none;flex-wrap:wrap;">' +
          '<button onclick="event.stopPropagation();showTopUpCardModal(\'' + card.id + '\')" class="tap-target" style="flex:1;min-width:60px;padding:7px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"><i class="fas fa-plus" style="font-size:10px;"></i> Top Up</button>' +
          '<button onclick="event.stopPropagation();copyCardInfo(\'' + card.id + '\')" class="tap-target" style="flex:1;min-width:60px;padding:7px;background:var(--bg-primary);color:var(--text-secondary);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"><i class="fas fa-copy" style="font-size:10px;"></i> Copy</button>' +
          '<button onclick="event.stopPropagation();shareCard(\'' + card.id + '\')" class="tap-target" style="flex:1;min-width:60px;padding:7px;background:var(--bg-primary);color:var(--text-secondary);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"><i class="fas fa-share-alt" style="font-size:10px;"></i> Share</button>' +
          freezeBtn +
        '</div>';
      }).join('') + '</div>' +
      '<div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted);opacity:.6;"><i class="fas fa-hand-pointer" style="margin-right:4px;"></i>Tap card to flip</div>' +
      '<div style="text-align:center;margin-top:8px;"><button onclick="showNewCardModal()" class="tap-target" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;"><i class="fas fa-plus"></i> Add Another Card</button></div>';
    container.innerHTML = cardsHTML;
    return;
  }

  container.innerHTML = '<div style="text-align:center;padding:48px 20px;"><div style="width:80px;height:80px;border-radius:20px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;border:2px dashed rgba(255,255,255,.1);"><i class="far fa-credit-card" style="font-size:32px;color:rgba(255,255,255,.2);"></i></div><h3 style="font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">No Virtual Card</h3><p style="font-size:13px;color:var(--text-muted);margin-bottom:24px;">Tap the button below to purchase a virtual card</p><button onclick="showNewCardModal()" class="tap-target" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;"><i class="fas fa-plus"></i> New Virtual Card</button></div>';
}

window.toggleFreezeCard = function(cardId) {
  var card = userCards.find(function(c) { return c.id === cardId; });
  if (!card) return;
  card.frozen = !card.frozen;
  saveCardsToLocal(userCards);
  showToast(card.frozen ? 'Card frozen' : 'Card unfrozen', card.frozen ? 'info' : 'success');
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (ue) fetch('/api/cards/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ue, cardId: cardId, frozen: card.frozen }) }).catch(function() {});
  renderVirtualCardsTab(document.getElementById('cardsContent'));
};

window.flipCard = function(cardId) { flippedCardId = flippedCardId === cardId ? null : cardId; renderVirtualCardsTab(document.getElementById('cardsContent')); };

window.copyCardInfo = function(cardId) {
  var card = userCards.find(function(c) { return c.id === cardId; });
  if (!card) return;
  var text = 'Number: ' + (card.fullNumber || '') + '\nExpiry: ' + (card.expDate || '') + '\nCVV: ' + (card.cvv || '') + '\nHolder: ' + (card.cardHolderName || '');
  navigator.clipboard.writeText(text).then(function() { showToast('Copied', 'success'); }).catch(function() { showToast('Failed', 'error'); });
};

window.showTopUpCardModal = function(cardId) { showToast('Top up coming soon', 'info'); };

window.showNewCardModal = function() {
  var modal = document.createElement('div');
  modal.id = 'newCardModal';
  modal.className = 'modal-overlay show';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  modal.innerHTML = '<div class="modal" style="width:360px;max-width:90vw;"><div class="modal-header"><h2 class="modal-title">Select Card Type</h2><button class="modal-close" onclick="document.getElementById(\'newCardModal\').remove()"><i class="fas fa-times"></i></button></div><div class="modal-body" style="display:flex;flex-direction:column;gap:10px;">' +
    virtualCardTypes.map(function(t) {
      return '<div onclick="selectCardType(\'' + t.id + '\')" style="position:relative;padding:16px;background:var(--bg-primary);border:2px solid var(--border);border-radius:14px;cursor:pointer;transition:all .2s;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
        (t.badge ? '<span style="position:absolute;top:-6px;right:-6px;font-size:9px;padding:2px 8px;background:#f59e0b;color:#000;border-radius:8px;font-weight:700;">' + t.badge + '</span>' : '') +
        '<div style="display:flex;align-items:center;gap:12px;"><div style="width:44px;height:28px;border-radius:6px;background:' + t.gradient + ';"></div><div><div style="font-size:14px;font-weight:600;color:var(--text-primary);">' + t.name + '</div><div style="font-size:12px;color:var(--text-muted);">' + t.brand + '</div></div></div></div>';
    }).join('') + '</div></div>';
  document.body.appendChild(modal);
};

window.selectCardType = function(typeId) {
  selectedCardForPurchase = typeId;
  cardCreationStep = 1;
  window._vcFormName = '';
  window._vcFormAddress = '';
  window._vcFormAmount = '';
  var m = document.getElementById('newCardModal');
  if (m) m.remove();
  renderVirtualCardsTab(document.getElementById('cardsContent'));
};

// =======================================================================
// ===== CARD CREATION STEPS =====
// =======================================================================
function renderLoadAmountStep(container) {
  var savedAmount = window._vcFormAmount || '';
  var displayAmount = parseFloat(savedAmount) || 0;
  var cardFee = calcCardFee(displayAmount);
  var totalCost = displayAmount + cardFee;
  var canContinue = displayAmount >= 5;

  container.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;"><button onclick="cancelCardCreation()" class="tap-target" style="width:34px;height:34px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;"><i class="fas fa-arrow-left"></i></button><div><h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;">Load Amount</h3><p style="font-size:12px;color:var(--text-muted);margin:0;">Choose how much to load</p></div></div>' +
    '<div style="display:flex;align-items:center;gap:0;margin-bottom:24px;"><div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;">1</div><span style="font-size:12px;font-weight:600;color:var(--accent);margin-left:8px;">Amount</span><div style="width:40px;height:2px;background:var(--border);margin:0 8px;"></div><div style="width:28px;height:28px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text-muted);">2</div><span style="font-size:12px;font-weight:500;color:var(--text-muted);margin-left:8px;">Card Info</span></div>' +
    '<div style="margin-bottom:14px;"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;">How much to load? <span style="color:var(--danger);">*</span></label><div style="position:relative;"><span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:14px;font-weight:600;color:var(--text-muted);">$</span><input type="number" id="vcLoadAmount" min="5" step="1" placeholder="5" value="' + savedAmount + '" style="width:100%;padding:12px 14px 12px 30px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:16px;outline:none;" oninput="onVCAmountInput(this.value)"></div><div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Minimum load is <strong style="color:var(--accent);">$5.00</strong></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:20px;">' +
      [5, 10, 20, 50, 100, 200, 500, 1000].map(function(v) {
        var sel = displayAmount === v;
        return '<button onclick="setVCAmount(' + v + ')" style="padding:10px 4px;background:' + (sel ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';border:1px solid ' + (sel ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;color:' + (sel ? 'var(--accent)' : 'var(--text-secondary)') + ';font-size:13px;font-weight:600;cursor:pointer;">$' + v + '</button>';
      }).join('') +
    '</div>' +
    '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:24px;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-size:13px;color:var(--text-muted);">Load Amount</span><span id="vcSummaryAmount" style="font-size:13px;font-weight:600;color:var(--text-primary);">$' + displayAmount.toFixed(2) + '</span></div><div style="height:1px;background:var(--border);margin:10px 0;"></div><div style="display:flex;justify-content:space-between;"><span style="font-size:14px;font-weight:700;color:var(--text-primary);">Total</span><span id="vcSummaryTotal" style="font-size:16px;font-weight:800;color:var(--accent);">$' + totalCost.toFixed(2) + '</span></div></div>' +
    '<button id="vcContinueBtn" onclick="goToCardHolderStep()" ' + (canContinue ? '' : 'disabled ') + 'style="width:100%;padding:14px;background:' + (canContinue ? 'var(--accent)' : 'var(--bg-card)') + ';color:' + (canContinue ? '#fff' : 'var(--text-muted)') + ';border:' + (canContinue ? 'none' : '1px solid var(--border)') + ';border-radius:12px;font-size:14px;font-weight:600;cursor:' + (canContinue ? 'pointer' : 'not-allowed') + ';display:flex;align-items:center;justify-content:center;gap:8px;"><span>Continue</span><i class="fas fa-arrow-right"></i></button>';
}

function renderCardHolderStep(container) {
  var cardType = virtualCardTypes.find(function(t) { return t.id === selectedCardForPurchase; });
  var cardGradient = cardType ? cardType.gradient : 'linear-gradient(135deg, #1a1a2e, #16213e)';
  var savedName = window._vcFormName || '';
  var savedAddr = window._vcFormAddress || '';
  var displayAmount = parseFloat(window._vcFormAmount) || 0;
  var totalCost = displayAmount + calcCardFee(displayAmount);
  var canProceed = savedName.trim().length >= 2 && savedAddr.trim().length >= 5;

  container.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;"><button onclick="goBackToAmountStep()" class="tap-target" style="width:34px;height:34px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;"><i class="fas fa-arrow-left"></i></button><div><h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;">Card Holder Information</h3><p style="font-size:12px;color:var(--text-muted);margin:0;">This info will appear on your card</p></div></div>' +
    '<div style="display:flex;align-items:center;gap:0;margin-bottom:24px;"><div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-check" style="font-size:10px;color:#fff;"></i></div><span style="font-size:12px;font-weight:600;color:var(--accent);margin-left:8px;">Amount</span><div style="width:40px;height:2px;background:var(--accent);margin:0 8px;"></div><div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;">2</div><span style="font-size:12px;font-weight:600;color:var(--accent);margin-left:8px;">Card Info</span></div>' +
    '<div style="border-radius:14px;overflow:hidden;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,.2);"><div style="background:' + cardGradient + ';padding:16px;display:flex;flex-direction:column;justify-content:space-between;height:140px;position:relative;overflow:hidden;"><div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.03);"></div><div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;"><div style="font-size:20px;font-weight:800;color:rgba(255,255,255,.95);letter-spacing:2px;">' + (cardType ? cardType.brand : 'VISA') + '</div><div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:4px 10px;text-align:right;"><div style="font-size:7px;color:rgba(255,255,255,.5);text-transform:uppercase;">Balance</div><div style="font-size:14px;font-weight:800;color:rgba(255,255,255,.95);">$' + displayAmount.toFixed(2) + '</div></div></div><div style="position:relative;z-index:1;font-family:\'Courier New\',monospace;font-size:15px;letter-spacing:2px;color:rgba(255,255,255,.9);">•••• •••• •••• ••••</div><div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1;"><div><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:2px;">Card Holder</div><div id="vcPreviewName" style="font-size:12px;font-weight:600;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:1px;">' + (savedName.trim() ? savedName.trim().toUpperCase() : 'YOUR NAME') + '</div></div><div style="text-align:right;"><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:2px;">Expires</div><div style="font-size:12px;color:rgba(255,255,255,.9);">12/27</div></div></div></div></div>' +
    '<div style="margin-bottom:14px;"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;">Full Name <span style="color:var(--danger);">*</span></label><input type="text" id="vcCardName" placeholder="e.g. John Doe" value="' + savedName.replace(/"/g, '&quot;') + '" maxlength="26" style="width:100%;padding:12px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:16px;outline:none;text-transform:uppercase;" oninput="onVCNameInput(this.value)"><div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Printed on card (max 26 characters)</div></div>' +
    '<div style="margin-bottom:24px;"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;">Billing Address <span style="color:var(--danger);">*</span></label><textarea id="vcCardAddress" placeholder="Street, City, State, ZIP" rows="3" style="width:100%;padding:12px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:16px;outline:none;resize:vertical;min-height:72px;" oninput="window._vcFormAddress=this.value;updateVCProceedBtn()">' + savedAddr + '</textarea></div>' +
    '<div style="display:flex;gap:10px;"><button onclick="goBackToAmountStep()" style="flex:1;padding:14px;background:var(--bg-card);color:var(--text-secondary);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">Back</button>' +
    (canProceed ? '<button id="vcCreateBtn" onclick="createVirtualCard()" style="flex:2;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-credit-card"></i> Create Card — $' + totalCost.toFixed(2) + '</button>' : '<button id="vcCreateBtn" disabled style="flex:2;padding:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;">Fill in all fields</button>') +
    '</div>';
}

window.setVCAmount = function(amount) { window._vcFormAmount = String(amount); var input = document.getElementById('vcLoadAmount'); if (input) input.value = amount; updateVCAmountDisplay(); };
window.onVCAmountInput = function(val) { var num = parseFloat(val) || 0; if (num > 0 && num < 5) num = 5; window._vcFormAmount = String(num); updateVCAmountDisplay(); };
window.updateVCAmountDisplay = function() {
  var amount = parseFloat(window._vcFormAmount) || 0;
  if (amount < 5) amount = 0;
  var fee = calcCardFee(amount);
  var sa = document.getElementById('vcSummaryAmount'); if (sa) sa.textContent = '$' + amount.toFixed(2);
  var st = document.getElementById('vcSummaryTotal'); if (st) st.textContent = '$' + (amount + fee).toFixed(2);
  var btn = document.getElementById('vcContinueBtn');
  if (btn) { btn.disabled = amount < 5; btn.style.background = amount >= 5 ? 'var(--accent)' : 'var(--bg-card)'; btn.style.color = amount >= 5 ? '#fff' : 'var(--text-muted)'; btn.style.border = amount >= 5 ? 'none' : '1px solid var(--border)'; btn.style.cursor = amount >= 5 ? 'pointer' : 'not-allowed'; }
};
window.onVCNameInput = function(val) { window._vcFormName = val; var p = document.getElementById('vcPreviewName'); if (p) p.textContent = val.trim() ? val.trim().toUpperCase() : 'YOUR NAME'; updateVCProceedBtn(); };
window.updateVCProceedBtn = function() {
  var btn = document.getElementById('vcCreateBtn'); if (!btn) return;
  var da = parseFloat(window._vcFormAmount) || 0;
  var total = da + calcCardFee(da);
  var nameOk = (window._vcFormName || '').trim().length >= 2;
  var addrOk = (window._vcFormAddress || '').trim().length >= 5;
  if (nameOk && addrOk) { btn.disabled = false; btn.style.background = 'var(--accent)'; btn.style.color = '#fff'; btn.style.border = 'none'; btn.style.cursor = 'pointer'; btn.setAttribute('onclick', 'createVirtualCard()'); btn.innerHTML = '<i class="fas fa-credit-card"></i> Create Card — $' + total.toFixed(2); }
  else { btn.disabled = true; btn.style.background = 'var(--bg-card)'; btn.style.color = 'var(--text-muted)'; btn.style.border = '1px solid var(--border)'; btn.style.cursor = 'not-allowed'; btn.removeAttribute('onclick'); btn.innerHTML = 'Fill in all fields'; }
};
window.goToCardHolderStep = function() { var amt = parseFloat(window._vcFormAmount) || 0; if (amt < 5) { showToast('Enter at least $5', 'error'); return; } cardCreationStep = 2; renderVirtualCardsTab(document.getElementById('cardsContent')); };
window.goBackToAmountStep = function() { cardCreationStep = 1; renderVirtualCardsTab(document.getElementById('cardsContent')); };
window.cancelCardCreation = function() { selectedCardForPurchase = null; cardCreationStep = 1; window._vcFormName = ''; window._vcFormAddress = ''; window._vcFormAmount = ''; renderVirtualCardsTab(document.getElementById('cardsContent')); };

window.createVirtualCard = function() {
  var n = document.getElementById('vcCardName');
  var a = document.getElementById('vcCardAddress');
  var cn = n ? n.value.trim() : (window._vcFormName || '').trim();
  var ca = a ? a.value.trim() : (window._vcFormAddress || '').trim();
  var loadAmt = parseFloat(window._vcFormAmount) || 0;
  if (cn.length < 2) { showToast('Enter a valid name', 'error'); return; }
  if (ca.length < 5) { showToast('Enter a valid address', 'error'); return; }
  if (loadAmt < 5) { showToast('Minimum $5', 'error'); return; }
  var ct = virtualCardTypes.find(function(t) { return t.id === selectedCardForPurchase; });
  if (!ct) return;
  var btn = document.getElementById('vcCreateBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...'; btn.disabled = true; }
  setTimeout(function() {
    var fn = '';
    for (var i = 0; i < 16; i++) { if (i > 0 && i % 4 === 0) fn += ' '; fn += String(Math.floor(Math.random() * 10)); }
    var cv = String(Math.floor(100 + Math.random() * 900));
    var now = new Date();
    var nc = { id: 'card-' + Date.now(), cardType: ct.id, cardHolderName: cn.toUpperCase(), billingAddress: ca, fullNumber: fn, cvv: cv, expDate: String(now.getMonth() + 1).padStart(2, '0') + '/' + String(now.getFullYear() + 3).slice(-2), balance: loadAmt, frozen: false, status: 'Active', createdAt: new Date().toISOString() };
    saveCardToServer(nc);
    showToast(ct.name + ' created! Loaded $' + loadAmt.toFixed(2), 'success');
    selectedCardForPurchase = null;
    cardCreationStep = 1;
    window._vcFormName = '';
    window._vcFormAddress = '';
    window._vcFormAmount = '';
    renderVirtualCardsTab(document.getElementById('cardsContent'));
  }, 1500);
};

// =======================================================================
// ===== GIFT CARDS TAB =====
// =======================================================================
function renderGiftCardsTab(container) {
  var stepsHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:24px;">' +
    '<div class="gift-step' + (giftCardStep === 1 ? ' active' : '') + '"><span class="gift-step-num">1</span><span class="gift-step-label">Country</span></div><div class="gift-step-line' + (giftCardStep >= 2 ? ' done' : '') + '"></div>' +
    '<div class="gift-step' + (giftCardStep === 2 ? ' active' : '') + '"><span class="gift-step-num">2</span><span class="gift-step-label">Card Type</span></div><div class="gift-step-line' + (giftCardStep >= 3 ? ' done' : '') + '"></div>' +
    '<div class="gift-step' + (giftCardStep === 3 ? ' active' : '') + '"><span class="gift-step-num">3</span><span class="gift-step-label">Recipient</span></div></div>';
  var contentHTML = '';

  if (giftCardStep === 1) {
    contentHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;">' +
      giftCardCountries.map(function(c) {
        var s = selectedGiftCountry === c.code;
        return '<div onclick="selectGiftCountry(\'' + c.code + '\')" style="padding:12px 8px;background:' + (s ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';border:2px solid ' + (s ? 'var(--accent)' : 'var(--border)') + ';border-radius:12px;text-align:center;cursor:pointer;"><div style="font-size:28px;margin-bottom:4px;">' + c.flag + '</div><div style="font-size:11px;font-weight:600;color:' + (s ? 'var(--accent)' : 'var(--text-secondary)') + ';">' + c.name + '</div></div>';
      }).join('') + '</div>';
  } else if (giftCardStep === 2) {
    var cards = giftCardTypes[selectedGiftCountry] || [];
    var ci = getCountryInfo(selectedGiftCountry);
    contentHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><span style="font-size:20px;">' + ci.flag + '</span><span style="font-size:13px;color:var(--text-muted);">Select gift card type</span></div><div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto;">' +
      cards.map(function(c) {
        var s = selectedGiftCard && selectedGiftCard.id === c.id;
        return '<div onclick="selectGiftCardType(\'' + c.id + '\')" style="display:flex;align-items:center;gap:12px;padding:14px;background:' + (s ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';border:2px solid ' + (s ? 'var(--accent)' : 'var(--border)') + ';border-radius:12px;cursor:pointer;"><div style="width:40px;height:40px;border-radius:10px;background:var(--bg-card);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">' + c.icon + '</div><div style="flex:1;"><div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + c.name + '</div><div style="font-size:11px;color:var(--text-muted);">' + ci.symbol + c.min + ' – ' + ci.symbol + c.max + '</div></div>' + (s ? '<i class="fas fa-check-circle" style="color:var(--accent);font-size:16px;"></i>' : '') + '</div>';
      }).join('') + '</div>';
  } else if (giftCardStep === 3) {
    var selCard = selectedGiftCard;
    var ci = getCountryInfo(selectedGiftCountry);
    var sEmail = String(window._giftFormEmail || '');
    var sAmount = String(window._giftFormAmount || (selCard ? selCard.min : ''));
    var eOk = sEmail.trim().length > 0;
    var aOk = sAmount.trim().length > 0;
    contentHTML =
      '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:48px;height:48px;border-radius:12px;background:var(--bg-card);display:flex;align-items:center;justify-content:center;font-size:22px;">' + (selCard ? selCard.icon : '💳') + '</div><div><div style="font-size:15px;font-weight:700;color:var(--text-primary);">' + (selCard ? selCard.name : '') + '</div><div style="font-size:12px;color:var(--text-muted);">' + ci.flag + ' • ' + ci.symbol + (selCard ? selCard.min : '') + ' – ' + ci.symbol + (selCard ? selCard.max : '') + '</div></div></div></div>' +
      '<div style="margin-bottom:14px;"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;">Recipient Email <span style="color:var(--danger);">*</span></label><input type="email" id="giftRecipientEmail" placeholder="recipient@email.com" value="' + sEmail.replace(/"/g, '&quot;') + '" style="width:100%;padding:12px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:16px;outline:none;" oninput="window._giftFormEmail=this.value;updateGiftProceedBtn()"></div>' +
      '<div style="margin-bottom:16px;"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;">Card Amount (' + ci.currency + ') <span style="color:var(--danger);">*</span></label><div style="position:relative;"><span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:14px;font-weight:600;color:var(--text-muted);">' + ci.symbol + '</span><input type="number" id="giftCardAmount" min="' + (selCard ? selCard.min : 0) + '" max="' + (selCard ? selCard.max : 0) + '" placeholder="' + (selCard ? selCard.min : '') + '" value="' + sAmount + '" style="width:100%;padding:12px 14px 12px 30px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:16px;outline:none;" oninput="window._giftFormAmount=this.value;updateGiftProceedBtn()"></div></div>';
  }

  var btnHTML = '';
  if (giftCardStep < 3) {
    btnHTML = '<button disabled style="width:100%;padding:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;">Select to continue</button>';
  } else {
    btnHTML = (eOk && aOk)
      ? '<button id="giftProceedBtn" onclick="purchaseGiftCard()" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-paper-plane"></i> Send Gift Card</button>'
      : '<button id="giftProceedBtn" disabled style="width:100%;padding:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;">Fill in email & amount</button>';
  }
  container.innerHTML = stepsHTML + '<div>' + contentHTML + '</div><div style="margin-top:20px;" id="giftBtnWrap">' + btnHTML + '</div>';
}

window.updateGiftProceedBtn = function() {
  if (giftCardStep !== 3) return;
  var w = document.getElementById('giftBtnWrap');
  if (!w) return;
  var eOk = String(window._giftFormEmail || '').trim().length > 0;
  var aOk = String(window._giftFormAmount || '').trim().length > 0;
  w.innerHTML = (eOk && aOk)
    ? '<button id="giftProceedBtn" onclick="purchaseGiftCard()" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-paper-plane"></i> Send Gift Card</button>'
    : '<button id="giftProceedBtn" disabled style="width:100%;padding:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;">Fill in email & amount</button>';
};

window.selectGiftCountry = function(code) { selectedGiftCountry = code; giftCardStep = 2; selectedGiftCard = null; window._giftFormEmail = ''; window._giftFormAmount = ''; renderGiftCardsTab(document.getElementById('cardsContent')); };
window.selectGiftCardType = function(id) { selectedGiftCard = giftCardTypes[selectedGiftCountry].find(function(c) { return c.id === id; }); giftCardStep = 3; window._giftFormEmail = ''; window._giftFormAmount = selectedGiftCard ? String(selectedGiftCard.min) : ''; renderGiftCardsTab(document.getElementById('cardsContent')); };

window.purchaseGiftCard = function() {
  if (!selectedGiftCard) { showToast('Complete all steps', 'error'); return; }
  var eEl = document.getElementById('giftRecipientEmail');
  var aEl = document.getElementById('giftCardAmount');
  var rEmail = eEl ? eEl.value.trim() : String(window._giftFormEmail || '').trim();
  var cAmt = aEl ? parseFloat(aEl.value) : parseFloat(window._giftFormAmount || 0);
  if (!rEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail)) { showToast('Invalid email', 'error'); return; }
  if (!cAmt || cAmt < (selectedGiftCard.min || 0)) { showToast('Invalid amount', 'error'); return; }
  var ci = getCountryInfo(selectedGiftCountry);
  var btn = document.getElementById('giftProceedBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; btn.disabled = true; }
  showToast('Processing ' + selectedGiftCard.name + ' (' + ci.symbol + cAmt + ')...', 'info');
  setTimeout(function() {
    showToast('Gift card sent! ' + selectedGiftCard.name + ' (' + ci.symbol + cAmt + ') → ' + rEmail, 'success');
    selectedGiftCard = null;
    selectedGiftCountry = 'us';
    giftCardStep = 1;
    window._giftFormEmail = '';
    window._giftFormAmount = '';
    renderGiftCardsTab(document.getElementById('cardsContent'));
  }, 1500);
};

window.shareCard = function(cardId) {
  var card = userCards.find(function(c) { return c.id === cardId; });
  if (!card) return;
  var text = 'Card: ' + (card.fullNumber || '') + '\nExpiry: ' + (card.expDate || '') + '\nCVV: ' + (card.cvv || '');
  if (navigator.share) { navigator.share({ title: 'Virtual Card', text: text }).catch(function() {}); }
  else { navigator.clipboard.writeText(text).then(function() { showToast('Card info copied!', 'success'); }); }
};

window.renderSharedCardPage = function(main, token) {
  main.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:60vh;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent);"></i></div>';
  if (token.indexOf('local_') === 0) {
    try { displaySharedCard(main, JSON.parse(decodeURIComponent(escape(atob(token.replace('local_', '')))))); }
    catch (e) { main.innerHTML = '<div style="text-align:center;padding:60px 20px;"><h2 style="color:var(--text-primary);">Invalid Link</h2></div>'; }
  } else {
    fetch('/api/cards/shared/' + token).then(function(r) { return r.json(); }).then(function(data) { displaySharedCard(main, data.card || data); }).catch(function() { main.innerHTML = '<div style="text-align:center;padding:60px 20px;"><h2 style="color:var(--text-primary);">Link Expired</h2></div>'; });
  }
};

function displaySharedCard(main, card) {
  if (!card || !card.fullNumber) { main.innerHTML = '<div style="text-align:center;padding:60px 20px;"><h2 style="color:var(--text-primary);">Card Not Found</h2></div>'; return; }
  var cardType = virtualCardTypes.find(function(t) { return t.id === card.cardType; });
  var gradient = cardType ? cardType.gradient : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
  var brand = cardType ? cardType.brand : 'VISA';
  main.innerHTML =
    '<div style="max-width:420px;margin:0 auto;padding:24px 16px;">' +
      '<div style="text-align:center;margin-bottom:24px;"><div style="width:56px;height:56px;border-radius:16px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><i class="fas fa-credit-card" style="font-size:24px;color:var(--accent);"></i></div><h1 style="font-size:20px;font-weight:700;color:var(--text-primary);">Shared Virtual Card</h1></div>' +
      '<div style="border-radius:16px;overflow:hidden;margin-bottom:20px;box-shadow:0 8px 32px rgba(0,0,0,.3);"><div style="background:' + gradient + ';padding:20px;display:flex;flex-direction:column;justify-content:space-between;height:200px;position:relative;overflow:hidden;"><div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.03);"></div><div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;"><div style="font-size:22px;font-weight:800;color:rgba(255,255,255,.95);letter-spacing:2px;">' + brand + '</div><div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:4px 10px;text-align:right;"><div style="font-size:7px;color:rgba(255,255,255,.5);text-transform:uppercase;">Balance</div><div style="font-size:15px;font-weight:800;color:rgba(255,255,255,.95);">$' + (typeof card.balance === 'number' ? card.balance.toFixed(2) : '0.00') + '</div></div></div><div style="position:relative;z-index:1;font-family:\'Courier New\',monospace;font-size:18px;letter-spacing:2px;color:rgba(255,255,255,.9);">' + card.fullNumber + '</div><div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1;"><div><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:2px;">Card Holder</div><div style="font-size:13px;font-weight:600;color:rgba(255,255,255,.9);text-transform:uppercase;">' + (card.cardHolderName || 'CARD HOLDER') + '</div></div><div style="text-align:right;"><div style="font-size:8px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:2px;">Expires</div><div style="font-size:13px;color:rgba(255,255,255,.9);">' + (card.expDate || 'N/A') + '</div></div></div></div></div>' +
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:20px;"><div style="padding:14px 16px;border-bottom:1px solid var(--border);font-size:14px;font-weight:700;color:var(--text-primary);">Card Details</div><div style="padding:4px 0;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);"><span style="font-size:12px;color:var(--text-muted);">Card Number</span><span style="font-size:13px;color:var(--text-primary);font-weight:600;font-family:\'Courier New\',monospace;">' + card.fullNumber + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);"><span style="font-size:12px;color:var(--text-muted);">CVV</span><span style="font-size:13px;color:var(--text-primary);font-weight:600;font-family:\'Courier New\',monospace;">' + (card.cvv || '***') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;"><span style="font-size:12px;color:var(--text-muted);">Expires</span><span style="font-size:13px;color:var(--text-primary);font-weight:600;">' + (card.expDate || 'N/A') + '</span></div>' +
      '</div></div>' +
      '<button onclick="navigator.clipboard.writeText(\'Card: ' + card.fullNumber + '\\nCVV: ' + (card.cvv || '') + '\\nExpiry: ' + (card.expDate || '') + '\').then(function(){showToast(\'Copied!\',\'success\')})" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-copy"></i> Copy All Details</button>' +
    '</div>';
}

// =======================================================================
// ===== ROUTER EXPORTS =====
// =======================================================================
window.renderRentPage = renderRentPage;
window.renderCardsPage = renderCardsPage;
window.renderSharedCardPage = renderSharedCardPage;
window.loadHistory = function() { return typeof loadUnifiedHistory === 'function' ? loadUnifiedHistory() : Promise.resolve(); };

console.log('page-extra.js loaded: Rent, Cards & Share pages registered');