
async function processDeposit() {
  console.log('DEBUG selectedPaymentMethod:', selectedPaymentMethod);  // Should show 'kora' when Bank/Card is selected
  // ...
}async function processDeposit() {
  if (selectedPaymentMethod === 'kora') {
    // kora logic works now
  }

  if (selectedPaymentMethod === 'usdt' && selectedDepositAmount < 5) {
    showToast('Minimum for USDT TRC-20 is $5.00', 'error');
    return;
  }
  if (selectedPaymentMethod === 'crypto' && selectedCryptoCurrency === 'USDT_TRX' && selectedDepositAmount < 5) {
    showToast('Minimum for USDT TRC-20 is $5.00', 'error');
    return;
  }

  var btn = document.getElementById('depositPayBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating payment...';
  btn.disabled = true;

  try {
    // ===== KORA: Open hosted checkout in browser =====
    if (selectedPaymentMethod === 'kora') {
      var koraRes = await fetch('/api/deposit/kora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: getUserEmail(),
          amount: selectedDepositAmount,
          currency: selectedBankCurrency
        })
      });
      var koraData = await koraRes.json();

      if (koraData.error) {
        showToast(koraData.error, 'error');
        updatePayButton();
        btn.disabled = false;
        return;
      }

      // Build Kora hosted checkout URL
      var koraUrl = 'https://korapay.com/payment/' + koraData.public_key +
        '?reference=' + koraData.reference +
        '&amount=' + koraData.amount +
        '&currency=' + koraData.currency +
        '&email=' + encodeURIComponent(koraData.email) +
        '&redirect_url=' + encodeURIComponent(koraData.redirect_url);

      // Redirect user directly to Kora (browser handles Cloudflare)
      window.location.href = koraUrl;
      return;
    }

    // ===== PLISIO: Server-side invoice creation =====
    var endpoint, payload, redirectField;

    if (selectedPaymentMethod === 'usdt') {
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