//====== FIX: CLEAR STALE PRICE CACHE ======
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

// ===== BUY A NUMBER (CORRECTED) =====
function smsbusBuyNumber(countryId, projectId, userEmail) {
  var url = '/api/v2/buy' +
    '?country_id=' + encodeURIComponent(countryId) +
    '&project_id=' + encodeURIComponent(projectId);
  
  if (userEmail) {
    url += '&email=' + encodeURIComponent(userEmail);
  }
  
  console.log('[BUY] Fetching:', url);
  
  return fetch(url, { method: 'GET' })
    .then(function(res) {
      if (!res.ok) {
        return res.text().then(function(text) {
          throw new Error('API Error ' + res.status + ': ' + text.substring(0, 200));
        });
      }
      return res.json();
    })
    .then(function(json) {
      console.log('[BUY] Response:', JSON.stringify(json).substring(0, 300));
      
      if (json.code !== 200) {
        var errorMsg = json.message || 'Unknown error';
        if (json.code === 50002) errorMsg = 'No numbers available. Try a different country.';
        if (json.code === 50201) errorMsg = 'Provider balance too low. Contact support.';
        if (json.code === 401) errorMsg = 'Invalid API key.';
        throw new Error(errorMsg);
      }
      
      if (!json.data || !json.data.request_id || !json.data.number) {
        throw new Error('Invalid response: missing request_id or number');
      }
      
      return {
        id: String(json.data.request_id),
        phone: json.data.number
      };
    });
}

// ===== CHECK SMS STATUS (CORRECTED) =====
function smsbusCheckStatus(requestId) {
  var url = '/api/v2/status?request_id=' + encodeURIComponent(requestId);
  
  return fetch(url, { method: 'GET' })
    .then(function(res) {
      if (!res.ok) throw new Error('Status check failed: ' + res.status);
      return res.json();
    })
    .then(function(json) {
      var data = json.data || json;
      
      // Success - got SMS code
      if (json.code === 200 && data && typeof data === 'string' && data.length > 0) {
        return {
          status: 'received',
          sms_code: data,
          sms_text: 'Your verification code is ' + data
        };
      }
      
      // Still waiting
      if (json.code === 50101) {
        return { status: 'waiting', waiting: true };
      }
      
      // Expired
      if (json.code === 50102) {
        return { status: 'expired', waiting: false };
      }
      
      // Other - still waiting
      return { status: 'waiting', waiting: true };
    });
}

// ===== CANCEL ACTIVATION (CORRECTED) =====
function smsbusCancelActivation(requestId) {
  var url = '/api/v2/cancel?request_id=' + encodeURIComponent(requestId);
  
  return fetch(url, { method: 'GET' })
    .then(function(res) {
      if (!res.ok) throw new Error('Cancel failed: ' + res.status);
      return res.json();
    })
    .then(function(json) {
      if (json.code === 200) {
        return { success: true };
      }
      throw new Error(json.message || 'Cancel failed');
    });
}

// ===== FETCH PRICES FOR COUNTRY =====
// ===== ADD THIS AFTER priceCache declaration =====
var providerServiceMap = null; // Will hold: { "1": "tg", "2": "pp", ... }
var serviceMapLoading = false;
var serviceMapPromise = null;

// Build mapping from provider's numeric ID to service code
async function buildProviderServiceMap() {
  if (providerServiceMap) return providerServiceMap;
  if (serviceMapLoading) return serviceMapPromise;
  
  serviceMapLoading = true;
  serviceMapPromise = fetch('/api/v2/services')
    .then(function(res) {
      if (!res.ok) throw new Error('Failed to fetch services');
      return res.json();
    })
    .then(function(json) {
      var map = {};
      var rawData = json.data || json;
      
      if (typeof rawData === 'object' && rawData !== null) {
        for (var numericId in rawData) {
          if (rawData.hasOwnProperty(numericId)) {
            var service = rawData[numericId];
            var code = service.code || '';
            if (code && numericId) {
              map[numericId] = code.toLowerCase();
            }
          }
        }
      }
      
      for (var id in knownServiceIdMap) {
        if (!map[id]) {
          map[id] = knownServiceIdMap[id];
        }
      }
      
      providerServiceMap = map;
      console.log('✅ Built provider service map:', Object.keys(map).length, 'services');
      return map;
    })
    .catch(function(err) {
     console.warn('Failed to build service map, using hardcoded:', err ? err.message : 'Unknown error');
     providerServiceMap = knownServiceIdMap;
     return knownServiceIdMap;
    })
    .finally(function() {
      serviceMapLoading = false;
    });
  
  return serviceMapPromise;
}

// Call this on page load
buildProviderServiceMap();

// ===== REPLACE fetchPricesForCountry WITH THIS VERSION =====
function fetchPricesForCountry(countryCode) {
  var countryId = countryIdMap[countryCode];
  if (!countryId) {
    console.warn('No country ID for:', countryCode);
    return Promise.resolve(null);
  }
  
  // First ensure we have the service map
  return buildProviderServiceMap().then(function(serviceMap) {
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
        
        if (typeof rawData === 'object' && rawData !== null) {
          // Provider returns: {"1": {"cost": 15.00}, "2": {"cost": 10.50}, ...}
          // We need to map numeric IDs to service codes
          
          for (var numericId in rawData) {
            if (rawData.hasOwnProperty(numericId)) {
              var cost = rawData[numericId].cost || rawData[numericId].price || 0;
              
              // Map numeric ID to service code using the dynamic map
              var serviceCode = serviceMap[numericId];
              
              if (serviceCode) {
                // Store with the service code as key
                prices[serviceCode] = addProfit(cost);
              }
              
              // Always store with numeric ID too for direct lookups
              prices[numericId] = addProfit(cost);
            }
          }
        }
        
        // Add fallback prices for services not in API response
        // (services that exist in your list but not in provider's price list)
        services.forEach(function(service) {
          if (service.price && !prices[service.id]) {
            var country = countries.find(function(c) { return c.code === countryCode; });
            var multiplier = country ? (country.basePrice / 0.50) : 1;
            prices[service.id] = addProfit(service.price * multiplier);
          }
        });
        
        priceCache[countryCode] = prices;
        try { 
          localStorage.setItem('priceCache', JSON.stringify(priceCache)); 
          localStorage.setItem('priceCacheAge', Date.now().toString());
        } catch(e) {}
        
        return prices;
      })
      .catch(function(e) { 
        console.error('Price fetch failed:', countryCode, e); 
        // Return fallback prices from cache or hardcoded
        var fallbackPrices = priceCache[countryCode] || {};
        services.forEach(function(service) {
          if (!fallbackPrices[service.id] && service.price) {
            var country = countries.find(function(c) { return c.code === countryCode; });
            var multiplier = country ? (country.basePrice / 0.50) : 1;
            fallbackPrices[service.id] = addProfit(service.price * multiplier);
          }
        });
        return fallbackPrices;
      });
  });
}


// ===== GET SMS-BUS SERVICE CODE (some services have different codes on API) =====
// ===== GET SMS-BUS SERVICE CODE (maps your service IDs to provider's actual codes) =====
var smsBusServiceCodeMap = {
  // ===== SOCIAL MEDIA (verified from provider API) =====
  'wa': 'wa',              // WhatsApp
  'fb': 'fb',              // Facebook
  'tg': 'tg',              // Telegram
  'ig': 'ig',              // Instagram+Threads
  'tk': 'tk',              // TikTok/Douyin
  'vk': 'vk',              // VKontakte
  'X': 'tw',               // Twitter/X (your ID is 'X', provider code is 'tw')
  'twitter': 'tw',          // Twitter/X
  'linkedin': 'linkedin',   // LinkedIn
  'snapchat': 'snapchat',   // Snapchat
  'tinder': 'tinder',       // Tinder
  'bumble': 'bumble',       // Bumble
  'hinge': 'hinge',         // Hinge
  'okcupid': 'okcupid',     // OkCupid
  'match': 'match',         // Match
  'zoosk': 'zoosk',         // Zoosk
  'happn': 'happn',         // Happn
  'badoo': 'badoo',         // Badoo
  'scruff': 'scruff',       // Scruff
  'feeld': 'feeld',         // Feeld
  'her': 'her',             // Her
  'pof': 'pof',             // POF-Plenty of Fish
  'signal': 'signal',       // Signal
  'discord': 'discord',     // Discord ← WAS MISSING!
  'vb': 'vb',              // Viber
  'kakao': 'kakao',        // KakaoTalk
  'line': 'line',          // Line
  'sk': 'sk',              // Skype
  'icq': 'icq',            // ICQ
  'botim': 'botim',         // Botim
  'zalo': 'zalo',          // Zalo
  'kwai': 'kwai',          // Kwai
  'azar': 'azar',          // Azar
  'tantan': 'tantan',       // Tantan
  'yalla': 'yalla',        // Yalla
  'groupme': 'groupme',     // GroupMe
  'twitch': 'twitch',      // Twitch
  'tiktok': 'tk',          // TikTok (alias)
  'whatsapp': 'wa',        // WhatsApp (alias)
  'facebook': 'fb',        // Facebook (alias)
  'telegram': 'tg',        // Telegram (alias)
  'instagram': 'ig',       // Instagram (alias)
  
  // ===== MESSAGING =====
  'google': 'google',      // Google, Youtube, Gmail ← FIXED! was 'go'
  'apple': 'apple',        // Apple
  'microsoft': 'microsoft', // Microsoft
  'yahoo': 'yahoo',        // Yahoo
  'aol': 'aol',            // AOL
  'gmx': 'gmx',            // GMX
  'outlook': 'microsoft',   // Outlook (uses same as Microsoft)
  'gv': 'gv',              // Google Voice
  
  // ===== E-COMMERCE =====
  'fiverr': 'fiverr',      // Fiverr
  'ub': 'ub',              // Uber
  'steam': 'steam',        // Steam
  'aliexpress': 'aliexpress', // AliExpress
  'ebay': 'ebay',          // eBay
  'shopee': 'shopee',      // Shopee
  'lazada': 'lazada',      // Lazada
  'temu': 'temu',          // Temu
  'wish': 'wish',          // Wish
  'amazon': 'amz',         // Amazon ← FIXED! was 'az'
  'shein': 'shein',        // Shein
  'zara': 'zara',          // Zara
  'nike': 'nike',          // Nike
  'walmart': 'walmart',     // Walmart
  'etsy': 'etsy',          // Etsy
  'depop': 'depop',        // Depop
  'vinted': 'vinted',      // Vinted
  'poshmark': 'psm',      // Poshmark
  'flipkart': 'flipkart',   // Flipkart
  'swiggy': 'swiggy',      // Swiggy
  'meituan': 'meituan',    // MeiTuan
  'carousell': 'carousell', // Carousell
  'wallapop': 'wallapop',   // Wallapop
  'ozon': 'ozon',          // Ozon
  'wildberries': 'wildberries', // Wildberries
  'tdyol': 'tdyol',        // Trendyol
  
  // ===== GAMING =====
  'roblox': 'roblox',      // Roblox
  'pubg': 'pubg',          // PUBG MOBILE
  'bz': 'bz',              // Blizzard / Battle
  'nc': 'nc',              // NCSOFT
  'steam': 'steam',         // Steam (duplicate removed)
  'faceit': 'faceit',      // FACEIT
  
  // ===== FINANCE & CRYPTO =====
  'coinbase': 'coinbase',   // Coinbase
  'venmo': 'venmo',        // Venmo
  'cash': 'cash',          // Cash App
  'binance': 'bn',         // Binance ← FIXED! was 'binance'
  'bybit': 'abn',          // Bybit ← FIXED! was 'bybit'
  'okx': 'okx',            // OKX
  'bitget': 'ahq',         // Bitget ← FIXED! was 'bitget'
  'mexc': 'bii',           // MEXC ← FIXED!
  'wise': 'wise',          // Wise
  'skrill': 'skrill',      // Skrill
  'uphold': 'uphold',      // Uphold
  'paysafe': 'paysafe',    // PaysafeCard
  'papara': 'papara',      // Papara
  'tradingview': 'gc',     // Tradingview ← FIXED! was 'tradingview'
  'nvidia': 'nvd',         // Nvidia ← FIXED! was 'nvidia'
  'affirm': 'af',          // Affirm
  'chime': 'chime',        // Chime
  'bofa': 'bofa',          // Bank of America
  'go2bank': 'go2bank',    // GO2bank
  'creditkarma': 'creditkarma', // Credit Karma (no provider code, will pass through)
  'sber': 'sber',          // Sber
  'caixa': 'caixa',        // CAIXA
  'monese': 'monese',      // Monese
  'paypay': 'paypay',      // PayPay
  'picpay': 'picpay',      // Picpay
  
  // ===== FOOD & DELIVERY =====
  'foodpanda': 'foodpanda', // Foodpanda
  'glovo': 'glovo',        // Glovo
  'wolt': 'wolt',          // Wolt
  'grab': 'grab',          // Grab
  'bolt': 'bolt',          // Bolt
  'lyft': 'lyft',          // Lyft
  'careem': 'careem',      // Careem
  'talabat': 'ani',        // Talabat ← FIXED!
  'getir': 'getir',        // Getir
  'justeat': 'justeat',    // Just Eat
  
  // ===== OTHER SERVICES =====
  'nf': 'nf',              // Netflix
  'disneyplus': 'disneyplus', // Disney+
  'openai': 'openai',      // OpenAI/ChatGPT
  'claude': 'claude',      // Claude
  'dseek': 'dseek',        // DeepSeek
  'vercel': 'vercel',      // Vercel
  'airbnb': 'airbnb',      // Airbnb
  'booking': 'booking',    // Booking.com (if exists)
  'truecaller': 'truecaller', // Truecaller
  'authy': 'authy',        // Authy
  'twilio': 'twilio',      // Twilio
  'zoho': 'zoho',          // Zoho
  'nike': 'nike',          // Nike
  'footlocker': 'footlocker', // Foot Locker
  'razer': 'acm',          // Razer ← FIXED!
  'ubisoft': 'ahb',        // Ubisoft ← FIXED!
  
  // ===== SPECIAL =====
  'any-other': 'any',
  'any': 'any',
};

// ===== REVERSE MAP: Provider Numeric ID → Your Service Code =====
// Provider returns prices with numeric IDs as keys, we need to map back
var providerIdToServiceCode = {};

// Build reverse map from provider's services list
// Provider: {"1": {"id": 1, "title": "Telegram", "code": "tg"}, ...}
// We want: {"1": "tg", "2": "pp", "3": "tk", ...}
function buildReverseServiceMap(providerServicesData) {
  providerIdToServiceCode = {};
  if (!providerServicesData) return;
  
  var items = Array.isArray(providerServicesData) 
    ? providerServicesData 
    : Object.values(providerServicesData);
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var numericId = String(item.id);
    var code = item.code || '';
    if (numericId && code) {
      providerIdToServiceCode[numericId] = code;
    }
  }
  
  console.log('Built reverse service map:', Object.keys(providerIdToServiceCode).length, 'services');
}
// Also manually add known mappings (backup in case API fetch fails)
var knownServiceIdMap = {
  '1': 'tg',      // Telegram
  '2': 'pp',      // PayPal  
  '3': 'tk',      // TikTok
  '4': 'af',      // Affirm
  '5': 'wa',      // WhatsApp
  '6': 'vb',      // Viber
  '7': 'kakao',   // KakaoTalk
  '8': 'google',  // Google/Youtube/Gmail
  '9': 'bz',      // Blizzard
  '10': 'hinge',  // Hinge
  '11': 'microsoft', // Microsoft
  '13': 'ub',     // Uber
  '14': 'in',     // India (service)
  '17': 'yahoo',  // Yahoo
  '19': 'coinbase', // Coinbase
  '20': 'vinted', // Vinted
  '21': 'ebay',   // eBay
  '25': 'gb',     // UK (country?)
  '31': 'nc',     // NCSOFT
  '34': 'aol',    // AOL
  '47': 'gamemail', // GameMail
  '48': 'imo',    // Imo
  '52': 'openai', // OpenAI
  '55': 'match',  // Match
  '57': 'partying', // Partying
  '60': 'bumble', // Bumble
  '63': 'cash',   // Cash App
  '66': 'rumble', // Rumble
  '69': 'nz',     // New Zealand
  '73': 'faceit', // FACEIT
  '74': 'boo',    // Boo
  '75': 'google_developer', // Google Developer
  '77': 'luckyland', // LuckyLand
  '78': 'pof',    // POF
  '80': '51ca',   // 51.ca
  '81': 'line',   // Line
  '82': 'tinder', // Tinder
  '83': 'fb',     // Facebook
  '84': 'vk',     // VKontakte
  '85': 'tw',     // Twitter
  '87': 'nike',   // Nike
  '88': 'amz',    // Amazon
  '89': 'ig',     // Instagram
  '90': 'nf',     // Netflix
  '91': 'lazada', // Lazada
  '92': 'shopee', // Shopee
  '94': 'discord', // Discord
  '95': 'bofa',   // Bank of America
  '96': 'psm',    // Poshmark
  '97': 'cmb',    // Coffee Meets Bagel
  '98': 'venmo',  // Venmo
  '99': 'inboxdollars', // InboxDollars
  '105': 'apple', // Apple
  '106': 'tradesy', // Tradesy
  '107': 'okx',   // OKX
  '108': 'foodpanda', // Foodpanda
  '109': 'happn', // Happn
  '110': 'wild',  // Wild
  '111': 'okcupid', // OkCupid
  '112': 'wish',  // Wish
  '113': 'tamtam', // TamTam
  '115': 'snapchat', // Snapchat
  '117': 'fiverr', // Fiverr
  '118': 'depop', // Depop
  '120': 'skrill', // Skrill
  '122': 'oldubil', // OlduBil
  '124': 'weverse', // WeverseShop
  '125': 'wallapop', // Wallapop
  '126': 'ozon',   // Ozon
  '127': 'tmaster', // Ticketmaster
  '129': 'etsy',   // Etsy
  '131': 'claude', // Claude
  '132': 'winzo',  // WinZO
  '133': 'grindr', // Grindr
  '134': 'botim',  // Botim
  '135': 'mchat',  // MChat
  '136': 'sk',     // Skype
  '137': 'offerup', // OfferUp
  '138': 'zepto',  // Zepto
  '139': 'cleartrip', // Cleartrip
  '140': 'unacademy', // Unacademy
  '141': 'paddypower', // Paddypower
  '143': 'linode', // Linode
  '144': 'redbubble', // Redbubble
  '145': 'careem', // Careem
  '146': 'foodora', // Foodora
  '147': 'signal', // Signal
  '148': 'walmart', // Walmart
  '149': 'sheerid', // Sheerid
  '150': 'zalo',   // Zalo
  '151': 'friendtech', // Friendtech
  '152': 'steam',  // Steam
  '153': 'feeld',  // Feeld
  '154': 'vercel', // Vercel
  '155': 'azar',   // Azar
  '156': 'airtime', // Airtime
  '157': 'wolt',   // Wolt
  '158': 'temu',   // Temu
  '159': 'ipsosisay', // Ipsos iSay
  '160': 'gameflip', // Gameflip
  '161': 'pubg',   // PUBG
  '162': 'footlocker', // Foot Locker
  '163': 'gv',     // Google Voice
  '164': 'lebon',  // Leboncoin
  '165': 'yemeksepeti', // Yemeksepeti
  '166': 'bereal', // BeReal
  '167': 'glovo',  // Glovo
  '168': 'naver',  // Naver
  '169': 'bolt',   // Bolt
  '170': 'blablacar', // BlaBlaCar
  '171': 'dosi',   // DOSI
  '173': 'kwai',   // Kwai
  '174': 'crowdtap', // Crowdtap
  '175': 'meituan', // MeiTuan
  '176': 'truecaller', // Truecaller
  '177': 'sparkdriver', // Sparkdriver
  '178': 'lyft',   // Lyft
  '179': 'shein',  // Shein
  '180': 'flip',   // Flip
  '181': 'airbnb', // Airbnb
  '182': 'jd',     // JD
  '183': 'bd',     // Bangladesh?
  '184': 'zoho',   // Zoho
  '185': 'getir',  // Getir
  '186': 'tantan', // Tantan
  '187': 'taobao', // TaoBao
  '188': 'uphold', // Uphold
  '189': 'twilio', // Twilio
  '190': 'authy',  // Authy
  '191': 'sweatcoin', // Sweatcoin
  '192': 'ipfoxy', // IPFoxy
  '193': 'ctrip',  // Ctrip
  '194': 'yalla',  // Yalla
  '195': 'icq',    // ICQ
  '196': 'linkedin', // LinkedIn
  '197': 'lemon8', // Lemon8
  '198': 'hopi',   // Hopi
  '199': 'sss',    // Samsung Shop
  '200': 'playa',  // PlayerAuctions
  '201': 'tdyol',  // Trendyol
  '202': 'papara', // Papara
  '203': 'zadarma', // Zadarma
  '204': 'wildberries', // Wildberries
  '205': 'yandex', // Yandex
  '206': 'badoo',  // Badoo
  '207': 'pingpong', // PingPong
  '208': 'gmx',    // GMX
  '209': 'ourtime', // Ourtime
  '210': 'roblox', // Roblox
  '211': 'civo',   // Civo
  '212': 'baidu',  // Baidu
  '213': 'sber',   // Sber
  '214': 'picpay', // Picpay
  '215': 'x5id',   // X5ID
  '216': 'mts cashback', // MTS CashBack
  '217': '7-eleven', // 7-Eleven
  '218': 'weibo',  // Weibo
  '219': 'grab',   // Grab
  '220': '99app',  // 99app
  '221': 'bingo plus', // Bingo Plus
  '222': 'caixa',  // CAIXA
  '223': 'indomaret', // Indomaret
  '224': 'olx',    // OLX
  '225': 'chime',  // Chime
  '226': 'hh.ru',  // hh.ru
  '227': 'ebay kleinanzeigen', // eBay Kleinanzeigen
  '228': 'outlier', // Outlier
  '229': 'irctc',  // IRCTC
  '230': 'zoosk',  // Zoosk
  '231': 'betfair', // Betfair
  '232': 'aarp',   // AARP
  '233': 'groupme', // GroupMe
  '234': 'go2bank', // GO2bank
  '235': 'appen',  // Appen
  '236': 'superbet', // Superbet
  '237': 'wise',   // Wise
  '238': 'tixcraft', // Tixcraft
  '239': 'xianyu', // Xianyu
  '240': 'eneba',  // Eneba
  '241': 'ininal', // Ininal
  '243': 'paypay', // PayPay
  '244': 'taito',  // Taito
  '245': 'vandlecard', // VANDLE CARD
  '246': 'paidy',  // Paidy
  '247': 'kyash',  // Kyash
  '248': 'naka',   // NAKA Pay
  '249': 'qoo10',  // Qoo10
  '250': 'bovada', // Bovada
  '251': 'povo',   // Povo
  '252': '8casino', // 888 Casino
  '253': 'paysafe', // PaysafeCard
  '254': 'piccoma', // Piccoma
  '255': 'greggs', // Greggs
  '256': 'twitch', // Twitch
  '257': 'oneforma', // Oneforma
  '258': 'rebtel', // Rebtel
  '259': 'subito', // Subito
  '261': 'dseek',  // DeepSeek
  '262': 'tdyol2', // Trendyol (duplicate code?)
  '263': 'siliflow', // SiliconFlow
  '264': 'scruff', // Scruff
  '265': 'betano', // Betano
  '266': 'lemfi',  // Lemfi
  '267': 'dream11', // Dream11
  '268': 'warpcast', // Warpcast
  '269': 'g2g',    // G2G
  '270': 'emag',   // EMAG
  '271': 'craigslist', // Craigslist
  '272': 'tango',  // Tango
  '273': 'rummy',  // Rummy Circle
  '274': 'vision', // Vision11
  '275': 'aliyun', // Alibaba Cloud
  '276': 'ali',    // Alibaba
  '277': 'freelancehunt', // Freelancehunt
  '278': 'justeat', // Just Eat
  '279': 'zara',   // Zara
  '280': 'yikyak', // Yikyak
  '281': 'truthsocial', // Truthsocial
  '282': 'bilibili', // Bilibili
  '283': 'creditkarma', // Credit Karma
  '284': 'myntra', // Myntra
  '285': 'jiomart', // JioMart
  '286': 'whatnot', // Whatnot
  '287': 'bn',     // Binance
  '288': 'abn',    // Bybit
  '289': 'bii',    // MEXC
  '290': 'ahq',    // Bitget
  '291': '1x',     // 1xbet
  '292': 'bst',    // AdmiralBet
  '293': 'byi',    // Ambassadoribet
  '294': 'ie',     // Bet365 (provider code)
  '295': 'agl',    // Betano (provider code)
  '296': 'bmj',    // Betflag
  '297': 'betinin', // Betinin
  '298': 'bdd',    // BetMen
};

// ===== REVERSE MAP: Service Code → Numeric ID =====
// SMS-Bus expects numeric IDs, not string codes like 'fb' instead of 'fb'

var serviceCodeToNumericId = {};

// Build reverse map automatically from knownServiceIdMap and smsBusServiceCodeMap
(function() {
  // 1. From knownServiceIdMap (numeric ID -> string code)
  for (var numericId in knownServiceIdMap) {
    if (knownServiceIdMap.hasOwnProperty(numericId)) {
      var strCode = knownServiceIdMap[numericId];
      if (!serviceCodeToNumericId[strCode]) {
        serviceCodeToNumericId[strCode] = numericId;
      }
    }
  }
  
  // 2. From smsBusServiceCodeMap (your internal ID -> provider string code)
  for (var internalId in smsBusServiceCodeMap) {
    if (smsBusServiceCodeMap.hasOwnProperty(internalId)) {
      var providerStrCode = smsBusServiceCodeMap[internalId];
      // Find the numeric ID for this provider string code
      for (var numId in knownServiceIdMap) {
        if (knownServiceIdMap[numId] === providerStrCode) {
          if (!serviceCodeToNumericId[internalId]) {
            serviceCodeToNumericId[internalId] = numId;
          }
        }
      }
    }
  }
  
  console.log('✅ Built service code -> numeric ID map:', Object.keys(serviceCodeToNumericId).length, 'services');
})();

window.serviceCodeToNumericId = serviceCodeToNumericId;

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
      // FIX: Changed from `text` to `data` to prevent ReferenceError
      console.log('Buy response:', JSON.stringify(data).substring(0, 200));
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
    // Use backend proxy instead of calling sms-bus.com directly
    var url = '/api/v2/rent/areas';
    console.log('[RENT] Fetching areas from backend...');
    
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
  // Use backend proxy instead of calling sms-bus.com directly
  var url = '/api/v2/rent/get' +
    '?area_code=' + areaCode +
    '&time=' + months;
  
  console.log('[RENT] Renting from backend:', url);
  
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
  var url = '/api/v2/rent/renew' +
    '?area_code=' + areaCode +
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
  var url = '/api/v2/rent/cancel' +
    '?order_id=' + orderId;
  
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
  
  var url = '/api/rentals/' + ((typeof getUserEmail === 'function') ? getUserEmail() : '');
  
  // This already uses backend, no change needed except removing direct API call fallback
  var response = await fetch(url);
  var data = await response.json();
  
  if (Array.isArray(data)) {
    return data;
  } else {
    console.error('Failed to list rented numbers');
    return [];
  }
}

/**
 * Get latest SMS for a rented number
 */
async function getRentalLatestSms(areaCode, mobileNumber) {
  var url = '/api/v2/rent/sms' +
    '?area_code=' + areaCode +
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
  var url = '/api/rental/' + ((typeof getUserEmail === 'function') ? getUserEmail() : '') + '/sms/' + areaCode + '/' + mobileNumber;
  
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

// ===== GET SMS-BUS COUNTRY ID (maps your country codes to provider's numeric IDs) =====
function getSmsBusCountryId(countryCode) {
  var code = (countryCode || '').toLowerCase().trim();
  
  // Direct lookup in the map
  if (countryIdMap[code]) return countryIdMap[code];
  
  // Try with common variations
  var variations = [
    code,
    code.replace(/[^a-z]/g, ''),
    code.toUpperCase(),
  ];
  
  for (var i = 0; i < variations.length; i++) {
    if (countryIdMap[variations[i]]) return countryIdMap[variations[i]];
  }
  
  // Not found
  console.warn('No SMS-Bus country ID for:', countryCode);
  return null;
}

// ===== GET SMS-BUS SERVICE CODE (FIXED to return numeric ID) =====
function getSmsBusServiceCode(serviceId) {
  var id = (serviceId || '').toLowerCase().trim();
  
  // 1. First check if we have a direct numeric mapping for this exact ID
  if (serviceCodeToNumericId[id]) {
    return serviceCodeToNumericId[id];
  }
  
  // 2. Clean the ID (remove spaces, special chars) and try again
  var clean = id.replace(/[^a-z0-9]/g, '');
  if (serviceCodeToNumericId[clean]) {
    return serviceCodeToNumericId[clean];
  }
  
  // 3. Fallback: Map to provider string code, then look up numeric ID for that
  var providerCode = smsBusServiceCodeMap[id] || smsBusServiceCodeMap[clean];
  if (providerCode && serviceCodeToNumericId[providerCode]) {
    return serviceCodeToNumericId[providerCode];
  }
  
  // 4. Final fallback: return the original ID and let API try (will likely fail but doesn't crash)
  console.warn('No numeric ID found for service:', id, '- passing raw code to API');
  return id;
}

// ===== EXPOSE TO WINDOW FOR OTHER SCRIPTS =====
window.getSmsBusCountryId = getSmsBusCountryId;
window.getSmsBusServiceCode = getSmsBusServiceCode;
window.countryIdMap = countryIdMap;
window.providerServiceMap = null; // Will be set by buildProviderServiceMap
window.knownServiceIdMap = knownServiceIdMap;
window.fetchPricesForCountry = fetchPricesForCountry;
window.buildProviderServiceMap = buildProviderServiceMap;
window.smsBusServiceCodeMap = smsBusServiceCodeMap;