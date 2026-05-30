/* ============================================
   LANDING PAGE STYLES (THEME-AWARE)
   ============================================ */

/* Navigation */
.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  z-index: 100;
  box-sizing: border-box;
}

.landing-nav-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(16px, 5vw, 40px);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.landing-nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.landing-lang-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.landing-lang-btn:hover {
  border-color: var(--accent);
}

.landing-lang-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px;
  display: none;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  z-index: 1001;
  min-width: 140px;
}

.landing-lang-dropdown.show {
  display: block;
}

.landing-lang-dropdown button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.2s;
}

.landing-lang-dropdown button:hover {
  background: var(--accent-dim);
}

.landing-theme-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
}

.landing-theme-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.landing-login-btn,
.landing-signup-btn {
  padding: 8px 14px !important;
  font-size: 13px !important;
}

.landing-hamburger {
  display: none;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 18px;
}

/* Mobile Menu */
.landing-mobile-menu {
  position: fixed;
  top: 0;
  right: -300px;
  width: 300px;
  height: 100vh;
  background: var(--bg-card);
  z-index: 1002;
  transition: right 0.3s ease;
  padding: 20px;
}

.landing-mobile-menu.active {
  right: 0;
}

.landing-mobile-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  cursor: pointer;
}

.landing-mobile-menu-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 50px;
}

.landing-mobile-nav-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 16px;
  cursor: pointer;
  border-radius: 10px;
  transition: background 0.2s;
  text-align: left;
}

.landing-mobile-nav-btn:hover {
  background: var(--accent-dim);
}

.landing-mobile-divider {
  height: 1px;
  background: var(--border);
  margin: 12px 0;
}

.landing-mobile-lang-section {
  padding: 12px 16px;
}

.landing-mobile-lang-section > span {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.landing-mobile-lang-btns {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.landing-mobile-lang-btns button {
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  border-radius: 8px;
  font-size: 14px;
}

.landing-mobile-lang-btns button:hover {
  background: var(--accent-dim);
}

.landing-mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1001;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.landing-mobile-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Hero Section */
.landing-hero {
  padding: clamp(90px, 15vw, 120px) clamp(16px, 5vw, 40px) 40px;
  background: var(--bg-primary);
}

.landing-hero-title {
  font-size: clamp(28px, 6vw, 42px);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.landing-hero-subtitle {
  font-size: clamp(14px, 2.5vw, 16px);
  color: var(--text-secondary);
  max-width: 760px;
  margin: 0 auto 18px;
  line-height: 1.8;
}

.landing-hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 48px;
}

.btn-lg {
  padding: 16px 32px !important;
  font-size: 16px !important;
}

.landing-hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

.landing-stat {
  text-align: center;
}

.landing-stat-number {
  display: block;
  font-size: 28px;
  font-weight: 800;
  color: var(--accent);
}

.landing-stat-label {
  font-size: 14px;
  color: var(--text-muted);
}

.landing-stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border);
}

/* Features Section */
.landing-features {
  padding: 0 clamp(16px, 5vw, 40px) 40px;
  background: var(--bg-card);
}

.landing-section-title {
  font-size: clamp(24px, 5vw, 32px);
  font-weight: 800;
  text-align: center;
  letter-spacing: -0.5px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.landing-section-subtitle {
  font-size: 14px;
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.landing-features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
  max-width: 900px;
  margin: 0 auto;
}

.landing-feature-card {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  text-align: center;
  transition: all 0.3s;
}

.landing-feature-card:hover {
  border-color: var(--accent);
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.landing-feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.landing-feature-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.landing-feature-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}

/* Info Section */
.landing-info {
  padding: 40px clamp(16px, 5vw, 40px);
  background: var(--bg-primary);
}

.landing-info-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 30px;
  box-shadow: var(--shadow-sm);
  max-width: 900px;
  margin: 0 auto;
}

.landing-info-text {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 20px;
}

.landing-info-text:last-child {
  margin-bottom: 0;
}

.landing-info-text strong {
  color: var(--text-primary);
}

/* Services Section */
.landing-services {
  padding: 0 clamp(16px, 5vw, 40px) 60px;
  background: var(--bg-primary);
}

.landing-search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 14px;
  background: var(--bg-card);
  color: var(--text-primary);
  transition: all 0.2s;
  box-sizing: border-box;
}

/* CTA Section */
.landing-cta {
  padding: 60px clamp(16px, 5vw, 40px);
  background: var(--bg-card);
}

.landing-cta-container {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
  padding: 60px 40px;
  background: linear-gradient(135deg, var(--accent), #0a7d63);
  border-radius: 24px;
}

.landing-cta-title {
  font-size: clamp(24px, 5vw, 32px);
  font-weight: 800;
  color: white;
  margin-bottom: 16px;
}

.landing-cta-subtitle {
  font-size: 18px;
  color: rgba(255,255,255,0.9);
  margin-bottom: 32px;
}

.landing-cta .btn-primary {
  background: white !important;
  color: var(--accent) !important;
}

.landing-cta .btn-primary:hover {
  background: var(--bg-primary) !important;
}

/* Footer */
.landing-footer {
  padding: 40px clamp(16px, 5vw, 40px) 24px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border);
}

.landing-footer-container {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  margin-bottom: 30px;
}

.landing-footer-brand {
  max-width: 320px;
}

.landing-footer-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.landing-footer-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.landing-footer-column h4 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.landing-footer-column a {
  display: block;
  padding: 6px 0;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.landing-footer-column a:hover {
  color: var(--accent);
}

.landing-footer-bottom {
  border-top: 1px solid var(--border);
  padding-top: 20px;
  text-align: center;
}

.landing-footer-bottom p {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

/* Dark Mode Specific Adjustments */
[data-theme="dark"] .landing-nav {
  background: rgba(10, 10, 20, 0.9);
}

[data-theme="dark"] .landing-cta-container {
  background: linear-gradient(135deg, #0d9b7a, #085c4a);
}

/* Responsive */
@media (max-width: 768px) {
  .landing-nav-actions .landing-login-btn,
  .landing-nav-actions .landing-signup-btn,
  .landing-nav-actions .landing-lang-btn,
  .landing-nav-actions .landing-theme-btn {
    display: none;
  }
  
  .landing-hamburger {
    display: flex;
  }
  
  .landing-footer-container {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .landing-footer-links {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .landing-hero-stats {
    gap: 20px;
    flex-wrap: wrap;
  }
  
  .landing-cta-container {
    padding: 40px 24px;
  }
}