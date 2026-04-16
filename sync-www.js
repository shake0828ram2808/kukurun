#!/usr/bin/env node
// Webアセットをルートから www/ へコピーする
// Capacitor の webDir: "www" に対応するためのスクリプト

const fs = require('fs');
const path = require('path');

const WEB_FILES = [
  'index.html',
  'app.js',
  'app.css',
  'kukurun.js',
  'questions.js',
  'sprites.js',
  'medals.js',
  'kana.json',
  'kana_hoka.json',
  'messages.json',
  'manifest.json',
  'sw.js',
  'privacy.html',
];

fs.mkdirSync('www', { recursive: true });
fs.mkdirSync('www/sprites', { recursive: true });
fs.mkdirSync('www/icons', { recursive: true });

for (const file of WEB_FILES) {
  fs.copyFileSync(file, path.join('www', file));
}

// sprites/ 以下の画像をコピー
for (const file of fs.readdirSync('sprites')) {
  if (file.endsWith('.png')) {
    fs.copyFileSync(path.join('sprites', file), path.join('www/sprites', file));
  }
}

// icons/ 以下をコピー
for (const file of fs.readdirSync('icons')) {
  fs.copyFileSync(path.join('icons', file), path.join('www/icons', file));
}

console.log('✓ www/ へ同期しました');
