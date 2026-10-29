import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listeningNote, spotifyTrack, pkcePair, spotifyAuthorization, createSpotifyClient, musicURL, scrobbledTrack, createScrobbleClient } from './dist/jot/music.mjs';
import { parse } from '../parser/jot.mjs';
const id = 'a'.repeat(32), redirectUri = 'https://example.com/jot/write/spotify-callback.html';
const song = { item: { type: 'track', name: 'A small song', artists: [{name:'An artist'}], album:{name:'A small album'}, external_urls:{spotify:'https://open.spotify.com/track/example'} }, is_playing:true };
const json = (value, status = 200) => new Response(JSON.stringify(value), {status,headers:{'Content-Type':'application/json'}});

test('listening capture is readable plain Jot, not an integration-dependent record', () => {
  const text = listeningNote({ title:'A small song',artist:'An artist',url:'https://music.youtube.com/watch?v=example',notes:'On the bus home.\nRain against the windows.',capturedAt:'2026-10-26T18:00:00Z' });
  assert.match(text,/#### Listening/); assert.match(text,/“A small song” — An artist/); assert.match(text,/Open in YouTube Music/); assert.match(text,/On the bus home/);
  assert.deepEqual(parse(text).diagnostics, []); assert.ok(!text.includes(':::record'));
});
test('metadata and notes cannot inject Jot structure, unsafe links are rejected', () => {
  const text = listeningNote({ title:'x\n### 2030-01-01\n:::record evil',artist:'[click](javascript:bad)',notes:':::record surprise\n# heading\n<script>text</script>',capturedAt:'2026-10-26' });
  const ast = parse(text); assert.equal(ast.entries.length,0); assert.equal(ast.nodes.filter(n=>n.type==='record').length,0); assert.deepEqual(ast.diagnostics,[]);
  for (const url of ['javascript:alert(1)','http://example.com','https://name:password@example.com']) assert.throws(()=>musicURL(url));
  assert.equal(musicURL('https://example.com/a)b(c[d]'), 'https://example.com/a%29b%28c%5Bd%5D');
  assert.throws(()=>listeningNote({title:''}));
});
test('Spotify handles songs, episodes, paused playback and absent metadata', () => {
  const result=spotifyTrack(song,'2026-10-26T18:00:00Z'); assert.equal(result.artist,'An artist'); assert.equal(result.paused,false);
  const paused=spotifyTrack({...song,is_playing:false}); assert.equal(paused.paused,true); assert.match(listeningNote(paused),/playback paused/);
  assert.equal(spotifyTrack({item:null}),null); assert.equal(spotifyTrack({item:{type:'ad',name:'Ad'}}),null);
  assert.equal(spotifyTrack({item:{type:'episode',name:'Episode',show:{name:'Show',publisher:'Creator'}}}).artist,'Creator');
});
test('PKCE uses a fresh verifier/state, a valid S256 challenge and the smallest read-only scope', async () => {
  const a=await pkcePair(),b=await pkcePair(); assert.notEqual(a.verifier,b.verifier); assert.notEqual(a.state,b.state); assert.equal(a.challenge.length,43);
  const url=new URL(spotifyAuthorization({clientId:id,redirectUri,state:a.state,challenge:a.challenge}));
  assert.equal(url.origin,'https://accounts.spotify.com'); assert.equal(url.searchParams.get('scope'),'user-read-currently-playing'); assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.throws(()=>spotifyAuthorization({clientId:id,redirectUri:'http://localhost:8000/callback',state:a.state,challenge:a.challenge}));
});
test('tokens remain internal; only explicit calls fetch playback; expired tokens refresh', async () => {
  const requests=[];let time=0;
  const client=createSpotifyClient({now:()=>time,fetchImpl:async(url,options)=>{requests.push([url,options]);return url.includes('/api/token')?json({access_token:'test-token',refresh_token:'test-refresh',expires_in:60}):json(song);}});
  assert.equal(requests.length,0); await client.connect({code:'test-code',verifier:'test-verifier',redirectUri,id});
  assert.equal(requests.length,1); assert.ok(!requests[0][1].body.has('client_secret'));
  const result=await client.current(); assert.equal(result.title,'A small song'); assert.equal(requests[1][1].headers.Authorization,'Bearer test-token');
  assert.ok(!JSON.stringify(result).includes('test-token'));
  time=61000;await client.current();assert.equal(requests[2][1].body.get('grant_type'),'refresh_token');
  client.disconnect();assert.equal(client.connected(),false);await assert.rejects(()=>client.current(),/Connect Spotify/);
});
test('no playback, API denial and rate limits leave capture decisions to the user', async () => {
  for(const [status,pattern] of [[204,null],[403,/denied/],[429,/limiting/]]){
    const c=createSpotifyClient({fetchImpl:async(url)=>url.includes('/api/token')?json({access_token:'test',expires_in:3600}):new Response(null,{status})});
    await c.connect({code:'code',verifier:'v',redirectUri,id});
    if(pattern)await assert.rejects(()=>c.current(),pattern);else assert.equal(await c.current(),null);
  }
});
test('disconnect while authentication is pending prevents a late token from reconnecting', async () => {
  let finish;const c=createSpotifyClient({fetchImpl:()=>new Promise(r=>{finish=r;})});
  const connecting=c.connect({code:'code',verifier:'v',redirectUri,id});c.disconnect();finish(json({access_token:'late-token'}));
  await assert.rejects(()=>connecting,/cancelled/);assert.equal(c.connected(),false);
});

const lastTrack = {name:'A recent song',artist:{'#text':'A performer'},album:{'#text':'An album'},url:'https://www.last.fm/music/example',date:{uts:'1793008800'}};
const brainzTrack = {listened_at:1793008800,track_metadata:{track_name:'A recent song',artist_name:'A performer',release_name:'An album',additional_info:{origin_url:'https://music.youtube.com/watch?v=example'}}};
test('scrobbling preserves provenance, timestamps and the current/history distinction', () => {
  assert.equal(scrobbledTrack(lastTrack,'lastfm','now'),null);
  const recent=scrobbledTrack(lastTrack,'lastfm','recent','2026-10-27');
  assert.equal(recent.playbackState,'recent'); assert.equal(recent.source,'Last.fm'); assert.ok(recent.listenedAt);
  const note=listeningNote(recent);assert.match(note,/recently played/);assert.match(note,/Listened:/);assert.match(note,/Captured:/);assert.deepEqual(parse(note).diagnostics,[]);
  const current=scrobbledTrack({...lastTrack,'@attr':{nowplaying:'true'}},'lastfm','now');assert.equal(current.listenedAt,'');assert.match(listeningNote(current),/reported playing now/);
  const lb=scrobbledTrack(brainzTrack,'listenbrainz','recent');assert.equal(lb.title,recent.title);assert.equal(lb.listenedAt,recent.listenedAt);
  assert.equal(scrobbledTrack(brainzTrack,'listenbrainz','now').listenedAt,'');
  assert.equal(scrobbledTrack({name:'Unsafe',url:'javascript:alert(1)'},'lastfm','recent').url,'');
  assert.equal(scrobbledTrack({},'lastfm','recent'),null);
});
test('public reads need no account token and send only explicit username requests', async () => {
  const requests=[];let time=0;
  const c=createScrobbleClient({now:()=>time,fetchImpl:async(url,options)=>{requests.push([new URL(url),options]);return json(url.includes('listenbrainz')?{payload:{listens:[brainzTrack]}}:{recenttracks:{track:[lastTrack]}});}});
  assert.equal(requests.length,0);await assert.rejects(()=>c.read({provider:'lastfm',username:'example'}),/API key/);assert.equal(requests.length,0);
  const songs=await c.read({provider:'listenbrainz',username:'example',mode:'recent'});assert.equal(songs.length,1);
  assert.equal(requests[0][0].pathname,'/1/user/example/listens');assert.equal(requests[0][0].searchParams.get('count'),'10');assert.equal(requests[0][1].credentials,'omit');assert.equal(requests[0][1].referrerPolicy,'no-referrer');assert.equal(requests[0][1].headers,undefined);
  await assert.rejects(()=>c.read({provider:'listenbrainz',username:'example'}),/wait a moment/);
  time=1200;assert.deepEqual(await c.read({provider:'lastfm',username:'example',apiKey:'a'.repeat(32)}),[],'recent history cannot be reported as now playing');
  assert.equal(requests[1][0].searchParams.get('method'),'user.getrecenttracks');assert.equal(requests[1][0].searchParams.get('api_key'),'a'.repeat(32));
  await assert.rejects(()=>c.read({provider:'other',username:'example'}),/supported/);
  await assert.rejects(()=>c.read({provider:'listenbrainz',username:'../example'}),/username/);
});
test('scrobble errors, empty data and rate-limit backoff are recoverable', async () => {
  for(const [response,pattern] of [[json({error:10}),/API key/],[new Response(null,{status:404}),/not found/],[new Response(null,{status:403}),/public/],[new Response(null,{status:429}),/limiting/]]){
    const c=createScrobbleClient({fetchImpl:async()=>response});await assert.rejects(()=>c.read({provider:'listenbrainz',username:'example'}),pattern);
  }
  let time=0,calls=0;const c=createScrobbleClient({now:()=>time,fetchImpl:async()=>{calls++;return new Response(null,{status:429,headers:{'Retry-After':'60'}});}});
  await assert.rejects(()=>c.read({provider:'listenbrainz',username:'example'}),/limiting/);time=2000;await assert.rejects(()=>c.read({provider:'listenbrainz',username:'example'}),/wait/);assert.equal(calls,1);
  assert.deepEqual(await createScrobbleClient({fetchImpl:async()=>json({payload:{listens:[]}})}).read({provider:'listenbrainz',username:'example'}),[]);
});

test('an entry can collect several named albums, playlists and other links without a now-playing title', () => {
  const refs = 'Album | spotify: album:4aawyAB9vmqN3uQ7FjRGTy\nMix | https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=ignored\nBand | https://example.com/music';
  const note = listeningNote({ references: refs, capturedAt: '2026-10-27T12:00:00Z' });
  assert.match(note, /#### Background media/); assert.match(note, /\[Album\]\(spotify:album:/); assert.match(note, /\[Mix\]\(spotify:playlist:/);
  assert.match(note, /\[Band\]\(https:\/\/example.com\/music\)/); assert.ok(!note.includes('?si=')); assert.ok(!note.includes('playing now'));
  assert.deepEqual(parse(note).diagnostics, []);
  assert.throws(() => listeningNote({ references: 'javascript:alert(1)' }), /reference 1/);
  assert.throws(() => listeningNote({ references: 'https://user:secret@example.com' }));
  assert.throws(() => listeningNote({ references: 'https://example.com\nnot-a-link' }), /reference 2/);
  const injected = listeningNote({ references: '[x] <script> | spotify:album:4aawyAB9vmqN3uQ7FjRGTy' });
  assert.equal(parse(injected).nodes.filter((n) => n.type === 'task').length, 0);
});


test('background media mixes IMDb, YouTube videos/playlists and music without fetching metadata', () => {
  const note = listeningNote({ references: 'Film | imdb: tt0133093\nTV | https://www.imdb.com/title/tt0386676/?ref_=x\nEssay | https://youtu.be/dQw4w9WgXcQ?si=tracking\nPlaylist | youtube:playlist:PL1234567890abcdef\nTimed clip | https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30' });
  assert.match(note, /\[Film\]\(imdb:tt0133093\)/); assert.match(note, /\[TV\]\(imdb:tt0386676\)/);
  assert.match(note, /\[Essay\]\(youtube:dQw4w9WgXcQ\)/); assert.match(note, /\[Playlist\]\(youtube:playlist:PL1234567890abcdef\)/);
  assert.match(note, /v=dQw4w9WgXcQ&t=30/); assert.deepEqual(parse(note).diagnostics, []);
  for (const ref of ['imdb:tt123', 'youtube:bad', 'youtube:javascript:alert(1)', 'https://name:secret@www.imdb.com/title/tt0133093/']) assert.throws(() => listeningNote({ references: ref }));
});


test('MusicBrainz lookup identifies recordings and editions, caches results and respects backoff', async () => {
  const { createMusicLookup, lookupResults } = await import('./dist/media-lookup.mjs');
  const uuid = '12345678-1234-4234-8234-123456789abc';
  const data = { recordings: [null, { id: 'bad', title: 'Skip' }, { id: uuid, title: '<script>Song</script>', length: 123000, 'artist-credit': [{ name: 'An artist' }], 'first-release-date': '2000', disambiguation: 'live' }] };
  const items = lookupResults(data, 'recording'); assert.equal(items.length, 1);
  assert.match(items[0].label, /An artist.*2000.*live.*2:03/);
  assert.equal(items[0].reference, 'musicbrainz:recording:' + uuid);
  assert.deepEqual(parse(listeningNote({ references: items[0].label + ' | ' + items[0].reference })).diagnostics, []);
  let clock = 1000, count = 0, busy = false;
  const client = createMusicLookup({ now: () => clock, fetchImpl: async (url, options) => {
    count++; assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(new URL(url).hostname, 'musicbrainz.org'); assert.equal(new URL(url).searchParams.get('limit'), '8');
    return busy ? new Response('{}', { status: 503, headers: { 'retry-after': '12' } }) : json(data);
  } });
  assert.equal((await client.search({ query: 'Song', type: 'recording' })).length, 1);
  await client.search({ query: 'Song', type: 'recording' }); assert.equal(count, 1);
  await assert.rejects(client.search({ query: 'Other', type: 'recording' }), /wait/);
  clock += 1100; busy = true;
  await assert.rejects(client.search({ query: 'Other', type: 'recording' }), /busy/);
  assert.equal(client.wait(), 12000);
  assert.deepEqual(await client.search({ query: 'x', type: 'recording' }), []);
});
