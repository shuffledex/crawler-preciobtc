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
        console.log("Firebase: Data could not be saved for " + site)
      } else {
        console.log("Data for " + site + " saved successfully.");
      }
    });
}

function updateDolar(compra, venta, timestamp) {
    var ref = db.ref("dolar/ARS");
    ref.update({
        compra: compra,
        venta: venta,
        timestamp: timestamp
    }, function(error) {
      if (error) {
        Raven.captureException(error, { extra: { key: 'Firebase: Data could not be saved.' } });
        console.log("Firebase: Data could not be saved for " + site)
      } else {
        console.log("Data for dolar ARS saved successfully.");
      }
    });
}

function updateGlobalMarket(json, name) {
    var ref = db.ref(name);
    ref.update(json, function(error) {
      if (error) {
        Raven.captureException(error, { extra: { key: 'Firebase: Data could not be saved.' } });
        console.log("Firebase: Data could not be saved for " + site)
      } else {
        console.log("Data for " + name + " saved successfully.");
      }
    });
}

// cada 15 minutos
cron.schedule('*/15 * * * *', function(){
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
                        if (sell < buy) {
                            update("Ripio", sell, buy, timestamp)
                        } else {
                            update("Ripio", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Ripio' } });
                    console.log("ERROR Crawler: Ripio")
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
                    console.log("ERROR Crawler: VentaBTC")
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
                        if (sell < buy) {
                            update("BuenBit", sell, buy, timestamp)
                        } else {
                            update("BuenBit", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: BuenBit' } });
                    console.log("ERROR Crawler: BuenBit")
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
                        if (sell < buy) {
                            update("ArgenBTC", sell, buy, timestamp)
                        } else {
                            update("ArgenBTC", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: ArgenBTC' } });
                    console.log("ERROR Crawler: ArgenBTC")
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
                        if (sell < buy) {
                            update("Bitinka", sell, buy, timestamp)
                        } else {
                            update("Bitinka", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Bitinka' } });
                    console.log("ERROR Crawler: bitinka")
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
                        if (sell < buy) {
                            update("CryptoMKT", sell, buy, timestamp)
                        } else {
                            update("CryptoMKT", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: CryptoMKT' } });
                    console.log("ERROR Crawler: CryptoMKT")
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
                        if (sell < buy) {
                            update("SatoshiTango", sell, buy, timestamp)
                        } else {
                            update("SatoshiTango", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: SatoshiTango' } });
                    console.log("ERROR Crawler: SatoshiTango")
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
                    var sell = parseFloat($('tr:nth-child(4) td:nth-child(2)', '#cotizaciones').text());
                    var buy = parseFloat($('tr:nth-child(4) td:nth-child(3)', '#cotizaciones').text());
                    //console.log(buy, sell)
                    if (sell < buy) {
                        update("Saldo", sell, buy, timestamp)
                    } else {
                        update("Saldo", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Saldo' } });
                    console.log("ERROR Crawler: Saldo")
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
                        if (sell < buy) {
                            update("Buda", sell, buy, timestamp)
                        } else {
                            update("Buda", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Buda' } });
                    console.log("ERROR Crawler: Buda")
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
                    console.log("ERROR Crawler: CoinASAP purchase")
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
                    console.log("ERROR Crawler: CoinASAP cash out")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://www.bitstamp.net/api/v2/ticker/btcusd/',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    updateGlobalMarket(json, "bitstamp");
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: bitstamp' } });
                    console.log("ERROR Crawler: bitstamp")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://api.bitfinex.com/v1/pubticker/BTCUSD',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    updateGlobalMarket(json, "bitfinex");
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: bitfinex' } });
                    console.log("ERROR Crawler: bitfinex")
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://www.cronista.com/MercadosOnline/json/getValoresCalculadora.html',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var compra = parseFloat(json[0].Compra);
                    var venta = parseFloat(json[0].Venta);
                    updateDolar(compra, venta, timestamp);
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: cronista' } });
                    console.log("ERROR Crawler: cronista")
                }
            }
            done();
        }
    }]);
}

/*c.on('drain',function(){
    process.exit()
    console.log("TERMINO COLA")
});*/