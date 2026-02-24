#!/usr/bin/env node
/**
 * Build and run the iOS app on the simulator only (no code signing).
 * Usage: npm run ios:simulator
 * Ensure Metro is running in another terminal (npm start) or start it first.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const iosDir = path.join(root, 'ios');
const workspace = path.join(iosDir, 'DocTrust.xcworkspace');
const scheme = 'DocTrust';
const bundleId = 'com.anonymous.ai-lawyer';
// Use derived data path without spaces to avoid Xcode script invocation errors (project path may contain spaces)
const derivedDataPath = path.join(require('os').tmpdir(), 'DocTrust-iOS-Build');
const appPath = path.join(derivedDataPath, 'Build', 'Products', 'Debug-iphonesimulator', 'DocTrust.app');

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: root, ...opts });
  if (result.status !== 0) process.exit(result.status || 1);
}

// Get booted simulator or first available iPhone simulator
function getSimulatorName() {
  try {
    const out = execSync('xcrun simctl list devices available', { encoding: 'utf8', cwd: root });
    const lines = out.split('\n');
    for (const line of lines) {
      if (line.includes('(Booted)') && line.includes('iPhone')) {
        const m = line.match(/^\s*(iPhone[^(]+)/);
        if (m) return m[1].trim();
      }
    }
    for (const line of lines) {
      if (line.includes('iPhone') && !line.includes('unavailable')) {
        const m = line.match(/^\s*(iPhone[^(]+)/);
        if (m) return m[1].trim();
      }
    }
  } catch (_) {}
  return 'iPhone 16e';
}

const deviceName = getSimulatorName();
const destination = `platform=iOS Simulator,name=${deviceName}`;

console.log('Building for iOS Simulator:', deviceName);
console.log('Destination:', destination);

run(
  `xcodebuild -workspace "${workspace}" -scheme "${scheme}" -configuration Debug -destination "${destination}" -derivedDataPath "${derivedDataPath}" build`,
  { cwd: iosDir }
);

if (!fs.existsSync(appPath)) {
  console.error('Build succeeded but .app not found at', appPath);
  process.exit(1);
}

console.log('Installing on simulator...');
run(`xcrun simctl install booted "${appPath}"`);

console.log('Launching app...');
run(`xcrun simctl launch booted ${bundleId}`);

console.log('Done. If Metro is not running, start it in another terminal: npm start');
