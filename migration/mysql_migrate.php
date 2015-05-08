<?php

$cdb = mysql_connect("localhost", "checkers-game", "atomic[_97");
mysql_set_charset('utf8', $cdb);
mysql_query("SET character_set_results = 'utf8', character_set_client = 'utf8', character_set_connection = 'utf8', character_set_database = 'utf8', character_set_server = 'utf8'");

$fh = fopen("./migrate.js", "w");

fputs($fh, "var model = require('../inc/model.js');\n");

/*
 * ROOMS
 */

$sql = "SELECT SQL_CALC_FOUND_ROWS * FROM `checkers-game`.room";
$res = mysql_query($sql, $cdb);
list($room_count) =  mysql_fetch_row(mysql_query("SELECT FOUND_ROWS();"));

$room_code = '';
while($arr = mysql_fetch_assoc($res)) {
  $arr['_id'] = $arr['room_id'];
  unset($arr['room_id']);
  $arr['rule'] = $arr['rule_id'];
  unset($arr['rule_id']);
  $room_code .= "model.room.replaceRoomItem(".json_encode($arr, JSON_NUMERIC_CHECK).", room.callback);\n";
}

list($room_auto_increment) =  mysql_fetch_row(mysql_query("SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'checkers-game' AND TABLE_NAME = 'room'"));
$room_auto_increment--;

/*
 * RULES
 */

$sql = "SELECT SQL_CALC_FOUND_ROWS * FROM `checkers-game`.rule";
$res = mysql_query($sql, $cdb);
list($rule_count) =  mysql_fetch_row(mysql_query("SELECT FOUND_ROWS();"));

$rule_code = '';
while($arr = mysql_fetch_assoc($res)) {
  $arr['_id'] = $arr['rule_id'];
  unset($arr['rule_id']);
  $rule_code .= "model.rule.replaceRuleItem(".json_encode($arr, JSON_NUMERIC_CHECK).", rule.callback);\n";
}

list($rule_auto_increment) =  mysql_fetch_row(mysql_query("SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'checkers-game' AND TABLE_NAME = 'rule'"));
$rule_auto_increment--;

/*
 * NEWS
 */

$sql = "SELECT SQL_CALC_FOUND_ROWS * FROM `checkers-game`.news";
$res = mysql_query($sql, $cdb);
list($news_count) =  mysql_fetch_row(mysql_query("SELECT FOUND_ROWS();"));

$news_code = '';
while($arr = mysql_fetch_assoc($res)) {
  $arr['_id'] = $arr['news_id'];
  unset($arr['news_id']);
  $news_code .= "model.news.replaceNewsItem(".json_encode($arr, JSON_NUMERIC_CHECK).", news.callback);\n";
}

list($news_auto_increment) =  mysql_fetch_row(mysql_query("SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'checkers-game' AND TABLE_NAME = 'news'"));
$news_auto_increment--;

/*
 * FACES
 */

$sql = "SELECT SQL_CALC_FOUND_ROWS * FROM `checkers-game`.face";
$res = mysql_query($sql, $cdb);
list($faces_count) =  mysql_fetch_row(mysql_query("SELECT FOUND_ROWS();"));

$faces_code = '';
while($arr = mysql_fetch_assoc($res)) {
  $arr['_id'] = $arr['face_id'];
  unset($arr['face_id']);
  $faces_code .= "model.face.replaceFaceItem(".json_encode($arr, JSON_NUMERIC_CHECK).", faces.callback);\n";
}

list($faces_auto_increment) =  mysql_fetch_row(mysql_query("SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'checkers-game' AND TABLE_NAME = 'face'"));
$faces_auto_increment--;

/*
 * COUNTRIES
 */

$sql = "SELECT SQL_CALC_FOUND_ROWS * FROM `checkers-game`.country";
$res = mysql_query($sql, $cdb);
list($countries_count) =  mysql_fetch_row(mysql_query("SELECT FOUND_ROWS();"));

$countries_code = '';
while($arr = mysql_fetch_assoc($res)) {
  $arr['_id'] = $arr['country_id'];
  unset($arr['country_id']);
  $countries_code .= "model.country.replaceCountryItem(".json_encode($arr, JSON_NUMERIC_CHECK).", countries.callback);\n";
}

list($countries_auto_increment) =  mysql_fetch_row(mysql_query("SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'checkers-game' AND TABLE_NAME = 'country'"));
$countries_auto_increment--;

/*
 * USERS
 */

$sql = "SELECT SQL_CALC_FOUND_ROWS * FROM `checkers-game`.user";
$res = mysql_query($sql, $cdb);
list($users_count) =  mysql_fetch_row(mysql_query("SELECT FOUND_ROWS();"));

$users_code = '';
while($arr = mysql_fetch_assoc($res)) {
  $arr['_id'] = $arr['user_id'];
  unset($arr['user_id']);
  $arr['face'] = $arr['face_id'];
  unset($arr['face_id']);
  $arr['country'] = $arr['country_id'];
  if($arr['user_latest_session'] == "0000-00-00 00:00:00") $arr['user_latest_session'] = NULL;
  if($arr['user_login'] == NULL) $arr['user_login'] = '';
  unset($arr['country_id']);
  unset($arr['user_points']);
  unset($arr['user_agent']);
  unset($arr['user_is_mobile']);
  unset($arr['user_ip']);
  $users_code .= "model.user.replaceUserItem(".json_encode($arr, JSON_NUMERIC_CHECK).", users.callback);\n";
}

list($users_auto_increment) =  mysql_fetch_row(mysql_query("SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'checkers-game' AND TABLE_NAME = 'user'"));
$users_auto_increment--;

/*
 * 
 */
  
$code = '';

$code .= <<<EndOfCode
var room = {
  
  count:{$room_count},
  
  callback:function(doc, message) {
    console.log('Room #' + doc._id + ' ' + message);
    room.count--;
    if(room.count === 0) {
      model.autoSequence.setNextSequence('room_id', {$room_auto_increment}, function(doc, message) {
        console.log('Sequence #' + doc._id + ' sequence ' + message + ' to ' + doc.seq);
        rule.migrate();
      });
    }
  },
  
  migrate:function() {
  
    {$room_code}
  }
};

var rule = {
  
  count:{$rule_count},
  
  callback:function(doc, message) {
    console.log('Rule #' + doc._id + ' ' + message);
    rule.count--;
    if(rule.count === 0) {
      model.autoSequence.setNextSequence('rule_id', {$rule_auto_increment}, function(doc, message) {
        console.log('Sequence #' + doc._id + ' sequence ' + message + ' to ' + doc.seq);
        news.migrate();
      });
    }
  },
  
  migrate:function() {
  
    {$rule_code}
  }
};

var news = {
  
  count:{$news_count},
  
  callback:function(doc, message) {
    console.log('News #' + doc._id + ' ' + message);
    news.count--;
    if(news.count === 0) {
      model.autoSequence.setNextSequence('news_id', {$news_auto_increment}, function(doc, message) {
        console.log('Sequence #' + doc._id + ' sequence ' + message + ' to ' + doc.seq);
        faces.migrate();
      });
    }
  },
  
  migrate:function() {
  
    {$news_code}
  }
};

var faces = {
  
  count:{$faces_count},
  
  callback:function(doc, message) {
    console.log('Face #' + doc._id + ' ' + message);
    faces.count--;
    if(faces.count === 0) {
      model.autoSequence.setNextSequence('face_id', {$faces_auto_increment}, function(doc, message) {
        console.log('Sequence #' + doc._id + ' sequence ' + message + ' to ' + doc.seq);
        countries.migrate();
      });
    }
  },
  
  migrate:function() {
  
    {$faces_code}
  }
};

var countries = {
  
  count:{$countries_count},
  
  callback:function(doc, message) {
    console.log('Country #' + doc._id + ' ' + message);
    countries.count--;
    if(countries.count === 0) {
      model.autoSequence.setNextSequence('country_id', {$countries_auto_increment}, function(doc, message) {
        console.log('Sequence #' + doc._id + ' sequence ' + message + ' to ' + doc.seq);
        users.migrate();
      });
    }
  },
  
  migrate:function() {

    {$countries_code}
  }
};

var users = {
  
  count:{$users_count},
  
  callback:function(doc, message) {
    console.log('User #' + doc._id + ' ' + message);
    users.count--;
    if(users.count === 0) {
      model.autoSequence.setNextSequence('user_id', {$users_auto_increment}, function(doc, message) {
        console.log('Sequence #' + doc._id + ' sequence ' + message + ' to ' + doc.seq);
        process.exit();
      });
    }
  },
  
  migrate:function() {

    {$users_code}
  }
};

room.migrate();
  
EndOfCode;

fputs($fh, $code);

fclose($fh);

mysql_close($cdb);

