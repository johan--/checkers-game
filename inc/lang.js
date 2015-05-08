var moment = require("moment");

var getLang = function(req) {
  var host = req.get('host');
  switch(host) {
    case 'www.checkers-game.net':
    case 'node.checkers-game.net':
    case 'www.checkers-game.test':
    case 'node.checkers-game.test':
    case 'node.checkers-game.net:8080':
      var lang = 'en';
      break;
    case 'www.juego-de-damas.net':
    case 'node.juego-de-damas.net':
    case 'www.juego-de-damas.test':
    case 'node.juego-de-damas.test':
    case 'node.juego-de-damas.net:8080':
      var lang = 'es';
      break;
    default:
      var lang = 'fr';
  }
  return lang;
};

module.exports.getLang = getLang;

var getTranslation = function(lang) {

  var translate = require('./lang_' + lang + '.js').translate;
  
  return translate;
};

module.exports.getTranslation = getTranslation;

var getDateFromLocale = function(lang, translate, dateString) {
  moment.locale(translate.locale);
  var d = new Date(dateString);
  var r = translate.locale_date_prefix + ' ';
  switch(lang) {
    case 'fr':
      r += moment(d).format("dddd D MMMM YYYY");
      break;
    case 'es':
      r += moment(d).format("dddd") + ' ' + moment(d).format("D") + ' de ' + moment(d).format("MMMM") + ' de ' + moment(d).format("YYYY");
      break;
    default:
      r += moment(d).format("dddd Do MMMM YYYY");
  }
  return r;
};

module.exports.getDateFromLocale = getDateFromLocale;