/**
app.js

Copyright (c) 2021 tesstesstex

This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php
*/

'use strict';

const { google } = require('googleapis');
const path = require('path');
const authenticate = require('./oauth2.js');
const format = require('date-fns/format');

const youtube = google.youtube('v3');
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];

async function main() {
  const auth = await authenticate(SCOPES);
  google.options({ auth });

  const subscriptions = await getSubscriptionChannels();
  // console.log(subscriptions)
  const lives = await getLives(subscriptions);
  console.log(lives)
}

async function getSubscriptionChannels(etag=null) {
  /*
    argument: null
    return: Array[<Object>, ...]
        {
          title (e.g. "不破 湊 / Fuwa Minato【にじさんじ】")
          channelId (e.g. "UC6wvdADTJ88OfIbJYIpAaDA")
        }, ...
   */
  const headers = {};
  let subscriptionsResponse = [];
  let pageToken = '';
  let count = 0;

  if (etag) {
    headers['If-None-Match'] = etag;
  }

  while (true) {
    count++;
    const res = await youtube.subscriptions.list({
      part: 'snippet',
      mine: true,
      maxResults: 50,
      order: 'unread',
      pageToken: pageToken,
    });
    res.data.items.map((x) => {
      subscriptionsResponse.push(
        '"' + x.snippet.title + '"'
      )
    })
    if (!res.data.nextPageToken) break;
    if (count > 20) break;
    pageToken = res.data.nextPageToken;
  }

  return subscriptionsResponse;
}

async function getLives(subscriptions) {
  /*
    argument: subscriptions Array[ { title, channelId}, ...]
    return: Array[<Object>, ...]
        {
          channelTitle (e.g. "不破 湊 / Fuwa Minato【にじさんじ】"),
          title (e.g. "【癒しRTA】ｶﾞｧ!ｶﾞｧ!ｶﾞｧ!ｶﾞｧ!ｱｧｧｱｧｧｧｯｧｧｱｱｱｧ..............【にじさんじ】"),
          description (e.g. "がぁ 【単発まとめ 再生リスト】https://youtube.com/playlist?list=PL2uMwjy4y2Z5f-TtXOftRE1dowWuLdR9W ..."),
          videoId (e.g. "Orq2RKNQSFA")
        }, ...
   */
  const headers = {};

  // let promises = subscriptions.map(async (subscription) => {
  //   return await getLive(subscription)
  // });
  let promises = await getLive(subscriptions)

  let searchResponse = await Promise.all(promises);
  let result = searchResponse.filter(res => Object.keys(res).length > 0);

  return result;
}

async function getLive(subscriptions, etag=null) {
  let result = {};

  if (etag) {
    headers['If-None-Match'] = etag;
  }

  const query = subscriptions.join(' OR ');
  console.log(query);

  const res = await youtube.search.list({
    part: 'snippet',
    q: subscriptions.join(' OR '),
    eventType: 'live',
    order: 'date',
    type: 'video',
  });
  console.log(res.data.items)
  if (res.data.items.length == 0) return result;

  const actives = res.data.items.filter(
    (item) => item.snippet.liveBroadcastContent == 'live',
  );
  if (actives.length > 0) {
    const active = actives[0];
    result.channelTitle = active.snippet.channelTitle;
    result.title = active.snippet.title;
    result.description = active.snippet.description;
    result.url = 'https://www.youtube.com/watch?v=' + active.id.videoId;
  }
  return result;
}

if (module === require.main) {
  main().catch(console.error);
}

module.exports = main;
