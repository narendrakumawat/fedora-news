var hostname = (function () {
    var a = document.createElement('a');
    return function (url) {
        a.href = url;
        return a.hostname;
    }
})();

var get_rss = function(url, callback) {
    $.ajax({
        url: '//ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=10&callback=?&q=' + encodeURIComponent(url),
        dataType: 'json',
        success: callback
    });
};

var parseEntry = function(el) {
    
    var date = el.publishedDate || el.pubDate;
    var content = el.content || el.description;
    //console.log(el)
    return { title: el.title,
             content: content,
             date: date,
             link: el.link,
             shortLink: hostname(el.link),
             author: el.author };
}

function update_planet() {
    var articles = [ ];
    var rss_feed = 'http://planet.fedoraproject.org/atom.xml';

    $("#content_planet").html('');
    $("#content_planet").empty();

    get_rss(rss_feed, function(data) {
        if(data == null)
            return;
        var entries = data.responseData.feed.entries.map( function(el) { return parseEntry(el); });
        //for (cnt = 0; cnt < 10; cnt++ ){
        entries.map(function(entry) {
            //var entry = entries[cnt];
            //console.log(cnt + ' - ' + entry.title);
            //console.log(entry);
            var content = '<div data-role="collapsible"> \
                <h3>' + entry.author + ': ' + entry.title + '</h3>' +
                '<h3>' + entry.title + '</h3>' +
                '<a data-role="button" data-theme="c" data-icon="grid" href="' 
                + entry.link +'">Source</a><br />'
                + entry.content +
            '</div>';
            $("#content_planet").append( content );
            $("#content_planet").collapsibleset('refresh');
        //};
        });
    });
}
