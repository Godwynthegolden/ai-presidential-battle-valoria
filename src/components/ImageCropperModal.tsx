'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Check, 
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  initialImageUrl?: string;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  onClose,
  onCropComplete,
  initialImageUrl,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageUrl || null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial image if provided
  useEffect(() => {
    if (initialImageUrl) {
      setImageSrc(initialImageUrl);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgRef.current = img;
        drawCanvas();
      };
      img.src = initialImageUrl;
    }
  }, [initialImageUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);
      setZoom(1);
      setOffset({ x: 0, y: 0 });

      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        drawCanvas();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Calculate aspect ratio fit
    const aspect = img.width / img.height;
    let baseW = size;
    let baseH = size;

    if (aspect > 1) {
      baseW = size * aspect;
    } else {
      baseH = size / aspect;
    }

    const drawW = baseW * zoom;
    const drawH = baseH * zoom;

    const centerX = size / 2 + offset.x;
    const centerY = size / 2 + offset.y;
    const drawX = centerX - drawW / 2;
    const drawY = centerY - drawH / 2;

    ctx.save();

    // Draw background image
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Draw darkened mask outside the circular/square crop region
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, size, size);

    // Cut circular clear hole for preview
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw circular border ring guide
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
    ctx.stroke();
  }, [zoom, offset]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleExportCropped = () => {
    const img = imgRef.current;
    if (!img) return;

    // Create export canvas of standard 256x256
    const exportCanvas = document.createElement('canvas');
    const exportSize = 256;
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    const aspect = img.width / img.height;
    let baseW = exportSize;
    let baseH = exportSize;

    if (aspect > 1) {
      baseW = exportSize * aspect;
    } else {
      baseH = exportSize / aspect;
    }

    const scaleFactor = exportSize / 300;
    const drawW = baseW * zoom;
    const drawH = baseH * zoom;
    const drawX = exportSize / 2 + offset.x * scaleFactor - drawW / 2;
    const drawY = exportSize / 2 + offset.y * scaleFactor - drawH / 2;

    // Draw circular mask on export
    exportCtx.beginPath();
    exportCtx.arc(exportSize / 2, exportSize / 2, exportSize / 2, 0, Math.PI * 2);
    exportCtx.clip();

    exportCtx.drawImage(img, drawX, drawY, drawW, drawH);

    const croppedDataUrl = exportCanvas.toDataURL('image/png', 0.92);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              Upload &amp; Crop Candidate Avatar
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Button or Canvas View */}
        {!imageSrc ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-64 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl flex flex-col items-center justify-center gap-3 p-6 text-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-900/80"
          >
            <div className="p-4 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-400">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <span className="text-sm font-bold text-white block">
                Click to Select Image
              </span>
              <span className="text-xs text-slate-400 font-mono mt-1 block">
                Supports PNG, JPG, JPEG, WebP (Square or Portrait recommended)
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Interactive Canvas */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black cursor-grab active:cursor-grabbing shadow-inner">
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] touch-none"
              />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-400 bg-black/70 px-2 py-0.5 rounded-full border border-slate-800 pointer-events-none">
                Drag to reposition
              </span>
            </div>

            {/* Zoom Slider */}
            <div className="w-full flex items-center gap-3 px-2">
              <ZoomOut className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min="0.7"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-slate-400" />
            </div>

            {/* Change Image Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Choose Different Image
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono transition border border-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleExportCropped}
            disabled={!imageSrc}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25"
          >
            <Check className="w-4 h-4" /> Save Avatar
          </button>
        </div>
      </div>
    </div>
  );
};
