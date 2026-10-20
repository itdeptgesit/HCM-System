import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  X,
  Move,
  Maximize2,
  RefreshCw,
  Sparkles
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
  title?: string;
  aspectRatio?: number; // default 1 (1:1 square)
  outputSize?: number; // default 420 (optimized for crisp retina avatars with tiny payload)
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  title = 'Sesuaikan & Crop Foto Profil',
  aspectRatio = 1,
  outputSize = 420,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [maskShape, setMaskShape] = useState<'square' | 'circle'>('circle');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Crop box size in the modal UI (pixels)
  const cropBoxSize = 280;

  // Reset state when modal opens or imageSrc changes
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
      };
      img.onerror = () => {
        // Fallback without crossOrigin if CORS fails
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          imageRef.current = fallbackImg;
          setImageLoaded(true);
        };
        fallbackImg.src = imageSrc;
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Generate real-time live preview
  const generatePreview = useCallback(() => {
    if (!imageRef.current || !imageLoaded) return;
    const img = imageRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const fitScale = Math.max(cropBoxSize / img.naturalWidth, cropBoxSize / img.naturalHeight);
    const totalScale = fitScale * zoom;
    const ratio = 160 / cropBoxSize;

    ctx.translate(160 / 2 + pan.x * ratio, 160 / 2 + pan.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(totalScale * ratio, totalScale * ratio);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    try {
      setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.85));
    } catch {
      // Ignore CORS security error on live preview
    }
  }, [imageLoaded, zoom, rotation, pan, cropBoxSize]);

  useEffect(() => {
    if (imageLoaded) {
      generatePreview();
    }
  }, [imageLoaded, zoom, rotation, pan, generatePreview]);

  // Pointer / Mouse drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (containerRef.current && containerRef.current.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomStep = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom(prev => Math.min(Math.max(1, prev + zoomStep), 3.5));
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Reset to original center
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Apply Crop & Export final high-resolution blob
  const handleApply = () => {
    if (!imageRef.current || !imageLoaded) return;
    const img = imageRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Base scale to cover the crop box at 1x
    const fitScale = Math.max(cropBoxSize / img.naturalWidth, cropBoxSize / img.naturalHeight);
    const totalScale = fitScale * zoom;
    const ratio = outputSize / cropBoxSize;

    ctx.translate(outputSize / 2 + pan.x * ratio, outputSize / 2 + pan.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(totalScale * ratio, totalScale * ratio);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    canvas.toBlob(
      blob => {
        if (blob) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onCropComplete(blob, dataUrl);
          onClose();
        }
      },
      'image/jpeg',
      0.85
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Geser dan sesuaikan ukuran foto agar pas di ID Card & profil
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden h-[340px] select-none">
          {/* Interactive Drag & Wheel Surface */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className={`relative flex items-center justify-center w-full h-full cursor-${isDragging ? 'grabbing' : 'grab'} touch-none`}
          >
            {/* Image layer */}
            {imageLoaded && imageRef.current && (
              <img
                src={imageSrc}
                alt="Crop Target"
                draggable={false}
                className="pointer-events-none transition-transform duration-75 max-w-none origin-center"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${
                    Math.max(cropBoxSize / (imageRef.current.naturalWidth || 1), cropBoxSize / (imageRef.current.naturalHeight || 1)) * zoom
                  })`,
                }}
              />
            )}

            {/* Dark Mask Overlay with Crop Cutout */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* SVG Cutout Overlay */}
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <mask id="crop-mask">
                    <rect width="100%" height="100%" fill="white" />
                    {maskShape === 'circle' ? (
                      <circle cx="50%" cy="50%" r={cropBoxSize / 2} fill="black" />
                    ) : (
                      <rect
                        x={`calc(50% - ${cropBoxSize / 2}px)`}
                        y={`calc(50% - ${cropBoxSize / 2}px)`}
                        width={cropBoxSize}
                        height={cropBoxSize}
                        rx="24"
                        fill="black"
                      />
                    )}
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.65)" mask="url(#crop-mask)" />
              </svg>

              {/* Crop Boundary Frame & Rule of Thirds Guide */}
              <div
                style={{ width: `${cropBoxSize}px`, height: `${cropBoxSize}px` }}
                className={`absolute pointer-events-none border-2 border-emerald-400/90 shadow-2xl ${
                  maskShape === 'circle' ? 'rounded-full' : 'rounded-3xl'
                }`}
              >
                {/* 3x3 Grid Lines */}
                <div className="w-full h-full relative opacity-25">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
                </div>
              </div>
            </div>

            {/* Helper Floating Badge */}
            <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white/90 text-[10px] font-medium backdrop-blur-xs">
              <Move className="size-3" />
              <span>Geser untuk memposisikan wajah</span>
            </div>

            {/* Mask Toggle (Circle / Square Preview) */}
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 p-1 rounded-full backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setMaskShape('circle')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                  maskShape === 'circle' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                Bulat
              </button>
              <button
                type="button"
                onClick={() => setMaskShape('square')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                  maskShape === 'square' ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                Kotak
              </button>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 space-y-3 bg-slate-50/80 dark:bg-zinc-900/60 border-t border-slate-200 dark:border-zinc-800">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(1, prev - 0.2))}
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              title="Perkecil"
            >
              <ZoomOut className="size-4" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-emerald-500 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              title="Perbesar"
            >
              <ZoomIn className="size-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400 w-10 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Tools & Live Mini Preview */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="h-8 gap-1.5 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                <RotateCw className="size-3.5" />
                <span>Putar 90°</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Reset</span>
              </Button>
            </div>

            {/* Live Mini Preview Avatars */}
            {previewDataUrl && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 hidden sm:inline">
                  Preview:
                </span>
                <img
                  src={previewDataUrl}
                  alt="Round Preview"
                  className="size-8 rounded-full object-cover ring-2 ring-emerald-500/50 shadow-xs"
                />
                <img
                  src={previewDataUrl}
                  alt="Square Preview"
                  className="size-8 rounded-lg object-cover ring-2 ring-slate-300 dark:ring-zinc-700 shadow-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-white dark:bg-[#18181b] border-t border-slate-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="h-9 px-4 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
          >
            <Check className="size-4" />
            <span>Terapkan & Simpan Foto</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
