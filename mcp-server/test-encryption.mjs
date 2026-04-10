#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const baseUrl = 'http://127.0.0.1:3000';

console.log('🔒 TESTING ENCRYPTION/DECRYPTION\n');

// Test 1: Verify encryption key format
console.log('=== ENCRYPTION KEY VERIFICATION ===');
const encryptionKey = process.env.MEMORY_ENCRYPTION_KEY;
console.log('Key length:', encryptionKey?.length);
console.log('Key format:', /^[0-9a-fA-F]{64}$/.test(encryptionKey) ? 'VALID HEX' : 'INVALID');

// Test 2: Test encryption/decryption cycle
console.log('\n=== ENCRYPTION/DECRYPTION CYCLE ===');
try {
  const testData = 'This is a secret memory that should be encrypted';
  
  // Import encryption functions
  const { encryptMemoryContent, decryptMemoryContent } = await import('./src/crypto/memoryEncryption.js');
  
  // Test encryption
  console.log('Testing encryption...');
  const encrypted = encryptMemoryContent(testData);
  console.log('✅ Encrypted successfully');
  console.log('Encrypted length:', encrypted.content_enc.length);
  console.log('IV length:', encrypted.content_iv.length);
  
  // Test decryption
  console.log('Testing decryption...');
  const decrypted = decryptMemoryContent(encrypted.content_enc, encrypted.content_iv);
  console.log('✅ Decrypted successfully');
  console.log('Decrypted matches original:', decrypted === testData);
  
  // Test with different data
  const testCases = [
    'User prefers dark mode',
    'Project deadline: Friday',
    'API key: sk-1234567890',
    '',
    'Special chars: !@#$%^&*()',
  ];
  
  console.log('\n=== MULTIPLE TEST CASES ===');
  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: "${testCase}"`);
    const enc = encryptMemoryContent(testCase);
    const dec = decryptMemoryContent(enc.content_enc, enc.content_iv);
    const success = dec === testCase;
    console.log(success ? '✅' : '❌', success ? 'PASS' : 'FAIL');
  });
  
} catch (error) {
  console.log('❌ Encryption test failed:', error.message);
}

console.log('\n🎯 ENCRYPTION/DECRYPTION TESTS COMPLETE');
