import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.HR_QA_URL || 'http://127.0.0.1:3016';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
let checks = 0;
let maxUploadedBytes = 0;
try {
  for (const width of [1440, 390]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }));
      let uploaded;
      let failUpload = false;
      let rejectRemote = false;
      let png;
      let uploadCount = 0;
      const driveUrls = [];
      await page.route('https://drive.google.com/**', async route => {
        driveUrls.push(route.request().url());
        await route.fulfill(rejectRemote ? { status: 403, body: 'TEST denied' } : { contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: png });
      });
      await page.route('https://example.invalid/test-avatar.jpg', route => route.fulfill({ contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: png }));
      await page.route('**/functions/v1/upload-to-gdrive', async route => {
        uploaded = route.request().postDataJSON();
        uploadCount++;
        await route.fulfill({ json: failUpload ? { success: false, error: 'TEST upload failed' } : { success: true, fileUrl: 'https://example.invalid/test-avatar.jpg' } });
      });
      await page.goto(`${base}/tests/ui/avatar-crop.html`);
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), dark);
      const original = await page.locator('img[alt="TEST Employee"]').getAttribute('src');
      png = Buffer.from(original.split(',')[1], 'base64');
      const cropButton = page.getByRole('button', { name: 'Crop / Sesuaikan', exact: true });
      const dialog = page.getByRole('dialog', { name: 'Crop & Posisikan Foto Profil Karyawan', exact: true });
      const apply = dialog.getByRole('button', { name: 'Terapkan & Simpan Foto', exact: true });
      const waitPreview = async () => {
        await dialog.getByAltText('Hasil crop', { exact: true }).waitFor();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      };
      const checkUploaded = async () => {
        assert.ok(uploaded);
        const size = Buffer.from(uploaded.fileBase64, 'base64').length;
        maxUploadedBytes = Math.max(maxUploadedBytes, size);
        assert.ok(size <= 200 * 1024, `Upload too large: ${size}`);
        assert.equal(uploaded.fileMimeType, 'image/jpeg');
        const image = await page.evaluate(async base64 => {
          const image = new Image();
          image.src = `data:image/jpeg;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d');
          context.drawImage(image, 0, 0);
          const pixels = [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].map(([x, y]) => [...context.getImageData(Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data]);
          return { width: image.naturalWidth, height: image.naturalHeight, pixels };
        }, uploaded.fileBase64);
        assert.ok(image.width <= 512 && image.width === image.height);
        return image;
      };

      await cropButton.click();
      await waitPreview();
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 900);
      await dialog.getByRole('slider', { name: 'Zoom foto' }).fill('2');
      const stage = dialog.getByRole('group', { name: 'Area crop foto', exact: true });
      const stageBox = await stage.boundingBox();
      await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(stageBox.x + stageBox.width + 100, stageBox.y + stageBox.height + 100);
      await page.mouse.up();
      await dialog.getByRole('button', { name: 'Putar 90°', exact: true }).click();
      await dialog.getByRole('button', { name: 'Bulat', exact: true }).click();
      await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
      await page.mouse.wheel(0, -100);
      await stage.focus();
      await page.keyboard.press('ArrowLeft');
      await waitPreview();
      const visiblePixels = await dialog.locator('canvas').evaluate(canvas => {
        const context = canvas.getContext('2d');
        return [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].map(([x, y]) => [...context.getImageData(Math.floor(x * canvas.width), Math.floor(y * canvas.height), 1, 1).data]);
      });
      if (process.env.HR_QA_SCREENSHOTS) await page.screenshot({ path: `${process.env.HR_QA_SCREENSHOTS}/avatar-crop-${width}-${dark ? 'dark' : 'light'}.png` });
      await apply.click();
      await dialog.waitFor({ state: 'hidden' });
      const image = await checkUploaded();
      for (let i = 0; i < image.pixels.length; i++) {
        for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(image.pixels[i][channel] - visiblePixels[i][channel]) < 20, 'Saved crop differs from the visible crop');
        assert.ok(image.pixels[i].some((value, channel) => channel < 3 && value > 80), 'Empty black area in crop');
        assert.ok(image.pixels[i].some((value, channel) => channel < 3 && value < 160), 'Blank white area in crop');
      }
      assert.equal(await page.getByRole('dialog', { name: 'Edit Data Employee', exact: true }).isVisible(), true);
      checks += 8;

      // A 15 MB source goes through the real file-selection/compression/upload path.
      const largePng = Buffer.from(await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 3200;
        canvas.height = 1600;
        const context = canvas.getContext('2d');
        context.fillStyle = '#e04040'; context.fillRect(0, 0, 1600, 1600);
        context.fillStyle = '#3050d0'; context.fillRect(1600, 0, 1600, 1600);
        return canvas.toDataURL('image/png').split(',')[1];
      }), 'base64');
      const fifteenMB = Buffer.concat([largePng, Buffer.alloc(15 * 1024 * 1024 - largePng.length)]);
      await page.locator('input[type="file"]').first().setInputFiles({ name: 'TEST-original-15MB.png', mimeType: 'image/png', buffer: fifteenMB });
      await waitPreview();
      await dialog.getByRole('button', { name: 'Perbesar', exact: true }).click();
      await dialog.getByRole('button', { name: 'Perkecil', exact: true }).click();
      await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
      await apply.click();
      await dialog.waitFor({ state: 'hidden' });
      await checkUploaded();
      checks += 4;

      // Failure must restore the stored avatar and allow retrying the same crop.
      failUpload = true;
      await cropButton.click();
      await waitPreview();
      await apply.click();
      await dialog.getByRole('alert').getByText('TEST upload failed', { exact: true }).waitFor();
      assert.equal(await page.locator('img[alt="TEST Employee"]').getAttribute('src'), 'https://example.invalid/test-avatar.jpg');
      failUpload = false;
      await dialog.getByRole('button', { name: 'Coba lagi', exact: true }).click();
      await apply.click();
      await dialog.waitFor({ state: 'hidden' });
      await cropButton.click();
      await waitPreview();
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await cropButton.evaluate(element => document.activeElement === element), true);
      checks += 4;

      await page.goto(`${base}/tests/ui/avatar-crop.html?remote`);
      await page.getByRole('button', { name: 'Crop / Sesuaikan', exact: true }).click();
      await waitPreview();
      assert.ok(driveUrls.some(url => url.includes('/thumbnail?') && url.includes('sz=w1600')));
      await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      rejectRemote = true;
      await page.goto(`${base}/tests/ui/avatar-crop.html?remote=TEST_DENIED_ID`);
      await page.getByRole('button', { name: 'Crop / Sesuaikan', exact: true }).click();
      await dialog.getByRole('alert').waitFor();
      assert.equal(await apply.isDisabled(), true);
      await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      const beforeInvalid = uploadCount;
      await page.locator('input[type="file"]').first().setInputFiles({ name: 'TEST.txt', mimeType: 'text/plain', buffer: Buffer.from('TEST not an image') });
      await page.getByRole('alert').getByText('Pilih foto dalam format JPG, PNG, atau WebP.', { exact: true }).waitFor();
      await page.locator('input[type="file"]').first().setInputFiles({ name: 'TEST-corrupt.png', mimeType: 'image/png', buffer: Buffer.from('TEST corrupt image') });
      await page.getByRole('alert').getByText('File foto tidak dapat dibaca.', { exact: false }).waitFor();
      assert.equal(uploadCount, beforeInvalid);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      checks += 7;

      await page.goto(`${base}/tests/ui/avatar-crop.html?profile`);
      await page.getByRole('button', { name: 'Crop & Sesuaikan Posisi Foto', exact: true }).click();
      const profileDialog = page.getByRole('dialog', { name: 'Sesuaikan & Crop Foto Profil Anda', exact: true });
      await profileDialog.getByAltText('Hasil crop', { exact: true }).waitFor();
      await profileDialog.getByRole('button', { name: 'Terapkan & Simpan Foto', exact: true }).click();
      await profileDialog.waitFor({ state: 'hidden' });
      await checkUploaded();
      checks += 2;
      if (width === 1440 && !dark) {
        const compressedNoise = await page.evaluate(async () => {
          const { compressProfileCanvas } = await import('/lib/profileImage.ts');
          const canvas = document.createElement('canvas');
          canvas.width = 1200; canvas.height = 1200;
          const context = canvas.getContext('2d');
          const pixels = context.createImageData(1200, 1200);
          let seed = 12345;
          for (let i = 0; i < pixels.data.length; i += 4) {
            for (let channel = 0; channel < 3; channel++) {
              seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
              pixels.data[i + channel] = seed >>> 24;
            }
            pixels.data[i + 3] = 255;
          }
          context.putImageData(pixels, 0, 0);
          const original = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 1));
          const compressed = await compressProfileCanvas(canvas);
          return { original: original.size, compressed: compressed.size };
        });
        assert.ok(compressedNoise.original > 200 * 1024);
        assert.ok(compressedNoise.compressed <= 200 * 1024);
        checks += 2;
      }
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, checks, sourceBytes: 15 * 1024 * 1024, maxUploadedBytes, pageErrors: errors }));
} finally {
  await browser.close();
}
