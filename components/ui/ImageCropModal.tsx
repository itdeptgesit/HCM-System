import React, { useEffect, useRef, useState } from 'react';
import { Check, Crop, Move, RefreshCw, RotateCw, ZoomIn, ZoomOut } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { compressProfileCanvas, cropGeometry, drawProfileCrop, loadProfileImage, profileBlobDataUrl, type CropTransform } from '@/lib/profileImage';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void | Promise<void>;
  title?: string;
  aspectRatio?: number;
  outputSize?: number;
}

const centered: CropTransform = { zoom: 1, rotation: 0, x: 0, y: 0 };

export const ImageCropModal: React.FC<ImageCropModalProps> = ({ isOpen, imageSrc, onClose, onCropComplete, title = 'Sesuaikan & Crop Foto Profil', aspectRatio = 1, outputSize = 512 }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<CropTransform>(centered);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState('');
  const [maskShape, setMaskShape] = useState<'square' | 'circle'>('square');
  const [frameWidth, setFrameWidth] = useState(280);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointer: number; x: number; y: number; transform: CropTransform } | null>(null);
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const width = Math.min(280, frameWidth) * Math.min(1, ratio);
  const height = width / ratio;

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setImage(null);
    setError('');
    setPreview('');
    setTransform(centered);
    setMaskShape('square');
    loadProfileImage(imageSrc).then(loaded => { if (active) setImage(loaded); })
      .catch(reason => { if (active) setError(reason.message || 'Foto tidak dapat dimuat.'); });
    return () => { active = false; dragRef.current = null; };
  }, [isOpen, imageSrc]);

  useEffect(() => {
    if (!isOpen || !stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(Math.max(1, entry.contentRect.width - 32)));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  const constrain = (next: CropTransform) => image ? cropGeometry(image.naturalWidth, image.naturalHeight, width, height, next) : next;
  const changeZoom = (delta: number) => setTransform(previous => constrain({ ...previous, zoom: previous.zoom + delta }));

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    try {
      const rendered = drawProfileCrop(image, width, height, transform, Math.round(width * Math.min(window.devicePixelRatio || 1, 2)));
      const canvas = canvasRef.current;
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Browser tidak dapat menampilkan crop foto.');
      context.drawImage(rendered, 0, 0);
      setPreview(drawProfileCrop(image, width, height, transform, 120).toDataURL('image/jpeg', 0.8));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Gagal menampilkan pratinjau crop.');
    }
  }, [image, width, height, transform]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!isOpen || !stage) return;
    const wheel = (event: WheelEvent) => {
      if (!image || applying) return;
      event.preventDefault();
      setTransform(previous => cropGeometry(image.naturalWidth, image.naturalHeight, width, height, { ...previous, zoom: previous.zoom + (event.deltaY < 0 ? 0.1 : -0.1) }));
    };
    stage.addEventListener('wheel', wheel, { passive: false });
    return () => stage.removeEventListener('wheel', wheel);
  }, [isOpen, image, applying, width, height]);

  const apply = async () => {
    if (!image || applying || error) return;
    setApplying(true);
    try {
      const canvas = drawProfileCrop(image, width, height, transform, Math.min(1600, Math.max(128, outputSize)));
      const blob = await compressProfileCanvas(canvas);
      await onCropComplete(blob, await profileBlobDataUrl(blob));
      onClose();
    } catch (reason) {
      // Upload can be retried without losing the chosen crop.
      setError(reason instanceof Error ? reason.message : 'Gagal menyimpan foto. Coba lagi.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !applying) onClose(); }}>
      <DialogContent showCloseButton={false} className="flex max-h-[92dvh] flex-col gap-0 overflow-y-auto bg-white p-0 dark:bg-[#18181b]">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-zinc-800">
          <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">{title}</DialogTitle>
          <DialogDescription className="mt-1 text-xs text-slate-600 dark:text-slate-400">Geser foto, atur zoom, lalu simpan. Hasil JPG otomatis dikompresi maksimal 200 KB.</DialogDescription>
        </div>
        <div
          ref={stageRef}
          role="group"
          aria-label="Area crop foto"
          tabIndex={image && !applying ? 0 : -1}
          onKeyDown={event => {
            const offsets: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
            const offset = offsets[event.key];
            if (offset && image && !applying) {
              event.preventDefault();
              setTransform(previous => constrain({ ...previous, x: previous.x + offset[0], y: previous.y + offset[1] }));
            }
          }}
          onPointerDown={event => {
            if (!image || applying) return;
            event.preventDefault();
            dragRef.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, transform: constrain(transform) };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const drag = dragRef.current;
            if (!drag || drag.pointer !== event.pointerId) return;
            setTransform(constrain({ ...drag.transform, x: drag.transform.x + event.clientX - drag.x, y: drag.transform.y + event.clientY - drag.y }));
          }}
          onPointerUp={event => { dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={() => { dragRef.current = null; }}
          className="relative flex min-h-[312px] shrink-0 touch-none select-none items-center justify-center bg-slate-950 p-4 outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-blue-400 cursor-grab active:cursor-grabbing"
        >
          {!image && !error && <p role="status" className="text-sm text-white">Memuat foto...</p>}
          <canvas ref={canvasRef} aria-label="Pratinjau crop foto" className={`max-w-full border-2 border-emerald-400 ${maskShape === 'circle' ? 'rounded-full' : ''} ${!image ? 'hidden' : ''}`} style={{ width, height }} />
        </div>
        <div className="space-y-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"><Move className="size-4" /> Geser foto atau gunakan tombol panah.</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" className="size-11" aria-label="Perkecil" onClick={() => changeZoom(-0.2)} disabled={!image || applying || transform.zoom <= 1}><ZoomOut className="size-4" /></Button>
            <input aria-label="Zoom foto" type="range" min="1" max="3" step="0.05" value={transform.zoom} disabled={!image || applying} onChange={event => setTransform(previous => constrain({ ...previous, zoom: Number(event.target.value) }))} className="min-w-0 flex-1 accent-emerald-600 focus-visible:outline-2 focus-visible:outline-blue-600" />
            <Button type="button" variant="ghost" className="size-11" aria-label="Perbesar" onClick={() => changeZoom(0.2)} disabled={!image || applying || transform.zoom >= 3}><ZoomIn className="size-4" /></Button>
            <span className="w-10 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{Math.round(transform.zoom * 100)}%</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setTransform(previous => constrain({ ...previous, rotation: (previous.rotation + 90) % 360 }))} disabled={!image || applying}><RotateCw className="size-4" /> Putar 90°</Button>
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setTransform(centered)} disabled={!image || applying}><RefreshCw className="size-4" /> Reset</Button>
            {preview && <img src={preview} alt="Hasil crop" className={`ml-auto size-11 object-cover ${maskShape === 'circle' ? 'rounded-full' : 'rounded-lg'}`} />}
          </div>
          <div className="flex items-center gap-2 text-xs">
            {(['square', 'circle'] as const).map(shape => <Button key={shape} type="button" variant={maskShape === shape ? 'secondary' : 'ghost'} className="min-h-11" aria-pressed={maskShape === shape} disabled={applying} onClick={() => setMaskShape(shape)}>{shape === 'square' ? <Crop className="size-4" /> : null}{shape === 'square' ? 'Kotak' : 'Bulat'}</Button>)}
            <span className="text-slate-600 dark:text-slate-400">Bulat hanya untuk pratinjau.</span>
          </div>
          {error && <div role="alert" className="text-sm text-rose-700 dark:text-rose-300"><p>{error}</p>{image && <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => setError('')}>Coba lagi</Button>}</div>}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-zinc-800">
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={applying}>Batal</Button>
          <Button type="button" className="min-h-11 bg-emerald-700 text-white hover:bg-emerald-800" onClick={apply} disabled={!image || applying || Boolean(error)}><Check className="size-4" />{applying ? 'Memproses & menyimpan...' : 'Terapkan & Simpan Foto'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropModal;
