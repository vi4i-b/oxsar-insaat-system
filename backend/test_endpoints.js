const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testlər başlayır (Server: localhost:5000)...');
  await new Promise((r) => setTimeout(r, 2000)); // serverin tam qalxmasını gözləyirik

  try {
    // 1. Health check
    console.log('\n--- 1. Health Check Testi ---');
    const health = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/health',
      method: 'GET',
    });
    console.log('Status:', health.status);
    console.log('Response:', JSON.stringify(health.data, null, 2));

    // 2. Login
    console.log('\n--- 2. POST /api/admin/login Testi ---');
    const loginRes = await request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/admin/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { phone: '0500000000', password: 'admin123' }
    );
    console.log('Status:', loginRes.status);
    console.log('Response:', JSON.stringify(loginRes.data, null, 2));

    if (!loginRes.data || !loginRes.data.data || !loginRes.data.data.access_token) {
      throw new Error('Giriş uğursuz oldu, token alına bilmədi!');
    }

    const token = loginRes.data.data.access_token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Me
    console.log('\n--- 3. GET /api/admin/me Testi ---');
    const meRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/admin/me',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('Status:', meRes.status);
    console.log('Response:', JSON.stringify(meRes.data, null, 2));

    // 4. Work types
    console.log('\n--- 4. GET /api/admin/work-types Testi ---');
    const wtRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/admin/work-types',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('Status:', wtRes.status);
    console.log('Response:', JSON.stringify(wtRes.data, null, 2));

    // 5. Workers
    console.log('\n--- 5. GET /api/admin/workers Testi ---');
    const workersRes = await request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/admin/workers',
      method: 'GET',
      headers: authHeaders,
    });
    console.log('Status:', workersRes.status);
    console.log('Response:', JSON.stringify(workersRes.data, null, 2));

    // 6. Create Worker (Usta)
    console.log('\n--- 6. POST /api/admin/workers (Usta) Testi ---');
    const ustaPhone = '+994507776655';
    const newWorkerRes = await request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/api/admin/workers',
        method: 'POST',
        headers: authHeaders,
      },
      {
        full_name: 'Şirinov Rüstəm Qəzənfər oğlu',
        role: 'USTA',
        phone: ustaPhone,
        daily_wage: 50,
        pin: '4821',
      }
    );
    console.log('Status:', newWorkerRes.status);
    console.log('Response:', JSON.stringify(newWorkerRes.data, null, 2));

    console.log('\n✅ Bütün testlər uğurla başa çatdı!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test xətası:', err);
    process.exit(1);
  }
}

runTests();
