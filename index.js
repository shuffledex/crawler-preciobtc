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

function update(country, site, buy, sell, timestamp) {
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
    var ref = db.ref("sitios/" + country);
    var hopperRef = ref.child(site);
    hopperRef.update(o, function(error) {
      if (error) {
        Raven.captureException(error, { extra: { key: 'Firebase: Data could not be saved.' } });
      } else {
        //console.log("Data for " + site + " saved successfully.");
      }
    });
}

function updateDolar(country, compra, venta, timestamp) {
    var ref = db.ref("dolar/" + country);
    ref.update({
        compra: compra,
        venta: venta,
        timestamp: timestamp
    }, function(error) {
      if (error) {
        Raven.captureException(error, { extra: { key: 'Firebase: Data could not be saved.' } });
      } else {
        //console.log("Data for dolar ARS saved successfully.");
      }
    });
}

function updateGlobalMarket(json, name) {
    var ref = db.ref(name);
    ref.update(json, function(error) {
      if (error) {
        Raven.captureException(error, { extra: { key: 'Firebase: Data could not be saved.' } });
      } else {
        //console.log("Data for " + name + " saved successfully.");
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
                        if (sell > buy) {
                            update("ARS", "Ripio", sell, buy, timestamp)
                        } else {
                            update("ARS", "Ripio", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Ripio' } });
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
                    update("ARS", "VentaBTC", buy, 0, timestamp)
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: VentaBTC' } });
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
                        if (sell > buy) {
                            update("ARS", "BuenBit", sell, buy, timestamp)
                        } else {
                            update("ARS", "BuenBit", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: BuenBit' } });
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
                        if (sell > buy) {
                            update("ARS", "ArgenBTC", sell, buy, timestamp)
                        } else {
                            update("ARS", "ArgenBTC", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: ArgenBTC' } });
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://www.bitinka.com.ar/pe/bitinka/home',
        headers: {
            Host: "www.bitinka.com",
            Origin: "https://www.bitinka.com",
            Pragma: "no-cache",
            Referer: "https://www.bitinka.com/pe/bitinka/home",
            ContentType: "application/x-www-form-urlencoded; charset=UTF-8",
            Cookie: "cookie_forms=8d53e2553252430f17cdc169cbfaf1d2; expires=Fri, 08-Jun-2030 00:06:03 GMT; Max-Age=7200; path=/"
        },
        jQuery: false,
        method: "POST",
        form: {'inka_forms':'8d53e2553252430f17cdc169cbfaf1d2', 'coin':'USD'},
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = parseFloat(json.ARS.compra);
                    var sell = parseFloat(json.ARS.venta);

                    var buy_cl = parseFloat(json.CLP.compra);
                    var sell_cl = parseFloat(json.CLP.venta);

                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        if (sell > buy) {
                            update("ARS", "Bitinka", sell, buy, timestamp)
                        } else {
                            update("ARS", "Bitinka", buy, sell, timestamp)
                        }
                    }

                    if(isNumber(buy_cl) && isNumber(sell_cl)) {
                        //console.log(buy, sell);
                        if (sell_cl > buy_cl) {
                            update("CL", "Bitinka", sell_cl, buy_cl, timestamp)
                        } else {
                            update("CL", "Bitinka", buy_cl, sell_cl, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Bitinka' } });
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
                        if (sell > buy) {
                            update("ARS", "CryptoMKT", sell, buy, timestamp)
                        } else {
                            update("ARS", "CryptoMKT", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: CryptoMKT' } });
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://api.cryptomkt.com/v1/ticker?market=BTCCLP',
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
                        if (sell > buy) {
                            update("CL", "CryptoMKT", sell, buy, timestamp)
                        } else {
                            update("CL", "CryptoMKT", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: CryptoMKT' } });
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
                        if (sell > buy) {
                            update("ARS", "SatoshiTango", sell, buy, timestamp)
                        } else {
                            update("ARS", "SatoshiTango", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: SatoshiTango' } });
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
                    if (sell > buy) {
                        update("ARS", "Saldo", sell, buy, timestamp)
                    } else {
                        update("ARS", "Saldo", buy, sell, timestamp)
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Saldo' } });
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
                    var sell = parseFloat(json.ticker.last_price);
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        if (sell > buy) {
                            update("ARS", "Buda", sell, buy, timestamp)
                        } else {
                            update("ARS", "Buda", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Buda' } });
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://www.buda.com/api/v2/markets/BTC-CLP/ticker',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = parseFloat(json.ticker.min_ask);
                    var sell = parseFloat(json.ticker.last_price);
                    if(isNumber(buy) && isNumber(sell)) {
                        //console.log(buy, sell);
                        if (sell > buy) {
                            update("CL", "Buda", sell, buy, timestamp)
                        } else {
                            update("CL", "Buda", buy, sell, timestamp)
                        }
                    }
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Buda' } });
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'http://www.qubit.com.ar/c_value',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var buy = parseFloat(json.BTC[2]);
                    //console.log(buy)
                    update("ARS", "Qubit", buy, 0, timestamp)
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: Qubit' } });
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
                    updateDolar("ARS", compra, venta, timestamp);
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: cronista' } });
                }
            }
            done();
        }
    }]);

    c.queue([{
        uri: 'https://www.valor-dolar.cl/currencies_rates.json',
        jQuery: false,
        callback: function (error, res, done) {
            if(error){
                console.log(error);
            }else{
                try {
                    var json = JSON.parse(res.body);
                    var compra = parseFloat(json.currencies_alternatives.cl_buy);
                    var venta = parseFloat(json.currencies_alternatives.cl_sell);
                    updateDolar("CL", compra, venta, timestamp);
                } catch(err) {
                    Raven.captureException(err, { extra: { key: 'Crawler: valor-dolar.cl' } });
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