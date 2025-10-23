#!/usr/bin/env node

/**
 * Icon Generation Script for RecallOS
 * This script generates PNG versions of the SVG icons for better compatibility
 */

const fs = require('fs');
const path = require('path');

// Icon sizes to generate
const sizes = [16, 32, 48, 64, 128, 192, 512];

// SVG template for different sizes - organic molecular network design
const generateIconSVG = (size) => {
  const scale = size / 128;
  const centerX = size / 2;
  const centerY = size / 2;
  const centerRadius = Math.max(2, Math.floor(14 * scale));
  const nodeRadius = Math.max(1, Math.floor(10 * scale));
  const strokeWidth = Math.max(1, Math.floor(8 * scale));
  const detachedRadius = Math.max(1, Math.floor(6 * scale));
  const borderRadius = Math.max(2, Math.floor(20 * scale));
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Soft gradient background -->
  <defs>
    <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#cbd5e1;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#backgroundGradient)"/>
  
  <!-- Central core node -->
  <circle cx="${centerX}" cy="${centerY}" r="${centerRadius}" fill="white" opacity="0.95"/>
  
  <!-- Top node -->
  <circle cx="${centerX}" cy="${Math.floor(32 * scale)}" r="${nodeRadius}" fill="white" opacity="0.9"/>
  <path d="M${centerX} ${Math.floor(42 * scale)}C${centerX} ${Math.floor(42 * scale)} ${centerX} ${Math.floor(50 * scale)} ${centerX} ${Math.floor(54 * scale)}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.8"/>
  
  <!-- Bottom node -->
  <circle cx="${centerX}" cy="${Math.floor(96 * scale)}" r="${nodeRadius}" fill="white" opacity="0.9"/>
  <path d="M${centerX} ${Math.floor(86 * scale)}C${centerX} ${Math.floor(86 * scale)} ${centerX} ${Math.floor(78 * scale)} ${centerX} ${Math.floor(74 * scale)}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.8"/>
  
  <!-- Left node -->
  <circle cx="${Math.floor(32 * scale)}" cy="${centerY}" r="${nodeRadius}" fill="white" opacity="0.9"/>
  <path d="M${Math.floor(42 * scale)} ${centerY}C${Math.floor(42 * scale)} ${centerY} ${Math.floor(50 * scale)} ${centerY} ${Math.floor(54 * scale)} ${centerY}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.8"/>
  
  <!-- Right node -->
  <circle cx="${Math.floor(96 * scale)}" cy="${centerY}" r="${nodeRadius}" fill="white" opacity="0.9"/>
  <path d="M${Math.floor(86 * scale)} ${centerY}C${Math.floor(86 * scale)} ${centerY} ${Math.floor(78 * scale)} ${centerY} ${Math.floor(74 * scale)} ${centerY}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.8"/>
  
  <!-- Detached smaller node (offset to the right) -->
  <circle cx="${Math.floor(100 * scale)}" cy="${Math.floor(28 * scale)}" r="${detachedRadius}" fill="white" opacity="0.7"/>
  
  <!-- Subtle organic connections between nodes -->
  <path d="M${centerX} ${Math.floor(32 * scale)}C${Math.floor(70 * scale)} ${Math.floor(38 * scale)} ${Math.floor(70 * scale)} ${Math.floor(50 * scale)} ${centerX} ${Math.floor(54 * scale)}" stroke="white" stroke-width="${Math.max(1, Math.floor(3 * scale))}" stroke-linecap="round" opacity="0.4" fill="none"/>
  <path d="M${Math.floor(32 * scale)} ${centerY}C${Math.floor(38 * scale)} ${Math.floor(58 * scale)} ${Math.floor(50 * scale)} ${Math.floor(58 * scale)} ${Math.floor(54 * scale)} ${centerY}" stroke="white" stroke-width="${Math.max(1, Math.floor(3 * scale))}" stroke-linecap="round" opacity="0.4" fill="none"/>
  <path d="M${Math.floor(96 * scale)} ${centerY}C${Math.floor(90 * scale)} ${Math.floor(70 * scale)} ${Math.floor(78 * scale)} ${Math.floor(70 * scale)} ${Math.floor(74 * scale)} ${centerY}" stroke="white" stroke-width="${Math.max(1, Math.floor(3 * scale))}" stroke-linecap="round" opacity="0.4" fill="none"/>
  <path d="M${centerX} ${Math.floor(96 * scale)}C${Math.floor(58 * scale)} ${Math.floor(90 * scale)} ${Math.floor(58 * scale)} ${Math.floor(78 * scale)} ${centerX} ${Math.floor(74 * scale)}" stroke="white" stroke-width="${Math.max(1, Math.floor(3 * scale))}" stroke-linecap="round" opacity="0.4" fill="none"/>
</svg>`;
};

// Generate icons for client
const clientDir = path.join(__dirname, 'client', 'public');
if (!fs.existsSync(clientDir)) {
  fs.mkdirSync(clientDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = generateIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(clientDir, filename), svg);
  console.log(`Generated ${filename}`);
});

// Generate icons for extension
const extensionDir = path.join(__dirname, 'extension', 'public');
if (!fs.existsSync(extensionDir)) {
  fs.mkdirSync(extensionDir, { recursive: true });
}

sizes.forEach(size => {
  const svg = generateIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(extensionDir, filename), svg);
  console.log(`Generated ${filename}`);
});

console.log('✅ All icons generated successfully!');
console.log('\n📁 Generated files:');
console.log('   Client: /client/public/icon-*.svg');
console.log('   Extension: /extension/public/icon-*.svg');
console.log('\n🎨 Icon design:');
console.log('   - Soft gradient background (deep cobalt blue to pale blue-gray)');
console.log('   - Organic molecular network shape');
console.log('   - Central core node with 4 radiating nodes');
console.log('   - Curved organic connections');
console.log('   - Detached smaller node (offset right)');
console.log('   - Subtle organic connection lines');
