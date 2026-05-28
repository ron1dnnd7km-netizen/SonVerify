// =======================================================================
// ===== RENT NUMBER & VIRTUAL CARD PAGES =====
// =======================================================================

// ===== PROFIT MARGIN FUNCTION =====
function addRentProfit(basePrice) {
  return parseFloat((basePrice * 1.2633).toFixed(2));
}

// ===== AREA CODE MAP =====
var rentAreaCodeMap = {
  'us': 'US', 'gb': 'GB', 'uk': 'GB', 'de': 'DE', 'ca': 'CA',
  'au': 'AU', 'it': 'IT', 'es': 'ES', 'sa': 'SA', 'ae': 'AE',
  'il': 'IL', 'ps': 'PS', 'tr': 'TR', 'qa': 'QA', 'jp': 'JP',
  'at': 'AT', 'ng': 'NG', 'lt': 'LT', 'eg': 'EG', 'ie': 'IE',
  'ci': 'CI', 'sg': 'SG', 'ee': 'EE', 'vn': 'VN', 'ro': 'RO',
  'th': 'TH', 'in': 'IN', 'ru': 'RU', 'co': 'CO', 'rs': 'RS',
  'ua': 'UA', 'cy': 'CY', 'lv': 'LV', 'my': 'MY', 'bo': 'BO',
  'id': 'ID', 'pa': 'PA', 'ph': 'PH', 'dk': 'DK', 'ge': 'GE',
  'cm': 'CM', 'bj': 'BJ', 'nz': 'NZ', 'ni': 'NI', 'kh': 'KH',
  'mx': 'MX', 'kz': 'KZ', 'af': 'AF', 'al': 'AL', 'dz': 'DZ',
  'ao': 'AO', 'ar': 'AR', 'am': 'AM', 'la': 'LA', 'bd': 'BD',
  'za': 'ZA', 'ma': 'MA', 'mm': 'MM', 'tj': 'TJ', 'az': 'AZ',
  'bh': 'BH', 'nl': 'NL', 'by': 'BY', 'bw': 'BW', 'br': 'BR',
  'bg': 'BG', 'ke': 'KE', 'tz': 'TZ', 'kg': 'KG', 'fr': 'FR',
  'pl': 'PL', 'mg': 'MG'
};

function getRentAreaCode(countryCode) {
  return rentAreaCodeMap[(countryCode || '').toLowerCase()] || null;
}

// =======================================================================
// ===== RENT API FUNCTIONS =====
// =======================================================================

window.smsbusGetRentServices = async function(countryCode) {
  var areaCode = getRentAreaCode(countryCode);
  if (!areaCode) return null;

  try {
    var res = await fetch('/api/v2/rent/areas?area_code=' + areaCode);
    if (!res.ok) return null;
    var json = await res.json();
    var areas = json.data || json.areas || json;
    if (!Array.isArray(areas)) return null;

    if (areaCode) {
      var filtered = areas.filter(function(a) {
        return (a.area_code || '').toUpperCase() === areaCode.toUpperCase();
      });
      if (filtered.length > 0) return filtered;
    }
    return areas;
  } catch (err) {
    console.error('Rent services error:', err);
    return null;
  }
};

window.smsbusCreateRent = async function(countryCode, months, email) {
  var areaCode = getRentAreaCode(countryCode);
  if (!areaCode) throw new Error('Country not available for rental: ' + countryCode);

  try {
    var res = await fetch('/api/v2/rent/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area_code: areaCode,
        time: months,
        email: email || ''
      })
    });

      if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      var errMsg = (err.error || err.message || '').toLowerCase();
      if (errMsg.includes('balance') || errMsg.includes('not enough') || errMsg.includes('insufficient')) {
        throw new Error('Try again or Try a different country.');
      }
      throw new Error(err.error || err.message || 'Failed to create rental');
    }

    var json = await res.json();
    var data = json.data || json;
    var msg = (json.message || json.msg || '').toLowerCase();

    if (json.code !== undefined && json.code !== 200) {
      // Hide provider balance errors from user
      if (msg.includes('balance') || msg.includes('not enough') || msg.includes('insufficient')) {
        throw new Error('Try a different country or try again later.');
      }
      throw new Error(json.message || json.msg || 'No numbers available right now.');
    }

    return data;
  } catch (err) {
    throw err;
  }
};

window.smsbusGetRentStatus = async function(rentalId) {
  try {
    var res = await fetch('/api/v2/rent/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rentalId: rentalId })
    });
    if (!res.ok) throw new Error('Failed to get SMS');
    var json = await res.json();
    return json.data || json;
  } catch (err) {
    throw err;
  }
};

window.smsbusCancelRent = async function(rentalId) {
  try {
    var res = await fetch('/api/v2/rent/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: rentalId })
    });
    if (!res.ok) throw new Error('Failed to cancel');
    var json = await res.json();
    if (json.code !== undefined && json.code !== 200) {
      throw new Error(json.message || json.msg || 'Cancel failed');
    }
    return json.data || json;
  } catch (err) {
    throw err;
  }
};

// ===== RENT STATE =====
var activeRentals = [];
var currentRentArea = null;
var rentLoadingPrice = false;
var selectedRentMonths = 1;
var currentRentPricePerMonth = 0;
var currentRentDollarsPerMonth = 0;
var rentCountryAvailable = null; // null = loading, true = available, false = not available

// ===== VIRTUAL CARD DATA =====
var userCards = [];
var cardTransactions = [];
var selectedCardForPurchase = null;
var cardDetailTab = 'details';

var availableCardTypes = [
  {
    id: 'virtual-visa', type: 'Visa Virtual', brand: 'VISA', badge: 'visa',
    style: 'card-blue', price: 5.99, period: 'One-time fee', currency: 'USD',
    features: ['Online payments worldwide', '$0.25 transaction fee', 'Instant activation', 'Top up anytime', 'Valid for 1 year']
  },
  {
    id: 'virtual-mastercard', type: 'Mastercard Virtual', brand: 'MASTERCARD', badge: 'mastercard',
    style: 'card-dark', price: 7.99, period: 'One-time fee', currency: 'USD',
    features: ['Online payments worldwide', '$0.25 transaction fee', 'Instant activation', 'Top up anytime', 'Valid for 1 year', '3D Secure enabled']
  },
  {
    id: 'virtual-premium', type: 'Premium Virtual Card', brand: 'VISA', badge: 'virtual',
    style: 'card-purple', price: 14.99, period: 'One-time fee', currency: 'USD',
    features: ['Online & POS payments', '$0.25 transaction fee', 'Instant activation', 'Higher load limits', 'Valid for 2 years', '3D Secure + CVV2', 'Priority support']
  }
];


// =======================================================================
// ===== RENT PRICE FETCHING =====
// =======================================================================
window.fetchRentPrices = async function(countryCode) {
  if (rentLoadingPrice) return;
  rentLoadingPrice = true;
  rentCountryAvailable = null;

  updateRentPriceDisplay();

  try {
    var areas = await window.smsbusGetRentServices(countryCode);

    if (!areas || areas.length === 0) {
      currentRentArea = null;
      currentRentPricePerMonth = 0;
      currentRentDollarsPerMonth = 0;
      rentCountryAvailable = false;
      updateRentPriceDisplay();
      rentLoadingPrice = false;
      return;
    }

    currentRentArea = areas[0];
    var centsPerMonth = parseInt(currentRentArea.unit_price) || 0;
    currentRentPricePerMonth = centsPerMonth;
    currentRentDollarsPerMonth = centsPerMonth / 100;
    rentCountryAvailable = true;

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

  // Hide all states first
  if (notAvailEl) notAvailEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'none';

  if (rentCountryAvailable === null) {
    // Loading state
    if (loadingEl) loadingEl.style.display = 'flex';
    if (priceEl) priceEl.style.display = 'none';
    if (rentBtn) rentBtn.disabled = true;
  } else if (rentCountryAvailable === false) {
    // Not available
    if (notAvailEl) notAvailEl.style.display = 'flex';
    if (priceEl) { priceEl.textContent = '--'; priceEl.style.display = ''; }
    if (rentBtn) rentBtn.disabled = true;
  } else {
    // Available - show price
    if (priceEl) priceEl.style.display = '';
    if (rentBtn) rentBtn.disabled = false;
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
  if (label) {
    label.textContent = selectedRentMonths + ' Month' + (selectedRentMonths > 1 ? 's' : '');
  }
  updateRentTotalPrice();
};


// =======================================================================
// ===== RENDER RENT PAGE =====
// =======================================================================
function renderRentPage(main) {
  selectedRentMonths = 1;
  rentCountryAvailable = null;

  var activeRentalsHTML = '';
  if (activeRentals.length > 0) {
    activeRentalsHTML = activeRentals.map(function(rental) {
      var countryFlag = rental.countryFlag || '🌍';
      var phoneDisplay = (rental.phone || '').charAt(0) !== '+' ? '+' + rental.phone : rental.phone;

      var expiryDate = new Date(rental.expiresAt);
      var now = new Date();
      var hoursLeft = Math.max(0, Math.floor((expiryDate - now) / (1000 * 60 * 60)));
      var daysLeft = Math.floor(hoursLeft / 24);
      hoursLeft = hoursLeft % 24;
      var timeDisplay = daysLeft > 0 ? daysLeft + 'd ' + hoursLeft + 'h' : hoursLeft + 'h';

      var smsListHTML = '';
      if (rental.sms && rental.sms.length > 0) {
        smsListHTML = '<div class="rental-sms-list">' +
          rental.sms.map(function(s) {
            var smsTime = new Date(s.receivedAt);
            var timeStr = smsTime.toLocaleDateString() + ' ' + smsTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return '<div class="rental-sms-item">' +
              '<div class="sms-from">From: ' + (s.sender || 'Unknown') + '</div>' +
              '<div class="sms-body">' + (s.text || '') + '</div>' +
              '<div class="sms-time">' + timeStr + '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      } else {
        smsListHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;"><i class="far fa-comment-dots" style="font-size:24px;margin-bottom:8px;display:block;opacity:0.3;"></i>No SMS received yet</div>';
      }

      return '<div class="rental-item">' +
        '<div class="rental-top">' +
          '<div class="rental-left">' +
            '<span style="font-size:24px;">' + countryFlag + '</span>' +
            '<div>' +
              '<div class="rental-phone">' + phoneDisplay + '</div>' +
              '<div class="rental-expiry"><i class="fas fa-clock"></i> ' + timeDisplay + ' remaining</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn-sm refresh" onclick="refreshRentalSms(\'' + rental.id + '\')"><i class="fas fa-sync-alt"></i> Refresh</button>' +
            '<button class="btn-sm cancel" onclick="cancelRental(\'' + rental.id + '\')"><i class="fas fa-times"></i> Cancel</button>' +
          '</div>' +
        '</div>' +
        smsListHTML +
      '</div>';
    }).join('');
  } else {
    activeRentalsHTML = '<div class="empty-state" style="padding:40px 20px;"><i class="fas fa-phone-alt"></i><p>No active rentals. Configure and rent a number above.</p></div>';
  }

  main.innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<h1 class="page-title"><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:10px;"></i>Rent Number</h1>' +
        '<p style="font-size:14px;color:var(--text-secondary);margin-top:8px;">Get a dedicated number for extended use with unlimited SMS</p>' +
      '</div>' +
    '</div>' +

    // ===== RENTAL CONFIGURATION CARD =====
    '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:var(--shadow-sm);margin-bottom:28px;">' +

      // Header
      '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">' +
        '<div style="width:44px;height:44px;border-radius:12px;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          '<i class="fas fa-cog" style="font-size:18px;color:var(--accent);"></i>' +
        '</div>' +
        '<div>' +
          '<h2 style="font-size:17px;font-weight:700;margin-bottom:2px;">Rental Configuration</h2>' +
          '<p style="font-size:12px;color:var(--text-secondary);line-height:1.4;">Choose country and duration for your dedicated number</p>' +
        '</div>' +
      '</div>' +

      // Info badges
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;">' +
        '<div style="background:rgba(13,155,122,0.06);border:1px solid rgba(13,155,122,0.15);border-radius:10px;padding:10px 8px;text-align:center;">' +
          '<i class="fas fa-infinity" style="color:var(--accent);font-size:14px;margin-bottom:3px;display:block;"></i>' +
          '<div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Unlimited SMS</div>' +
        '</div>' +
        '<div style="background:rgba(13,155,122,0.06);border:1px solid rgba(13,155,122,0.15);border-radius:10px;padding:10px 8px;text-align:center;">' +
          '<i class="fas fa-phone-alt" style="color:var(--accent);font-size:14px;margin-bottom:3px;display:block;"></i>' +
          '<div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Dedicated Number</div>' +
        '</div>' +
        '<div style="background:rgba(13,155,122,0.06);border:1px solid rgba(13,155,122,0.15);border-radius:10px;padding:10px 8px;text-align:center;">' +
          '<i class="fas fa-sync-alt" style="color:var(--accent);font-size:14px;margin-bottom:3px;display:block;"></i>' +
          '<div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Auto-Extend</div>' +
        '</div>' +
      '</div>' +

      // Form fields - stack on mobile
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">' +
        '<div>' +
          '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">' +
            '<i class="fas fa-globe" style="margin-right:4px;color:var(--accent);"></i>Country / Region' +
          '</label>' +
          '<select class="form-select" id="rentCountrySelect" onchange="onRentCountryChange(this.value)" style="width:100%;padding:11px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;">' +
            countries.map(function(c) { return '<option value="' + c.code + '">' + c.flag + ' ' + c.name + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">' +
            '<i class="far fa-clock" style="margin-right:4px;color:var(--accent);"></i>Rental Duration' +
          '</label>' +
          '<select class="form-select" id="rentMonthsSelect" onchange="onRentMonthsChange(this.value)" style="width:100%;padding:11px 12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;outline:none;">' +
            '<option value="1">1 Month</option>' +
            '<option value="2">2 Months</option>' +
            '<option value="3">3 Months</option>' +
            '<option value="5">5 Months</option>' +
            '<option value="12">12 Months</option>' +
          '</select>' +
        '</div>' +
      '</div>' +

      // Loading indicator
      '<div id="rentPriceLoading" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:var(--bg-primary);border-radius:10px;border:1px solid var(--border);margin-bottom:12px;">' +
        '<i class="fas fa-spinner fa-spin" style="color:var(--accent);font-size:14px;"></i>' +
        '<span style="font-size:13px;color:var(--text-muted);">Checking availability...</span>' +
      '</div>' +

      // Not available message
      '<div id="rentNotAvailable" style="display:none;flex-direction:column;align-items:center;gap:8px;padding:18px 16px;background:rgba(217,48,37,0.05);border:1px solid rgba(217,48,37,0.12);border-radius:12px;margin-bottom:12px;text-align:center;">' +
        '<i class="fas fa-map-marker-alt" style="font-size:22px;color:var(--danger);opacity:0.7;"></i>' +
        '<span style="font-size:13px;color:var(--danger);font-weight:500;line-height:1.4;">Rental is not available for the selected country.<br>Please try a different country.</span>' +
      '</div>' +

      // Price + button - STACKED on mobile for full width button
      '<div style="display:flex;flex-direction:column;gap:12px;padding:16px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span id="rentMonthsLabel" style="font-size:12.5px;font-weight:540;color:var(--text-secondary);background:var(--accent-dim);padding:4px 10px;border-radius:8px;">1 Month</span>' +
            '<span style="font-size:13px;color:var(--text-muted);">Total:</span>' +
            '<span id="rentTotalPrice" style="font-size:14.5px;font-weight:530;color:var(--accent);">$--</span>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary" id="rentNowBtn" disabled style="width:100%;padding:14px;font-size:13px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;" onclick="executeRentNumber()">' +
          '<i class="fas fa-shopping-cart"></i> Rent Now' +
        '</button>' +
      '</div>' +

    '</div>' +

    // ===== ACTIVE RENTALS =====
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<h2 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;">' +
        '<i class="fas fa-phone-alt" style="color:var(--accent);font-size:16px;"></i> Active Rentals' +
      '</h2>' +
      '<span style="font-size:12px;padding:4px 12px;border-radius:10px;font-weight:600;background:var(--accent-dim);color:var(--accent);">' + activeRentals.length + '</span>' +
    '</div>' +
    '<div class="active-rentals">' + activeRentalsHTML + '</div>';

  // Fetch prices immediately
  var countrySelect = document.getElementById('rentCountrySelect');
  if (countrySelect) {
    window.fetchRentPrices(countrySelect.value);
  }
}

// ===== RENT CONFIG CHANGE HANDLERS =====
window.onRentCountryChange = function(countryCode) {
  currentRentArea = null;
  currentRentPricePerMonth = 0;
  currentRentDollarsPerMonth = 0;
  rentCountryAvailable = null;
  window.fetchRentPrices(countryCode);
};

// ===== RENT PAGE ACTIONS =====
window.executeRentNumber = async function() {
  if (rentCountryAvailable !== true) {
    if (rentCountryAvailable === null) {
      showToast('Please wait while we check availability.', 'info');
    } else {
      showToast('This country is not available for rental. Try a different country.', 'info');
    }
    return;
  }

  var btn = document.getElementById('rentNowBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...'; btn.disabled = true; }

  var userEmail = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  var countrySelect = document.getElementById('rentCountrySelect');
  var countryCode = countrySelect ? countrySelect.value : 'us';

  var countryData = countries.find(function(c) { return c.code === countryCode; });
  var countryFlag = countryData ? countryData.flag : '🌍';
  var countryName = countryData ? countryData.name : 'Unknown';

  // ===== FIX: Fetch balance from SERVER, not DOM =====
  if (!userEmail) {
    showToast('Please log in first', 'error');
    if (btn) { btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; btn.disabled = false; }
    return;
  }

  try {
    var userRes = await fetch('/api/user/' + userEmail);
    var userData = await userRes.json();
    var serverBalance = parseFloat(userData.balance) || 0;

    // Update the display too so nav shows correct amount
    if (typeof window.updateBalanceDisplay === 'function') {
      window.updateBalanceDisplay(serverBalance);
    }

    var totalProvider = currentRentDollarsPerMonth * selectedRentMonths;
    var totalPrice = addRentProfit(totalProvider);

    if (serverBalance < totalPrice) {
      // Pass the REAL balance to the warning popup
      showInsufficientBalanceWarning(totalPrice, serverBalance);
      if (btn) { btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; btn.disabled = false; }
      return;
    }

    // Balance OK — proceed with rental
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Renting...'; }

    var apiData = await window.smsbusCreateRent(countryCode, selectedRentMonths, userEmail);

    var orderId = apiData.order_id || apiData.id;
    var phoneNumber = apiData.mobile_number || apiData.phone || apiData.number || '';
    var dialingCode = apiData.dialing_code || '';
    var expireAt = apiData.expire_at || apiData.expiresAt || '';

    if (!orderId || !phoneNumber) {
      throw new Error('Invalid API response: missing order ID or phone number');
    }

    var rentalId = orderId;
    var smsFetchId = getRentAreaCode(countryCode) + ':' + phoneNumber;

    var saveRes = await fetch('/api/rentals/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        rentId: rentalId,
        smsFetchId: smsFetchId,
        phone: phoneNumber,
        dialingCode: dialingCode,
        planName: selectedRentMonths + ' Month' + (selectedRentMonths > 1 ? 's' : ''),
        durationMonths: selectedRentMonths,
        providerCost: totalProvider,
        cost: totalPrice,
        countryCode: countryCode,
        countryFlag: countryFlag,
        countryName: countryName,
        status: 'active',
        expiresAt: expireAt || new Date(Date.now() + selectedRentMonths * 30 * 24 * 3600000).toISOString(),
        createdAt: new Date().toISOString()
      })
    });

    var saveData = await saveRes.json();

    if (saveData.balance !== undefined) {
      window.updateBalanceDisplay(saveData.balance);
    }

    var rentalEntry = saveData.rental || {
      id: rentalId,
      smsFetchId: smsFetchId,
      phone: phoneNumber,
      countryCode: countryCode,
      countryFlag: countryFlag,
      planName: selectedRentMonths + ' Month' + (selectedRentMonths > 1 ? 's' : ''),
      durationMonths: selectedRentMonths,
      cost: totalPrice,
      status: 'active',
      expiresAt: expireAt || new Date(Date.now() + selectedRentMonths * 30 * 24 * 3600000).toISOString(),
      sms: []
    };
    activeRentals.push(rentalEntry);

    showToast('Number rented! +' + phoneNumber + ' -$' + totalPrice.toFixed(2), 'success');
    if (typeof renderMainContent === 'function') renderMainContent();

  } catch (err) {
    console.error('Rent error:', err);
    showToast(err.message || 'Failed to rent number', 'error');
  } finally {
    var btn2 = document.getElementById('rentNowBtn');
    if (btn2) { btn2.innerHTML = '<i class="fas fa-shopping-cart"></i> Rent Now'; btn2.disabled = false; }
  }
};

window.refreshRentalSms = async function(rentalId) {
  var rental = activeRentals.find(function(r) { return r.id === rentalId; });
  if (!rental) return;

  var refreshBtn = event ? event.target.closest('button') : null;
  if (refreshBtn) { refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; refreshBtn.disabled = true; }

  try {
    var fetchId = rental.smsFetchId || rental.id;
    var data = await window.smsbusGetRentStatus(fetchId);

    var hasNewSms = false;
    rental.sms = rental.sms || [];

    if (data && data.content) {
      var exists = rental.sms.some(function(s) { return s.text === data.content; });
      if (!exists) {
        rental.sms.unshift({
          sender: 'Unknown',
          text: data.content,
          receivedAt: data.receive_at || new Date().toISOString()
        });
        hasNewSms = true;
      }
    }

    if (data && data.list && Array.isArray(data.list)) {
      data.list.forEach(function(apiSms) {
        var exists = rental.sms.some(function(s) { return s.text === (apiSms.content || apiSms.text); });
        if (!exists) {
          rental.sms.unshift({
            sender: apiSms.sender || 'Unknown',
            text: apiSms.content || apiSms.text || '',
            receivedAt: apiSms.receive_at || apiSms.created_at || new Date().toISOString()
          });
          hasNewSms = true;
        }
      });
    }

    if (hasNewSms) {
      showToast('New SMS received!', 'success');
      if (typeof renderMainContent === 'function') renderMainContent();
    } else {
      showToast('No new SMS', 'info');
    }

  } catch (err) {
    showToast('Failed to refresh: ' + err.message, 'error');
  } finally {
    if (refreshBtn) { refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; refreshBtn.disabled = false; }
  }
};

window.cancelRental = async function(rentalId) {
  if (!confirm('Cancel this rental? You will receive a refund.')) return;

  try {
    await window.smsbusCancelRent(rentalId);

    var deleteRes = await fetch('/api/rental/' + rentalId, { method: 'DELETE' });
    var data = await deleteRes.json();

    if (data.balance !== undefined) {
      window.updateBalanceDisplay(data.balance);
    }

    activeRentals = activeRentals.filter(function(r) { return r.id !== rentalId; });
    showToast('Rental cancelled and refunded', 'info');

    if (typeof renderMainContent === 'function') renderMainContent();

  } catch (err) {
    showToast('Failed to cancel: ' + err.message, 'error');
  }
};

window.loadActiveRentals = function() {
  var userEmail = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (!userEmail) return;
  fetch('/api/rentals/' + userEmail)
    .then(function(res) { return res.json(); })
    .then(function(data) { if (Array.isArray(data)) activeRentals = data; })
    .catch(function() { activeRentals = []; });
};


// =======================================================================
// ===== RENDER CARDS PAGE =====
// =======================================================================
function renderCardsPage(main) {
  main.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;padding:40px 20px;text-align:center;">' +
      '<div style="width:100px;height:100px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;margin-bottom:30px;">' +
        '<i class="far fa-credit-card" style="font-size:42px;color:var(--accent);"></i>' +
      '</div>' +
      '<h1 style="font-size:28px;font-weight:700;margin-bottom:12px;color:var(--text-primary);">Virtual Cards</h1>' +
      '<p style="font-size:16px;color:var(--text-secondary);margin-bottom:8px;max-width:400px;line-height:1.6;">Manage your virtual cards and transactions</p>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:24px;padding:12px 24px;background:rgba(13,155,122,0.08);border:1px solid rgba(13,155,122,0.2);border-radius:10px;">' +
        '<i class="fas fa-tools" style="color:var(--accent);"></i>' +
        '<span style="font-size:14px;font-weight:600;color:var(--accent);">Coming Soon</span>' +
      '</div>' +
    '</div>';
}

// ===== CARD PAGE ACTIONS =====
window.switchCardTab = function(tab) {};
window.switchActiveCard = function(cardId) {};
window.selectCardType = function(cardTypeId) {};
window.purchaseCard = function(cardTypeId) {};
window.toggleCardNumberVisibility = function() {};
window.copyCardNumber = function() {};
window.showCardDetails = function() {};
window.freezeCard = function() {};
window.deleteCard = function() {};
window.showTopUpCardModal = function() {};
window.selectTopUpAmount = function() {};
window.updateTopUpBtn = function() {};
window.executeTopUpCard = function() {};
window.loadUserCards = function() {};
function loadCardTransactions(cardId) {}


// =======================================================================
// ===== REGISTER WITH ROUTER =====
// =======================================================================
window.renderRentPage = renderRentPage;
window.renderCardsPage = renderCardsPage;

var _origPreLoad = window.preLoadPageData;
window.preLoadPageData = function(page) {
  if (page === 'rent') return Promise.all([(typeof loadBalance === 'function' ? loadBalance() : Promise.resolve()), loadActiveRentals()]);
  if (page === 'cards') return Promise.all([(typeof loadBalance === 'function' ? loadBalance() : Promise.resolve()), loadUserCards()]);
  if (_origPreLoad) return _origPreLoad(page);
  return Promise.resolve();
};

var _origGetPage = typeof getPageFromHash === 'function' ? getPageFromHash : null;
if (_origGetPage) {
  window.getPageFromHash = function() {
    var h = window.location.hash.replace('#', '').trim();
    var m = {
      'numbers': 'numbers', 'home': 'numbers', 'add-funds': 'deposit', 'deposit': 'deposit',
      'history': 'history', 'referral': 'settings', 'settings': 'settings',
      'help': 'help', 'contacts': 'contacts',
      'rent': 'rent',
      'cards': 'cards'
    };
    return m[h] || h || 'numbers';
  };
}

var _origBoot = window.bootSequence;
window.bootSequence = function() {
  if (_origBoot) _origBoot();
  loadActiveRentals();
  loadUserCards();
};

console.log('✅ page-extra.js loaded: Rent & Cards pages registered');