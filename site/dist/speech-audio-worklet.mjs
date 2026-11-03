/* global AudioWorkletProcessor, registerProcessor */
class JotSpeechInput extends AudioWorkletProcessor {
  constructor(){super();this.frames=new Float32Array(2048);this.used=0;this.port.onmessage=({data})=>{if(data==='flush'){if(this.used)this.port.postMessage(this.frames.slice(0,this.used));this.used=0;this.port.postMessage({flushed:true});}};}
  process(inputs,outputs){const channels=inputs[0];for(const channel of outputs[0]||[])channel.fill(0);if(channels?.length){for(let i=0;i<channels[0].length;i++){let sample=0;for(const c of channels)sample+=c[i]||0;this.frames[this.used++]=sample/channels.length;if(this.used===this.frames.length){this.port.postMessage(this.frames,[this.frames.buffer]);this.frames=new Float32Array(2048);this.used=0;}}}return true;}
}
registerProcessor('jot-speech-input',JotSpeechInput);
