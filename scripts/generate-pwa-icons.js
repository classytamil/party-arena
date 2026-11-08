const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 512x512 SVG for Party Arena
const svgStandard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="40%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#4f46e5" />
    </linearGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#818cf8" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Background with smooth rounded corners -->
  <rect width="512" height="512" rx="112" fill="url(#bgGradient)" />

  <!-- Subtle inner border highlight -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.15" />

  <!-- Center Group with Drop Shadow -->
  <g filter="url(#shadow)">
    <!-- Gamepad Body -->
    <path d="M160 210 C 130 210, 95 240, 95 295 C 95 345, 125 385, 165 385 C 185 385, 205 365, 225 345 L 287 345 C 307 365, 327 385, 347 385 C 387 385, 417 345, 417 295 C 417 240, 382 210, 352 210 Z" fill="#ffffff" />
    
    <!-- Directional Pad (Left) -->
    <rect x="152" y="262" width="18" height="56" rx="6" fill="#2563eb" />
    <rect x="133" y="281" width="56" height="18" rx="6" fill="#2563eb" />

    <!-- Action Buttons (Right) - 4 Colorful Dots -->
    <circle cx="335" cy="273" r="10" fill="#ef4444" />
    <circle cx="362" cy="290" r="10" fill="#10b981" />
    <circle cx="335" cy="307" r="10" fill="#3b82f6" />
    <circle cx="308" cy="290" r="10" fill="#f59e0b" />

    <!-- Center Arena Spark / Crown -->
    <polygon points="256,128 274,178 328,180 284,212 300,264 256,232 212,264 228,212 184,180 238,178" fill="url(#goldGradient)" />
  </g>

  <!-- Modern Floating Game Elements (Dice / Dots) -->
  <circle cx="100" cy="110" r="16" fill="url(#accentGradient)" opacity="0.8" />
  <circle cx="140" cy="100" r="10" fill="url(#goldGradient)" opacity="0.9" />
  <circle cx="410" cy="110" r="14" fill="url(#accentGradient)" opacity="0.8" />
  <circle cx="380" cy="90" r="8" fill="#ffffff" opacity="0.6" />

  <!-- Bottom Brand Text Accent -->
  <text x="256" y="440" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="4" opacity="0.95">PARTY ARENA</text>
</svg>`;

// Maskable icon with safe zone (no rounded corners, larger bleed area)
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="40%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#4f46e5" />
    </linearGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <!-- Full bleed background for maskable safe zone -->
  <rect width="512" height="512" fill="url(#bgGradient)" />

  <!-- Content scaled within safe inner 80% circle (center 410px) -->
  <g transform="translate(51, 51) scale(0.8)">
    <path d="M160 210 C 130 210, 95 240, 95 295 C 95 345, 125 385, 165 385 C 185 385, 205 365, 225 345 L 287 345 C 307 365, 327 385, 347 385 C 387 385, 417 345, 417 295 C 417 240, 382 210, 352 210 Z" fill="#ffffff" />
    <rect x="152" y="262" width="18" height="56" rx="6" fill="#2563eb" />
    <rect x="133" y="281" width="56" height="18" rx="6" fill="#2563eb" />
    <circle cx="335" cy="273" r="10" fill="#ef4444" />
    <circle cx="362" cy="290" r="10" fill="#10b981" />
    <circle cx="335" cy="307" r="10" fill="#3b82f6" />
    <circle cx="308" cy="290" r="10" fill="#f59e0b" />
    <polygon points="256,128 274,178 328,180 284,212 300,264 256,232 212,264 228,212 184,180 238,178" fill="url(#goldGradient)" />
    <text x="256" y="440" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="4" opacity="0.95">PARTY ARENA</text>
  </g>
</svg>`;

async function generate() {
  const bufStandard = Buffer.from(svgStandard);
  const bufMaskable = Buffer.from(svgMaskable);

  // 1. icon-512x512.png
  await sharp(bufStandard).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('✓ Generated icon-512x512.png');

  // 2. icon-192x192.png
  await sharp(bufStandard).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192x192.png'));
  console.log('✓ Generated icon-192x192.png');

  // 3. maskable-icon-512x512.png
  await sharp(bufMaskable).resize(512, 512).png().toFile(path.join(iconsDir, 'maskable-icon-512x512.png'));
  console.log('✓ Generated maskable-icon-512x512.png');

  // 4. apple-touch-icon.png (180x180)
  await sharp(bufStandard).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png');

  // 5. favicon-32x32.png
  await sharp(bufStandard).resize(32, 32).png().toFile(path.join(iconsDir, 'favicon-32x32.png'));
  console.log('✓ Generated favicon-32x32.png');

  // Also save the SVG for vector icon usage
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgStandard);
  console.log('✓ Generated icon.svg');
}

generate().catch(console.error);
