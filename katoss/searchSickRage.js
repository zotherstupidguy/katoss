var request = require('sync-request'),
    katoss = require('./katoss');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

function sendAPICmd(cmd, params, callback) {
    var apiKey = 'aa28d413d22138d396b018880496c957',
        port = '8899',
        apiCmdUrl = 'https://192.168.1.7:' + port + '/api/' + apiKey + '/?cmd=',
        url = apiCmdUrl + cmd;

    if (params) {
        for (var key in params) {
            if (!params.hasOwnProperty(key)) {
                continue;
            }
            url += '&' + key + '=' + params[key];
        }
    }

    var response = request('GET', url);
    typeof callback === 'function' && callback(JSON.parse(response.getBody().toString()).data);
}

function formatShowNumber(number) {
    return parseInt(number) < 10 ? '0' + number : number;
}

function notifySickRage(tvdbid, season, episode, callback) {
    sendAPICmd(
        'episode.setstatus',
        {
            'tvdbid': tvdbid,
            'season': parseInt(season),
            'episode': parseInt(episode),
            'status': 'skipped'
        },
        callback
    );
}

// Get show id list
// ----------------
sendAPICmd('shows', {'sort': 'name', 'pause': 0}, function (showList) {
    var searchJSON = {};
    for (var showName in showList) {
        if (!showList.hasOwnProperty(showName)) {
            continue;
        }
        var show = showList[showName];
        (function (tvdbid) {
            sendAPICmd('show.seasons', {tvdbid: tvdbid}, function (seasonList) {
                for (var seasonNumber in seasonList) {
                    if (!seasonList.hasOwnProperty(seasonNumber)) {
                        continue;
                    }
                    var season = formatShowNumber(seasonNumber),
                        episodeList = seasonList[seasonNumber];
                    for (var episodeNumber in episodeList) {
                        if (!episodeList.hasOwnProperty(episodeNumber)) {
                            continue;
                        }
                        var episodeInfo = episodeList[episodeNumber],
                            episode;
                        if (episodeInfo.status === 'Wanted') {
                            episode = formatShowNumber(episodeNumber);
                            searchJSON[showName] || (searchJSON[showName] = {seasons: {}, tvdbid: tvdbid});
                            searchJSON[showName].seasons[season] || (searchJSON[showName].seasons[season] = []);
                            searchJSON[showName].seasons[season].push(episode);
                        }
                    }
                }
            });
        })(show.tvdbid);
    }
    console.log(searchJSON);
    katoss(searchJSON, notifySickRage);
});