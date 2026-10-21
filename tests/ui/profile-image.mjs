import assert from 'node:assert/strict';
import { cropGeometry, MAX_PROFILE_SOURCE_BYTES, MAX_PROFILE_UPLOAD_BYTES } from '../../lib/profileImage.ts';

for (const [imageWidth, imageHeight] of [[1200, 600], [600, 1200], [200, 200], [1600, 900]]) {
  for (const rotation of [0, 90, 180, 270]) {
    for (const zoom of [0, 1, 2, 3, 10]) {
      for (const [width, height] of [[280, 280], [240, 160], [140, 280]]) {
        const result = cropGeometry(imageWidth, imageHeight, width, height, { rotation, zoom, x: 99999, y: -99999 });
        assert.ok(result.zoom >= 1 && result.zoom <= 3);
        const rotatedWidth = rotation % 180 ? imageHeight : imageWidth;
        const rotatedHeight = rotation % 180 ? imageWidth : imageHeight;
        assert.ok(result.x + width / 2 <= rotatedWidth * result.scale / 2 + 0.0001);
        assert.ok(-result.y + height / 2 <= rotatedHeight * result.scale / 2 + 0.0001);
      }
    }
  }
}
assert.equal(MAX_PROFILE_SOURCE_BYTES, 20 * 1024 * 1024);
assert.equal(MAX_PROFILE_UPLOAD_BYTES, 200 * 1024);
console.log('PASS: 240 crop geometry cases, rotation/aspect/zoom/pan bounds, 20 MB input and 200 KB output limits.');
