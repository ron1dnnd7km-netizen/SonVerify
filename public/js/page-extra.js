// =======================================================================
// ===== RENT NUMBER & VIRTUAL CARD PAGES =====
// =======================================================================

function addRentProfit(basePrice) { return parseFloat((basePrice * 1.2633).toFixed(2)); }
function calcCardFee(loadAmount) { return parseFloat((loadAmount * 0.30).toFixed(2)); }

var rentAreaCodeMap = {
  'us': 'US', 'gb': 'GB', 'uk': 'GB', 'ca': 'CA'
};

function getRentAreaCode(cc) { return rentAreaCodeMap[(cc || '').toLowerCase()] || null; }


// =======================================================================
// ===== FALLBACK RENT DATA (when API is down) - ONLY 3 COUNTRIES =====
// =======================================================================
var fallbackRentData = {
  'US': { unit_price: 300, currency: 'USD', area_code: 'US' },
  'GB': { unit_price: 500, currency: 'USD', area_code: 'GB' },
  'CA': { unit_price: 300, currency: 'USD', area_code: 'CA' }
};


// =======================================================================
// ===== RENT API FUNCTIONS (uses cached country data, no extra API calls) =====
// =======================================================================
window.smsbusGetRentServices = async function(cc) {
  var ac = getRentAreaCode(cc);
  if (!ac) return null;
  
  // Use the already-fetched country list instead of making a new API call
  // The API returns all countries at once, not individually by area_code
  var cachedCountries = availableRentCountries || [];
  
  if (cachedCountries.length === 0) {
    // If not cached yet, fetch now
    try {
      cachedCountries = await window.fetchRentCountries();
    } catch (e) {
      console.warn('Failed to fetch rent countries:', e.message);
    }
  }
  
  // Filter locally by area code
  var filtered = cachedCountries.filter(function(x) { 
    return (x.area_code || '').toUpperCase() === ac.toUpperCase(); 
  });
  
  if (filtered.length > 0) {
    return filtered;
  }
  
  // Fallback data
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
    
    console.log('Rent API response status:', r.status);
    
    if (!r.ok) {
      var err = await r.json().catch(function() { return {}; });
      console.log('Rent API error:', err);
      throw new Error(err.error || err.message || err.msg || 'Failed to create rental');
    }
    
    var j = await r.json();
    console.log('Rent API response:', j);
    
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
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  }
};

window.smsbusGetRentStatus = async function(rentalId) {
  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 15000);
    
    var r = await fetch('/api/v2/rent/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rentalId: rentalId }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!r.ok) throw new Error('Failed to get SMS');
    var j = await r.json();
    return j.data || j;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out.');
    }
    throw err;
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
    if (err.name === 'AbortError') {
      throw new Error('Cancel request timed out.');
    }
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

// =======================================================================
// ===== AVAILABLE RENT COUNTRIES (fetched from API) =====
// =======================================================================
var availableRentCountries = null; 
var rentCountriesLoading = false;

window.fetchRentCountries = async function() {
  if (rentCountriesLoading || availableRentCountries) return availableRentCountries;
  
  rentCountriesLoading = true;
  
  try {
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 10000);
    
    var r = await fetch('/api/v2/rent/areas', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!r.ok) {
      console.warn('Rent countries API returned status:', r.status);
      availableRentCountries = [
        { area_code: 'CA', area_title: 'Canada', unit_price: 300, min_month: 1,  },
        { area_code: 'GB', area_title: 'United Kingdom', unit_price: 500, min_month: 1, },
        { area_code: 'US', area_title: 'United States of America', unit_price: 300, min_month: 1, }
      ];
      return availableRentCountries;
    }
    
    var j = await r.json();
    var data = j.data || j.areas || j;
    
    if (Array.isArray(data) && data.length > 0) {
      availableRentCountries = data;
      console.log('Loaded', availableRentCountries.length, 'rent countries from API');
    } else {
      availableRentCountries = [
        { area_code: 'CA', area_title: 'Canada', unit_price: 300, min_month: 1,  },
        { area_code: 'GB', area_title: 'United Kingdom', unit_price: 500, min_month: 1, },
        { area_code: 'US', area_title: 'United States of America', unit_price: 300, min_month: 1, }
      ];
    }
    
    return availableRentCountries;
    
  } catch (e) {
    console.warn('Failed to fetch rent countries, using fallback:', e.message);
    availableRentCountries = [
      { area_code: 'CA', area_title: 'Canada', unit_price: 300, min_month: 1,  },
      { area_code: 'GB', area_title: 'United Kingdom', unit_price: 500, min_month: 1, },
      { area_code: 'US', area_title: 'United States of America', unit_price: 300, min_month: 1, }
    ];
    return availableRentCountries;
  } finally {
    rentCountriesLoading = false;
  }
};

window.getRentCountryOptions = function() {
  var rentCountries = availableRentCountries || [
    { area_code: 'CA', area_title: 'Canada' },
    { area_code: 'GB', area_title: 'United Kingdom' },
    { area_code: 'US', area_title: 'United States of America' }
  ];
  
  var areaToCode = {
    'CA': 'ca', 'GB': 'gb', 'UK': 'gb', 'US': 'us', 'USA': 'us',
    'UNITED STATES OF AMERICA': 'us', 'UNITED STATES': 'us',
    'CANADA': 'ca', 'UNITED KINGDOM': 'gb'
  };
  
  var options = [];
  
  rentCountries.forEach(function(rc) {
    var areaCode = (rc.area_code || '').toUpperCase();
    var areaTitle = (rc.area_title || '').toUpperCase();
    var countryCode = areaToCode[areaCode] || areaToCode[areaTitle];
    
    if (!countryCode) {
      for (var key in areaToCode) {
        if (areaTitle.indexOf(key) !== -1) {
          countryCode = areaToCode[key];
          break;
        }
      }
    }
    
    if (countryCode) {
      var countryData = (typeof countries !== 'undefined') ? countries.find(function(c) { return c.code === countryCode; }) : null;
      if (countryData) {
        options.push({
          code: countryData.code,
          flag: countryData.flag,
          name: countryData.name,
          areaCode: areaCode,
          unitPrice: rc.unit_price || 0,
          total: rc.total || 0
        });
      }
    }
  });
  
  return options;
};


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
    { id: 'target', name: 'Target', icon: '🎯', price: 2, min: 2, max: 500 },
    { id: 'apple', name: 'Apple', icon: '🍎', price: 2, min: 2, max: 500 },
    { id: 'google', name: 'Google Play', icon: '▶️', price: 2, min: 2, max: 200 },
    { id: 'steam', name: 'Steam', icon: '🎮', price: 2, min: 2, max: 100 },
    { id: 'netflix', name: 'Netflix', icon: '🎬', price: 2, min: 2, max: 200 },
    { id: 'spotify', name: 'Spotify', icon: '🎵', price: 2, min: 2, max: 200 },
    { id: 'uber', name: 'Uber', icon: '🚗', price: 2, min: 2, max: 200 },
    { id: 'doordash', name: 'DoorDash', icon: '🍔', price: 2, min: 2, max: 200 },
    { id: 'starbucks', name: 'Starbucks', icon: '☕', price: 2, min: 2, max: 100 },
    { id: 'visa', name: 'Visa Prepaid', icon: '💳', price: 2, min: 2, max: 500 }
  ],
  gb: [
    { id: 'amazon-uk', name: 'Amazon UK', icon: '📦', price: 2, min: 2, max: 500 },
    { id: 'tesco', name: 'Tesco', icon: '🛒', price: 2, min: 2, max: 200 },
    { id: 'google-uk', name: 'Google Play UK', icon: '▶️', price: 2, min: 2, max: 200 },
    { id: 'netflix-uk', name: 'Netflix UK', icon: '🎬', price: 2, min: 2, max: 200 },
    { id: 'spotify-uk', name: 'Spotify UK', icon: '🎵', price: 2, min: 2, max: 200 },
    { id: 'uber-uk', name: 'Uber UK', icon: '🚗', price: 2, min: 2, max: 200 }
  ],
  ca: [
    { id: 'amazon-ca', name: 'Amazon Canada', icon: '📦', price: 2, min: 2, max: 500 },
    { id: 'walmart-ca', name: 'Walmart Canada', icon: '🛒', price: 2, min: 2, max: 500 },
    { id: 'uber-eats', name: 'Uber Eats', icon: '🍔', price: 2, min: 2, max: 300 },
    { id: 'starbucks-ca', name: 'Starbucks CA', icon: '☕', price: 2, min: 2, max: 200 }
  ],
  au: [
    { id: 'amazon-au', name: 'Amazon AU', icon: '📦', price: 2, min: 2, max: 500 },
    { id: 'uber-au', name: 'Uber AU', icon: '🚗', price: 2, min: 2, max: 300 }
  ],
  de: [
    { id: 'amazon-de', name: 'Amazon DE', icon: '📦', price: 2, min: 2, max: 500 }
  ],
  fr: [
    { id: 'amazon-fr', name: 'Amazon FR', icon: '📦', price: 2, min: 2, max: 500 }
  ],
  ng: [
    { id: 'amazon-ng', name: 'Amazon NG', icon: '📦', price: 1000, min: 1000, max: 100000 },
    { id: 'uber-ng', name: 'Uber NG', icon: '🚗', price: 1000, min: 1000, max: 50000 }
  ]
};

var virtualCardTypes = [
  { id: 'visa-basic', name: 'Visa Basic', brand: 'VISA', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', price: 5, icon: '💳' },
  { id: 'mastercard-standard', name: 'Mastercard Standard', brand: 'MC', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b3d 50%, #4a1942 100%)', price: 7, icon: '💳' },
  { id: 'visa-premium', name: 'Visa Premium', brand: 'VISA', gradient: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #162447 100%)', price: 12, icon: '💎', badge: 'POPULAR' }
];


// =======================================================================
// ===== CARD PERSISTENCE (localStorage + server) - IMPROVED =====
// =======================================================================
function getCardsStorageKey() {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  return 'vcard_data_' + (ue || 'guest');
}

function saveCardsToLocal(cards) {
  try {
    localStorage.setItem(getCardsStorageKey(), JSON.stringify(cards));
    console.log('Saved ' + cards.length + ' cards to localStorage');
  } catch (e) {
    console.warn('Failed to save cards to localStorage:', e.message);
  }
}

function loadCardsFromLocal() {
  try {
    var raw = localStorage.getItem(getCardsStorageKey());
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    
    var guestRaw = localStorage.getItem('vcard_data_guest');
    if (guestRaw) {
      var guestParsed = JSON.parse(guestRaw);
      if (Array.isArray(guestParsed) && guestParsed.length > 0) return guestParsed;
    }
  } catch (e) {
    console.warn('Failed to load cards from localStorage:', e.message);
  }
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
  }).then(function(r) { return r.json(); }).then(function(data) {
    console.log('Card saved to server:', data);
  }).catch(function(err) {
    console.warn('Server save failed, card in localStorage:', err.message);
  });
};

window.loadUserCards = function() {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';

  var localCards = loadCardsFromLocal();
  if (localCards && Array.isArray(localCards)) {
    userCards = localCards;
    cardsLoaded = true;
    console.log('Loaded ' + userCards.length + ' cards from localStorage');
    
    if (ue) syncCardsFromServer(ue);
    return Promise.resolve();
  }

  if (!ue) {
    userCards = [];
    cardsLoaded = true;
    return Promise.resolve();
  }

  return fetch('/api/cards/' + ue, {
    headers: { 'Accept': 'application/json' }
  })
    .then(function(r) {
      if (!r.ok) throw new Error('Server error');
      return r.json();
    })
    .then(function(data) {
      var arr = Array.isArray(data) ? data : (data && Array.isArray(data.cards) ? data.cards : []);
      if (arr.length > 0) {
        userCards = arr;
        saveCardsToLocal(userCards);
      } else {
        userCards = [];
      }
      cardsLoaded = true;
    })
    .catch(function(err) {
      console.warn('Failed to load cards from server:', err.message);
      userCards = [];
      cardsLoaded = true;
    });
};

function syncCardsFromServer(ue) {
  if (!ue) return;
  
  fetch('/api/cards/' + ue, {
    headers: { 'Accept': 'application/json' }
  })
    .then(function(r) {
      if (!r.ok) throw new Error('Server error');
      return r.json();
    })
    .then(function(data) {
      var serverCards = Array.isArray(data) ? data : (data && Array.isArray(data.cards) ? data.cards : []);
      var localCards = loadCardsFromLocal() || [];

      if (serverCards.length > localCards.length) {
        userCards = serverCards;
        saveCardsToLocal(userCards);
      } else if (serverCards.length > 0) {
        var localIds = localCards.map(function(c) { return c.id; });
        serverCards.forEach(function(sc) {
          if (localIds.indexOf(sc.id) === -1) {
            localCards.push(sc);
          }
        });
        userCards = localCards;
        saveCardsToLocal(userCards);
      }

      if (cardTabActive === 'virtual' && document.getElementById('cardsContent')) {
        renderVirtualCardsTab(document.getElementById('cardsContent'));
      }
    })
    .catch(function() { /* silent — keep local data */ });
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
  }).catch(function(err) {
    console.warn('Server delete failed, removed from localStorage:', err.message);
  });
};


// =======================================================================
// ===== CURRENCY HELPERS =====
// =======================================================================
function getCurrencySymbol(countryCode) {
  var country = giftCardCountries.find(function(c) { return c.code === countryCode; });
  return country ? country.symbol : '$';
}

function getCurrencyCode(countryCode) {
  var country = giftCardCountries.find(function(c) { return c.code === countryCode; });
  return country ? country.currency : 'USD';
}

function getCountryInfo(countryCode) {
  return giftCardCountries.find(function(c) { return c.code === countryCode; }) || { code: 'us', name: 'United States', flag: '🇺🇸', currency: 'USD', symbol: '$' };
}


// =======================================================================
// ===== RENT PRICE FETCHING (with fallback support) =====
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
      updateRentPriceDisplay();
      return;
    }
    
    currentRentArea = areas[0];
    var centsPerMonth = parseInt(currentRentArea.unit_price) || 0;
    currentRentPricePerMonth = centsPerMonth;
    currentRentDollarsPerMonth = centsPerMonth / 100;
    rentCountryAvailable = true;
    
    rentUsingFallback = !!currentRentArea._fallback;
    
    updateRentPriceDisplay();
  } catch (err) {
    console.error('Fetch rent prices error:', err);
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
    
    if (rentUsingFallback && fallbackEl) {
      fallbackEl.style.display = 'flex';
    }
    
    updateRentTotalPrice();
  }
};

window.updateRentTotalPrice = function() {
  var priceEl = document.getElementById('rentTotalPrice');
  if (!priceEl || currentRentDollarsPerMonth <= 0) {
    if (priceEl) priceEl.textContent = '--';
    return;
  }
  var totalProvider = currentRentDollarsPerMonth * selectedRentMonths;
  var totalPrice = addRentProfit(totalProvider);
  priceEl.textContent = '$' + totalPrice.toFixed(2);
};

window.onRentMonthsChange = function(months) {
  selectedRentMonths = parseInt(months) || 1;
  var label = document.getElementById('rentMonthsLabel');
  if (label) label.textContent = selectedRentMonths + ' Month' + (selectedRentMonths > 1 ? 's' : '');
  updateRentTotalPrice();
};


// =======================================================================
// ===== RENDER CARDS PAGE =====
// =======================================================================
function renderCardsPage(main) {
  cardTabActive = 'virtual';
  giftCardStep = 1;
  selectedGiftCard = null;
  selectedGiftReloadable = null;
  selectedGiftCountry = 'us';
  flippedCardId = null;
  selectedCardForPurchase = null;
  cardCreationStep = 1;
  window._giftFormEmail = '';
  window._giftFormAmount = '';

  main.innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<h1 class="page-title"><i class="far fa-credit-card" style="color:var(--accent);margin-right:10px;"></i>My Cards</h1>' +
        '<p style="font-size:14px;color:var(--text-secondary);margin-top:8px;">Manage your virtual and gift cards</p>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:4px;margin-bottom:24px;background:var(--bg-card);border-radius:12px;padding:4px;border:1px solid var(--border);">' +
      '<button id="tabVirtual" onclick="switchCardTab(\'virtual\')" style="flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:var(--accent);color:#fff;transition:all 0.2s;">' +
        '<i class="fas fa-credit-card" style="margin-right:6px;"></i>Virtual Cards' +
      '</button>' +
      '<button id="tabGift" onclick="switchCardTab(\'gift\')" style="flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-size:13px;font-weight:600;background:transparent;color:var(--text-secondary);transition:all 0.2s;">' +
        '<i class="fas fa-gift" style="margin-right:6px;"></i>Gift Cards' +
      '</button>' +
    '</div>' +
    '<div id="cardsContent"></div>';

  renderCardTabContent();
}

window.switchCardTab = function(tab) {
  cardTabActive = tab;
  giftCardStep = 1;
  selectedGiftCard = null;
  selectedGiftReloadable = null;
  flippedCardId = null;
  selectedCardForPurchase = null;
  cardCreationStep = 1;
  window._giftFormEmail = '';
  window._giftFormAmount = '';
  var tabV = document.getElementById('tabVirtual');
  var tabG = document.getElementById('tabGift');
  if (tab === 'virtual') {
    tabV.style.background = 'var(--accent)'; tabV.style.color = '#fff';
    tabG.style.background = 'transparent'; tabG.style.color = 'var(--text-secondary)';
  } else {
    tabG.style.background = 'var(--accent)'; tabG.style.color = '#fff';
    tabV.style.background = 'transparent'; tabV.style.color = 'var(--text-secondary)';
  }
  renderCardTabContent();
};

function renderCardTabContent() {
  var container = document.getElementById('cardsContent');
  if (!container) return;
  if (cardTabActive === 'virtual') renderVirtualCardsTab(container);
  else renderGiftCardsTab(container);
}


// =======================================================================
// ===== VIRTUAL CARDS TAB (WITH FREEZE/UNFREEZE) =====
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
        var typeName = cardType ? cardType.name : 'Virtual Card';
        var holderName = card.cardHolderName || 'CARD HOLDER';
        var maskedNum = card.fullNumber ? card.fullNumber.replace(/\d(?=.{4})/g, '•') : '•••• •••• •••• ••••';
        var expDate = card.expDate || '12/26';
        var balance = typeof card.balance === 'number' ? card.balance : 0;
        var isFlipped = flippedCardId === card.id;
        var fullNumber = card.fullNumber || '';
        var cvv = card.cvv || '***';
        var isFrozen = card.frozen === true;

        var frozenOverlay = isFrozen ? '<div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(2px);border-radius:14px;"><i class="fas fa-snowflake" style="font-size:36px;color:rgba(100,180,255,0.8);margin-bottom:8px;"></i><span style="font-size:14px;font-weight:700;color:rgba(100,180,255,0.9);letter-spacing:2px;text-transform:uppercase;">FROZEN</span></div>' : '';

        var freezeBtnStyle = isFrozen
          ? 'padding:7px 10px;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;font-weight:600;'
          : 'padding:7px 10px;background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;font-weight:600;';
        var freezeIcon = isFrozen ? '<i class="fas fa-sun" style="font-size:10px;"></i> Unfreeze' : '<i class="fas fa-snowflake" style="font-size:10px;"></i> Freeze';

        return '<div class="card-flip-wrapper" style="perspective:1000px;">' +
          '<div class="card-flip-inner" style="position:relative;width:100%;height:180px;transition:transform 0.6s cubic-bezier(0.4,0,0.2,1);transform-style:preserve-3d;' + (isFlipped ? 'transform:rotateY(180deg);' : '') + '">' +
            '<div class="card-flip-front" style="position:absolute;width:100%;height:100%;backface-visibility:hidden;border-radius:14px;overflow:hidden;cursor:pointer;" onclick="flipCard(\'' + card.id + '\')">' +
              '<div style="width:100%;height:100%;background:' + gradient + ';padding:16px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">' +
                '<div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.03);"></div>' +
                '<div style="position:absolute;bottom:-40px;left:-20px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.02);"></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;">' +
                  '<div style="font-size:20px;font-weight:800;color:rgba(255,255,255,0.95);letter-spacing:2px;">' + brand + '</div>' +
                  '<div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:4px 10px;text-align:right;backdrop-filter:blur(4px);">' +
                    '<div style="font-size:7px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;">Balance</div>' +
                    '<div style="font-size:14px;font-weight:800;color:rgba(255,255,255,0.95);letter-spacing:0.3px;">$' + balance.toFixed(2) + '</div>' +
                  '</div>' +
                '</div>' +
                '<div style="position:relative;z-index:1;">' +
                  '<div style="width:42px;height:32px;border-radius:5px;background:linear-gradient(135deg,#d4af37 0%,#f5e6a3 25%,#d4af37 50%,#c9a52e 75%,#f5e6a3 100%);position:relative;overflow:hidden;">' +
                    '<div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%);"></div>' +
                    '<div style="position:absolute;top:45%;left:8%;right:8%;height:1px;background:rgba(0,0,0,0.15);"></div>' +
                    '<div style="position:absolute;top:55%;left:8%;right:8%;height:1px;background:rgba(0,0,0,0.15);"></div>' +
                    '<div style="position:absolute;left:45%;top:8%;bottom:8%;width:1px;background:rgba(0,0,0,0.15);"></div>' +
                  '</div>' +
                '</div>' +
                '<div style="position:relative;z-index:1;"><div style="font-family:\'Courier New\',monospace;font-size:16px;letter-spacing:2px;color:rgba(255,255,255,0.9);font-weight:500;">' + maskedNum + '</div></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1;">' +
                  '<div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Card Holder</div><div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;">' + holderName + '</div></div>' +
                  '<div style="text-align:right;"><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Expires</div><div style="font-size:12px;font-weight:500;color:rgba(255,255,255,0.9);letter-spacing:1px;">' + expDate + '</div></div>' +
                '</div>' +
                frozenOverlay +
              '</div>' +
            '</div>' +
            '<div class="card-flip-back" style="position:absolute;width:100%;height:100%;backface-visibility:hidden;border-radius:14px;overflow:hidden;transform:rotateY(180deg);cursor:pointer;" onclick="flipCard(\'' + card.id + '\')">' +
              '<div style="width:100%;height:100%;background:' + gradient + ';padding:16px;display:flex;flex-direction:column;position:relative;overflow:hidden;">' +
                '<div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.03);"></div>' +
                '<div style="position:absolute;bottom:-40px;left:-20px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.02);"></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;margin-bottom:12px;">' +
                  '<div style="font-size:20px;font-weight:800;color:rgba(255,255,255,0.95);letter-spacing:2px;">' + brand + '</div>' +
                  '<div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;background:rgba(255,255,255,0.1);padding:3px 8px;border-radius:6px;">Details</div>' +
                '</div>' +
                '<div style="position:relative;z-index:1;flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
                  '<div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Card Number</div><div style="font-family:\'Courier New\',monospace;font-size:12px;color:rgba(255,255,255,0.9);letter-spacing:1px;">' + fullNumber + '</div></div>' +
                  '<div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">CVV</div><div style="font-family:\'Courier New\',monospace;font-size:12px;color:rgba(255,255,255,0.9);letter-spacing:2px;">' + cvv + '</div></div>' +
                  '<div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Expires</div><div style="font-size:12px;color:rgba(255,255,255,0.85);">' + expDate + '</div></div>' +
                  '<div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Type</div><div style="font-size:12px;color:rgba(255,255,255,0.85);">' + typeName + '</div></div>' +
                  (card.billingAddress ? '<div style="grid-column:1/-1;"><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Address</div><div style="font-size:11px;color:rgba(255,255,255,0.75);line-height:1.3;">' + card.billingAddress + '</div></div>' : '') +
                '</div>' +
                '<div style="position:relative;z-index:1;text-align:center;margin-top:auto;font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:0.5px;"><i class="fas fa-undo" style="margin-right:4px;"></i>Tap to flip back</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:4px;padding:6px 8px;background:var(--bg-card);border-radius:0 0 12px 12px;border:1px solid var(--border);border-top:none;">' +
          '<button onclick="event.stopPropagation();showTopUpCardModal(\'' + card.id + '\')" style="flex:1;padding:7px 6px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"><i class="fas fa-plus" style="font-size:10px;"></i> Top Up</button>' +
          '<button onclick="event.stopPropagation();copyCardInfo(\'' + card.id + '\')" style="flex:1;padding:7px 6px;background:var(--bg-primary);color:var(--text-secondary);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"><i class="fas fa-copy" style="font-size:10px;"></i> Copy</button>' +
          '<button onclick="event.stopPropagation();shareCard(\'' + card.id + '\')" style="flex:1;padding:7px 6px;background:var(--bg-primary);color:var(--text-secondary);border:1px solid var(--border);border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;"><i class="fas fa-share-alt" style="font-size:10px;"></i> Share</button>' +
          '<button onclick="event.stopPropagation();toggleFreezeCard(\'' + card.id + '\')" style="' + freezeBtnStyle + '">' + freezeIcon + '</button>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text-muted);opacity:0.6;"><i class="fas fa-hand-pointer" style="margin-right:4px;"></i>Tap card to flip & view details</div>' +
    '<div style="text-align:center;margin-top:8px;">' +
      '<button onclick="showNewCardModal()" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">' +
        '<i class="fas fa-plus"></i> Add Another Card' +
      '</button>' +
    '</div>';

    container.innerHTML = cardsHTML;
    return;
  }

  container.innerHTML =
    '<div style="text-align:center;padding:40px 20px;">' +
      '<div style="width:80px;height:80px;border-radius:20px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;border:2px dashed rgba(255,255,255,0.1);">' +
        '<i class="far fa-credit-card" style="font-size:32px;color:rgba(255,255,255,0.2);"></i>' +
      '</div>' +
      '<h3 style="font-size:18px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">No Virtual Card</h3>' +
      '<p style="font-size:13px;color:var(--text-muted);margin-bottom:24px;">Tap the button below to purchase a virtual card</p>' +
      '<button onclick="showNewCardModal()" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">' +
        '<i class="fas fa-plus"></i> New Virtual Card' +
      '</button>' +
    '</div>';
}


// =======================================================================
// ===== FREEZE / UNFREEZE CARD =====
// =======================================================================
window.toggleFreezeCard = function(cardId) {
  var card = userCards.find(function(c) { return c.id === cardId; });
  if (!card) return;
  card.frozen = !card.frozen;
  saveCardsToLocal(userCards);
  showToast(card.frozen ? 'Card frozen — no transactions allowed' : 'Card unfrozen — ready to use', card.frozen ? 'info' : 'success');
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (ue) {
    fetch('/api/cards/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ue, cardId: cardId, frozen: card.frozen })
    }).catch(function() {});
  }
  renderVirtualCardsTab(document.getElementById('cardsContent'));
};


// =======================================================================
// ===== SHARE CARD WITH LINK =====
// =======================================================================
window.shareCard = function(cardId) {
  var card = userCards.find(function(c) { return c.id === cardId; });
  if (!card) return;
  var cardType = virtualCardTypes.find(function(t) { return t.id === card.cardType; });
  var typeName = cardType ? cardType.name : 'Virtual Card';
  var brand = cardType ? cardType.brand : 'VISA';
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';

  var modal = document.createElement('div');
  modal.id = 'shareCardModal';
  modal.className = 'modal-overlay show';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  modal.innerHTML = '<div class="modal" style="width:380px;max-width:90vw;"><div class="modal-body" style="text-align:center;padding:30px 20px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent);margin-bottom:12px;"></i><p style="font-size:13px;color:var(--text-muted);">Generating share link...</p></div></div>';
  document.body.appendChild(modal);

  if (ue) {
    fetch('/api/cards/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ue, cardId: cardId })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var token = data.shareToken || data.token || data.share_id;
      if (token) { showShareLinkModal(modal, token, card, brand, typeName); }
      else { fallbackLocalShare(modal, card, brand, typeName); }
    })
    .catch(function() { fallbackLocalShare(modal, card, brand, typeName); });
  } else {
    fallbackLocalShare(modal, card, brand, typeName);
  }
};

function fallbackLocalShare(modal, card, brand, typeName) {
  var payload = JSON.stringify({ id: card.id, ct: card.cardType, ch: card.cardHolderName, fn: card.fullNumber, cv: card.cvv, ed: card.expDate, ba: card.billingAddress, bl: card.balance });
  var token = 'local_' + btoa(unescape(encodeURIComponent(payload)));
  showShareLinkModal(modal, token, card, brand, typeName);
}

function showShareLinkModal(modal, token, card, brand, typeName) {
  var baseUrl = window.location.origin + window.location.pathname;
  var shareLink = baseUrl + '#shared-card=' + token;
  window._currentShareLink = shareLink;
  window._currentShareCard = card;

  modal.innerHTML =
    '<div class="modal" style="width:380px;max-width:90vw;">' +
      '<div class="modal-header"><h2 class="modal-title"><i class="fas fa-link" style="color:var(--accent);margin-right:8px;"></i>Share Card Link</h2><button class="modal-close" onclick="document.getElementById(\'shareCardModal\').remove()"><i class="fas fa-times"></i></button></div>' +
      '<div class="modal-body">' +
        '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;margin-bottom:16px;">' +
          '<div style="width:40px;height:26px;border-radius:5px;background:' + (virtualCardTypes.find(function(t){return t.id===card.cardType}) || virtualCardTypes[0]).gradient + ';flex-shrink:0;"></div>' +
          '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--text-primary);">' + typeName + '</div><div style="font-size:11px;color:var(--text-muted);">' + brand + ' • ' + (card.fullNumber || '').slice(-4) + '</div></div>' +
        '</div>' +
        '<label style="display:block;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Share Link</label>' +
        '<div style="position:relative;margin-bottom:14px;">' +
          '<input type="text" id="shareLinkInput" value="' + shareLink.replace(/"/g, '&quot;') + '" readonly style="width:100%;padding:12px 50px 12px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:12px;outline:none;font-family:\'Courier New\',monospace;" onclick="this.select()">' +
          '<button onclick="copyShareLink()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:8px 10px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;"><i class="fas fa-copy"></i></button>' +
        '</div>' +
        '<button onclick="copyShareLink()" style="width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px;"><i class="fas fa-copy"></i> Copy Link</button>' +
        '<label style="display:block;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Share via</label>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">' +
          '<button onclick="shareLinkVia(\'whatsapp\')" style="padding:12px 8px;background:#25D366;color:#fff;border:none;border-radius:10px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>' +
          '<button onclick="shareLinkVia(\'telegram\')" style="padding:12px 8px;background:#0088cc;color:#fff;border:none;border-radius:10px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Telegram"><i class="fab fa-telegram-plane"></i></button>' +
          '<button onclick="shareLinkVia(\'twitter\')" style="padding:12px 8px;background:#1DA1F2;color:#fff;border:none;border-radius:10px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="X / Twitter"><i class="fab fa-x-twitter"></i></button>' +
          '<button onclick="shareLinkVia(\'email\')" style="padding:12px 8px;background:#EA4335;color:#fff;border:none;border-radius:10px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Email"><i class="fas fa-envelope"></i></button>' +
        '</div>' +
        '<div style="display:flex;align-items:flex-start;gap:8px;padding:12px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;margin-top:14px;"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:13px;flex-shrink:0;margin-top:2px;"></i><span style="font-size:11px;color:var(--text-secondary);line-height:1.4;">Anyone with this link can view full card details. Share responsibly.</span></div>' +
      '</div>' +
    '</div>';
}

// Legacy compatibility - old code might call loadHistory()
window.loadHistory = function() {
  return loadUnifiedHistory();
};


window.copyShareLink = function() {
  var link = window._currentShareLink || '';
  var input = document.getElementById('shareLinkInput');
  if (input) input.select();
  navigator.clipboard.writeText(link).then(function() { showToast('Link copied!', 'success'); }).catch(function() { if (input) { document.execCommand('copy'); showToast('Link copied!', 'success'); } });
};

window.shareLinkVia = function(platform) {
  var link = window._currentShareLink || '';
  var card = window._currentShareCard || {};
  var cardType = virtualCardTypes.find(function(t) { return t.id === card.cardType; });
  var typeName = cardType ? cardType.name : 'Virtual Card';
  var text = 'Check out my ' + typeName + ' card: ';
  switch (platform) {
    case 'whatsapp': window.open('https://wa.me/?text=' + encodeURIComponent(text + link), '_blank'); break;
    case 'telegram': window.open('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text), '_blank'); break;
    case 'twitter': window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(link), '_blank'); break;
    case 'email': window.open('mailto:?subject=' + encodeURIComponent(typeName + ' - Card Details') + '&body=' + encodeURIComponent(text + '\n\n' + link), '_blank'); break;
  }
  var modal = document.getElementById('shareCardModal');
  if (modal) modal.remove();
};


// =======================================================================
// ===== SHARED CARD PUBLIC VIEW =====
// =======================================================================
function renderSharedCardPage(main, token) {
  main.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:60vh;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent);"></i></div>';
  if (token.indexOf('local_') === 0) {
    try {
      var payload = decodeURIComponent(escape(atob(token.replace('local_', ''))));
      displaySharedCard(main, JSON.parse(payload));
    } catch (e) {
      main.innerHTML = '<div style="text-align:center;padding:60px 20px;"><i class="fas fa-link-slash" style="font-size:48px;color:var(--text-muted);opacity:0.3;margin-bottom:16px;display:block;"></i><h2 style="font-size:18px;color:var(--text-primary);margin-bottom:8px;">Invalid Link</h2><p style="font-size:13px;color:var(--text-muted);">This share link is corrupted or expired.</p></div>';
    }
  } else {
    fetch('/api/cards/shared/' + token).then(function(r) { return r.json(); }).then(function(data) { displaySharedCard(main, data.card || data); }).catch(function() {
      main.innerHTML = '<div style="text-align:center;padding:60px 20px;"><i class="fas fa-link-slash" style="font-size:48px;color:var(--text-muted);opacity:0.3;margin-bottom:16px;display:block;"></i><h2 style="font-size:18px;color:var(--text-primary);margin-bottom:8px;">Link Expired</h2><p style="font-size:13px;color:var(--text-muted);">This share link has expired or is invalid.</p></div>';
    });
  }
}

function displaySharedCard(main, card) {
  if (!card || !card.fullNumber) {
    main.innerHTML = '<div style="text-align:center;padding:60px 20px;"><i class="fas fa-link-slash" style="font-size:48px;color:var(--text-muted);opacity:0.3;margin-bottom:16px;display:block;"></i><h2 style="font-size:18px;color:var(--text-primary);">Card Not Found</h2></div>';
    return;
  }
  var cardType = virtualCardTypes.find(function(t) { return t.id === card.cardType; });
  var gradient = cardType ? cardType.gradient : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
  var brand = cardType ? cardType.brand : 'VISA';
  var typeName = cardType ? cardType.name : 'Virtual Card';
  var holderName = card.cardHolderName || 'CARD HOLDER';
  var fullNumber = card.fullNumber || '';
  var cvv = card.cvv || '***';
  var expDate = card.expDate || 'N/A';
  var balance = typeof card.balance === 'number' ? card.balance : 0;

  main.innerHTML =
    '<div style="max-width:420px;margin:0 auto;padding:24px 16px;">' +
      '<div style="text-align:center;margin-bottom:24px;"><div style="width:56px;height:56px;border-radius:16px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><i class="fas fa-credit-card" style="font-size:24px;color:var(--accent);"></i></div><h1 style="font-size:20px;font-weight:700;color:var(--text-primary);margin:0 0 4px;">Shared Virtual Card</h1><p style="font-size:13px;color:var(--text-muted);margin:0;">' + typeName + ' • ' + brand + '</p></div>' +
      '<div style="border-radius:16px;overflow:hidden;margin-bottom:20px;box-shadow:0 8px 32px rgba(0,0,0,0.3);"><div style="background:' + gradient + ';padding:20px;display:flex;flex-direction:column;justify-content:space-between;height:200px;position:relative;overflow:hidden;">' +
        '<div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.03);"></div><div style="position:absolute;bottom:-40px;left:-20px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.02);"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;"><div style="font-size:22px;font-weight:800;color:rgba(255,255,255,0.95);letter-spacing:2px;">' + brand + '</div><div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:4px 10px;text-align:right;"><div style="font-size:7px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;">Balance</div><div style="font-size:15px;font-weight:800;color:rgba(255,255,255,0.95);">$' + balance.toFixed(2) + '</div></div></div>' +
        '<div style="position:relative;z-index:1;"><div style="width:46px;height:34px;border-radius:5px;background:linear-gradient(135deg,#d4af37 0%,#f5e6a3 25%,#d4af37 50%,#c9a52e 75%,#f5e6a3 100%);position:relative;overflow:hidden;"><div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.3) 50%,transparent 60%);"></div></div></div>' +
        '<div style="position:relative;z-index:1;"><div style="font-family:\'Courier New\',monospace;font-size:18px;letter-spacing:2px;color:rgba(255,255,255,0.9);font-weight:500;">' + fullNumber + '</div></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1;"><div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Card Holder</div><div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;">' + holderName + '</div></div><div style="text-align:right;"><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Expires</div><div style="font-size:13px;font-weight:500;color:rgba(255,255,255,0.9);letter-spacing:1px;">' + expDate + '</div></div></div>' +
      '</div></div>' +
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:20px;"><div style="padding:14px 16px;border-bottom:1px solid var(--border);"><div style="font-size:14px;font-weight:700;color:var(--text-primary);">Card Details</div></div><div style="padding:4px 0;">' +
        buildDetailRow('Card Number', fullNumber) + buildDetailRow('CVV', cvv) + buildDetailRow('Expires', expDate) + buildDetailRow('Card Type', typeName) + buildDetailRow('Billing Address', card.billingAddress || 'N/A') +
      '</div></div>' +
      '<button onclick="copySharedCardDetails()" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px;"><i class="fas fa-copy"></i> Copy All Details</button>' +
      '<div style="display:flex;align-items:flex-start;gap:8px;padding:12px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;"><i class="fas fa-shield-alt" style="color:#f59e0b;font-size:14px;flex-shrink:0;margin-top:2px;"></i><span style="font-size:12px;color:var(--text-secondary);line-height:1.4;">This card was shared with you via a private link. Keep these details safe.</span></div>' +
    '</div>';
}

function buildDetailRow(label, value) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);"><span style="font-size:12px;color:var(--text-muted);font-weight:500;">' + label + '</span><span style="font-size:13px;color:var(--text-primary);font-weight:600;font-family:\'Courier New\',monospace;letter-spacing:0.5px;text-align:right;max-width:60%;word-break:break-all;">' + value + '</span></div>';
}

window.copySharedCardDetails = function() {
  var text = '';
  document.querySelectorAll('#appContent div').forEach(function(el) {
    var s = el.getAttribute('style') || '';
    if (s.indexOf('justify-content:space-between') !== -1 && s.indexOf('padding:12px') !== -1) {
      var spans = el.querySelectorAll('span');
      if (spans.length === 2) text += spans[0].textContent + ': ' + spans[1].textContent + '\n';
    }
  });
  if (!text.trim()) text = 'Unable to extract. Please copy manually.';
  navigator.clipboard.writeText(text.trim()).then(function() { showToast('Copied!', 'success'); }).catch(function() { showToast('Failed', 'error'); });
};


// =======================================================================
// ===== FLIP / COPY =====
// =======================================================================
window.flipCard = function(cardId) {
  flippedCardId = flippedCardId === cardId ? null : cardId;
  renderVirtualCardsTab(document.getElementById('cardsContent'));
};

window.copyCardInfo = function(cardId) {
  var card = userCards.find(function(c) { return c.id === cardId; });
  if (!card) return;
  var cardType = virtualCardTypes.find(function(t) { return t.id === card.cardType; });
  var text = 'Card: ' + (cardType ? cardType.name : '') + '\nNumber: ' + (card.fullNumber || '') + '\nExpiry: ' + (card.expDate || '') + '\nCVV: ' + (card.cvv || '') + '\nHolder: ' + (card.cardHolderName || '') + '\nAddress: ' + (card.billingAddress || '') + '\nBalance: $' + (typeof card.balance === 'number' ? card.balance.toFixed(2) : '0.00');
  navigator.clipboard.writeText(text).then(function() { showToast('Copied', 'success'); }).catch(function() { showToast('Failed', 'error'); });
};

window.showTopUpCardModal = function(cardId) { showToast('Top up coming soon', 'info'); };


// =======================================================================
// ===== STEP 1: LOAD AMOUNT PAGE =====
// =======================================================================
function renderLoadAmountStep(container) {
  var cardType = virtualCardTypes.find(function(t) { return t.id === selectedCardForPurchase; });
  var cardName = cardType ? cardType.name : 'Virtual Card';
  var cardBrand = cardType ? cardType.brand : 'VISA';
  var cardGradient = cardType ? cardType.gradient : 'linear-gradient(135deg, #1a1a2e, #16213e)';
  var savedAmount = window._vcFormAmount || '';
  var displayAmount = parseFloat(savedAmount) || 0;
  var cardFee = calcCardFee(displayAmount);
  var totalCost = displayAmount + cardFee;
  var inputStyle = 'width:100%;padding:12px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;';
  var inputOnFocus = 'this.style.borderColor=\'var(--accent)\';this.style.boxShadow=\'0 0 0 3px var(--accent-dim)\'';
  var inputOnBlur = 'this.style.borderColor=\'var(--border)\';this.style.boxShadow=\'none\'';
  var canContinue = displayAmount >= 5;

  container.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;"><button onclick="cancelCardCreation()" style="width:34px;height:34px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;flex-shrink:0;"><i class="fas fa-arrow-left"></i></button><div><h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;">Load Amount</h3><p style="font-size:12px;color:var(--text-muted);margin:0;">Choose how much to load on your card</p></div></div>' +
    '<div style="display:flex;align-items:center;gap:0;margin-bottom:24px;">' +
      '<div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;">1</div><span style="font-size:12px;font-weight:600;color:var(--accent);margin-left:8px;">Amount</span>' +
      '<div style="width:40px;height:2px;background:var(--border);margin:0 8px;"></div>' +
      '<div style="width:28px;height:28px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text-muted);">2</div><span style="font-size:12px;font-weight:500;color:var(--text-muted);margin-left:8px;">Card Info</span>' +
    '</div>' +
    '<div style="margin-bottom:10px;"><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;"><i class="fas fa-dollar-sign" style="margin-right:4px;color:var(--accent);"></i>How much to load? <span style="color:var(--danger);">*</span></label><div style="position:relative;"><span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:14px;font-weight:600;color:var(--text-muted);">$</span><input type="number" id="vcLoadAmount" min="5" step="1" placeholder="5" value="' + savedAmount + '" style="' + inputStyle + 'padding-left:30px;" onfocus="' + inputOnFocus + '" onblur="' + inputOnBlur + '" oninput="onVCAmountInput(this.value)"></div><div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Minimum load is <strong style="color:var(--accent);">$5.00</strong></div></div>' +
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:20px;">' +
      [5, 10, 20, 50, 100, 200, 500, 1000].map(function(v) {
        var sel = displayAmount === v;
        return '<button onclick="setVCAmount(' + v + ')" style="padding:10px 4px;background:' + (sel ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';border:1px solid ' + (sel ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;color:' + (sel ? 'var(--accent)' : 'var(--text-secondary)') + ';font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;">$' + v + '</button>';
      }).join('') +
    '</div>' +
    '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:24px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:13px;color:var(--text-muted);">Load Amount</span><span id="vcSummaryAmount" style="font-size:13px;font-weight:600;color:var(--text-primary);">$' + displayAmount.toFixed(2) + '</span></div>' +
      '<div style="height:1px;background:var(--border);margin:10px 0;"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:14px;font-weight:700;color:var(--text-primary);">Total</span><span id="vcSummaryTotal" style="font-size:16px;font-weight:800;color:var(--accent);">$' + totalCost.toFixed(2) + '</span></div>' +
    '</div>' +
    '<button id="vcContinueBtn" onclick="goToCardHolderStep()" ' + (canContinue ? '' : 'disabled ') + 'style="width:100%;padding:14px;background:' + (canContinue ? 'var(--accent)' : 'var(--bg-card)') + ';color:' + (canContinue ? '#fff' : 'var(--text-muted)') + ';border:' + (canContinue ? 'none' : '1px solid var(--border)') + ';border-radius:12px;font-size:14px;font-weight:600;cursor:' + (canContinue ? 'pointer' : 'not-allowed') + ';display:flex;align-items:center;justify-content:center;gap:8px;"><span>Continue</span><i class="fas fa-arrow-right"></i></button>';
}

window.goToCardHolderStep = function() {
  var amt = parseFloat(window._vcFormAmount) || 0;
  if (amt < 5) { showToast('Enter at least $5', 'error'); return; }
  cardCreationStep = 2;
  renderVirtualCardsTab(document.getElementById('cardsContent'));
};


// =======================================================================
// ===== STEP 2: CARD HOLDER INFORMATION PAGE =====
// =======================================================================
function renderCardHolderStep(container) {
  var cardType = virtualCardTypes.find(function(t) { return t.id === selectedCardForPurchase; });
  var cardName = cardType ? cardType.name : 'Virtual Card';
  var cardBrand = cardType ? cardType.brand : 'VISA';
  var cardGradient = cardType ? cardType.gradient : 'linear-gradient(135deg, #1a1a2e, #16213e)';
  var savedName = window._vcFormName || '';
  var savedAddr = window._vcFormAddress || '';
  var displayAmount = parseFloat(window._vcFormAmount) || 0;
  var cardFee = calcCardFee(displayAmount);
  var totalCost = displayAmount + cardFee;
  var previewName = savedName.trim() ? savedName.trim().toUpperCase() : 'YOUR NAME';
  var inputStyle = 'width:100%;padding:12px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;';
  var inputOnFocus = 'this.style.borderColor=\'var(--accent)\';this.style.boxShadow=\'0 0 0 3px var(--accent-dim)\'';
  var inputOnBlur = 'this.style.borderColor=\'var(--border)\';this.style.boxShadow=\'none\'';
  var labelStyle = 'display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;';
  var canProceed = savedName.trim().length >= 2 && savedAddr.trim().length >= 5;

  container.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;"><button onclick="goBackToAmountStep()" style="width:34px;height:34px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:13px;flex-shrink:0;"><i class="fas fa-arrow-left"></i></button><div><h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;">Card Holder Information</h3><p style="font-size:12px;color:var(--text-muted);margin:0;">This info will appear on your card</p></div></div>' +
    '<div style="display:flex;align-items:center;gap:0;margin-bottom:24px;">' +
      '<div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;"><i class="fas fa-check" style="font-size:10px;color:#fff;"></i></div><span style="font-size:12px;font-weight:600;color:var(--accent);margin-left:8px;">Amount</span>' +
      '<div style="width:40px;height:2px;background:var(--accent);margin:0 8px;"></div>' +
      '<div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;">2</div><span style="font-size:12px;font-weight:600;color:var(--accent);margin-left:8px;">Card Info</span>' +
    '</div>' +
    '<div style="border-radius:14px;overflow:hidden;margin-bottom:20px;box-shadow:0 4px 16px rgba(0,0,0,0.2);"><div style="background:' + cardGradient + ';padding:16px;display:flex;flex-direction:column;justify-content:space-between;height:140px;position:relative;overflow:hidden;">' +
      '<div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.03);"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1;"><div style="font-size:20px;font-weight:800;color:rgba(255,255,255,0.95);letter-spacing:2px;">' + cardBrand + '</div><div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:4px 10px;text-align:right;"><div style="font-size:7px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;">Balance</div><div style="font-size:14px;font-weight:800;color:rgba(255,255,255,0.95);">$' + displayAmount.toFixed(2) + '</div></div></div>' +
      '<div style="position:relative;z-index:1;"><div style="font-family:\'Courier New\',monospace;font-size:15px;letter-spacing:2px;color:rgba(255,255,255,0.9);font-weight:500;">•••• •••• •••• ••••</div></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;z-index:1;"><div><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Card Holder</div><div id="vcPreviewName" style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;">' + previewName + '</div></div><div style="text-align:right;"><div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Expires</div><div style="font-size:12px;font-weight:500;color:rgba(255,255,255,0.9);letter-spacing:1px;">12/27</div></div></div>' +
    '</div></div>' +
    '<div style="margin-bottom:14px;"><label style="' + labelStyle + '"><i class="fas fa-user" style="margin-right:4px;color:var(--accent);"></i>Full Name <span style="color:var(--danger);">*</span></label><input type="text" id="vcCardName" placeholder="e.g. John Doe" value="' + savedName.replace(/"/g, '&quot;') + '" maxlength="26" style="' + inputStyle + 'text-transform:uppercase;letter-spacing:0.5px;" onfocus="' + inputOnFocus + '" onblur="' + inputOnBlur + '" oninput="onVCNameInput(this.value)"><div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Printed on card (max 26 characters)</div></div>' +
    '<div style="margin-bottom:24px;"><label style="' + labelStyle + '"><i class="fas fa-map-marker-alt" style="margin-right:4px;color:var(--accent);"></i>Billing Address <span style="color:var(--danger);">*</span></label><textarea id="vcCardAddress" placeholder="Street address, City, State, ZIP Code" rows="3" style="' + inputStyle + 'resize:vertical;min-height:72px;font-family:inherit;" onfocus="' + inputOnFocus + '" onblur="' + inputOnBlur + '" oninput="window._vcFormAddress=this.value;updateVCProceedBtn()">' + savedAddr + '</textarea></div>' +
    '<div style="display:flex;gap:10px;"><button onclick="goBackToAmountStep()" style="flex:1;padding:14px;background:var(--bg-card);color:var(--text-secondary);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">Back</button>' +
    (canProceed ? '<button id="vcCreateBtn" onclick="createVirtualCard()" style="flex:2;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-credit-card"></i> Create Card — $' + totalCost.toFixed(2) + '</button>' : '<button id="vcCreateBtn" disabled style="flex:2;padding:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;">Fill in all fields</button>') +
    '</div>';
}

window.goBackToAmountStep = function() {
  cardCreationStep = 1;
  renderVirtualCardsTab(document.getElementById('cardsContent'));
};


// =======================================================================
// ===== AMOUNT HELPERS =====
// =======================================================================
window.setVCAmount = function(amount) {
  window._vcFormAmount = String(amount);
  var input = document.getElementById('vcLoadAmount');
  if (input) input.value = amount;
  updateVCAmountDisplay();
};

window.onVCAmountInput = function(val) {
  var num = parseFloat(val) || 0;
  if (num > 0 && num < 5) {
    var input = document.getElementById('vcLoadAmount');
    if (input) input.value = 5;
    num = 5;
  }
  window._vcFormAmount = String(num);
  updateVCAmountDisplay();
};

window.updateVCAmountDisplay = function() {
  var amount = parseFloat(window._vcFormAmount) || 0;
  if (amount < 5) amount = 0;
  var fee = calcCardFee(amount);
  var total = amount + fee;

  var sa = document.getElementById('vcSummaryAmount');
  if (sa) sa.textContent = '$' + amount.toFixed(2);
  var st = document.getElementById('vcSummaryTotal');
  if (st) st.textContent = '$' + total.toFixed(2);

  var btn = document.getElementById('vcContinueBtn');
  if (btn) {
    if (amount >= 5) {
      btn.disabled = false;
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
    } else {
      btn.disabled = true;
      btn.style.background = 'var(--bg-card)';
      btn.style.color = 'var(--text-muted)';
      btn.style.border = '1px solid var(--border)';
      btn.style.cursor = 'not-allowed';
    }
  }
};

window.onVCNameInput = function(val) {
  window._vcFormName = val;
  var p = document.getElementById('vcPreviewName');
  if (p) p.textContent = val.trim() ? val.trim().toUpperCase() : 'YOUR NAME';
  updateVCProceedBtn();
};

window.updateVCProceedBtn = function() {
  var btn = document.getElementById('vcCreateBtn');
  if (!btn) return;
  var da = parseFloat(window._vcFormAmount) || 0;
  var fee = calcCardFee(da);
  var total = da + fee;
  var nameOk = (window._vcFormName || '').trim().length >= 2;
  var addrOk = (window._vcFormAddress || '').trim().length >= 5;

  if (nameOk && addrOk) {
    btn.disabled = false;
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.setAttribute('onclick', 'createVirtualCard()');
    btn.innerHTML = '<i class="fas fa-credit-card"></i> Create Card — $' + total.toFixed(2);
  } else {
    btn.disabled = true;
    btn.style.background = 'var(--bg-card)';
    btn.style.color = 'var(--text-muted)';
    btn.style.border = '1px solid var(--border)';
    btn.style.cursor = 'not-allowed';
    btn.removeAttribute('onclick');
    btn.innerHTML = 'Fill in all fields';
  }
};

window.cancelCardCreation = function() {
  selectedCardForPurchase = null;
  cardCreationStep = 1;
  window._vcFormName = '';
  window._vcFormAddress = '';
  window._vcFormAmount = '';
  renderVirtualCardsTab(document.getElementById('cardsContent'));
};

window.showNewCardModal = function() {
  var modal = document.createElement('div');
  modal.id = 'newCardModal';
  modal.className = 'modal-overlay show';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  modal.innerHTML = '<div class="modal" style="width:360px;max-width:90vw;"><div class="modal-header"><h2 class="modal-title">Select Card Type</h2><button class="modal-close" onclick="document.getElementById(\'newCardModal\').remove()"><i class="fas fa-times"></i></button></div><div class="modal-body" style="display:flex;flex-direction:column;gap:10px;">' +
    virtualCardTypes.map(function(t) {
      return '<div onclick="selectCardType(\'' + t.id + '\')" style="position:relative;padding:16px;background:var(--bg-primary);border:2px solid var(--border);border-radius:14px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
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

window.createVirtualCard = function() {
  var n = document.getElementById('vcCardName');
  var a = document.getElementById('vcCardAddress');
  var cn = n ? n.value.trim() : (window._vcFormName || '').trim();
  var ca = a ? a.value.trim() : (window._vcFormAddress || '').trim();
  var loadAmt = parseFloat(window._vcFormAmount) || 0;

  if (cn.length < 2) { showToast('Enter a valid name', 'error'); if (n) n.focus(); return; }
  if (ca.length < 5) { showToast('Enter a valid address', 'error'); if (a) a.focus(); return; }
  if (!loadAmt || loadAmt < 5) { showToast('Minimum load amount is $5', 'error'); return; }

  var ct = virtualCardTypes.find(function(t) { return t.id === selectedCardForPurchase; });
  if (!ct) return;

  var cardFee = calcCardFee(loadAmt);
  var totalCost = loadAmt + cardFee;

  var btn = document.getElementById('vcCreateBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...'; btn.disabled = true; }

  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (ue) {
    fetch('/api/user/' + ue).then(function(r) { return r.json(); }).then(function(ud) {
      var sb = parseFloat(ud.balance) || 0;
      if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(sb);
      if (sb < totalCost) {
        showInsufficientBalanceWarning(totalCost, sb);
        if (btn) { btn.innerHTML = '<i class="fas fa-credit-card"></i> Create Card — $' + totalCost.toFixed(2); btn.disabled = false; }
        return;
      }
      doCreateVirtualCard(cn, ca, loadAmt, cardFee, ct, btn);
    }).catch(function() { doCreateVirtualCard(cn, ca, loadAmt, cardFee, ct, btn); });
  } else {
    doCreateVirtualCard(cn, ca, loadAmt, cardFee, ct, btn);
  }
};

function doCreateVirtualCard(cn, ca, loadAmt, cardFee, ct, btn) {
  setTimeout(function() {
    var fn = '';
    for (var i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) fn += ' ';
      fn += String(Math.floor(Math.random() * 10));
    }
    var cv = String(Math.floor(100 + Math.random() * 900));
    var now = new Date();
    var em = String(now.getMonth() + 1).padStart(2, '0');
    var ey = String(now.getFullYear() + 3).slice(-2);

    var nc = {
      id: 'card-' + Date.now(),
      cardType: ct.id,
      cardHolderName: cn.toUpperCase(),
      billingAddress: ca,
      fullNumber: fn,
      cvv: cv,
      expDate: em + '/' + ey,
      balance: loadAmt,
      frozen: false,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    saveCardToServer(nc);
    showToast(ct.name + ' created! Loaded $' + loadAmt.toFixed(2), 'success');

    selectedCardForPurchase = null;
    cardCreationStep = 1;
    window._vcFormName = '';
    window._vcFormAddress = '';
    window._vcFormAmount = '';

    renderVirtualCardsTab(document.getElementById('cardsContent'));
  }, 1500);
}


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
    contentHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;">' +
      giftCardCountries.map(function(c) {
        var s = selectedGiftCountry === c.code;
        return '<div onclick="selectGiftCountry(\'' + c.code + '\')" style="padding:12px 8px;background:' + (s ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';border:2px solid ' + (s ? 'var(--accent)' : 'var(--border)') + ';border-radius:12px;text-align:center;cursor:pointer;transition:all 0.2s;"><div style="font-size:28px;margin-bottom:4px;">' + c.flag + '</div><div style="font-size:11px;font-weight:600;color:' + (s ? 'var(--accent)' : 'var(--text-secondary)') + ';">' + c.name + '</div><div style="font-size:10px;color:var(--text-muted);">' + c.currency + ' (' + c.symbol + ')</div></div>';
      }).join('') + '</div>';
  } else if (giftCardStep === 2) {
    var cards = giftCardTypes[selectedGiftCountry] || [];
    var ci = getCountryInfo(selectedGiftCountry);
    contentHTML = '<div style="margin-bottom:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><span style="font-size:20px;">' + ci.flag + '</span><span style="font-size:13px;color:var(--text-muted);">Select gift card type</span></div><div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow-y:auto;padding-right:4px;">' +
      cards.map(function(c) {
        var s = selectedGiftCard && selectedGiftCard.id === c.id;
        return '<div onclick="selectGiftCardType(\'' + c.id + '\')" style="display:flex;align-items:center;gap:12px;padding:14px;background:' + (s ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';border:2px solid ' + (s ? 'var(--accent)' : 'var(--border)') + ';border-radius:12px;cursor:pointer;transition:all 0.2s;"><div style="width:40px;height:40px;border-radius:10px;background:var(--bg-card);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">' + c.icon + '</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + c.name + '</div><div style="font-size:11px;color:var(--text-muted);">' + ci.currency + ' ' + ci.symbol + c.min + ' – ' + ci.symbol + c.max + '</div></div>' + (s ? '<i class="fas fa-check-circle" style="color:var(--accent);font-size:16px;"></i>' : '') + '</div>';
      }).join('') + '</div></div>';
  } else if (giftCardStep === 3) {
    var selCard = selectedGiftCard;
    var ci = getCountryInfo(selectedGiftCountry);
    var cName = selCard ? selCard.name : '', cIcon = selCard ? selCard.icon : '💳', cMin = selCard ? selCard.min : 0, cMax = selCard ? selCard.max : 0;
    var sEmail = String(window._giftFormEmail || ''), sAmount = String(window._giftFormAmount || cMin);
    var iStyle = 'width:100%;padding:12px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;';
    var iF = 'this.style.borderColor=\'var(--accent)\';this.style.boxShadow=\'0 0 0 3px var(--accent-dim)\'', iB = 'this.style.borderColor=\'var(--border)\';this.style.boxShadow=\'none\'';
    var lS = 'display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;';
    contentHTML =
      '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:20px;"><div style="display:flex;align-items:center;gap:12px;"><div style="width:48px;height:48px;border-radius:12px;background:var(--bg-card);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">' + cIcon + '</div><div style="flex:1;"><div style="font-size:15px;font-weight:700;color:var(--text-primary);">' + cName + '</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px;">' + ci.flag + ' • ' + ci.currency + ' ' + ci.symbol + cMin + ' – ' + ci.symbol + cMax + '</div></div></div></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;"><div style="width:32px;height:32px;border-radius:8px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-envelope" style="font-size:13px;color:var(--accent);"></i></div><span style="font-size:14px;font-weight:600;color:var(--text-primary);">Recipient Details</span></div>' +
      '<div style="margin-bottom:14px;"><label style="' + lS + '"><i class="fas fa-envelope" style="margin-right:4px;color:var(--accent);"></i>Recipient Email <span style="color:var(--danger);">*</span></label><input type="email" id="giftRecipientEmail" placeholder="recipient@email.com" value="' + sEmail.replace(/"/g, '&quot;') + '" style="' + iStyle + '" onfocus="' + iF + '" onblur="' + iB + '" oninput="window._giftFormEmail=this.value;updateGiftProceedBtn()"></div>' +
      '<div style="margin-bottom:16px;"><label style="' + lS + '"><span style="margin-right:4px;color:var(--accent);font-weight:700;">' + ci.symbol + '</span>Card Amount (' + ci.currency + ') <span style="color:var(--danger);">*</span></label><div style="position:relative;"><span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:14px;font-weight:600;color:var(--text-muted);">' + ci.symbol + '</span><input type="number" id="giftCardAmount" min="' + cMin + '" max="' + cMax + '" step="1" placeholder="' + cMin + '" value="' + sAmount + '" style="' + iStyle + 'padding-left:30px;" onfocus="' + iF + '" onblur="' + iB + '" oninput="window._giftFormAmount=this.value;updateGiftProceedBtn()"></div><div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Minimum: ' + ci.symbol + cMin + ' • Maximum: ' + ci.symbol + cMax + '</div></div>' +
      '<div style="display:flex;align-items:flex-start;gap:10px;padding:14px;background:rgba(13,155,122,0.06);border:1px solid rgba(13,155,122,0.15);border-radius:10px;margin-bottom:4px;"><i class="fas fa-info-circle" style="color:var(--accent);font-size:14px;flex-shrink:0;margin-top:2px;"></i><span style="font-size:12px;color:var(--text-secondary);line-height:1.5;">The gift card code will be sent to this email address.</span></div>';
  }

  var btnHTML = '';
  if (giftCardStep < 3) {
    btnHTML = '<button disabled style="width:100%;padding:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;">Select to continue</button>';
  } else {
    var eOk = String(window._giftFormEmail || '').trim().length > 0, aOk = String(window._giftFormAmount || '').trim().length > 0;
    btnHTML = (eOk && aOk)
      ? '<button id="giftProceedBtn" onclick="purchaseGiftCard()" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-paper-plane"></i> Send Gift Card</button>'
      : '<button id="giftProceedBtn" disabled style="width:100%;padding:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;">Fill in recipient email & amount</button>';
  }
  container.innerHTML = stepsHTML + '<div style="transition:opacity 0.3s;">' + contentHTML + '</div><div style="margin-top:20px;" id="giftBtnWrap">' + btnHTML + '</div>';
}

window.updateGiftProceedBtn = function() {
  if (giftCardStep !== 3) return;
  var w = document.getElementById('giftBtnWrap');
  if (!w) return;
  var eOk = String(window._giftFormEmail || '').trim().length > 0, aOk = String(window._giftFormAmount || '').trim().length > 0;
  w.innerHTML = (eOk && aOk)
    ? '<button id="giftProceedBtn" onclick="purchaseGiftCard()" style="width:100%;padding:14px;background:var(--accent);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-paper-plane"></i> Send Gift Card</button>'
    : '<button id="giftProceedBtn" disabled style="width:100%;padding:14px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:14px;font-weight:600;cursor:not-allowed;">Fill in recipient email & amount</button>';
};

window.selectGiftCountry = function(code) {
  selectedGiftCountry = code;
  giftCardStep = 2;
  selectedGiftCard = null;
  window._giftFormEmail = '';
  window._giftFormAmount = '';
  renderGiftCardsTab(document.getElementById('cardsContent'));
};

window.selectGiftCardType = function(id) {
  selectedGiftCard = giftCardTypes[selectedGiftCountry].find(function(c) { return c.id === id; });
  giftCardStep = 3;
  selectedGiftReloadable = null;
  window._giftFormEmail = '';
  window._giftFormAmount = selectedGiftCard ? String(selectedGiftCard.min) : '';
  renderGiftCardsTab(document.getElementById('cardsContent'));
};

window.selectGiftReload = function(id) { selectedGiftReloadable = id; renderGiftCardsTab(document.getElementById('cardsContent')); };
window.proceedGiftStep = function() { if (giftCardStep === 1 && selectedGiftCountry) giftCardStep = 2; else if (giftCardStep === 2 && selectedGiftCard) giftCardStep = 3; renderGiftCardsTab(document.getElementById('cardsContent')); };
window.purchaseCard = function(cardTypeId) {};

window.purchaseGiftCard = function() {
  if (!selectedGiftCard) { showToast('Complete all steps', 'error'); return; }
  var eEl = document.getElementById('giftRecipientEmail'), aEl = document.getElementById('giftCardAmount');
  var rEmail = eEl ? eEl.value.trim() : String(window._giftFormEmail || '').trim();
  var cAmt = aEl ? parseFloat(aEl.value) : parseFloat(window._giftFormAmount || 0);
  if (!rEmail) { showToast('Enter email', 'error'); if (eEl) eEl.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail)) { showToast('Invalid email', 'error'); if (eEl) eEl.focus(); return; }
  if (!cAmt || isNaN(cAmt) || cAmt <= 0) { showToast('Enter amount', 'error'); if (aEl) aEl.focus(); return; }
  var ci = getCountryInfo(selectedGiftCountry);
  if (cAmt < selectedGiftCard.min) { showToast('Minimum is ' + ci.symbol + selectedGiftCard.min, 'error'); if (aEl) aEl.focus(); return; }
  if (cAmt > selectedGiftCard.max) { showToast('Maximum is ' + ci.symbol + selectedGiftCard.max, 'error'); if (aEl) aEl.focus(); return; }

  var btn = document.getElementById('giftProceedBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; btn.disabled = true; }
  showToast('Processing ' + selectedGiftCard.name + ' (' + ci.symbol + cAmt + ' ' + ci.currency + ')...', 'info');

  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (ue) {
    fetch('/api/user/' + ue).then(function(r) { return r.json(); }).then(function(ud) {
      var sb = parseFloat(ud.balance) || 0;
      if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(sb);
      if (sb < cAmt) { showInsufficientBalanceWarning(cAmt, sb); if (btn) { btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Gift Card'; btn.disabled = false; } return; }
      doGiftCardPurchase(cAmt, ci, rEmail, btn);
    }).catch(function() { doGiftCardPurchase(cAmt, ci, rEmail, btn); });
  } else { doGiftCardPurchase(cAmt, ci, rEmail, btn); }
};

function doGiftCardPurchase(cAmt, ci, rEmail, btn) {
  var cName = selectedGiftCard ? selectedGiftCard.name : 'Gift Card';
  setTimeout(function() {
    showToast('Gift card sent! ' + cName + ' (' + ci.symbol + cAmt + ' ' + ci.currency + ') → ' + rEmail, 'success');
    selectedGiftCard = null;
    selectedGiftReloadable = null;
    selectedGiftCountry = 'us';
    giftCardStep = 1;
    window._giftFormEmail = '';
    window._giftFormAmount = '';
    renderGiftCardsTab(document.getElementById('cardsContent'));
  }, 1500);
}

window.switchActiveCard = function() {};
window.toggleCardNumberVisibility = function() {};
window.copyCardNumber = function() {};
window.showCardDetails = function() {};
window.selectTopUpAmount = function() {};
window.updateTopUpBtn = function() {};
window.executeTopUpCard = function() {};
function loadCardTransactions() {}


// =======================================================================
// ===== RENDER RENT PAGE (FIXED: ONLY 3 COUNTRIES) =====
// =======================================================================
function renderRentPage(main) {
  selectedRentMonths = 1;
  rentCountryAvailable = null;
  rentUsingFallback = false;
  
  var rentCountryOptions = window.getRentCountryOptions();
  
  var activeRentalsHTML = '';
  if (activeRentals.length > 0) {
    activeRentalsHTML = activeRentals.map(function(rental) {
      var cf = rental.countryFlag || '🌍';
      var pd = (rental.phone || '').charAt(0) !== '+' ? '+' + rental.phone : rental.phone;
      var ed = new Date(rental.expiresAt);
      var n = new Date();
      var hl = Math.max(0, Math.floor((ed - n) / (1000 * 60 * 60)));
      var dl = Math.floor(hl / 24);
      hl = hl % 24;
      var td = dl > 0 ? dl + 'd ' + hl + 'h' : hl + 'h';
      var sl = '';
      if (rental.sms && rental.sms.length > 0) {
        sl = '<div class="rental-sms-list" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">' + rental.sms.map(function(s) {
          var st = new Date(s.receivedAt);
          return '<div class="rental-sms-item"><div class="sms-from">From: ' + (s.sender || 'Unknown') + '</div><div class="sms-body">' + (s.text || '') + '</div><div class="sms-time">' + st.toLocaleDateString() + ' ' + st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div></div>';
        }).join('') + '</div>';
      } else {
        sl = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;"><i class="far fa-comment-dots" style="font-size:24px;margin-bottom:8px;display:block;opacity:0.3;"></i>No SMS received yet</div>';
      }
      return '<div class="rental-item" style="cursor:pointer;" onclick="showRentalDetails(\'' + rental.id + '\')"><div class="rental-top"><div class="rental-left" style="flex:1;"><span style="font-size:24px;">' + cf + '</span><div><div class="rental-phone" style="display:flex;align-items:center;gap:6px;">' + pd + ' <i class="fas fa-chevron-right" style="font-size:10px;color:var(--text-muted);opacity:0.5;"></i></div><div class="rental-expiry"><i class="fas fa-clock"></i> ' + td + ' remaining</div></div></div></div>' + sl + '</div>';
    }).join('');
  } else {
    activeRentalsHTML = '<div class="empty-state" style="padding:40px 20px;"><i class="fas fa-phone-alt"></i><p>No active rentals.</p></div>';
  }

  var countryOptionsHTML = rentCountryOptions.map(function(c) {
    var availText = c.total > 0 ? ' (' + c.total + ' available)' : '';
    return '<option value="' + c.code + '">' + c.flag + ' ' + c.name + availText + '</option>';
  }).join('');
  
  if (rentCountryOptions.length === 0) {
    countryOptionsHTML = '<option value="">Loading countries...</option>';
  }

  main.innerHTML =
    '<div class="page-header"><div><h1 class="page-title"><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:10px;"></i>Rent Number</h1><p style="font-size:14px;color:var(--text-secondary);margin-top:8px;">Get a dedicated number for extended use with unlimited SMS</p></div></div>' +

    '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:25px;padding:24px;box-shadow:var(--shadow-sm);margin-bottom:28px;">' +
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;"><div style="width:44px;height:44px;border-radius:12px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-cog" style="font-size:18px;color:var(--accent);"></i></div><div><h2 style="font-size:17px;font-weight:700;margin-bottom:2px;">Rental Configuration</h2><p style="font-size:12px;color:var(--text-secondary);line-height:1.4;">Choose country and duration</p></div></div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;"><div style="background:rgba(13,155,122,0.06);border:1px solid rgba(13,155,122,0.15);border-radius:10px;padding:10px 8px;text-align:center;"><i class="fas fa-infinity" style="color:var(--accent);font-size:14px;margin-bottom:3px;display:block;"></i><div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Unlimited SMS</div></div><div style="background:rgba(13,155,122,0.06);border:1px solid rgba(13,155,122,0.15);border-radius:10px;padding:10px 8px;text-align:center;"><i class="fas fa-phone-alt" style="color:var(--accent);font-size:14px;margin-bottom:3px;display:block;"></i><div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Dedicated Number</div></div><div style="background:rgba(13,155,122,0.06);border:1px solid rgba(13,155,122,0.15);border-radius:10px;padding:10px 8px;text-align:center;"><i class="fas fa-sync-alt" style="color:var(--accent);font-size:14px;margin-bottom:3px;display:block;"></i><div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Auto-Extend</div></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;"><div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;"><i class="fas fa-globe" style="margin-right:4px;color:var(--accent);"></i>Country</label><select class="form-select" id="rentCountrySelect" onchange="onRentCountryChange(this.value)" style="width:100%;padding:11px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;">' + countryOptionsHTML + '</select></div><div><label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;"><i class="far fa-clock" style="margin-right:4px;color:var(--accent);"></i>Duration</label><select class="form-select" id="rentMonthsSelect" onchange="onRentMonthsChange(this.value)" style="width:100%;padding:11px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;"><option value="1">1 Month</option><option value="2">2 Months</option><option value="3">3 Months</option><option value="5">5 Months</option><option value="12">12 Months</option></select></div></div>' +
      '<div id="rentPriceLoading" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:var(--bg-primary);border-radius:10px;border:1px solid var(--border);margin-bottom:12px;"><i class="fas fa-spinner fa-spin" style="color:var(--accent);font-size:14px;"></i><span style="font-size:13px;color:var(--text-muted);">Checking availability...</span></div>' +
      '<div id="rentNotAvailable" style="display:none;flex-direction:column;align-items:center;gap:8px;padding:18px 16px;background:rgba(217,48,37,0.05);border:1px solid rgba(217,48,37,0.12);border-radius:12px;margin-bottom:12px;text-align:center;"><i class="fas fa-map-marker-alt" style="font-size:22px;color:var(--danger);opacity:0.7;"></i><span style="font-size:13px;color:var(--danger);font-weight:500;line-height:1.4;">Not available for this country.</span></div>' +
      '<div id="rentFallbackNotice" style="display:none;align-items:center;gap:8px;padding:12px 14px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;margin-bottom:12px;"><i class="fas fa-info-circle" style="color:#f59e0b;font-size:14px;flex-shrink:0;"></i><span style="font-size:12px;color:var(--text-secondary);line-height:1.4;">Using estimated pricing. Actual price may vary slightly.</span></div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;padding:16px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border);"><div style="display:flex;align-items:center;gap:8px;"><span id="rentMonthsLabel" style="font-size:13px;font-weight:600;color:var(--text-secondary);background:var(--accent-dim);padding:4px 10px;border-radius:8px;">1 Month</span><span style="font-size:13px;color:var(--text-muted);">Total:</span><span id="rentTotalPrice" style="font-size:18px;font-weight:500;color:var(--accent);">$--</span></div><button class="btn btn-primary" id="rentNowBtn" disabled style="width:100%;padding:14px;font-size:15px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;" onclick="executeRentNumber()"><i class="fas fa-shopping-cart"></i> Rent Now</button><div style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:12px;margin-top:4px;"><i class="fas fa-info-circle" style="color:#f59e0b;font-size:14px;flex-shrink:0;margin-top:3px;"></i><div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">If the number does not receive SMS messages, you may cancel it within 20 minutes free of charge. <span style="color:var(--text-muted);">Excessive cancellations may result in request restrictions.</span></div></div></div></div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><h2 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;"><i class="fas fa-phone-alt" style="color:var(--accent);font-size:16px;"></i> Active Rentals</h2><span style="font-size:12px;padding:4px 12px;border-radius:10px;font-weight:600;background:var(--accent-dim);color:var(--accent);">' + activeRentals.length + '</span></div><div class="active-rentals">' + activeRentalsHTML + '</div>';

  var cs = document.getElementById('rentCountrySelect');
  if (cs && cs.value) {
    window.fetchRentPrices(cs.value);
  }
}

  // Restore active rentals from localStorage backup
  var rentEmail = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (rentEmail && activeRentals.length === 0) {
    try {
      var rentBackup = localStorage.getItem('active_rentals_' + rentEmail);
      if (rentBackup) {
        var rentParsed = JSON.parse(rentBackup);
        if (Array.isArray(rentParsed)) {
          activeRentals = rentParsed;
        }
      }
    } catch(e) {}
  }

  var cs = document.getElementById('rentCountrySelect');
  if (cs && cs.value) {
    window.fetchRentPrices(cs.value);
  }

window.onRentCountryChange = function(cc) {
  currentRentArea = null;
  currentRentPricePerMonth = 0;
  currentRentDollarsPerMonth = 0;
  rentCountryAvailable = null;
  rentUsingFallback = false;
  window.fetchRentPrices(cc);
};

// FIX 1: Define missing variables in executeRentNumber
window.executeRentNumber = async function() {
  if (rentCountryAvailable !== true) {
    if (rentCountryAvailable === null) showToast('Please wait...', 'info');
    else showToast('Not available.', 'info');
    return;
  }
  var btn = document.getElementById('rentNowBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...'; btn.disabled = true; }
  try {
    var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
    var cs = document.getElementById('rentCountrySelect');
    var cc = cs ? cs.value : 'us';
    var cd = countries.find(function(c) { return c.code === cc; });
    var cf = cd ? cd.flag : '🌍';
    var cn = cd ? cd.name : 'Unknown';

    if (!ue) {
      showToast('Please log in first', 'error');
      if (btn) { btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; btn.disabled = false; }
      return;
    }

    var ur = await fetch('/api/user/' + ue);
    var ud = await ur.json();
    var sb = parseFloat(ud.balance) || 0;
    if (typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(sb);

    var tp = currentRentDollarsPerMonth * selectedRentMonths;
    var ttl = addRentProfit(tp);
    if (sb < ttl) {
      showInsufficientBalanceWarning(ttl, sb);
      if (btn) { btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; btn.disabled = false; }
      return;
    }

    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renting...';

    var ad = await window.smsbusCreateRent(cc, selectedRentMonths, ue);
    
    // FIX: Define these variables properly
    var ri = ad.order_id || ad.id || 'rental-' + Date.now();
    var sf = ad.order_id || ad.id || ri;
    var rawPhone = String(ad.mobile_number || ad.phone || ad.number || '');
    var dc = ad.dialing_code || '';
    var ea = ad.expire_at || ad.expiresAt || null;

    var dialCode = (cd && cd.dial_code) ? cd.dial_code.replace('+', '') : '';
    var pn = rawPhone;
    if (dialCode && pn.indexOf(dialCode) !== 0) {
      pn = dialCode + pn;
    }
    if (pn.charAt(0) !== '+') {
      pn = '+' + pn;
    }

    // Create the rental object FIRST with all required fields
    var newRental = {
      id: ri,
      smsFetchId: sf,
      phone: pn,
      dialingCode: dc,
      countryCode: cc,
      countryFlag: cf,
      countryName: cn,
      planName: selectedRentMonths + ' Month' + (selectedRentMonths > 1 ? 's' : ''),
      durationMonths: selectedRentMonths,
      providerCost: tp,
      cost: ttl,
      status: 'active',
      expiresAt: ea || new Date(Date.now() + selectedRentMonths * 30 * 24 * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      sms: []
    };

    // Add to local array BEFORE saving to server
    activeRentals.unshift(newRental);
    
    // Backup to localStorage immediately (removed duplicate code)
    try {
      var backupEmail = (typeof getUserEmail === 'function') ? getUserEmail() : '';
      if (backupEmail) {
        localStorage.setItem('active_rentals_' + backupEmail, JSON.stringify(activeRentals));
      }
    } catch(e) {}

    try {
      var sr = await fetch('/api/rentals/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ue,
          rentId: ri,
          smsFetchId: sf,
          phone: pn,
          dialingCode: dc,
          planName: newRental.planName,
          durationMonths: selectedRentMonths,
          providerCost: tp,
          cost: ttl,
          countryCode: cc,
          countryFlag: cf,
          countryName: cn,
          status: 'active',
          expiresAt: newRental.expiresAt,
          createdAt: newRental.createdAt
        })
      });

      var sd = await sr.json();
      if (sd.balance !== undefined && typeof window.updateBalanceDisplay === 'function') {
        window.updateBalanceDisplay(sd.balance);
      }
      
      // If server returns the saved rental with an ID, update our local copy
      if (sd.rental && sd.rental.id) {
        var idx = activeRentals.findIndex(function(r) { return r.id === ri; });
        if (idx !== -1) {
          activeRentals[idx] = Object.assign({}, activeRentals[idx], sd.rental);
        }
      }
    } catch (saveErr) {
      console.warn('Failed to save rental to server, keeping local copy:', saveErr.message);
    }

    showToast('Number rented! +' + pn + ' -$' + ttl.toFixed(2), 'success');
    
    // Re-render just the rent page
    var main = document.getElementById('appContent') || document.getElementById('mainContent');
    if (main) {
      renderRentPage(main);
    }
  } catch (err) {
    console.error('Rent error:', err);
    showToast(err.message || 'Failed to rent', 'error');
  } finally {
    var b2 = document.getElementById('rentNowBtn');
    if (b2) { b2.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; b2.disabled = false; }
  }
};


// FIX 2: Remove duplicate declaration
// var currentRentalDetailId = null;  // REMOVE THIS LINE (appears twice)


// FIX 3: Correct variable reference in cancelRental
window.cancelRental = async function(ri) {
  var rental = activeRentals.find(function(r) { return r.id === ri; });
  if (rental && rental.sms && rental.sms.length > 0) {
    showToast('Cannot cancel — SMS already received on this number', 'error');
    return;
  }
  if (!confirm('Cancel this rental?')) return;
  try {
    await window.smsbusCancelRent(ri);  // FIX: Changed rentalId to ri
    var dr = await fetch('/api/rental/' + ri, { method: 'DELETE' });  // FIX: Changed rentalId to ri
    var d = await dr.json();
    activeRentals = activeRentals.filter(function(r) { return r.id !== ri; });
    
    // Update localStorage backup
    try {
      var backupEmail = (typeof getUserEmail === 'function') ? getUserEmail() : '';
      if (backupEmail) {
        localStorage.setItem('active_rentals_' + backupEmail, JSON.stringify(activeRentals));
      }
    } catch(e) {}
    
    showToast('Rental cancelled', 'info');
    if (typeof renderMainContent === 'function') renderMainContent();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
};


// FIX 4: Fix undefined variable m in getPageFromHash
window.getPageFromHash = function() {
  var h = window.location.hash.replace('#', '').trim();
  if (h.indexOf('shared-card=') === 0) return 'shared-card';
  // FIX: Use a default mapping or just return h directly
  var validPages = ['numbers', 'rent', 'cards', 'history', 'settings', 'add-funds', 'profile'];
  if (validPages.indexOf(h) !== -1) return h;
  return 'numbers';  // Default page
};


// =======================================================================
// ===== STYLES =====
// =======================================================================
(function addCardStyles() {
  if (document.getElementById('card-styles-added')) return;
  var style = document.createElement('style');
  style.id = 'card-styles-added';
  style.textContent = '.gift-step{display:flex;align-items:center;gap:0}.gift-step-num{width:28px;height:28px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text-muted);flex-shrink:0;transition:all .3s}.gift-step.active .gift-step-num{background:var(--accent);color:#fff}.gift-step.done .gift-step-num{background:var(--accent);color:#fff}.gift-step-label{font-size:11px;color:var(--text-muted);margin-left:8px;font-weight:500}.gift-step.active .gift-step-label{color:var(--accent);font-weight:600}.gift-step-line{width:32px;height:2px;background:var(--border);transition:all .3s}.gift-step-line.done{background:var(--accent)}textarea{font-family:inherit}.card-flip-wrapper{border-radius:14px 14px 0 0;overflow:hidden}.card-flip-inner{position:relative;width:100%;height:180px;transition:transform .6s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d}.card-flip-front,.card-flip-back{position:absolute;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:14px;overflow:hidden}.card-flip-back{transform:rotateY(180deg)}';
  document.head.appendChild(style);
})();

// =======================================================================
// ===== RENTAL DETAILS PAGE =====
// =======================================================================
var currentRentalDetailId = null;

var currentRentalDetailId = null;

window.showRentalDetails = function(rentalId) {
  currentRentalDetailId = rentalId;
  var rental = activeRentals.find(function(r) { return r.id === rentalId; });
  if (!rental) { showToast('Rental not found', 'error'); return; }

  var main = document.getElementById('appContent') || document.getElementById('mainContent');
  if (!main) return;

  var phone = rental.phone || '';
  var displayPhone = phone.charAt(0) !== '+' ? '+' + phone : phone;
  var flag = rental.countryFlag || '🌍';
  var countryName = rental.countryName || 'Unknown';
  var countryCode = rental.countryCode || '';
  var status = rental.status || 'active';
  var isActive = status === 'active';
  var statusColor = isActive ? '#0d9b7a' : '#d93025';
  var statusBg = isActive ? 'rgba(13,155,122,0.1)' : 'rgba(217,48,37,0.1)';
  var statusBorder = isActive ? 'rgba(13,155,122,0.2)' : 'rgba(217,48,37,0.2)';
  var statusText = isActive ? 'Online' : 'Offline';
  var statusDot = isActive ? '#0d9b7a' : '#d93025';

  var createdAt = rental.createdAt ? new Date(rental.createdAt) : new Date();
  var expiresAt = rental.expiresAt ? new Date(rental.expiresAt) : new Date(Date.now() + 30 * 24 * 3600000);
  var now = new Date();
  var hoursLeft = Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60)));
  var daysLeft = Math.floor(hoursLeft / 24);
  var hrsLeft = hoursLeft % 24;
  var timeLeftStr = daysLeft > 0 ? daysLeft + 'd ' + hrsLeft + 'h' : hrsLeft + 'h';

  var cost = typeof rental.cost === 'number' ? rental.cost : 0;
  var planName = rental.planName || '1 Month';
  var orderId = rental.id || 'N/A';
  var smsFetchId = rental.smsFetchId || rental.id || '';

  var accessLink = window.location.origin + window.location.pathname + '#rent-access=' + smsFetchId;
  var savedNote = rental.note || '';

  var smsList = rental.sms || [];
  var hasSms = smsList.length > 0;
  var canCancel = !hasSms;

  var smsHtml = '';
  if (hasSms) {
    smsHtml = smsList.map(function(s) {
      var st = s.receivedAt ? new Date(s.receivedAt) : new Date();
      var timeStr = st.toLocaleDateString() + ' ' + st.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return '<div style="padding:14px 16px;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<span style="font-size:11px;font-weight:700;color:var(--accent);background:var(--accent-dim);padding:3px 10px;border-radius:6px;letter-spacing:0.3px;">FROM: ' + (s.sender || 'UNKNOWN') + '</span>' +
          '<span style="font-size:11px;color:var(--text-muted);">' + timeStr + '</span>' +
        '</div>' +
        '<div style="font-size:14px;color:var(--text-primary);line-height:1.6;word-break:break-word;font-weight:500;letter-spacing:0.3px;">' + (s.text || '') + '</div>' +
      '</div>';
    }).join('');
  } else {
    smsHtml = '<div style="text-align:center;padding:48px 20px;">' +
      '<div style="width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;border:1px dashed rgba(255,255,255,0.08);"><i class="far fa-comment-dots" style="font-size:22px;color:var(--text-muted);opacity:0.3;"></i></div>' +
      '<p style="font-size:14px;color:var(--text-muted);margin:0;font-weight:500;">No SMS received yet</p>' +
      '<p style="font-size:12px;color:var(--text-muted);opacity:0.5;margin:4px 0 0;">Messages will appear here automatically</p>' +
    '</div>';
  }

  var cancelBtnHtml = canCancel
    ? '<button onclick="cancelRentalFromDetail(\'' + rentalId + '\')" style="padding:12px;background:rgba(217,48,37,0.05);border:1px solid rgba(217,48,37,0.15);border-radius:10px;color:var(--danger);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.background=\'rgba(217,48,37,0.1)\'" onmouseout="this.style.background=\'rgba(217,48,37,0.05)\'"><i class="fas fa-times"></i> Cancel</button>'
    : '<div style="padding:12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;opacity:0.35;cursor:not-allowed;"><i class="fas fa-lock" style="font-size:10px;"></i><span style="font-size:12px;font-weight:600;color:var(--text-muted);">Locked</span></div>';

  var cancelReasonHtml = !canCancel
    ? '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.12);border-radius:10px;margin-top:10px;"><i class="fas fa-shield-alt" style="color:#f59e0b;font-size:12px;flex-shrink:0;"></i><span style="font-size:11px;color:var(--text-secondary);line-height:1.4;">Cancellation is locked after receiving SMS to protect verification sessions.</span></div>'
    : '';

  var renewOptions = [1, 2, 3, 5, 12].map(function(m) {
    var renewCost = currentRentDollarsPerMonth > 0 ? addRentProfit(currentRentDollarsPerMonth * m) : 0;
    return '<button onclick="selectRenewMonths(' + m + ')" class="renew-opt-btn" id="renewOpt' + m + '" style="padding:10px 16px;background:var(--bg-primary);border:2px solid var(--border);border-radius:10px;color:var(--text-secondary);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;">' +
      m + ' Mo' + (renewCost > 0 ? '<div style="font-size:10px;color:var(--text-muted);font-weight:400;margin-top:2px;">$' + renewCost.toFixed(2) + '</div>' : '') +
    '</button>';
  }).join('');

  main.innerHTML =
    '<div style="max-width:860px;margin:0 auto;padding:0 16px;">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">' +
        '<button onclick="closeRentalDetails()" style="width:38px;height:38px;border-radius:12px;background:var(--bg-card);border:1px solid var(--border);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;flex-shrink:0;transition:all 0.2s;" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-secondary)\'"><i class="fas fa-arrow-left"></i></button>' +
        '<div style="flex:1;"><h1 style="font-size:20px;font-weight:700;color:var(--text-primary);margin:0;">Number Details</h1></div>' +
        '<button onclick="refreshDetailSms(\'' + rentalId + '\')" style="padding:8px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-secondary)\'"><i class="fas fa-sync-alt" style="font-size:10px;"></i> Refresh</button>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;" class="detail-grid">' +

        '<!-- Left Column -->' +
        '<div style="display:flex;flex-direction:column;gap:20px;">' +
          '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;">' +
            '<div style="padding:24px 20px;text-align:center;border-bottom:1px solid var(--border);">' +
              '<span style="font-size:40px;display:block;margin-bottom:12px;">' + flag + '</span>' +
              '<div style="font-family:\'Courier New\',monospace;font-size:22px;font-weight:800;color:var(--text-primary);letter-spacing:1.5px;margin-bottom:4px;">' + displayPhone + '</div>' +
              '<div style="font-size:13px;color:var(--text-muted);">' + countryName + '</div>' +
              '<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 14px;background:' + statusBg + ';border:1px solid ' + statusBorder + ';border-radius:20px;margin-top:12px;">' +
                '<span style="width:7px;height:7px;border-radius:50%;background:' + statusDot + ';' + (isActive ? 'animation:pulse-dot 2s infinite;' : '') + '"></span>' +
                '<span style="font-size:12px;font-weight:700;color:' + statusColor + ';letter-spacing:0.5px;">' + statusText.toUpperCase() + '</span>' +
              '</div>' +
            '</div>' +
            '<div style="padding:16px 20px;">' +
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
                '<div style="padding:12px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border);">' +
                  '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Activated</div>' +
                  '<div style="font-size:13px;font-weight:700;color:var(--text-primary);">' + createdAt.toLocaleDateString() + '</div>' +
                  '<div style="font-size:11px;color:var(--text-muted);">' + createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div>' +
                '</div>' +
                '<div style="padding:12px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border);">' +
                  '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Expires</div>' +
                  '<div style="font-size:13px;font-weight:700;color:var(--text-primary);">' + expiresAt.toLocaleDateString() + '</div>' +
                  '<div style="font-size:11px;color:var(--danger);font-weight:700;">' + timeLeftStr + ' left</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;">' +
            '<div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">' +
              '<i class="fas fa-link" style="color:var(--accent);font-size:12px;"></i>' +
              '<span style="font-size:13px;font-weight:700;color:var(--text-primary);">Access Link</span>' +
            '</div>' +
            '<div style="padding:14px 20px;">' +
              '<div style="position:relative;">' +
                '<input type="text" id="rentalAccessLink" value="' + accessLink + '" readonly style="width:100%;padding:10px 44px 10px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-muted);font-size:11px;outline:none;font-family:\'Courier New\',monospace;" onclick="this.select()">' +
                '<button onclick="copyRentalAccessLink()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);padding:7px 10px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px;"><i class="fas fa-copy"></i></button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;">' +
            '<div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">' +
              '<i class="fas fa-sticky-note" style="color:var(--accent);font-size:12px;"></i>' +
              '<span style="font-size:13px;font-weight:700;color:var(--text-primary);">Notes</span>' +
            '</div>' +
            '<div style="padding:14px 20px;">' +
              '<textarea id="rentalNoteInput" placeholder="Add notes for this number..." rows="2" style="width:100%;padding:10px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:13px;outline:none;resize:vertical;min-height:50px;font-family:inherit;transition:border-color 0.2s;" onfocus="this.style.borderColor=\'var(--accent)\'" onblur="this.style.borderColor=\'var(--border)\';saveRentalNote(\'' + rentalId + '\',this.value)">' + savedNote + '</textarea>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- Right Column -->' +
        '<div style="display:flex;flex-direction:column;gap:20px;">' +
          '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;">' +
            '<div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">' +
              '<i class="fas fa-receipt" style="color:var(--accent);font-size:12px;"></i>' +
              '<span style="font-size:13px;font-weight:700;color:var(--text-primary);">Order History</span>' +
            '</div>' +
            '<div style="padding:16px 20px;">' +
              '<div style="padding:14px 16px;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
                  '<span style="font-size:11px;color:var(--text-muted);">Order ID</span>' +
                  '<span style="font-size:11px;font-weight:700;color:var(--text-primary);font-family:\'Courier New\',monospace;letter-spacing:0.3px;">' + orderId + '</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
                  '<span style="font-size:11px;color:var(--text-muted);">Status</span>' +
                  '<span style="font-size:10px;font-weight:700;color:#0d9b7a;background:rgba(13,155,122,0.1);padding:3px 10px;border-radius:6px;letter-spacing:0.3px;">COMPLETED</span>' +
                '</div>' +
                '<div style="height:1px;background:var(--border);margin:12px 0;"></div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
                  '<span style="font-size:11px;color:var(--text-muted);">Amount</span>' +
                  '<span style="font-size:16px;font-weight:800;color:var(--accent);">$' + cost.toFixed(2) + '</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
                  '<span style="font-size:11px;color:var(--text-muted);">Duration</span>' +
                  '<span style="font-size:12px;font-weight:600;color:var(--text-primary);">' + planName + '</span>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                  '<span style="font-size:11px;color:var(--text-muted);">Date</span>' +
                  '<span style="font-size:12px;color:var(--text-secondary);">' + createdAt.toLocaleDateString() + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;">' +
            '<div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">' +
              '<i class="fas fa-bolt" style="color:var(--accent);font-size:12px;"></i>' +
              '<span style="font-size:13px;font-weight:700;color:var(--text-primary);">Actions</span>' +
            '</div>' +
            '<div style="padding:14px 20px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
              '<button onclick="copyRentalPhone(\'' + displayPhone + '\')" style="padding:12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-secondary)\'"><i class="fas fa-copy"></i> Copy</button>' +
              '<button onclick="shareRentalNumber(\'' + displayPhone + '\')" style="padding:12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s;" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-secondary)\'"><i class="fas fa-share-alt"></i> Share</button>' +
              cancelBtnHtml +
              (canCancel
                ? '<div></div>'
                : '<div></div>') +
            '</div>' +
            cancelReasonHtml +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- SMS Section -->' +
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:24px;">' +
        '<div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<i class="fas fa-envelope" style="color:var(--accent);font-size:12px;"></i>' +
            '<span style="font-size:13px;font-weight:700;color:var(--text-primary);">SMS Messages</span>' +
            '<span style="font-size:10px;padding:2px 8px;border-radius:8px;font-weight:700;background:var(--accent-dim);color:var(--accent);">' + smsList.length + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="padding:16px 20px;max-height:380px;overflow-y:auto;" id="detailSmsContainer">' + smsHtml + '</div>' +
      '</div>' +

      '<!-- Renew Section -->' +
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;overflow:hidden;">' +
        '<div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;">' +
          '<i class="fas fa-redo" style="color:var(--accent);font-size:12px;"></i>' +
          '<span style="font-size:13px;font-weight:700;color:var(--text-primary);">Renew</span>' +
        '</div>' +
        '<div style="padding:16px 20px;">' +
          '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;" id="renewOptionsWrap">' + renewOptions + '</div>' +
          '<div id="renewSummary" style="display:none;padding:14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;margin-bottom:14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
              '<span style="font-size:13px;color:var(--text-muted);">Renewal cost:</span>' +
              '<span id="renewTotalCost" style="font-size:18px;font-weight:800;color:var(--accent);">$0.00</span>' +
            '</div>' +
          '</div>' +
          '<button id="renewNowBtn" disabled onclick="executeRenewRental(\'' + rentalId + '\')" style="width:100%;padding:13px;background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border);border-radius:12px;font-size:13px;font-weight:600;cursor:not-allowed;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;"><i class="fas fa-redo"></i> Select duration</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  if (!document.getElementById('rental-detail-styles')) {
    var st = document.createElement('style');
    st.id = 'rental-detail-styles';
    st.textContent = '@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.4}}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:700px){.detail-grid{grid-template-columns:1fr}}.renew-opt-btn.selected{border-color:var(--accent)!important;background:var(--accent-dim)!important;color:var(--accent)!important}';
    document.head.appendChild(st);
  }
};

window.closeRentalDetails = function() {
  currentRentalDetailId = null;
  selectedRenewMonths = 0;
  if (typeof renderMainContent === 'function') renderMainContent();
};

window.copyRentalAccessLink = function() {
  var input = document.getElementById('rentalAccessLink');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(function() {
    showToast('Access link copied!', 'success');
  }).catch(function() {
    document.execCommand('copy');
    showToast('Access link copied!', 'success');
  });
};

window.copyRentalPhone = function(phone) {
  navigator.clipboard.writeText(phone).then(function() {
    showToast('Number copied: ' + phone, 'success');
  }).catch(function() {
    showToast('Failed to copy', 'error');
  });
};

window.shareRentalNumber = function(phone) {
  var text = 'My rented number: ' + phone;
  if (navigator.share) {
    navigator.share({ title: 'Rented Number', text: text }).catch(function() {});
  } else {
    navigator.clipboard.writeText(text).then(function() {
      showToast('Number copied to clipboard!', 'success');
    }).catch(function() {
      showToast('Failed to copy', 'error');
    });
  }
};

window.saveRentalNote = function(rentalId, note) {
  var rental = activeRentals.find(function(r) { return r.id === rentalId; });
  if (!rental) return;
  rental.note = note;
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (!ue) return;
  fetch('/api/rentals/note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ue, rentalId: rentalId, note: note })
  }).catch(function() {});
};

var selectedRenewMonths = 0;

window.selectRenewMonths = function(months) {
  selectedRenewMonths = months;
  var opts = document.querySelectorAll('.renew-opt-btn');
  opts.forEach(function(btn) {
    btn.classList.remove('selected');
    btn.style.borderColor = 'var(--border)';
    btn.style.background = 'var(--bg-primary)';
    btn.style.color = 'var(--text-secondary)';
  });
  var selBtn = document.getElementById('renewOpt' + months);
  if (selBtn) {
    selBtn.classList.add('selected');
    selBtn.style.borderColor = 'var(--accent)';
    selBtn.style.background = 'var(--accent-dim)';
    selBtn.style.color = 'var(--accent)';
  }

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
    if (sb < renewCost) {
      showInsufficientBalanceWarning(renewCost, sb);
      if (btn) { btn.innerHTML = '<i class="fas fa-redo"></i> Renew'; btn.disabled = false; }
      return;
    }

    var rental = activeRentals.find(function(r) { return r.id === rentalId; });
    var cc = rental ? rental.countryCode : 'us';

    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Contacting provider...';

    var ad = await window.smsbusCreateRent(cc, selectedRenewMonths, ue);
    var newExpires = ad.expire_at || ad.expiresAt || new Date(Date.now() + selectedRenewMonths * 30 * 24 * 3600000).toISOString();

    if (rental) {
      rental.expiresAt = newExpires;
      rental.durationMonths = (rental.durationMonths || 0) + selectedRenewMonths;
      rental.planName = rental.durationMonths + ' Month' + (rental.durationMonths > 1 ? 's' : '');
      rental.cost = (rental.cost || 0) + renewCost;
    }

    await fetch('/api/rentals/renew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ue, rentalId: rentalId, months: selectedRenewMonths, cost: renewCost, newExpiresAt: newExpires })
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.balance !== undefined && typeof window.updateBalanceDisplay === 'function') window.updateBalanceDisplay(d.balance);
    }).catch(function() {});

    showToast('Renewed for ' + selectedRenewMonths + ' month(s)! -$' + renewCost.toFixed(2), 'success');
    selectedRenewMonths = 0;
    window.showRentalDetails(rentalId);
  } catch (err) {
    console.error('Renew error:', err);
    showToast(err.message || 'Renewal failed', 'error');
    if (btn) { btn.innerHTML = '<i class="fas fa-redo"></i> Renew'; btn.disabled = false; }
  }
};

window.refreshDetailSms = async function(rentalId) {
  var rental = activeRentals.find(function(r) { return r.id === rentalId; });
  if (!rental) return;
  var container = document.getElementById('detailSmsContainer');
  if (container) container.innerHTML = '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:20px;color:var(--accent);"></i></div>';
  try {
    var d = await window.smsbusGetRentStatus(rental.smsFetchId || rental.id);
    var hasNew = false;
    rental.sms = rental.sms || [];
    if (d && d.content) {
      if (!rental.sms.some(function(s) { return s.text === d.content; })) {
        rental.sms.unshift({ sender: 'Unknown', text: d.content, receivedAt: d.receive_at || new Date().toISOString() });
        hasNew = true;
      }
    }
    if (d && d.list && Array.isArray(d.list)) {
      d.list.forEach(function(as) {
        if (!rental.sms.some(function(s) { return s.text === (as.content || as.text); })) {
          rental.sms.unshift({ sender: as.sender || 'Unknown', text: as.content || as.text || '', receivedAt: as.receive_at || as.created_at || new Date().toISOString() });
          hasNew = true;
        }
      });
    }
    if (hasNew) {
      showToast('New SMS received!', 'success');
    } else {
      showToast('No new messages', 'info');
    }
    window.showRentalDetails(rentalId);
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
    window.showRentalDetails(rentalId);
  }
};

window.cancelRental = async function(ri) {
  var rental = activeRentals.find(function(r) { return r.id === ri; });
  if (rental && rental.sms && rental.sms.length > 0) {
    showToast('Cannot cancel — SMS already received on this number', 'error');
    return;
  }
  if (!confirm('Cancel this rental?')) return;
  try {
    await window.smsbusCancelRent(rentalId);
    var dr = await fetch('/api/rental/' + rentalId, { method: 'DELETE' });
    var d = await dr.json();
            activeRentals = activeRentals.filter(function(r) { return r.id !== ri; });
    
    try {
      var backupEmail = (typeof getUserEmail === 'function') ? getUserEmail() : '';
      if (backupEmail) {
        localStorage.setItem('active_rentals_' + backupEmail, JSON.stringify(activeRentals));
      }
    } catch(e) {}
    
    // Update localStorage backup
    try {
      var backupEmail = (typeof getUserEmail === 'function') ? getUserEmail() : '';
      if (backupEmail) {
        localStorage.setItem('active_rentals_' + backupEmail, JSON.stringify(activeRentals));
      }
    } catch(e) {}
    showToast('Rental cancelled', 'info');
    if (typeof renderMainContent === 'function') renderMainContent();
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
};

window.loadActiveRentals = function() {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (!ue) return Promise.resolve();
  
  return fetch('/api/rentals/' + ue, {
    headers: { 'Accept': 'application/json' }
  })
    .then(function(r) {
      if (!r.ok) throw new Error('Server error');
      return r.json();
    })
    .then(function(d) {
      if (!Array.isArray(d)) return;
      
      var localIds = activeRentals.map(function(r) { return r.id; });
      
      // ONLY add server rentals we don't have locally
      // NEVER remove local rentals - they may be newer than server
      d.forEach(function(serverR) {
        if (localIds.indexOf(serverR.id) === -1) {
          activeRentals.push(serverR);
        }
      });
      
      // Sort newest first (handle both createdAt and created_at)
      activeRentals.sort(function(a, b) {
        var aTime = new Date(a.createdAt || a.created_at || 0).getTime();
        var bTime = new Date(b.createdAt || b.created_at || 0).getTime();
        return bTime - aTime;
      });
    })
    .catch(function(err) {
      console.warn('Failed to load rentals:', err.message);
      // NEVER clear activeRentals on error - keep local data
    });
};

// =======================================================================
// ===== ROUTER =====
// =======================================================================
window.renderRentPage = renderRentPage;
window.renderCardsPage = renderCardsPage;
window.renderSharedCardPage = renderSharedCardPage;

var _origPreLoad = window.preLoadPageData;
window.preLoadPageData = function(page) {
  if (page === 'rent') return Promise.all([
    (typeof loadBalance === 'function' ? loadBalance() : Promise.resolve()), 
    loadActiveRentals(),  // This now returns a Promise
    window.fetchRentCountries()
  ]);
  if (page === 'shared-card') return Promise.resolve();
  if (_origPreLoad) return _origPreLoad(page);
  return Promise.resolve();
};


var _origGetPage = typeof getPageFromHash === 'function' ? getPageFromHash : null;
window.getPageFromHash = function() {
  var h = window.location.hash.replace('#', '').trim();
  if (h.indexOf('shared-card=') === 0) return 'shared-card';
// Legacy compatibility - old code might call loadHistory()
window.loadHistory = function() {
  return loadUnifiedHistory();
};
  return m[h] || h || 'numbers';
};


console.log('page-extra.js loaded: Rent, Cards & Share pages registered');
