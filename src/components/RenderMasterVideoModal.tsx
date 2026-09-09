'use client';

import React, { useState, useEffect } from 'react';
import { 
  Video, 
  X, 
  Film, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Folder, 
  Terminal, 
  ExternalLink,
  Sparkles,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface RenderMasterVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionName?: string;
}

interface SavedSession {
  sessionName: string;
  createdAt: string;
  topic: string;
  eventsCount: number;
  audioCount: number;
}

export const RenderMasterVideoModal: React.FC<RenderMasterVideoModalProps> = ({
  isOpen,
  onClose,
  currentSessionName,
}) => {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [resolution, setResolution] = useState<'1080p' | '4k' | 'shorts'>('1080p');
  const [codec, setCodec] = useState<'prores' | 'mp4'>('prores');
  const [fps, setFps] = useState<number>(60);
  
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderStatus, setRenderStatus] = useState<string>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [completedOutput, setCompletedOutput] = useState<{ video?: string; markers?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pastExports, setPastExports] = useState<any[]>([]);

  // Fetch available sessions
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/save-game')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (!selectedSession) {
            const active = data.sessions.find((s: any) => s.sessionName === currentSessionName);
            setSelectedSession(active ? active.sessionName : (data.sessions[0]?.sessionName || 'voiceT1'));
          }
        }
      })
      .catch(() => {});

    fetch('/api/render-video?action=list_exports')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.exports) setPastExports(data.exports);
          if (data.currentJob?.status === 'running') {
            setIsRendering(true);
            setRenderStatus('running');
            setLogs(data.currentJob.logs || []);
          }
        }
      })
      .catch(() => {});
  }, [isOpen, currentSessionName]);

  // Poll render status when active
  useEffect(() => {
    if (!isRendering) return;

    const interval = setInterval(() => {
      fetch('/api/render-video')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.currentJob) {
            setLogs(data.currentJob.logs || []);
            if (data.currentJob.status === 'completed') {
              setIsRendering(false);
              setRenderStatus('completed');
              setCompletedOutput({
                video: data.currentJob.outputFile,
                markers: data.currentJob.markersFile,
              });
            } else if (data.currentJob.status === 'failed') {
              setIsRendering(false);
              setRenderStatus('failed');
              setErrorMessage(data.currentJob.error || 'Render failed');
            }
          }
        })
        .catch(() => {});
    }, 1500);

    return () => clearInterval(interval);
  }, [isRendering]);

  const handleStartRender = async () => {
    if (!selectedSession) return;

    setIsRendering(true);
    setRenderStatus('running');
    setLogs([`Triggering render for session: ${selectedSession}...`]);
    setCompletedOutput(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: selectedSession,
          resolution,
          codec,
          fps,
          port: typeof window !== 'undefined' && window.location.port ? parseInt(window.location.port, 10) : 3000,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setIsRendering(false);
        setRenderStatus('failed');
        setErrorMessage(data.error || 'Failed to trigger render');
      }
    } catch (err: any) {
      setIsRendering(false);
      setRenderStatus('failed');
      setErrorMessage(err.message || 'Network error');
    }
  };

  const activeSessionObj = sessions.find(s => s.sessionName === selectedSession);
  const cliCommand = `npm run render-video -- --session=${selectedSession || 'voiceT1'} --res=${resolution} --codec=${codec} --fps=${fps}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl bg-[#080d1a] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0a1224] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                Valoria Master Video Render Engine
                <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-700/50 uppercase font-semibold">
                  Zero Artifacts
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Code-based deterministic Chromium + FFmpeg rendering for Adobe Premiere Pro
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-sm">
          
          {/* Top Section: Session Picker */}
          <div className="bg-[#0b1021] border border-slate-800 rounded-xl p-4 space-y-3">
            <label className="text-xs font-mono uppercase font-bold text-slate-300 block">
              1. Select Saved Debate Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              disabled={isRendering}
              className="w-full bg-[#050811] border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500"
            >
              {sessions.map(s => (
                <option key={s.sessionName} value={s.sessionName}>
                  {s.sessionName} ({s.eventsCount} events, {s.audioCount} audio files) — {s.topic.slice(0, 60)}...
                </option>
              ))}
            </select>

            {activeSessionObj && (
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
                <span>Created: {new Date(activeSessionObj.createdAt).toLocaleString()}</span>
                <a
                  href={`/render?session=${encodeURIComponent(selectedSession)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Preview Stage in Tab
                </a>
              </div>
            )}
          </div>

          {/* Preset Options Grid */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase font-bold text-slate-300 block">
              2. Export Format & Codec Preset
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Option 1: ProRes 422 HQ */}
              <div
                onClick={() => { if (!isRendering) { setCodec('prores'); setResolution('1080p'); } }}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  codec === 'prores' && resolution === '1080p'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#0b1021] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Apple ProRes 422 HQ (1080p)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-900 text-cyan-300 font-mono font-bold uppercase">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Hollywood master standard. 10-bit color, mathematically lossless UI text, and buttery-smooth timeline scrubbing in Premiere Pro.
                </p>
              </div>

              {/* Option 2: ProRes 4K */}
              <div
                onClick={() => { if (!isRendering) { setCodec('prores'); setResolution('4k'); } }}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  codec === 'prores' && resolution === '4k'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#0b1021] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Virtual 4K ProRes (3840×2160)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 font-mono font-bold uppercase">
                    Ultra Crisp
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Chromium 2× supersampling for pristine 4K YouTube uploads, unlocking YouTube’s premium AV1/VP9 bitrate ladder.
                </p>
              </div>

              {/* Option 3: Lossless H.264 MP4 */}
              <div
                onClick={() => { if (!isRendering) { setCodec('mp4'); setResolution('1080p'); } }}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  codec === 'mp4' && resolution === '1080p'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#0b1021] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-blue-400" />
                    Near-Lossless H.264 (.mp4)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono font-bold uppercase">
                    CFR 60fps
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Ultra-high bitrate (CRF 12) standard MP4. Small file size, universal playback, and ready for instant YouTube uploading.
                </p>
              </div>

              {/* Option 4: YouTube Shorts 9:16 */}
              <div
                onClick={() => { if (!isRendering) { setCodec('prores'); setResolution('shorts'); } }}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  resolution === 'shorts'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#0b1021] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-purple-400" />
                    Vertical 9:16 (Shorts & TikTok)
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 font-mono font-bold uppercase">
                    Shorts
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Framed in 1080×1920 vertical format for mobile content creators and quick highlight reels.
                </p>
              </div>

            </div>
          </div>

          {/* Terminal CLI Command Preview */}
          <div className="bg-[#050811] border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-500">$</span>
              <span className="truncate text-cyan-300">{cliCommand}</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(cliCommand)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-white shrink-0 ml-2"
            >
              Copy
            </button>
          </div>

          {/* Live Progress Logs Window */}
          {(isRendering || logs.length > 0 || completedOutput) && (
            <div className="bg-[#040710] border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 flex items-center gap-2">
                  {isRendering && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                  Render Status: <strong className="text-white uppercase">{renderStatus}</strong>
                </span>
                {completedOutput && (
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Premiere Pro
                  </span>
                )}
              </div>

              {/* Logs display */}
              <div className="max-h-36 overflow-y-auto space-y-1 text-slate-300 custom-scrollbar pt-1">
                {logs.map((log, i) => (
                  <div key={i} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>

              {completedOutput && (
                <div className="mt-3 p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Master Export Generated:
                  </div>
                  <p className="text-white font-mono break-all bg-black/40 p-2 rounded">
                    {completedOutput.video}
                  </p>
                  {completedOutput.markers && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                      <span>Premiere Pro Markers CSV: <strong>{completedOutput.markers}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#0a1224] border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Output: <span className="text-cyan-300">saved-games/{selectedSession}/exports/</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-mono transition"
            >
              Close
            </button>
            <button
              onClick={handleStartRender}
              disabled={isRendering || !selectedSession}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs font-mono uppercase flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition"
            >
              {isRendering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering Master...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Render Master Video
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
