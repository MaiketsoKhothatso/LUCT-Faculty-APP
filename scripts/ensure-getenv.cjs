const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const runtimeGetenvDir = path.join(projectRoot, 'node_modules', 'getenv');
const runtimeGetenvEntry = path.join(runtimeGetenvDir, 'index.js');
const vendorGetenvEntry = path.join(projectRoot, 'vendor', 'getenv', 'index.js');

try {
  if (!fs.existsSync(runtimeGetenvDir)) {
    process.exit(0);
  }

  if (fs.existsSync(runtimeGetenvEntry)) {
    process.exit(0);
  }

  if (!fs.existsSync(vendorGetenvEntry)) {
    process.exit(0);
  }

  fs.copyFileSync(vendorGetenvEntry, runtimeGetenvEntry);
  console.log('Patched missing node_modules/getenv/index.js from local vendor package.');
} catch (error) {
  console.warn('Could not patch getenv package:', error);
}
