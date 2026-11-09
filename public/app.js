const $=id=>document.getElementById(id);
let R=null,name='',lib=[],files={},cur=null,applying=false,pickFor=null,stream=null,pcs={},voiceOn=false;
const v=$('v');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const myId=()=>{const p=R&&R.peers().find(p=>p.isMe);return p&&p.peer};
const log=h=>{const d=document.createElement('div');d.innerHTML=h;$('log').appendChild(d);$('log').scrollTop=1e9};
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};

/* ---- Home grid ---- */
function renderGrid(){
  const q=$('q').value.trim().toLowerCase();
  const items=lib.filter(m=>m.title.toLowerCase().includes(q));
  $('grid').innerHTML='<div class="card add" id="addc"><div class="poster"><div>＋<br>Movie add karo</div></div></div>'+
    items.map(m=>{const h=hue(m.title);return '<div class="card" data-id="'+esc(m.id)+'"><div class="poster" style="background:linear-gradient(160deg,hsl('+h+' 65% 38%),hsl('+(h+55)+' 70% 12%))"><span class="play">▶</span>'+esc(m.title)+'<small>'+(files[m.id]?'File ready':'File chuno')+'</small></div><div class="t">'+esc(m.title)+'</div></div>'}).join('');
  $('addc').onclick=()=>{pickFor=null;$('pick').click()};
  document.querySelectorAll('.card[data-id]').forEach(el=>el.onclick=()=>openMovie(el.dataset.id,true));
}
$('q').oninput=renderGrid;$('hadd').onclick=()=>{pickFor=null;$('pick').click()};
function showHome(){applying=true;v.pause();setTimeout(()=>applying=false,300);$('watch').style.display='none';$('homev').style.display='block';renderGrid()}
$('back').onclick=showHome;$('home').onclick=showHome;

/* ---- Player ---- */
function openMovie(id,broadcast){
  cur=id;const m=lib.find(l=>l.id===id);
  $('homev').style.display='none';$('watch').style.display='grid';$('wt').textContent=m?m.title:'';
  if(files[id]){v.src=files[id];$('ov').classList.add('hide')}
  else{v.removeAttribute('src');v.load();$('ov').classList.remove('hide');$('ovt').textContent='“'+(m?m.title:'Movie')+'” ki file apni device se chuno'}
  if(broadcast&&R)R.emit('sync',{movie:id,title:m&&m.title,t:0,playing:false});
  scrollTo(0,0);
}
const state=()=>{const m=lib.find(l=>l.id===cur);return{movie:cur,title:m&&m.title,t:v.currentTime,playing:!v.paused}};
['play','pause','seeked'].forEach(ev=>v.addEventListener(ev,()=>{if(!applying&&R&&cur)R.emit('sync',state())}));
$('ovb').onclick=()=>{pickFor=cur;$('pick').click()};
$('pick').onchange=e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  let id=pickFor;
  if(!id){id='m'+Math.random().toString(36).slice(2,8);lib.push({id,title:f.name.replace(/\.[^.]+$/,'')});R&&R.emit('lib',lib)}
  files[id]=URL.createObjectURL(f);
  openMovie(id,!pickFor||id!==cur);
  pickFor=null;
};

/* ---- Room ---- */
$('go').onclick=async()=>{
  name=$('nm').value.trim();const code=$('rc').value.trim().toLowerCase().replace(/\s+/g,'-');
  if(!name||!code){$('err').textContent='Naam aur room code dono likho.';return}
  $('err').textContent='Connect ho raha hai…';
  try{R=await connectRoom(code,name)}catch(e){$('err').textContent='Server se connect nahi ho paya. Dobara try karo.';return}
  $('joinbox').style.display='none';$('roombox').style.display='block';$('rt').textContent='Room: '+code;
  wire();R.presence({name,voice:false});R.emit('hello');R.emit('lib',lib);
  log('<div class="sys">Room me aa gaye. Dost ko yahi room code bhejo.</div>');
};
function wire(){
  R.onPeers(ch=>{renderPeers(ch.peers);if(voiceOn)ch.peers.forEach(connectPeer);if(sharing)ch.joined.forEach(p=>{if(!p.isMe&&!p.sameTab)shareTo(p.peer)});ch.left.forEach(p=>{closePeer(p.peer);if(spcs[p.peer]){spcs[p.peer].close();delete spcs[p.peer]}})});
  R.on('screenstop',m=>{if(!m.isMe)hideShare()});
  R.on('hello',m=>{if(m.isMe)return;R.emit('lib',lib);if(cur)R.emit('sync',state())});
  R.on('lib',m=>{if(m.isMe||!Array.isArray(m.data))return;let ch=false;
    m.data.forEach(x=>{if(x&&x.id&&!lib.find(l=>l.id===String(x.id))){lib.push({id:String(x.id),title:String(x.title).slice(0,80)});ch=true}});if(ch)renderGrid()});
  R.on('sync',m=>{if(m.isMe||!m.data)return;const d=m.data;
    if(d.title&&!lib.find(l=>l.id===d.movie)){lib.push({id:d.movie,title:String(d.title).slice(0,80)})}
    if(d.movie!==cur||$('watch').style.display==='none')openMovie(d.movie,false);
    applying=true;const t=+d.t||0;
    if(Math.abs(v.currentTime-t)>1.5)try{v.currentTime=t}catch(e){}
    if(d.playing&&v.paused)v.play().catch(()=>{});
    if(!d.playing&&!v.paused)v.pause();
    setTimeout(()=>applying=false,400)});
  R.on('chat',m=>{if(!m.isMe&&m.data)log('<div class="msg"><b>'+esc(m.data.name||'Dost')+':</b> '+esc(m.data.text||'')+'</div>')});
  R.on('sig',m=>{if(m.isMe||!m.data||m.data.to!==myId())return;if(m.data.kind==='screen')onScreenSig(m.peer,m.data);else onSig(m.peer,m.data)});
}
function renderPeers(ps){
  $('pc').textContent=ps.length;
  $('peers').innerHTML=ps.map(p=>'<div class="row"><span class="dot '+(p.presence.voice?'v':'')+'"></span>'+esc(p.presence.name||'Dost')+(p.isMe?' <span class="tag">(tum)</span>':'')+(p.presence.voice?' 🎙️':'')+'</div>').join('');
}
function send(){const t=$('ci').value.trim();if(!t)return;
  if(R)R.emit('chat',{name,text:t});else{log('<div class="sys">Chat ke liye pehle room join karo.</div>');return}
  log('<div class="msg"><b>Tum:</b> '+esc(t)+'</div>');$('ci').value=''}
$('cs').onclick=send;$('ci').onkeydown=e=>{if(e.key==='Enter')send()};

/* ---- Voice (WebRTC, signaling via room) ---- */
$('mic').onclick=async()=>{
  if(voiceOn){voiceOn=false;Object.keys(pcs).forEach(closePeer);stream&&stream.getTracks().forEach(t=>t.stop());stream=null;
    R.presence({voice:false});$('mic').textContent='🎙️ Voice chalu karo';$('mic').classList.remove('on');return}
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}
  catch(e){log('<div class="sys">Mic permission nahi mili ya browser me available nahi hai.</div>');return}
  voiceOn=true;R.presence({voice:true});$('mic').textContent='🔇 Voice band karo';$('mic').classList.add('on');
  R.peers().forEach(connectPeer);
};
function connectPeer(p){
  const me=myId();if(!me||p.isMe||p.sameTab||!p.presence.voice||pcs[p.peer])return;
  const pc=makePc(p.peer);
  if(me<p.peer)pc.createOffer().then(o=>pc.setLocalDescription(o)).then(()=>R.emit('sig',{to:p.peer,sdp:pc.localDescription}));
}
function makePc(pid){
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});pcs[pid]=pc;
  stream&&stream.getTracks().forEach(t=>pc.addTrack(t,stream));
  pc.onicecandidate=e=>{if(e.candidate)R.emit('sig',{to:pid,cand:e.candidate})};
  pc.ontrack=e=>{let a=document.getElementById('a'+pid);if(!a){a=document.createElement('audio');a.id='a'+pid;a.autoplay=true;$('audios').appendChild(a)}a.srcObject=e.streams[0]};
  return pc;
}
async function onSig(from,d){
  if(!voiceOn)return;
  try{const pc=pcs[from]||makePc(from);
    if(d.sdp){await pc.setRemoteDescription(d.sdp);
      if(d.sdp.type==='offer'){const a=await pc.createAnswer();await pc.setLocalDescription(a);R.emit('sig',{to:from,sdp:pc.localDescription})}}
    else if(d.cand)await pc.addIceCandidate(d.cand);
  }catch(e){}
}
function closePeer(pid){const pc=pcs[pid];if(pc)pc.close();delete pcs[pid];const a=document.getElementById('a'+pid);a&&a.remove()}

/* ---- Screen share (mirror): ek dost tab/screen share kare, baaki dekhein ---- */
let sharing=false,sstream=null,spcs={},rpc=null;
const ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
function showShare(stream,local){
  $('homev').style.display='none';$('watch').style.display='grid';$('wt').textContent='Screen share';
  applying=true;v.pause();setTimeout(()=>applying=false,400);
  $('ov').classList.add('hide');const s=$('sv');s.srcObject=stream;s.muted=local;s.style.display='block';s.play().catch(()=>{});
}
function hideShare(){const s=$('sv');s.srcObject=null;s.style.display='none';if(rpc){rpc.close();rpc=null}}
$('share').onclick=async()=>{
  if(sharing){stopShare();return}
  if(!R){log('<div class="sys">Screen share ke liye pehle room join karo.</div>');return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){log('<div class="sys">Is device/browser par screen share available nahi hai. Laptop par Chrome use karo.</div>');return}
  try{sstream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:true})}
  catch(e){log('<div class="sys">Screen share shuru nahi hua.</div>');return}
  sharing=true;$('share').textContent='⏹️ Share band karo';$('share').classList.add('on');
  sstream.getVideoTracks()[0].onended=stopShare;
  showShare(sstream,true);
  R.peers().forEach(p=>{if(!p.isMe&&!p.sameTab)shareTo(p.peer)});
};
function shareTo(pid){
  if(spcs[pid]||!sstream)return;
  const pc=new RTCPeerConnection(ICE);spcs[pid]=pc;
  sstream.getTracks().forEach(t=>pc.addTrack(t,sstream));
  pc.onicecandidate=e=>{if(e.candidate)R.emit('sig',{to:pid,kind:'screen',cand:e.candidate})};
  pc.createOffer().then(o=>pc.setLocalDescription(o)).then(()=>R.emit('sig',{to:pid,kind:'screen',sdp:pc.localDescription}));
}
function stopShare(){
  if(!sharing)return;sharing=false;
  Object.keys(spcs).forEach(k=>{spcs[k].close();delete spcs[k]});
  sstream&&sstream.getTracks().forEach(t=>t.stop());sstream=null;
  R&&R.emit('screenstop');hideShare();
  $('share').textContent='🖥️ Screen share karo';$('share').classList.remove('on');
}
async function onScreenSig(from,d){
  try{
    if(d.sdp&&d.sdp.type==='offer'&&!sharing){
      if(rpc)rpc.close();
      rpc=new RTCPeerConnection(ICE);
      rpc.onicecandidate=e=>{if(e.candidate)R.emit('sig',{to:from,kind:'screen',cand:e.candidate})};
      rpc.ontrack=e=>showShare(e.streams[0],false);
      await rpc.setRemoteDescription(d.sdp);
      const a=await rpc.createAnswer();await rpc.setLocalDescription(a);
      R.emit('sig',{to:from,kind:'screen',sdp:rpc.localDescription});
    }else{
      const pc=sharing?spcs[from]:rpc;if(!pc)return;
      if(d.sdp)await pc.setRemoteDescription(d.sdp);else if(d.cand)await pc.addIceCandidate(d.cand);
    }
  }catch(e){}
}
renderGrid();
