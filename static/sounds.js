// Original, locally synthesized UI sound effects; no external music, files, or network calls.
(function(){
 let ctx=null;let enabled=localStorage.getItem('omanMajdSound')!=='off';
 function tone(freq,duration,delay=0,type='sine',volume=.055){
  try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();
  const osc=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+delay;
  osc.type=type;osc.frequency.setValueAtTime(freq,start);gain.gain.setValueAtTime(.0001,start);
  gain.gain.exponentialRampToValueAtTime(volume,start+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.02);
  }catch(_e){}
 }
 function play(name){if(!enabled)return;
  if(name==='select')tone(560,.09);
  else if(name==='submit'){tone(440,.09);tone(660,.14,.09)}
  else if(name==='timeout'){tone(280,.20,0,'triangle',.045)}
  else if(name==='finish'){tone(392,.17);tone(494,.17,.14);tone(587,.18,.28);tone(784,.35,.44)}
  else if(name==='certificate'){tone(660,.16);tone(880,.23,.15)}
 }
 window.omanSound={play,toggle(){enabled=!enabled;localStorage.setItem('omanMajdSound',enabled?'on':'off');return enabled}};
})();
