var express = require('express');
var session = require('express-session');
var async = require('async');
var http = require('http');
var path = require('path');
var S = require('string');

var app = express();

var constant = require('./inc/constant.js');

var utils = require('./inc/utils.js');

var md5 = require("MD5");
var uniqid = require("uniqid");
var fs = require("fs");
var dot = require("express-dot-engine");

var nodemailer = require('nodemailer');
var sendmailTransport = require('nodemailer-sendmail-transport');
var htmlToText = require('nodemailer-html-to-text').htmlToText;

app.set('views', __dirname + '/views');
app.set('view engine', 'dot');
app.engine('html', dot.__express);
app.engine('js', dot.__express);
app.engine('css', dot.__express);
app.use(session({secret: 'akaga', saveUninitialized: true, resave: true}));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

var model = require('./inc/model.js');

var routes = require('./inc/routes.js');
routes.init(app);

var server = http.createServer(app);

String.prototype.ucfirst = function(str) {
  str += '';
  var f = str.charAt(0)
    .toUpperCase();
  return f + str.substr(1);
};

var rooms = require('./inc/rooms.js');
rooms.init(server, function() {
  server.listen(process.env.NODE_SERVER_PORT, process.env.NODE_SERVER_IP, function() {
    //console.log('Room list\n',rooms.getRoomList());
    //console.log('User list\n',rooms.getUserList());
    //console.log('Game list\n',rooms.getGameList());
    console.log('Express server listening port ' + process.env.NODE_SERVER_PORT + ' on ' + process.env.NODE_SERVER_IP);
  });  
});



var mailTransporter = nodemailer.createTransport(sendmailTransport({
    path: '/usr/sbin/sendmail'
}));
mailTransporter.use('compile', htmlToText());

var get_ip = require('ipware')().get_ip;
var geoip = require('geoip-lite');

app.use(function (req, res, next) {
  //res.removeHeader("X-Powered-By");
  next();
});

app.get('/', function (req, res) {
  
  var lang = utils.lang.getLang(req);

  var translate = utils.lang.getTranslation(lang);

  var is_mobile = utils.isMobile(req);
  
  var is_fb_enabled = utils.isFbEnabled(req);
  
  var sub_domain = 'www';
  var domain = 'checkers-game';
  var extension = 'net';
  var matches = req.get('host').match(/^([^\.]+)\.([^\.]+)\.([^\.]+)$/);
  if(matches !== null) {
    sub_domain = matches[1];
    domain = matches[2];
    extension = matches[3];
  }
  
  app.locals.version_prefix = version_prefix;
  
  utils.getUserIdentity(req, function() {
    res.render('index.html', {
      is_mobile: is_mobile,
      is_fb_enabled: is_fb_enabled,
      sub_domain: sub_domain,
      extension: extension,
      translate : translate,
      session: req.session
    });
  });
  
});

app.get('/fb_channel', function (req, res) {

  var lang = utils.lang.getLang(req);
  var translate = utils.lang.getTranslation(lang);
  var cache_expire = 60 * 60 * 24 * 365;
  var expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  res.header('Content-Type', 'text/html; charset=utf-8');
  res.header('Pragma', 'public');
  res.header('Cache-Control', 'max-age=' + cache_expire);
  res.header('Expires', expires.toUTCString());
  res.end('<script src="//connect.facebook.net/' + translate.fb_zone + '/all.js"></script>');
});

app.post('/load-content', function (req, res) {

  var lang = utils.lang.getLang(req);
  var translate = utils.lang.getTranslation(lang);
  var page = req.body.page;
  var menu_id = translate.anchors_map[page];
  res.header('Content-Type', 'application/json; charset=utf-8');
  var filename = menu_id + '.html';
  var options = {
    constant: constant,
    lang: lang,
    translate: translate,
    session: req.session
  };
  var ret = {menu_id: menu_id};
  switch(menu_id) {
    case 'home':
      model.news.getNews(lang, function(newsList) {
        for(var i = 0 ; i < newsList.length ; i++) {
          newsList[i]['news_text_' + lang] = newsList[i]['news_text_' + lang].replace(/\r\n\r\n/g, '<br /></p><span class="spacer"></span><p>');
          newsList[i]['news_created_locale'] = utils.lang.getDateFromLocale(lang, translate, newsList[i]['news_created']);
        }
        options.newsList = newsList;
        options.homeIntro = utils.getRowsContent(translate.page_home_welcome);
        app.render(filename, options, function(err, data) {
          ret.data = data;
          res.end(JSON.stringify(ret));
        });
      });
      break;
    case 'registration':
      var listEnum = [];
      if(req.body.extra_data && req.body.extra_data.sub_hash) {
        var parts = req.body.extra_data.sub_hash.split('-');
        var user_key = parts[0], user_id = parts[1];
        listEnum = ['confirm'];
        options.action = 'confirm';
      } else {
        options.token = md5(uniqid());
        req.session.token = options.token;
        if(req.session.user_info) {
          options.user_info = req.session.user_info;
          if(options.user_info.user_fb_id) {
            listEnum = ['faces'];
            options.action = 'update_fb_sign_in';
          } else {
            listEnum = ['faces', 'countries'];
            options.action = 'update_registration';
          }
        } else {
          listEnum = ['faces', 'countries', 'geoloc'];
          options.user_info = {user_login: '', face: 73, country: {country_code: 'FR'}};
          options.action = 'register';
        }
      }
      async.each(listEnum, function(item, part_cb) {
        switch(item) {
          case 'confirm':
            model.user.findUser({_id: user_id, user_key: user_key}, function(user_info) {
              if(user_info === null) {
                options.message = translate.page_register_unexpected_error;
                part_cb();
              } else {
                model.user.updateUserItem({_id: user_id, user_active: true}, function(user_info) {
                  options.message = utils.getRowsContent(translate.page_register_completed_notice);
                  part_cb();
                });
              }
            });
            break;
          case 'faces':
            model.face.getFaceList(lang, function(faceList) {
              options.faceList = utils.shuffleFaces(faceList, options.user_info.face);
              part_cb();
            });
            break;
          case 'countries':
            model.country.getCountryList(lang, function(countryList) {
              options.countryList = countryList;
              part_cb();
            });
            break;
          case 'geoloc':
            var ip_info = get_ip(req);
            var remote_addr = ip_info.clientIp;
            var geo = geoip.lookup(remote_addr);
            var country_code = options.user_info.country.country_code;
            if(geo !== null) {
              country_code = geo.country;
            }
            model.country.findCountry({country_code: country_code}, function(countryItem){
              if(countryItem !== null) {
                options.user_info.country = countryItem;
              }
              part_cb();
            });
            break;
        }
      }, function(err) {
        if(err) console.log('Err1',err);
        app.render(filename, options, function(err, data) {
          if(err) console.log('Err2',err);
          ret.data = data;
          res.end(JSON.stringify(ret));
        });
      });
      break;
    case 'sign-in':
    case 'lost-identifiers':
      options.token = md5(uniqid());
      req.session.token = options.token;
    case 'game-rooms':
      var room = '';
      if(req.body.extra_data) {
        room = req.body.extra_data.room;
        req.session.room = room;
      } else if(req.session.room) {
        room = req.session.room;
      }
      options.room = room;
      if(room === '') {
        options.roomList = rooms.getRoomList();
      } else {
        options.roomInfo = rooms.getRoomInfo(room);
        options.userList = rooms.getUserList(room);
      }
    default:
      app.render(filename, options, function(err, data) {
        if(err) console.log('Err3',err);
        ret.data = data;
        res.end(JSON.stringify(ret));
      });
  }
});

app.post('/register', function (req, res) {

  var lang = utils.lang.getLang(req);
  var translate = utils.lang.getTranslation(lang);
  var ret = {err: 0, err_msg: {}};
  if(req.body.token !== req.session.token) {
    ret.err |= 0x0001;
    ret.err_msg['validate'] = translate['page_register_token_error'];
    utils.sendJson(res, ret);
  } else {
    var action = req.body.action;
    if (action !== 'update_fb_sign_in') {
      var first_name = S(req.body.first_name).trim().stripTags().s;
      if(first_name === '') {
        ret.err |= 0x0002;
        ret.err_msg['first_name'] = translate['page_register_first_name_error'];
      }
      var last_name = S(req.body.last_name).trim().stripTags().s;
      if(last_name === '') {
        ret.err |= 0x0004;
        ret.err_msg['last_name'] = translate['page_register_last_name_error'];
      }
      var gender = req.body.gender;
      if(gender !== 'm' && gender !== 'f') {
        ret.err |= 0x0008;
        ret.err_msg['gender'] = translate['page_register_gender_error'];
      }
      var email = req.body.email;
      var re_email = /^[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z0-9][a-zA-Z0-9._-]+[.][a-zA-Z]{2,8}$/i;
      if(!re_email.test(email)) {
        ret.err |= 0x0010;
        ret.err_msg['email'] = translate['page_register_email_error'];
      }
    }
    var country_id = req.body.country_id;
    if(country_id === 0) {
      ret.err |= 0x0020;
      ret.err_msg['country'] = translate['page_register_country_error'];
    }
    var username = S(req.body.username).trim().stripTags().s;
    if(username === '') {
      ret.err |= 0x0040;
      ret.err_msg['username'] = translate['page_register_username_error'];
    }
    if (action !== 'update_fb_sign_in') {
      var password = S(req.body.password).trim().stripTags().s;
      var re_password = /^(.{6,24})$/i;
      var password_error = !re_password.test(password);
      if((action === 'register' || password !== '') && password_error) {
        ret.err |= 0x0040;
        ret.err_msg['password'] = translate['page_register_password_error'];
      }
      var password_confirmation = req.body.password_confirmation;
      var password_confirmation_error = (password_confirmation !== password);
      if((action === 'register' || password !== '') && password_confirmation_error) {
        ret.err |= 0x0080;
        ret.err_msg['password_confirmation'] = translate['page_register_confirmation_error'];
      }
    }
    var face_id = req.body.face_id;
    var optin = (req.body.optin === '1');
    if(ret.err !== 0) {
      ret.err_msg['validate'] = translate['page_register_global_error'];
      utils.sendJson(res, ret);
    } else {
      switch(action) { 
        case 'register':
          model.user.findUser({user_email: email}, function(user_info) {
            if(user_info !== null) {
              ret.err |= 0x0100;
              ret.err_msg['email'] = translate['page_register_email_exists_error'];
              utils.sendJson(res, ret);
            } else {
              model.user.findUser({user_login: new RegExp('^' + username + '$', "i")}, function(user_info) {
                if(user_info !== null) {
                  ret.err |= 0x0200;
                  ret.err_msg['username'] = translate['page_register_login_exists_error'];
                  utils.sendJson(res, ret);
                } else {
                  var data = {
                    face: face_id,
                    country: country_id,
                    user_first_name: first_name,
                    user_last_name: last_name,
                    user_gender: gender,
                    user_email: email,
                    user_key: md5(uniqid()),
                    user_active: false,
                    user_excluded: false,
                    user_deleted: false,
                    user_login: username,
                    user_password: password,
                    user_lang: lang,
                    user_optin: optin,
                    user_fb_id: null,
                    user_created: new Date(),
                    user_updated: new Date()
                  };
                  model.user.createUserItem(data, function(user_info) {
                    var mail_body = translate.mail_confirm_body.join('<br /><br />');
                    var confirmation_link = 'http://' + req.get('host') + '/#' +translate['menu_register_anchor'] + '/' + user_info.user_key + '-' + user_info._id;
                    mail_body = mail_body.replace(/%%LINK%%/g, confirmation_link);
                    var options = {
                      lang: lang,
                      translate: translate,
                      http_host: req.get('host'),
                      mail_body: mail_body
                    };
                    app.render('mails/registration-confirm.html', options, function(err, data) {        
                      var mailOptions = {
                        from: 'noreply@' + req.get('host').split(':')[0],
                        to: user_info.user_email,
                        bcc: 'webmaster@checkers-game.net',
                        subject: translate.mail_confirm_subject,
                        html: data
                      };
                      mailTransporter.sendMail(mailOptions, function(error, info){
                        if(error){
                          console.log(error);
                        }else{
                          console.log('Message sent: ' + JSON.stringify(info));
                        }
                      });        
                    });
                    ret.html = {};
                    var message = utils.getRowsContent(translate.page_register_get_email_notice);
                    message = message.replace(/%%EMAIL%%/g, user_info.user_email);
                    app.render('registration-ok.html', {translate: translate, message: message}, function(err, data) {        
                      ret.html['main_container'] = data;
                      utils.sendJson(res, ret);
                    });
                  });
                }
              });
            }
          });
          break;
        case 'update_registration':
          var data = {
            _id: req.session.user_info._id,
            face: face_id,
            country: country_id,
            user_first_name: first_name,
            user_last_name: last_name,
            user_gender: gender,
            user_email: email,
            user_login: username,
            user_optin: optin,
            user_updated: new Date()
          };
          if(password !== '') {
            data['user_password'] = password;
          }
          model.user.updateUserItem(data, function(user_info) {
            req.session.user_info = user_info;
            ret.user_info = user_info;
            utils.refreshView(app, {translate: translate, session: req.session}, function(html) {
              ret.html = html;
              ret.message = 'update-account-ok';
              utils.sendJson(res, ret);
            });
          });
          break;
        case 'update_fb_sign_in':
          var data = {
            _id: req.session.user_info._id,
            face: face_id,
            user_login: username,
            user_optin: optin,
            user_updated: new Date()
          };
          model.user.updateUserItem(data, function(user_info) {
            req.session.user_info = user_info;
            ret.user_info = user_info;
            utils.refreshView(app, {translate: translate, session: req.session}, function(html) {
              ret.html = html;
              ret.message = 'update-account-ok';
              utils.sendJson(res, ret);
            });
          });
          break;
      }
    }
  }
});

app.post('/sign-in', function (req, res) {

  var lang = utils.lang.getLang(req);
  var translate = utils.lang.getTranslation(lang);
  var ret = {err: 0, err_msg: {}};
  if(req.body.token !== req.session.token) {
    ret.err |= 0x0001;
    ret.err_msg['validate'] = translate['page_sign_in_token_error'];
    utils.sendJson(res, ret);
  } else {
    var username = req.body.username;
    if(username === '') {
      ret.err |= 0x0002 ;
      ret.err_msg['username'] = translate['page_sign_in_username_error'];
    }
    var password = req.body.password;
    if(password === '') {
      ret.err |= 0x0004 ;
      ret.err_msg['password'] = translate['page_sign_in_password_error'];
    }
    var remember_me = (req.body.remember_me === '1');
    if(ret.err !== 0) {
      utils.sendJson(res, ret);
    } else {
      model.user.findUser({user_login: new RegExp('^' + username + '$', "i"), user_password: password}, function(user_info) {
        if(user_info === null) {
          ret.err |= 0x0008;
          ret.err_msg['validate'] = translate['page_sign_in_invalid_error'];
        } else if(user_info.user_active !== true) {
          ret.err |= 0x0010;
          ret.err_msg['validate'] = translate['page_sign_in_inactive_account_error'];
        }
        if(ret.err !== 0) {
          utils.sendJson(res, ret);
        } else {
          ret.user_info = user_info;
          req.session.user_info = user_info;
          if(remember_me) {
            var user_iden = user_info.user_key + '-' + user_info._id;
            res.cookie('user_iden', user_iden, { maxAge: 365 * 24 * 3600 * 1000, httpOnly: true });
          }
          utils.refreshView(app, {translate: translate, session: req.session}, function(html) {
            if(user_info.user_login === '') ret.redirect = translate.menu_update_anchor;
            ret.html = html;
            utils.sendJson(res, ret);
          });
        }
      });
    }
  }
});

app.post('/fb-login', function (req, res) {

  var lang = utils.lang.getLang(req);
  var translate = utils.lang.getTranslation(lang);
  var ret = {err: 0, redirect: ''};
  model.user.findUser({user_fb_id: req.body.user_fb_id}, function(user_info) {
    ret.html = {};
    if(user_info === null) {
      var country_code = 'FR';
      var country_id = 70;
      var matches = req.body.user_fb_locale.match(/^([a-z]{2})\_([A-Z]{2})$/g);
      if(matches !== null) {
        if(matches.length === 2) {
          country_code = matches[1];
        }
      }
      model.country.findCountry({country_code: country_code}, function(country_info) {
        if(country_info !== null) {
          country_id = country_info._id;
        }
        var data = {
          face: 73,
          country: country_id,
          user_login: '',
          user_optin: true,
          user_fb_id: req.body.user_fb_id,
          user_fb_name: req.body.user_fb_name,
          user_fb_first_name: req.body.user_fb_first_name,
          user_fb_last_name: req.body.user_fb_last_name,
          user_fb_link: req.body.user_fb_link,
          user_fb_username: req.body.user_fb_username,
          user_fb_gender: req.body.user_fb_gender,
          user_fb_email: req.body.user_fb_email,
          user_fb_timezone: req.body.user_fb_timezone,
          user_fb_locale: req.body.user_fb_locale,
          user_fb_updated_time: req.body.user_fb_updated_time,
          user_key: md5(uniqid()),
          user_active: true,
          user_excluded: false,
          user_deleted: false,
          user_lang: lang,
          user_created: new Date(),
          user_updated: new Date()
        };
        model.user.createUserItem(data, function(user_info) {
          console.log('User created', user_info);
          ret.user_info = user_info;
          ret.redirect = translate.menu_update_anchor;
          req.session.user_info = user_info;
          utils.refreshView(app, {translate: translate, session: req.session}, function(html) {
            ret.html = html;
            utils.sendJson(res, ret);
          });
        });
      });
    } else {
      ret.user_info = user_info;
      req.session.user_info = user_info;
      utils.refreshView(app, {translate: translate, session: req.session}, function(html) {
        if(user_info.user_login === '') ret.redirect = translate.menu_update_anchor;
        ret.html = html;
        utils.sendJson(res, ret);
      });
    }
  });
});

app.post('/sign-out', function (req, res) {

  var lang = utils.lang.getLang(req);
  var translate = utils.lang.getTranslation(lang);
  var ret = {err: 0, redirect: ''};
  req.session.destroy(function(err) {
    if(err) {
      console.log(err);
      ret.err = 1;
      utils.sendJson(res, ret);
    } else {
      res.clearCookie('user_iden');
      utils.refreshView(app, {translate: translate, session: req.session}, function(html) {
        ret.redirect = translate.menu_home_anchor;
        ret.html = html;
        utils.sendJson(res, ret);
      });
    }
  });
});

app.post('/lost-ids', function (req, res) {

  var lang = utils.lang.getLang(req);
  var translate = utils.lang.getTranslation(lang);
  var ret = {err: 0, err_msg: {}};
  if(req.body.token !== req.session.token) {
    ret.err |= 1;
    ret.err_msg['validate'] = translate['page_lost_ids_token_error'];
    utils.sendJson(res, ret);
  } else {
    var email = req.body.email;
    if(email === '') {
      ret.err |= 2;
      ret.err_msg['email'] = translate['page_lost_ids_email_error'];
    }
    if(ret.err !== 0) {
      utils.sendJson(res, ret);
    } else {
      model.user.findUser({user_email: email}, function(user_info) {
        if(user_info === null) {
          ret.err |= 4;
          ret.err_msg['validate'] = translate['page_lost_ids_email_unknown_error'];
        } else if(user_info.user_active !== true) {
          ret.err |= 8;
          ret.err_msg['validate'] = translate['page_lost_ids_inactive_account_error'];
        }
        if(ret.err !== 0) {
          utils.sendJson(res, ret);
        } else {
          var mail_body = translate.mail_lost_ids_body.join('<br /><br />');
          mail_body = mail_body.replace(/%%LOGIN%%/g, user_info.user_login);
          mail_body = mail_body.replace(/%%PASSWORD%%/g, user_info.user_password);
          var options = {
            lang: lang,
            translate: translate,
            http_host: req.get('host'),
            mail_body: mail_body
          };
          app.render('mails/lost-identifiers.html', options, function(err, data) {        
            var mailOptions = {
              from: 'noreply@' + req.get('host'),
              to: email,
              bcc: 'webmaster@checkers-game.net',
              subject: translate.mail_lost_ids_subject,
              html: data
            };
            mailTransporter.sendMail(mailOptions, function(error, info){
              if(error){
                console.log(error);
              }else{
                console.log('Message sent: ' + JSON.stringify(info));
              }
            });        
          });
          ret.html = {};
          app.render('lost-identifiers-ok.html', {translate: translate}, function(err, data) {        
            ret.html['box-inner-content'] = data;
            utils.sendJson(res, ret);
          });
        }
      });
    }
  }
});

app.get('/*', function (req, res) {

  var lang = utils.lang.getLang(req);

  var translate = utils.lang.getTranslation(lang);

  var matches = req.url.match(/^\/css\/([\-a-z0-9]+)\-([0-9\.]+)\.css$/);
  if(matches !== null) {
    req.url = '/css/' + matches[1] + '.css';
    var version = matches[2];
    var filename = __dirname + '/public' + req.url;
    var options = {
      lang: lang
    };
    fs.exists(filename, function(exists) {
      if(!exists) {
        res.writeHead(404);
        res.end("404 Not Found\n");
        return;
      }
      app.render(filename, options, function(err, data) {
        res.header("Content-type", "text/css");
        res.send(data);
      });
    });
    return;
  }
  
  var matches = req.url.match(/^\/js\/([\-a-z0-9]+)\-([0-9\.]+)\.js$/);
  if(matches !== null) {
    var script = matches[1];
    var version = matches[2];
    req.url = '/js/' + script + '.js';
    var filename = __dirname + '/public' + req.url;
    var user_info = null;
    if(req.session.user_info) {
      user_info = req.session.user_info;
    }
    var options = {
      constant: constant,
      lang: lang,
      translate: translate,
      http_host: req.get('host'),
      user_info: user_info
    };
    /*switch(script) {
      case 'fb-init':
        options.http_host = req.get('host');
        break;
      default:
    }*/
    fs.exists(filename, function(exists) {
      if(!exists) {
        res.writeHead(404);
        res.end("404 Not Found\n");
        return;
      }
      app.render(filename, options, function(err, data) {
        res.header("Content-type", "text/javascript");
        res.send(data);
      });
    });
    return;
  }
  
  var filename = __dirname + '/public' + req.url;
  fs.exists(filename, function(exists) {
    if(!exists) {
      res.writeHead(404);
      res.end("404 Not Found\n");
      return;
    }
    res.sendfile(filename);
  });
  
});

