// ====== UTILITY FUNCTIONS ======
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(inputId + 'Icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

function getServiceListHTML() {
  return '<div id="serviceListContainer" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;"></div>';
}

function renderAllServices(searchQuery = '') {
  const container = document.getElementById('serviceListContainer');
  if (!container) return;
  
  let filteredServices = services;
  
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredServices = services.filter(s => 
      (s.name || '').toLowerCase().includes(query) || 
      (s.id || '').toLowerCase().includes(query)
    );
  }
  
  if (filteredServices.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-secondary);">No services found. Try a different search.</div>';
    return;
  }
  
  container.innerHTML = filteredServices.map(s => {
    var safePrice = s.price || 0;
    return `
    <div onclick="openModalById('${s.id}')" style="padding:16px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;text-align:center;box-shadow:var(--shadow-sm);transition:all 0.2s;cursor:pointer;"
         onmouseover="this.style.boxShadow='var(--shadow-md)';this.style.transform='translateY(-3px)';this.style.backgroundColor='rgba(13,155,122,0.08)'"
         onmouseout="this.style.boxShadow='var(--shadow-sm)';this.style.transform='translateY(0)';this.style.backgroundColor='var(--bg-card)'">
      <div style="width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:18px;background:var(--bg-primary);color:var(--text-secondary);">
        <i class="fas fa-globe"></i>
      </div>
      <div style="font-size:12px;font-weight:600;margin-bottom:6px;line-height:1.3;">${s.name}</div>
      <div style="font-size:13px;font-weight:700;color:var(--accent);">$${safePrice.toFixed(2)}</div>
    </div>
  `}).join('');
}

function getReferralCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('ref');
  if (code) {
    localStorage.setItem('referralCode', code);
  }
}
getReferralCodeFromUrl();

// ====== AUTH STATE ======
let currentUser = null;

function isLoggedIn() {
  return currentUser !== null;
}

function getUserEmail() {
  return currentUser ? currentUser.email : '';
}

// ====== CHECK SESSION ON LOAD ======
function checkSession() {
  let saved = sessionStorage.getItem('smsvc_user');
  let storageType = 'session';

  if (!saved) {
    saved = localStorage.getItem('smsvc_user');
    storageType = 'local';
  }

  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      showApp();
    } catch (e) {
      if (storageType === 'session') {
        sessionStorage.removeItem('smsvc_user');
      } else {
        localStorage.removeItem('smsvc_user');
      }
      showLanding();
    }
  } else {
    showLanding();
  }
}

// ====== SHOW/HIDE FUNCTIONS ======
function showLanding() {
  document.getElementById('authPages').style.display = 'block';
  document.getElementById('appPages').style.display = 'none';
  renderLanding();
}

function showLogin() {
  document.getElementById('authPages').style.display = 'block';
  document.getElementById('appPages').style.display = 'none';
  renderLogin();
}

function showSignup() {
  document.getElementById('authPages').style.display = 'block';
  document.getElementById('appPages').style.display = 'none';
  renderSignup();
}

function showForgotPassword() {
  document.getElementById('authPages').style.display = 'block';
  document.getElementById('appPages').style.display = 'none';
  renderForgotPassword();
}

function showApp() {
  document.getElementById('authPages').style.display = 'none';
  document.getElementById('appPages').style.display = 'block';
  document.getElementById('userEmailDisplay').textContent = currentUser.email;
  document.getElementById('userAvatarDisplay').textContent = currentUser.email.substring(0, 2).toUpperCase();
  renderSidebar();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('smsvc_user');
  sessionStorage.removeItem('smsvc_user');
  if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
  showLanding();
}

// ====== API CALLS ======
async function apiSignup(email, password, referralCode) {
  const payload = { email, password };
  if (referralCode) payload.referral = referralCode;
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

async function apiLogin(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return await res.json();
}

async function apiForgotPassword(email) {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return await res.json();
}

// ====== PAGE RENDERERS ======
function renderLanding() {
  const container = document.getElementById('authPages');
  container.innerHTML = `
    <!-- NAVBAR (Mobile Friendly) -->
    <nav style="position:fixed;top:0;left:0;right:0;height:60px;background:rgba(255,255,255,0.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px, 5vw, 40px);z-index:100;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="showLanding()">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--accent),#087a60);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;">
          <i class="fas fa-comment-dots"></i>
        </div>
        <span style="font-weight:700;font-size:clamp(16px, 4vw, 19.36px);white-space:nowrap;">SonVerify <span style="color:var(--accent);"></span></span>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button class="btn btn-secondary" onclick="showLogin()" style="padding:8px 14px;font-size:13px;">Log In</button>
        <button class="btn btn-primary" onclick="showSignup()" style="padding:8px 14px;font-size:13px;">Sign Up Free</button>
      </div>
    </nav>

    <!-- HERO (Responsive Text) -->
    <section style="padding:clamp(90px, 15vw, 120px) clamp(16px, 5vw, 40px) 40px;background:linear-gradient(180deg,rgba(13,155,122,0.12),rgba(255,255,255,0));">
      <div style="max-width:900px;margin:0 auto;text-align:center;">
        <h1 style="font-size:clamp(28px, 6vw, 42px);font-weight:800;line-height:1.1;margin-bottom:20px;">Receive SMS Online with Temporary Numbers</h1>
        <p style="font-size:clamp(14px, 2.5vw, 16px);color:var(--text-secondary);max-width:760px;margin:0 auto 18px;line-height:1.8;">When signing up for social media platforms, messaging apps, or various online services, SMS verification is often required.</p>
        <p style="font-size:clamp(14px, 2.5vw, 16px);color:var(--text-secondary);max-width:760px;margin:0 auto 32px;line-height:1.8;">If you prefer not to purchase a new SIM card every time, you can use our service. We provide temporary phone numbers that allow you to receive SMS online instantly.</p>
      </div>
    </section>

    <!-- FEATURES GRID (Auto-fits mobile) -->
    <section style="padding:0 clamp(16px, 5vw, 40px) 40px;">
      <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:18px;">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--shadow-sm);">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Global SMS Coverage</h3>
          <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">Access numbers from over 30 countries with a pool of more than 1 million active numbers.</p>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--shadow-sm);">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Loyalty Rewards Program</h3>
          <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">Enjoy exclusive benefits and perks designed for our regular and VIP users.</p>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--shadow-sm);">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Flexible Payment Methods</h3>
          <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">Easily top up your balance using e-wallets, bank cards, or cryptocurrency.</p>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--shadow-sm);">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Daily Number Refresh</h3>
          <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">Our system is updated every day with new, clean numbers ready to use.</p>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--shadow-sm);">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Affiliate Opportunities</h3>
          <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">Invite others to join and earn rewards through our affiliate program.</p>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:var(--shadow-sm);">
          <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Advanced API Integration</h3>
          <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">Develop and automate your registration processes with our simple and powerful API.</p>
        </div>
      </div>
    </section>

    <!-- INFO SECTION -->
    <section style="padding:40px clamp(16px, 5vw, 40px);">
      <div style="max-width:900px;margin:0 auto;">
        <h2 style="font-size:clamp(24px, 5vw, 32px);font-weight:700;text-align:center;letter-spacing:-0.5px;margin-bottom:24px;">Why use temporary phone numbers</h2>
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:18px;padding:30px;box-shadow:var(--shadow-sm);">
          <p style="font-size:15px;color:var(--text-secondary);line-height:1.8;margin-bottom:20px;">When creating accounts, most websites require a valid mobile number, and typically only one account is allowed per number. By using temporary numbers, you can create and manage multiple accounts without limitations.</p>
          <p style="font-size:15px;color:var(--text-secondary);line-height:1.8;margin-bottom:20px;"><strong>Protect your privacy</strong><br>Your personal phone number can reveal sensitive details. Using temporary numbers helps keep your identity and information secure.</p>
          <p style="font-size:15px;color:var(--text-secondary);line-height:1.8;margin-bottom:20px;"><strong>Avoid scams and unwanted charges</strong><br>Some websites request phone numbers for downloads or access, which may lead to hidden subscriptions or spam. Temporary numbers help you avoid these risks.</p>
          <p style="font-size:15px;color:var(--text-secondary);line-height:1.8;margin-bottom:20px;"><strong>Take advantage of promotions</strong><br>Many platforms offer rewards or bonuses in exchange for phone verification. With temporary numbers, you can participate more freely without restrictions.</p>
          <p style="font-size:15px;color:var(--text-secondary);line-height:1.8;"><strong>Bypass regional restrictions</strong><br>Certain services limit access based on location. Temporary numbers from different countries allow you to register and use platforms without geographic barriers.</p>
        </div>
      </div>
    </section>

    <!-- PRODUCT LIST -->
    <section style="padding:0 clamp(16px, 5vw, 40px) 60px;">
      <div style="max-width:900px;margin:0 auto;">
        <h2 style="font-size:clamp(22px, 5vw, 28px);font-weight:700;text-align:center;letter-spacing:-1px;margin-bottom:8px;">Available Services</h2>
        <p style="font-size:14px;color:var(--text-secondary);text-align:center;margin-bottom:32px;">Search from ${services.length}+ services worldwide</p>
        
        <div style="max-width:500px;margin:0 auto 32px;position:relative;">
          <i class="fas fa-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--text-muted);"></i>
          <input type="text" placeholder="Search services..." oninput="renderAllServices(this.value)" 
            style="width:100%;padding:12px 16px 12px 40px;border:1px solid var(--border);border-radius:12px;font-size:14px;background:var(--bg-card);color:var(--text-primary);transition:all 0.2s;box-sizing:border-box;"
            onfocus="this.style.borderColor='var(--accent)';this.style.boxShadow='0 0 0 3px rgba(13,155,122,0.1)'"
            onblur="this.style.borderColor='var(--border)';this.style.boxShadow='none'">
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;">
          ${getServiceListHTML()}
        </div>
      </div>
    </section>

    <script>
      setTimeout(() => renderAllServices(''), 100);
    </script>

    <!-- FOOTER -->
    <footer style="padding:40px clamp(16px, 5vw, 40px);text-align:center;border-top:1px solid var(--border);margin-top:40px;">
      <p style="font-size:13px;color:var(--text-muted);">SonVerify &copy; 2025. All rights reserved.</p>
    </footer>
  `;
}

function renderLogin() {
  const container = document.getElementById('authPages');
  container.innerHTML = `
    <nav style="position:fixed;top:0;left:0;right:0;height:60px;background:rgba(255,255,255,0.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px, 5vw, 40px);z-index:100;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="showLanding()">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--accent),#087a60);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;">
          <i class="fas fa-comment-dots"></i>
        </div>
        <span style="font-weight:700;font-size:clamp(16px, 4vw, 19.36px);white-space:nowrap;">SonVerify <span style="color:var(--accent);"></span></span>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);white-space:nowrap;">Don't have an account? <a href="#" onclick="event.preventDefault();showSignup()" style="color:var(--accent);font-weight:600;text-decoration:none;">Sign up</a></div>
    </nav>

    <div style="max-width:400px;margin:clamp(90px, 15vw, 120px) auto 0;padding:0 20px;">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:36px;box-shadow:var(--shadow-md);">
        <h2 style="font-size:24px;font-weight:700;margin-bottom:6px;">Welcome back</h2>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:28px;">Log in to your account to continue.</p>

        <div id="loginError" style="display:none;padding:10px 14px;background:rgba(217,48,37,0.06);border:1px solid rgba(217,48,37,0.15);border-radius:10px;font-size:13px;color:var(--danger);margin-bottom:16px;"></div>

        <div style="margin-bottom:18px;">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Email</label>
          <input type="email" id="loginEmail" placeholder="you@example.com" style="width:100%;padding:11px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;color:var(--text-primary);outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
        </div>

        <div style="margin-bottom:24px;">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Password</label>
          <div style="position:relative;margin-bottom:8px;">
            <input type="password" id="loginPassword" placeholder="Enter your password" style="width:100%;padding:11px 40px 11px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;color:var(--text-primary);outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'" onkeydown="if(event.key==='Enter')handleLogin()">
            <button type="button" onclick="togglePasswordVisibility('loginPassword')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;">
              <i class="fas fa-eye" id="loginPasswordIcon"></i>
            </button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="rememberMe" style="width:16px;height:16px;accent-color:var(--accent);">
              <label for="rememberMe" style="font-size:12px;color:var(--text-secondary);cursor:pointer;">Remember me</label>
            </div>
            <a href="#" onclick="event.preventDefault();showForgotPassword()" style="font-size:12px;color:var(--accent);text-decoration:none;">Forgot password?</a>
          </div>
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;" onclick="handleLogin()" id="loginBtn">
          Log In
        </button>
      </div>
    </div>
  `;

  setTimeout(() => document.getElementById('loginEmail').focus(), 100);
}

function renderSignup() {
  const container = document.getElementById('authPages');
  container.innerHTML = `
    <nav style="position:fixed;top:0;left:0;right:0;height:60px;background:rgba(255,255,255,0.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px, 5vw, 40px);z-index:100;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="showLanding()">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--accent),#087a60);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;">
          <i class="fas fa-comment-dots"></i>
        </div>
        <span style="font-weight:700;font-size:clamp(16px, 4vw, 19.36px);white-space:nowrap;">SonVerify <span style="color:var(--accent);"></span></span>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);white-space:nowrap;">Already have an account? <a href="#" onclick="event.preventDefault();showLogin()" style="color:var(--accent);font-weight:600;text-decoration:none;">Log in</a></div>
    </nav>

    <div style="max-width:400px;margin:clamp(90px, 15vw, 120px) auto 0;padding:0 20px;">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:36px;box-shadow:var(--shadow-md);">
        <h2 style="font-size:24px;font-weight:700;margin-bottom:6px;">Create account</h2>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:28px;">Use a valid email address when you sign up.</p>

        <div id="signupError" style="display:none;padding:10px 14px;background:rgba(217,48,37,0.06);border:1px solid rgba(217,48,37,0.15);border-radius:10px;font-size:13px;color:var(--danger);margin-bottom:16px;"></div>

        <div style="margin-bottom:18px;">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Email</label>
          <input type="email" id="signupEmail" placeholder="you@example.com" style="width:100%;padding:11px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;color:var(--text-primary);outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
        </div>

        <div style="margin-bottom:18px;">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Password</label>
          <div style="position:relative;">
            <input type="password" id="signupPassword" placeholder="Min 6 characters" style="width:100%;padding:11px 40px 11px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;color:var(--text-primary);outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'">
            <button type="button" onclick="togglePasswordVisibility('signupPassword')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;">
              <i class="fas fa-eye" id="signupPasswordIcon"></i>
            </button>
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Confirm Password</label>
          <div style="position:relative;">
            <input type="password" id="signupConfirm" placeholder="Re-enter password" style="width:100%;padding:11px 40px 11px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;color:var(--text-primary);outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'" onkeydown="if(event.key==='Enter')handleSignup()">
            <button type="button" onclick="togglePasswordVisibility('signupConfirm')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;">
              <i class="fas fa-eye" id="signupConfirmIcon"></i>
            </button>
          </div>
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;" onclick="handleSignup()" id="signupBtn">
          Create Account
        </button>

        <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:16px;line-height:1.5;">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  `;

  setTimeout(() => document.getElementById('signupEmail').focus(), 100);
}

function renderForgotPassword() {
  const container = document.getElementById('authPages');
  container.innerHTML = `
    <nav style="position:fixed;top:0;left:0;right:0;height:60px;background:rgba(255,255,255,0.95);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 clamp(16px, 5vw, 40px);z-index:100;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="showLanding()">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--accent),#087a60);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0;">
          <i class="fas fa-comment-dots"></i>
        </div>
        <span style="font-weight:700;font-size:clamp(16px, 4vw, 19.36px);white-space:nowrap;">SonVerify <span style="color:var(--accent);"></span></span>
      </div>
      <div style="font-size:13px;color:var(--text-secondary);white-space:nowrap;">Remember your password? <a href="#" onclick="event.preventDefault();showLogin()" style="color:var(--accent);font-weight:600;text-decoration:none;">Log in</a></div>
    </nav>

    <div style="max-width:400px;margin:clamp(90px, 15vw, 120px) auto 0;padding:0 20px;">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:36px;box-shadow:var(--shadow-md);">
        <h2 style="font-size:24px;font-weight:700;margin-bottom:6px;">Reset password</h2>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:28px;">Enter your email address and we'll send you a link to reset your password.</p>

        <div id="forgotError" style="display:none;padding:10px 14px;background:rgba(217,48,37,0.06);border:1px solid rgba(217,48,37,0.15);border-radius:10px;font-size:13px;color:var(--danger);margin-bottom:16px;"></div>

        <div id="forgotSuccess" style="display:none;padding:10px 14px;background:rgba(13,155,122,0.06);border:1px solid rgba(13,155,122,0.15);border-radius:10px;font-size:13px;color:var(--accent);margin-bottom:16px;"></div>

        <div style="margin-bottom:24px;">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Email</label>
          <input type="email" id="forgotEmail" placeholder="you@example.com" style="width:100%;padding:11px 14px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;color:var(--text-primary);outline:none;transition:border-color 0.2s;box-sizing:border-box;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'" onkeydown="if(event.key==='Enter')handleForgotPassword()">
        </div>

        <button class="btn btn-primary" style="width:100%;justify-content:center;padding:12px;" onclick="handleForgotPassword()" id="forgotBtn">
          Send Reset Link
        </button>

        <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:16px;line-height:1.5;">
          Don't have an account? <a href="#" onclick="event.preventDefault();showSignup()" style="color:var(--accent);text-decoration:none;">Sign up</a>
        </p>
      </div>
    </div>
  `;

  setTimeout(() => document.getElementById('forgotEmail').focus(), 100);
}

// ====== FORM HANDLERS ======
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;
  const errorEl = document.getElementById('loginError');

  if (!email || !password) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  try {
    const data = await apiLogin(email, password);
    if (data.error) {
      errorEl.style.display = 'block';
      errorEl.textContent = data.error;
    } else {
      currentUser = { email: data.email, rememberMe: rememberMe };
      if (rememberMe) {
        localStorage.setItem('smsvc_user', JSON.stringify(currentUser));
      } else {
        sessionStorage.setItem('smsvc_user', JSON.stringify(currentUser));
      }
      showApp();
    }
  } catch (e) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Connection error. Is the server running?';
  }

  btn.textContent = 'Log In';
  btn.disabled = false;
}

async function handleSignup() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const errorEl = document.getElementById('signupError');

  if (!email || !password || !confirm) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }
  if (password.length < 6) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (password !== confirm) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Passwords do not match.';
    return;
  }

  const btn = document.getElementById('signupBtn');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    const referralCode = localStorage.getItem('referralCode');
    const data = await apiSignup(email, password, referralCode);
    if (data.error) {
      errorEl.style.display = 'block';
      errorEl.textContent = data.error;
    } else {
      currentUser = { email: data.email, rememberMe: true };
      localStorage.setItem('smsvc_user', JSON.stringify(currentUser));
      localStorage.removeItem('referralCode');
      showApp();
    }
  } catch (e) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Connection error. Is the server running?';
  }

  btn.textContent = 'Create Account';
  btn.disabled = false;
}

async function handleForgotPassword() {
  const email = document.getElementById('forgotEmail').value.trim();
  const errorEl = document.getElementById('forgotError');
  const successEl = document.getElementById('forgotSuccess');

  errorEl.style.display = 'none';
  successEl.style.display = 'none';

  if (!email) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Please enter your email address.';
    return;
  }

  const btn = document.getElementById('forgotBtn');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  try {
    const data = await apiForgotPassword(email);
    if (data.error) {
      errorEl.style.display = 'block';
      errorEl.textContent = data.error;
    } else {
      successEl.style.display = 'block';
      successEl.textContent = 'If an account with that email exists, we\'ve sent you a password reset link.';
    }
  } catch (e) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Connection error. Is the server running?';
  }

  btn.textContent = 'Send Reset Link';
  btn.disabled = false;
}