// ====== FIX: CLEAR STALE PRICE CACHE ======
// Add this right after the priceCache declaration (around line 30)

// Force clear cache if older than 1 hour (prevents stale prices)
function checkCacheAge() {
  try {
    var cacheAge = localStorage.getItem('priceCacheAge');
    var now = Date.now();
    if (!cacheAge || (now - parseInt(cacheAge)) > 3600000) { // 1 hour
      console.log('Clearing stale price cache...');
      for (var key in priceCache) delete priceCache[key];
      localStorage.removeItem('priceCache');
      localStorage.setItem('priceCacheAge', now.toString());
      return true;
    }
    return false;
  } catch(e) { return false; }
}

// Auto-check cache age on load
checkCacheAge();

// ====== ADD DEBUG FUNCTION ======
// Add this anywhere in data.js for testing
window.debugPrice = function(serviceId, countryCode) {
  console.log('=== PRICE DEBUG ===');
  console.log('Service ID:', serviceId);
  console.log('Country Code:', countryCode);
  console.log('Cached prices for country:', priceCache[countryCode]);
  console.log('Full cache:', priceCache);
  
  fetchPricesForCountry(countryCode).then(function(prices) {
    console.log('Fresh API prices:', prices);
    console.log('Price for', serviceId, ':', prices ? prices[serviceId] : 'NOT FOUND');
  });
};

// Manual cache clear function
window.clearAllPriceCache = function() {
  for (var key in priceCache) delete priceCache[key];
  localStorage.removeItem('priceCache');
  localStorage.removeItem('priceCacheAge');
  console.log('Price cache cleared!');
  showToast('Price cache cleared! Please refresh the page.', 'success');
};

// ====== API PRICE ENGINE ======
function addProfit(cost) {
  if (cost < 0.10) return Math.ceil((cost * 1.40) * 100) / 100;
  if (cost <= 0.30) return Math.ceil((cost * 1.40) * 100) / 100;
  if (cost <= 0.39) return Math.ceil((cost * 1.35) * 100) / 100;
  if (cost < 0.80) return Math.ceil((cost * 1.35) * 100) / 100; // Changed to < 0.80
  
  // 0.80 to 0.99 is now 15% profit
  if (cost < 1.00) return Math.ceil((cost * 1.15) * 100) / 100;
  
  // 1.00 upward is 10% profit
  return Math.ceil((cost * 1.10) * 100) / 100;
}

var SMS_API_TOKEN = 'd4a7951968ed4e59a647a0ac1d1af637';
var SMS_API_BASE = 'https://sms-bus.com/api/control/list';

var countryIdMap = {
  ru:1, ua:4, us:5, my:6, id:7, ph:8, in:14, ca:13, ro:11, vn:10,
  gb:25, la:32, nl:189, fr:80, pl:229, dk:206, nz:69, sg:158, de:48, it:88,
  es:190, sa:191, ae:192, il:193, ps:194, tr:195, qa:196, jp:197, at:198,
  lt:199, ng:231, eg:232, ie:233, ci:234, ee:235, usv:236, lv:203, co:200,
  rs:201, cy:202, bo:204, pa:205, ge:207, cm:208, bj:209, ni:210, kh:211,
  mx:212, kz:213, af:214, al:215, dz:216, ao:217, ar:218, am:219, bd:183,
  za:184, ma:185, mm:186, tj:187, az:220, au:188, bh:221, by:222, bw:223,
  br:224, bg:225, ke:226, tz:227, kg:228, mg:230
};

var priceCache = {};

try {
  var _savedCache = localStorage.getItem('priceCache');
  if (_savedCache) Object.assign(priceCache, JSON.parse(_savedCache));
} catch(e) {}

function fetchPricesForCountry(countryCode) {
  var countryId = countryIdMap[countryCode];
  if (!countryId) {
    console.warn('No country ID for:', countryCode);
    return Promise.resolve(null);
  }
  
  // ALWAYS fetch fresh prices (don't use cache for this call)
  // Cache is only used for display, not for purchases
  return fetch(SMS_API_BASE + '/prices?token=' + SMS_API_TOKEN + '&country_id=' + countryId)
    .then(function(res) { return res.json(); })
    .then(function(json) {
      if (json.code !== 200) {
        console.error('Price API error:', json);
        return null;
      }
      
      var prices = {};
      var rawPrices = {};
      
      for (var key in json.data) {
        var item = json.data[key];
        rawPrices[item.project_code] = item.cost;  // Store raw cost for debugging
        prices[item.project_code] = addProfit(item.cost);  // Apply profit
      }
      
      console.log('Prices for', countryCode, '- Raw:', rawPrices, '- With profit:', prices);
      
      priceCache[countryCode] = prices;
      try { 
        localStorage.setItem('priceCache', JSON.stringify(priceCache)); 
        localStorage.setItem('priceCacheAge', Date.now().toString());
      } catch(e) {}
      
      return prices;
    })
    .catch(function(e) { 
      console.error('Price fetch failed:', countryCode, e); 
      return null; 
    });
}

function getServicePrice(service, countryCode) {
  var cached = priceCache[countryCode];
  if (cached && cached[service.id] !== undefined) return cached[service.id];
  if (service.price !== undefined) return service.price;
  return 0.50;
}

function isServiceAvailable(service, countryCode) {
  var cached = priceCache[countryCode];
  if (cached && Object.keys(cached).length > 0 && cached[service.id] === undefined) return false;
  return true;
}

function clearPriceCache() {
  for (var key in priceCache) delete priceCache[key];
  localStorage.removeItem('priceCache');
}


// ====== EDIT SERVICES HERE ======
// To add a new service: copy one block, change values
// iconClass options: fb, fiverr, wa, telegram, twitter, amazon,
//   google, instagram, tiktok, discord, microsoft, uber, paypal, steam, other

const services = [
  // ===== RECOMMENDED =====
  { id: 'wa', name: 'WhatsApp', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/2062095_application_chat_communication_logo_whatsapp_icon.svg', iconClass: 'wa', price: 0.70, category: 'recommended' },
  { id: 'fb', name: 'Facebook', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg', iconClass: 'fb', price: 0.14, category: 'recommended' },
  { id: 'tg', name: 'Telegram', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg', iconClass: 'tg', price: 0.35, category: 'recommended' }, 
  { id: 'ig', name: 'Instagram+Threads', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg', iconClass: 'instagram', price: 0.14, category: 'recommended' },
  { id: 'tk', name: 'TikTok/Douyin', region: 'United Kingdom', country: 'gb', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Tiktok_icon.svg', iconClass: 'tiktok', price: 0.15, category: 'recommended' },
  
  // Any service WITHOUT an image property will just hide the preview automatically!
  { id: 'any-other', name: 'Any other', region: 'United States', country: 'US', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/63/World_Tourism_Day_Globe.svg', iconClass: 'other', price: 0.50, category: 'recommended' },

  // ===== SOCIAL MEDIA =====
  { id: 'vk', name: 'VKontakte (В Контакте)', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/77/VKsignature.png', iconClass: 'vk', price: 0.15, category: 'social' },
  { id: 'X', name: 'Twitter/X', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/01/X-Logo-Round-Color.png', iconClass: 'twitter', price: 0.10, category: 'social' },
  { id: 'linkedin', name: 'LinkedIn', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Linkedin-logo-blue-In-square-40px.png', iconClass: 'linkedin', price: 0.25, category: 'social' },
  { id: 'snapchat', name: 'Snapchat', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Snapchat-logo-svgrepo-com.svg', iconClass: 'snapchat', price: 0.13, category: 'social' },
  { id: 'tinder', name: 'Tinder', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/TinderIcon-2017.svg', iconClass: 'tinder', price: 0.25, category: 'social' },
  { id: 'bumble', name: 'Bumble', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Bumble_logo.png', iconClass: 'bumble', price: 0.28, category: 'social' },
  { id: 'hinge', name: 'Hinge', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Hinge-white-logo-icon-clean-with-transparent-background-for-ui-use-free-png.webp', iconClass: 'hinge', price: 0.19, category: 'social' },
  { id: 'okcupid', name: 'OkCupid', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/OkCupid_logo.png', iconClass: 'okcupid', price: 0.20, category: 'social' },
  { id: 'match', name: 'Match', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Match_icon.png', iconClass: 'match', price: 0.25, category: 'social' },
  { id: 'zoosk', name: 'Zoosk', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Zoosk_logo_2014.png', iconClass: 'zoosk', price: 0.25, category: 'social' },
  { id: 'happn', name: 'Happn', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Happen_icon.png', iconClass: 'happen', price: 0.23, category: 'social' },
  { id: 'wild', name: 'Wild App', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Wild_App.png', iconClass: 'wild', price: 0.18, category: 'social' },
  { id: 'bereal', name: 'BeReal', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/BeReal._Logo.svg', iconClass: 'bereal', price: 0.24, category: 'social' },
  { id: 'lemon8', name: 'Lemon8', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Lemon8_logo_icon.png', iconClass: 'lemon8', price: 0.17, category: 'social' },
  { id: 'yikyak', name: 'Yikyak', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/YikYak_app_H_icon.webp', iconClass: 'yikyak', price: 0.20, category: 'social' },
  { id: 'truthsocial', name: 'Truthsocial', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Truth-social-logo-png_seeklogo-431101.png', iconClass: 'truthsocial', price: 0.05, category: 'social' },
  { id: 'warpcast', name: 'Warpcast', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Warpcast_icon.png', iconClass: 'warpcast', price: 0.60, category: 'social' },
  { id: 'friendtech', name: 'Friendtech', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/Friend_tech_logo.jpg', iconClass: 'friendtech', price: 0.15, category: 'social' },

  // ===== MESSAGING & CHAT =====
  { id: 'vb', name: 'Viber', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/Viber_logo_2018_%28without_text%29.svg', iconClass: 'viber', price: 0.25, category: 'social' },
  { id: 'kakao', name: 'KakaoTalk', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Kakao_logo_icon_mmm.png', iconClass: 'kakao', price: 0.20, category: 'social' },
  { id: 'google', name: 'google/youtube/gmail', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/52/YouTube_social_white_circle_%282017%29.svg', iconClass: 'google', price: 0.12, category: 'social' },
  { id: 'line', name: 'Line', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/LINE_logo_icon.png', iconClass: 'line', price: 0.15, category: 'social' },
  { id: 'apple', name: 'Apple Messages', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', iconClass: 'apple', price: 0.10, category: 'social' },
  { id: 'imo', name: 'Imo', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Imo_icon.png', iconClass: 'imo', price: 0.20, category: 'social' },
  { id: 'icq', name: 'ICQ', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/89/ICQNewlogo.svg', iconClass: 'icq', price: 0.35, category: 'social' },
  { id: 'sk', name: 'Skype', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Skype_logo_%282019%E2%80%93present%29.svg', iconClass: 'skype', price: 0.30, category: 'social' },
  { id: 'signal', name: 'Signal', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Signal-Logo-Ultramarine_%282024%29.svg', iconClass: 'signal', price: 0.15, category: 'social' },
  { id: 'tamtam', name: 'TamTam', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Tamtam_icon.png', iconClass: 'tamtam', price: 0.20, category: 'social' },
  { id: 'botim', name: 'Botim', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Botim_logo_icon.jpg', iconClass: 'botim', price: 0.45, category: 'social' },
  { id: 'mchat', name: 'MChat', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Mchat_logo_icon.png', iconClass: 'mchat', price: 0.40, category: 'social' },
  { id: 'zalo', name: 'Zalo', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg', iconClass: 'zalo', price: 0.25, category: 'social' },
  { id: 'kwai', name: 'Kwai', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Kwai_logo_icon.png', iconClass: 'kwai', price: 0.50, category: 'social' },
  { id: 'azar', name: 'Azar', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Azar_logo_icon.jpg', iconClass: 'azar', price: 0.25, category: 'social' },
  { id: 'tantan', name: 'Tantan', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Tantan_icon.svg', iconClass: 'tantan', price: 0.50, category: 'social' },
  { id: 'yalla', name: 'Yalla', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Yalb_logo_icon.png', iconClass: 'yalla', price: 0.65, category: 'social' },
  { id: 'groupme', name: 'GroupMe', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/GroupMe_gradient_icon_logo.png', iconClass: 'groupme', price: 0.45, category: 'social' },
  { id: 'twitch', name: 'Twitch', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg', iconClass: 'twitch', price: 0.10, category: 'social' },

  // ===== E-COMMERCE & PAYMENTS =====
  { id: 'fiverr', name: 'Fiverr', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Fiverr_Logo_fiverr.png', iconClass: 'fiverr', price: 0.40, category: 'ecommerce' },
  { id: 'ub', name: 'Uber', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/62/Uber_logo.svg', iconClass: 'uber', price: 0.45, category: 'ecommerce' },
  { id: 'steam', name: 'Steam', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg', iconClass: 'steam', price: 0.15, category: 'ecommerce' },
  { id: 'aliexpress', name: 'AliExpress', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Aliexpress-logo-rounded-aliexpress-logo-free-png.webp', iconClass: 'other', price: 0.65, category: 'ecommerce' },
  { id: 'ebay', name: 'eBay', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg', iconClass: 'other', price: 0.50, category: 'ecommerce' },
  { id: 'shopee', name: 'Shopee', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Shopeelogo-freelogovectors.net.png', iconClass: 'other', price: 0.30, category: 'ecommerce' },
  { id: 'lazada', name: 'Lazada', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Lazada-logo-rounded-lazada-logo-free-png.webp', iconClass: 'other', price: 0.65, category: 'ecommerce' },
  { id: 'temu', name: 'Temu', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Temu_logo.svg', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'wish', name: 'Wish', region: 'United States', country: 'us', icon: 'fas fa-star', iconClass: 'other', price: 0.50, category: 'ecommerce' },
  { id: 'depop', name: 'Depop', region: 'United States', country: 'us', icon: 'fas fa-tshirt', iconClass: 'other', price: 0.60, category: 'ecommerce' },
  { id: 'poshmark', name: 'Poshmark', region: 'United States', country: 'us', icon: 'fas fa-tshirt', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'vinted', name: 'Vinted', region: 'United States', country: 'us', icon: 'fas fa-tshirt', iconClass: 'other', price: 0.60, category: 'ecommerce' },
  { id: 'etsy', name: 'Etsy', region: 'United States', country: 'us', icon: 'fas fa-palette', iconClass: 'other', price: 0.65, category: 'ecommerce' },
  { id: 'offerup', name: 'OfferUp', region: 'United States', country: 'us', icon: 'fas fa-handshake', iconClass: 'other', price: 0.50, category: 'ecommerce' },
  { id: 'craigslist', name: 'Craigslist', region: 'United States', country: 'us', icon: 'fas fa-list', iconClass: 'other', price: 0.45, category: 'ecommerce' },
  { id: 'olx', name: 'OLX', region: 'United States', country: 'us', icon: 'fas fa-list', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'carousell', name: 'Carousell', region: 'United States', country: 'us', icon: 'fas fa-shopping-bag', iconClass: 'other', price: 0.50, category: 'ecommerce' },
  { id: 'flipkart', name: 'Flipkart', region: 'United States', country: 'us', icon: 'fas fa-shopping-cart', iconClass: 'other', price: 0.60, category: 'ecommerce' },
  { id: 'swiggy', name: 'Swiggy', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'zara', name: 'Zara', region: 'United States', country: 'us', icon: 'fas fa-tshirt', iconClass: 'other', price: 0.70, category: 'ecommerce' },
  { id: 'shein', name: 'Shein', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Shein_Logo_2017.svg', iconClass: 'other', price: 0.65, category: 'ecommerce' },
  { id: 'myntra', name: 'Myntra', region: 'United States', country: 'us', icon: 'fas fa-tshirt', iconClass: 'other', price: 0.60, category: 'ecommerce' },
  { id: 'jiomart', name: 'JioMart', region: 'United States', country: 'us', icon: 'fas fa-shopping-cart', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'eneba', name: 'Eneba', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.65, category: 'ecommerce' },
  { id: 'gameflip', name: 'Gameflip', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.60, category: 'ecommerce' },
  { id: 'redbubble', name: 'Redbubble', region: 'United States', country: 'us', icon: 'fas fa-palette', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'xianyu', name: 'Xianyu / 闲鱼', region: 'United States', country: 'us', icon: 'fas fa-shopping-bag', iconClass: 'other', price: 0.50, category: 'ecommerce' },
  { id: 'taobao', name: 'TaoBao', region: 'United States', country: 'us', icon: 'fab fa-alipay', iconClass: 'other', price: 0.70, category: 'ecommerce' },
  { id: '1688', name: '1688', region: 'United States', country: 'us', icon: 'fab fa-alipay', iconClass: 'other', price: 0.75, category: 'ecommerce' },
  { id: 'jd', name: 'JD（京东）', region: 'United States', country: 'us', icon: 'fas fa-shopping-cart', iconClass: 'other', price: 0.65, category: 'ecommerce' },
  { id: 'qoo10', name: 'Qoo10', region: 'United States', country: 'us', icon: 'fas fa-shopping-bag', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'emag', name: 'EMAG', region: 'United States', country: 'us', icon: 'fas fa-shopping-cart', iconClass: 'other', price: 0.60, category: 'ecommerce' },
  { id: 'subito', name: 'Subito', region: 'United States', country: 'us', icon: 'fas fa-handshake', iconClass: 'other', price: 0.50, category: 'ecommerce' },
  { id: 'lebon', name: 'Leboncoin', region: 'United States', country: 'us', icon: 'fas fa-euro-sign', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'tesco', name: 'Tesco', region: 'United States', country: 'us', icon: 'fas fa-shopping-cart', iconClass: 'other', price: 0.60, category: 'ecommerce' },
  { id: 'gails', name: 'GAIL\'s Bakery', region: 'United States', country: 'us', icon: 'fas fa-birthday-cake', iconClass: 'other', price: 0.65, category: 'ecommerce' },
  { id: 'greggs', name: 'Greggs', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.55, category: 'ecommerce' },
  { id: 'justeat', name: 'Just Eat', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.60, category: 'ecommerce' },

  // ===== GAMING =====
  { id: 'roblox', name: 'Roblox', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Roblox_Logo_2022.jpg', iconClass: 'roblox', price: 0.50, category: 'popular' },
  { id: 'pubg', name: '‎PUBG MOBILE', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/27/PUBG_Mobile_simple_logo_black.svg', iconClass: 'pubg', price: 0.65, category: 'popular' },
  { id: 'bz', name: 'Blizzard / Battle', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'nc', name: 'NCSOFT', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'gamemail', name: 'GameMail', region: 'United States', country: 'us', icon: 'fas fa-envelope', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'gamehub', name: 'GameHub', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'taptap', name: 'TapTap', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'playa', name: 'PlayerAuctions', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'g2g', name: 'G2G', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'dream11', name: 'Dream11', region: 'United States', country: 'us', icon: 'fas fa-trophy', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'vision', name: 'Vision11', region: 'United States', country: 'us', icon: 'fas fa-trophy', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'rummy', name: 'Rummy Circle', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'winzo', name: 'WinZO', region: 'United States', country: 'us', icon: 'fas fa-trophy', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'bingo plus', name: 'Bingo Plus', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'bovada', name: 'Bovada', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: '8casino', name: '888 Casino', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.75, category: 'popular' },
  { id: 'betfair', name: 'Betfair', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'superbet', name: 'Superbet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'paddypower', name: 'Paddypower', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'sportsbuzz', name: 'Sportsbuzz', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'betano', name: 'Betano', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'scruff', name: 'Scruff', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'bet365', name: 'Bet365', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'betinin', name: 'Betinin', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'betmen', name: 'BetMen', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'betonred', name: 'BetOnRed', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'cloudbet', name: 'CloudBet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'crocobet', name: 'Crocobet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'crystalbet', name: 'Crystalbet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'eurobet', name: 'Eurobet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'fivebet', name: 'FiveBet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'getsbet', name: 'Getsbet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'ginjabets', name: 'GinjaBet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'skybet', name: 'SkyBet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'kaito', name: 'Kaito', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'prodege', name: 'Prodege', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: '1x', name: '1xbet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'bst', name: 'AdmiralBet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'byi', name: 'Ambassadoribet', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'ie', name: 'Bet365', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'agl', name: 'Betano', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'bmj', name: 'Betflag', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'betinin', name: 'Betinin', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'bdd', name: 'BetMen', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'aqs', name: 'BetOnRed', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.65, category: 'popular' },

  // ===== FINANCE & CRYPTO =====
  { id: 'coinbase', name: 'Coinbase', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Coinbase_Icon.png', iconClass: 'other', price: 0.80, category: 'popular' },
  { id: 'venmo', name: 'Venmo', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Venmo_logo.png', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'cash', name: 'Cash App', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Cashapp.png', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'skrill', name: 'Skrill', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'wise', name: 'Wise', region: 'United States', country: 'us', icon: 'fas fa-exchange-alt', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'okx', name: 'OKX', region: 'United States', country: 'us', icon: 'fab fa-bitcoin', iconClass: 'other', price: 0.75, category: 'popular' },
  { id: 'binance', name: 'Binance', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Binance_Logo.svg', iconClass: 'other', price: 0.80, category: 'popular' },
  { id: 'bybit', name: 'Bybit', region: 'United States', country: 'us', icon: 'fab fa-bitcoin', iconClass: 'other', price: 0.75, category: 'popular' },
  { id: 'mexc', name: 'MEXC', region: 'United States', country: 'us', icon: 'fab fa-bitcoin', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'bitget', name: 'Bitget', region: 'United States', country: 'us', icon: 'fab fa-bitcoin', iconClass: 'other', price: 0.75, category: 'popular' },
  { id: 'uphold', name: 'Uphold', region: 'United States', country: 'us', icon: 'fab fa-bitcoin', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'paysafe', name: 'PaysafeCard', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'papara', name: 'Papara', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'zadarma', name: 'Zadarma', region: 'United States', country: 'us', icon: 'fas fa-phone', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'tradingview', name: 'Tradingview', region: 'United States', country: 'us', icon: 'fas fa-chart-line', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'nvidia', name: 'Nvidia', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Nvidia_Logo.svg', iconClass: 'other', price: 0.70, category: 'popular' },

  // ===== FOOD & DELIVERY =====
  { id: 'foodpanda', name: 'Foodpanda', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'glovo', name: 'Glovo', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'wolt', name: 'Wolt', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'yemeksepeti', name: 'Yemeksepeti', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'getir', name: 'Getir', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'swiggy', name: 'Swiggy', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'talabat', name: 'Talabat', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'grab', name: 'Grab', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: '99app', name: '99app', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'foodora', name: 'Foodora', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'careem', name: 'Careem', region: 'United States', country: 'us', icon: 'fas fa-taxi', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'bolt', name: 'Bolt', region: 'United States', country: 'us', icon: 'fas fa-bolt', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'lyft', name: 'Lyft', region: 'United States', country: 'us', icon: 'fas fa-car', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'gett', name: 'Gett', region: 'United States', country: 'us', icon: 'fas fa-taxi', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'blablacar', name: 'BlaBlaCar', region: 'United States', country: 'us', icon: 'fas fa-car', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'dosi', name: 'DOSI', region: 'United States', country: 'us', icon: 'fas fa-car', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'sparkdriver', name: 'Sparkdriver', region: 'United States', country: 'us', icon: 'fas fa-car', iconClass: 'other', price: 0.55, category: 'popular' },

  // ===== OTHER SERVICES =====
  { id: 'nf', name: 'Netflix', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg', iconClass: 'other', price: 0.80, category: 'popular' },
  { id: 'disneyplus', name: 'Disney+', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', iconClass: 'other', price: 0.75, category: 'popular' },
  { id: 'openai', name: 'OpenAI/ChatGPT', region: 'United States', country: 'us', icon: 'fas fa-brain', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'claude', name: 'Claude', region: 'United States', country: 'us', icon: 'fas fa-brain', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'dseek', name: 'DeepSeek', region: 'United States', country: 'us', icon: 'fas fa-brain', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'siliflow', name: 'SiliconFlow / 硅基流动', region: 'United States', country: 'us', icon: 'fas fa-brain', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'vercel', name: 'Vercel', region: 'United States', country: 'us', icon: 'fas fa-code', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'yahoo', name: 'Yahoo', region: 'United States', country: 'us', icon: 'fab fa-yahoo', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'aol', name: 'AOL', region: 'United States', country: 'us', icon: 'fas fa-envelope', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'gmx', name: 'GMX', region: 'United States', country: 'us', icon: 'fas fa-envelope', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'outlook', name: 'Outlook', region: 'United States', country: 'us', icon: 'fab fa-microsoft', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'airbnb', name: 'Airbnb', region: 'United States', country: 'us', icon: 'fab fa-airbnb', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'booking', name: 'Booking.com', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Booking.com_Logo.svg', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'ctrip', name: 'Ctrip / 携程', region: 'United States', country: 'us', icon: 'fas fa-plane', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'cleartrip', name: 'Cleartrip', region: 'United States', country: 'us', icon: 'fas fa-plane', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'irctc', name: 'IRCTC', region: 'United States', country: 'us', icon: 'fas fa-train', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'tmaster', name: 'Ticketmaster', region: 'United States', country: 'us', icon: 'fas fa-ticket-alt', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'tixcraft', name: 'Tixcraft', region: 'United States', country: 'us', icon: 'fas fa-ticket-alt', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'zee5', name: 'Zee5', region: 'United States', country: 'us', icon: 'fas fa-tv', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'zee now', name: 'ZeeNow', region: 'United States', country: 'us', icon: 'fas fa-tv', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'bilibili', name: 'Bilibili', region: 'United States', country: 'us', icon: 'fab fa-bilibili', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'weibo', name: 'Weibo', region: 'United States', country: 'us', icon: 'fab fa-weibo', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'red', name: 'REDnote / 小红书', region: 'United States', country: 'us', icon: 'fas fa-sticky-note', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'meituan', name: 'MeiTuan', region: 'United States', country: 'us', icon: 'fas fa-utensils', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'truecaller', name: 'Truecaller', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Truecaller_Logo.svg', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'authy', name: 'Authy', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Auth0_logo_2026.jpg', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'twilio', name: 'Twilio', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Twilio-logo-red.svg', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'gv', name: 'Google Voice', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/archive/b/bf/20201011212440%21Google_Voice_icon_%282020%29.svg', iconClass: 'google', price: 0.60, category: 'popular' },
  { id: 'af', name: 'Affirm', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'chime', name: 'Chime', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Chime_company_logo.svg', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'bofa', name: 'Bank of America', region: 'United States', country: 'us', icon: 'fas fa-university', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'go2bank', name: 'GO2bank', region: 'United States', country: 'us', icon: 'fas fa-university', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'creditkarma', name: 'Credit Karma', region: 'United States', country: 'us', icon: 'fas fa-chart-line', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'aarp', name: 'AARP', region: 'United States', country: 'us', icon: 'fas fa-users', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'app en', name: 'Appen', region: 'United States', country: 'us', icon: 'fas fa-tasks', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'outlier', name: 'Outlier', region: 'United States', country: 'us', icon: 'fas fa-brain', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'opinion', name: 'Opinion Outpost', region: 'United States', country: 'us', icon: 'fas fa-star', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'ipsosisay', name: 'Ipsos iSay', region: 'United States', country: 'us', icon: 'fas fa-star', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'sweatcoin', name: 'Sweatcoin', region: 'United States', country: 'us', icon: 'fas fa-walking', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'ipfoxy', name: 'IPFoxy', region: 'United States', country: 'us', icon: 'fas fa-globe', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'zoho', name: 'Zoho', region: 'United States', country: 'us', icon: 'fas fa-building', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'hopi', name: 'Hopi', region: 'United States', country: 'us', icon: 'fas fa-shopping-bag', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'sss', name: 'Samsung Shop', region: 'United States', country: 'us', icon: 'fas fa-mobile-alt', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'nike', name: 'Nike', region: 'United States', country: 'us', icon: 'fab fa-nike', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'footlocker', name: 'Foot Locker', region: 'United States', country: 'us', icon: 'fas fa-shoe-prints', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'walmart', name: 'Walmart', region: 'United States', country: 'us', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Walmart_logo_%282025%3B_Alt_2%29.svg', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'sheerid', name: 'Sheerid', region: 'United States', country: 'us', icon: 'fas fa-id-card', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'unacademy', name: 'Unacademy', region: 'United States', country: 'us', icon: 'fas fa-graduation-cap', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'goalry', name: 'Goalry', region: 'United States', country: 'us', icon: 'fas fa-futbol', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'partying', name: 'Partying', region: 'United States', country: 'us', icon: 'fas fa-glass-cheers', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'minima', name: 'Minima', region: 'United States', country: 'us', icon: 'fas fa-mobile-alt', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'pikaster', name: 'Pikaster', region: 'United States', country: 'us', icon: 'fas fa-camera', iconClass: 'other', price: 0.40, category: 'popular' },
  { id: 'wondercise', name: 'Wondercise', region: 'United States', country: 'us', icon: 'fas fa-dumbbell', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'asiamiles', name: 'Asia Miles', region: 'United States', country: 'us', icon: 'fas fa-plane', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'getemail', name: 'GetEmail', region: 'United States', country: 'us', icon: 'fas fa-envelope', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'omiai', name: 'Omiai', region: 'United States', country: 'us', icon: 'fas fa-heart', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'curtsy', name: 'Curtsy', region: 'United States', country: 'us', icon: 'fas fa-tshirt', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'ourtime', name: 'Ourtime', region: 'United States', country: 'us', icon: 'fas fa-heart', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'pof', name: 'POF-Plenty of Fish', region: 'United States', country: 'us', icon: 'fas fa-fish', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'luckyland', name: 'LuckyLand', region: 'United States', country: 'us', icon: 'fas fa-dice', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'faceit', name: 'FACEIT', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'boo', name: 'Boo', region: 'United States', country: 'us', icon: 'fas fa-ghost', iconClass: 'other', price: 0.40, category: 'popular' },
  { id: 'google_developer', name: 'Google Developer', region: 'United States', country: 'us', icon: 'fab fa-google', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'playasia', name: 'Play-Asia', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: '51ca', name: '51.ca', region: 'United States', country: 'us', icon: 'fas fa-globe', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'rumble', name: 'Rumble', region: 'United States', country: 'us', icon: 'fas fa-video', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'cloudchat', name: 'CloudChat', region: 'United States', country: 'us', icon: 'fas fa-cloud', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'gitcoin', name: 'Gitcoin', region: 'United States', country: 'us', icon: 'fab fa-git', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'her', name: 'Her', region: 'United States', country: 'us', icon: 'fas fa-heart', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'dubizzle', name: 'Dubizzle', region: 'United States', country: 'us', icon: 'fas fa-list', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'bip', name: 'BIP', region: 'United States', country: 'us', icon: 'fas fa-phone', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'caixa', name: 'CAIXA', region: 'United States', country: 'us', icon: 'fas fa-university', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'indomaret', name: 'Indomaret', region: 'United States', country: 'us', icon: 'fas fa-shopping-cart', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: '7-eleven', name: '7-Eleven', region: 'United States', country: 'us', icon: 'fas fa-shopping-cart', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'mts cashback', name: 'MTS CashBack', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'x5id', name: 'X5ID', region: 'United States', country: 'us', icon: 'fas fa-id-card', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'picpay', name: 'Picpay', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'sber', name: 'Sber', region: 'United States', country: 'us', icon: 'fas fa-university', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'baidu', name: 'Baidu', region: 'United States', country: 'us', icon: 'fab fa-baidu', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'civo', name: 'Civo', region: 'United States', country: 'us', icon: 'fas fa-server', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'badoo', name: 'Badoo', region: 'United States', country: 'us', icon: 'fas fa-heart', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'yandex', name: 'Yandex', region: 'United States', country: 'us', icon: 'fas fa-search', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'wildberries', name: 'Wildberries', region: 'United States', country: 'us', icon: 'fas fa-shopping-bag', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'ozon', name: 'Ozon', region: 'United States', country: 'us', icon: 'fas fa-shopping-cart', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'wallapop', name: 'Wallapop', region: 'United States', country: 'us', icon: 'fas fa-shopping-bag', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'weverse', name: 'WeverseShop', region: 'United States', country: 'us', icon: 'fas fa-music', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'oldubil', name: 'OlduBil', region: 'United States', country: 'us', icon: 'fas fa-car', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'paypay', name: 'PayPay / ペイペイ', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'taito', name: 'Taito', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'vandlecard', name: 'VANDLE CARD / バンドルカード', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'paidy', name: 'Paidy', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'kyash', name: 'Kyash', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'naka', name: 'NAKA Pay', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'piccoma', name: 'Piccoma / ピッコマ', region: 'United States', country: 'us', icon: 'fas fa-book', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'povo', name: 'Povo', region: 'United States', country: 'us', icon: 'fas fa-mobile-alt', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'cupp', name: 'Cupp', region: 'United States', country: 'us', icon: 'fas fa-coffee', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'chargepoint', name: 'Chargepoint', region: 'United States', country: 'us', icon: 'fas fa-charging-station', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'razer', name: 'Razer', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'ubisoft', name: 'Ubisoft', region: 'United States', country: 'us', icon: 'fas fa-gamepad', iconClass: 'other', price: 0.70, category: 'popular' },
  { id: 'tdyol', name: 'Trendyol', region: 'United States', country: 'us', icon: 'fas fa-shopping-bag', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'lemfi', name: 'Lemfi', region: 'United States', country: 'us', icon: 'fas fa-credit-card', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'rebtel ', name: 'Rebtel', region: 'United States', country: 'us', icon: 'fas fa-phone', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'zepto', name: 'Zepto', region: 'United States', country: 'us', icon: 'fas fa-shopping-bag', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: '4fun', name: '4Fun', region: 'United States', country: 'us', icon: 'fas fa-laugh', iconClass: 'other', price: 0.40, category: 'popular' },
  { id: 'monese', name: 'Monese', region: 'United States', country: 'us', icon: 'fas fa-euro-sign', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'yaay', name: 'Yaay', region: 'United States', country: 'us', icon: 'fas fa-smile', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'airtasker', name: 'Airtasker', region: 'United States', country: 'us', icon: 'fas fa-tasks', iconClass: 'other', price: 0.55, category: 'popular' },
  { id: 'likee', name: 'Likee', region: 'United States', country: 'us', icon: 'fas fa-video', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'monese', name: 'Monese', region: 'United States', country: 'us', icon: 'fas fa-euro-sign', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'yaay', name: 'Yaay', region: 'United States', country: 'us', icon: 'fas fa-smile', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: '4fun', name: '4Fun', region: 'United States', country: 'us', icon: 'fas fa-laugh', iconClass: 'other', price: 0.40, category: 'popular' },
  { id: 'mosgram', name: 'MosGram', region: 'United States', country: 'us', icon: 'fas fa-envelope', iconClass: 'other', price: 0.45, category: 'popular' },
  { id: 'kcex', name: 'KCEX', region: 'United States', country: 'us', icon: 'fas fa-exchange-alt', iconClass: 'other', price: 0.60, category: 'popular' },
  { id: 'taovip', name: 'TAOVIP', region: 'United States', country: 'us', icon: 'fab fa-alipay', iconClass: 'other', price: 0.65, category: 'popular' },
  { id: 'huntthemouse', name: 'HuntTheMouse', region: 'United States', country: 'us', icon: 'fas fa-mouse-pointer', iconClass: 'other', price: 0.50, category: 'popular' },
  { id: 'mocamoca', name: 'MocaMoca', region: 'United States', country: 'us', icon: 'fas fa-coffee', iconClass: 'other', price: 0.45, category: 'popular' },
];

services.forEach((service, index) => {
  if (service.available === undefined) {
    service.available = 10579 - ((index * 73) % 5000);
  }
});

// ====== EDIT COUNTRIES HERE ======
const countries = [
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', prefix: '+44', basePrice: 0.65 },
  { code: 'de', name: 'Germany', flag: '🇩🇪', prefix: '+49', basePrice: 0.60 },
  { code: 'us', name: 'United States', flag: '🇺🇸', prefix: '+1', basePrice: 2.95 },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', prefix: '+1', basePrice: 0.60 },
  { code: 'au', name: 'Australia', flag: '🇦🇺', prefix: '+61', basePrice: 0.90 },
  { code: 'it', name: 'Italy', flag: '🇮🇹', prefix: '+39', basePrice: 0.60 },
  { code: 'es', name: 'Spain', flag: '🇪🇸', prefix: '+34', basePrice: 0.55 },
  { code: 'sa', name: 'Saudi Arabia', flag: '🇸🇦', prefix: '+966', basePrice: 1.20 },
  { code: 'ae', name: 'United Arab Emirates', flag: '🇦🇪', prefix: '+971', basePrice: 1.50 },
  { code: 'il', name: 'Israel', flag: '🇮🇱', prefix: '+972', basePrice: 1.00 },
  { code: 'ps', name: 'Palestine', flag: '🇵🇸', prefix: '+970', basePrice: 2.00 },
  { code: 'tr', name: 'Turkey', flag: '🇹🇷', prefix: '+90', basePrice: 0.80 },
  { code: 'qa', name: 'Qatar', flag: '🇶🇦', prefix: '+974', basePrice: 1.80 },
  { code: 'jp', name: 'Japan', flag: '🇯🇵', prefix: '+81', basePrice: 0.80 },
  { code: 'mg', name: 'Madagascar', flag: '🇲🇬', prefix: '+261', basePrice: 3.00 },
  { code: 'at', name: 'Austria', flag: '🇦🇹', prefix: '+43', basePrice: 0.70 },
  { code: 'ng', name: 'Nigeria', flag: '🇳🇬', prefix: '+234', basePrice: 2.50 },
  { code: 'lt', name: 'Lithuania', flag: '🇱🇹', prefix: '+370', basePrice: 1.20 },
  { code: 'eg', name: 'Egypt', flag: '🇪🇬', prefix: '+20', basePrice: 1.50 },
  { code: 'ie', name: 'Ireland', flag: '🇮🇪', prefix: '+353', basePrice: 0.90 },
  { code: 'ci', name: 'Ivory Coast', flag: '🇨🇮', prefix: '+225', basePrice: 2.80 },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬', prefix: '+65', basePrice: 1.20 },
  { code: 'ee', name: 'Estonia', flag: '🇪🇪', prefix: '+372', basePrice: 1.00 },
  { code: 'vn', name: 'Vietnam', flag: '🇻🇳', prefix: '+84', basePrice: 0.60 },
  { code: 'ro', name: 'Romania', flag: '🇷🇴', prefix: '+40', basePrice: 0.70 },
  { code: 'th', name: 'Thailand', flag: '🇹🇭', prefix: '+66', basePrice: 0.80 },
  { code: 'in', name: 'India', flag: '🇮🇳', prefix: '+91', basePrice: 0.40 },
  { code: 'ru', name: 'Russia', flag: '🇷🇺', prefix: '+7', basePrice: 0.50 },
  { code: 'co', name: 'Colombia', flag: '🇨🇴', prefix: '+57', basePrice: 1.50 },
  { code: 'rs', name: 'Serbia', flag: '🇷🇸', prefix: '+381', basePrice: 1.20 },
  { code: 'ua', name: 'Ukraine', flag: '🇺🇦', prefix: '+380', basePrice: 0.60 },
  { code: 'cy', name: 'Cyprus', flag: '🇨🇾', prefix: '+357', basePrice: 1.80 },
  { code: 'lv', name: 'Latvia', flag: '🇱🇻', prefix: '+371', basePrice: 1.00 },
  { code: 'my', name: 'Malaysia', flag: '🇲🇾', prefix: '+60', basePrice: 0.70 },
  { code: 'bo', name: 'Bolivia', flag: '🇧🇴', prefix: '+591', basePrice: 2.50 },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩', prefix: '+62', basePrice: 0.60 },
  { code: 'pa', name: 'Panama', flag: '🇵🇦', prefix: '+507', basePrice: 2.00 },
  { code: 'ph', name: 'Philippines', flag: '🇵🇭', prefix: '+63', basePrice: 0.80 },
  { code: 'dk', name: 'Denmark', flag: '🇩🇰', prefix: '+45', basePrice: 0.90 },
  { code: 'ge', name: 'Georgia', flag: '🇬🇪', prefix: '+995', basePrice: 1.50 },
  { code: 'cm', name: 'Cameroon', flag: '🇨🇲', prefix: '+237', basePrice: 2.20 },
  { code: 'bj', name: 'Benin', flag: '🇧🇯', prefix: '+229', basePrice: 2.50 },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧', prefix: '+44', basePrice: 0.65 },
  { code: 'nz', name: 'New Zealand', flag: '🇳🇿', prefix: '+64', basePrice: 1.20 },
  { code: 'ni', name: 'Nicaragua', flag: '🇳🇮', prefix: '+505', basePrice: 2.80 },
  { code: 'kh', name: 'Cambodia', flag: '🇰🇭', prefix: '+855', basePrice: 1.50 },
  { code: 'mx', name: 'Mexico', flag: '🇲🇽', prefix: '+52', basePrice: 0.90 },
  { code: 'kz', name: 'Kazakhstan', flag: '🇰🇿', prefix: '+7', basePrice: 1.20 },
  { code: 'af', name: 'Afghanistan', flag: '🇦🇫', prefix: '+93', basePrice: 3.00 },
  { code: 'al', name: 'Albania', flag: '🇦🇱', prefix: '+355', basePrice: 1.80 },
  { code: 'dz', name: 'Algeria', flag: '🇩🇿', prefix: '+213', basePrice: 2.00 },
  { code: 'ao', name: 'Angola', flag: '🇦🇴', prefix: '+244', basePrice: 2.50 },
  { code: 'ar', name: 'Argentina', flag: '🇦🇷', prefix: '+54', basePrice: 1.20 },
  { code: 'am', name: 'Armenia', flag: '🇦🇲', prefix: '+374', basePrice: 1.50 },
  { code: 'la', name: 'Lao People\'s Democratic Republic', flag: '🇱🇦', prefix: '+856', basePrice: 2.00 },
  { code: 'bd', name: 'Bangladesh', flag: '🇧🇩', prefix: '+880', basePrice: 0.80 },
  { code: 'za', name: 'South Africa', flag: '🇿🇦', prefix: '+27', basePrice: 1.50 },
  { code: 'ma', name: 'Morocco', flag: '🇲🇦', prefix: '+212', basePrice: 1.80 },
  { code: 'mm', name: 'Myanmar', flag: '🇲🇲', prefix: '+95', basePrice: 1.20 },
  { code: 'tj', name: 'Tajikistan', flag: '🇹🇯', prefix: '+992', basePrice: 2.50 },
  { code: 'az', name: 'Azerbaijan', flag: '🇦🇿', prefix: '+994', basePrice: 1.50 },
  { code: 'au', name: 'Australia', flag: '🇦🇺', prefix: '+61', basePrice: 0.90 },
  { code: 'bh', name: 'Bahrain', flag: '🇧🇭', prefix: '+973', basePrice: 1.80 },
  { code: 'nl', name: 'Netherlands', flag: '🇳🇱', prefix: '+31', basePrice: 0.70 },
  { code: 'by', name: 'Belarus', flag: '🇧🇾', prefix: '+375', basePrice: 1.20 },
  { code: 'bw', name: 'Botswana', flag: '🇧🇼', prefix: '+267', basePrice: 2.80 },
  { code: 'br', name: 'Brazil', flag: '🇧🇷', prefix: '+55', basePrice: 0.80 },
  { code: 'bg', name: 'Bulgaria', flag: '🇧🇬', prefix: '+359', basePrice: 1.00 },
  { code: 'ke', name: 'Kenya', flag: '🇰🇪', prefix: '+254', basePrice: 1.80 },
  { code: 'tz', name: 'Tanzania', flag: '🇹🇿', prefix: '+255', basePrice: 2.00 },
  { code: 'fr', name: 'France', flag: '🇫🇷', prefix: '+33', basePrice: 0.60 },
  { code: 'kg', name: 'Kyrgyzstan', flag: '🇰🇬', prefix: '+996', basePrice: 1.80 },
  { code: 'pl', name: 'Poland', flag: '🇵🇱', prefix: '+48', basePrice: 0.70 },
];

// ====== USE window. so app.js and pages.js read the SAME variable ======
// let creates a separate lexical scope variable — app.js writes to
// window.activeNumbers but pages.js reads the empty let.
// Using window. makes everyone share one object.
window.activeNumbers = [];
window.historyData = [];
window.balance = 0.00;

// =======================================================================
// ===== SMS-BUS API: BUY, STATUS, CANCEL FUNCTIONS =====
// =======================================================================

// ✅ FIX: Use YOUR backend proxy instead of direct SMS-Bus calls
// Your backend will forward these to sms-bus.com with the token
var SMS_API_BUY = '/api/v2/buy';
var SMS_API_STATUS = '/api/v2/status';
var SMS_API_CANCEL = '/api/v2/cancel';
var SMS_API_PRICES = '/api/v2/prices';

// Token is now only used server-side - remove from frontend for security
// var SMS_API_TOKEN = 'd4a7951968ed4e59a647a0ac1d1af637'; // ❌ REMOVE THIS - security risk!

// ===== BUY A NUMBER =====
function smsbusBuyNumber(countryId, serviceCode, userEmail) {
  return fetch(SMS_API_BUY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      country_id: countryId,
      service_code: serviceCode,
      email: userEmail
    })
  })
  .then(function(res) { 
    if (!res.ok) {
      return res.json().then(function(err) {
        throw new Error(err.error || err.msg || 'API Error: ' + res.status);
      }).catch(function() {
        throw new Error('Network error: ' + res.status);
      });
    }
    return res.json(); 
  })
  .then(function(json) {
    console.log('SMS-Bus buy response:', json);
    
    // Handle different response formats
    var data = json.data || json;
    var code = json.code;
    
    // Success codes: 200, 0, 1
    if (code !== undefined && code !== 200 && code !== 0 && code !== 1) {
      var errorMsg = json.msg || json.message || json.error || 'API Error: ' + code;
      if (code === 400) errorMsg = 'Invalid request parameters';
      if (code === 402) errorMsg = 'Insufficient funds on API account';
      if (code === 404) errorMsg = 'Service or country not available';
      if (code === 409) errorMsg = 'No numbers available, try again';
      throw new Error(errorMsg);
    }
    
    return data;
  });
}

// ===== CHECK SMS STATUS =====
function smsbusCheckStatus(activationId) {
  return fetch(SMS_API_STATUS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: activationId
    })
  })
  .then(function(res) { 
    if (!res.ok) throw new Error('Status check failed: ' + res.status);
    return res.json(); 
  })
  .then(function(json) {
    var data = json.data || json;
    if (json.code !== undefined && json.code !== 200 && json.code !== 0) {
      console.warn('Status check warning:', json.msg || json.message);
    }
    return data;
  });
}

// ===== CANCEL ACTIVATION =====
function smsbusCancelActivation(activationId) {
  return fetch(SMS_API_CANCEL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: activationId
    })
  })
  .then(function(res) { 
    if (!res.ok) throw new Error('Cancel failed: ' + res.status);
    return res.json(); 
  })
  .then(function(json) {
    if (json.code !== undefined && json.code !== 200 && json.code !== 0) {
      throw new Error(json.msg || json.message || 'Cancel failed');
    }
    return json.data || json;
  });
}

// ===== FETCH PRICES FOR COUNTRY =====
function fetchPricesForCountry(countryCode) {
  var countryId = countryIdMap[countryCode];
  if (!countryId) {
    console.warn('No country ID for:', countryCode);
    return Promise.resolve(null);
  }
  
  // ✅ FIX: Call YOUR backend, not sms-bus.com directly
  return fetch(SMS_API_PRICES + '?country_id=' + countryId)
    .then(function(res) { 
      if (!res.ok) throw new Error('Price fetch failed: ' + res.status);
      return res.json(); 
    })
    .then(function(json) {
      if (json.code !== undefined && json.code !== 200) {
        console.error('Price API error:', json);
        return null;
      }
      
      var rawData = json.data || json;
      var prices = {};
      var rawPrices = {};
      
      // Handle both array and object formats
      var items = Array.isArray(rawData) ? rawData : Object.values(rawData);
      
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var projectCode = item.project_code || item.service_code || item.id;
        rawPrices[projectCode] = item.cost || item.price || 0;
        prices[projectCode] = addProfit(rawPrices[projectCode]);
      }
      
      console.log('Prices for', countryCode, '- Raw:', rawPrices, '- With profit:', prices);
      
      priceCache[countryCode] = prices;
      try { 
        localStorage.setItem('priceCache', JSON.stringify(priceCache)); 
        localStorage.setItem('priceCacheAge', Date.now().toString());
      } catch(e) {}
      
      return prices;
    })
    .catch(function(e) { 
      console.error('Price fetch failed:', countryCode, e); 
      return null; 
    });
}

// ===== GET SMS-BUS COUNTRY ID FROM CODE =====
function getSmsBusCountryId(code) {
  return countryIdMap[code] || null;
}

// ===== GET SMS-BUS SERVICE CODE (some services have different codes on API) =====
var smsBusServiceCodeMap = {
  'wa': 'wa',
  'fb': 'fb',
  'tg': 'tg',
  'ig': 'ig',
  'tk': 'tk',
  'X': 'tw',
  'twitter': 'tw',
  'vk': 'vk',
  'linkedin': 'li',
  'snapchat': 'sc',
  'tinder': 'td',
  'bumble': 'bm',
  'hinge': 'hg',
  'google': 'go',
  'apple': 'ap',
  'microsoft': 'ms',
  'amazon': 'az',
  'steam': 'st',
  'discord': 'dc',
  'uber': 'ub',
  'paypal': 'pp',
  'netflix': 'nf',
  'openai': 'ai',
  'signal': 'sg',
  'line': 'ln',
  'viber': 'vb',
  'telegram': 'tg',
  'whatsapp': 'wa',
  'facebook': 'fb',
  'instagram': 'ig',
  'tiktok': 'tk'
};

function getSmsBusServiceCode(serviceId) {
  var id = (serviceId || '').toLowerCase().trim();
  return smsBusServiceCodeMap[id] || id;
}

// ===== DEBUG: Test API connection =====
window.testSmsBusApi = function() {
  console.log('=== SMS-BUS API TEST ===');
  console.log('Token:', SMS_API_TOKEN ? SMS_API_TOKEN.substring(0, 8) + '...' : 'NOT SET');
  console.log('Base URL:', SMS_API_BASE);
  console.log('Countries in map:', Object.keys(countryIdMap).length);
  console.log('Services count:', services.length);
  
  // Test price fetch for US
  var usId = countryIdMap['us'];
  console.log('US Country ID:', usId);
  
  if (usId) {
    fetchPricesForCountry('us').then(function(prices) {
      console.log('US Prices fetched:', prices ? Object.keys(prices).length + ' services' : 'NULL');
      console.log('Sample prices:', Object.entries(prices || {}).slice(0, 5));
    });
  }
};

window.testBuyNumber = function(serviceCode, countryCode) {
  serviceCode = serviceCode || 'tg';
  countryCode = countryCode || 'us';
  
  var countryId = getSmsBusCountryId(countryCode);
  var apiServiceCode = getSmsBusServiceCode(serviceCode);
  var email = (typeof getUserEmail === 'function') ? getUserEmail() : 'test@test.com';
  
  console.log('=== TEST BUY ===');
  console.log('Service:', serviceCode, '→ API Code:', apiServiceCode);
  console.log('Country:', countryCode, '→ ID:', countryId);
  console.log('Email:', email);
  
  smsbusBuyNumber(countryId, apiServiceCode, email)
    .then(function(data) {
      console.log('Buy result:', data);
      showToast('Test buy successful! ID: ' + (data.id || data.activation_id), 'success');
    })
    .catch(function(err) {
      console.error('Buy error:', err);
      showToast('Test buy failed: ' + err.message, 'error');
    });
};

// =======================================================================
// ===== SMS-BUS RENTAL API =====
// =======================================================================

var SMS_BUS_RENTAL_BASE = 'https://api.sms-bus.com';
var rentalAreasCache = null;
var rentalNumbersCache = null;

/**
 * Get available rental areas with prices
 * Returns: [{ area_code, area_title, unit_price (cents), min_month, total }]
 */
async function fetchRentalAreas() {
  if (rentalAreasCache) return rentalAreasCache;
  
  try {
    var url = SMS_BUS_RENTAL_BASE + '/v1/rent/list/area?token=' + SMS_BUS_API_KEY;
    var response = await fetch(url);
    var data = await response.json();
    
    if (data.code === 200 && data.data) {
      rentalAreasCache = data.data;
      console.log('✅ Loaded', data.data.length, 'rental areas');
      return data.data;
    } else {
      console.error('❌ Rental areas error:', data.message);
      return [];
    }
  } catch (err) {
    console.error('❌ Failed to fetch rental areas:', err.message);
    return [];
  }
}

/**
 * Rent a number
 * @param {string} areaCode - e.g., "US", "CA", "GB"
 * @param {number} months - Rental period in months (minimum 1)
 * @returns {object} - { order_id, mobile_number, dialing_code, area_code, expire_at, keep_at }
 */
async function rentNumber(areaCode, months) {
  var url = SMS_BUS_RENTAL_BASE + '/v1/rent/get/number' +
    '?token=' + SMS_BUS_API_KEY +
    '&area_code=' + areaCode +
    '&time=' + months;
  
  var response = await fetch(url);
  var data = await response.json();
  
  if (data.code === 200 && data.data) {
    return {
      success: true,
      orderId: data.data.order_id,
      phoneNumber: data.data.mobile_number,
      dialingCode: data.data.dialing_code,
      areaCode: data.data.area_code,
      expireAt: data.data.expire_at,
      keepAt: data.data.keep_at
    };
  } else {
    return {
      success: false,
      error: data.message || 'Failed to rent number',
      errorCode: data.code
    };
  }
}

/**
 * Renew a rented number
 */
async function renewRentalNumber(areaCode, mobileNumber, months) {
  var url = SMS_BUS_RENTAL_BASE + '/v1/rent/renew/number' +
    '?token=' + SMS_BUS_API_KEY +
    '&area_code=' + areaCode +
    '&mobile_number=' + mobileNumber +
    '&time=' + months;
  
  var response = await fetch(url);
  var data = await response.json();
  
  if (data.code === 200 && data.data) {
    return {
      success: true,
      orderId: data.data.order_id,
      expireAt: data.data.expire_at,
      keepAt: data.data.keep_at
    };
  } else {
    return {
      success: false,
      error: data.message || 'Failed to renew'
    };
  }
}

/**
 * Cancel a rental order (within 20 min, no SMS received)
 */
async function cancelRentalOrder(orderId) {
  var url = SMS_BUS_RENTAL_BASE + '/v1/rent/cancel/order' +
    '?token=' + SMS_BUS_API_KEY +
    '&order_id=' + orderId;
  
  var response = await fetch(url);
  var data = await response.json();
  
  if (data.code === 200) {
    return { success: true, message: 'Cancel successful' };
  } else {
    return {
      success: false,
      error: data.message || 'Failed to cancel',
      errorCode: data.code
    };
  }
}

/**
 * List rented numbers (active only by default)
 */
async function listRentedNumbers(onlyActive) {
  if (typeof onlyActive === 'undefined') onlyActive = true;
  
  var url = SMS_BUS_RENTAL_BASE + '/v1/rent/list/number' +
    '?token=' + SMS_BUS_API_KEY +
    '&only_active=' + onlyActive +
    '&page_size=100';
  
  var response = await fetch(url);
  var data = await response.json();
  
  if (data.code === 200 && data.data) {
    return data.data.list || [];
  } else {
    console.error('Failed to list rented numbers:', data.message);
    return [];
  }
}

/**
 * Get latest SMS for a rented number
 */
async function getRentalLatestSms(areaCode, mobileNumber) {
  var url = SMS_BUS_RENTAL_BASE + '/v1/rent/get/sms' +
    '?token=' + SMS_BUS_API_KEY +
    '&area_code=' + areaCode +
    '&mobile_number=' + mobileNumber;
  
  var response = await fetch(url);
  var data = await response.json();
  
  if (data.code === 200 && data.data) {
    return {
      success: true,
      content: data.data.content,
      receivedAt: data.data.receive_at
    };
  } else if (data.code === 404) {
    return { success: false, error: 'No SMS yet' };
  } else {
    return { success: false, error: data.message };
  }
}

/**
 * List SMS history for a rented number
 */
async function listRentalSms(areaCode, mobileNumber) {
  var url = SMS_BUS_RENTAL_BASE + '/v1/rent/list/sms' +
    '?token=' + SMS_BUS_API_KEY +
    '&area_code=' + areaCode +
    '&mobile_number=' + mobileNumber +
    '&page_size=50';
  
  var response = await fetch(url);
  var data = await response.json();
  
  if (data.code === 200 && data.data) {
    return data.data.list || [];
  } else {
    return [];
  }
}

/**
 * Convert area_code to country flag
 */
function getAreaFlag(areaCode) {
  var flagMap = {
    'US': '🇺🇸', 'CA': '🇨🇦', 'GB': '🇬🇧', 'UK': '🇬🇧',
    'DE': '🇩🇪', 'FR': '🇫🇷', 'AU': '🇦🇺', 'RU': '🇷🇺',
    'JP': '🇯🇵', 'KR': '🇰🇷', 'IN': '🇮🇳', 'BR': '🇧🇷',
    'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱', 'PL': '🇵🇱',
    'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮',
    'CH': '🇨🇭', 'AT': '🇦🇹', 'BE': '🇧🇪', 'IE': '🇮🇪',
    'PT': '🇵🇹', 'CZ': '🇨🇿', 'RO': '🇷🇴', 'HU': '🇭🇺',
    'UA': '🇺🇦', 'TR': '🇹🇷', 'SA': '🇸🇦', 'AE': '🇦🇪',
    'ID': '🇮🇩', 'MY': '🇲🇾', 'PH': '🇵🇭', 'TH': '🇹🇭',
    'VN': '🇻🇳', 'SG': '🇸🇬', 'MX': '🇲🇽', 'AR': '🇦🇷',
    'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪', 'ZA': '🇿🇦',
    'NG': '🇳🇬', 'KE': '🇰🇪', 'EG': '🇪🇬', 'IL': '🇮🇱'
  };
  return flagMap[areaCode] || '🌍';
}

/**
 * Convert cents to dollars with your profit margin
 */
function rentalPriceWithProfit(cents) {
  var basePrice = cents / 100;
  return addProfit(basePrice);
}

// Make functions globally available
window.fetchRentalAreas = fetchRentalAreas;
window.rentNumber = rentNumber;
window.renewRentalNumber = renewRentalNumber;
window.cancelRentalOrder = cancelRentalOrder;
window.listRentedNumbers = listRentedNumbers;
window.getRentalLatestSms = getRentalLatestSms;
window.listRentalSms = listRentalSms;
window.getAreaFlag = getAreaFlag;
window.rentalPriceWithProfit = rentalPriceWithProfit;
