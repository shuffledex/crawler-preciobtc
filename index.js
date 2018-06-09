var Crawler = require("crawler");
var cron = require('node-cron');
var admin = require('firebase-admin');
var serviceAccount = require('./preciobtc-firebase-adminsdk-nktyd-8c7f1e38eb.json');
var Raven = require('raven');

Raven.config('https://69f18dde66224e53acd47f44e31373ca@sentry.io/1222237').install();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://preciobtc.firebaseio.com'
});

var db = admin.database();
var c = new Crawler();

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function update(site, buy, sell, timestamp) {
    var o = {};
    if (buy == null && sell != null) {
        o = {
            "sell": sell
        }
    } else if (buy != null && sell == null) {
        o = {
            "buy": buy
        }
    } else {
        o = {
          "buy": buy,
          "sell": sell
        }
    }
    o['timestamp'] = timestamp;
    var ref = db.ref("sitios/ARS");
    var hopperRef = ref.child(site);
    hopperRef.update(o, function(error) {
      if (error) {
        Raven.captureException(error, { extra: { key: 'Firebase: Data could not be saved.' } });
      } else {
        //console.log("Data for " + site + " saved successfully.");
      }
    });
}


// cada 15 minutos
cron.schedule('* * * * *', function(){ //*/15 * * * *
    var timestamp = new Date().getTime();
    pushQueue(timestamp)
});

function pushQueue(timestamp) {
    c.queue([{
        uri: 'https://www.ripio.com/api/v1/rates/',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = json.rates.ARS_BUY;
                    var sell = json.rates.ARS_SELL;
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        update("Ripio", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Ripio' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://ventabtc.com/',
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var $ = res.$;
                    var buy = parseFloat($("#price").text());
                    //console.log(buy)
                    update("VentaBTC", buy, 0, timestamp)
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: VentaBTC' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://buenbit.com/getPrices.php',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = json.rates.ARS_BUY;
                    var sell = json.rates.ARS_SELL;
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        update("BuenBit", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: BuenBit' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://www.argenbtc.com/public/cotizacion_js.php',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = json.precio_compra;
                    var sell = json.precio_venta;
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        update("ArgenBTC", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: ArgenBTC' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://www.bitinka.com.ar/pe/bitinka/home',
        headers: {
            Cookie: "cookie_forms=2b66a5e90f805ded6a5987ea6011dc3e; expires=Fri, 08-Jun-2030 00:06:03 GMT; Max-Age=7200; path=/"
        },
        jQuery: false,
        method: "POST",
        form: {'inka_forms':'2b66a5e90f805ded6a5987ea6011dc3e', 'coin':'USD'},
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = parseFloat(json.ARS.compra);
                    var sell = parseFloat(json.ARS.venta);
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        update("Bitinka", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Bitinka' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://api.cryptomkt.com/v1/ticker?market=BTCARS',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = parseFloat(json.data[0].ask);
                    var sell = parseFloat(json.data[0].bid);
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        update("CryptoMKT", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: CryptoMKT' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://api.satoshitango.com/v2/ticker',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = parseFloat(json.data.compra.arsbtc);
                    var sell = parseFloat(json.data.venta.arsbtc);
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        update("SatoshiTango", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: SatoshiTango' } });
                    //onsole.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://saldo.com.ar/',
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var $ = res.$;
                    var buy = parseFloat($('tr:nth-child(4) td:nth-child(2)', '#cotizaciones').text());
                    var sell = parseFloat($('tr:nth-child(4) td:nth-child(3)', '#cotizaciones').text());
                    //console.log(buy, sell)
                    update("Saldo", buy, sell, timestamp)
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Saldo' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://www.buda.com/api/v2/markets/BTC-ARS/ticker',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = parseFloat(json.ticker.min_ask);
                    var sell = parseFloat(json.ticker.max_bid);
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        update("Buda", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Buda' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://localbitcoins.com/ad/210865/purchase-bitcoin-bank-transfer-argentina-argentina',
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var $ = res.$;
                    var buy = ($('#ad_price').text()).replace(",", "").split(" ");
                    buy = parseFloat(buy[0]);
                    //console.log(buy)
                    update("CoinASAP", buy, null, timestamp)
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: CoinASAP purchase' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);
    c.queue([{
        uri: 'https://localbitcoins.com/ad/210871/cash-out-your-bitcoins-bank-transfer-argentina',
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var $ = res.$;
                    var sell = ($('#ad_price').text()).replace(",", "").split(" ");
                    sell = parseFloat(sell[0]);
                    //console.log(sell)
                    update("CoinASAP", null, sell, timestamp)
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: CoinASAP cash out' } });
                    //console.log("Reportar error")
                }
            }
            done();
        }
    }]);
}

c.on('drain',function(){
    //process.exit()
    //console.log("TERMINO COLA")
});