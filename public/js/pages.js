// ===== FORCE BALANCE FIX - MUST BE FIRST LINE =====
(function() {
  var email = null;
  var tries = 0;
  var maxTries = 50;
  
  var checker = setInterval(function() {
    tries++;
    email = (typeof getUserEmail === 'function') ? getUserEmail() : 
           localStorage.getItem('sonverify_email') || 
           localStorage.getItem('userEmail');
    
    if (!email || tries >= maxTries) {
      clearInterval(checker);
      return;
    }
    
    // Got email - load and cache balance
    clearInterval(checker);
    
    // Show cached balance IMMEDIATELY
    var cached = localStorage.getItem('cachedBalance_' + email);
    if (cached && parseFloat(cached) > 0) {
      window.balance = parseFloat(cached);
      var selectors = ['#balanceAmount', '.balance-amount', '#depositCurrentBalance', '.nav-balance', '#navBalance'];
      selectors.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          el.textContent = '$' + parseFloat(cached).toFixed(2);
        });
      });
    }
    
    // Then fetch fresh from server
    fetch('/api/user/' + email)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.balance !== undefined) {
          window.balance = parseFloat(data.balance);
          localStorage.setItem('cachedBalance_' + email, data.balance.toString());
          selectors.forEach(function(sel) {
            document.querySelectorAll(sel).forEach(function(el) {
              el.textContent = '$' + parseFloat(data.balance).toFixed(2);
            });
          });
        }
      })
      .catch(function() {});
  }, 100);
})();

// ===== ADD THIS FUNCTION TO SHOW INSUFFICIENT BALANCE WARNING =====
window.showInsufficientBalanceWarning = function(requiredAmount, knownBalance) {
  var currentBalance = knownBalance;
  
  // Only fall back to DOM if no balance passed
  if (currentBalance === undefined || currentBalance === null) {
    currentBalance = 0;
    var balanceEl = document.querySelector('.balance-amount') || 
                    document.getElementById('balanceDisplay') || 
                    document.getElementById('userBalance');
    if (balanceEl) {
      currentBalance = parseFloat(balanceEl.textContent.replace(/[^0-9.-]/g, '')) || 0;
    }
  }
  
  // Extra safety: try all possible balance selectors
  if (currentBalance <= 0) {
    var selectors = [
      '.balance-amount', '#balanceDisplay', '#userBalance',
      '[data-balance]', '.nav-balance', '#navBalance',
      '.wallet-balance'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        var parsed = parseFloat(el.textContent.replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          currentBalance = parsed;
          break;
        }
      }
    }
  }
  
  var shortage = Math.max(0, (requiredAmount - currentBalance)).toFixed(2);
  
  var overlay = document.createElement('div');
  overlay.id = 'insufficientBalanceOverlay';
  overlay.className = 'modal-overlay show';
  overlay.style.zIndex = '10001';
  overlay.onclick = function(e) {
    if (e.target === overlay) overlay.remove();
  };
  
  overlay.innerHTML = 
    '<div class="modal" style="width:420px;max-width:90vw;text-align:center;">' +
      '<div class="modal-body" style="padding:32px;">' +
        '<div style="width:72px;height:72px;border-radius:50%;background:rgba(217,48,37,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">' +
          '<i class="fas fa-wallet" style="font-size:32px;color:var(--danger);"></i>' +
        '</div>' +
        '<h2 style="font-size:20px;font-weight:700;margin-bottom:12px;color:var(--text-primary);">Insufficient Balance</h2>' +
        '<p style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;line-height:1.6;">You need <strong style="color:var(--danger);">$' + requiredAmount.toFixed(2) + '</strong> to get this number</p>' +
        '<p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;line-height:1.6;">Current balance: <strong>$' + currentBalance.toFixed(2) + '</strong><br>Please deposit <strong style="color:var(--accent);">$' + shortage + '</strong> more</p>' +
        '<div style="display:flex;gap:12px;justify-content:center;">' +
          '<button class="btn btn-secondary" onclick="document.getElementById(\'insufficientBalanceOverlay\').remove()" style="min-width:120px;">Cancel</button>' +
          '<button class="btn btn-primary" onclick="document.getElementById(\'insufficientBalanceOverlay\').remove();closeBuyModal();goToPage(\'deposit\');" style="min-width:160px;">' +
            '<i class="fas fa-plus-circle"></i> Deposit $' + shortage +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  
  // Remove any existing overlay first
  var existing = document.getElementById('insufficientBalanceOverlay');
  if (existing) existing.remove();
  
  document.body.appendChild(overlay);
};

// ===== ADD LOW BALANCE INDICATOR IN THE NAV =====
window.checkAndShowLowBalance = function() {
  var balanceEl = document.querySelector('.balance-amount') || 
                  document.getElementById('balanceDisplay') || 
                  document.getElementById('userBalance');
  
  if (!balanceEl) return;
  
  var balance = parseFloat(balanceEl.textContent.replace(/[^0-9.-]/g, '')) || 0;
  var badge = document.getElementById('lowBalanceIndicator');
  
  if (balance < 1) {
    // Very low balance - show warning
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'lowBalanceIndicator';
      badge.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--danger);margin-left:6px;animation:pulse-dot 1.5s infinite;';
      balanceEl.parentNode.appendChild(badge);
    }
    badge.style.background = 'var(--danger)';
  } else if (balance < 5) {
    // Low balance - show warning
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'lowBalanceIndicator';
      badge.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--warning);margin-left:6px;animation:pulse-dot 1.5s infinite;';
      balanceEl.parentNode.appendChild(badge);
    }
    badge.style.background = 'var(--warning)';
  } else {
    // Sufficient balance - remove indicator
    if (badge) {
      badge.remove();
    }
  }
};

// ===== FIX: Cache balance to prevent flash of $0.00 =====
var originalUpdateBalanceDisplay = window.updateBalanceDisplay;
window.updateBalanceDisplay = function(newBalance) {
  var balance = parseFloat(newBalance) || 0;
  window.balance = balance;
  
  // Update all possible balance elements immediately
  var selectors = [
    '.balance-amount', '#balanceDisplay', '#userBalance',
    '#depositCurrentBalance', '.nav-balance', '#navBalance',
    '[data-balance]', '.wallet-balance'
  ];
  
  selectors.forEach(function(sel) {
    var els = document.querySelectorAll(sel);
    els.forEach(function(el) {
      el.textContent = '$' + balance.toFixed(2);
    });
  });
  
  // Cache in localStorage for instant display on next page load
  var email = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (email) {
    localStorage.setItem('cachedBalance_' + email, balance.toString());
    // Also fire storage event for other tabs
    try { localStorage.setItem('userBalance', balance.toString()); } catch(e) {}
  }
  
  // Check and show low balance indicator
  setTimeout(function() {
    window.checkAndShowLowBalance();
  }, 100);
};

// ===== SHOW CACHED BALANCE INSTANTLY ON PAGE LOAD =====
(function() {
  var email = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (email) {
    var cached = localStorage.getItem('cachedBalance_' + email);
    if (cached) {
      window.balance = parseFloat(cached);
      var selectors = [
        '.balance-amount', '#balanceDisplay', '#userBalance',
        '#depositCurrentBalance', '.nav-balance', '#navBalance',
        '[data-balance]', '.wallet-balance'
      ];
      selectors.forEach(function(sel) {
        var els = document.querySelectorAll(sel);
        els.forEach(function(el) {
          el.textContent = '$' + parseFloat(cached).toFixed(2);
        });
      });
    }
  }
})();

// ===== LISTEN FOR BALANCE UPDATES FROM OTHER TABS =====
window.addEventListener('storage', function(e) {
  if (e.key === 'userBalance' && e.newValue) {
    window.updateBalanceDisplay(parseFloat(e.newValue));
  }
});

// ===== MASK EMAIL FOR PRIVACY =====
function maskEmail(email) {
  if (!email) return 'Unknown';
  var parts = email.split('@');
  if (parts.length !== 2) return '***';
  var name = parts[0];
  var domain = parts[1];
  var maskedName = name.substring(0, 2) + '***';
  return maskedName + '@' + domain;
}

// ===== MISSING HELPER FUNCTIONS =====

// Safe get user email
window.getUserEmail = function() {
  try {
    return localStorage.getItem('sonverify_email') || 
           localStorage.getItem('userEmail') || 
           sessionStorage.getItem('userEmail') || '';
  } catch (e) {
    return '';
  }
};

// Copy number to clipboard
window.copyNumber = function(phone) {
  var cleaned = phone.replace(/[^\d+\s-]/g, '');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(cleaned)
      .then(function() { showToast('Number copied!', 'success'); })
      .catch(function() { fallbackCopy(cleaned); });
  } else {
    fallbackCopy(cleaned);
  }
};

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Number copied!', 'success');
  } catch (e) {
    showToast('Failed to copy', 'error');
  }
  document.body.removeChild(ta);
}

// ===== REPLACE cancelNumber WITH THIS VERSION =====
window.cancelNumber = function(id) {
  if (!confirm('Cancel this number and get a refund?')) return;
  
  var btn = event ? event.target : null;
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
  
  // First cancel on SMS-Bus
  smsbusCancelActivation(id)
    .then(function(cancelData) {
      console.log('SMS-Bus cancel result:', cancelData);
      
      // FIX: Call cancel endpoint instead of DELETE - this sets status to 'cancelled' in history
      return fetch('/api/numbers/' + id + '/cancel', { method: 'POST' })
        .then(function(res) { return res.json(); });
    })
    .catch(function(err) {
      // If SMS-Bus cancel fails, still try to cancel locally
      console.warn('SMS-Bus cancel failed, cancelling locally:', err.message);
      return fetch('/api/numbers/' + id + '/cancel', { method: 'POST' })
        .then(function(res) { return res.json(); });
    })
    .then(function(data) {
      if (data && data.error) {
        showToast(data.error, 'error');
        if (btn) { btn.disabled = false; }
        return;
      }
      
      showToast('Number cancelled! Balance refunded.', 'success');
      
      if (data && data.balance !== undefined) {
        window.updateBalanceDisplay(data.balance);
      } else {
        if (typeof loadBalance === 'function') loadBalance();
      }
      
      // Remove from active numbers immediately
      window.activeNumbers = window.activeNumbers.filter(function(n) { return n.id != id; });
      if (typeof renderMainContent === 'function') renderMainContent();
      
      // Also load history so cancelled item appears there
      if (typeof loadUnifiedHistory === 'function') {
      loadUnifiedHistory().catch(function() {});
      }
    })
    .catch(function(err) {
      console.error('Cancel error:', err);
      showToast('Error cancelling: ' + err.message, 'error');
      if (btn) { btn.disabled = false; }
    })
    .finally(function() {
      // Don't re-enable button since number is removed
    });
};

// Toast notification
window.showToast = function(message, type) {
  type = type || 'info';
  var colors = {
    success: 'var(--accent)',
    error: 'var(--danger)',
    warning: 'var(--warning)',
    info: '#3b82f6'
  };
  var icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:100000;padding:14px 20px;border-radius:12px;background:var(--bg-card);border:1px solid ' + colors[type] + ';box-shadow:0 10px 40px rgba(0,0,0,0.2);display:flex;align-items:center;gap:10px;font-size:14px;max-width:400px;animation:slideInRight 0.3s ease;';
  toast.innerHTML = '<i class="fas ' + icons[type] + '" style="color:' + colors[type] + ';font-size:16px;"></i><span style="color:var(--text-primary);">' + message + '</span>';
  
  if (!document.getElementById('toastAnimationStyle')) {
    var style = document.createElement('style');
    style.id = 'toastAnimationStyle';
    style.textContent = '@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(function() {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
};

// ===== FIX: GRACE PERIOD TRACKER (4 min silent after code/timeout, then history) =====
window.gracePeriodTimers = window.gracePeriodTimers || {};
var GRACE_PERIOD_MS = 240000; // 4 minutes

window.startGracePeriod = function(numberId) {
  if (window.gracePeriodTimers[numberId]) return;
  window.gracePeriodTimers[numberId] = setTimeout(function() {
    delete window.gracePeriodTimers[numberId];
    // Silently refresh — number moves from active to history on backend
    if (typeof loadNumbers === 'function') {
      loadNumbers().then(function() {
        if (window.currentPage === 'numbers') renderMainContent();
      });
    }
    if (typeof loadHistory === 'function') {
      loadHistory().then(function() {
        if (window.currentPage === 'history') renderMainContent();
      });
    }
  }, GRACE_PERIOD_MS);
};

window.clearGracePeriod = function(numberId) {
  if (window.gracePeriodTimers[numberId]) {
    clearTimeout(window.gracePeriodTimers[numberId]);
    delete window.gracePeriodTimers[numberId];
  }
};

// ===== FIX: CANADIAN AREA CODE DETECTION FOR FLAG =====
var CANADIAN_AREA_CODES = ['204','226','236','249','250','263','289','306','343','354','365','367','368','382','387','403','416','418','431','437','438','450','474','506','514','519','548','579','581','584','587','600','604','613','639','647','672','683','705','709','742','753','778','780','782','807','819','825','867','873','879','902','905'];

function getFlagFromPhone(phone, countryCode, country_code) {
  // 1. Check explicit country flag from data
  if (countryCode) {
    var cc = countryCode.toLowerCase();
    var c1 = (typeof countries !== 'undefined') ? countries.find(function(c) { return c.code === cc; }) : null;
    if (c1) return c1.flag;
  }
  if (country_code) {
    var cc2 = country_code.toLowerCase();
    var c2 = (typeof countries !== 'undefined') ? countries.find(function(c) { return c.code === cc2; }) : null;
    if (c2) return c2.flag;
  }
  // 2. Detect from phone number
  if (!phone) return '🌍';
  var p = phone.replace(/\s/g, '');
  if (p.charAt(0) === '+') p = p.substring(1);
  if (p.indexOf('44') === 0) return '🇬🇧';
  else if (p.indexOf('380') === 0) return '🇺🇦';
  else if (p.indexOf('971') === 0) return '🇦🇪';
  else if (p.indexOf('966') === 0) return '🇸🇦';
  else if (p.indexOf('353') === 0) return '🇮🇪';
  else if (p.indexOf('81') === 0) return '🇯🇵';
  else if (p.indexOf('62') === 0) return '🇮🇩';
  else if (p.indexOf('63') === 0) return '🇵🇭';
  else if (p.indexOf('84') === 0) return '🇻🇳';
  else if (p.indexOf('55') === 0) return '🇧🇷';
  else if (p.indexOf('49') === 0) return '🇩🇪';
  else if (p.indexOf('33') === 0) return '🇫🇷';
  else if (p.indexOf('39') === 0) return '🇮🇹';
  else if (p.indexOf('34') === 0) return '🇪🇸';
  else if (p.indexOf('61') === 0) return '🇦🇺';
  else if (p.indexOf('91') === 0) return '🇮🇳';
  else if (p.indexOf('90') === 0) return '🇹🇷';
  else if (p.indexOf('31') === 0) return '🇳🇱';
  else if (p.indexOf('48') === 0) return '🇵🇱';
  else if (p.indexOf('40') === 0) return '🇷🇴';
  else if (p.indexOf('43') === 0) return '🇦🇹';
  else if (p.indexOf('60') === 0) return '🇲🇾';
  else if (p.indexOf('65') === 0) return '🇸🇬';
  else if (p.indexOf('7') === 0) return '🇷🇺';
  // FIX: North American — distinguish Canada vs USA by area code
  else if (p.indexOf('1') === 0 && p.length >= 4) {
    var areaCode = p.substring(1, 4);
    if (CANADIAN_AREA_CODES.indexOf(areaCode) !== -1) return '🇨🇦';
    return '🇺🇸';
  }
  return '🌍';
}

// ===== FIX: REMOVED duplicate fetchPricesForCountry and priceCache =====
// The data.js version is used instead — it automatically applies addProfit() markup
// so prices always reflect your % from the provider with no manual update needed.

/* ===== AUTO-VERIFY DEPOSIT ON PAGE LOAD ===== */
(function() {
  // Check URL parameters for deposit status
  var urlParams = new URLSearchParams(window.location.search);
  var depositStatus = urlParams.get('deposit');
  var depositRef = urlParams.get('ref');
  
  if (depositStatus === 'success' && depositRef) {
    console.log('Detected return from payment, verifying:', depositRef);
    
    // Start polling for deposit status
    var verifyAttempts = 0;
    var maxAttempts = 30; // 30 attempts * 3 seconds = 90 seconds max
    
    function checkDepositStatus() {
      verifyAttempts++;
      
      fetch('/api/deposit/status/' + depositRef)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          console.log('Deposit check #' + verifyAttempts + ':', data.status);
          
          if (data.status === 'completed') {
            // FIX: Use (data.amount || 0) not (data.amount || '') - empty string has no toFixed()
            var paidAmount = parseFloat(data.amount) || 0;
            
            if (typeof showToast === 'function') {
              showToast('Payment confirmed! $' + paidAmount.toFixed(2) + ' added to your balance.', 'success');
            }
            
            // Keep refreshing balance for 2 minutes after completion
            if (typeof loadBalance === 'function') {
              loadBalance();
              var extraPolls = 0;
              (function keepPolling() {
                extraPolls++;
                if (extraPolls > 24) return; // 24 * 5s = 2 min
                setTimeout(function() {
                  loadBalance();
                  keepPolling();
                }, 5000);
              })();
            }
            
            // Refresh deposit history
            setTimeout(function() {
              if (typeof loadDepositHistory === 'function') {
                loadDepositHistory();
              }
            }, 1000);
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
          
          // Handle declined and cancelled statuses
          if (data.status === 'failed' || data.status === 'declined' || data.status === 'cancelled') {
            var failMsg = data.status === 'declined' ? 'Payment was declined.' : 
                         data.status === 'cancelled' ? 'Payment was cancelled.' : 'Payment failed.';
            if (typeof showToast === 'function') {
              showToast(failMsg, 'error');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            if (typeof loadDepositHistory === 'function') {
              loadDepositHistory();
            }
            return;
          }
          
          // Still pending - continue polling
          if (verifyAttempts < maxAttempts) {
            setTimeout(checkDepositStatus, 3000);
          } else {
            if (typeof showToast === 'function') {
              showToast('Payment is still processing. Your balance will update automatically once confirmed.', 'info');
            }
            // Continue background polling less frequently
            startBackgroundPolling(depositRef);
          }
        })
        .catch(function(err) {
          console.error('Error checking deposit:', err);
          if (verifyAttempts < maxAttempts) {
            setTimeout(checkDepositStatus, 3000);
          }
        });
    }
    
    // Start checking after 2 seconds
    setTimeout(checkDepositStatus, 2000);
  }
  
  // Handle declined and cancelled on direct URL return
  if (depositStatus === 'failed' || depositStatus === 'declined' || depositStatus === 'cancelled') {
    var directMsg = depositStatus === 'declined' ? 'Payment was declined.' : 
                    depositStatus === 'cancelled' ? 'Payment was cancelled.' : 'Payment failed.';
    if (typeof showToast === 'function') {
      showToast(directMsg, 'error');
    }
    window.history.replaceState({}, document.title, window.location.pathname);
    if (typeof loadDepositHistory === 'function') {
      loadDepositHistory();
    }
  }
})();

// Background polling for pending deposits
function startBackgroundPolling(reference) {
  var bgAttempts = 0;
  var bgMaxAttempts = 60;
  var completedSeenAt = null;

  function bgCheck() {
    bgAttempts++;
    
    fetch('/api/deposit/status/' + reference)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.status === 'completed') {
          // FIX: Parse amount correctly
          var bgPaidAmount = parseFloat(data.amount) || 0;
          
          if (typeof showToast === 'function') {
            showToast('Payment confirmed! $' + bgPaidAmount.toFixed(2) + ' added to your balance.', 'success');
          }
          
          // Record when completed was first seen
          if (!completedSeenAt) {
            completedSeenAt = Date.now();
            
            // Immediately refresh balance
            if (typeof loadBalance === 'function') loadBalance();
            
            // Keep refreshing balance every 5 seconds for 2 minutes
            var balancePollCount = 0;
            var balancePollMax = 24;
            
            function keepRefreshingBalance() {
              balancePollCount++;
              if (balancePollCount > balancePollMax) return;
              setTimeout(function() {
                if (typeof loadBalance === 'function') loadBalance();
                keepRefreshingBalance();
              }, 5000);
            }
            keepRefreshingBalance();
          }
          
          if (typeof loadDepositHistory === 'function') {
            setTimeout(function() { loadDepositHistory(); }, 500);
          }
          return;
        }
        
        if (data.status === 'failed' || data.status === 'declined' || data.status === 'cancelled' || bgAttempts >= bgMaxAttempts) {
          if (data.status === 'failed' || data.status === 'declined' || data.status === 'cancelled') {
            if (typeof loadDepositHistory === 'function') loadDepositHistory();
          }
          return;
        }
        
        setTimeout(bgCheck, 5000);
      })
      .catch(function() {
        setTimeout(bgCheck, 5000);
      });
  }
  
  setTimeout(bgCheck, 5000);
}

/* ===== AUTO-POLL PENDING DEPOSITS ON PAGE LOAD ===== */
window.startPendingDepositsPolling = function() {
  var email = (typeof getUserEmail === 'function') ? getUserEmail() : null;
  if (!email) return;
  
  // Check for any pending deposits
  fetch('/api/deposits/' + email)
    .then(function(res) { return res.json(); })
    .then(function(deposits) {
      var pendingDeposits = deposits.filter(function(d) { return d.status === 'pending'; });
      
      if (pendingDeposits.length > 0) {
        console.log('Found', pendingDeposits.length, 'pending deposit(s), starting polling...');
        
        pendingDeposits.forEach(function(deposit) {
          startBackgroundPolling(deposit.reference);
        });
      }
    })
    .catch(function(err) {
      console.log('Could not check pending deposits:', err.message);
    });
};

// Call this after login
var originalLoginCheck = window.checkAuth;
if (originalLoginCheck) {
  window.checkAuth = function() {
    originalLoginCheck().then(function() {
      setTimeout(function() {
        window.startPendingDepositsPolling();
      }, 2000);
    });
  };
}

/* ===== REAL BRAND ICON MAPPER ===== */
function getServiceIconData(serviceName, serviceId, existingIcon) {
  var name = (serviceName || '').toLowerCase();
  var id = (serviceId || '').toLowerCase();
  var icon = (existingIcon || '').trim();
  
  // CHECK IF IT'S A REAL IMAGE URL
  var isImage = /\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i.test(icon) || icon.indexOf('http') === 0 || icon.indexOf('/') === 0;
  if (isImage) {
    return { 
      html: '<img src="' + icon + '" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML=\'<i class=fas fa-globe></i>\'">', 
      color: '#374151', 
      bg: 'rgba(0,0,0,0.04)' 
    };
  }

  // ===== FORCE REAL LOGOS BY SERVICE NAME =====
  var nameImageMap = {
    'whatsapp': 'https://upload.wikimedia.org/wikipedia/commons/a/a7/2062095_application_chat_communication_logo_whatsapp_icon.svg',
    'telegram': 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg',
    'facebook': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
    'instagram': 'https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg',
    'tiktok': 'https://upload.wikimedia.org/wikipedia/commons/6/61/Tiktok_hyper.png',
    'google': 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
    'netflix': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Netflix_Icon.svg',
    'twitter': 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg',
    'discord': 'https://upload.wikimedia.org/wikipedia/fr/4/4f/Discord_Logo_sans_text.svg',
    'steam': 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg',
    'uber': 'https://upload.wikimedia.org/wikipedia/commons/5/58/Uber_logo_2018.svg',
    'spotify': 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    'twitch': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Twitch_logo.svg',
    'linkedin': 'https://upload.wikimedia.org/wikipedia/commons/0/01/LinkedIn_Logo.svg',
    'snapchat': 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Snapchat_logo.svg',
    'pinterest': 'https://upload.wikimedia.org/wikipedia/commons/5/53/Pinterest_logo.svg',
    'reddit': 'https://upload.wikimedia.org/wikipedia/commons/9/95/Reddit_logo_and_wordmark.svg',
    'youtube': 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
    'fiverr': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Fiverr_logo.svg',
    'ebay': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg',
    'apple': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    'microsoft': 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    'amazon': 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    'paypal': 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal_logo_%28old%29.svg',
    'venmo': 'https://upload.wikimedia.org/wikipedia/commons/8/85/Venmo_logo_2021.svg',
    'cash app': 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Square_Cash_App_logo.svg',
    'binance': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Binance_logo.svg',
    'coinbase': 'https://upload.wikimedia.org/wikipedia/commons/8/86/Coinbase_logo.svg',
    'airbnb': 'https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg',
    'booking': 'https://upload.wikimedia.org/wikipedia/commons/2/29/Booking.com_logo.svg',
    'booking.com': 'https://upload.wikimedia.org/wikipedia/commons/2/29/Booking.com_logo.svg',
    'nike': 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg',
    'openai': 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg',
    'chatgpt': 'https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg',
    'viber': 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Viber_logo.svg',
    'signal': 'https://upload.wikimedia.org/wikipedia/commons/6/60/Signal-Logo-Ultramarine_%282024%29.svg',
    'skype': 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Skype_logo_%282019%E2%80%93present%29.svg',
    'line': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/LINE_logo.svg',
    'vk': 'https://upload.wikimedia.org/wikipedia/commons/f/f7/VKontakte_logo.svg',
    'tinder': 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Tinder_logo.svg',
    'bumble': 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Bumble_logo.svg',
    'hinge': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Hinge_logo.svg',
    'yandex': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Yandex_logo.svg',
    'baidu': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Baidu_logo.svg',
    'shopee': 'https://upload.wikimedia.org/wikipedia/commons/8/8e/Shopee_logo.svg',
    'temu': 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Temu_logo.svg',
    'shein': 'https://upload.wikimedia.org/wikipedia/commons/8/82/Shein_logo.svg',
    'walmart': 'https://upload.wikimedia.org/wikipedia/commons/1/14/Walmart_logo.svg',
    'truecaller': 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Truecaller_logo.svg',
    'authy': 'https://upload.wikimedia.org/wikipedia/commons/4/40/Authy_logo.svg',
    'chime': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Chime_logo.svg',
    'nvidia': 'https://upload.wikimedia.org/wikipedia/commons/2/22/Nvidia_logo.svg',
    'badoo': 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Badoo_logo.svg',
    'roblox': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Roblox_logo.svg',
    'pubg': 'https://upload.wikimedia.org/wikipedia/commons/2/28/PUBG_logo.svg',
    'slack': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
    'github': 'https://upload.wikimedia.org/wikipedia/commons/9/91/GitHub_logo.svg',
    'snapchat': 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Snapchat_logo.svg',
    'alipay': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Alipay_logo_%282021%29.svg',
  };
  
  // Check if service name matches a known brand with a real logo
  var nameKeys = Object.keys(nameImageMap).sort(function(a, b) { return b.length - a.length; });
  for (var img_i = 0; img_i < nameKeys.length; img_i++) {
    if (name.indexOf(nameKeys[img_i]) !== -1) {
      var imgUrl = nameImageMap[nameKeys[img_i]];
      return {
        html: '<img src="' + imgUrl + '" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML=\'<i class=fas fa-globe></i>\'">',
        color: '#374151',
        bg: 'rgba(0,0,0,0.04)'
      };
    }
  }
  var iconColorMap = {
    'fab fa-whatsapp':        { color: '#25D366', bg: 'rgba(37,211,102,0.12)' },
    'fab fa-whatsapp-plane':  { color: '#26A5E4', bg: 'rgba(38,165,228,0.12)' },
    'fab fa-telegram-plane':  { color: '#26A5E4', bg: 'rgba(38,165,228,0.12)' },
    'fab fa-telegram':        { color: '#26A5E4', bg: 'rgba(38,165,228,0.12)' },
    'fab fa-facebook-f':      { color: '#1877F2', bg: 'rgba(24,119,242,0.12)' },
    'fab fa-facebook':        { color: '#1877F2', bg: 'rgba(24,119,242,0.12)' },
    'fab fa-meta':            { color: '#0668E1', bg: 'rgba(6,104,225,0.12)' },
    'fab fa-instagram':       { color: '#E4405F', bg: 'rgba(228,64,95,0.12)' },
    'fab fa-x-twitter':       { color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'fab fa-tiktok':          { color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'fab fa-google':          { color: '#4285F4', bg: 'rgba(66,133,244,0.12)' },
    'fab fa-youtube':         { color: '#FF0000', bg: 'rgba(255,0,0,0.12)' },
    'fab fa-amazon':          { color: '#FF9900', bg: 'rgba(255,153,0,0.12)' },
    'fab fa-discord':         { color: '#5865F2', bg: 'rgba(88,101,242,0.12)' },
    'fab fa-microsoft':       { color: '#00A4EF', bg: 'rgba(0,164,239,0.12)' },
    'fab fa-uber':            { color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'fab fa-paypal':          { color: '#003087', bg: 'rgba(0,48,135,0.12)' },
    'fab fa-steam':           { color: '#1B2838', bg: 'rgba(27,40,56,0.12)' },
    'fab fa-font-awesome':    { color: '#00B22D', bg: 'rgba(0,178,45,0.12)' },
    'fab fa-snapchat':        { color: '#FFFC00', bg: 'rgba(255,252,0,0.18)' },
    'fab fa-linkedin':        { color: '#0A66C2', bg: 'rgba(10,102,194,0.12)' },
    'fab fa-linkedin-in':     { color: '#0A66C2', bg: 'rgba(10,102,194,0.12)' },
    'fab fa-vk':              { color: '#0077FF', bg: 'rgba(0,119,255,0.12)' },
    'fab fa-skype':           { color: '#00AFF0', bg: 'rgba(0,175,240,0.12)' },
    'fab fa-twitch':          { color: '#9146FF', bg: 'rgba(145,70,255,0.12)' },
    'fab fa-bitcoin':         { color: '#F7931A', bg: 'rgba(247,147,26,0.12)' },
    'fab fa-ethereum':        { color: '#627EEA', bg: 'rgba(98,126,234,0.12)' },
    'fab fa-netflix':         { color: '#E50914', bg: 'rgba(229,9,20,0.12)' },
    'fab fa-disney':          { color: '#113CCF', bg: 'rgba(17,60,207,0.12)' },
    'fab fa-airbnb':          { color: '#FF5A5F', bg: 'rgba(255,90,95,0.12)' },
    'fab fa-yahoo':           { color: '#6001D2', bg: 'rgba(96,1,210,0.12)' },
    'fab fa-alipay':          { color: '#1677FF', bg: 'rgba(22,119,255,0.12)' },
    'fab fa-ebay':            { color: '#E53238', bg: 'rgba(229,50,56,0.12)' },
    'fab fa-bilibili':        { color: '#00A1D6', bg: 'rgba(0,161,214,0.12)' },
    'fab fa-weibo':           { color: '#E6162D', bg: 'rgba(230,22,45,0.12)' },
    'fab fa-weixin':          { color: '#07C160', bg: 'rgba(7,193,96,0.12)' },
    'fab fa-line':            { color: '#00C300', bg: 'rgba(0,195,0,0.12)' },
    'fab fa-viber':           { color: '#7360F2', bg: 'rgba(115,96,242,0.12)' },
    'fab fa-nike':            { color: '#111111', bg: 'rgba(17,17,17,0.08)' },
    'fab fa-baidu':           { color: '#2932E1', bg: 'rgba(41,50,225,0.12)' },
    'fab fa-git':             { color: '#F05032', bg: 'rgba(240,80,50,0.12)' },
    'fab fa-stripe-s':        { color: '#635BFF', bg: 'rgba(99,91,255,0.12)' },
    'fab fa-odnoklassniki':   { color: '#EE8208', bg: 'rgba(238,130,8,0.12)' },
    'fab fa-yandex':          { color: '#FF0000', bg: 'rgba(255,0,0,0.12)' },
    'fab fa-spotify':         { color: '#1DB954', bg: 'rgba(29,185,84,0.12)' },
    'fab fa-reddit-alien':    { color: '#FF4500', bg: 'rgba(255,69,0,0.12)' },
    'fab fa-pinterest-p':     { color: '#BD081C', bg: 'rgba(189,8,28,0.12)' },
    'fab fa-venmo':           { color: '#3D95CE', bg: 'rgba(61,149,206,0.12)' },
    'fab fa-apple':           { color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'fab fa-slack':           { color: '#4A154B', bg: 'rgba(74,21,75,0.12)' },
    'fab fa-github':          { color: '#181717', bg: 'rgba(24,23,23,0.10)' },
  };

  // 1) If data.js already has an icon, use it with brand color
  if (icon && iconColorMap[icon]) {
    var mapped = iconColorMap[icon];
    return { html: '<i class="' + icon + '"></i>', color: mapped.color, bg: mapped.bg };
  }

  // 2) Name/ID based mapping for services with generic icons in data.js
  var nameMap = {
    'whatsapp':              { icon: 'fab fa-whatsapp',       color: '#25D366', bg: 'rgba(37,211,102,0.12)' },
    'telegram':              { icon: 'fab fa-telegram',       color: '#26A5E4', bg: 'rgba(38,165,228,0.12)' },
    'facebook':              { icon: 'fab fa-facebook-f',     color: '#1877F2', bg: 'rgba(24,119,242,0.12)' },
    'instagram':             { icon: 'fab fa-instagram',      color: '#E4405F', bg: 'rgba(228,64,95,0.12)' },
    'threads':               { icon: 'fab fa-instagram',      color: '#E4405F', bg: 'rgba(228,64,95,0.12)' },
    'tiktok':                { icon: 'fab fa-tiktok',         color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'douyin':                { icon: 'fab fa-tiktok',         color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'twitter':               { icon: 'fab fa-x-twitter',      color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'google':                { icon: 'fab fa-google',         color: '#4285F4', bg: 'rgba(66,133,244,0.12)' },
    'gmail':                 { icon: 'fab fa-google',         color: '#EA4335', bg: 'rgba(234,67,53,0.12)' },
    'youtube':               { icon: 'fab fa-youtube',        color: '#FF0000', bg: 'rgba(255,0,0,0.12)' },
    'amazon':                { icon: 'fab fa-amazon',         color: '#FF9900', bg: 'rgba(255,153,0,0.12)' },
    'discord':               { icon: 'fab fa-discord',        color: '#5865F2', bg: 'rgba(88,101,242,0.12)' },
    'microsoft':             { icon: 'fab fa-microsoft',      color: '#00A4EF', bg: 'rgba(0,164,239,0.12)' },
    'outlook':               { icon: 'fab fa-microsoft',      color: '#0078D4', bg: 'rgba(0,120,212,0.12)' },
    'uber':                  { icon: 'fab fa-uber',           color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'paypal':                { icon: 'fab fa-paypal',         color: '#003087', bg: 'rgba(0,48,135,0.12)' },
    'steam':                 { icon: 'fab fa-steam',          color: '#1B2838', bg: 'rgba(27,40,56,0.12)' },
    'fiverr':                { icon: 'fab fa-font-awesome',   color: '#00B22D', bg: 'rgba(0,178,45,0.12)' },
    'snapchat':              { icon: 'fab fa-snapchat',       color: '#FFFC00', bg: 'rgba(255,252,0,0.18)' },
    'linkedin':              { icon: 'fab fa-linkedin-in',    color: '#0A66C2', bg: 'rgba(10,102,194,0.12)' },
    'vkontakte':             { icon: 'fab fa-vk',             color: '#0077FF', bg: 'rgba(0,119,255,0.12)' },
    'в контакте':            { icon: 'fab fa-vk',             color: '#0077FF', bg: 'rgba(0,119,255,0.12)' },
    'skype':                 { icon: 'fab fa-skype',          color: '#00AFF0', bg: 'rgba(0,175,240,0.12)' },
    'twitch':                { icon: 'fab fa-twitch',         color: '#9146FF', bg: 'rgba(145,70,255,0.12)' },
    'tinder':                { icon: 'fas fa-fire',           color: '#FE3C72', bg: 'rgba(254,60,114,0.12)' },
    'signal':                { icon: 'fas fa-comment-dots',   color: '#3A76F0', bg: 'rgba(58,118,240,0.12)' },
    'viber':                 { icon: 'fab fa-viber',          color: '#7360F2', bg: 'rgba(115,96,242,0.12)' },
    'line':                  { icon: 'fab fa-line',           color: '#00C300', bg: 'rgba(0,195,0,0.12)' },
    'kakaotalk':             { icon: 'fas fa-comment',        color: '#FEE500', bg: 'rgba(254,229,0,0.15)' },
    'netflix':               { icon: 'fab fa-netflix',        color: '#E50914', bg: 'rgba(229,9,20,0.12)' },
    'disney+':               { icon: 'fab fa-disney',         color: '#113CCF', bg: 'rgba(17,60,207,0.12)' },
    'openai':                { icon: 'fas fa-brain',          color: '#10A37F', bg: 'rgba(16,163,127,0.12)' },
    'chatgpt':               { icon: 'fas fa-brain',          color: '#10A37F', bg: 'rgba(16,163,127,0.12)' },
    'claude':                { icon: 'fas fa-brain',          color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
    'deepseek':              { icon: 'fas fa-brain',          color: '#4F46E5', bg: 'rgba(79,70,229,0.12)' },
    'airbnb':                { icon: 'fab fa-airbnb',         color: '#FF5A5F', bg: 'rgba(255,90,95,0.12)' },
    'booking.com':           { icon: 'fas fa-hotel',          color: '#003580', bg: 'rgba(0,53,128,0.12)' },
    'yahoo':                 { icon: 'fab fa-yahoo',          color: '#6001D2', bg: 'rgba(96,1,210,0.12)' },
    'coinbase':              { icon: 'fas fa-circle-dollar-to-slot', color: '#0052FF', bg: 'rgba(0,82,255,0.12)' },
    'binance':               { icon: 'fas fa-coins',          color: '#F0B90B', bg: 'rgba(240,185,11,0.12)' },
    'bybit':                 { icon: 'fas fa-coins',          color: '#F7A600', bg: 'rgba(247,166,0,0.12)' },
    'okx':                   { icon: 'fas fa-coins',          color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'mexc':                  { icon: 'fas fa-coins',          color: '#0052FF', bg: 'rgba(0,82,255,0.12)' },
    'bitget':                { icon: 'fas fa-coins',          color: '#00F0FF', bg: 'rgba(0,240,255,0.12)' },
    'venmo':                 { icon: 'fab fa-venmo',          color: '#3D95CE', bg: 'rgba(61,149,206,0.12)' },
    'cash app':              { icon: 'fas fa-dollar-sign',    color: '#00C853', bg: 'rgba(0,200,83,0.12)' },
    'wise':                  { icon: 'fas fa-exchange-alt',   color: '#9FE870', bg: 'rgba(0,100,60,0.12)' },
    'skrill':                { icon: 'fas fa-credit-card',    color: '#8621A8', bg: 'rgba(134,33,168,0.12)' },
    'uphold':                { icon: 'fas fa-arrows-alt-v',   color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
    'lyft':                  { icon: 'fas fa-car',            color: '#FF00BF', bg: 'rgba(255,0,191,0.12)' },
    'bolt':                  { icon: 'fas fa-bolt',           color: '#34D058', bg: 'rgba(52,208,88,0.12)' },
    'grab':                  { icon: 'fas fa-taxi',           color: '#00B14F', bg: 'rgba(0,177,79,0.12)' },
    'aliexpress':            { icon: 'fab fa-alipay',         color: '#FF4747', bg: 'rgba(255,71,71,0.12)' },
    'taobao':                { icon: 'fab fa-alipay',         color: '#FF5000', bg: 'rgba(255,80,0,0.12)' },
    'ebay':                  { icon: 'fab fa-ebay',           color: '#E53238', bg: 'rgba(229,50,56,0.12)' },
    'shopee':                { icon: 'fas fa-shopping-bag',   color: '#EE4D2D', bg: 'rgba(238,77,45,0.12)' },
    'temu':                  { icon: 'fas fa-shopping-bag',   color: '#FB6527', bg: 'rgba(251,101,39,0.12)' },
    'nike':                  { icon: 'fab fa-nike',           color: '#111111', bg: 'rgba(17,17,17,0.08)' },
    'walmart':               { icon: 'fas fa-shopping-cart',  color: '#0071CE', bg: 'rgba(0,113,206,0.12)' },
    'bilibili':              { icon: 'fab fa-bilibili',       color: '#00A1D6', bg: 'rgba(0,161,214,0.12)' },
    'weibo':                 { icon: 'fab fa-weibo',          color: '#E6162D', bg: 'rgba(230,22,45,0.12)' },
    'xiaohongshu':           { icon: 'fas fa-sticky-note',    color: '#FF2442', bg: 'rgba(255,36,66,0.12)' },
    'rednote':               { icon: 'fas fa-sticky-note',    color: '#FF2442', bg: 'rgba(255,36,66,0.12)' },
    'roblox':                { icon: 'fas fa-gamepad',        color: '#E2231A', bg: 'rgba(226,35,26,0.12)' },
    'pubg':                  { icon: 'fas fa-gamepad',        color: '#F2A900', bg: 'rgba(242,169,0,0.12)' },
    'baidu':                 { icon: 'fab fa-baidu',          color: '#2932E1', bg: 'rgba(41,50,225,0.12)' },
    'yandex':                { icon: 'fab fa-yandex',         color: '#FF0000', bg: 'rgba(255,0,0,0.12)' },
    'zalo':                  { icon: 'fas fa-comment',        color: '#0068FF', bg: 'rgba(0,104,255,0.12)' },
    'zoho':                  { icon: 'fas fa-building',       color: '#D7282D', bg: 'rgba(215,40,45,0.12)' },
    'vercel':                { icon: 'fas fa-code',           color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'truecaller':            { icon: 'fas fa-phone',          color: '#0F82FF', bg: 'rgba(15,130,255,0.12)' },
    'authy':                 { icon: 'fas fa-shield-alt',     color: '#EC1C24', bg: 'rgba(236,28,36,0.12)' },
    'tradingview':           { icon: 'fas fa-chart-line',     color: '#2962FF', bg: 'rgba(41,98,255,0.12)' },
    'nvidia':                { icon: 'fas fa-microchip',      color: '#76B900', bg: 'rgba(118,185,0,0.12)' },
    'foodpanda':             { icon: 'fas fa-utensils',       color: '#D70C64', bg: 'rgba(215,12,100,0.12)' },
    'glovo':                 { icon: 'fas fa-utensils',       color: '#F6C744', bg: 'rgba(246,199,68,0.12)' },
    'wolt':                  { icon: 'fas fa-utensils',       color: '#336BFF', bg: 'rgba(51,107,255,0.12)' },
    'careem':                { icon: 'fas fa-taxi',           color: '#4CB050', bg: 'rgba(76,176,80,0.12)' },
    'blablacar':             { icon: 'fas fa-car',            color: '#0066FF', bg: 'rgba(0,102,255,0.12)' },
    'razer':                 { icon: 'fas fa-gamepad',        color: '#00FF00', bg: 'rgba(0,255,0,0.12)' },
    'ubisoft':               { icon: 'fas fa-gamepad',        color: '#0070FF', bg: 'rgba(0,112,255,0.12)' },
    'shein':                 { icon: 'fas fa-tshirt',         color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'zara':                  { icon: 'fas fa-tshirt',         color: '#000000', bg: 'rgba(0,0,0,0.08)' },
    'depop':                 { icon: 'fas fa-tshirt',         color: '#FF2D55', bg: 'rgba(255,45,85,0.12)' },
    'vinted':                { icon: 'fas fa-tshirt',         color: '#00C1B5', bg: 'rgba(0,193,181,0.12)' },
    'poshmark':              { icon: 'fas fa-tshirt',         color: '#C80C5A', bg: 'rgba(200,12,90,0.12)' },
    'etsy':                  { icon: 'fas fa-palette',        color: '#F1641E', bg: 'rgba(241,100,30,0.12)' },
    'olx':                   { icon: 'fas fa-tag',            color: '#3276D1', bg: 'rgba(50,118,209,0.12)' },
    'swiggy':                { icon: 'fas fa-utensils',       color: '#FC8019', bg: 'rgba(252,128,25,0.12)' },
    'flipkart':              { icon: 'fas fa-shopping-cart',  color: '#2874F0', bg: 'rgba(40,116,240,0.12)' },
    'wildberries':           { icon: 'fas fa-shopping-bag',   color: '#A80044', bg: 'rgba(168,0,68,0.12)' },
    'ozon':                  { icon: 'fas fa-shopping-cart',  color: '#005BFF', bg: 'rgba(0,91,255,0.12)' },
    'trendyol':              { icon: 'fas fa-shopping-bag',   color: '#F22E52', bg: 'rgba(242,46,82,0.12)' },
    'meituan':               { icon: 'fas fa-utensils',       color: '#FFC300', bg: 'rgba(255,195,0,0.12)' },
    'pof':                   { icon: 'fas fa-fish',           color: '#004B8D', bg: 'rgba(0,75,141,0.12)' },
    'badoo':                 { icon: 'fas fa-heart',          color: '#7B2D8E', bg: 'rgba(123,45,142,0.12)' },
    'bumble':                { icon: 'fas fa-bolt',           color: '#FFC629', bg: 'rgba(255,198,41,0.12)' },
    'hinge':                 { icon: 'fas fa-heart',          color: '#7B61FF', bg: 'rgba(123,97,255,0.12)' },
    'likee':                 { icon: 'fas fa-video',          color: '#EE1D52', bg: 'rgba(238,29,82,0.12)' },
    'rumble':                { icon: 'fas fa-video',          color: '#85C742', bg: 'rgba(133,199,66,0.12)' },
    'kwai':                  { icon: 'fas fa-video',          color: '#FF4906', bg: 'rgba(255,73,6,0.12)' },
    'azar':                  { icon: 'fas fa-video',          color: '#FF5722', bg: 'rgba(255,87,34,0.12)' },
    'gitcoin':               { icon: 'fab fa-git',            color: '#0ACF83', bg: 'rgba(10,207,131,0.12)' },
    'wechat':                { icon: 'fab fa-weixin',         color: '#07C160', bg: 'rgba(7,193,96,0.12)' },
    'weixin':                { icon: 'fab fa-weixin',         color: '#07C160', bg: 'rgba(7,193,96,0.12)' },
    'booking':               { icon: 'fas fa-hotel',          color: '#003580', bg: 'rgba(0,53,128,0.12)' },
    'ticketmaster':          { icon: 'fas fa-ticket-alt',     color: '#026DFE', bg: 'rgba(2,109,254,0.12)' },
    'jd':                    { icon: 'fas fa-shopping-cart',  color: '#E4393C', bg: 'rgba(228,57,60,0.12)' },
    '京东':                  { icon: 'fas fa-shopping-cart',  color: '#E4393C', bg: 'rgba(228,57,60,0.12)' },
    'chime':                 { icon: 'fas fa-university',     color: '#00A3E0', bg: 'rgba(0,163,224,0.12)' },
    'bofa':                  { icon: 'fas fa-university',     color: '#012169', bg: 'rgba(1,33,105,0.12)' },
    'bank of america':       { icon: 'fas fa-university',     color: '#012169', bg: 'rgba(1,33,105,0.12)' },
    'sber':                  { icon: 'fas fa-university',     color: '#21A038', bg: 'rgba(33,160,56,0.12)' },
    'caixa':                 { icon: 'fas fa-university',     color: '#003C71', bg: 'rgba(0,60,113,0.12)' },
    'go2bank':               { icon: 'fas fa-university',     color: '#0072CE', bg: 'rgba(0,114,206,0.12)' },
    'monese':                { icon: 'fas fa-euro-sign',      color: '#14CCCC', bg: 'rgba(20,204,204,0.12)' },
    'paypay':                { icon: 'fas fa-credit-card',    color: '#FF0000', bg: 'rgba(255,0,0,0.12)' },
    'picpay':                { icon: 'fas fa-credit-card',    color: '#21C25E', bg: 'rgba(33,194,94,0.12)' },
    'papara':                { icon: 'fas fa-credit-card',    color: '#6C3FC5', bg: 'rgba(108,63,197,0.12)' },
    'paysafe':               { icon: 'fas fa-credit-card',    color: '#F05A22', bg: 'rgba(240,90,34,0.12)' },
    'affirm':                { icon: 'fas fa-credit-card',    color: '#4A90D9', bg: 'rgba(74,144,217,0.12)' },
    'credit karma':          { icon: 'fas fa-chart-line',     color: '#29B6F6', bg: 'rgba(41,182,246,0.12)' },
    'any other':             { icon: 'fas fa-globe',          color: '#0d9b7a', bg: 'rgba(13,155,122,0.12)' },
    'any':                   { icon: 'fas fa-globe',          color: '#0d9b7a', bg: 'rgba(13,155,122,0.12)' },
  };
  
  // Match by name (longer keys first)
  var keys = Object.keys(nameMap).sort(function(a, b) { return b.length - a.length; });
  for (var i = 0; i < keys.length; i++) {
     if (name.indexOf(keys[i]) !== -1) { var m = nameMap[keys[i]]; return { html: '<i class="' + m.icon + '"></i>', color: m.color, bg: m.bg }; }
  }
  
  // Match by id
  var idMap = {
    'wa': 'whatsapp', 'tg': 'telegram', 'fb': 'facebook', 'ig': 'instagram',
    'tk': 'tiktok', 'tw': 'twitter', 'vb': 'viber', 'sk': 'skype',
    'nf': 'netflix', 'ub': 'uber', 'gv': 'google'
  };
  if (idMap[id]) { var m2 = nameMap[idMap[id]]; return { html: '<i class="' + m2.icon + '"></i>', color: m2.color, bg: m2.bg }; }
  
  // If data.js had an icon but no color match, use generic dark color
  if (icon) {
    return { html: '<i class="' + icon + '"></i>', color: '#374151', bg: 'rgba(55,65,81,0.08)' };
  }
  
  // Default fallback
  return { html: '<i class="fas fa-mobile-alt"></i>', color: 'var(--text-secondary)', bg: 'rgba(0,0,0,0.05)' };
}

function renderNumbersPage(main) {
  // FIX: Only show WAITING numbers in active section
  // Received/expired numbers enter 4-min grace period silently, then move to history
  var waitingOnlyNumbers = activeNumbers ? activeNumbers.filter(function(n) { return n.status === 'waiting' || n.status === 'received'; }) : [];
  var totalActive = waitingOnlyNumbers.length;

  // FIX: Start grace period for received/expired numbers (silent 4-min countdown)
  if (activeNumbers) {
    activeNumbers.forEach(function(n) {
      if (n.status === 'received' || n.status === 'expired') {
        startGracePeriod(n.id);
      }
    });
  }

  var activeNumbersHTML = totalActive > 0
    ? waitingOnlyNumbers.map(renderActiveNumberCard).join('')
    : '<div style="padding:22px;border:1px dashed var(--border);border-radius:14px;color:var(--text-secondary);font-size:14px;">No active numbers yet. Buy one from below.</div>';

  var mobileSearchHTML = '<div class="mobile-search-wrapper" style="margin-bottom:20px;">' +
    '<div style="position:relative;">' +
      '<i class="fas fa-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;"></i>' +
      '<input type="text" id="mobileServiceSearch" placeholder="Search services..." style="width:100%;padding:12px 14px 12px 40px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;color:var(--text-primary);font-size:14px;font-family:inherit;outline:none;transition:all 0.2s;" onfocus="this.style.borderColor=\'var(--accent)\';this.style.boxShadow=\'0 0 0 3px var(--accent-dim)\'" onblur="this.style.borderColor=\'var(--border)\';this.style.boxShadow=\'none\'" oninput="filterMobileServices(this.value)">' +
    '</div>' +
  '</div>';

  var serviceGridHTML = '<div id="mobileServiceGridWrapper" style="margin-bottom:28px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
      '<h2 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;">' +
        '<i class="fas fa-shopping-cart" style="color:var(--accent);font-size:16px;"></i> Get Virtual Number</h2>' +
    '</div>' +
    '<div id="mobileServiceGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;">' +
      getDashboardServiceListHTML() +
    '</div>' +
  '</div>';

    // ✅ FIX: Added scroll-down chevron button
  var scrollDownBtn = totalActive > 0 ? 
    '<div style="text-align:center;margin-top:12px;">' +
      '<button onclick="document.getElementById(\'mobileServiceGridWrapper\').scrollIntoView({behavior:\'smooth\',block:\'start\'})" ' +
        'style="display:inline-flex;align-items:center;gap:6px;padding:8px 20px;background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent);border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit;" ' +
        'onmouseover="this.style.background=\'var(--accent)\';this.style.color=\'#fff\'" ' +
        'onmouseout="this.style.background=\'var(--accent-dim)\';this.style.color=\'var(--accent)\'">' +
        '<i class="fas fa-chevron-down"></i> Browse Services Below' +
      '</button>' +
    '</div>' : '';

  var activeSectionHTML = '<div id="activeNumbersSection" style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:var(--shadow-sm);margin-bottom:28px;">' +
    '<div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
        '<h2 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:10px;">' +
          '<i class="fas fa-phone-alt" style="color:var(--accent);font-size:15px;"></i> Active Numbers</h2>' +
        '<span style="font-size:12px;padding:3px 10px;border-radius:8px;font-weight:600;background:var(--cent-dim);color:var(--accent);">' + totalActive + ' active</span>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;">' + activeNumbersHTML + '</div>' +
      scrollDownBtn +
    '</div>' +
  '</div>';

  var infoSectionsHTML = 
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-bottom:28px;">' +
      '<div style="background:rgba(13,155,122,0.08);border:1px solid rgba(13,155,122,0.2);border-radius:12px;padding:16px;box-shadow:var(--shadow-sm);">' +
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--accent);">No Cancellations Within 45s</h3>' +
        '<p style="font-size:12px;color:var(--text-secondary);line-height:1.5;">Orders cannot be canceled within 45 seconds after a number is purchased.</p>' +
      '</div>' +
      '<div style="background:rgba(13,155,122,0.08);border:1px solid rgba(13,155,122,0.2);border-radius:12px;padding:16px;box-shadow:var(--shadow-sm);">' +
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--accent);">SMS Not Received?</h3>' +
        '<p style="font-size:12px;color:var(--text-secondary);line-height:1.5;">Try removing the country code from the number and attempt again.</p>' +
      '</div>' +
      '<div style="background:rgba(13,155,122,0.08);border:1px solid rgba(13,155,122,0.2);border-radius:12px;padding:16px;box-shadow:var(--shadow-sm);">' +
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--accent);">Automatic Refunds</h3>' +
        '<p style="font-size:12px;color:var(--text-secondary);line-height:1.5;">Funds will be automatically refunded to your wallet if the request times out or is canceled.</p>' +
      '</div>' +
    '</div>' +
    '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:28px;box-shadow:var(--shadow-sm);margin-bottom:28px;">' +
      '<h2 style="font-size:22px;font-weight:700;margin-bottom:16px;">Why use temporary phone numbers</h2>' +
      '<p style="font-size:14px;color:var(--text-secondary);line-height:1.8;margin-bottom:14px;">When creating accounts, most websites require a valid mobile number. Temporary numbers let you create and manage multiple accounts without limitations.</p>' +
      '<p style="font-size:14px;color:var(--text-secondary);line-height:1.8;margin-bottom:14px;"><strong>Protect your privacy</strong> — Your personal phone number can reveal sensitive details. Using temporary numbers helps keep your identity secure.</p>' +
      '<p style="font-size:14px;color:var(--text-secondary);line-height:1.8;"><strong>Bypass regional restrictions</strong> — Temporary numbers from different countries allow you to register on platforms without geographic barriers.</p>' +
    '</div>';

  main.innerHTML = 
    mobileSearchHTML + 
    serviceGridHTML + 
    activeSectionHTML + 
    infoSectionsHTML;
}

/* ===== MOBILE SEARCH FILTER ===== */
window.filterMobileServices = function(query) {
  query = query.toLowerCase().trim();
  var grid = document.getElementById('mobileServiceGrid');
  if (!grid) return;

  var items = grid.children;
  for (var i = 0; i < items.length; i++) {
    var serviceName = items[i].textContent.toLowerCase();
    if (query === '' || serviceName.indexOf(query) !== -1) {
      items[i].style.display = ''; 
    } else {
      items[i].style.display = 'none'; 
    }
  }
};

/* ===== Card for combined Number + Code display ===== */
function renderActiveNumberCard(n) {
  // FIXED: Calculate time from timestamp, not stale time_left
  var totalTime = n.total_time || n.totalTime || 300;
  var createdTimestamp = n.created_at;
  
  // Handle ALL timestamp formats robustly
  if (typeof createdTimestamp === 'string') {
    createdTimestamp = new Date(createdTimestamp).getTime();
    // If ISO parse failed, try SQLite format "2025-01-15 10:00:00"
    if (isNaN(createdTimestamp)) {
      createdTimestamp = new Date(createdTimestamp.replace(' ', 'T') + 'Z').getTime();
    }
  } else if (createdTimestamp instanceof Date) {
    createdTimestamp = createdTimestamp.getTime();
  } else if (typeof createdTimestamp === 'number') {
    // If it's a Unix timestamp in seconds (not milliseconds), convert
    if (createdTimestamp < 10000000000) createdTimestamp *= 1000;
  } else {
    createdTimestamp = null;
  }
  
  var timeLeft;
  if (createdTimestamp && !isNaN(createdTimestamp)) {
    // Calculate from actual timestamp
    var elapsedSeconds = Math.floor((Date.now() - createdTimestamp) / 1000);
    if (elapsedSeconds < 0) elapsedSeconds = 0;
    timeLeft = totalTime - elapsedSeconds;
  } else {
    // Fallback: use time_left from DB (shouldn't happen with Fix 1)
    timeLeft = (n.time_left !== undefined && n.time_left !== null) ? n.time_left : (n.timeLeft || totalTime);
  }
  
  // Cap at 0 minimum
  if (timeLeft < 0) timeLeft = 0;
  
  var serviceName = n.service_name || (n.service ? n.service.name : 'Unknown');
  var minutes = Math.floor(timeLeft / 60);
  var seconds = timeLeft % 60;
  var timerDisplay = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  var existingIcon = n.service_icon || (n.service ? n.service.icon : '');
  var ico = getServiceIconData(serviceName, n.service_id, existingIcon);
  
  var countryFlag = n.country_flag || getFlagFromPhone(n.phone, n.countryCode, n.country_code);
  var phoneDisplay = (n.phone.charAt(0) !== '+' ? '+' : '') + n.phone;
  var phoneCopy = phoneDisplay;
  
  var statusColors = { waiting: 'var(--warning)', received: 'var(--accent)', expired: 'var(--danger)' };
  var statusLabels = { waiting: 'Waiting', received: 'Code Received', expired: 'Timeout' };
  var statusColor = statusColors[n.status] || 'var(--text-muted)';
  var statusLabel = statusLabels[n.status] || n.status;

  var codeDisplay = '';
  if (n.status === 'received' && n.code) {
    codeDisplay = '<div style="font-family:JetBrains Mono,monospace;font-size:16px;font-weight:800;color:var(--accent);letter-spacing:3px;margin:0 8px;">' + n.code + '</div>';
  }

  var cancelBtn = (n.status === 'waiting')
    ? '<button class="btn-sm cancel" onclick="cancelNumber(' + n.id + ')" style="padding:4px 8px;font-size:11px;background:var(--danger);color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-times"></i></button>'
    : '';

  // ✅ FIX: Only show timer for WAITING status, not for received or expired
  var timerHTML = '';
  if (n.status === 'waiting') {
    timerHTML = '<span style="font-family:JetBrains Mono,monospace;font-size:11px;font-weight:600;color:' + statusColor + ';min-width:35px;text-align:right;" id="timer-active-' + n.id + '" data-total-time="' + totalTime + '" data-created-at="' + (n.created_at || '') + '">' + timerDisplay + '</span>';
  }

  return '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:12px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;' + (n.status === 'received' ? 'border-left:3px solid var(--accent);' : '') + '">' +
    '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:150px;">' +
      '<div style="font-size:18px;flex-shrink:0;">' + countryFlag + '</div>' +
      '<div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;background:' + ico.bg + ';color:' + ico.color + ';">' +
        ico.html +
      '</div>' +
      '<div style="font-family:JetBrains Mono,monospace;font-size:13px;font-weight:700;word-break:break-all;">' + phoneDisplay + '</div>' +
      '<button class="btn-sm copy" onclick="copyNumber(\'' + phoneCopy + '\')" style="padding:4px 6px;font-size:10px;flex-shrink:0;"><i class="fas fa-copy"></i></button>' +
    '</div>' +
    codeDisplay +
    '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
      timerHTML +
      '<span style="font-size:11px;font-weight:700;color:var(--accent);min-width:30px;text-align:right;">$' + n.cost.toFixed(2) + '</span>' +
      cancelBtn +
    '</div>' +
  '</div>';
}

// ===== REPLACE checkExpiredNumbers WITH THIS VERSION =====
async function checkExpiredNumbers() {
  if (!window.activeNumbers || window.activeNumbers.length === 0) return;
  
  var changed = false;
  
  for (var i = 0; i < window.activeNumbers.length; i++) {
    var n = window.activeNumbers[i];
    
    // ✅ FIX: Skip timer updates for received/expired numbers
    if (n.status !== 'waiting') continue;
    
    var timerEl = document.getElementById('timer-active-' + n.id);
    if (!timerEl) continue;
    
    // ===== FIX: Calculate from real timestamp, not DOM text =====
    var totalTime = parseInt(timerEl.dataset.totalTime) || 300;
    var createdAt = timerEl.dataset.createdAt;
    var timeLeft = totalTime;
    
    if (createdAt) {
      var ts = new Date(createdAt).getTime();
      if (isNaN(ts)) {
        ts = new Date(createdAt.replace(' ', 'T') + 'Z').getTime();
      }
      if (!isNaN(ts)) {
        var elapsed = Math.floor((Date.now() - ts) / 1000);
        if (elapsed < 0) elapsed = 0;
        timeLeft = totalTime - elapsed;
      }
    } else {
      // Fallback: read DOM and decrement (only if no timestamp)
      var timeStr = timerEl.textContent.trim();
      var parts = timeStr.split(':');
      timeLeft = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
      if (timeLeft > 0) timeLeft--;
    }
    
    if (timeLeft < 0) timeLeft = 0;
    
    // Update display
    var minutes = Math.floor(timeLeft / 60);
    var seconds = timeLeft % 60;
    timerEl.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    
    // Check SMS-Bus status every 10 seconds (not every second to avoid rate limits)
    if (timeLeft % 10 === 0 || timeLeft === 0) {
      (function(number) {
        smsbusCheckStatus(number.id)
          .then(function(statusData) {
            var smsStatus = statusData.status;
            var smsCode = statusData.sms_code || '';
            
            if (smsStatus === 'received' && smsCode) {
              number.status = 'received';
              number.code = smsCode;
              number.sms_text = statusData.sms_text || ('Your verification code is ' + smsCode);
              changed = true;
              
              showToast('SMS received! Code: ' + smsCode, 'success');
              
              fetch('/api/numbers/' + number.id + '/code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: smsCode, smsText: number.sms_text })
              }).catch(function() {});
              
              if (typeof startGracePeriod === 'function') startGracePeriod(number.id);
              
              // ✅ FIX: Re-render to hide timer when code received
              if (window.currentPage === 'numbers') renderMainContent();
            } else if (smsStatus === 'expired') {
              number.status = 'expired';
              changed = true;
              showToast('Number expired', 'error');
              
              smsbusCancelActivation(number.id).catch(function() {});
              fetch('/api/numbers/' + number.id + '/expire', { method: 'POST' }).catch(function() {});
              if (typeof loadBalance === 'function') loadBalance();
              if (window.currentPage === 'numbers') renderMainContent();
            }
          })
          .catch(function(err) {
            console.warn('Status check error for', number.id, ':', err.message);
          });
      })(n);
    }
    
    // Handle local timer expiry
    if (timeLeft <= 0 && n.status === 'waiting') {
      n.status = 'expired';
      changed = true;
      showToast('Number expired', 'error');
      smsbusCancelActivation(n.id).catch(function() {});
      fetch('/api/numbers/' + n.id + '/expire', { method: 'POST' }).catch(function() {});
      if (typeof loadBalance === 'function') loadBalance();
      if (window.currentPage === 'numbers') renderMainContent();
    }
  }
}

/* ===== DYNAMIC SERVICE GRID (Matches desktop sidebar data) ===== */
function getDashboardServiceListHTML() {
  if (typeof services === 'undefined' || !services || services.length === 0) {
    return '<div style="padding:20px;text-align:center;color:var(--danger);font-size:14px;">Services data not loaded. Check data.js</div>';
  }
  
  return services.map(function(s) {
    var name = s.name || 'Unknown';
    var price = (s.price || 0).toFixed(2);
    var id = s.id || 'other';
    var availableText = (s.available !== undefined && s.available !== null) ? s.available.toLocaleString() + ' pc' : '';
    var ico = getServiceIconData(name, id, s.icon);
    
    return '<div style="padding:16px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;text-align:center;box-shadow:var(--shadow-sm);cursor:pointer;transition:all 0.2s;" ' +
      'onmouseover="this.style.boxShadow=\'var(--shadow-md)\';this.style.borderColor=\'var(--accent)\'" ' +
      'onmouseout="this.style.boxShadow=\'var(--shadow-sm)\';this.style.borderColor=\'var(--border)\'" ' +
      'onclick="openModalById(\'' + id + '\')">' +
      '<div style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:18px;background:' + ico.bg + ';color:' + ico.color + ';">' +
      ico.html + '</div>' +
      '<div style="font-size:12px;font-weight:600;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + name + '</div>' +
      (availableText ? '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + availableText + '</div>' : '') +
      '<div style="font-size:13px;font-weight:700;color:var(--accent);">$' + price + '</div></div>';
  }).join('');
}
  
  // ===== UNIFIED HISTORY SYSTEM =====
window.unifiedHistory = {
  sms: [],
  rent: [],
  cards: [],
  gift: [],
  loading: false,
  loaded: false,
  activeTab: 'sms'
};

// Cache history to localStorage for instant loading
function getHistoryCacheKey() {
  var ue = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  return 'unified_history_' + (ue || 'guest');
}

function saveHistoryToCache() {
  try {
    var cache = {
      sms: window.unifiedHistory.sms.slice(0, 100), // Keep last 100
      rent: window.unifiedHistory.rent.slice(0, 50),
      cards: window.unifiedHistory.cards.slice(0, 50),
      gift: window.unifiedHistory.gift.slice(0, 50),
      timestamp: Date.now()
    };
    localStorage.setItem(getHistoryCacheKey(), JSON.stringify(cache));
  } catch (e) {}
}

function loadHistoryFromCache() {
  try {
    var raw = localStorage.getItem(getHistoryCacheKey());
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed.sms) window.unifiedHistory.sms = parsed.sms;
      if (parsed.rent) window.unifiedHistory.rent = parsed.rent;
      if (parsed.cards) window.unifiedHistory.cards = parsed.cards;
      if (parsed.gift) window.unifiedHistory.gift = parsed.gift;
      return true;
    }
  } catch (e) {}
  return false;
}

// Load all history in PARALLEL (fast)
window.loadUnifiedHistory = async function() {
  if (window.unifiedHistory.loading) return;
  window.unifiedHistory.loading = true;
  
  var email = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  if (!email) {
    window.unifiedHistory.loading = false;
    return;
  }
  
  var hadCacheData = window.unifiedHistory.sms.length > 0 || 
                     window.unifiedHistory.rent.length > 0 || 
                     window.unifiedHistory.cards.length > 0;
  
  try {
    var results = await Promise.allSettled([
      fetch('/api/history/' + email, { headers: { 'Accept': 'application/json' } })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),
      fetch('/api/rentals/' + email, { headers: { 'Accept': 'application/json' } })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),
      fetch('/api/cards/' + email, { headers: { 'Accept': 'application/json' } })
        .then(r => r.ok ? r.json() : [])
        .catch(() => [])
    ]);
    
    // Process SMS history
    var smsData = results[0].status === 'fulfilled' ? results[0].value : [];
    if (Array.isArray(smsData)) {
      window.unifiedHistory.sms = smsData.map(function(h) {
        var mappedStatus;
        if (h.status === 'success' || h.status === 'received' || h.status === 'code_received') {
          mappedStatus = 'received';
        } else if (h.status === 'cancelled' || h.status === 'canceled') {
          mappedStatus = 'cancelled';
        } else if (h.status === 'expired' || h.status === 'timeout' || h.status === 'failed') {
          mappedStatus = 'expired';
        } else {
          mappedStatus = h.code ? 'received' : 'expired';
        }
        
        return {
          type: 'sms',
          id: h.id,
          phone: h.phone,
          service_name: h.service_name || 'Unknown',
          service_id: h.service_id,
          service_icon: h.service_icon,
          country_flag: h.country_flag,
          country_code: h.countryCode || h.country_code,
          code: h.code,
          cost: parseFloat(h.cost) || 0,
          status: mappedStatus,
          created_at: h.created_at
        };
      });
    }
    
    // Process Rent history
    var rentData = results[1].status === 'fulfilled' ? results[1].value : [];
    if (Array.isArray(rentData)) {
      var activeRentIds = (typeof activeRentals !== 'undefined') ? activeRentals.map(function(r) { return r.id; }) : [];
      window.unifiedHistory.rent = rentData
        .filter(function(r) { return activeRentIds.indexOf(r.id) === -1; })
        .map(function(r) {
          return {
            type: 'rent',
            id: r.id,
            phone: r.phone,
            country_flag: r.countryFlag || '🌍',
            country_code: r.countryCode,
            cost: parseFloat(r.cost) || 0,
            status: r.status || 'cancelled',
            created_at: r.createdAt || r.created_at,
            expires_at: r.expiresAt,
            plan_name: r.planName
          };
        });
    }
    
    // Process Cards history
    var cardData = results[2].status === 'fulfilled' ? results[2].value : [];
    if (Array.isArray(cardData)) {
      var cards = cardData.cards || cardData;
      if (Array.isArray(cards)) {
        window.unifiedHistory.cards = cards.map(function(c) {
          return {
            type: 'card',
            id: c.id,
            cardType: c.cardType,
            fullNumber: c.fullNumber,
            cardHolderName: c.cardHolderName,
            balance: parseFloat(c.balance) || 0,
            status: c.frozen ? 'frozen' : 'active',
            created_at: c.createdAt || c.created_at
          };
        });
      }
    }
    
    window.unifiedHistory.gift = [];
    window.unifiedHistory.loaded = true;
    saveHistoryToCache();
    
    if (window.currentPage === 'history') {
      var container = document.getElementById('historyTabContent');
      if (container) {
        renderHistoryTabContent(container);
      }
      
      var newSmsCount = window.unifiedHistory.sms.length;
      var newRentCount = window.unifiedHistory.rent.length;
      var newCardsCount = window.unifiedHistory.cards.length;
      
      if (newSmsCount !== hadCacheData || newRentCount !== hadCacheData || newCardsCount !== hadCacheData) {
        renderHistoryPage(document.getElementById('mainContent') || document.getElementById('appContent'));
      }
    }
    
  } catch (err) {
    console.warn('Failed to load unified history:', err.message);
  } finally {
    window.unifiedHistory.loading = false;
  }
};

window.switchHistoryTab = function(tab) {
  window.unifiedHistory.activeTab = tab;
  var container = document.getElementById('historyTabContent');
  if (container) {
    renderHistoryTabContent(container);
  }
  // Update tab button styles
  document.querySelectorAll('.history-tab-btn').forEach(function(btn) {
    if (btn.dataset.tab === tab) {
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
    } else {
      btn.style.background = 'var(--bg-primary)';
      btn.style.color = 'var(--text-secondary)';
    }
  });
};

function renderHistoryTabContent(container) {
  var tab = window.unifiedHistory.activeTab;
  var items = [];
  var emptyIcon = 'fas fa-inbox';
  var emptyText = 'No history yet';
  
  if (tab === 'sms') {
    items = window.unifiedHistory.sms;
    emptyIcon = 'fas fa-comment-dots';
    emptyText = 'No SMS history yet';
  } else if (tab === 'rent') {
    items = window.unifiedHistory.rent;
    emptyIcon = 'fas fa-phone-alt';
    emptyText = 'No rent history yet';
  } else if (tab === 'cards') {
    items = window.unifiedHistory.cards;
    emptyIcon = 'far fa-credit-card';
    emptyText = 'No card history yet';
  } else if (tab === 'gift') {
    items = window.unifiedHistory.gift;
    emptyIcon = 'fas fa-gift';
    emptyText = 'No gift card history yet';
  }
  
  if (items.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:48px 20px;">' +
      '<i class="' + emptyIcon + '" style="font-size:40px;color:var(--text-muted);opacity:0.2;display:block;margin-bottom:14px;"></i>' +
      '<p style="font-size:14px;color:var(--text-muted);margin:0;">' + emptyText + '</p></div>';
    return;
  }
  
  var html = items.map(function(item) {
    if (tab === 'sms') return renderSmsHistoryItem(item);
    if (tab === 'rent') return renderRentHistoryItem(item);
    if (tab === 'cards') return renderCardHistoryItem(item);
    if (tab === 'gift') return renderGiftHistoryItem(item);
    return '';
  }).join('');
  
  container.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;">' + html + '</div>';
}

function renderSmsHistoryItem(h) {
  var service = (typeof services !== 'undefined') ? services.find(function(s) { return s.name.toLowerCase() === (h.service_name || '').toLowerCase(); }) : null;
  var ico = getServiceIconData(h.service_name, h.service_id, service ? service.icon : h.service_icon);
  var countryFlag = h.country_flag || getFlagFromPhone(h.phone, h.country_code);
  var phoneDisplay = (h.phone || '').charAt(0) !== '+' ? '+' + h.phone : h.phone;
  
  var statusColor, statusLabel;
  if (h.status === 'received' || h.status === 'success') {
    statusColor = 'var(--accent)';
    statusLabel = 'Code Received';
  } else if (h.status === 'cancelled') {
    statusColor = 'var(--text-muted)';
    statusLabel = 'Cancelled';
  } else {
    statusColor = 'var(--danger)';
    statusLabel = 'Timeout';
  }
  
  var codeDisplay = h.code ? '<div style="font-family:JetBrains Mono,monospace;font-size:14px;font-weight:800;color:var(--accent);letter-spacing:2px;margin:0 8px;">' + h.code + '</div>' : '';
  var dateStr = h.created_at ? new Date(h.created_at).toLocaleDateString() + ' ' + new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  
  return '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:12px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">' +
    '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:150px;">' +
      '<div style="font-size:18px;flex-shrink:0;">' + countryFlag + '</div>' +
      '<div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;background:' + ico.bg + ';color:' + ico.color + ';">' + ico.html + '</div>' +
      '<div><div style="font-size:11px;color:var(--text-muted);">' + (h.service_name || 'Unknown') + '</div>' +
      '<div style="font-family:JetBrains Mono,monospace;font-size:13px;font-weight:700;">' + phoneDisplay + '</div></div>' +
    '</div>' +
    codeDisplay +
    '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' +
      '<span style="font-size:10px;padding:3px 8px;border-radius:6px;font-weight:600;background:' + statusColor + '22;color:' + statusColor + ';white-space:nowrap;">' + statusLabel + '</span>' +
      '<span style="font-size:11px;font-weight:700;color:var(--accent);">$' + (h.cost || 0).toFixed(2) + '</span>' +
    '</div>' +
    (dateStr ? '<div style="width:100%;font-size:10px;color:var(--text-muted);margin-top:4px;">' + dateStr + '</div>' : '') +
  '</div>';
}

function renderRentHistoryItem(r) {
  var phoneDisplay = (r.phone || '').charAt(0) !== '+' ? '+' + r.phone : r.phone;
  var dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
  var expiresStr = r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '';
  
  var statusColor, statusLabel;
  if (r.status === 'cancelled') {
    statusColor = 'var(--text-muted)';
    statusLabel = 'Cancelled';
  } else if (r.status === 'expired') {
    statusColor = 'var(--danger)';
    statusLabel = 'Expired';
  } else {
    statusColor = 'var(--accent)';
    statusLabel = 'Completed';
  }
  
  return '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:14px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span style="font-size:24px;">' + (r.country_flag || '🌍') + '</span>' +
        '<div><div style="font-family:JetBrains Mono,monospace;font-size:15px;font-weight:700;">' + phoneDisplay + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);">' + (r.plan_name || '1 Month') + '</div></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:10px;padding:3px 8px;border-radius:6px;font-weight:600;background:' + statusColor + '22;color:' + statusColor + ';">' + statusLabel + '</span>' +
        '<span style="font-size:13px;font-weight:700;color:var(--accent);">$' + (r.cost || 0).toFixed(2) + '</span>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);">' +
      '<span>Rented: ' + dateStr + '</span>' +
      (expiresStr ? '<span>Expired: ' + expiresStr + '</span>' : '') +
    '</div>' +
  '</div>';
}

function renderCardHistoryItem(c) {
  var cardType = virtualCardTypes.find(function(t) { return t.id === c.cardType; });
  var gradient = cardType ? cardType.gradient : 'linear-gradient(135deg, #1a1a2e, #16213e)';
  var brand = cardType ? cardType.brand : 'VISA';
  var typeName = cardType ? cardType.name : 'Virtual Card';
  var maskedNum = c.fullNumber ? c.fullNumber.replace(/\d(?=.{4})/g, '•') : '•••• •••• •••• ••••';
  
  var statusColor = c.status === 'frozen' ? 'var(--warning)' : 'var(--accent)';
  var statusLabel = c.status === 'frozen' ? 'Frozen' : 'Active';
  
  return '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:14px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="width:44px;height:28px;border-radius:6px;background:' + gradient + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:rgba(255,255,255,0.9);letter-spacing:1px;">' + brand + '</div>' +
        '<div><div style="font-size:13px;font-weight:600;">' + typeName + '</div>' +
        '<div style="font-family:JetBrains Mono,monospace;font-size:12px;color:var(--text-muted);">' + maskedNum + '</div></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:10px;padding:3px 8px;border-radius:6px;font-weight:600;background:' + statusColor + '22;color:' + statusColor + ';">' + statusLabel + '</span>' +
        '<span style="font-size:13px;font-weight:700;color:var(--accent);">$' + (c.balance || 0).toFixed(2) + '</span>' +
      '</div>' +
    '</div>' +
    (c.created_at ? '<div style="font-size:11px;color:var(--text-muted);">Created: ' + new Date(c.created_at).toLocaleDateString() + '</div>' : '') +
  '</div>';
}

function renderGiftHistoryItem(g) {
  return '<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:14px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span style="font-size:24px;">🎁</span>' +
        '<div><div style="font-size:13px;font-weight:600;">' + (g.name || 'Gift Card') + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted);">' + (g.email || '') + '</div></div>' +
      '</div>' +
      '<span style="font-size:13px;font-weight:700;color:var(--accent);">$' + (g.amount || 0).toFixed(2) + '</span>' +
    '</div>' +
  '</div>';
}

function renderHistoryPage(main) {
  // ✅ FIX: Load from cache IMMEDIATELY before rendering
  if (!window.unifiedHistory.loaded) {
    loadHistoryFromCache();
  }
  
  var tab = window.unifiedHistory.activeTab;
  var smsCount = window.unifiedHistory.sms.length;
  var rentCount = window.unifiedHistory.rent.length;
  var cardsCount = window.unifiedHistory.cards.length;
  var totalCount = smsCount + rentCount + cardsCount;
  
  var tabBtnStyle = function(t, count, icon) {
    var isActive = tab === t;
    return '<button class="history-tab-btn" data-tab="' + t + '" onclick="switchHistoryTab(\'' + t + '\')" style="flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s;background:' + (isActive ? 'var(--accent)' : 'var(--bg-primary)') + ';color:' + (isActive ? '#fff' : 'var(--text-secondary)') + ';">' +
      '<i class="' + icon + '" style="font-size:12px;"></i>' +
      '<span>' + t.charAt(0).toUpperCase() + t.slice(1) + '</span>' +
      (count > 0 ? '<span style="font-size:10px;padding:1px 6px;border-radius:6px;background:' + (isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent-dim)') + ';color:' + (isActive ? '#fff' : 'var(--accent)') + ';">' + count + '</span>' : '') +
    '</button>';
  };
  
  // ✅ FIX: Check if we have ANY cached data to show
  var hasCachedData = smsCount > 0 || rentCount > 0 || cardsCount > 0;
  
  main.innerHTML =
    '<div class="page-header">' +
      '<div><h1 class="page-title"><i class="fas fa-clock-rotate-left" style="color:var(--accent);margin-right:10px;"></i>History</h1>' +
      '<p style="font-size:14px;color:var(--text-secondary);margin-top:8px;">All your transactions in one place</p></div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:12px;padding:4px 12px;border-radius:8px;font-weight:600;background:var(--accent-dim);color:var(--accent);">' + totalCount + ' total</span>' +
      '</div>' +
    '</div>' +
    
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:6px;">' +
      tabBtnStyle('sms', smsCount, 'fas fa-comment-dots') +
      tabBtnStyle('rent', rentCount, 'fas fa-phone-alt') +
      tabBtnStyle('cards', cardsCount, 'far fa-credit-card') +
      tabBtnStyle('gift', 0, 'fas fa-gift') +
    '</div>' +
    
    '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:20px;box-shadow:var(--shadow-sm);">' +
      '<div id="historyTabContent">' +
        (hasCachedData 
          ? ''  // ✅ EMPTY - content will be rendered immediately below
          : '<div style="text-align:center;padding:40px 20px;"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:var(--accent);display:block;margin-bottom:12px;"></i><p style="font-size:14px;color:var(--text-muted);">Loading history...</p></div>') +
      '</div>' +
    '</div>';
  
  // ✅ FIX: Render tab content IMMEDIATELY if we have cached data
  if (hasCachedData) {
    var container = document.getElementById('historyTabContent');
    if (container) renderHistoryTabContent(container);
  }
  
  // ✅ FIX: Load fresh data in background (no loading spinner shown)
  window.loadUnifiedHistory();
}
        
     
// ====== REFERRAL PROGRAM HELPERS (defined once) ======

window.generateRefCode = function(length) {
  length = length || 6;
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var result = 'REF-';
  for (var i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

window.toggleReadMore = function() {
  var short = document.getElementById('refDescShort');
  var full = document.getElementById('refDescFull');
  var btn = document.getElementById('readMoreBtn');
  if (!short || !full || !btn) return;
  
  if (full.style.display === 'none') {
    short.style.display = 'none';
    full.style.display = 'block';
    btn.textContent = 'Read less...';
  } else {
    short.style.display = 'block';
    full.style.display = 'none';
    btn.textContent = 'Read more...';
  }
};

window.switchRefTab = function(tab) {
  var histBtn = document.getElementById('tabBtnHistory');
  var withdBtn = document.getElementById('tabBtnWithdrawals');
  var histContent = document.getElementById('refTabHistory');
  var withdContent = document.getElementById('refTabWithdrawals');
  
  if (tab === 'history') {
    if (histBtn) { histBtn.style.background = 'var(--accent)'; histBtn.style.color = '#fff'; }
    if (withdBtn) { withdBtn.style.background = 'var(--bg-primary)'; withdBtn.style.color = 'var(--text-secondary)'; }
    if (histContent) histContent.style.display = 'block';
    if (withdContent) withdContent.style.display = 'none';
  } else {
    if (withdBtn) { withdBtn.style.background = 'var(--accent)'; withdBtn.style.color = '#fff'; }
    if (histBtn) { histBtn.style.background = 'var(--bg-primary)'; histBtn.style.color = 'var(--text-secondary)'; }
    if (withdContent) withdContent.style.display = 'block';
    if (histContent) histContent.style.display = 'none';
  }
};

window.requestWithdrawal = async function() {
  var method = document.getElementById('withdrawMethod');
  var address = document.getElementById('withdrawAddress');
  var amount = document.getElementById('withdrawAmount');
  
  if (!method || !method.value) { showToast('Select withdrawal method', 'error'); return; }
  if (!address || !address.value.trim()) { showToast('Enter wallet address or gift card details', 'error'); return; }
  if (!amount || parseFloat(amount.value) <= 0) { showToast('Enter valid amount', 'error'); return; }

  var btn = document.querySelector('[onclick="requestWithdrawal()"]');
  if (!btn) return;
  var originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  btn.disabled = true;

  try {
    var res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: getUserEmail(),
        method: method.value,
        address: address.value.trim(),
        amount: parseFloat(amount.value)
      })
    });
    var data = await res.json();
    
    if (data.error) {
      showToast(data.error, 'error');
    } else {
      showToast('Withdrawal request submitted!', 'success');
      method.value = '';
      address.value = '';
      amount.value = '';
      switchRefTab('withdrawals');
      // Reload withdrawal history from backend
      loadReferralHistory();
    }
  } catch (err) {
    showToast('Network error. Please try again.', 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
};

function copyReferralLink() {
  var el = document.getElementById('referralLink');
  if (!el || !el.dataset.link) {
    showToast('Referral link not ready yet', 'error');
    return;
  }
  navigator.clipboard.writeText(el.dataset.link)
    .then(function() { showToast('Referral link copied', 'success'); })
    .catch(function() { showToast('Failed to copy', 'error'); });
}

// ====== HELPERS TO POPULATE HISTORY FROM BACKEND ======

window.loadReferralHistory = async function() {
  try {
    var res = await fetch('/api/user/' + getUserEmail());
    if (!res.ok) return;
    var data = await res.json();


    // --- Populate withdrawal history ---
    var withdrawals = data.withdrawals || data.withdrawalHistory || [];
    var withdContainer = document.getElementById('refTabWithdrawals');
    if (withdContainer) {
      if (withdrawals.length === 0) {
        withdContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No withdrawals yet</div>';
      } else {
        withdContainer.innerHTML = withdrawals.map(function(w) {
          var dateStr = w.date || (w.created_at ? new Date(w.created_at).toLocaleDateString() : '—');
          var methodLabel = w.method || 'Unknown';
          var amt = '$' + (w.amount || 0).toFixed(2);
          var status = w.status || 'Pending';
          var statusColor = status === 'Completed' ? 'var(--accent)' : status === 'Pending' ? 'var(--warning)' : 'var(--danger)';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">' +
            '<div><span style="color:var(--text-muted);">' + dateStr + '</span><br><span style="font-size:11px;">' + methodLabel + '</span></div>' +
            '<div style="font-weight:700;color:var(--accent);">' + amt + ' <span style="font-size:10px;color:' + statusColor + ';">(' + status + ')</span></div></div>';
        }).join('');
      }
    }
  } catch (err) {
    // Silent fail — page already shows "No referrals yet" placeholder
  }
};

// ====== REFERRAL PAGE RENDER ======

async function renderSettingsPage(main) {
  // ===== FIX: Get cached referral code IMMEDIATELY =====
  var userEmail = getUserEmail();
  var cachedRefCode = localStorage.getItem('cachedRefCode_' + userEmail) || '';
  var cachedLink = cachedRefCode ? (window.location.origin + '/?ref=' + cachedRefCode) : '';
  
  // Render HTML skeleton WITH cached data (no "Loading...")
  main.innerHTML =
    '<div class="page-header"><h1 class="page-title">Referral Program</h1></div>' +
    '<div style="max-width:900px;margin:0 auto;display:grid;gap:22px;">' +

      // 1. INTRO
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:26px;box-shadow:var(--shadow-sm);">' +
        '<h2 style="font-size:24px;font-weight:500;margin-bottom:9px;">Recommend the service and earn money</h2>' +
        '<div id="refDescShort">' +
          '<p style="font-size:15px;color:var(--text-secondary);line-height:1.8;margin:0;">Share your referral link with friends and earn 10% of every purchase they make.</p>' +
        '</div>' +
        '<div id="refDescFull" style="display:none;">' +
          '<p style="font-size:15px;color:var(--text-secondary);line-height:1.8;margin:0 0 12px 0;">Share your referral link with friends and earn 10% of every purchase made by users who sign up through your link. There is no limit to how much you can earn.</p>' +
          '<p style="font-size:15px;color:var(--text-secondary);line-height:1.8;margin:0;">The bonus is automatically added to your balance. Share your referral link on social media, chat, or email to grow your earnings. You can withdraw your commissions anytime via Crypto or Gift Cards.</p>' +
        '</div>' +
        '<button class="btn btn-secondary" style="margin-top:16px;" id="readMoreBtn" onclick="toggleReadMore()">Read more...</button>' +
      '</div>' +

      // 2. STATS
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;">' +
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:var(--shadow-sm);">' +
          '<div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:500;margin-bottom:8px;">Total Commissions</div>' +
          '<div style="font-size:21px;font-weight:450;color:var(--accent);margin-bottom:4px;" id="refTotalCommissions">$0.00</div>' +
          '<div style="font-size:13px;color:var(--text-secondary);">Lifetime earnings</div>' +
        '</div>' +
        '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:23px;box-shadow:var(--shadow-sm);">' +
          '<div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:500;margin-bottom:8px;">Referral Count</div>' +
          '<div style="font-size:21px;font-weight:450;color:var(--text-primary);margin-bottom:4px;" id="refCount">0</div>' +
          '<div style="font-size:13px;color:var(--text-secondary);">Total friends invited</div>' +
        '</div>' +
      '</div>' +

      // 3. REFERRAL LINK - NOW SHOWS CACHED CODE IMMEDIATELY
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:var(--shadow-sm);">' +
        '<div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:8px;">Your REF code</div>' +
        '<div style="font-size:14px;color:var(--text-primary);line-height:1.6;margin-bottom:16px;word-break:break-all;" id="referralLink">' + 
          (cachedLink ? cachedLink : 'Loading...') + 
        '</div>' +
        '<button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="copyReferralLink()"><i class="fas fa-copy" style="margin-right:6px;"></i> Copy referral link</button>' +
      '</div>' +

      // 4. WITHDRAWAL FORM
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:var(--shadow-sm);">' +
        '<h3 style="font-size:18px;font-weight:700;margin-bottom:20px;"><i class="fas fa-arrow-right-from-bracket" style="color:var(--accent);margin-right:8px;"></i>Withdraw Commissions</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">' +
          '<div>' +
            '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Withdrawal Method</label>' +
            '<select id="withdrawMethod" class="form-select" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-primary);color:var(--text-primary);font-size:14px;">' +
              '<option value="">Select method...</option>' +
              '<option value="crypto">Crypto (USDT, BTC, ETH)</option>' +
              '<option value="giftcard">Gift Card (Amazon, Apple)</option>' +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Withdraw ($)</label>' +
            '<input type="number" id="withdrawAmount" class="form-input" placeholder="0.00" min="1" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-primary);color:var(--text-primary);font-size:14px;">' +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:20px;">' +
          '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;">Wallet Address / Gift Card Email</label>' +
          '<input type="text" id="withdrawAddress" class="form-input" placeholder="Enter your wallet address or email" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-primary);color:var(--text-primary);font-size:14px;">' +
        '</div>' +
        '<button class="btn btn-primary" style="width:100%;justify-content:center;padding:14px;" onclick="requestWithdrawal()"><i class="fas fa-paper-plane" style="margin-right:6px;"></i> Request Withdrawal</button>' +
      '</div>' +

      // 5. HISTORY TABS
      '<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:var(--shadow-sm);">' +
        '<div style="display:flex;gap:10px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:10px;">' +
          '<button id="tabBtnHistory" onclick="switchRefTab(\'history\')" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:14px;background:var(--accent);color:#fff;transition:0.2s;">Referral History</button>' +
          '<button id="tabBtnWithdrawals" onclick="switchRefTab(\'withdrawals\')" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:14px;background:var(--bg-primary);color:var(--text-secondary);transition:0.2s;">Withdrawal History</button>' +
        '</div>' +
        '<div id="refTabHistory"><div style="text-align:center;padding:20px;color:var(--text-muted);">Loading...</div></div>' +
        '<div id="refTabWithdrawals" style="display:none;"><div style="text-align:center;padding:20px;color:var(--text-muted);">Loading...</div></div>' +
      '</div>' +

    '</div>';

  // --- NOW FETCH REAL DATA IN BACKGROUND (silent update, no "Loading..." flash) ---
  try {
    var res = await fetch('/api/user/' + userEmail);
    if (!res.ok) throw new Error('Unable to load referral data');
    var data = await res.json();

    // 1. Handle referral code
    var referralCode = data.refCode || data.referral_code || '';
    var isEmail = /[@]/.test(referralCode);

    if (!referralCode || isEmail) {
      var newCode = window.generateRefCode(6);

      try {
        var saveRes = await fetch('/api/user/refcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, refCode: newCode })
        });
        var saveData = await saveRes.json();

        if (!saveData.error) {
          referralCode = newCode;
        } else {
          var linkEl = document.getElementById('referralLink');
          if (linkEl) linkEl.textContent = 'Error generating code. Contact support.';
          return;
        }
      } catch (e) {
        var linkEl2 = document.getElementById('referralLink');
        if (linkEl2) linkEl2.textContent = 'Network error.';
        return;
      }
    }

    // Cache the referral code for instant display next time
    localStorage.setItem('cachedRefCode_' + userEmail, referralCode);

    // Set the referral link (silent update, no flash)
    var url = window.location.origin + '/?ref=' + referralCode;
    var linkElFinal = document.getElementById('referralLink');
    if (linkElFinal) {
      linkElFinal.textContent = url;
      linkElFinal.dataset.link = url;
    }

    // 2. Populate stats
    var commEl = document.getElementById('refTotalCommissions');
    if (commEl) commEl.textContent = '$' + (data.totalCommissions || data.commissions || 0).toFixed(2);

    var countEl = document.getElementById('refCount');
    if (countEl) countEl.textContent = (data.referralCount || data.refCount || 0);

    // 3. Populate history tabs from backend data
    var referrals = data.referrals || data.referralHistory || [];
    var histContainer = document.getElementById('refTabHistory');
    if (histContainer) {
      if (referrals.length === 0) {
        histContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No referrals yet</div>';
      } else {
        histContainer.innerHTML = referrals.map(function(r) {
          var dateStr = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—');
          var email = r.email || r.referee || 'Unknown';
          
          var earnedValue = 0;
          if (r.earned !== undefined && r.earned !== null) {
            if (typeof r.earned === 'string') {
              earnedValue = parseFloat(r.earned.replace(/[^0-9.-]/g, '')) || 0;
            } else {
              earnedValue = parseFloat(r.earned) || 0;
            }
          } else if (r.commission !== undefined && r.commission !== null) {
            earnedValue = parseFloat(r.commission) || 0;
          }
          var earned = '$' + earnedValue.toFixed(2);
          
          var status = r.status || 'Pending';
          var statusColor = status === 'Paid' ? 'var(--accent)' : 'var(--warning)';
          
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">' +
            '<div><span style="color:var(--text-muted);">' + dateStr + '</span> — ' + maskEmail(email) + '</div>' +
            '<div style="font-weight:700;color:var(--accent);">' + earned + ' <span style="font-size:10px;color:' + statusColor + ';">(' + status + ')</span></div></div>';
        }).join('');
      }
    }

    // Withdrawal history
    var withdrawals = data.withdrawals || data.withdrawalHistory || [];
    var withdContainer = document.getElementById('refTabWithdrawals');
    if (withdContainer) {
      if (withdrawals.length === 0) {
        withdContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">No withdrawals yet</div>';
      } else {
        withdContainer.innerHTML = withdrawals.map(function(w) {
          var dateStr = w.date || (w.created_at ? new Date(w.created_at).toLocaleDateString() : '—');
          var methodLabel = w.method || 'Unknown';
          var amt = '$' + (w.amount || 0).toFixed(2);
          var status = w.status || 'Pending';
          var statusColor = status === 'Completed' ? 'var(--accent)' : status === 'Pending' ? 'var(--warning)' : 'var(--danger)';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">' +
            '<div><span style="color:var(--text-muted);">' + dateStr + '</span><br><span style="font-size:11px;">' + methodLabel + '</span></div>' +
            '<div style="font-weight:700;color:var(--accent);">' + amt + ' <span style="font-size:10px;color:' + statusColor + ';">(' + status + ')</span></div></div>';
        }).join('');
      }
    }

  } catch (err) {
    // Silent fail — page already shows cached data
    console.log('Referral data load error (non-critical):', err.message);
  }
}

function renderHelpPage(main) {
  main.innerHTML = '<div class="page-header"><h1 class="page-title">Help Center</h1></div>' +
    '<div style="max-width:800px;display:flex;flex-direction:column;gap:16px;">' +
    '<h2 style="font-size:18px;font-weight:600;margin-bottom:8px;">Virtual Number Service – User Guide</h2>' +
    '<div style="background:linear-gradient(135deg,rgba(13,155,122,0.1),rgba(13,155,122,0.05));border:2px solid var(--accent);border-radius:12px;padding:20px;text-align:center;">' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:12px;">Stay updated by joining our Telegram Channel for the latest announcements, updates, and support.</p>' +
    '<a href="https://t.me/SonVerifcode" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;transition:all 0.3s;border:none;cursor:pointer;">' +
    '<i class="fas fa-paper-plane" style="font-size:16px;"></i>' +
    'Join Telegram Channel' +
    '</a>' +
    '</div>' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;"></p>' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">If your purchased activations are not credited to your balance after payment, simply tap the "Restore Purchases" button in the app. If the issue continues, please contact support and provide a screenshot from your App Store or purchase history, or proof of payment from your bank for quick assistance.</p>' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">Our service is simple and easy to use. First, order a number by selecting the service you need (for example, Tinder, WhatsApp, or any supported platform) and choose your preferred country. Once the number is issued, copy it and paste it into the registration form of the selected service. When the verification SMS is sent, it will appear directly in the app. You can then copy the confirmation code and complete your registration.</p>' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">We offer two types of services. The first is Activations, which are short-term numbers available for approximately 20 minutes. These are ideal for quick verifications and allow you to receive one or more SMS depending on the selected service. The second option is Rent, which provides a number for up to 30 days. With this option, you can receive unlimited SMS, and by selecting "Full Rent," you can receive messages from any service, making it ideal for long-term use.</p>' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">If you experience issues receiving SMS, wait at least 3 minutes and then cancel the activation. Your balance will be refunded automatically, and you can try purchasing another number. There are several factors that may affect message delivery. For better success rates, use a VPN or proxy that matches the country of the selected number, ensure you choose SMS verification instead of voice calls, and for some services like WhatsApp, reinstalling the app may help.</p>' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">In case your registered account gets banned, it is recommended to use mobile proxies that match the geolocation of the purchased number or a mobile user agent. Please note that we only provide virtual numbers and do not control or manage account registrations. We advise users to follow best practices and research methods to avoid account restrictions.</p>' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">Your privacy and security are important to us. Each number is assigned exclusively to one user during its usage period. SMS messages received are not shared or reused for the same service, ensuring that no one else can access your verification codes or accounts.</p>' +
    '<p style="font-size:14px;color:var(--text-secondary);line-height:1.6;">If you need further assistance, our support team is available to help. Please provide detailed information and screenshots when reporting any issues to ensure a faster resolution.</p>' +
    '</div>';
}

function renderContactsPage(main) {
  main.innerHTML = '<div class="page-header"><h1 class="page-title">Contacts</h1></div>' +
    '<div style="max-width:600px;display:flex;flex-direction:column;gap:16px;">' +
    '<div class="stat-card" style="padding:24px;">' +
    '<h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Get in Touch</h3>' +
    '<div style="display:flex;flex-direction:column;gap:12px;">' +
    '<div style="display:flex;align-items:center;gap:12px;">' +
    '<i class="fas fa-envelope" style="color:var(--accent);font-size:18px;"></i>' +
    '<div><div style="font-size:14px;font-weight:600;">Email</div><div style="font-size:14px;color:var(--text-secondary);">getsonverify@hotmail.com</div></div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:12px;">' +
    '<i class="fas fa-telegram" style="color:var(--accent);font-size:18px;"></i>' +
    '<div><div style="font-size:14px;font-weight:600;">Telegram</div><div style="font-size:14px;color:var(--text-secondary);">Getsonverify</div></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';
}

/* ===== Deposit / Add Funds ===== */

var selectedDepositAmount = 0;
var selectedPaymentMethod = 'usdt';
var selectedCryptoCurrency = 'trx';

var depositMethodInfo = {
  usdt: {
    title: 'USDT-TRC20',
    subtitle: 'Confirmation: 5-10 minutes',
    note: 'Send USDT via TRC20 network only. Do not use ERC20 or BEP20 networks.'
  },
  stripe: {
    title: 'Bank Transfer / Card',
    subtitle: 'Confirmation: 1-5 minutes',
    note: 'Pay via Bank Transfer, Mobile Money, Visa, or Mastercard. Select your currency below.'
  },
  crypto: {
    title: 'Cryptocurrency',
    subtitle: 'Confirmation: 5-30 minutes depending on network',
    note: 'Pay with BTC, ETH, LTC, DOGE, BNB, SOL and more through our secure gateway.'
  }
};

var bankTransferCurrencies = [
  { code: 'NGN', name: 'Nigerian Naira (₦)', flag: '🇳🇬' },
  { code: 'GHS', name: 'Ghana Cedi (₵)', flag: '🇬🇭' },
  { code: 'KES', name: 'Kenyan Shilling (KSh)', flag: '🇰🇪' },
  { code: 'ZAR', name: 'South African Rand (R)', flag: '🇿🇦' },
  { code: 'UGX', name: 'Ugandan Shilling (USh)', flag: '🇺🇬' },
  { code: 'TZS', name: 'Tanzanian Shilling (TSh)', flag: '🇹🇿' },
  { code: 'RWF', name: 'Rwandan Franc (FRw)', flag: '🇷🇼' },
  { code: 'XOF', name: 'West African CFA (CFA)', flag: '🇸🇳' },
  { code: 'XAF', name: 'Central African CFA (CFA)', flag: '🇨🇲' },
  { code: 'EGP', name: 'Egyptian Pound (E£)', flag: '🇪🇬' },
  { code: 'MAD', name: 'Moroccan Dirham (MAD)', flag: '🇲🇦' }
];

var selectedBankCurrency = 'NGN';

var cryptoOptions = [
  { id: 'TRX', name: 'TRON' },
  { id: 'BTC', name: 'Bitcoin' },
  { id: 'ETH', name: 'Ethereum' },
  { id: 'LTC', name: 'Litecoin' },
  { id: 'DOGE', name: 'Dogecoin' },
  { id: 'BNB', name: 'BNB Chain' },
  { id: 'SOL', name: 'Solana' }
];

function getBankCurrencyPickerHTML() {
  return '<div id="bankCurrencyPicker" style="margin-bottom:16px;">' +
    '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;">Select Payment Currency</label>' +
    '<div class="dep-bank-grid">' +
    bankTransferCurrencies.map(function(c) {
      var isSelected = c.code === selectedBankCurrency;
      return '<div class="bank-currency-pick" onclick="selectBankCurrency(\'' + c.code + '\', this)" style="border:1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;cursor:pointer;font-weight:600;background:' + (isSelected ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';color:' + (isSelected ? 'var(--accent)' : 'var(--text-secondary)') + ';transition:all 0.2s;display:flex;align-items:center;gap:6px;">' +
        '<span style="font-size:16px;">' + c.flag + '</span><span>' + c.name + '</span></div>';
    }).join('') +
    '</div>' +
    '<div style="margin-top:8px;font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px;">' +
    '<i class="fas fa-shield-alt" style="color:var(--accent);"></i> Bank Transfer & Mobile Money available</div>' +
  '</div>';
}

function getCryptoPickerHTML() {
  return '<div id="cryptoPicker" style="margin-bottom:16px;">' +
    '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;">Select cryptocurrency</label>' +
    '<div class="dep-crypto-grid">' +
    cryptoOptions.map(function(c) {
      var isSelected = c.id === selectedCryptoCurrency;
      return '<div class="crypto-pick" onclick="selectCryptoCurrency(\'' + c.id + '\', this)" style="border:1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;cursor:pointer;font-weight:600;background:' + (isSelected ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';color:' + (isSelected ? 'var(--accent)' : 'var(--text-secondary)') + ';transition:all 0.2s;text-align:center;">' + c.name + '</div>';
    }).join('') +
    '</div>' +
    '<div style="margin-top:8px;font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px;">' +
    '<i class="fas fa-shield-alt" style="color:var(--accent);"></i> Payments processed securely</div>' +
  '</div>';
}

window.selectBankCurrency = function(currencyCode, el) {
  selectedBankCurrency = currencyCode;
  document.querySelectorAll('.bank-currency-pick').forEach(function(opt) {
    opt.style.background = 'var(--bg-primary)';
    opt.style.borderColor = 'var(--border)';
    opt.style.color = 'var(--text-secondary)';
  });
  el.style.background = 'var(--accent-dim)';
  el.style.borderColor = 'var(--accent)';
  el.style.color = 'var(--accent)';
  updateBankAmountPreview();
};

function updateBankAmountPreview() {
  var rates = { NGN: 1500, GHS: 15, KES: 150, ZAR: 18, UGX: 3700, TZS: 2500, RWF: 1300, XOF: 600, XAF: 600, EGP: 30, MAD: 10 };
  var rate = rates[selectedBankCurrency] || 1;
  var localAmount = Math.round(selectedDepositAmount * rate);
  
  var currencySymbols = { NGN: '₦', GHS: '₵', KES: 'KSh', ZAR: 'R', UGX: 'USh', TZS: 'TSh', RWF: 'FRw', XOF: 'CFA', XAF: 'CFA', EGP: 'E£', MAD: 'MAD' };
  var symbol = currencySymbols[selectedBankCurrency] || '';
  
  var previewEl = document.getElementById('bankAmountPreview');
  if (previewEl) {
    previewEl.innerHTML = '<i class="fas fa-exchange-alt" style="margin-right:6px;"></i> You will pay: <strong>' + symbol + localAmount.toLocaleString() + ' ' + selectedBankCurrency + '</strong> (≈ $' + selectedDepositAmount.toFixed(2) + ' USD)';
    previewEl.style.display = 'block';
  }
}

function selectCryptoCurrency(currencyId, el) {
  selectedCryptoCurrency = currencyId;
  document.querySelectorAll('.crypto-pick').forEach(function(opt) {
    opt.style.background = 'var(--bg-primary)';
    opt.style.borderColor = 'var(--border)';
    opt.style.color = 'var(--text-secondary)';
  });
  el.style.background = 'var(--accent-dim)';
  el.style.borderColor = 'var(--accent)';
  el.style.color = 'var(--accent)';

  var minNote = document.getElementById('cryptoMinNote');
  if (minNote) {
    if (currencyId === 'USDT_TRX') {
      minNote.textContent = 'Note that the minimum amount for USDT TRC-20 is: US$5';
    } else {
      minNote.textContent = 'Note that the minimum amount is: US$2';
    }
  }

  updatePayButton();
}

function getCryptoPickerHTML() {
  return '<div id="cryptoPicker" style="margin-bottom:20px;">' +
    '<label style="display:block;font-size:14px;font-weight:600;margin-bottom:10px;">Select cryptocurrency</label>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;">' +
    cryptoOptions.map(function(c) {
      var isSelected = c.id === selectedCryptoCurrency;
      return '<div class="crypto-pick" onclick="selectCryptoCurrency(\'' + c.id + '\', this)" style="padding:10px 14px;border:1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') + ';border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;background:' + (isSelected ? 'var(--accent-dim)' : 'var(--bg-primary)') + ';color:' + (isSelected ? 'var(--accent)' : 'var(--text-secondary)') + ';transition:all 0.2s;text-align:center;">' + c.name + '</div>';
    }).join('') +
    '</div>' +
    '<div style="margin-top:10px;font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">' +
    '<i class="fas fa-shield-alt" style="color:var(--accent);"></i> Payments processed secure</div>' +
    '</div>';
}

function renderDepositPage(main) {
  var method = depositMethodInfo[selectedPaymentMethod] || depositMethodInfo.usdt;
  var cryptoPickerBlock = (selectedPaymentMethod === 'crypto') ? getCryptoPickerHTML() : '';
  var bankCurrencyBlock = (selectedPaymentMethod === 'stripe') ? getBankCurrencyPickerHTML() : '';

  // Add responsive styles once
  if (!document.getElementById('depositResponsiveStyles')) {
    var style = document.createElement('style');
    style.id = 'depositResponsiveStyles';
    style.textContent = 
      '.dep-page-wrap { max-width:980px; width:100%; margin:0 auto; display:grid; gap:20px; }' +
      '.dep-cards-grid { display:grid; grid-template-columns:1fr; gap:12px; }' +
      '.dep-amount-row { display:flex; flex-wrap:wrap; gap:8px; }' +
      '.dep-amount-row .dep-amt { flex:1 1 calc(50% - 4px); min-width:0; text-align:center; box-sizing:border-box; }' +
      '.dep-input-wrap { width:100%; box-sizing:border-box; }' +
      '.dep-input-wrap input { width:100%; box-sizing:border-box; }' +
      '.dep-method-card { padding:20px !important; cursor:pointer; transition:all 0.2s; box-sizing:border-box; }' +
      '.dep-method-card .dep-card-btn { width:100%; padding:10px; font-size:13px; box-sizing:border-box; margin-top:14px; }' +
      '.dep-bank-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }' +
      '.bank-currency-pick { box-sizing:border-box; font-size:12px !important; padding:10px !important; }' +
      '.dep-crypto-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; }' +
      '.crypto-pick { box-sizing:border-box; font-size:12px !important; padding:10px !important; }' +
      '@media (min-width:640px) {' +
        '.dep-cards-grid { grid-template-columns:repeat(3,1fr); }' +
        '.dep-amount-row .dep-amt { flex:0 0 auto; }' +
        '.dep-bank-grid { grid-template-columns:repeat(3,1fr); }' +
        '.dep-crypto-grid { grid-template-columns:repeat(4,1fr); }' +
      '}';
    document.head.appendChild(style);
  }

  var email = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  var cached = email ? localStorage.getItem('cachedBalance_' + email) : null;

  main.innerHTML = 
    '<div class="page-header" style="margin-bottom:20px;">' +
      '<h1 class="page-title" style="font-size:20px;">Top Up Balance</h1>' +
      '<div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">Current balance: <strong id="depositCurrentBalance">$' + (cached ? parseFloat(cached).toFixed(2) : '0.00') + '</strong></div>' +
    '</div>' +

    '<div class="dep-page-wrap">' +

      // ===== 3 PAYMENT CARDS (stack on mobile, 3-col on desktop) =====
      '<div class="dep-cards-grid">' +

        // CARD 1: USDT TRC-20
        '<div class="stat-card dep-method-card" style="' + (selectedPaymentMethod === 'usdt' ? 'border:2px solid var(--accent);box-shadow:0 0 20px var(--accent-dim);' : '') + '" onclick="selectPaymentMethod(\'usdt\', this)">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
            '<div style="width:40px;height:40px;border-radius:12px;background:rgba(38,161,123,0.15);display:flex;align-items:center;justify-content:center;color:#26a17b;flex-shrink:0;"><i class="fas fa-money-bill-wave" style="font-size:16px;"></i></div>' +
            '<div><div style="font-size:15px;font-weight:700;">USDT-TRC20</div><div style="font-size:12px;color:var(--text-muted);">5-10 min confirmation</div></div>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">Send USDT via TRC20 network. Low fees, fast confirmation.</div>' +
          '<button class="btn btn-outline dep-meth dep-card-btn" data-method="usdt" onclick="event.stopPropagation();selectPaymentMethod(\'usdt\', this)" style="' + (selectedPaymentMethod === 'usdt' ? 'background:var(--accent);color:#fff;border:none;' : '') + '">Select</button>' +
        '</div>' +

        // CARD 2: Bank Transfer / Cards
        '<div class="stat-card dep-method-card" style="' + (selectedPaymentMethod === 'stripe' ? 'border:2px solid var(--accent);box-shadow:0 0 20px var(--accent-dim);' : '') + '" onclick="selectPaymentMethod(\'stripe\', this)">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
            '<div style="width:40px;height:40px;border-radius:12px;background:rgba(0,175,193,0.1);display:flex;align-items:center;justify-content:center;color:#00afc1;flex-shrink:0;"><i class="fas fa-university" style="font-size:16px;"></i></div>' +
            '<div><div style="font-size:15px;font-weight:700;">Bank / Card</div><div style="font-size:12px;color:var(--text-muted);">1-5 min confirmation</div></div>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">Bank Transfer, Mobile Money, Visa, Mastercard.</div>' +
          '<button class="btn btn-outline dep-meth dep-card-btn" data-method="stripe" onclick="event.stopPropagation();selectPaymentMethod(\'stripe\', this)" style="' + (selectedPaymentMethod === 'stripe' ? 'background:var(--accent);color:#fff;border:none;' : '') + '">Select</button>' +
        '</div>' +

        // CARD 3: Crypto
        '<div class="stat-card dep-method-card" style="' + (selectedPaymentMethod === 'crypto' ? 'border:2px solid var(--accent);box-shadow:0 0 20px var(--accent-dim);' : '') + '" onclick="selectPaymentMethod(\'crypto\', this)">' +
          '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
            '<div style="width:40px;height:40px;border-radius:12px;background:rgba(247,147,26,0.1);display:flex;align-items:center;justify-content:center;color:#f7931a;flex-shrink:0;"><i class="fas fa-coins" style="font-size:16px;"></i></div>' +
            '<div><div style="font-size:15px;font-weight:700;">Cryptocurrency</div><div style="font-size:12px;color:var(--text-muted);">5-30 min confirmation</div></div>' +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">BTC, ETH, LTC, DOGE, BNB, SOL and more.</div>' +
          '<button class="btn btn-outline dep-meth dep-card-btn" data-method="crypto" onclick="event.stopPropagation();selectPaymentMethod(\'crypto\', this)" style="' + (selectedPaymentMethod === 'crypto' ? 'background:var(--accent);color:#fff;border:none;' : '') + '">Select</button>' +
        '</div>' +

      '</div>' +

      // ===== AMOUNT + PAY BUTTON CARD =====
      '<div class="stat-card" style="padding:20px;">' +
        '<div style="margin-bottom:20px;">' +
          '<div id="depositMethodTitle" style="font-size:17px;font-weight:700;margin-bottom:4px;">Top Up By ' + method.title + '</div>' +
          '<div id="depositMethodSubtitle" style="font-size:13px;color:var(--text-muted);">' + method.subtitle + '</div>' +
        '</div>' +

        // Quick amount buttons (2 per row on mobile)
        '<div class="dep-amount-row" style="margin-bottom:16px;">' +
          '<button class="btn btn-outline dep-amt" data-amount="5" onclick="selectDepositAmount(5,this)">$5</button>' +
          '<button class="btn btn-outline dep-amt" data-amount="10" onclick="selectDepositAmount(10,this)">$10</button>' +
          '<button class="btn btn-outline dep-amt" data-amount="20" onclick="selectDepositAmount(20,this)">$20</button>' +
          '<button class="btn btn-outline dep-amt" data-amount="50" onclick="selectDepositAmount(50,this)">$50</button>' +
          '<button class="btn btn-outline dep-amt" data-amount="100" onclick="selectDepositAmount(100,this)">$100</button>' +
        '</div>' +

        bankCurrencyBlock +
        cryptoPickerBlock +

        '<div id="bankAmountPreview" style="display:none;padding:12px 14px;background:rgba(13,155,122,0.08);border:1px solid rgba(13,155,122,0.2);border-radius:10px;margin-bottom:16px;font-size:13px;color:var(--accent);"></div>' +

        // Custom amount input
        '<div class="dep-input-wrap" style="margin-bottom:16px;">' +
          '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;">Custom amount (USD)</label>' +
          '<input type="number" id="customAmount" placeholder="US$" min="2" max="1000" style="padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--bg-primary);font-size:15px;outline:none;" oninput="selectCustomAmount(this.value)">' +
        '</div>' +

        // Notes
        '<div style="padding:14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;margin-bottom:20px;">' +
          '<ul style="margin:0;padding:0 0 0 16px;color:var(--text-secondary);font-size:13px;line-height:1.8;">' +
            '<li id="cryptoMinNote">Note that the minimum amount is: US$2</li>' +
            '<li id="depositHintNote">' + method.note + '</li>' +
          '</ul>' +
        '</div>' +

        // Pay button (full width)
        '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:14px;" onclick="processDeposit()" id="depositPayBtn">Pay $' + selectedDepositAmount.toFixed(2) + '</button>' +
      '</div>' +

      // ===== HISTORY CARD =====
      '<div class="stat-card" style="padding:20px;">' +
        '<h3 style="font-size:15px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px;">' +
          '<i class="fas fa-clock-rotate-left" style="color:var(--accent);"></i> Recent Deposits' +
        '</h3>' +
        '<div id="depositHistoryList"><div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Loading...</div></div>' +
      '</div>' +

    '</div>';

  updateDepositDetails();
  initDepositPage();

  if (selectedPaymentMethod === 'stripe') {
    setTimeout(function() { updateBankAmountPreview(); }, 100);
  }
}

// ===== ADD THIS NEW FUNCTION =====
function initDepositPage() {
  // Show cached balance immediately
  var email = (typeof getUserEmail === 'function') ? getUserEmail() : null;
  if (email) {
    var cached = localStorage.getItem('cachedBalance_' + email);
    if (cached) {
      var el = document.getElementById('depositCurrentBalance');
      if (el) el.textContent = '$' + parseFloat(cached).toFixed(2);
    }
    loadDepositHistory();
    // Silent background refresh - user never sees loading
    fetch('/api/user/' + email).then(function(r) { return r.json(); }).then(function(d) {
      if (d.balance !== undefined) {
        var el = document.getElementById('depositCurrentBalance');
        if (el) el.textContent = '$' + parseFloat(d.balance).toFixed(2);
      }
    }).catch(function() {});
    return;
  }
  loadDepositHistory();
  document.querySelectorAll('.dep-meth').forEach(function(btn) {
    if (btn.dataset.method === selectedPaymentMethod) {
      btn.style.background = 'var(--accent-dim)';
      btn.style.border = '2px solid var(--accent)';
      btn.dataset.sel = '1';
    }
  });
}

function updateDepositDetails() {
  var method = depositMethodInfo[selectedPaymentMethod] || depositMethodInfo.usdt;
  var titleEl = document.getElementById('depositMethodTitle');
  var subtitleEl = document.getElementById('depositMethodSubtitle');
  var hintNote = document.getElementById('depositHintNote');
  var minNote = document.getElementById('cryptoMinNote');
  if (titleEl) titleEl.textContent = 'Top Up By ' + method.title;
  if (subtitleEl) subtitleEl.textContent = method.subtitle;
  if (hintNote) hintNote.textContent = method.note;
  if (minNote) {
    if (selectedPaymentMethod === 'usdt') {
      minNote.textContent = 'Note that the minimum amount for USDT TRC-20 is: US$5';
    } else if (selectedPaymentMethod === 'crypto' && selectedCryptoCurrency === 'USDT_TRX') {
      minNote.textContent = 'Note that the minimum amount for USDT TRC-20 is: US$5';
    } else if (selectedPaymentMethod === 'stripe') {
      minNote.textContent = 'Note that the minimum amount for card/bank payment is: US$2';
    } else {
      minNote.textContent = 'Note that the minimum amount is: US$2';
    }
  }
  updatePayButton();
}

function selectDepositAmount(amount, el) {
  selectedDepositAmount = amount;
  var customInput = document.getElementById('customAmount');
  if (customInput) customInput.value = '';
  document.querySelectorAll('.dep-amt').forEach(function(btn) {
    btn.style.background = 'var(--bg-primary)';
    btn.style.border = '1px solid var(--border)';
    delete btn.dataset.sel;
  });
  el.style.background = 'var(--accent-dim)';
  el.style.border = '2px solid var(--accent)';
  el.dataset.sel = '1';
  updatePayButton();
  if (selectedPaymentMethod === 'stripe') updateBankAmountPreview();
}

function selectCustomAmount(value) {
  var num = parseFloat(value);
  if (num > 0) {
    selectedDepositAmount = num;
    document.querySelectorAll('.dep-amt').forEach(function(btn) {
      btn.style.background = 'var(--bg-primary)';
      btn.style.border = '1px solid var(--border)';
      delete btn.dataset.sel;
    });
    updatePayButton();
    if (selectedPaymentMethod === 'stripe') updateBankAmountPreview();
  }
}

function selectPaymentMethod(method, el) {
  selectedPaymentMethod = method;
  document.querySelectorAll('.dep-meth').forEach(function(opt) {
    opt.style.background = 'var(--bg-primary)';
    opt.style.border = '1px solid var(--border)';
    delete opt.dataset.sel;
  });
  el.style.background = 'var(--accent-dim)';
  el.style.border = '2px solid var(--accent)';
  el.dataset.sel = '1';
  renderDepositPage(document.getElementById('mainContent'));
}

function updatePayButton() {
  var btn = document.getElementById('depositPayBtn');
  if (btn) {
    var label = 'Pay';
    if (selectedPaymentMethod === 'usdt') {
      label = 'Pay with USDT TRC-20';
    } else if (selectedPaymentMethod === 'stripe') {
      label = 'Pay with Card';
    } else if (selectedPaymentMethod === 'crypto') {
      var found = cryptoOptions.find(function(c) { return c.id === selectedCryptoCurrency; });
      label = 'Pay with ' + (found ? found.name : 'Crypto');
    }
    btn.innerHTML = '<i class="fas fa-lock" style="font-size:13px;"></i> ' + label + ' $' + selectedDepositAmount.toFixed(2) + ' Securely';
  }
}

async function processDeposit() {
  if (selectedDepositAmount < 2) {
    showToast('Minimum deposit is $2.00', 'error');
    return;
  }

  if (selectedPaymentMethod === 'usdt' && selectedDepositAmount < 5) {
    showToast('Minimum for USDT TRC-20 is $5.00', 'error');
    return;
  }
  // Note: USDT_TRX check removed from crypto since it's now a separate option

  var btn = document.getElementById('depositPayBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating payment...';
  btn.disabled = true;

  try {
    var endpoint, payload, redirectField;

    if (selectedPaymentMethod === 'stripe') {
      endpoint = '/api/deposit/flutterwave';
      payload = {
        email: getUserEmail(),
        amount: selectedDepositAmount,
        currency: selectedBankCurrency
      };
      redirectField = 'payment_link';

    } else if (selectedPaymentMethod === 'usdt') {
      endpoint = '/api/deposit/plisio';
      payload = {
        email: getUserEmail(),
        amount: selectedDepositAmount,
        pay_currency: 'USDT_TRX'
      };
      redirectField = 'invoice_url';

    } else {
      endpoint = '/api/deposit/plisio';
      payload = {
        email: getUserEmail(),
        amount: selectedDepositAmount,
        pay_currency: selectedCryptoCurrency
      };
      redirectField = 'invoice_url';
    }

    showDepositLoadingOverlay();

    var res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var data = await res.json();

    if (data.error) {
      hideDepositLoadingOverlay();
      showToast(data.error, 'error');
    } else if (data[redirectField]) {
      window.location.href = data[redirectField];
    } else {
      hideDepositLoadingOverlay();
      showToast('Unexpected response from payment provider', 'error');
    }
  } catch (err) {
    hideDepositLoadingOverlay();
    showToast('Error: ' + err.message, 'error');
  }

  updatePayButton();
  btn.disabled = false;
}

// ===== ADD THESE TWO FUNCTIONS BELOW processDeposit =====

function showDepositLoadingOverlay() {
  hideDepositLoadingOverlay();
  var overlay = document.createElement('div');
  overlay.id = 'depositLoadingOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:var(--bg-card);padding:40px 50px;border-radius:20px;text-align:center;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
    '<div style="width:60px;height:60px;border:4px solid var(--accent);border-top-color:transparent;border-radius:50%;animation:depositSpinner 1s linear infinite;margin:0 auto 20px;"></div>' +
    '<h3 style="color:var(--text-primary);font-size:18px;margin:0 0 10px 0;">Redirecting to Payment...</h3>' +
    '<p style="color:var(--text-secondary);font-size:14px;margin:0;">Please wait, do not close this page.</p>' +
  '</div>';
  
  // Add spinner keyframes if not already added
  if (!document.getElementById('depositSpinnerStyle')) {
    var style = document.createElement('style');
    style.id = 'depositSpinnerStyle';
    style.textContent = '@keyframes depositSpinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
  
  document.body.appendChild(overlay);
}

function hideDepositLoadingOverlay() {
  var overlay = document.getElementById('depositLoadingOverlay');
  if (overlay) overlay.remove();
}

async function loadDepositHistory() {
  try {
    var res = await fetch('/api/deposits/' + getUserEmail());
    var deposits = await res.json();
    var container = document.getElementById('depositHistoryList');
    if (!container) return;
    if (deposits.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">No deposits yet</div>';
      return;
    }
    window.depositHistoryData = deposits;
    container.innerHTML = deposits.map(function(d) {
      var statusColor = d.status === 'completed' ? 'var(--accent)' : d.status === 'pending' ? 'var(--warning)' : 'var(--danger)';
      // FIX: Show declined and cancelled as distinct statuses
      var statusText = d.status === 'completed' ? 'Completed' : d.status === 'pending' ? 'Pending' : d.status === 'declined' ? 'Declined' : d.status === 'cancelled' ? 'Cancelled' : 'Failed';
      if (d.status === 'declined') statusColor = '#e65100';
      if (d.status === 'cancelled') statusColor = 'var(--text-muted)';
      var methodLabels = {
        flutterwave: 'Bank / Card',
        usdt_trx: 'USDT TRC-20',
        usdt: 'USDT',
        btc: 'BTC',
        eth: 'ETH',
        ltc: 'LTC',
        doge: 'DOGE',
        bnb: 'BNB',
        sol: 'SOL',
        xrp: 'XRP',
        usdc: 'USDC',
        matic: 'MATIC',
        ada: 'ADA',
        trx: 'TRX'
      };
      var methodLabel = methodLabels[d.method] || methodLabels[d.pay_currency] || d.method || 'Unknown';
      var date = new Date(d.created_at);
      var timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var bgColor = d.status === 'completed' ? 'var(--accent-dim)' : d.status === 'pending' ? 'rgba(212,136,6,0.08)' : d.status === 'cancelled' ? 'rgba(0,0,0,0.04)' : 'rgba(217,48,37,0.06)';
      return '<div style="display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);">' +
        '<div style="flex:1;"><div style="font-size:13px;font-weight:600;">$' + d.amount.toFixed(2) + ' <span style="font-size:11px;color:var(--text-muted);font-weight:400;">' + methodLabel + '</span></div>' +
        '<div style="font-size:11px;color:var(--text-muted);">' + timeStr + '</div></div>' +
        '<span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:' + bgColor + ';color:' + statusColor + ';">' + statusText + '</span></div>';
    }).join('');
  } catch (err) { /* silent */ }
}


// =======================================================================
// ===== BUY LOGIC =====
// =======================================================================

window.selectedBuyService = null;

window.openModalById = function(serviceId) {
  var service = services.find(function(s) { return s.id === serviceId; });
  
  if (!service) {
    console.error("Service not found for ID:", serviceId);
    showToast('Error: Service not found', 'error');
    return;
  }

  window.selectedBuyService = service;
  window.modalRealPrice = service.price;
  window.modalServiceAvailable = true;

  var countryOptions = countries.map(function(c) {
    return '<option value="' + c.code + '">' + c.flag + ' ' + c.name + '</option>';
  }).join('');

  var mi = getServiceIconData(service.name, service.id, service.icon);

  var modalHTML = '<div class="modal-overlay show" id="buyModalOverlay" onclick="if(event.target===this)closeBuyModal()">' +
    '<div class="modal" style="width:440px;max-height:90vh;overflow-y:auto;">' +
      '<div class="modal-header">' +
        '<h2 class="modal-title">Get Virtual Number</h2>' +
        '<button class="modal-close" onclick="closeBuyModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="modal-body">' +
        '<div class="service-image-preview" id="servicePreview" style="display:' + (service.image ? 'flex' : 'none') + ';">' +
          '<img id="serviceImage" src="' + (service.image || '') + '" alt="' + service.name + '" onerror="this.parentElement.style.display=\'none\'">' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:14px;background:var(--bg-primary);border-radius:12px;border:1px solid var(--border);">' +
         '<div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;background:' + mi.bg + ';color:' + mi.color + ';">' + mi.html + '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:16px;font-weight:700;">' + service.name + '</div>' +
            '<div id="modalPriceDisplay" style="font-size:13px;color:var(--accent);font-weight:600;">$' + service.price.toFixed(2) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Country / Region</label>' +
          '<div style="display:flex;flex-direction:column;gap:8px;">' +
            '<div style="position:relative;">' +
              '<i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;pointer-events:none;z-index:2;"></i>' +
              '<input type="text" id="countrySearch" placeholder="Search country... (e.g. US, GB, GE)" ' +
                'style="width:100%;padding:10px 12px 10px 36px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;color:var(--text-primary);font-size:14px;font-family:inherit;outline:none;transition:all 0.2s;" ' +
                'onfocus="this.style.borderColor=\'var(--accent)\';this.style.boxShadow=\'0 0 0 3px var(--accent-dim)\'" ' +
                'onblur="this.style.borderColor=\'var(--border)\';this.style.boxShadow=\'none\'" ' +
                'oninput="filterCountries(this.value)">' +
            '</div>' +
            '<select class="form-select" id="countrySelect" onchange="updateModalPrice()">' + countryOptions + '</select>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="closeBuyModal()">Cancel</button>' +
        '<button class="btn btn-primary" id="finalBuyBtn" onclick="executeBuyNumber()"><i class="fas fa-phone-alt"></i> Get Number</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  var existing = document.getElementById('buyModalOverlay');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  var searchInput = document.getElementById('countrySearch');
  if (searchInput) {
    searchInput.addEventListener('input', filterCountries);
  }

  updateModalPrice();
};

function filterCountries(query) {
  var select = document.getElementById('countrySelect');
  if (!select) return;
  
  var queryLower = query.toLowerCase().trim();
  var options = select.querySelectorAll('option');
  var visibleCount = 0;
  var firstVisible = null;
  
  for (var i = 0; i < options.length; i++) {
    options[i].style.display = 'none';
  }
  
  if (queryLower === '') {
    for (var i = 0; i < options.length; i++) {
      options[i].style.display = '';
      visibleCount++;
      if (!firstVisible) firstVisible = options[i];
    }
  } else {
    var searchTerms = queryLower.split(/\s+/);
    
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var text = option.textContent.toLowerCase();
      var value = option.value.toLowerCase();
      
      var matches = searchTerms.some(function(term) {
        return text.indexOf(term) !== -1 || value.indexOf(term) !== -1;
      });
      
      if (matches) {
        option.style.display = '';
        visibleCount++;
        if (!firstVisible) firstVisible = options[i];
      }
    }
  }
  
  if (firstVisible) {
    select.value = firstVisible.value;
    updateModalPrice();
  } else if (queryLower !== '') {
    select.value = '';
    var priceEl = document.getElementById('modalPriceDisplay');
    if (priceEl) {
      priceEl.textContent = 'Select a country';
      priceEl.style.color = 'var(--text-muted)';
    }
  }
}

window.closeBuyModal = function() {
  var modal = document.getElementById('buyModalOverlay');
  if (modal) modal.remove();
  window.selectedBuyService = null;
};

// ===== REPLACE updateModalPrice WITH THIS VERSION - Shows price instantly =====
window.updateModalPrice = function() {
  var service = window.selectedBuyService;
  if (!service) return;

  var countryDropdown = document.getElementById('countrySelect');
  var countryCode = countryDropdown ? countryDropdown.value : 'us';
  var priceEl = document.getElementById('modalPriceDisplay');
  var buyBtn = document.getElementById('finalBuyBtn');
  if (!priceEl) return;

  // ✅ FIX 1: Show default price IMMEDIATELY (no "Loading price...")
  window.modalRealPrice = service.price;
  window.modalServiceAvailable = true;
  priceEl.textContent = '$' + service.price.toFixed(2);
  priceEl.style.color = 'var(--accent)';
  if (buyBtn) { 
    buyBtn.disabled = false; 
    buyBtn.innerHTML = '<i class="fas fa-phone-alt"></i> Get Number'; 
  }

  // Check cache and update silently (no loading indicator)
  var cached = (typeof priceCache !== 'undefined') ? priceCache[countryCode] : null;
  if (cached && Object.keys(cached).length > 0) {
    if (cached[service.id] !== undefined) {
      window.modalRealPrice = cached[service.id];
      window.modalServiceAvailable = true;
      priceEl.textContent = '$' + cached[service.id].toFixed(2);
    } else {
      window.modalServiceAvailable = false;
      priceEl.textContent = 'Not available';
      priceEl.style.color = 'var(--danger)';
      if (buyBtn) { buyBtn.disabled = true; buyBtn.innerHTML = '<i class="fas fa-ban"></i> Unavailable'; }
    }
    return;
  }

  // Fetch in background and update silently
  if (typeof fetchPricesForCountry === 'function') {
    fetchPricesForCountry(countryCode).then(function(prices) {
      // Only update if modal is still open
      if (!document.getElementById('buyModalOverlay')) return;
      var currentCountry = document.getElementById('countrySelect');
      if (!currentCountry || currentCountry.value !== countryCode) return;
      
      if (prices && Object.keys(prices).length > 0) {
        if (prices[service.id] !== undefined) {
          window.modalRealPrice = prices[service.id];
          window.modalServiceAvailable = true;
          priceEl.textContent = '$' + prices[service.id].toFixed(2);
          priceEl.style.color = 'var(--accent)';
        } else {
          window.modalServiceAvailable = false;
          priceEl.textContent = 'Not available';
          priceEl.style.color = 'var(--danger)';
          if (buyBtn) { buyBtn.disabled = true; buyBtn.innerHTML = '<i class="fas fa-ban"></i> Unavailable'; }
        }
      }
    }).catch(function() {
      // Silent fail - keep showing default price
    });
  }
};

// ===== REPLACE THE ENTIRE executeBuyNumber FUNCTION =====
window.executeBuyNumber = function() {
  if (!window.selectedBuyService || !window.selectedBuyService.id) {
    showToast('Please select a service.', 'error');
    return;
  }

  if (!window.modalServiceAvailable) {
    showToast('This service is not available for the selected country.', 'error');
    var btn = document.getElementById('finalBuyBtn');
    if (btn) { btn.innerHTML = '<i class="fas fa-phone-alt"></i> Get Number'; btn.disabled = false; }
    return;
  }

  var serviceCode = window.selectedBuyService.id;
  var serviceName = window.selectedBuyService.name;
  var servicePrice = window.modalRealPrice;
  var userEmail = (typeof getUserEmail === 'function') ? getUserEmail() : '';
  
  var countryDropdown = document.getElementById('countrySelect');
  var countryCode = countryDropdown ? countryDropdown.value : 'us';
  
  var countryData = countries.find(function(c) { return c.code === countryCode; });
  var countryFlag = countryData ? countryData.flag : '🏳️';
  var countryName = countryData ? countryData.name : 'Unknown';
  var serviceIcon = window.selectedBuyService.icon || '';

  var btn = document.getElementById('finalBuyBtn');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; btn.disabled = true; }

  // ===== CHECK BALANCE FIRST =====
  if (userEmail) {
    fetch('/api/user/' + userEmail)
      .then(function(res) { return res.json(); })
      .then(function(userData) {
        var serverBalance = parseFloat(userData.balance) || 0;
        window.updateBalanceDisplay(serverBalance);
        
        if (serverBalance < servicePrice) {
          var shortage = (servicePrice - serverBalance).toFixed(2);
          showToast('Insufficient balance! Need $' + servicePrice.toFixed(2) + ', have $' + serverBalance.toFixed(2) + '. Deposit $' + shortage + ' more.', 'error');
          if (btn) {
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Deposit $' + shortage;
            btn.disabled = false;
            btn.onclick = function() { closeBuyModal(); goToPage('deposit'); };
          }
          return;
        }
        
        proceedWithPurchase();
      })
      .catch(function(err) {
        console.error('Balance check failed:', err);
        proceedWithPurchase();
      });
  } else {
    proceedWithPurchase();
  }
  
  function proceedWithPurchase() {
    // ===== FIX: Get SMS-Bus country ID using the NOW-DEFINED function =====
    var smsBusCountryId = null;
    if (typeof getSmsBusCountryId === 'function') {
      smsBusCountryId = getSmsBusCountryId(countryCode);
    }
    var smsBusServiceCode = null;
    if (typeof getSmsBusServiceCode === 'function') {
      smsBusServiceCode = getSmsBusServiceCode(serviceCode);
    }
    
    console.log('SMS-Bus params:', {
      countryCode: countryCode,
      countryId: smsBusCountryId,
      serviceCode: serviceCode,
      apiServiceCode: smsBusServiceCode,
      email: userEmail,
      cost: servicePrice
    });
    
    if (!smsBusCountryId) {
      showToast('Country not supported. Code: ' + countryCode, 'error');
      if (btn) { btn.innerHTML = '<i class="fas fa-phone-alt"></i> Get Number'; btn.disabled = false; }
      return;
    }
    
    if (!smsBusServiceCode) {
      showToast('Service not supported. Code: ' + serviceCode, 'error');
      if (btn) { btn.innerHTML = '<i class="fas fa-phone-alt"></i> Get Number'; btn.disabled = false; }
      return;
    }
    
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting number...'; }
    
    // Call SMS-Bus API through your backend proxy
    smsbusBuyNumber(smsBusCountryId, smsBusServiceCode, userEmail)
      .then(function(apiData) {
        console.log('SMS-Bus buy response:', apiData);
        
        // Handle different response formats from SMS-Bus
        var activationId = apiData.id || apiData.activation_id || apiData.order_id || apiData.number_id;
        var phoneNumber = apiData.phone || apiData.number || apiData.phone_number || apiData.mobile_number;
        
        if (!activationId || !phoneNumber) {
          throw new Error('Invalid response from SMS-Bus: ' + JSON.stringify(apiData).substring(0, 200));
        }
        
        // Save to YOUR backend for tracking
        return fetch('/api/numbers/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userEmail,
            activationId: activationId,
            phone: phoneNumber,
            serviceName: serviceName,
            serviceId: serviceCode,
            serviceIcon: serviceIcon,
            countryCode: countryCode,
            countryFlag: countryFlag,
            countryName: countryName,
            cost: servicePrice,
            status: 'waiting',
            createdAt: new Date().toISOString(),
            totalTime: 300
          })
        }).then(function(res) { 
          if (!res.ok) return res.json().then(function(d) { throw new Error(d.error || 'Save failed'); });
          return res.json(); 
        })
          .then(function(saveData) {
            return {
              id: activationId,
              phone: phoneNumber,
              balance: saveData.balance,
              saved: true
            };
          });
      })
      .then(function(result) {
        // Update balance from backend
        if (result.balance !== undefined) {
          window.updateBalanceDisplay(result.balance);
        } else {
          if (typeof loadBalance === 'function') loadBalance();
        }
        
        
        closeBuyModal();
        
                // ✅ FIX: Show number INSTANTLY, then sync in background
        window.activeNumbers.unshift({
          id: result.id,
          phone: result.phone,
          service_name: serviceName,
          service_id: serviceCode,
          service_icon: serviceIcon,
          country_code: countryCode,
          country_flag: countryFlag,
          status: 'waiting',
          code: null,
          cost: servicePrice,
          created_at: new Date().toISOString(),
          total_time: 300,
          time_left: 300
        });
        
        // Render immediately (no wait)
        if (typeof renderMainContent === 'function') renderMainContent();
        
        // Scroll to active numbers
        setTimeout(function() {
          var activeSection = document.getElementById('activeNumbersSection');
          if (activeSection) activeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        // Sync from server in background (silent, no re-render)
        if (typeof loadNumbers === 'function') {
          loadNumbers().catch(function() {});
        }
      })
      .catch(function(err) {
        console.error('Buy error:', err);
        
        var errorMsg = err.message || 'Failed to get number';
        
        if (errorMsg.includes('409') || errorMsg.toLowerCase().includes('no numbers') || errorMsg.toLowerCase().includes('available')) {
          errorMsg = 'No numbers available for this service/country. Try a different country or try again later.';
        } else if (errorMsg.includes('402') || errorMsg.toLowerCase().includes('insufficient') || errorMsg.toLowerCase().includes('balance')) {
          errorMsg = 'Provider balance too low. Please contact support.';
        } else if (errorMsg.includes('404') || errorMsg.toLowerCase().includes('not found')) {
          errorMsg = 'Service or country not available on provider.';
        } else if (errorMsg.includes('400')) {
          errorMsg = 'Invalid request. Please try again.';
        }
        
        showToast(errorMsg, 'error');
      })
      .finally(function() {
        if (btn) {
          btn.innerHTML = '<i class="fas fa-phone-alt"></i> Get Number';
          btn.disabled = false;
          btn.onclick = window.executeBuyNumber;
        }
      });
  }
};

// ===== REPLACE BOTH POLLING BLOCKS WITH THIS SINGLE VERSION =====
if (!window._smsPollActive) {
  window._smsPollActive = true;
  
  // Direct polling - bypasses any function overrides
  setInterval(function() {
    if (!window.activeNumbers || window.activeNumbers.length === 0) return;
    var now = Date.now();
    
    window.activeNumbers.forEach(function(n) {
      if (n.status !== 'waiting') return;
      
      var realId = n.provider_request_id || n.id;
      if (!realId) return;
      
      // Rate limit: check every 5 seconds per number
      if (!n._lastCheck) n._lastCheck = 0;
      if (now - n._lastCheck < 5000) return;
      n._lastCheck = now;
      
      // Direct API call
      fetch('/api/v2/status?request_id=' + realId)
        .then(function(r) { return r.json(); })
        .then(function(json) {
          // Provider format: {"code":200,"data":"791625"} = CODE RECEIVED
          if (json.code === 200 && json.data && String(json.data).length >= 4) {
            var code = String(json.data).trim();
            console.log('✅ CODE RECEIVED:', code, 'for', n.phone);
            
            // Update local state
            n.status = 'received';
            n.code = code;
            n.sms_text = 'Your verification code is ' + code;
            
            // Save to server
            fetch('/api/numbers/' + n.id + '/code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: code, smsText: n.sms_text })
            }).catch(function() {});
            
            // Start grace period
            if (typeof startGracePeriod === 'function') startGracePeriod(n.id);
            
            // Show notification
            showToast('SMS received! Code: ' + code, 'success');
            
            // Re-render if on numbers page
            if (window.currentPage === 'numbers' && typeof renderMainContent === 'function') {
              renderMainContent();
            }
          } 
          else if (json.code === 50102) {
            // Expired
            console.log('⏰ Number expired:', n.phone);
            n.status = 'expired';
            n.time_left = 0;
            
            fetch('/api/numbers/' + n.id + '/expire', { method: 'POST' }).catch(function() {});
            if (typeof loadBalance === 'function') loadBalance();
            
            if (window.currentPage === 'numbers' && typeof renderMainContent === 'function') {
              renderMainContent();
            }
          }
          // 50101 = still waiting, do nothing
        })
        .catch(function(err) {
          console.warn('Status check error for', n.id, ':', err.message);
        });
    });
  }, 1000);
  
  console.log('✅ SMS polling started');
}