export const MAX_PROFILE_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_PROFILE_UPLOAD_BYTES = 200 * 1024;

export interface CropTransform {
  zoom: number;
  rotation: number;
  x: number;
  y: number;
}

export function cropGeometry(imageWidth: number, imageHeight: number, width: number, height: number, transform: CropTransform) {
  const rotated = transform.rotation % 180 !== 0;
  const rotatedWidth = rotated ? imageHeight : imageWidth;
  const rotatedHeight = rotated ? imageWidth : imageHeight;
  const zoom = Math.min(3, Math.max(1, transform.zoom));
  const scale = Math.max(width / rotatedWidth, height / rotatedHeight) * zoom;
  const maxX = Math.max(0, (rotatedWidth * scale - width) / 2);
  const maxY = Math.max(0, (rotatedHeight * scale - height) / 2);
  return {
    ...transform, zoom, scale,
    x: Math.min(maxX, Math.max(-maxX, transform.x)),
    y: Math.min(maxY, Math.max(-maxY, transform.y)),
  };
}

export function drawProfileCrop(image: HTMLImageElement, width: number, height: number, transform: CropTransform, outputWidth: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(outputWidth);
  canvas.height = Math.round(outputWidth * height / width);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser tidak dapat memproses foto. Coba browser lain.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  const geometry = cropGeometry(image.naturalWidth, image.naturalHeight, width, height, transform);
  const ratio = canvas.width / width;
  context.translate(canvas.width / 2 + geometry.x * ratio, canvas.height / 2 + geometry.y * ratio);
  context.rotate(geometry.rotation * Math.PI / 180);
  context.scale(geometry.scale * ratio, geometry.scale * ratio);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return canvas;
}

export function loadProfileImage(source: string): Promise<HTMLImageElement> {
  let url = source;
  if (/^https?:\/\//i.test(source)) {
    const parsed = new URL(source);
    if (parsed.hostname === 'drive.google.com') {
      const id = parsed.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || parsed.searchParams.get('id');
      if (id) url = `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`;
    }
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
      reject(new Error('Foto terlalu lama dimuat. Coba lagi atau unggah file aslinya.'));
    }, 15_000);
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      clearTimeout(timeout);
      image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve(image) : reject(new Error('Ukuran gambar tidak valid.'));
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Foto tidak dapat dibuka untuk crop. Jika foto tersimpan di Drive, unggah kembali file JPG, PNG, atau WebP aslinya.'));
    };
    image.src = url;
  });
}

export async function compressProfileCanvas(canvas: HTMLCanvasElement, maxBytes = MAX_PROFILE_UPLOAD_BYTES): Promise<Blob> {
  const encode = (quality: number) => new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Gagal mengompresi foto. Silakan coba lagi.')), 'image/jpeg', quality);
    } catch {
      reject(new Error('Foto ini tidak mengizinkan pemrosesan. Unggah file aslinya untuk melakukan crop.'));
    }
  });
  for (let sizeAttempt = 0; sizeAttempt < 6; sizeAttempt++) {
    for (const quality of [0.85, 0.75, 0.65, 0.55]) {
      const blob = await encode(quality);
      if (blob.size <= maxBytes) return blob;
    }
    const smaller = document.createElement('canvas');
    smaller.width = Math.max(1, Math.round(canvas.width * 0.8));
    smaller.height = Math.max(1, Math.round(canvas.height * 0.8));
    const context = smaller.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat mengompresi foto.');
    context.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    canvas = smaller;
  }
  throw new Error('Foto belum dapat diperkecil hingga 200 KB. Pilih foto lain.');
}

export async function prepareProfileImage(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Pilih foto dalam format JPG, PNG, atau WebP.');
  if (file.size > MAX_PROFILE_SOURCE_BYTES) throw new Error('Ukuran foto asli maksimal 20 MB.');
  let bitmap: ImageBitmap | null = null;
  let objectUrl = '';
  try {
    let source: ImageBitmap | HTMLImageElement;
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      source = bitmap;
    } else {
      objectUrl = URL.createObjectURL(file);
      source = await loadProfileImage(objectUrl);
    }
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height) throw new Error('File gambar tidak valid.');
    const scale = Math.min(1, 1600 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Browser tidak dapat memproses foto.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return await compressProfileCanvas(canvas, 1024 * 1024);
  } catch (error) {
    if (error instanceof DOMException) throw new Error('File foto tidak dapat dibaca. Pilih file JPG, PNG, atau WebP yang valid.');
    throw error;
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export function profileBlobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca hasil kompresi foto.'));
    reader.readAsDataURL(blob);
  });
}
