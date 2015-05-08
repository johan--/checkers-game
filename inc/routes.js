var model = require('./model.js');

exports.init = function(app) {

  app.get("/admin/news", function(req, res) {
    model.news.getNewsList(function(newsList){
      res.render("admin/news/index.html", {newsList: newsList});
    });
  });
  
  app.get("/admin/news/create", function(req, res) {
    res.render("admin/news/create.html");
  });

  app.get("/admin/news/edit/:id", function(req, res) {
    var id = req.params.id;
    model.news.getNewsItem(id, function(newsItem) {
      res.render("admin/news/edit.html", {newsItem: newsItem});
    });
  });

  app.get("/admin/news/view/:id", function(req, res) {
    var id = req.params.id;
    model.news.getNewsItem(id, function(newsItem) {
      res.render("admin/news/view.html", {newsItem: newsItem});
    });
  });

  app.put("/admin/news/validate/:id", function(req, res) {
    var id = req.params.id;
    var news_title_en = req.param("news_title_en");
    var news_text_en = req.param("news_text_en");
    var news_active_en = (req.param("news_active_en") === 'on');
    model.news.updateNewsItem(id, {news_title_en : news_title_en, news_text_en : news_text_en, news_active_en : news_active_en, news_updated: new Date()}, function(newsItem) {
      res.redirect("/admin/news");
    });
  });

  app.post("/admin/news/validate", function(req, res) {
    var news_title_en = req.param("news_title_en");
    var news_text_en = req.param("news_text_en");
    var news_active_en = (req.param("news_active_en") === 'on');
    model.news.createNewsItem({news_title_en : news_title_en, news_text_en : news_text_en, news_active_en : news_active_en, news_created: new Date(), news_updated: new Date()}, function(newsItem) {
      res.redirect("/admin/news");
    });
  });

  app.delete("/admin/news/delete/:id", function(req, res) {
    var id = req.params.id;
    model.news.deleteNewsItem(id, function(newsItem) {
      res.redirect("/admin/news");
    });
  });

};