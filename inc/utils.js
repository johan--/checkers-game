version_prefix = '3.0.3';

var async = require('async');

var lang = require('./lang.js');
var model = require('./model.js');

module.exports.lang = lang;

module.exports.isMobile = function(req) {
  
  if(!req.headers['user-agent']) return false;
  
  var user_agent = req.headers['user-agent'].toString();
  
  var reg = /(alcatel|amoi|android|avantgo|blackberry|benq|cell|cricket|docomo|elaine|htc|iemobile|iphone|ipad|ipaq|ipod|j2me|java|midp|mini|mmp|mobi|motorola|nec-|nokia|palm|panasonic|philips|phone|playbook|sagem|sharp|sie-|silk|smartphone|sony|symbian|t-mobile|telus|up\.browser|up\.link|vodafone|wap|webos|wireless|xda|xoom|zte)/i;
  
  return reg.test(user_agent);
};

module.exports.isFbEnabled = function(req) {
  
  if(!req.headers['user-agent']) return true;
  
  var user_agent = req.headers['user-agent'].toString();

  return !(/\bMSIE6/.test(user_agent)) && !(/\bMSIE7/.test(user_agent));
};

module.exports.getRowsContent = function(arr) {
  return arr.join('</p><span class="spacer"></span><p>');
};

module.exports.refreshView = function(app, options, cb) {
  var html = {};
  async.each(['toolbar_center', 'toolbar_right'], function(item, part_cb) {
    app.render(item + '.html', options, function(err, data) {        
      if(err) console.log('Err4',err);
      html[item] = data;
      part_cb();
    });
  }, function(err) {
      cb(html);
  });
};

module.exports.sendJson = function(res, ret) {
  res.header('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(ret));
};

var shuffle = function(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

module.exports.shuffle = shuffle;

module.exports.shuffleFaces = function(faceList, userFace){
    var i = 0, x;
    faceList = shuffle(faceList);
    while(i < faceList.length) {
      if(faceList[i]._id === userFace) {
        x = faceList[i];
        faceList[i] = faceList[0];
        faceList[0] = x;
        break;
      }
      i++;
    }
    return faceList;
};

var parseCookies = function(request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
};

module.exports.parseCookies = parseCookies;

module.exports.getUserIdentity = function(req, cb) {
  var cookies = parseCookies(req);
  var user_iden = cookies['user_iden'];
  if(user_iden) {
    var parts = user_iden.split('-');
    var user_key = parts[0], user_id = parts[1];
    model.user.findUser({_id: user_id, user_key: user_key}, function(user_info) {
      if(user_info !== null) {
        req.session.user_info = user_info;
      }
      cb();
    });
  } else {
    cb();
  }
};
