import { demoMode, streams, tracks } from './radio-config.js';

const get = (id) => document.getElementById(id);
const audio = get('audio');
const mood = get('mood');
const play = get('play');
const next = get('next');
const player = document.querySelector('.player');
const dialog = get('radio-view');
const fullMood = get('full-mood');
const seek = get('seek');
fullMood.replaceChildren(...Array.from(mood.options, (option) => option.cloneNode(true)));
const cards = [];
let current = tracks[0];
let status = '';
audio.volume = Number(get('volume').value);

for (const track of tracks) {
  const card = document.createElement('button');
  card.className = 'card';
  card.type = 'button';
  card.style.setProperty('--tone', track.tone);
  const name = document.createElement('strong');
  name.textContent = track.artist;
  const credit = document.createElement('small');
  credit.textContent = track.credit;
  const icon = document.createElement('i');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '▶';
  card.append(name, credit, icon);
  card.addEventListener('click', () => {
    mood.value = streams[track.mood] || (mood.value !== 'all' && mood.value !== track.mood) ? 'all' : mood.value;
    fullMood.value = mood.value;
    loadTrack(track, true);
  });
  get('cards').append(card);
  cards.push([card, track, icon]);
}

for (const [index, height] of [5,12,18,8,23,14,25,10,18,25,13,20,8,14,5].entries()) {
  const bar = document.createElement('i');
  bar.style.setProperty('--h', height + 'px');
  bar.style.setProperty('--d', -index * .093 + 's');
  player.querySelector('.wave').append(bar);
}

function render() {
  const active = !audio.paused && !audio.ended;
  player.classList.toggle('playing', active);
  play.textContent = active ? '❚❚' : '▶';
  play.setAttribute('aria-label', active ? 'Pause' : 'Play');
  get('track-title').textContent = demoMode && current.artist ? current.title + ' · Demo' : current.title;
  get('track-detail').textContent = status || (current.artist
    ? (demoMode ? 'Featured artist: ' : '') + current.artist + ' · ' + current.credit
    : 'Live stream');
  next.disabled = !current.artist;
  get('state').lastChild.textContent = current.artist ? (demoMode ? ' DEMO RADIO' : ' 3F RADIO') : ' LIVE STREAM';
  get('full-track').textContent = get('track-title').textContent;
  get('full-detail').textContent = get('track-detail').textContent;
  get('full-state').textContent = get('state').textContent.trim();
  get('full-play').textContent = play.textContent;
  get('full-play').setAttribute('aria-label', play.getAttribute('aria-label'));
  get('full-prev').disabled = next.disabled;
  get('full-next').disabled = next.disabled;
  get('full-timeline').hidden = !current.artist;
  syncTimeline();
  for (const [card, track, icon] of cards) {
    card.setAttribute('aria-pressed', String(active && current === track));
    icon.textContent = active && current === track ? '♫' : '▶';
  }
}

async function start() {
  status = '';
  render();
  try {
    await audio.play();
  } catch (error) {
    if (error.name !== 'AbortError') {
      status = 'Playback unavailable. Try another track.';
      render();
    }
  }
}

function loadTrack(track, autoplay) {
  current = track;
  status = '';
  audio.src = track.src;
  render();
  if (autoplay) start();
}

function advance(autoplay, direction = 1) {
  const queue = tracks.filter((track) => mood.value === 'all' || track.mood === mood.value);
  const index = queue.indexOf(current);
  loadTrack(queue[(index + direction + queue.length) % queue.length], autoplay);
}

get('listen').addEventListener('click', start);
play.addEventListener('click', () => audio.paused ? start() : audio.pause());
next.addEventListener('click', () => advance(!audio.paused));
for (const input of [get('volume'), get('full-volume')]) {
  input.addEventListener('input', () => {
    audio.volume = Number(input.value);
    get('volume').value = input.value;
    get('full-volume').value = input.value;
  });
}
get('expand-radio').addEventListener('click', () => dialog.showModal());
get('close-radio').addEventListener('click', () => dialog.close());
get('full-play').addEventListener('click', () => audio.paused ? start() : audio.pause());
get('full-prev').addEventListener('click', () => advance(!audio.paused, -1));
get('full-next').addEventListener('click', () => advance(!audio.paused));
fullMood.addEventListener('change', () => {
  mood.value = fullMood.value;
  changeChannel();
});
function timestamp(seconds) {
  const whole = Math.floor(seconds);
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0');
}
function syncTimeline() {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  seek.disabled = duration === 0;
  seek.max = String(duration || 1);
  seek.value = String(audio.currentTime);
  seek.setAttribute('aria-valuetext', timestamp(audio.currentTime));
  get('elapsed').textContent = timestamp(audio.currentTime);
  get('duration').textContent = timestamp(duration);
}
for (const event of ['timeupdate', 'durationchange', 'emptied']) {
  audio.addEventListener(event, syncTimeline);
}
seek.addEventListener('input', () => { audio.currentTime = Number(seek.value); });
mood.addEventListener('change', changeChannel);
function changeChannel() {
  fullMood.value = mood.value;
  const active = !audio.paused;
  const stream = streams[mood.value];
  if (stream) loadTrack(stream, active);
  else if (!current.artist || (mood.value !== 'all' && current.mood !== mood.value)) {
    loadTrack(tracks.find((track) => mood.value === 'all' || track.mood === mood.value), active);
  }
}
audio.addEventListener('ended', () => { if (current.artist) advance(true); });
audio.addEventListener('playing', render);
audio.addEventListener('pause', render);
get('booking').addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const subject = encodeURIComponent('Studio inquiry — ' + fields.get('service'));
  const body = encodeURIComponent(fields.get('message') + '\n\n' + fields.get('name') + '\n' + fields.get('email'));
  location.href = 'mailto:info@3fmusic.com?subject=' + subject + '&body=' + body;
});
loadTrack(streams.all || current, false);
