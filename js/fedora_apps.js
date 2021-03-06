/***********************************************************************
 * This file is part of the Fedora-news application.
 *
 *  (c) 2013 - Copyright Pierre-Yves Chibon <pingou@pingoured.fr>
 *
 *  Distributed under the MIT License with sublicense
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 ***********************************************************************/

var socket = null;
if (!localStorage.getItem('config.rows_per_page')) {
  localStorage.setItem('config.rows_per_page', 20);
}
var rows_per_page = localStorage.getItem('config.rows_per_page');

if (localStorage.getItem('config.notification') === null) {
  localStorage.setItem('config.notification', 1);
}
var notification_enable = localStorage.getItem('config.notification');

var hostname = (function () {
  var a = document.createElement('a');
  return function (url) {
    a.href = url;
    return a.hostname;
  };
})();

var init_nb_notification = function(id) {
  if (id == -1 || id == "planet") localStorage.setItem('notify_counter_planet', 0);
  if (id == -1 || id == "updates") localStorage.setItem('notify_counter_updates', 0);
  if (id == -1 || id == "packages") localStorage.setItem('notify_counter_packages', 0);
  if (id == -1 || id == "builds") localStorage.setItem('notify_counter_builds', 0);
  if (id == -1 || id == "meetings") localStorage.setItem('notify_counter_meetings', 0);
}

function find_difference(newEntries, oldEntries) {
  if (typeof(oldEntries) === 'undefined' || oldEntries == null) {
    return newEntries.length;
  }

  // find number of new entries that are really new compared to cached entries
  var numDiff = 0;
  for (var i=0; i<newEntries.length; i++) {
    var entryFound = 0;
    for (var j=0; j<oldEntries.length; j++) {
      if (newEntries[i].msg_id != oldEntries[j].msg_id) {
        entryFound = 1;
        break;
      }
    }
    numDiff += entryFound;
  }
  return numDiff;
}

function update_notification(category, nb_new_notification) {
  nb_notification_from_storage = parseInt(localStorage.getItem('notify_counter_' + category)) ? parseInt(localStorage.getItem('notify_counter_' + category)) : 0;

  localStorage.setItem('notify_counter_' + category, nb_notification_from_storage + nb_new_notification);

  var notify_counter = nb_notification_from_storage + nb_new_notification;
  if (notify_counter > rows_per_page) notify_counter = rows_per_page;
  
  if (notify_counter > 0) {
    $("#home_" + category + ">[class='nb_notification']").css('display', 'inline');
    $("#home_" + category + ">[class='nb_notification']>text").html(notify_counter);
  } else {
    $("#home_" + category + ">[class='nb_notification']>text").html("");
    $("#home_" + category + ">[class='nb_notification']").css('display', 'none');
  }
}

var get_fedmsg_msg = function(category, callback) {
  // prepare GET data according to user's configurations
  var dataForDatagrepper = 'delta=360000&rows_per_page='+rows_per_page+'&order=desc&meta=link&meta=subtitle&category=' + category;
  if (localStorage.getItem('config.not_users') != '') {
    var notUsersList = [];
    if (localStorage.getItem('config.not_users')) {
      notUsersList = localStorage.getItem('config.not_users').split(',');
    }
    for (var i=0; i<notUsersList.length; i++) {
      dataForDatagrepper += '&not_user=' + notUsersList[i];
    }
  }
  // request datagrepper with prepared data
  $.ajax({
    url: "https://apps.fedoraproject.org/datagrepper/raw/",
    data: dataForDatagrepper,
    jsonp: "callback",
    dataType: "jsonp",
    success: function(data) {callback(data, category);},
    error: function(data, statusCode) {
      console.log("Status code: " + statusCode);
      console.log(data);
      console.log(data.responseText);
      console.log(data.status);
    }
  });
};

function parse_fedmsg(entry, id) {
  var htmlContent = null, content = null, template = null, source = null;
  var date = new Date(entry.timestamp * 1000).toLocaleString();
  switch(id) {
    case 'planet':
      content = {
        entry_msg_post_author: entry.msg.username,
        entry_msg_name: entry.msg.name,
        entry_msg_post_title: entry.msg.post.title,
        entry_meta_link: entry.meta.link,
        entry_msg_post_content: (entry.msg.post.content ? entry.msg.post.content[0].value : (entry.msg.post.summary_detail ? entry.msg.post.summary_detail.value : ''))
      };
      source = $("#entry-planet-template").html();
      break;
    case 'meetings':
      var meeting = entry.msg.meeting;
      var calendar = entry.msg.calendar;
      var organizedBy = '';
      for (i=0; i<meeting.meeting_manager.length; i++) {
        if (organizedBy !== '') organizedBy += ', ';
        organizedBy += meeting.meeting_manager[i];
      }
      content = {
        entry_msg_calendar_calendar_name: entry.msg.calendar.calendar_name,
        entry_msg_meeting_meeting_name: entry.msg.meeting.meeting_name,
        entry_meta_link: entry.meta.link,
        calendar_calendar_name: calendar.calendar_name,
        entry_meta_subtitle: entry.meta.subtitle,
        meeting_meeting_information: meeting.meeting_information,
        meeting_meeting_location: meeting.meeting_location,
        meeting_meeting_timezone: meeting.meeting_timezone,
        meeting_meeting_date: meeting.meeting_date,
        meeting_meeting_date_end: meeting.meeting_date_end,
        meeting_meeting_time_start : meeting.meeting_time_start,
        meeting_meeting_time_stop: meeting.meeting_time_stop,
        organizedBy: organizedBy
      };
      source = $("#entry-meeting-template").html();
      break;
    default:
      content = {
        entry_meta_link: entry.meta.link,
        entry_meta_subtitle: entry.meta.subtitle,
        date: date
      };
      source = $("#entry-default-template").html();
  }
  template = Handlebars.compile(source);
  htmlContent = template(content);
  return htmlContent;
}

function load_fedmsg(id, category) {
  $("#content_" + id).html('');
  entries = localStorage.getItem(id) ? localStorage.getItem(id) : [];
  entries = eval(entries);
  if (entries == null || entries.length == 0) {
    update_fedmsg(id, category);
  } else {
    $("#message_" + id).text('Loading cached information');
    load_fedmsg_entries(entries, id);
  }
}

function load_fedmsg_entries(entries, id){
  entries.map(function(entry) {
    var content = parse_fedmsg(entry, id);
    if (content) {
      $("#content_" + id).append( content );
      if (id == 'planet' || id == 'meetings') {
        $("#content_" + id).collapsibleset('refresh');
      } else {
        $("#content_" + id).listview('refresh');
      }
    }
  });
}

function update_fedmsg(id, category, deploy) {
  if(typeof(deploy)==='undefined') deploy = true;

  if (deploy == true) {
    $("#message_" + id).html('<span class="loading">Retrieving latest updates</span>');
  }

  $("#content_" + id).html('');
  get_fedmsg_msg(category, function(data, category) {

    if (!data || data.total == 0) {
      $("#message_" + id).text('Could not retrieve information from fedmsg');
      return;
    }
    var entries = data.raw_messages;
    
    // Get cached entries to compare with new list of entries
    cachedEntries = localStorage.getItem(id);
    var nb_notification = 0;
    
    if (notification_enable == 1) {
      if (id == 'planet' || id == 'meetings') {
        nb_notification = find_difference(entries, cachedEntries);
      }
    }
    localStorage.setItem(id, JSON.stringify(entries));
    if (deploy == true) {
      load_fedmsg_entries(entries, id);
      $("#message_" + id).text('');
    } else {
      // Add counter of notification by category on the home page
      if (notification_enable == 1) {
        if (nb_notification != 0) update_notification(id, nb_notification);
      }
    }
  });
  // If for some reason we got disconnected from our
  // websocket, it should have set itself to null.  If
  // that happened, let's try reconnecting.
  if (socket == null) {
    $("#message_" + id).text('Connection with fedmsg has been disconnected');
    setup_websocket_listener();
  }
}

function setup_websocket_listener() {
  socket = new WebSocket("wss://hub.fedoraproject.org:9939");

  socket.onopen = function(e){
    // Tell the hub that we want to start receiving all messages.
    socket.send(JSON.stringify({topic: '__topic_subscribe__', body: '*'}));
  };
  socket.onerror = function(e){socket=null;};
  socket.onclose = function(e){
    setup_websocket_listener();
  };

  // Our main callback
  socket.onmessage = function(e){
    var data, json, topic, body, tokens, category, page_id, deploy, id_lookup;

    // Build a handy mapping of fedmsg categories to CSS ids.
    id_lookup = {
      bodhi: "updates",
      buildsys: "builds",
      pkgdb: "packages",
      planet: "planet",
      fedocal: "meetings"
    };

    // Parse and extract the category from the websocket message.
    data = e.data;
    json = JSON.parse(data);
    topic = json.topic;
    tokens = topic.split(".");
    category = tokens[3];

    // If we don't have any pages handle this msg, then bail out early.
    if (id_lookup[category] === undefined) {
      return;
    }

    // We'll refresh the cache below, but only refresh the UI
    // if we're looking at the correct page.
    page_id = $.mobile.activePage.attr("id");
    deploy = (page_id.indexOf(id_lookup[category]) >= 0); // boolean

    // Go query datagrepper for the latest.
    // It's a shame.  We received the whole message already over
    // the websocket connection, but we have to go query again to
    // get the fedmsg.meta information.
    update_fedmsg(id_lookup[category], category, deploy);
  };
}

function save_config () {
  localStorage.setItem('config.notification', $('input[name="config_notification"]').filter(':checked').val());
  localStorage.setItem('config.not_users', $('input[name="config_not_users"]').val());
}
