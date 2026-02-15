import React, { useState, useEffect } from 'react';
import {
  Wind,
  HelpCircle,
  Layers,
  Volume2,
  Play,
  CheckCircle2,
  AlertCircle,
  Terminal,
  FolderOpen,
  Upload,
  Cpu,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = "http://127.0.0.1:8000/api";

interface Status {
  status: 'idle' | 'processing' | 'completed' | 'error';
  message: string;
  path?: string;
}

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

type TabId = 'enhance' | 'help';

interface TabItem {
  id: TabId;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}

interface HelpTopic {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  desc: string;
  guidance: string;
  color: string;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

export default function App() {
  const [inputPath, setInputPath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [vocalBoost, setVocalBoost] = useState(3.0);
  const [gain, setGain] = useState(2.0);
  const [limit, setLimit] = useState(-0.1);
  const [compThresh, setCompThresh] = useState(-20.0);
  const [compRatio, setCompRatio] = useState(4.0);
  const [isSpotBoost, setIsSpotBoost] = useState(false);
  const [boostStart, setBoostStart] = useState(2.0);
  const [boostEnd, setBoostEnd] = useState(4.0);
  const [boostDb, setBoostDb] = useState(6.0);
  const [status, setStatus] = useState<Status>({ status: 'idle', message: 'Ready' });
  const [currentTab, setCurrentTab] = useState<'enhance' | 'help'>('enhance');

  useEffect(() => {
    if (status.status !== 'processing') {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status`);
        const data = await res.json();
        setStatus(data);
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status.status]);

  const handleEnhance = async () => {
    if (!inputPath) {
      setStatus({ status: 'error', message: 'Please provide an input file path.' });
      return;
    }

    setStatus({ status: 'processing', message: 'Initiating...' });

    try {
      const res = await fetch(`${API_BASE}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_path: inputPath,
          output_path: outputPath || null,
          vocal_boost: vocalBoost,
          comp_thresh: compThresh,
          comp_ratio: compRatio,
          gain: gain,
          limit: limit,
          boost_start: isSpotBoost ? boostStart : null,
          boost_end: isSpotBoost ? boostEnd : null,
          boost_db: boostDb
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start enhancement');
    } catch (err) {
      setStatus({ status: 'error', message: getErrorMessage(err) });
    }
  };

  const handleBrowseFile = async () => {
    try {
      const res = await fetch(`${API_BASE}/browse/file`);
      const data = await res.json();
      if (data.path) setInputPath(data.path);
    } catch (err) {
      console.error('Browse file error:', err);
    }
  };

  const handleBrowseDirectory = async () => {
    try {
      const res = await fetch(`${API_BASE}/browse/directory`);
      const data = await res.json();
      if (data.path) setOutputPath(dir => data.path || dir);
    } catch (err) {
      console.error('Browse directory error:', err);
    }
  };

  const SliderField = ({ label, value, onChange, min, max, step, unit = 'dB' }: SliderFieldProps) => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <label className="text-white/60 text-sm font-medium">{label}</label>
        <span className="text-apple-blue font-mono font-bold">{value.toFixed(1)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="apple-slider w-full"
      />
    </div>
  );

  const tabs: TabItem[] = [
    { id: 'enhance', icon: Layers, label: 'Enhance' },
    { id: 'help', icon: HelpCircle, label: 'Help Guide' }
  ];

  const helpTopics: HelpTopic[] = [
    {
      title: 'Vocal Presence',
      icon: Wind,
      desc: 'Increases clarity and presence of the voice by boosting high frequencies.',
      guidance: "Increase if the speaker sounds muffled. Decrease if it sounds too sharp or hissy.",
      color: 'text-blue-400'
    },
    {
      title: 'Output Gain',
      icon: Volume2,
      desc: 'Controls the final volume level of the restored audio.',
      guidance: 'Increase if the final video is too quiet. The limiter protects against harsh peaks.',
      color: 'text-purple-400'
    },
    {
      title: 'Safety Ceiling',
      icon: CheckCircle2,
      desc: 'Sets the maximum allowed peak level.',
      guidance: 'Keep near -0.1 dB for loud exports. Lower it if you want softer peaks.',
      color: 'text-green-400'
    },
    {
      title: 'Compressor Threshold',
      icon: Layers,
      desc: 'Determines when volume leveling starts.',
      guidance: 'Lower values make levels more consistent. Higher values keep the sound more natural.',
      color: 'text-yellow-400'
    },
    {
      title: 'Compressor Ratio',
      icon: Info,
      desc: 'Controls how strongly loud sections are leveled after reaching the threshold.',
      guidance: 'Use higher ratios for a tighter voice sound and lower ratios for lighter processing.',
      color: 'text-blue-300'
    },
    {
      title: 'Spot Boost',
      icon: Upload,
      desc: 'Applies extra volume to one time range.',
      guidance: 'Use it when a speaker gets quiet for a specific few seconds.',
      color: 'text-indigo-400'
    }
  ];

  return (
    <div className="flex w-full h-screen overflow-hidden p-6 gap-6">
      <div className="w-64 glass rounded-3xl flex flex-col p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-apple-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wind className="text-white" size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight">Audio Enhancer</span>
        </div>

        <nav className="space-y-2 flex-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentTab === item.id ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5'}`}
            >
              <item.icon size={18} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto glass bg-white/5 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
            <Cpu className="text-green-500" size={14} />
          </div>
          <div>
            <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Engine Status</p>
            <p className="text-xs text-white/80 font-medium">Core Active</p>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col gap-6 overflow-hidden">
        <section className="h-64 relative rounded-3xl overflow-hidden shadow-2xl shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 opacity-90" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

          <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                <Upload className="text-white" size={32} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Neural Audio Restoration</h1>
              <p className="text-white/70 max-w-md text-sm leading-relaxed">
                Professional grade noise suppression and vocal clarity, powered by DeepFilterNet and professional audio mastering.
              </p>
            </motion.div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {currentTab === 'enhance' ? (
            <motion.div
              key="enhance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 grid grid-cols-12 gap-6 overflow-hidden min-h-0"
            >
              <div className="col-span-12 lg:col-span-7 glass rounded-3xl p-8 flex flex-col min-h-0">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <FolderOpen size={20} className="text-apple-blue" />
                  Project Settings
                </h2>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[11px] text-white/40 uppercase font-black tracking-widest block mb-2 px-1">Source Video Path</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="C:\\Users\\...\\video.mp4"
                        value={inputPath}
                        onChange={(e) => setInputPath(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-all outline-none pr-32"
                      />
                      <div className="absolute right-2 top-2 bottom-2 flex">
                        <button
                          onClick={handleBrowseFile}
                          className="bg-white/10 hover:bg-white/20 transition-all rounded-xl px-4 flex items-center gap-2 group"
                        >
                          <FolderOpen size={16} className="text-apple-blue group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Browse</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/40 uppercase font-black tracking-widest block mb-2 px-1">Destination Location (Optional)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Leave blank for same folder"
                        value={outputPath}
                        onChange={(e) => setOutputPath(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:border-apple-blue focus:ring-1 focus:ring-apple-blue transition-all outline-none pr-32"
                      />
                      <div className="absolute right-2 top-2 bottom-2 flex">
                        <button
                          onClick={handleBrowseDirectory}
                          className="bg-white/10 hover:bg-white/20 transition-all rounded-xl px-4 flex items-center gap-2 group"
                        >
                          <FolderOpen size={16} className="text-purple-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Browse</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                  <div className="flex items-center justify-between p-4 glass bg-white/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                        <Layers size={20} className="text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Spot Boost</p>
                        <p className="text-[10px] text-white/40">Amplify specific timed segments</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSpotBoost(!isSpotBoost)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isSpotBoost ? 'bg-apple-blue' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSpotBoost ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isSpotBoost && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl mt-2 grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">START (SEC)</label>
                            <input type="number" step="0.1" value={boostStart} onChange={e => setBoostStart(parseFloat(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">END (SEC)</label>
                            <input type="number" step="0.1" value={boostEnd} onChange={e => setBoostEnd(parseFloat(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs" />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/40 block mb-1">BOOST (DB)</label>
                            <input type="number" step="0.5" value={boostDb} onChange={e => setBoostDb(parseFloat(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleEnhance}
                  disabled={status.status === 'processing'}
                  className="mt-6 w-full h-14 bg-apple-blue text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50"
                >
                  {status.status === 'processing' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" />
                      Run Enhancement
                    </>
                  )}
                </button>
              </div>

              <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 overflow-hidden">
                <div className="glass rounded-3xl p-8 flex flex-col flex-1 overflow-y-auto">
                  <h2 className="text-lg font-bold mb-8 flex items-center gap-2">
                    <Volume2 size={20} className="text-purple-500" />
                    Signal Chain
                  </h2>

                  <SliderField label="Vocal Presence" value={vocalBoost} onChange={setVocalBoost} min={0} max={12} step={0.5} />
                  <SliderField label="Output Gain" value={gain} onChange={setGain} min={-10} max={20} step={0.5} />
                  <SliderField label="Safety Ceiling" value={limit} onChange={setLimit} min={-5} max={0} step={0.1} />

                  <div className="pt-4 border-t border-white/10 mt-2">
                    <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-6 px-1">Dynamic Compression</p>
                    <SliderField label="Threshold" value={compThresh} onChange={setCompThresh} min={-60} max={0} step={1} />
                    <SliderField label="Ratio" value={compRatio} onChange={setCompRatio} min={1} max={20} step={0.5} unit=":1" />
                  </div>
                </div>

                <div className="h-40 glass bg-black/30 rounded-3xl p-6 flex items-start gap-4 shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mt-1 shrink-0 ${status.status === 'completed' ? 'bg-green-500/20' :
                    status.status === 'error' ? 'bg-red-500/20' :
                      status.status === 'processing' ? 'bg-blue-500/20 animate-pulse' : 'bg-white/10'
                    }`}>
                    {status.status === 'completed' && <CheckCircle2 className="text-green-500" size={20} />}
                    {status.status === 'error' && <AlertCircle className="text-red-500" size={20} />}
                    {(status.status === 'processing' || status.status === 'idle') && <Terminal className="text-white/40" size={20} />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">Process Feed</p>
                    <p className={`text-sm font-medium ${status.status === 'error' ? 'text-red-400' : 'text-white/80'}`}>
                      {status.message}
                    </p>
                    {status.path && (
                      <p className="text-[10px] bg-white/5 rounded-lg p-2 mt-2 font-mono text-white/60 truncate">
                        {status.path}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="help"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 glass rounded-3xl p-10 overflow-y-auto"
            >
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-2">Help Guide</h2>
                <p className="text-white/40 mb-12">Understanding your audio enhancement parameters.</p>

                <div className="space-y-12 pb-10">
                  {helpTopics.map((topic, i) => (
                    <div key={i} className="flex gap-6 border-b border-white/5 pb-8 last:border-0">
                      <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 ${topic.color}`}>
                        <topic.icon size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                          {topic.title}
                        </h3>
                        <p className="text-white/80 text-sm mb-4 leading-relaxed">{topic.desc}</p>
                        <div className="bg-white/5 rounded-xl p-4 flex gap-3">
                          <div className="w-5 h-5 flex items-center justify-center bg-apple-blue/20 rounded-full shrink-0 mt-0.5">
                            <Info className="text-apple-blue" size={12} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-apple-blue uppercase tracking-widest mb-1">When to adjust</p>
                            <p className="text-xs text-white/50 italic leading-relaxed">{topic.guidance}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
