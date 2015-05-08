var node = {
  socket: false,
  connected: 0,
  room: '',
  connect: function () {
    try {
      if (node.socket) {
        node.disconnect();
      }
      node.socket = io.connect('http://[[= model.http_host ]]', {
        transports: ['websocket',
          'flashsocket',
          'htmlfile',
          'xhr-polling',
          'jsonp-polling'],
        'flash policy port': 843,
        'force new connection': true
      });
      node.socket.on('connect', function () {
        node.socket.emit('addUser', user.user_info, node.room);
        node.connected = 1;
      });
      node.socket.on('disconnect', function () {
        node.connected = 0;
      });
    } catch (err) {
      console.log('node.connect() :: ' + err.toString());
    }
    return false;
  },
  disconnect: function () {
    try {
      if (node.socket) {
        node.socket.disconnect();
        node.socket = false;
        node.connected = 0;
      }
    } catch (err) {
      console.log('node.disconnect() :: ' + err.toString());
    }
    return false;
  }
};

var user = {

    user_info: [[= JSON.stringify(model.user_info) ]],
    is_ie6: (/\bMSIE 6/.test(navigator.userAgent) && !window.opera),
    is_ie7: (/\bMSIE 7/.test(navigator.userAgent) && !window.opera),
    
    sign_in: function (cb) {
      page.load_box('[[= model.translate.menu_sign_in_anchor ]]',{priority: [[= model.constant.priority.PRIORITY_HIGHEST ]]}, function() {
        form.sign_in(cb);
      });
      return false;
    },
    
    sign_out: function () {
      $.ajax({
        type: "POST",
        url: "/sign-out",
        data: {
        },
        error:function(msg){
          console.log( "Error : " + msg );
        },
        success:function(data){
          if(data.err == 0) {
            user.user_info = null;
            console.log("user_info", user.user_info);
            for(var part in data.html) {
              $('#' + part).html(decodeURIComponent(data.html[part]));
            }
            page.load_from_hash(document.location.hash);
            /*if(data.redirect !== '') {
              page.change_hash(data.redirect);
            }*/
          }
        }
      });
      return false;
    },    
    
    lost_ids: function () {
      page.load_content({page: '[[= model.translate.page_lost_ids_anchor ]]', extra_data: {priority: [[= model.constant.priority.PRIORITY_HIGHEST ]]}, target: 'box-inner-content'}, function() {
        form.lost_ids();
      });
      return false;
    },
    
    fb_login:function() {
      FB.login(function(response) {
        if (response.authResponse) {
          FB.api('/me', function(response) {
            if(typeof response.id != 'undefined'){
              $.ajax({
                  type: 'POST',
                  url: '/fb-login',
                  data: {
                    user_fb_id: response.id,
                    user_fb_name: response.name,
                    user_fb_first_name: response.first_name,
                    user_fb_last_name: response.last_name,
                    user_fb_link: response.link,
                    user_fb_username: response.username,
                    user_fb_gender: response.gender,
                    user_fb_email: response.email,
                    user_fb_timezone: response.timezone,
                    user_fb_locale: response.locale,
                    user_fb_updated_time: response.updated_time
                  },
                  error:function(msg){
                    console.log( "Error : " + msg );
                  },
                  success:function(data){
                    if(data.err === 0) {
                      user.user_info = data.user_info;
                      console.log("user_info", user.user_info);
                      page.hide_box();
                      for(var part in data.html) {
                        $('#' + part).html(decodeURIComponent(data.html[part]));
                      }
                      page.load_menu();
                      if(data.redirect !== '') {
                        page.change_hash(data.redirect);
                      }
                    }
                  }
              });
            }
          });
        }
      }, {scope: 'email'});
      return false;
    }
    
};

var page = {
  
  priority: [[= model.constant.priority.PRIORITY_ZERO ]],
  menu_info_displayed: false,

  load_content: function (a, cb) {
    $.ajax({
      type: "POST",
      url: "/load-content",
      data: a,
      error: function (msg) {
        console.log( "Error : " + msg );
      },
      success: function (data) {
        var target = a['target'];
        $('#' + target).html(decodeURIComponent(data.data));
        $('#' + target).show();
        _gaq.push(['_trackPageview', '/' + a['page']]);
        switch(data.menu_id) {
          case 'sign-in':
          case 'lost-identifiers':
          case 'update-account-ok':
            page.show_box(440, true, cb);
            break;
          case 'registration':
            form.registration();
            $('#toolbar .menu').removeClass('sel');
            $('#menu-' + data.menu_id).addClass('sel');
            page.load_menu();
            break;
          case 'game-rooms':
            $.each($('#game_rooms #room_list .room'), function(index, elem) {
              $(elem).unbind('click');
	            $(elem).bind('click', function() {
                return game_rooms.join_room($(this).attr('room'));
              });
            });
          default:
            $('#toolbar .menu').removeClass('sel');
            $('#menu-' + data.menu_id).addClass('sel');
            page.load_menu();
        }
      }});
    return false;
  },
  
	display_error: function (field_name, error, err_msg) {
		if(error){
			$(field_name+'_error .icon').removeClass('ok').addClass('ko');
			$(field_name+'_error .text').removeClass('ok').addClass('ko');
			$(field_name+'_error .text').html(decodeURIComponent(err_msg));
			$(field_name+'_error').css('display','inline-block');
		}else{
			$(field_name+'_error').css('display','none');
		}
		return error;
	},
	
  load_box: function (name, extra_data, cb) {
    page.load_content({page: name, extra_data: extra_data, target: 'box-inner-content'}, cb)
  },
  
  show_box:function(width, lazy, cb){
    $('#box-content').width(width);
    if(!$('#box-content').is(':visible')){
      $('#box-overlay').fadeIn(200, function(){
        $('#box-wrapper').css('display',user.is_ie6 || user.is_ie7 ? 'block' : 'table');
        $('#box-content').fadeIn(200, function(){
          if(cb) cb();
        });
        $('#box-content').click(function(event){
          event.stopPropagation();
        });  
        if(lazy){
          $('#box-wrapper').bind('click', function(event){
            page.hide_box();
          });  
        }else{
          $('#box-wrapper').unbind('click');
        }
      });
    }else{
      if(cb) cb();
    }
    return false;
  },

  hide_box:function() {
    page.priority=[[= model.constant.priority.PRIORITY_ZERO ]];
    if($('#box-content').is(':visible')){
      $('#box-content').fadeOut(200, function(){
        $('#box-overlay').fadeOut(200, function(){
          $('#box-wrapper').css('display','none');
        });
      });
    }
    return false;
  },

  ie6_trap:function(p){
    if(user.is_ie6 || user.is_ie7){
      page.load_content({page: p, extra_data: {}, target: 'main_container'}, function(){});
      return false;
    }
    return true;
  },

  show_menu:function() {
    $('#toolbar_content #tooltip-menu').hide();
    var p=$('#menu_form #menu_label').position().top+4;
    var w=$('#menu_form #menu_select').width();
    var l=$('#menu_form #menu_label').position().left+$('#menu_form #menu_label').width()+6-w;
    $('#menu_form #menu_select').height(69);
    var t=p+24;
    $('#menu_form #menu_select').css('top',t+'px');
    $('#menu_form #menu_select').css('left',l+'px');
    $('#menu_form #menu_select').css('display','block');
  },

  hide_menu:function(){
    $('#menu_form #menu_select').css('display','none');
  },

  show_menu_info:function(info_text) {
    $('#toolbar_content #tooltip-menu').attr('title', info_text);
    $('#toolbar_content #tooltip-menu').fadeIn('slow');
    setTimeout(page.hide_menu_info, 8000);
  },

  hide_menu_info:function() {
    $('#toolbar_content #tooltip-menu').fadeOut('slow');
  },

  load_menu:function() {
    page.menu_selected=false;
    var find_menu=$('#menu_form #menu_label');
    if(typeof find_menu[0]!='undefined'){
      $('#menu_form #menu_label').click(function(){
        if(page.menu_selected){
            page.hide_menu();
        }else{
            page.show_menu();
        }
        return false;
      });             
      $(document).bind('click', function(){
        page.hide_menu();
        return true;
      });
      if(!page.menu_info_displayed){
        page.menu_info_displayed=true;
      }
    }
  },

  change_hash: function (h) {
    document.location.hash = '#' + h;
    /*if(user.is_ie6 || user.is_ie7){
     page.reload({action: 'reload', script_version: script_version, node_connected: node.connected, page: h, extra_data: {}, target: 'main_container', refresh_menu: 1}, function(){});
     }*/
    return false;
  },
  
  load_from_hash: function (s) {
    if (s.length > 1) {
      var h = s.substring(1);
      var p = h.split('/');
      var e = {};
      if(p.length > 1) e.sub_hash = p[1];
      page.load_content({page: p[0], extra_data: e, target: 'main_container'}, function() {
        //page.refresh_menu();
      });
    }
    return false;
  }
};

var game_rooms = {

  join_room: function(room) {
    console.log('join_room 1',room);
    if(user.user_info === null) {
      return user.sign_in(function() {
        console.log('join_room 2',room);
        game_rooms.join_room(room);
      });
    } else if (user.user_info.user_login === '') {
      return page.change_hash('[[= model.translate.menu_update_anchor ]]');
    } else {
      node.socket.emit('joinRoom', room, function() {
        console.log('Joined room #' + room);
        node.room = room;
        return page.load_content({page: '[[= model.translate.menu_game_rooms_anchor ]]', extra_data: {room: node.room}, target: 'main_container'}, function() {});
      });
    }
  }
};
  
var form = {

  registration: function() {

    var co_select=false;
    var co_scroll=$('#main_container #register_form #country_select #select_content li.selected').index()*20;
    function show_countries(){
      var s=$('#main_container .large_zone').scrollTop();
      var h=$('#main_container').height()-30;
      var p=$('#main_container #register_form #country_name').position().top+s+4;
      ht=Math.floor((p-23)/20)*20+20-s;
      hb=Math.floor((h-p-52)/20)*20+20+s;
      if(ht>hb && hb<250){
        $('#main_container #register_form #country_select').height(ht);
        var t=p-$('#main_container #register_form #country_select').outerHeight()-6;
      }else{
        $('#main_container #register_form #country_select').height(hb);
        var t=p+24;
      }	    
      var w=$('#main_container #register_form #country_name').width()+16;
      $('#main_container #register_form #country_select').css('width',w+'px');
      $('#main_container #register_form #country_select').css('top',t+'px');
      $('#main_container #register_form #country_select').css('display','block');
      $('#main_container #register_form #country_select #select_content').scrollTop(co_scroll);
      co_select=true;
    };
    function hide_countries(){
      $('#main_container #register_form #country_select').css('display','none');
      co_select=false;
    };    
    $('#register_form #country_name').click(function(){
        if(co_select==false){
            show_countries();
        }else{
            hide_countries();
        }
        return false;
    });				
    $.each($('#main_container #register_form #country_select li'),function(index, el) {
        $(this).click(function(){
        if(!$(this).hasClass('selected')){
            var arr=$(this).attr('id').split('_');
            var country_id=arr[1];
            var prev_country_id=$('#main_container #register_form #country_id').val(); 
            $('#main_container #register_form #country_name .country_left').html($(this).html());
            $(this).addClass('selected');
            if(prev_country_id!=0) $('#main_container #register_form #country_select #co_'+prev_country_id).removeClass('selected');;
            co_scroll=$('#main_container #register_form #country_select #select_content').scrollTop();
            $('#main_container #register_form #country_id').val(country_id);
        }
        });
    });

    var faces_block_numb = 20;
    var faces_block_enum = 4;
    var fa_q1=faces_block_numb*36+40;
    var fa_q2=faces_block_numb*36*(faces_block_enum-1);
    var fa_q3=faces_block_numb*36;

    function show_face_preview(face_id){
        var s=$('#main_container .large_zone').scrollTop();
        var p=$('#main_container #register_form #faces_container').position().top;
        var o=$('#main_container #register_form #face_preview');
        o.css({left: fa_q1, top: p+s-120, backgroundImage: 'url(../img/faces/fa'+face_id+'.png)'});
        o.stop(true,true).fadeIn(150);
    };
    function hide_face_preview(){
        var o=$('#main_container #register_form #face_preview');
        o.stop(true,false).fadeOut(150);
    };
    function update_faces_commands(){
        if(fa_left>0){
        $('#main_container #register_form #faces_container .left').addClass('active');
      }else{
        $('#main_container #register_form #faces_container .left').removeClass('active');
      }
      if(fa_left<fa_q2){
        $('#main_container #register_form #faces_container .right').addClass('active');
      }else{
        $('#main_container #register_form #faces_container .right').removeClass('active');
      }
    };
    var fa_left=0;
    var fa_timeout=null;
    update_faces_commands();
    $('#main_container #register_form #faces_content').css({left: '-'+fa_left+'px'});
    $('#main_container #register_form #faces_container .left').click(function(){
      if(fa_left>0){
        fa_left-=fa_q3;
        $('#main_container #register_form #faces_content').animate({left: '+='+fa_q3},500,function(){
          update_faces_commands();
        });
      }
    });
    $('#main_container #register_form #faces_container .right').click(function(){
      if(fa_left<fa_q2){
        fa_left+=fa_q3;
        $('#main_container #register_form #faces_content').animate({left: '-='+fa_q3},500,function(){
          update_faces_commands();
        });
      }
    });
    $('#main_container #register_form #faces_content .fa').click(function(){
        if(!$(this).hasClass('selected')){
        var x=$('#main_container #register_form #faces_content').position().left;
          var arr=$(this).attr('class').split('_');
          var face_id=arr[1];
          var prev_face_id=$('#main_container #register_form #face_id').val(); 
          $(this).addClass('selected');
          if(prev_face_id!=0) $('#main_container #register_form #faces_content .fa_'+prev_face_id).removeClass('selected');
          $('#main_container #register_form #face_id').val(face_id);
          fa_left=-x;
      }
    });
    $.each($('#main_container #register_form #faces_content .fa'),function(index, el) {
      var arr=$(el).attr('class').split('_');
      var face_id=arr[1];
      var img = new Image();
      img.src = 'img/faces/fa' + face_id + '.png';
      $(this).mouseenter(function(){ 
        if(fa_timeout!=null){
          clearTimeout(fa_timeout);
          fa_timeout=null;
        }
        fa_timeout=window.setTimeout(function(){ show_face_preview(face_id); },150);
      });
      $(this).mouseleave(function(){ 
        if(fa_timeout!=null){
          clearTimeout(fa_timeout);
          fa_timeout=null;
        }
        fa_timeout=window.setTimeout(function(){ hide_face_preview(); },1500); 
      });
    });
    if(!String.prototype.trim) {
      String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g,'');
      };
    }
    $('#register_form #validate').click(function(){
      this.blur();
      var error=false;
      var form_id='#register_form';
      var action=$(form_id+' #action').val();
      var token=$(form_id+' #token').val();
      if(action!='update_fb_sign_in'){
        var first_name=$(form_id+' #first_name').val().trim();
        error|=page.display_error(form_id+' #first_name',first_name=='','[[= model.translate.page_register_first_name_error ]]');
        var last_name=$(form_id+' #last_name').val().trim();
        error|=page.display_error(form_id+' #last_name',last_name=='','[[= model.translate.page_register_last_name_error ]]');
        var gender='';
        if($(form_id+' #gender_m').is(':checked')){
          gender='m';
        }
        if($(form_id+' #gender_f').is(':checked')){
          gender='f';
        }
        error|=page.display_error(form_id+' #gender',gender=='','[[= model.translate.page_register_gender_error ]]');
        var email=$(form_id+' #email').val();
        var re_email=/^[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z0-9][a-zA-Z0-9._-]+[.][a-zA-Z]{2,4}$/i;
        error|=page.display_error(form_id+' #email',!re_email.test(email),'[[= model.translate.page_register_email_error ]]');
      }else{
        var first_name='';
        var last_name='';
        var email='';
        var gender='';
      }
      var country_id=$(form_id+' #country_id').val();
      error|=page.display_error(form_id+' #country_id',country_id==0,'[[= model.translate.page_register_country_error ]]');
      var username=$(form_id+' #username').val().trim();
      error|=page.display_error(form_id+' #username',username=='','[[= model.translate.page_register_username_error ]]');
      var password=$(form_id+' #password').val();
      var password_confirmation=$(form_id+' #password_confirmation').val();
      if(action=='register' || password!=''){
        var re_password=/^(.{6,24})$/i;
        error|=page.display_error(form_id+' #password',!re_password.test(password),'[[= model.translate.page_register_password_error ]]');
        error|=page.display_error(form_id+' #password_confirmation',password_confirmation!=password,'[[= model.translate.page_register_confirmation_error ]]');
      }
      var face_id=$(form_id+' #face_id').val();
      var optin=$(form_id+' #optin').is(':checked') ? '1' : '0';
      if(error==true){
        page.display_error(form_id+' #validate',true,'[[= model.translate.page_register_global_error ]]');
      }else{
        $.ajax({
          type: "POST",
          url: "/register",
          data: {
            action: action,
            token: token,
            first_name: first_name,
            last_name: last_name,
            gender: gender,
            email: email,
            country_id: country_id,
            username: username,
            password: password,
            password_confirmation: password_confirmation,
            face_id: face_id,
            optin: optin
          },
          error:function(msg){
            alert( "Error : " + msg );
          },
          success:function(data){
            if(data.err === 0) {
              if(data.user_info) {
                user.user_info = data.user_info;
                console.log("user_info", user.user_info);
              }
              for(var part in data.html) {
                $('#' + part).html(data.html[part]);
              }
              page.load_menu();
              $(form_id + ' .input_err').css('display', 'none');
              if(data.message) {
                page.load_box(data.message, {priority: [[= model.constant.priority.PRIORITY_HIGHEST ]]}, function() {
                  console.log('Loaded!');
                });
              }
            } else {
              $(form_id + ' .input_err').css('display', 'none');
              for(var id in data.err_msg) {
                page.display_error(form_id + ' #' + id, 1, data.err_msg[id]);
              }
            }
          }
        });
      }
      return false;
    });
    $(document).bind('click', function(){
      if(co_select){
        hide_countries();
      }
      return true;
    });
    
  },
  
  sign_in: function(cb) {
    $('#sign_in_form #validate').click(function(){
      this.blur();
      var error=false;
      var form_id='#sign_in_form';
      var token=$(form_id+' #token').val();
      var username=$(form_id+' #username').val();
      error|=page.display_error(form_id+' #username',username=='','[[= model.translate.page_sign_in_username_error ]]');
      var password=$(form_id+' #password').val();
      error|=page.display_error(form_id+' #password',password=='','[[= model.translate.page_sign_in_password_error ]]');
      var remember_me=$(form_id+' #remember_me').is(':checked') ? '1' : '0';
      if(error==false){
        $.ajax({
          type: "POST",
          url: "/sign-in",
          data: {
            token: token,
            username: username,
            password: password,
            remember_me: remember_me
          },
          error:function(msg){
            console.log( "Error : " + msg );
          },
          success:function(data){
            if(data.err === 0) {
              user.user_info = data.user_info;
              console.log("user_info", user.user_info);
              page.hide_box();
              for(var part in data.html) {
                $('#' + part).html(data.html[part]);
              }
              if(cb) {
                cb();
              } else {
                page.load_from_hash(document.location.hash);
              }
            } else {
              $(form_id + ' .input_err').css('display', 'none');
              for(var id in data.err_msg) {
                page.display_error(form_id + ' #' + id, 1, data.err_msg[id]);
              }
            }
          }
        });
      }
      return false;
    });
    $('#box-content #box-content-close').unbind('click');
    $('#box-content #box-content-close').bind('click', function(event){
      return page.hide_box();
    });              
  },
  
  lost_ids: function() {
    $('#lost_ids_form #validate').click(function(){
      this.blur();
      var error=false;
      var form_id='#lost_ids_form';
      var token=$(form_id+' #token').val();
      var email=$(form_id+' #email').val();
      var re_email=/^[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z0-9][a-zA-Z0-9._-]+[.][a-zA-Z]{2,8}$/i;
      error|=page.display_error(form_id+' #email',!re_email.test(email),'[[= model.translate.page_lost_ids_email_error ]]');
      if(error==false){
        $.ajax({
          type: "POST",
          url: "/lost-ids",
          data: {
            token: token,
            email: email
          },
          error:function(msg){
            console.log( "Error : " + msg );
          },
          success:function(data){
            if(data.err === 0) {
              for(var part in data.html) {
                $('#' + part).html(data.html[part]);
              }
            } else {
              $(form_id + ' .input_err').css('display', 'none');
              for(var id in data.err_msg) {
                page.display_error(form_id + ' #' + id, 1, data.err_msg[id]);
              }
            }
          }
        });
      }
      return false;
    });
    $('#box-content #box-content-close').unbind('click');
    $('#box-content #box-content-close').bind('click', function(event){
      return page.hide_box();
    });              
  }

};

window.onhashchange = function () {
  page.load_from_hash(document.location.hash);
};

window.onbeforeunload = function () {
  node.disconnect();
};

$(function () {
  node.connect();
  if (document.location.hash !== '') {
    page.load_from_hash(document.location.hash);
  } else {
    page.change_hash('[[= model.translate.menu_home_anchor ]]');
  }
});
