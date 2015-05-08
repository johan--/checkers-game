var mongoose = require("mongoose");
db = mongoose.connect("mongodb://localhost/checkers");

var autoSequenceSchema = mongoose.Schema({
  _id: String,
  seq: Number
},
{
  collection: 'auto_sequence'
});

var AutoSequenceClass = mongoose.model("AutoSequence", autoSequenceSchema);

var roomSchema = mongoose.Schema({
  _id: Number,
  rule:  {type: Number, ref: "Rule"},
  room_name: String
},
{
  collection: 'room'
});

var RoomClass = mongoose.model("Room", roomSchema);

var ruleSchema = mongoose.Schema({
  _id: Number,
  rule_name_en: String,
  rule_name_es: String,
  rule_name_fr: String,
  rule_rows: Number,
  rule_cols: Number,
  rule_back_hold: Boolean,
  rule_long_move: Boolean,
  rule_white_begins: Boolean
},
{
  collection: 'rule'
});

var RuleClass = mongoose.model("Rule", ruleSchema);

var faceSchema = mongoose.Schema({
  _id: Number,
  face_displayed: Boolean
},
{
  collection: 'face'
});

var FaceClass = mongoose.model("Face", faceSchema);

var countrySchema = mongoose.Schema({
  _id: Number,
  country_code: String,
  country_name_en: String,
  country_name_fr: String,
  country_name_es: String
},
{
  collection: 'country'
});

var CountryClass = mongoose.model("Country", countrySchema);

var userSchema = mongoose.Schema({
  _id: Number,
  face: {type: Number, ref: "Face"},
  country: {type: Number, ref: "Country"},
  user_first_name: String,
  user_last_name: String,
  user_gender: String,
  user_email: String,
  user_key: String,
  user_active: Boolean,
  user_excluded: Boolean,
  user_deleted: Boolean,
  user_login: {
    type: String,
    validate: {
      validator: function(value, respond) {
        var user_login = this.user_login;
        if(user_login !== null && user_login !== '') {
          UserClass.findOne({user_login: user_login}, function(err, client) {
            if(client) respond(false);
            else respond(true);
          });
        } else {
          respond(true);
        }
      }, 
      msg: 'User login must be unique'
    }
  },
  user_password: String,
  user_lang: String,
  user_optin: Boolean,
  user_fb_id: String,
  user_fb_name: String,
  user_fb_first_name: String,
  user_fb_last_name: String,
  user_fb_link: String,
  user_fb_username: String,
  user_fb_gender: String,
  user_fb_email: String,
  user_fb_timezone: String,
  user_fb_locale: String,
  user_fb_updated_time: String,
  user_points: Number,
  user_latest_session: Date,
  user_created: Date,
  user_activated: Date,
  user_updated: Date,
  user_logged_in: Date,
  user_agent: String,
  user_is_mobile: Boolean,
  user_ip: String
},
{
  collection: 'user'
});

userSchema.index({"user_email": 1});
userSchema.index({"user_login": 1, "user_password": 1});

var UserClass = mongoose.model("User", userSchema);

exports.UserClass = UserClass;

var newsSchema = mongoose.Schema({
  _id: Number,
  news_title_en: String,
  news_text_en: String,
  news_active_en: Boolean,
  news_title_es: String,
  news_text_es: String,
  news_active_es: Boolean,
  news_title_fr: String,
  news_text_fr: String,
  news_active_fr: Boolean,
  news_created: Date,
  news_updated: Date
},
{
  collection: 'news'
});

newsSchema.index({"news_created": -1});

var NewsClass = mongoose.model("News", newsSchema);

var autoSequence = {
  
  initSequence: function(name) {
    AutoSequenceClass.create({
      _id: name,
      seq: 0
    });
  },
  
  setNextSequence: function(name, seq, cb) {
    AutoSequenceClass.findById(name, function(err, doc) {
      if(!doc) {
        AutoSequenceClass.create({_id: name, seq: seq}, function(err, doc) {
          cb(doc, 'created');
        });
      } else {
        AutoSequenceClass.findByIdAndUpdate(name, {seq: seq}, function(err, doc) {
          cb(doc, 'updated');
        });
      }  
    });
  },
  
  getNextSequence: function(name, cb) {
    var ret = AutoSequenceClass.findOneAndUpdate(
      {_id: name},
      {$inc: {seq: 1}},
      {upsert : true},
      function(err, doc) {
        cb(doc.seq);
      }
    );
  }
  
};

exports.autoSequence = autoSequence;

var news = {
  
  getNews:function(lang, cb) {
    NewsClass.find()
      .where("news_active_" + lang).equals(true)
      .sort("-news_created")
      .exec(function(err, newsList) {
        cb(newsList);
      });
  },
  
  getNewsList:function(cb) {
    NewsClass.find()
      .sort("-news_created")
      .exec(function(err, newsList) {
        cb(newsList);
      });
  },

  getNewsItem: function(id, cb) {
    NewsClass.findById(id, function(err, newsItem) {
      cb(newsItem);
    });
  },

  createNewsItem:function(data, cb) {
    autoSequence.getNextSequence("news_id", function(id) {
      data._id = id;
      NewsClass.create(data, function(err, newsItem) {
        cb(newsItem);
      });
    });
  },

  updateNewsItem:function(id, data, cb) {
    NewsClass.findByIdAndUpdate(id, data, function(err, newsItem) {
      cb(newsItem);
    });
  },

  replaceNewsItem: function(data, cb) {
    NewsClass.findById(data._id, function(err, doc) {
      if(!doc) {
        NewsClass.create(data, function(err, doc) {
          cb(doc, 'created');
        });
      } else {
        NewsClass.findByIdAndUpdate(data._id, data, function(err, doc) {
          cb(doc, 'updated');
        });
      }  
    });
  },
  
  deleteNewsItem:function(id, cb) {
    NewsClass.findByIdAndRemove(id, function(err, newsItem) {
      cb(newsItem);
    });
  }
  
};

exports.news = news ;

var room = {

  getRoomList:function(cb) {
    RoomClass.find()
      .sort("_id")
      .populate("rule")
      .exec(function(err, roomList) {
        cb(roomList);
      });
  },
  
  findRoom:function(query, cb) {
    RooomClass.findOne(query, function(err, doc) {
      cb(doc);
    });
  },
  

  replaceRoomItem: function(data, cb) {
    RoomClass.findById(data._id, function(err, doc) {
      if(!doc) {
        RoomClass.create(data, function(err, doc) {
          cb(doc, 'created');
        });
      } else {
        RoomClass.findByIdAndUpdate(data._id, data, function(err, doc) {
          cb(doc, 'updated');
        });
      }  
    });
  }
  
};

exports.room = room;

var rule = {

  replaceRuleItem: function(data, cb) {
    RuleClass.findById(data._id, function(err, doc) {
      if(!doc) {
        RuleClass.create(data, function(err, doc) {
          cb(doc, 'created');
        });
      } else {
        RuleClass.findByIdAndUpdate(data._id, data, function(err, doc) {
          cb(doc, 'updated');
        });
      }  
    });
  }
  
};

exports.rule = rule;

var face = {

  getFaceList:function(lang, cb) {
    FaceClass.find()
      .exec(function(err, faceList) {
        cb(faceList);
      });
  },
  
  createFaceItem: function(data, cb) {
    autoSequence.getNextSequence("face_id", function(id) {
      data._id = id;
      country.createFaceItemWithId(data, cb);
    });
  },

  createFaceItemWithId: function(data, cb) {
    FaceClass.create(data, function(err, doc) {
      cb(doc);
    });
  },
  
  replaceFaceItem: function(data, cb) {
    FaceClass.findById(data._id, function(err, doc) {
      if(!doc) {
        FaceClass.create(data, function(err, doc) {
          cb(doc, 'created');
        });
      } else {
        FaceClass.findByIdAndUpdate(data._id, data, function(err, doc) {
          cb(doc, 'updated');
        });
      }  
    });
  }
  
};

exports.face = face;

var country = {

  getCountryList:function(lang, cb) {
    CountryClass.find()
      .sort("country_name_" + lang)
      .exec(function(err, countryList) {
        cb(countryList);
      });
  },
  
  findCountry:function(query, cb) {
    CountryClass.findOne(query, function(err, doc) {
      cb(doc);
    });
  },
  
  createCountryItem: function(data, cb) {
    autoSequence.getNextSequence("country_id", function(id) {
      data._id = id;
      country.createCountryItemWithId(data, cb);
    });
  },

  createCountryItemWithId: function(data, cb) {
    CountryClass.create(data, function(err, doc) {
      cb(doc);
    });
  },
  
  replaceCountryItem: function(data, cb) {
    CountryClass.findById(data._id, function(err, doc) {
      if(!doc) {
        CountryClass.create(data, function(err, doc) {
          cb(doc, 'created');
        });
      } else {
        CountryClass.findByIdAndUpdate(data._id, data, function(err, doc) {
          cb(doc, 'updated');
        });
      }  
    });
  }
  
};

exports.country = country;

var user = {

  findUser:function(query, cb) {
    UserClass.findOne(query)
      .populate("country")
      .exec(function(err, doc) {
        cb(doc);
      });
  },
  
  createUserItem: function(data, cb) {
    autoSequence.getNextSequence("user_id", function(id) {
      data._id = id;
      user.createUserItemWithId(data, cb);
    });
  },

  createUserItemWithId: function(data, cb) {
    UserClass.create(data, function(err, doc) {
      if(err) console.log(err);
      cb(doc);
    });
  },

  updateUserItem: function(data, cb) {
    UserClass.findByIdAndUpdate(data._id, data)
      .populate("country")
      .exec(function(err, doc) {
        if(err) console.log(err);
        cb(doc);
      });
  },

  replaceUserItem: function(data, cb) {
    UserClass.findById(data._id, function(err, doc) {
      if(err) console.log(err);
      if(!doc) {
        UserClass.create(data, function(err, doc) {
          if(err) console.log(err);
          cb(doc, 'created');
        });
      } else {
        UserClass.findByIdAndUpdate(data._id, data, function(err, doc) {
          if(err) console.log(err);
          cb(doc, 'updated');
        });
      }  
    });
  }
};

exports.user = user;
