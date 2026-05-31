// ====================================================================
// ====== START SERVER ======
// ====================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

var db;
try {
  db = require('./db');
} catch (err) {
  console.error('FATAL: Cannot load db.js - ' + err.message);
  process.exit(1);
}

const countries = [
  { code: 'us', name: 'United States', flag: '🇺🇸', prefix: '+1', basePrice: 2.90 },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', prefix: '+44', basePrice: 0.65 },
  { code: 'de', name: 'Germany', flag: '🇩🇪', prefix: '+49', basePrice: 0.60 },
  { code: 'fr', name: 'France', flag: '🇫🇷', prefix: '+33', basePrice: 0.55 },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', prefix: '+1', basePrice: 0.60 },
  { code: 'au', name: 'Australia', flag: '🇦🇺', prefix: '+61', basePrice: 0.70 },
  { code: 'it', name: 'Italy', flag: '🇮🇹', prefix: '+39', basePrice: 0.50 },
  { code: 'es', name: 'Spain', flag: '🇪🇸', prefix: '+34', basePrice: 0.50 },
  { code: 'sa', name: 'Saudi Arabia', flag: '🇸🇦', prefix: '+966', basePrice: 0.50 },
  { code: 'ae', name: 'United Arab Emirates', flag: '🇦🇪', prefix: '+971', basePrice: 0.50 },
  { code: 'il', name: 'Israel', flag: '🇮🇱', prefix: '+972', basePrice: 0.50 },
  { code: 'ps', name: 'Palestine', flag: '🇵🇸', prefix: '+970', basePrice: 0.50 },
  { code: 'tr', name: 'Turkey', flag: '🇹🇷', prefix: '+90', basePrice: 0.50 },
  { code: 'qa', name: 'Qatar', flag: '🇶🇦', prefix: '+974', basePrice: 0.50 },
  { code: 'jp', name: 'Japan', flag: '🇯🇵', prefix: '+81', basePrice: 0.50 },
  { code: 'mg', name: 'Madagascar', flag: '🇲🇬', prefix: '+261', basePrice: 0.50 },
  { code: 'at', name: 'Austria', flag: '🇦🇹', prefix: '+43', basePrice: 0.50 },
  { code: 'ng', name: 'Nigeria', flag: '🇳🇬', prefix: '+234', basePrice: 0.50 },
  { code: 'lt', name: 'Lithuania', flag: '🇱🇹', prefix: '+370', basePrice: 0.50 },
  { code: 'eg', name: 'Egypt', flag: '🇪🇬', prefix: '+20', basePrice: 0.50 },
  { code: 'ie', name: 'Ireland', flag: '🇮🇪', prefix: '+353', basePrice: 0.50 },
  { code: 'ci', name: 'Ivory Coast', flag: '🇨🇮', prefix: '+225', basePrice: 0.50 },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬', prefix: '+65', basePrice: 0.50 },
  { code: 'ee', name: 'Estonia', flag: '🇪🇪', prefix: '+372', basePrice: 0.50 },
  { code: 'vn', name: 'Vietnam', flag: '🇻🇳', prefix: '+84', basePrice: 0.50 },
  { code: 'ro', name: 'Romania', flag: '🇷🇴', prefix: '+40', basePrice: 0.50 },
  { code: 'th', name: 'Thailand', flag: '🇹🇭', prefix: '+66', basePrice: 0.50 },
  { code: 'in', name: 'India', flag: '🇮🇳', prefix: '+91', basePrice: 0.50 },
  { code: 'ru', name: 'Russia', flag: '🇷🇺', prefix: '+7', basePrice: 0.50 },
  { code: 'co', name: 'Colombia', flag: '🇨🇴', prefix: '+57', basePrice: 0.50 },
  { code: 'rs', name: 'Serbia', flag: '🇷🇸', prefix: '+381', basePrice: 0.50 },
  { code: 'ua', name: 'Ukraine', flag: '🇺🇦', prefix: '+380', basePrice: 0.50 },
  { code: 'cy', name: 'Cyprus', flag: '🇨🇾', prefix: '+357', basePrice: 0.50 },
  { code: 'lv', name: 'Latvia', flag: '🇱🇻', prefix: '+371', basePrice: 0.50 },
  { code: 'my', name: 'Malaysia', flag: '🇲🇾', prefix: '+60', basePrice: 0.50 },
  { code: 'bo', name: 'Bolivia', flag: '🇧🇴', prefix: '+591', basePrice: 0.50 },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩', prefix: '+62', basePrice: 0.50 },
  { code: 'pa', name: 'Panama', flag: '🇵🇦', prefix: '+507', basePrice: 0.50 },
  { code: 'ph', name: 'Philippines', flag: '🇵🇭', prefix: '+63', basePrice: 0.50 },
  { code: 'dk', name: 'Denmark', flag: '🇩🇰', prefix: '+45', basePrice: 0.50 },
  { code: 'ge', name: 'Georgia', flag: '🇬🇪', prefix: '+995', basePrice: 0.50 },
  { code: 'cm', name: 'Cameroon', flag: '🇨🇲', prefix: '+237', basePrice: 0.50 },
  { code: 'bj', name: 'Benin', flag: '🇧🇯', prefix: '+229', basePrice: 0.50 },
  { code: 'nz', name: 'New Zealand', flag: '🇳🇿', prefix: '+64', basePrice: 0.50 },
  { code: 'ni', name: 'Nicaragua', flag: '🇳🇮', prefix: '+505', basePrice: 0.50 },
  { code: 'kh', name: 'Cambodia', flag: '🇰🇭', prefix: '+855', basePrice: 0.50 },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽', prefix: '+52', basePrice: 0.50 },
  { code: 'kz', name: 'Kazakhstan', flag: '🇰🇿', prefix: '+7', basePrice: 0.50 },
  { code: 'af', name: 'Afghanistan', flag: '🇦🇫', prefix: '+93', basePrice: 0.50 },
  { code: 'al', name: 'Albania', flag: '🇦🇱', prefix: '+355', basePrice: 0.50 },
  { code: 'dz', name: 'Algeria', flag: '🇩🇿', prefix: '+213', basePrice: 0.50 },
  { code: 'ao', name: 'Angola', flag: '🇦🇴', prefix: '+244', basePrice: 0.50 },
  { code: 'ar', name: 'Argentina', flag: '🇦🇷', prefix: '+54', basePrice: 0.50 },
  { code: 'am', name: 'Armenia', flag: '🇦🇲', prefix: '+374', basePrice: 0.50 },
  { code: 'la', name: 'Laos', flag: '🇱🇦', prefix: '+856', basePrice: 0.50 },
  { code: 'bd', name: 'Bangladesh', flag: '🇧🇩', prefix: '+880', basePrice: 0.50 },
  { code: 'za', name: 'South Africa', flag: '🇿🇦', prefix: '+27', basePrice: 0.50 },
  { code: 'ma', name: 'Morocco', flag: '🇲🇦', prefix: '+212', basePrice: 0.50 },
  { code: 'mm', name: 'Myanmar', flag: '🇲🇲', prefix: '+95', basePrice: 0.50 },
  { code: 'tj', name: 'Tajikistan', flag: '🇹🇯', prefix: '+992', basePrice: 0.50 },
  { code: 'az', name: 'Azerbaijan', flag: '🇦🇿', prefix: '+994', basePrice: 0.50 },
  { code: 'bh', name: 'Bahrain', flag: '🇧🇭', prefix: '+973', basePrice: 0.50 },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱', prefix: '+31', basePrice: 0.50 },
  { code: 'by', name: 'Belarus', flag: '🇧🇾', prefix: '+375', basePrice: 0.50 },
  { code: 'bw', name: 'Botswana', flag: '🇧🇼', prefix: '+267', basePrice: 0.50 },
  { code: 'br', name: 'Brazil', flag: '🇧🇷', prefix: '+55', basePrice: 0.50 },
  { code: 'bg', name: 'Bulgaria', flag: '🇧🇬', prefix: '+359', basePrice: 0.50 },
  { code: 'ke', name: 'Kenya', flag: '🇰🇪', prefix: '+254', basePrice: 0.50 },
  { code: 'tz', name: 'Tanzania', flag: '🇹🇿', prefix: '+255', basePrice: 0.50 },
  { code: 'kg', name: 'Kyrgyzstan', flag: '🇰🇬', prefix: '+996', basePrice: 0.50 },
  { code: 'pl', name: 'Poland', flag: '🇵🇱', prefix: '+48', basePrice: 0.50 }
];

function generatePhone(prefix) {
  return prefix + ' ' + Math.floor(Math.random() * 900 + 100) + ' ' + Math.floor(Math.random() * 900 + 100) + ' ' + Math.floor(Math.random() * 9000 + 1000);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====================================================================
// ====== AUTH ======
// ====================================================================

app.post('/api/auth/signup', async function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  var referralCode = req.body.referral;

  if (!email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  var existing = await db.prepare('SELECT email FROM users WHERE email = $1').get(email);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  var hash = bcrypt.hashSync(password, 10);

  // Generate a referral code for the new user immediately
  var newUserRefCode = 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  await db.prepare('INSERT INTO users (email, password, balance, referral_code) VALUES ($1, $2, DEFAULT, $3)').run(email, hash, newUserRefCode);

  // Track referral if a code was provided in the signup payload
  if (referralCode) {
    try {
      var referrer = await db.prepare('SELECT email FROM users WHERE referral_code = $1').get(referralCode);
      if (referrer && referrer.email !== email) {
        await db.prepare('UPDATE users SET referred_by = $1 WHERE email = $2').run(referrer.email, email);
        console.log('[REFERRAL] User ' + email + ' referred by ' + referrer.email);
      } else if (referrer && referrer.email === email) {
        console.log('[REFERRAL] Self-referral blocked for ' + email);
      } else {
        console.log('[REFERRAL] Referral code not found: ' + referralCode);
      }
    } catch (err) {
      console.error('[REFERRAL] Tracking error:', err.message);
    }
  }

  res.json({ email: email, message: 'Account created successfully.' });
});

app.post('/api/auth/login', async function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  if (!email || !password) return res.status(400).json({ error: 'All fields are required' });

  var user = await db.prepare('SELECT * FROM users WHERE email = $1').get(email);
  if (!user) return res.status(400).json({ error: 'Invalid email or password' });
  if (!user.password) return res.status(400).json({ error: 'This account has no password set' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Invalid email or password' });

  res.json({ email: user.email, name: user.name });
});

app.post('/api/auth/forgot-password', function(req, res) {
  if (!req.body.email) return res.status(400).json({ error: 'Email is required' });
  res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
});

// ====================================================================
// ====== USER DATA (includes referral info) ======
// ====================================================================

app.get('/api/user/:email', async function(req, res) {
  try {
    var email = req.params.email;
    var user = await db.prepare('SELECT balance, referral_code FROM users WHERE email = $1').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure referral code exists
    var referralCode = user.referral_code;
    if (!referralCode) {
      referralCode = 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      await db.prepare('UPDATE users SET referral_code = $1 WHERE email = $2').run(referralCode, email);
    }

    // Count total referred users
    var countResult = await db.prepare('SELECT COUNT(*) as total FROM users WHERE referred_by = $1').get(email);
    var totalReferrals = countResult ? parseInt(countResult.total) : 0;

    // Calculate total commissions (10% of all successful purchases by referred users)
    var historyResult = await db.prepare(
      "SELECT COALESCE(SUM(cost), 0) as total_spent FROM history WHERE email IN (SELECT email FROM users WHERE referred_by = $1) AND status = 'success'"
    ).get(email);
    var totalCommissions = historyResult ? (parseFloat(historyResult.total_spent) * 0.10) : 0;

    // Build referral history list
    var referrals = [];
    try {
      var referredUsers = await db.prepare('SELECT email, created_at FROM users WHERE referred_by = $1 ORDER BY created_at DESC').all(email);
      for (var i = 0; i < referredUsers.length; i++) {
        var refEmail = referredUsers[i].email;
        var spentResult = await db.prepare("SELECT COALESCE(SUM(cost), 0) as total FROM history WHERE email = $1 AND status = 'success'").get(refEmail);
        var spent = spentResult ? parseFloat(spentResult.total) : 0;
        var commission = spent * 0.10;
        referrals.push({
          email: refEmail,
          earned: commission,
          status: commission > 0 ? 'Paid' : 'Pending',
          date: new Date(referredUsers[i].created_at).toLocaleDateString()
        });
      }
    } catch (e) {
      console.log('Referrals query skipped:', e.message);
    }

    // Build withdrawal history list
    var withdrawals = [];
    try {
      var wdRows = await db.prepare('SELECT method, amount, status, created_at FROM withdrawals WHERE email = $1 ORDER BY created_at DESC').all(email);
      withdrawals = wdRows.map(function(w) {
        return {
          method: w.method === 'crypto' ? 'Crypto' : w.method === 'giftcard' ? 'Gift Card' : w.method,
          amount: parseFloat(w.amount),
          status: w.status.charAt(0).toUpperCase() + w.status.slice(1),
          date: new Date(w.created_at).toLocaleDateString()
        };
      });
    } catch (e) {
      console.log('Withdrawals query skipped:', e.message);
    }

    res.json({
      balance: user.balance,
      refCode: referralCode,
      referralCount: totalReferrals,
      totalCommissions: totalCommissions,
      referrals: referrals,
      withdrawals: withdrawals
    });
  } catch (err) {
    console.error('User API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/refcode', async function(req, res) {
  try {
    var email = req.body.email;
    var refCode = req.body.refCode;
    if (!email || !refCode) return res.status(400).json({ error: 'Missing data' });
    var user = await db.prepare('SELECT referral_code FROM users WHERE email = $1').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.referral_code) {
      await db.prepare('UPDATE users SET referral_code = $1 WHERE email = $2').run(refCode, email);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== PLISIO HELPER ======
// ====================================================================

async function createPlisioInvoice(amount, currency, reference, email) {
  var apiKey = process.env.PLISIO_SECRET_KEY;
  if (!apiKey) throw new Error('Plisio API key not configured in .env');

  var backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL;

  var params = new URLSearchParams({
    source_currency: 'USD',
    source_amount: amount,
    order_number: reference,
    order_name: 'SonVerify deposit - ' + email,
    currency: (currency || 'TRX').toUpperCase(),
    email: email,
    callback_url: backendUrl + '/api/deposit/plisio-callback?json=true',
    success_invoice_url: process.env.FRONTEND_URL + '/?deposit=success&ref=' + reference,
    fail_invoice_url: process.env.FRONTEND_URL + '/?deposit=failed&ref=' + reference,
    api_key: apiKey
  });

  var response = await fetch('https://api.plisio.net/api/v1/invoices/new?' + params.toString(), { method: 'GET' });
  var data = await response.json();

  if (data.status !== 'success') throw new Error(data.data && data.data.message ? data.data.message : 'Plisio error: ' + JSON.stringify(data));
  if (!data.data.invoice_url) throw new Error('No invoice URL returned from Plisio');
  return data.data;
}

// ====================================================================
// ====== DEPOSIT: FLUTTERWAVE (Bank / Card / Mobile Money) ======
// ====================================================================

var localCurrencyRates = {
  NGN: 1500, GHS: 15, KES: 150, ZAR: 18, UGX: 3700, TZS: 2500, RWF: 1300,
  XOF: 600, XAF: 600, EGP: 30, MAD: 10
};

app.post('/api/deposit/flutterwave', async function(req, res) {
  var email = req.body.email;
  var amount = req.body.amount;
  var targetCurrency = req.body.currency || 'USD';

  if (!email || !amount) return res.status(400).json({ error: 'All fields required' });
  if (amount < 2) return res.status(400).json({ error: 'Minimum deposit is $2.00' });
  if (amount > 1000) return res.status(400).json({ error: 'Maximum deposit is $1,000.00' });

  var reference = 'DEP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  await db.prepare('INSERT INTO deposits (email, amount, method, status, reference) VALUES ($1, $2, $3, $4, $5)').run(email, amount, 'flutterwave', 'pending', reference);

  try {
    var flutterAmount = amount;
    var rate = localCurrencyRates[targetCurrency];
    if (targetCurrency !== 'USD' && rate) {
      flutterAmount = Math.round(amount * rate);
    }

    var flutterRes = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.FLUTTERWAVE_SECRET_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: flutterAmount,
        currency: targetCurrency,
        payment_options: ['card', 'banktransfer', 'mobilemoney'],
        hosted_payment: 1,
        redirect_url: process.env.FRONTEND_URL + '/?deposit=success&ref=' + reference,
        customer: { email: email, name: email.split('@')[0] },
        customizations: { title: 'SonVerify - Top Up Balance', description: 'Add $' + amount.toFixed(2) + ' to your account' }
      })
    });

    var flutterData = await flutterRes.json();

    if (flutterData.status === 'success') {
      await db.prepare('UPDATE deposits SET flutterwave_ref = $1 WHERE reference = $2')
        .run(flutterData.data.tx_ref, reference);
      console.log('[FLUTTERWAVE] Payment created:', reference, 'FW ref:', flutterData.data.tx_ref);
      res.json({ payment_link: flutterData.data.link });
    } else {
      await db.prepare('UPDATE deposits SET status = $1 WHERE reference = $2').run('failed', reference);
      res.status(500).json({ error: flutterData.message || 'Flutterwave error' });
    }
  } catch (err) {
    console.error('[FLUTTERWAVE] Deposit error:', err.message);
    await db.prepare('UPDATE deposits SET status = $1 WHERE reference = $2').run('failed', reference);
    res.status(500).json({ error: 'Payment error: ' + err.message });
  }
});

// ====================================================================
// ====== FLUTTERWAVE WEBHOOK (single, fixed version) ======
// ====================================================================

app.post('/api/webhook/flutterwave', async function(req, res) {
  try {
    console.log('=== FLUTTERWAVE WEBHOOK ===');
    console.log('Event:', req.body.event, 'Status:', req.body.data ? req.body.data.status : 'N/A');

    var secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
    var signature = req.headers['verif-hash'];

    // If a secret is configured, verify it; skip verification if not set (for testing)
    if (secretHash && signature && signature !== secretHash) {
      console.log('WEBHOOK REJECTED: Signature mismatch');
      return res.status(401).end();
    }

    var payload = req.body;
    var validEvents = ['charge.completed', 'payment.completed', 'transfer.completed'];
    var isSuccess = payload.data && (payload.data.status === 'successful' || payload.data.status === 'completed');

    if (validEvents.indexOf(payload.event) !== -1 && isSuccess) {
      var txRef = payload.data.tx_ref;

      // Look up by flutterwave_ref first, then by reference
      var deposit = await db.prepare(
        "SELECT * FROM deposits WHERE (flutterwave_ref = $1 OR reference = $1) AND status = 'pending'"
      ).get(txRef);

      if (deposit) {
        var paidAmount = deposit.amount;
        await db.prepare('UPDATE deposits SET status = $1, flutterwave_ref = $2 WHERE reference = $3')
          .run('completed', txRef, deposit.reference);
        await db.prepare('UPDATE users SET balance = balance + $1 WHERE email = $2').run(paidAmount, deposit.email);
        console.log('CREDITED via Flutterwave:', deposit.email, '$' + paidAmount, 'ref:', txRef);
      } else {
        // Check if already completed to prevent double-credit logging
        var existing = await db.prepare("SELECT status FROM deposits WHERE reference = $1 OR flutterwave_ref = $1").get(txRef);
        if (existing && existing.status === 'completed') {
          console.log('Already completed, skipping:', txRef);
        } else {
          console.log('Deposit not found for tx_ref:', txRef);
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Flutterwave webhook error:', err.message);
    res.status(200).json({ status: 'ok' });
  }
});

// ====================================================================
// ====== DEPOSIT: PLISIO (Crypto) ======
// ====================================================================

app.post('/api/deposit/plisio', async function(req, res) {
  var email = req.body.email;
  var amount = req.body.amount;
  var payCurrency = req.body.pay_currency || 'TRX';

  if (!email || !amount) return res.status(400).json({ error: 'All fields required' });
  if (amount < 2) return res.status(400).json({ error: 'Minimum deposit is $2.00' });
  if (amount > 1000) return res.status(400).json({ error: 'Maximum deposit is $1,000.00' });

  var reference = 'DEP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  await db.prepare('INSERT INTO deposits (email, amount, method, status, reference, pay_currency) VALUES ($1, $2, $3, $4, $5, $6)').run(email, amount, 'crypto', 'pending', reference, payCurrency);

  try {
    var result = await createPlisioInvoice(amount, payCurrency, reference, email);
    res.json({ invoice_url: result.invoice_url, reference: reference });
  } catch (err) {
    console.error('Plisio deposit error:', err.message);
    await db.prepare('UPDATE deposits SET status = $1 WHERE reference = $2').run('failed', reference);
    res.status(500).json({ error: 'Payment error: ' + err.message });
  }
});

app.post('/api/deposit/plisio-callback', async function(req, res) {
  try {
    var status = req.body.status;
    var orderId = req.body.order_number;
    console.log('Plisio callback: status=' + status + ' order=' + orderId);

    if (status === 'completed') {
      var deposit = await db.prepare("SELECT * FROM deposits WHERE reference = $1 AND status = 'pending'").get(orderId);
      if (deposit) {
        var creditAmount = parseFloat(req.body.source_amount) || deposit.amount;
        await db.prepare("UPDATE deposits SET status = 'completed' WHERE reference = $1").run(orderId);
        await db.prepare('UPDATE users SET balance = balance + $1 WHERE email = $2').run(creditAmount, deposit.email);
        console.log('Credited via Plisio:', orderId, '$' + creditAmount, '->', deposit.email);
      }
    } else if (status === 'expired' || status === 'cancelled') {
      await db.prepare("UPDATE deposits SET status = 'failed' WHERE reference = $1 AND status = 'pending'").run(orderId);
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Plisio callback error:', err.message);
    res.status(200).json({ status: 'ok' });
  }
});

// ====================================================================
// ====== NUMBERS ======
// ====================================================================

app.get('/api/numbers/:email', async function(req, res) {
  var rows = await db.prepare('SELECT * FROM numbers WHERE email = $1 ORDER BY created_at DESC').all(req.params.email);
  res.json(rows);
});

app.post('/api/numbers/request', async function(req, res) {
  var email = req.body.email;
  var serviceName = req.body.serviceName;
  var serviceId = req.body.serviceId;
  var countryCode = req.body.countryCode;
  var cost = req.body.cost;

  var user = await db.prepare('SELECT balance FROM users WHERE email = $1').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.balance < cost) return res.status(400).json({ error: 'Insufficient balance' });

  var useRealProvider = process.env.SMS_API_KEY && process.env.SMS_API_KEY !== 'YOUR_API_KEY_HERE';
  var realPhone = null;
  var providerRequestId = null;

  if (useRealProvider) {
    try {
      var provider = require('./sms-provider');
      var serviceCode = provider.getServiceCode(serviceName, serviceId);
      if (!serviceCode) return res.status(400).json({ error: 'This service is currently not supported by our provider.' });

      var countryCodeForProvider = provider.getCountryCode(countryCode);
      if (!countryCodeForProvider) return res.status(400).json({ error: 'This country is currently not supported by our provider.' });

      var result = await provider.getNumber(serviceCode, countryCodeForProvider);
      if (!result.success) return res.status(400).json({ error: result.error || 'No numbers available. Try a different country.' });
      realPhone = result.phone;
      providerRequestId = result.requestId;
    } catch (err) {
      console.error('SMS Provider Error:', err.message);
      return res.status(500).json({ error: 'Failed to get number from provider: ' + err.message });
    }
  } else {
    var country = countries.find(function(c) { return c.code === countryCode; });
    if (!country) return res.status(400).json({ error: 'Invalid country code' });
    realPhone = generatePhone(country.prefix);
  }

  await db.prepare('UPDATE users SET balance = balance - $1 WHERE email = $2').run(cost, email);

  var insertResult = await db.prepare(
    'INSERT INTO numbers (email, service_name, service_id, phone, status, time_left, total_time, cost, provider_request_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id'
  ).run(email, serviceName, serviceId, realPhone, 'waiting', 600, 600, cost, providerRequestId);
  var numberId = insertResult.rows[0].id;

  await db.prepare("INSERT INTO history (email, service_name, phone, code, status, cost) VALUES ($1, $2, $3, NULL, 'pending', $4)").run(email, serviceName, realPhone, cost);

  if (useRealProvider && providerRequestId) {
    startPolling(numberId, providerRequestId, serviceName);
  }

  res.json({ id: numberId, phone: realPhone, status: 'waiting', timeLeft: 600, totalTime: 600, cost: cost, balance: user.balance - cost });
});

function startPolling(numberId, providerRequestId, serviceName) {
  var provider = require('./sms-provider');
  var attempts = 0;
  console.log("[POLL] Starting for Number ID:", numberId, "Provider ID:", providerRequestId);

  var interval = setInterval(async function() {
    attempts++;
    try {
      var result = await provider.checkCode(providerRequestId);

      if (result.success && result.code) {
        clearInterval(interval);
        var smsText = 'Your ' + serviceName + ' verification code is ' + result.code + '. Do not share it with anyone.';
        await db.prepare('UPDATE numbers SET status = $1, code = $2, sms_text = $3 WHERE id = $4').run('received', result.code, smsText, numberId);
        await db.prepare("INSERT INTO history (email, service_name, phone, code, status, cost) SELECT email, service_name, phone, $1, $2, cost FROM numbers WHERE id = $3").run(result.code, 'success', numberId);
        provider.complete(providerRequestId).catch(function() {});
      }
      if (result.success === false && result.waiting === false) {
        clearInterval(interval);
      }
    } catch (err) {
      console.error('[POLL ERROR]', numberId + ':', err.message);
    }
    if (attempts >= 120) {
      clearInterval(interval);
    }
  }, 5000);
}

app.delete('/api/numbers/:id', async function(req, res) {
  var num = await db.prepare('SELECT * FROM numbers WHERE id = $1').get(req.params.id);
  if (!num) return res.status(404).json({ error: 'Number not found' });
  if (num.status !== 'waiting') return res.status(400).json({ error: 'Can only cancel waiting numbers' });

  if (num.provider_request_id) {
    try { var provider = require('./sms-provider'); await provider.cancel(num.provider_request_id); } catch (err) { console.error('Cancel error:', err.message); }
  }

  await db.prepare('UPDATE users SET balance = balance + $1 WHERE email = $2').run(num.cost, num.email);
  await db.prepare('DELETE FROM numbers WHERE id = $1').run(req.params.id);

  var user = await db.prepare('SELECT balance FROM users WHERE email = $1').get(num.email);
  res.json({ message: 'Cancelled and refunded', balance: user.balance });
});

app.post('/api/numbers/:id/expire', async function(req, res) {
  var num = await db.prepare('SELECT * FROM numbers WHERE id = $1').get(req.params.id);
  if (!num) return res.status(404).json({ error: 'Number not found' });

  await db.prepare('UPDATE users SET balance = balance + $1 WHERE email = $2').run(num.cost, num.email);
  await db.prepare("UPDATE numbers SET status = 'expired', time_left = 0 WHERE id = $1").run(req.params.id);
  await db.prepare("INSERT INTO history (email, service_name, phone, code, status, cost) VALUES ($1, $2, $3, NULL, 'failed', $4)").run(num.email, num.service_name, num.phone, num.cost);

  var user = await db.prepare('SELECT balance FROM users WHERE email = $1').get(num.email);
  res.json({ balance: user.balance });
});

app.post('/api/numbers/:id/receive', async function(req, res) {
  var code = req.body.code;
  var smsText = req.body.smsText;
  var num = await db.prepare("SELECT * FROM numbers WHERE id = $1 AND status = 'waiting'").get(req.params.id);
  if (!num) return res.status(404).json({ error: 'Number not found or not waiting' });

  await db.prepare('UPDATE numbers SET status = $1, code = $2, sms_text = $3 WHERE id = $4').run('received', code, smsText, req.params.id);
  await db.prepare("INSERT INTO history (email, service_name, phone, code, status, cost) VALUES ($1, $2, $3, $4, 'success', $5)").run(num.email, num.service_name, num.phone, code, num.cost);

  res.json({ message: 'Code received', code: code });
});

// ====================================================================
// ====== NUMBERS SAVE (for SMS-Bus proxy purchases) ======
// ====================================================================

app.post('/api/numbers/save', async function(req, res) {
  try {
    var email = req.body.email;
    var activationId = req.body.activationId;
    var phone = req.body.phone;
    var serviceName = req.body.serviceName;
    var serviceId = req.body.serviceId;
    var serviceIcon = req.body.serviceIcon || null;
    var countryCode = req.body.countryCode || null;
    var countryFlag = req.body.countryFlag || null;
    var countryName = req.body.countryName || null;
    var cost = req.body.cost;
    var status = req.body.status || 'waiting';
    var createdAt = req.body.createdAt;
    var totalTime = req.body.totalTime || 300;

    if (!email || !activationId || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    var user = await db.prepare('SELECT balance FROM users WHERE email = $1').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.balance < cost) return res.status(400).json({ error: 'Insufficient balance' });

        // Deduct balance
    await db.prepare('UPDATE users SET balance = balance - $1 WHERE email = $2').run(cost, email);

    // Try full insert, fall back to basic if columns missing
    try {
      await db.prepare(
        'INSERT INTO numbers (email, provider_request_id, phone, service_name, service_id, service_icon, country_code, country_flag, country_name, cost, status, created_at, total_time, time_left, code, sms_text) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NULL, NULL)'
      ).run(email, activationId, phone, serviceName, serviceId, serviceIcon || null, countryCode || null, countryFlag || null, countryName || null, cost, status, createdAt, totalTime, totalTime);
    } catch (colErr) {
      console.log('[DB] Using basic insert:', colErr.message);
      await db.prepare(
        'INSERT INTO numbers (email, provider_request_id, phone, service_name, service_id, cost, status, created_at, total_time, time_left) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)'
      ).run(email, activationId, phone, serviceName, serviceId, cost, status, createdAt, totalTime, totalTime);
    }

    // Add to history
    await db.prepare(
      "INSERT INTO history (email, service_name, phone, code, status, cost) VALUES ($1, $2, $3, NULL, 'pending', $4)"
    ).run(email, serviceName, phone, cost);

    var updatedUser = await db.prepare('SELECT balance FROM users WHERE email = $1').get(email);
    res.json({ success: true, balance: parseFloat(updatedUser.balance) });

  } catch (err) {
    console.error('Save number error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/numbers/:id/code', async function(req, res) {
  try {
    var code = req.body.code;
    var smsText = req.body.smsText;
    var num = await db.prepare('SELECT * FROM numbers WHERE provider_request_id = $1').get(req.params.id);
    
    if (!num) {
      // Try by regular id
      num = await db.prepare('SELECT * FROM numbers WHERE id = $1').get(req.params.id);
    }
    
    if (!num) return res.status(404).json({ error: 'Number not found' });

    await db.prepare('UPDATE numbers SET status = $1, code = $2, sms_text = $3 WHERE id = $4').run('received', code, smsText, num.id);
    await db.prepare("INSERT INTO history (email, service_name, phone, code, status, cost) VALUES ($1, $2, $3, $4, 'success', $5)").run(num.email, num.service_name, num.phone, code, num.cost);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== HISTORY ======
// ====================================================================

app.get('/api/history/:email', async function(req, res) {
  var rows = await db.prepare('SELECT * FROM history WHERE email = $1 ORDER BY created_at DESC').all(req.params.email);
  res.json(rows);
});

app.post('/api/simulate/:id', async function(req, res) {
  var num = await db.prepare("SELECT * FROM numbers WHERE id = $1 AND status = 'waiting'").get(req.params.id);
  if (!num) return res.json({ message: 'No waiting number found' });

  var code = String(Math.floor(100000 + Math.random() * 900000));
  var smsText = 'Your ' + num.service_name + ' verification code is ' + code + '. Do not share it with anyone.';

  await db.prepare('UPDATE numbers SET status = $1, code = $2, sms_text = $3 WHERE id = $4').run('received', code, smsText, num.id);
  await db.prepare("INSERT INTO history (email, service_name, phone, code, status, cost) VALUES ($1, $2, $3, $4, 'success', $5)").run(num.email, num.service_name, num.phone, code, num.cost);

  res.json({ message: 'Simulated SMS received', code: code, phone: num.phone, service: num.service_name });
});

// ====================================================================
// ====== DEPOSITS HISTORY ======
// ====================================================================

app.get('/api/deposits/:email', async function(req, res) {
  var rows = await db.prepare('SELECT * FROM deposits WHERE email = $1 ORDER BY created_at DESC').all(req.params.email);
  res.json(rows);
});

// ====================================================================
// ====== DEPOSIT STATUS CHECK (frontend polling) ======
// ====================================================================

app.get('/api/deposit/status/:reference', async function(req, res) {
  try {
    var deposit = await db.prepare('SELECT * FROM deposits WHERE reference = $1').get(req.params.reference);
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    res.json({
      status: deposit.status,
      amount: parseFloat(deposit.amount),
      method: deposit.method
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== REFERRAL SYSTEM ======
// ====================================================================

app.get('/api/referral/code/:email', async function(req, res) {
  var user = await db.prepare('SELECT referral_code FROM users WHERE email = $1').get(req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  var code = user.referral_code;
  if (!code) {
    code = 'REF-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    await db.prepare('UPDATE users SET referral_code = $1 WHERE email = $2').run(code, req.params.email);
  }

  var frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.json({ code: code, link: frontendUrl + '/?ref=' + code });
});

app.post('/api/referral/track', async function(req, res) {
  var referrerEmail = req.body.referrerEmail;
  var referredEmail = req.body.referredEmail;
  if (!referrerEmail || !referredEmail) return res.status(400).json({ error: 'Missing data' });
  if (referrerEmail === referredEmail) return res.status(400).json({ error: 'Cannot refer yourself' });

  var existingRef = await db.prepare('SELECT referred_by FROM users WHERE email = $1').get(referredEmail);
  if (existingRef && existingRef.referred_by) {
    return res.json({ message: 'Already tracked' });
  }

  await db.prepare('UPDATE users SET referred_by = $1 WHERE email = $2').run(referrerEmail, referredEmail);
  res.json({ success: true });
});

app.get('/api/referral/stats/:email', async function(req, res) {
  var email = req.params.email;

  var countResult = await db.prepare('SELECT COUNT(*) as total FROM users WHERE referred_by = $1').get(email);
  var totalReferrals = countResult ? countResult.total : 0;

  var historyResult = await db.prepare(
    "SELECT COALESCE(SUM(cost), 0) as total_spent FROM history WHERE email IN (SELECT email FROM users WHERE referred_by = $1) AND status = 'success'"
  ).get(email);
  var totalEarnings = historyResult ? (historyResult.total_spent * 0.05) : 0;

  var referredUsers = await db.prepare('SELECT email, created_at FROM users WHERE referred_by = $1 ORDER BY created_at DESC').all(email);

  res.json({
    totalReferrals: totalReferrals,
    totalEarnings: totalEarnings.toFixed(2),
    list: referredUsers
  });
});

// ====================================================================
// ====== WITHDRAWAL REQUEST ======
// ====================================================================

app.post('/api/withdraw', async function(req, res) {
  try {
    var email = req.body.email;
    var method = req.body.method;
    var address = req.body.address;
    var amount = parseFloat(req.body.amount);

    if (!email || !method || !address || !amount) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (amount < 1) {
      return res.status(400).json({ error: 'Minimum withdrawal is $1.00' });
    }

    // Calculate available commissions
    var historyResult = await db.prepare(
      "SELECT COALESCE(SUM(cost), 0) as total_spent FROM history WHERE email IN (SELECT email FROM users WHERE referred_by = $1) AND status = 'success'"
    ).get(email);
    var totalCommissions = historyResult ? (parseFloat(historyResult.total_spent) * 0.10) : 0;

    // Subtract already-withdrawn amounts
    var withdrawnResult = await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE email = $1 AND status != 'rejected'").get(email);
    var alreadyWithdrawn = withdrawnResult ? parseFloat(withdrawnResult.total) : 0;
    var available = totalCommissions - alreadyWithdrawn;

    if (amount > available) {
      return res.status(400).json({ error: 'Insufficient commission balance. Available: $' + available.toFixed(2) });
    }

    await db.prepare("INSERT INTO withdrawals (email, method, address, amount, status) VALUES ($1, $2, $3, $4, 'pending')").run(email, method, address, amount);

    res.json({ success: true, message: 'Withdrawal request submitted' });
  } catch (err) {
    console.error('Withdrawal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN AUTH ======
// ====================================================================

var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SonVerify2025';
console.log('Admin password is set.');

app.post('/api/admin/login', function(req, res) {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid admin password' });
  }
});

function requireAdmin(req, res, next) {
  var token = req.headers['authorization'];
  if (!token || token !== 'Bearer admin-' + ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ====================================================================
// ====== ADMIN: DASHBOARD STATS ======
// ====================================================================

app.get('/api/admin/stats', requireAdmin, async function(req, res) {
  try {
    var userCount = await db.prepare('SELECT COUNT(*) as total FROM users').get();
    var balanceResult = await db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM users').get();
    var activeNumbers = await db.prepare("SELECT COUNT(*) as total FROM numbers WHERE status IN ('waiting', 'received')").get();
    var todayDeposits = await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'completed' AND created_at >= CURRENT_DATE").get();
    var totalDeposits = await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM deposits WHERE status = 'completed'").get();
    var pendingWithdrawals = await db.prepare("SELECT COUNT(*) as total FROM withdrawals WHERE status = 'pending'").get();
    var totalCommissions = await db.prepare("SELECT COALESCE(SUM(cost), 0) as total FROM history WHERE status = 'success' AND email IN (SELECT email FROM users WHERE referred_by IS NOT NULL)").get();
    var referralCount = await db.prepare("SELECT COUNT(*) as total FROM users WHERE referred_by IS NOT NULL").get();

    res.json({
      totalUsers: parseInt(userCount.total),
      totalBalance: parseFloat(balanceResult.total),
      activeNumbers: parseInt(activeNumbers.total),
      todayDeposits: parseFloat(todayDeposits.total),
      totalDeposits: parseFloat(totalDeposits.total),
      pendingWithdrawals: parseInt(pendingWithdrawals.total),
      totalCommissions: parseFloat(totalCommissions.total) * 0.10,
      totalReferrals: parseInt(referralCount.total)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN: ALL USERS (FIXED) ======
// ====================================================================

app.get('/api/admin/users', requireAdmin, async function(req, res) {
  try {
    var search = req.query.search || '';
    var page = parseInt(req.query.page) || 1;
    var limit = 20;
    var offset = (page - 1) * limit;

    var whereClause = '';
    var params = [];

    if (search) {
      whereClause = "WHERE email ILIKE $1 OR referral_code ILIKE $1";
      params = ['%' + search + '%'];
    }

    var countQuery = 'SELECT COUNT(*) as total FROM users ' + whereClause;
    var countResult = await db.prepare(countQuery).get.apply(db, params);
    
    var dataQuery = 'SELECT email, balance, referral_code, referred_by, created_at FROM users ' + whereClause + ' ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;
    var users = await db.prepare(dataQuery).all.apply(db, params);

    var enriched = [];
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      var purchaseResult = await db.prepare("SELECT COALESCE(SUM(cost), 0) as total FROM history WHERE email = $1 AND status = 'success'").get(u.email);
      var refCountResult = await db.prepare('SELECT COUNT(*) as total FROM users WHERE referred_by = $1').get(u.email);
      enriched.push({
        email: u.email,
        balance: parseFloat(u.balance),
        referral_code: u.referral_code,
        referred_by: u.referred_by,
        created_at: u.created_at,
        total_spent: parseFloat(purchaseResult.total),
        referral_count: parseInt(refCountResult.total)
      });
    }

    res.json({
      users: enriched,
      total: parseInt(countResult.total),
      pages: Math.ceil(parseInt(countResult.total) / limit)
    });
  } catch (err) {
    console.error('Admin users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN: SINGLE USER DETAIL ======
// ====================================================================

app.get('/api/admin/user/:email', requireAdmin, async function(req, res) {
  try {
    var email = req.params.email;
    var user = await db.prepare('SELECT email, balance, referral_code, referred_by, created_at FROM users WHERE email = $1').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    var numbers = await db.prepare('SELECT * FROM numbers WHERE email = $1 ORDER BY created_at DESC LIMIT 50').all(email);
    var history = await db.prepare('SELECT * FROM history WHERE email = $1 ORDER BY created_at DESC LIMIT 50').all(email);
    var deposits = await db.prepare('SELECT * FROM deposits WHERE email = $1 ORDER BY created_at DESC').all(email);
    var withdrawals = await db.prepare('SELECT * FROM withdrawals WHERE email = $1 ORDER BY created_at DESC').all(email);
    var referredUsers = await db.prepare('SELECT email, created_at FROM users WHERE referred_by = $1 ORDER BY created_at DESC').all(email);

    res.json({
      user: user,
      numbers: numbers,
      history: history,
      deposits: deposits,
      withdrawals: withdrawals,
      referred_users: referredUsers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN: ADJUST USER BALANCE ======
// ====================================================================

app.post('/api/admin/user/:email/balance', requireAdmin, async function(req, res) {
  try {
    var email = req.params.email;
    var amount = parseFloat(req.body.amount);

    if (isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });

    var user = await db.prepare('SELECT balance FROM users WHERE email = $1').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.prepare('UPDATE users SET balance = balance + $1 WHERE email = $2').run(amount, email);

    var newBalance = await db.prepare('SELECT balance FROM users WHERE email = $1').get(email);
    res.json({ success: true, newBalance: parseFloat(newBalance.balance), adjustment: amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN: ALL WITHDRAWALS (FIXED) ======
// ====================================================================

app.get('/api/admin/withdrawals', requireAdmin, async function(req, res) {
  try {
    var status = req.query.status || '';
    var page = parseInt(req.query.page) || 1;
    var limit = 20;
    var offset = (page - 1) * limit;

    var whereClause = '';
    var params = [];

    if (status) {
      whereClause = "WHERE w.status = $1";
      params = [status];
    }

    var countQuery = 'SELECT COUNT(*) as total FROM withdrawals w ' + whereClause;
    var countResult = await db.prepare(countQuery).get.apply(db, params);

    var dataQuery = 'SELECT w.*, u.balance as user_balance FROM withdrawals w LEFT JOIN users u ON w.email = u.email ' + whereClause + ' ORDER BY w.created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;
    var rows = await db.prepare(dataQuery).all.apply(db, params);

    res.json({
      withdrawals: rows,
      total: parseInt(countResult.total),
      pages: Math.ceil(parseInt(countResult.total) / limit)
    });
  } catch (err) {
    console.error('Admin withdrawals error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN: APPROVE / REJECT WITHDRAWAL ======
// ====================================================================

app.post('/api/admin/withdrawal/:id', requireAdmin, async function(req, res) {
  try {
    var id = req.params.id;
    var action = req.body.action;

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    var wd = await db.prepare('SELECT * FROM withdrawals WHERE id = $1').get(id);
    if (!wd) return res.status(404).json({ error: 'Withdrawal not found' });
    if (wd.status !== 'pending') return res.status(400).json({ error: 'Already processed' });

    var newStatus = action === 'approve' ? 'completed' : 'rejected';
    await db.prepare('UPDATE withdrawals SET status = $1 WHERE id = $2').run(newStatus, id);

    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN: ALL DEPOSITS (FIXED) ======
// ====================================================================

app.get('/api/admin/deposits', requireAdmin, async function(req, res) {
  try {
    var status = req.query.status || '';
    var page = parseInt(req.query.page) || 1;
    var limit = 20;
    var offset = (page - 1) * limit;

    var whereClause = '';
    var params = [];

    if (status) {
      whereClause = "WHERE status = $1";
      params = [status];
    }

    var countQuery = 'SELECT COUNT(*) as total FROM deposits ' + whereClause;
    var countResult = await db.prepare(countQuery).get.apply(db, params);

    var dataQuery = 'SELECT * FROM deposits ' + whereClause + ' ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;
    var rows = await db.prepare(dataQuery).all.apply(db, params);

    res.json({
      deposits: rows,
      total: parseInt(countResult.total),
      pages: Math.ceil(parseInt(countResult.total) / limit)
    });
  } catch (err) {
    console.error('Admin deposits error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN: ALL NUMBERS (FIXED) ======
// ====================================================================

app.get('/api/admin/numbers', requireAdmin, async function(req, res) {
  try {
    var status = req.query.status || '';
    var page = parseInt(req.query.page) || 1;
    var limit = 20;
    var offset = (page - 1) * limit;

    var whereClause = '';
    var params = [];

    if (status) {
      whereClause = "WHERE status = $1";
      params = [status];
    }

    var countQuery = 'SELECT COUNT(*) as total FROM numbers ' + whereClause;
    var countResult = await db.prepare(countQuery).get.apply(db, params);

    var dataQuery = 'SELECT * FROM numbers ' + whereClause + ' ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;
    var rows = await db.prepare(dataQuery).all.apply(db, params);

    res.json({
      numbers: rows,
      total: parseInt(countResult.total),
      pages: Math.ceil(parseInt(countResult.total) / limit)
    });
  } catch (err) {
    console.error('Admin numbers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== ADMIN: DELETE USER ======
// ====================================================================

app.delete('/api/admin/user/:email', requireAdmin, async function(req, res) {
  try {
    var email = req.params.email;
    await db.prepare('DELETE FROM history WHERE email = $1').run(email);
    await db.prepare('DELETE FROM numbers WHERE email = $1').run(email);
    await db.prepare('DELETE FROM deposits WHERE email = $1').run(email);
    await db.prepare('DELETE FROM withdrawals WHERE email = $1').run(email);
    await db.prepare('DELETE FROM users WHERE email = $1').run(email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== PRICES BY COUNTRY ======
// ====================================================================

app.get('/api/prices/:countryCode', async function(req, res) {
  try {
    var countryCode = req.params.countryCode;
    var country = countries.find(function(c) { return c.code === countryCode; });
    var baseMultiplier = country ? (country.basePrice / 0.50) : 1;

    var prices = {};
    if (typeof services !== 'undefined') {
      services.forEach(function(s) {
        prices[s.id] = parseFloat((s.price * baseMultiplier).toFixed(2));
      });
    }
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== TEST ROUTE ======
// ====================================================================

app.get('/api/test', function(req, res) {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ====================================================================
// ====== ADMIN: ALL REFERRALS (FIXED) ======
// ====================================================================

app.get('/api/admin/referrals', requireAdmin, async function(req, res) {
  try {
    // Get ALL users who have referred someone
    var referrers = await db.prepare(
      "SELECT u.email, u.referral_code, COUNT(r.email) as referral_count " +
      "FROM users u " +
      "JOIN users r ON r.referred_by = u.email " +
      "GROUP BY u.email, u.referral_code " +
      "ORDER BY referral_count DESC"
    ).all();

    var enriched = [];
    for (var i = 0; i < referrers.length; i++) {
      var refEmail = referrers[i].email;
      
      // Calculate total spent by ALL users this person referred
      var spentResult = await db.prepare(
        "SELECT COALESCE(SUM(cost), 0) as total_spent " +
        "FROM history " +
        "WHERE email IN (SELECT email FROM users WHERE referred_by = $1) " +
        "AND status = 'success'"
      ).get(refEmail);
      
      var totalSpentByReferrals = spentResult ? parseFloat(spentResult.total_spent) : 0;
      var commissionEarned = totalSpentByReferrals * 0.10;
      
      // Get list of referred users
      var referredList = await db.prepare(
        "SELECT email, created_at FROM users WHERE referred_by = $1 ORDER BY created_at DESC"
      ).all(refEmail);
      
      enriched.push({
        email: refEmail,
        referral_code: referrers[i].referral_code,
        referral_count: parseInt(referrers[i].referral_count),
        total_spent_by_referrals: totalSpentByReferrals,
        commission_earned: commissionEarned,
        referred_users: referredList
      });
    }

    res.json({
      referrers: enriched,
      total: enriched.length
    });
  } catch (err) {
    console.error('Admin referrals error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== SMS-BUS PROXY ROUTES (SELF-CONTAINED) ======
// ====================================================================

const SMS_BUS_TOKEN = process.env.SMS_API_KEY || 'd4a7951968ed4e59a647a0ac1d1af637';
var _SMS_TOKEN = SMS_BUS_TOKEN;

// GET /api/v2/prices?country_id=25
// ====================================================================
// ====== SMS-BUS PROXY ROUTES ======
// ====================================================================

app.get('/api/v2/prices', async function(req, res) {
  try {
    var country_id = req.query.country_id;
    var url = 'https://sms-bus.com/api/control/list/prices?token=' + _SMS_TOKEN + '&country_id=' + country_id;
    var response = await fetch(url);
    var text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v2/buy', async function(req, res) {
  try {
    var country_id = req.query.country_id;
    var project_id = req.query.project_id;
    var email = req.query.email;
    var url = 'https://sms-bus.com/api/control/get/number?token=' + _SMS_TOKEN + '&country_id=' + country_id + '&project_id=' + project_id;
    if (email) url += '&email=' + encodeURIComponent(email);
    console.log('[BUY] URL:', url);
    var response = await fetch(url);
    var text = await response.text();
    console.log('[BUY] Response:', text.substring(0, 500));
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (err) {
    console.error('[BUY] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v2/status', async function(req, res) {
  try {
    var request_id = req.query.request_id;
    var url = 'https://sms-bus.com/api/control/get/sms?token=' + _SMS_TOKEN + '&request_id=' + request_id;
    var response = await fetch(url);
    var text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v2/cancel', async function(req, res) {
  try {
    var request_id = req.query.request_id;
    var url = 'https://sms-bus.com/api/control/cancel?token=' + _SMS_TOKEN + '&request_id=' + request_id;
    var response = await fetch(url);
    var text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v2/services', async function(req, res) {
  try {
    var url = 'https://sms-bus.com/api/control/list/projects?token=' + _SMS_TOKEN;
    var response = await fetch(url);
    var text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST fallbacks
app.post('/api/v2/buy', async function(req, res) {
  var params = new URLSearchParams(req.body);
  res.redirect(307, '/api/v2/buy?' + params.toString());
});
app.post('/api/v2/status', async function(req, res) {
  var params = new URLSearchParams(req.body);
  res.redirect(307, '/api/v2/status?' + params.toString());
});
app.post('/api/v2/cancel', async function(req, res) {
  var params = new URLSearchParams(req.body);
  res.redirect(307, '/api/v2/cancel?' + params.toString());
});

// GET /api/v2/services
app.get('/api/v2/services', async function(req, res) {
  try {
    var url = 'https://sms-bus.com/api/control/list/projects?token=' + SMS_BUS_TOKEN;
    
    var response = await fetch(url);
    var text = await response.text();
    
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE the simple /api/v2/rent/areas, /api/v2/rent/get, etc. routes that follow
// Keep ONLY the ones with findWorkingRentUrl() logic
/// ====================================================================
// ====== SMS-BUS RENTAL PROXY ROUTES (WITH DEBUG) ======
// ====================================================================

// Try BOTH possible URLs - we'll see which one works
const SMS_BUS_URLS = [
  'https://api.sms-bus.com',
  'https://sms-bus.com'
];

// Cache which URL works
let SMS_BUS_RENTAL_BASE = null;

async function findWorkingRentUrl() {
  if (SMS_BUS_RENTAL_BASE) return SMS_BUS_RENTAL_BASE;
  
  for (var i = 0; i < SMS_BUS_URLS.length; i++) {
    try {
      var url = SMS_BUS_URLS[i] + '/v1/rent/list/area?token=' + SMS_BUS_TOKEN;
      console.log('[RENT DEBUG] Trying:', url);
      var response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      var data = await response.json();
      console.log('[RENT DEBUG] Response from ' + SMS_BUS_URLS[i] + ':', JSON.stringify(data).substring(0, 300));
      
      if (data.code === 200 && data.data) {
        SMS_BUS_RENTAL_BASE = SMS_BUS_URLS[i];
        console.log('[RENT DEBUG] ✓ Working URL found:', SMS_BUS_RENTAL_BASE);
        return SMS_BUS_RENTAL_BASE;
      }
    } catch (err) {
      console.log('[RENT DEBUG] ✗ Failed with ' + SMS_BUS_URLS[i] + ':', err.message);
    }
  }
  
  console.log('[RENT DEBUG] ✗ No working URL found');
  return null;
}


// POST /api/v2/rent/get
app.post('/api/v2/rent/get', async function(req, res) {
  try {
    var area_code = req.body.area_code;
    var time = req.body.time;
    var email = req.body.email;
    
    var baseUrl = await findWorkingRentUrl();
    if (!baseUrl) {
      return res.status(502).json({ error: 'SMS-Bus rental API unreachable' });
    }
    
    var url = baseUrl + '/v1/rent/get/number' +
      '?token=' + SMS_BUS_TOKEN +
      '&area_code=' + area_code +
      '&time=' + time;
    
    console.log('[RENT] Renting from:', url);
    
    var response = await fetch(url);
    var data = await response.json();
    
    console.log('[RENT] Rent response:', JSON.stringify(data).substring(0, 500));
    
        if (data.code !== 200) {
      var msg = (data.message || data.msg || '').toLowerCase();
      if (msg.includes('balance') || msg.includes('not enough') || msg.includes('insufficient')) {
        return res.status(502).json({ error: 'Try again or Try a different country.' });
      }
      return res.status(502).json({ error: 'No numbers available right now. Try again later.' });
    }
    
    res.json({ code: 200, data: data.data });
  } catch (err) {
    console.error('Rent get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v2/rent/sms
app.post('/api/v2/rent/sms', async function(req, res) {
  try {
    var rentalId = req.body.rentalId;
    
    var baseUrl = await findWorkingRentUrl();
    if (!baseUrl) {
      return res.status(502).json({ error: 'SMS-Bus rental API unreachable' });
    }
    
    // Parse rentalId format "CA:+3434700105"
    var parts = rentalId.split(':');
    var area_code = parts[0];
    var mobile_number = parts[1] || '';
    
    // FIX: Remove + from mobile_number!
    if (mobile_number.charAt(0) === '+') {
      mobile_number = mobile_number.substring(1);
    }
    
    if (!area_code || !mobile_number) {
      return res.status(400).json({ error: 'Invalid rental ID format' });
    }
    
    // Fetch both latest and list
    var [latestRes, listRes] = await Promise.all([
      fetch(baseUrl + '/v1/rent/get/sms?token=' + SMS_BUS_TOKEN + '&area_code=' + area_code + '&mobile_number=' + mobile_number),
      fetch(baseUrl + '/v1/rent/list/sms?token=' + SMS_BUS_TOKEN + '&area_code=' + area_code + '&mobile_number=' + mobile_number + '&page_size=50')
    ]);
    
    var latestData = await latestRes.json();
    var listData = await listRes.json();
    
    var result;
    
    // Prefer list if it has SMS
    if (listData.code === 200 && listData.data && listData.data.list && listData.data.list.length > 0) {
      result = { list: listData.data.list };
    } else if (latestData.code === 200 && latestData.data && latestData.data.content) {
      result = latestData.data;
    } else {
      result = { content: null };
    }
    
    res.json({ code: 200, data: result });
  } catch (err) {
    console.error('Rent SMS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
  
// ====================================================================
// ====== RENTALS DATABASE (PostgreSQL syntax) ======
// ====================================================================

// POST /api/rentals/save
app.post('/api/rentals/save', async function(req, res) {
  try {
    var email = req.body.email;
    var rentId = req.body.rentId;
    var smsFetchId = req.body.smsFetchId;
    var phone = req.body.phone;
    var dialingCode = req.body.dialingCode;
    var planId = req.body.planId;
    var planName = req.body.planName;
    var durationMonths = req.body.durationMonths;
    var providerCost = req.body.providerCost;
    var cost = req.body.cost;
    var countryCode = req.body.countryCode;
    var countryFlag = req.body.countryFlag;
    var countryName = req.body.countryName;
    var expiresAt = req.body.expiresAt;
    var status = req.body.status || 'active';

    if (!email || !rentId || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    var user = await db.prepare('SELECT balance FROM users WHERE email = $1').get(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.balance < cost) return res.status(400).json({ error: 'Insufficient balance' });

    // Deduct balance
    await db.prepare('UPDATE users SET balance = balance - $1 WHERE email = $2').run(cost, email);

    // Insert rental (using JSON for sms array)
    await db.prepare(
      'INSERT INTO rentals (email, rent_id, sms_fetch_id, phone, dialing_code, plan_id, plan_name, duration_months, provider_cost, cost, country_code, country_flag, country_name, status, expires_at, created_at, sms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)'
    ).run(email, rentId, smsFetchId, phone, dialingCode, planId, planName, durationMonths, providerCost, cost, countryCode, countryFlag, countryName, status, expiresAt, new Date().toISOString(), '[]');

    var updatedUser = await db.prepare('SELECT balance FROM users WHERE email = $1').get(email);
    
    var rental = {
      id: rentId,
      smsFetchId: smsFetchId,
      phone: phone,
      dialingCode: dialingCode,
      planName: planName,
      durationMonths: durationMonths,
      cost: cost,
      countryCode: countryCode,
      countryFlag: countryFlag,
      status: status,
      expiresAt: expiresAt,
      sms: []
    };
    
    res.json({ success: true, balance: parseFloat(updatedUser.balance), rental: rental });

  } catch (err) {
    console.error('Save rental error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rentals/:email
app.get('/api/rentals/:email', async function(req, res) {
  try {
    var rentals = await db.prepare(
      "SELECT * FROM rentals WHERE email = $1 AND status = 'active' ORDER BY created_at DESC"
    ).all(req.params.email);
    
    // Parse JSON sms field and format response
    var formatted = rentals.map(function(r) {
      var sms = [];
      if (r.sms) {
        try { sms = typeof r.sms === 'string' ? JSON.parse(r.sms) : r.sms; } catch(e) { sms = []; }
      }
      return {
        id: r.rent_id,
        smsFetchId: r.sms_fetch_id,
        phone: r.phone,
        dialingCode: r.dialing_code,
        planName: r.plan_name,
        durationMonths: r.duration_months,
        cost: parseFloat(r.cost),
        countryCode: r.country_code,
        countryFlag: r.country_flag,
        status: r.status,
        expiresAt: r.expires_at,
        sms: sms
      };
    });
    
    res.json(formatted);
  } catch (err) {
    console.error('Get rentals error:', err.message);
    res.json([]);
  }
});

// DELETE /api/rental/:id
app.delete('/api/rental/:id', async function(req, res) {
  try {
    var rentId = req.params.id;
    
    var rental = await db.prepare("SELECT * FROM rentals WHERE rent_id = $1 AND status = 'active'").get(rentId);
    if (!rental) return res.status(404).json({ error: 'Rental not found' });

    // Refund user
    await db.prepare('UPDATE users SET balance = balance + $1 WHERE email = $2').run(rental.cost, rental.email);
    
    // Mark as cancelled
    await db.prepare("UPDATE rentals SET status = 'cancelled' WHERE rent_id = $1").run(rentId);
    
    var user = await db.prepare('SELECT balance FROM users WHERE email = $1').get(rental.email);
    res.json({ success: true, balance: parseFloat(user.balance) });
    
  } catch (err) {
    console.error('Cancel rental error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rental/:id/sms (update SMS for a rental)
app.post('/api/rental/:id/sms', async function(req, res) {
  try {
    var rentId = req.params.id;
    var sms = req.body.sms; // Array of SMS objects
    
    var rental = await db.prepare('SELECT * FROM rentals WHERE rent_id = $1').get(rentId);
    if (!rental) return res.status(404).json({ error: 'Rental not found' });
    
    await db.prepare('UPDATE rentals SET sms = $1::jsonb WHERE rent_id = $2').run(JSON.stringify(sms), rentId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update rental SMS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// ====== /api/deposit/kora ======
// ====================================================================
// ADD THIS RIGHT BEFORE THE /api/deposit/kora:
app.get('/api/v2/rent/test', function(req, res) {
  res.json({ ok: true, msg: 'Route works!' });
});


app.use(function(req, res, next) {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  if (req.path.includes('.')) return res.status(404).send('File not found');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ====================================================================
// ====== AUTO-LOAD SMS PROVIDER MAPS ON STARTUP ======
// ====================================================================

async function loadProviderMaps() {
  try {
    var provider = require('./sms-provider');

    var cRes = await fetch('https://sms-bus.com/api/control/list/countries?token=' + process.env.SMS_API_KEY);
    var cData = await cRes.json();
    var countryMap = {};
    if (cData.code === 200 && cData.data) {
      Object.values(cData.data).forEach(function(c) { countryMap[c.code.toLowerCase()] = String(c.id); });
    }

    var pRes = await fetch('https://sms-bus.com/api/control/list/projects?token=' + process.env.SMS_API_KEY);
    var pData = await pRes.json();
    var serviceMap = {};
    if (pData.code === 200 && pData.data) {
      Object.values(pData.data).forEach(function(p) { serviceMap[p.code.toLowerCase()] = String(p.id); });
    }

    provider.setMaps(serviceMap, countryMap);
    console.log('Provider maps loaded. Services:', Object.keys(serviceMap).length, 'Countries:', Object.keys(countryMap).length);
  } catch (err) {
    console.error('Failed to auto-load provider maps:', err.message);
  }
}

loadProviderMaps();

// ====================================================================
// ====== TABLE SETUP ======
// ====================================================================

async function ensureRentalsTable() {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS rentals (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        rent_id VARCHAR(255) NOT NULL UNIQUE,
        sms_fetch_id VARCHAR(255),
        phone VARCHAR(50) NOT NULL,
        dialing_code VARCHAR(10),
        plan_id VARCHAR(50),
        plan_name VARCHAR(100),
        duration_months INTEGER DEFAULT 1,
        provider_cost DECIMAL(10,2) DEFAULT 0,
        cost DECIMAL(10,2) NOT NULL,
        country_code VARCHAR(10),
        country_flag VARCHAR(10),
        country_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sms JSONB DEFAULT '[]'
      )
    `).run();
    console.log('✅ Rentals table ready');
  } catch (err) {
    console.error('Rentals table error:', err.message);
  }
}

async function ensureNumbersColumns() {
  var cols = [
    ['service_icon', 'VARCHAR(500)'],
    ['country_code', 'VARCHAR(10)'],
    ['country_flag', 'VARCHAR(10)'],
    ['country_name', 'VARCHAR(100)']
  ];
  for (var i = 0; i < cols.length; i++) {
    try {
      await db.prepare('ALTER TABLE numbers ADD COLUMN ' + cols[i][0] + ' ' + cols[i][1]).run();
      console.log('✅ Added numbers.' + cols[i][0]);
    } catch (e) {}
  }
}

ensureRentalsTable();
ensureNumbersColumns();

// ====================================================================
// ====== START SERVER ======
// ====================================================================

var PORT = process.env.PORT || 3001;
  var server = app.listen(PORT, function() { 
});

loadProviderMaps();

// ====================================================================
// ====== TABLE SETUP ======
// ====================================================================

async function setupTables() {
  // Wait a moment for db to fully initialize
  await new Promise(function(resolve) { setTimeout(resolve, 500); });
  
  // Check if db is ready
  if (!db || !db.prepare) {
    console.error('WARNING: db not ready, skipping table setup');
    return;
  }
  
  // Create rentals table
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS rentals (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        rent_id VARCHAR(255) NOT NULL UNIQUE,
        sms_fetch_id VARCHAR(255),
        phone VARCHAR(50) NOT NULL,
        dialing_code VARCHAR(10),
        plan_id VARCHAR(50),
        plan_name VARCHAR(100),
        duration_months INTEGER DEFAULT 1,
        provider_cost DECIMAL(10,2) DEFAULT 0,
        cost DECIMAL(10,2) NOT NULL,
        country_code VARCHAR(10),
        country_flag VARCHAR(10),
        country_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sms JSONB DEFAULT '[]'
      )
    `).run();
    console.log('✅ Rentals table ready');
  } catch (err) {
    console.error('Rentals table error:', err.message);
  }

  // Add missing columns to numbers table
  var cols = [
    ['service_icon', 'VARCHAR(500)'],
    ['country_code', 'VARCHAR(10)'],
    ['country_flag', 'VARCHAR(10)'],
    ['country_name', 'VARCHAR(100)']
  ];
  for (var i = 0; i < cols.length; i++) {
    try {
      await db.prepare('ALTER TABLE numbers ADD COLUMN ' + cols[i][0] + ' ' + cols[i][1]).run();
      console.log('✅ Added numbers.' + cols[i][0]);
    } catch (e) {
      // Column already exists - silent
    }
  }
}

// Run table setup (don't await - run in background)
setupTables();

// ====================================================================
// ====== AUTO-LOAD SMS PROVIDER MAPS ======
// ====================================================================

async function loadProviderMaps() {
  await new Promise(function(resolve) { setTimeout(resolve, 1000); });
  
  if (!db || !db.prepare) return;
  
  try {
    var provider = require('./sms-provider');
    var token = process.env.SMS_API_KEY || 'd4a7951968ed4e59a647a0ac1d1af637';

    var cRes = await fetch('https://sms-bus.com/api/control/list/countries?token=' + token);
    var cData = await cRes.json();
    var countryMap = {};
    if (cData.code === 200 && cData.data) {
      Object.values(cData.data).forEach(function(c) { countryMap[c.code.toLowerCase()] = String(c.id); });
    }

    var pRes = await fetch('https://sms-bus.com/api/control/list/projects?token=' + token);
    var pData = await pRes.json();
    var serviceMap = {};
    if (pData.code === 200 && pData.data) {
      Object.values(pData.data).forEach(function(p) { serviceMap[p.code.toLowerCase()] = String(p.id); });
    }

    provider.setMaps(serviceMap, countryMap);
    console.log('✅ Provider maps loaded. Services:', Object.keys(serviceMap).length, 'Countries:', Object.keys(countryMap).length);
  } catch (err) {
    console.error('Provider maps error:', err.message);
  }
}

loadProviderMaps();

// ====================================================================
// ====== START SERVER ======
// ====================================================================

var PORT = process.env.PORT || 3001;
var server = app.listen(PORT, function() {
  console.log('✅ Server started on port ' + PORT);
});

server.on('clientError', function(err, socket) {
  if (err.code === 'HPE_INVALID_CONSTANT') return socket.destroy();
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

// Cancel number - set status to 'cancelled' and move to history
app.post('/api/numbers/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.body.email || req.query.email;
    
    // Find the number
    const number = await db.get('SELECT * FROM active_numbers WHERE id = ?', [id]);
    if (!number) {
      return res.status(404).json({ error: 'Number not found' });
    }
    
    // Calculate refund (full refund if still waiting, partial if received)
    let refundAmount = number.cost;
    if (number.status === 'received') {
      refundAmount = 0; // No refund if code already received
    } else if (number.status === 'expired') {
      refundAmount = number.cost; // Full refund on expiry
    }
    
    // Update status to cancelled
    await db.run('UPDATE active_numbers SET status = ? WHERE id = ?', ['cancelled', id]);
    
    // Move to history table (create if not exists)
    await db.run(`
      INSERT INTO number_history (id, email, phone, service_name, service_id, service_icon, 
        country_code, country_flag, country_name, code, sms_text, cost, status, created_at)
      SELECT id, email, phone, service_name, service_id, service_icon,
        country_code, country_flag, country_name, code, sms_text, cost, status, created_at
      FROM active_numbers WHERE id = ?
    `, [id]);
    
    // Delete from active numbers
    await db.run('DELETE FROM active_numbers WHERE id = ?', [id]);
    
    // Refund balance
    if (refundAmount > 0 && email) {
      await db.run('UPDATE users SET balance = balance + ? WHERE email = ?', [refundAmount, email]);
      
      // Get updated balance
      const user = await db.get('SELECT balance FROM users WHERE email = ?', [email]);
      return res.json({ 
        success: true, 
        balance: user ? user.balance : undefined,
        refunded: refundAmount 
      });
    }
    
    res.json({ success: true, refunded: 0 });
    
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel number' });
  }
});

// Unified history endpoint - returns ALL history types
app.get('/api/history/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Get SMS/activation history
    const smsHistory = await db.all(`
      SELECT id, phone, service_name, service_id, service_icon, 
             country_flag, country_code, code, cost, status, created_at
      FROM number_history 
      WHERE email = ? 
      ORDER BY created_at DESC LIMIT 100
    `, [email]);
    
    res.json(smsHistory);
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
});