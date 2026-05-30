require('dotenv').config();
var TOKEN = process.env.SMS_API_KEY || 'd4a7951968ed4e59a647a0ac1d1af637';
var URLS = ['https://api.sms-bus.com', 'https://sms-bus.com'];
var PATHS = ['/v1/rent/list/area', '/v1/rent/get/areas', '/v1/rent/areas', '/v2/rent/list/area', '/api/control/list/rent_areas'];

async function test() {
  for (var i = 0; i < URLS.length; i++) {
    console.log('\n=== BASE: ' + URLS[i] + ' ===');
    try {
      var r = await fetch(URLS[i] + '/api/control/list/countries?token=' + TOKEN, {signal: AbortSignal.timeout(5000});
      var d = await r.json();
      console.log('Base OK:', d.code === 200 ? 'YES' : 'NO');
      if (d.code !== 200) continue;
      for (var j = 0; j < PATHS.length; j++) {
        try {
          var url = URLS[i] + PATHS[j];
          var res = await fetch(url, {signal: AbortSignal.timeout(5000});
          var txt = await res.text();
          var code = txt.indexOf('"code":200') !== -1 ? '200' : res.status;
          var icon = code === '200' ? 'OK' : res.status;
          console.log(icon, PATHS[j], '-', txt.substring(0, 150));
        } catch(e) {
          console.log('ERR', PATHS[j], '-', e.message.substring(0, 60));
        }
      }
    } catch(e) { console.log('FAIL', URLS[i], e.message.substring(0, 60)); }
  }
}
test();
