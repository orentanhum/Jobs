#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = 'C:\\Users\\Tanhum\\Jobs';

try {
  console.log('Installing dependencies...');
  execSync(`cd ${projectDir} && npm install --prefer-offline --no-audit`, { 
    stdio: 'inherit',
    shell: 'cmd.exe'
  });
  
  console.log('\nStarting dev server...');
  execSync(`cd ${projectDir} && npm run dev`, { 
    stdio: 'inherit',
    shell: 'cmd.exe'
  });
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
