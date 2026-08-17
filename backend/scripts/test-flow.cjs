require('dotenv').config();
const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: 4000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function run() {
  const uniqueId = 'testuser' + Date.now().toString().slice(-5);
  const email = 'jansetu0@gmail.com';

  console.log(`\n[TEST] Unique ID: ${uniqueId}, Email: ${email}\n`);

  console.log('Step 1: Check unique ID...');
  const check = await post('/api/auth/check-unique-id', { uniqueId });
  console.log(`  ${check.status}`, JSON.stringify(check.body));
  if (!check.body.available) { console.error('ID taken!'); rl.close(); return; }

  console.log('\nStep 2: Register (sends OTP email to Gmail)...');
  const reg = await post('/api/auth/register', { uniqueId, email });
  console.log(`  ${reg.status}`, JSON.stringify(reg.body));
  if (!reg.body.verifyToken) { console.error('Register failed!'); rl.close(); return; }

  const { verifyToken } = reg.body;
  const otp = await ask('\n>>> Check Gmail inbox for OTP code. Enter it here: ');

  console.log('\nStep 3: Verify OTP + create account...');
  const verify = await post('/api/auth/verify-otp', { verifyToken, otp: otp.trim(), uniqueId });
  console.log(`  ${verify.status}`, JSON.stringify(verify.body, null, 2));

  if (verify.body.success) {
    console.log('\n✅ FULL FLOW PASSED!');
    console.log('   User:', verify.body.user);
    console.log('   accessToken:', verify.body.accessToken?.slice(0, 30) + '...');
  } else {
    console.log('\n❌ Verify failed:', verify.body.error);
  }

  rl.close();
}

run().catch(e => { console.error(e); rl.close(); });
