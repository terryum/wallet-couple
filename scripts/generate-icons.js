/**
 * PWA 아이콘 생성 스크립트
 * 간단한 지갑 아이콘을 여러 사이즈로 생성합니다.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const outputDir = path.join(__dirname, '../public/icons');

// 지갑 아이콘 SVG (Toss 블루 색상)
const createWalletSVG = (size) => {
  const padding = Math.floor(size * 0.15);
  const iconSize = size - padding * 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 -->
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.2)}" fill="#3182F6"/>

  <!-- 지갑 본체 -->
  <g transform="translate(${padding}, ${padding})">
    <!-- 지갑 몸체 -->
    <rect
      x="${iconSize * 0.1}"
      y="${iconSize * 0.25}"
      width="${iconSize * 0.8}"
      height="${iconSize * 0.55}"
      rx="${iconSize * 0.08}"
      fill="white"
    />

    <!-- 지갑 덮개 -->
    <rect
      x="${iconSize * 0.1}"
      y="${iconSize * 0.2}"
      width="${iconSize * 0.8}"
      height="${iconSize * 0.25}"
      rx="${iconSize * 0.08}"
      fill="white"
      opacity="0.9"
    />

    <!-- 카드 슬롯 -->
    <rect
      x="${iconSize * 0.55}"
      y="${iconSize * 0.45}"
      width="${iconSize * 0.25}"
      height="${iconSize * 0.15}"
      rx="${iconSize * 0.03}"
      fill="#3182F6"
      opacity="0.6"
    />

    <!-- 동전 원 -->
    <circle
      cx="${iconSize * 0.3}"
      cy="${iconSize * 0.55}"
      r="${iconSize * 0.1}"
      fill="#3182F6"
      opacity="0.4"
    />
  </g>
</svg>`;
};

async function generateIcons() {
  // 출력 디렉토리 확인
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('PWA 아이콘 생성 시작...');

  for (const size of sizes) {
    const svg = createWalletSVG(size);
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  ✓ icon-${size}x${size}.png 생성 완료`);
  }

  // Apple Touch Icon (180x180)
  const appleSvg = createWalletSVG(180);
  await sharp(Buffer.from(appleSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('  ✓ apple-touch-icon.png 생성 완료');

  // Favicon (32x32)
  const faviconSvg = createWalletSVG(32);
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(outputDir, 'favicon-32x32.png'));
  console.log('  ✓ favicon-32x32.png 생성 완료');

  // Favicon ICO (16x16)
  const favicon16Svg = createWalletSVG(16);
  await sharp(Buffer.from(favicon16Svg))
    .resize(16, 16)
    .png()
    .toFile(path.join(outputDir, 'favicon-16x16.png'));
  console.log('  ✓ favicon-16x16.png 생성 완료');

  console.log('\n모든 아이콘 생성 완료!');
}

generateIcons().catch(console.error);
