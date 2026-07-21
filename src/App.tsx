// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { SpatialVisualizer } from "./SpatialVisualizer";
import { AudioEngine } from "./AudioEngine";
import { Activity, Volume2, Upload, Link, Settings2, Zap } from "lucide-react";

export default function App() {
  const [isOn, setIsOn] = useState(false);
  const [params, setParams] = useState({
    baseFreq: 220,
    speed: 0.1, 
    radius: 5,
    filter: 2000,
    resonance: 1,
    reverb: 0.3,
    mode: 'sine' as 'sine' | 'noise' | 'track',
    waveform: 'sine' as OscillatorType,
    bandwidth: 10,
    synthVolume: 1.0,
    filterType: 'bandpass' as BiquadFilterType,
    lfoRate: 0.5,
    lfoAmount: 0,
    chaos: 0,
    entropy: 0
  });
  
  const [songInput, setSongInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0, z: 5 });
  const [currentPitch, setCurrentPitch] = useState(0); 
  const audioEngine = useRef<AudioEngine | null>(null);

  const togglePower = async () => {
    if (!audioEngine.current) {
      audioEngine.current = new AudioEngine();
      await audioEngine.current.init();
    }
    
    if (isOn) {
      audioEngine.current.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        setIsTrackPlaying(false);
      }
    } else {
      audioEngine.current.start();
      if (params.mode === 'track' && audioRef.current && audioRef.current.src) {
        audioRef.current.play();
        setIsTrackPlaying(true);
      }
    }
    setIsOn(!isOn);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && audioRef.current) {
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      audioRef.current.load();
      if (audioEngine.current) {
        audioEngine.current.setExternalSource(audioRef.current);
      }
      setParams(p => ({ ...p, mode: 'track' }));
    }
  };

  const handleTrackToggle = () => {
    if (!audioRef.current || !isOn) return;
    if (isTrackPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsTrackPlaying(!isTrackPlaying);
  };

  const loadSong = () => {
    const match = songInput.match(/song\/([a-f0-9-]{36})/i);
    if (match && audioRef.current) {
      const id = match[1];
      const url = `https://storage.googleapis.com/producer-app-public/clips/${id}.m4a`;
      audioRef.current.src = url;
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.load();
      if (audioEngine.current) {
        audioEngine.current.setExternalSource(audioRef.current);
      }
      setParams(p => ({ ...p, mode: 'track' }));
    }
  };

  useEffect(() => {
    if (audioEngine.current && isOn) {
      audioEngine.current.updateParams(params);
    }
  }, [params, isOn]);

  useEffect(() => {
    if (!isOn) return;
    let frame: number;
    const update = () => {
      if (audioEngine.current) {
        const state = audioEngine.current.getState();
        setCurrentPos(state.pos);
        setCurrentPitch(state.offset);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [isOn]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#020203] p-4 sm:p-8 font-mono text-zinc-400 select-none">
      <div className="w-full max-w-6xl bg-[#08080a] border border-white/10 rounded-2xl overflow-hidden shadow-[0_60px_150px_rgba(0,0,0,0.9)] flex flex-col h-[90vh]">
        
        <header className="bg-black/90 px-10 py-7 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-black tracking-[0.6em] text-white uppercase leading-none">The Sonntag Orbiter</h1>
            <span className="text-[9px] text-orange-600 tracking-[0.3em] font-bold mt-2 opacity-70 uppercase">Psychoacoustic Research Unit</span>
          </div>
          <button 
            onClick={togglePower}
            className={`px-10 py-3 rounded-full border text-[11px] font-black tracking-[0.3em] transition-all active:scale-95 flex items-center gap-3 ${
              isOn 
                ? "bg-orange-600 border-orange-400 text-white shadow-[0_0_40px_rgba(249,115,22,0.4)]" 
                : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-400 shadow-inner"
            }`}
          >
            <Zap size={14} className={isOn ? "animate-pulse" : ""} />
            SYSTEM {isOn ? "ON" : "OFF"}
          </button>
        </header>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          <div className="flex-1 relative bg-[#010101] border-r border-white/5">
            <SpatialVisualizer position={currentPos} radius={params.radius} active={isOn} />
            
            <div className="absolute bottom-10 left-10 right-10 max-w-md bg-black/40 backdrop-blur-xl p-6 rounded-xl border border-white/5 shadow-2xl">
               <div className="flex justify-between text-[11px] mb-4 uppercase font-black tracking-[0.2em]">
                  <span className="text-zinc-600 italic">Frequency / Phase</span>
                  <span className="text-orange-500">{(params.baseFreq * Math.pow(2, currentPitch)).toFixed(1)} Hz</span>
               </div>
               <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-700 to-orange-400 transition-all duration-100" 
                    style={{ width: `${(currentPitch * 100) % 100}%` }}
                  />
               </div>
            </div>
          </div>

          <aside className="w-full sm:w-[420px] p-10 flex flex-col gap-10 bg-[#0a0a0c] overflow-y-auto shrink-0 scrollbar-thin">
            <section className="space-y-8">
              <div className="flex items-center gap-2 text-white/20 mb-2">
                <Settings2 size={12} />
                <span className="text-[9px] font-black uppercase tracking-widest">Orbital Parameters</span>
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                <ControlGroup label="Root Pitch" value={params.baseFreq} unit="Hz" min={50} max={400} onChange={(v) => setParams(p => ({ ...p, baseFreq: v }))} />
                <ControlGroup label="Velocity" value={params.speed} unit="oct/s" min={-0.5} max={0.5} step={0.01} onChange={(v) => setParams(p => ({ ...p, speed: v }))} />
                <ControlGroup label="Orbit Radius" value={params.radius} unit="m" min={1} max={15} onChange={(v) => setParams(p => ({ ...p, radius: v }))} />
                <ControlGroup label="Diffusion" value={params.reverb} unit="mix" min={0} max={0.9} step={0.01} onChange={(v) => setParams(p => ({ ...p, reverb: v }))} />
              </div>

              <div className="grid grid-cols-2 gap-x-10 border-t border-white/5 pt-8">
                <ControlGroup label="Chaos" value={params.chaos} unit="amp" min={0} max={10} step={0.1} onChange={(v) => setParams(p => ({ ...p, chaos: v }))} />
                <ControlGroup label="Entropy" value={params.entropy} unit="jit" min={0} max={1} step={0.01} onChange={(v) => setParams(p => ({ ...p, entropy: v }))} />
              </div>
            </section>

            <section className="space-y-8 pt-8 border-t border-white/5">
              <div className="flex justify-between items-center text-[11px] uppercase font-black text-white tracking-[0.3em]">
                <span>Engine Mode</span>
                <div className="flex gap-1.5 bg-black p-1.5 rounded-lg border border-white/5">
                  {['sine', 'noise', 'track'].map(m => (
                    <button 
                      key={m}
                      onClick={() => setParams(p => ({ ...p, mode: m as any }))}
                      className={`px-4 py-2 rounded-md text-[10px] font-black transition-all ${params.mode === m ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-700 hover:text-zinc-500'}`}
                    >
                      {m === 'sine' ? 'TONE' : m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {params.mode === 'track' && (
                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] uppercase font-black tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-3 shadow-lg"
                  >
                    <Upload size={16} className="text-emerald-500" />
                    Load Local Sample
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" />
                      <input 
                        type="text" placeholder="Flow link..." value={songInput} onChange={(e) => setSongInput(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-xl pl-10 pr-4 py-3 text-[11px] text-zinc-400 focus:outline-none focus:border-orange-600"
                      />
                    </div>
                    <button onClick={loadSong} className="px-6 py-3 bg-zinc-900 border border-white/10 text-white rounded-xl text-[11px] font-black tracking-widest hover:bg-zinc-800">LOAD</button>
                  </div>
                  
                  {audioRef.current?.src && (
                    <button 
                      onClick={handleTrackToggle} disabled={!isOn}
                      className={`w-full py-5 rounded-xl border-2 flex items-center justify-center gap-2 transition-all font-black tracking-[0.4em] text-[12px] ${!isOn ? "opacity-20 cursor-not-allowed" : "hover:bg-white/5 active:scale-95"} ${isTrackPlaying ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]" : "text-white border-white/10"}`}
                    >
                      {isTrackPlaying ? "STILL" : "ORBIT"} THE TRACK
                    </button>
                  )}
                </div>
              )}

              {params.mode === 'sine' && (
                <div className="grid grid-cols-4 gap-2 animate-in fade-in duration-300">
                  {(['sine', 'sawtooth', 'square', 'triangle'] as OscillatorType[]).map(wf => (
                    <button 
                      key={wf} onClick={() => setParams(p => ({ ...p, waveform: wf }))}
                      className={`py-4 rounded-xl border text-[10px] font-black transition-all ${params.waveform === wf ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-black border-white/5 text-zinc-700 hover:text-zinc-400'}`}
                    >
                      {wf.slice(0, 3).toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {params.mode !== 'track' && (
                <div className="space-y-8 pt-8 border-t border-white/5 animate-in fade-in duration-500">
                   <div className="flex justify-between items-center text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em]">
                    <span>Filter Spectrum</span>
                    <select 
                      value={params.filterType}
                      onChange={(e) => setParams(p => ({ ...p, filterType: e.target.value as BiquadFilterType }))}
                      className="bg-black border border-white/10 rounded-lg px-4 py-2 text-[10px] text-white focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="bandpass">BANDPASS</option>
                      <option value="lowpass">LOWPASS</option>
                      <option value="highpass">HIGHPASS</option>
                      <option value="notch">NOTCH</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    <ControlGroup label="LFO Rate" value={params.lfoRate} unit="Hz" min={0.1} max={20} step={0.1} onChange={(v) => setParams(p => ({ ...p, lfoRate: v }))} />
                    <ControlGroup label="LFO Depth" value={params.lfoAmount} unit="int" min={0} max={1000} onChange={(v) => setParams(p => ({ ...p, lfoAmount: v }))} />
                  </div>
                </div>
              )}

              {params.mode === 'track' && (
                <div className="pt-8 border-t border-white/5">
                  <ControlGroup label="Ambience Mix" value={params.synthVolume} unit="mix" min={0} max={1} step={0.01} onChange={(v) => setParams(p => ({ ...p, synthVolume: v }))} />
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
      <audio ref={audioRef} loop crossOrigin="anonymous" />
    </div>
  );
}

function ControlGroup({ label, value, unit, min, max, step = 1, onChange }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-zinc-700 uppercase">
        <span>{label}</span>
        <span className="text-zinc-500 tabular-nums">{value.toFixed(step === 1 ? 0 : 2)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-zinc-900 appearance-none cursor-pointer accent-orange-600 transition-all hover:accent-orange-500 rounded-full"
      />
    </div>
  );
}