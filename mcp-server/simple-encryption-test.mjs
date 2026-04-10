#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Manual encryption implementation for testing
function encryptMemoryContent(plaintext) {
  const key = getMemoryEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    content_enc: encrypted,
    content_iv: iv,
    content_tag: authTag,
  };
}

function decryptMemoryContent(contentEnc, contentIv) {
  const key = getMemoryEncryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, contentIv);
  
  decipher.setAuthTag(contentEnc.slice(-16)); // Last 16 bytes are auth tag
  const encrypted = contentEnc.slice(0, contentEnc.length - 16);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted, null),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

function getMemoryEncryptionKey() {
  const k = process.env.MEMORY_ENCRYPTION_KEY?.trim();
  if (!k) {
    throw new Error('MEMORY_ENCRYPTION_KEY is not set');
  }
  if (/^[0-9a-fA-F]{64}$/.test(k)) {
    return Buffer.from(k, 'hex');
  }
  return createHash('sha256').update(k, 'utf8').digest();
}

console.log('🔒 TESTING ENCRYPTION/DECRYPTION\n');

// Test 1: Verify encryption key
console.log('=== ENCRYPTION KEY VERIFICATION ===');
const encryptionKey = process.env.MEMORY_ENCRYPTION_KEY;
console.log('Key length:', encryptionKey?.length);
console.log('Key format:', /^[0-9a-fA-F]{64}$/.test(encryptionKey) ? 'VALID HEX' : 'INVALID');

// Test 2: Test encryption/decryption cycle
console.log('\n=== ENCRYPTION/DECRYPTION CYCLE ===');
try {
  const testData = 'This is a secret memory that should be encrypted';
  
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
