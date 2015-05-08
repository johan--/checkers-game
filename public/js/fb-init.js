  window.fbAsyncInit = function() {
    FB.init({
      appId      : '[[= model.translate.fb_app_id ]]', // App ID
      channelURL : '//[[= model.http_host ]]/fb_channel', // Channel File
      status     : true, // check login status
      cookie     : true, // enable cookies to allow the server to access the session
      oauth      : true, // enable OAuth 2.0
      xfbml      : true  // parse XFBML
    });

    // Additional initialization code here
  };

  // Load the SDK Asynchronously
  (function(d){
     var js, id = 'facebook-jssdk'; if (d.getElementById(id)) {return;}
     js = d.createElement('script'); js.id = id; js.async = true;
     js.src = "//connect.facebook.net/[[= model.translate.fb_zone ]]/all.js";
     d.getElementsByTagName('head')[0].appendChild(js);
   }(document));
