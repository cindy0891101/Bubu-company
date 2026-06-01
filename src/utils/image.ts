/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resizes and compresses an uploaded image file down to a lightweight Base64 string
 * to save space and speed up real-time multi-browser updates.
 */
export function compressImageFile(file: File, maxWidth = 120, maxHeight = 120, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Keep Aspect Ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context creation failed'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as low-res JPEG URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Elegant set of cute preset hand-drawn cartoon avatars
 * to populate initial friend cards instantly.
 */
export const PRESET_AVATARS = [
  "🐶", "🐱", "🐭", "🐹", "🐰", 
  "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", 
  "🐯", "🦁", "🐮", "🐷", "🐸", 
  "🐙", "🐵", "🦄", "🐣", "🐝"
];

export const CATEGORIES = [
  { name: '伙食', icon: '🍽️', color: 'bg-orange-100 border-orange-300' },
  { name: '交通', icon: '🚗', color: 'bg-blue-100 border-blue-300' },
  { name: '辦公', icon: '💻', color: 'bg-green-100 border-green-300' },
  { name: '營運', icon: '⚡', color: 'bg-amber-100 border-amber-300' },
  { name: '娛樂', icon: '🎉', color: 'bg-purple-100 border-purple-300' },
  { name: '租金', icon: '🏠', color: 'bg-rose-100 border-rose-300' },
  { name: '其他', icon: '📦', color: 'bg-slate-100 border-slate-300' }
];

export const DEPARTMENTS = ["財務", "營運", "設計", "技術", "一般"];
