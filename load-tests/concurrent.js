/**
 * Load test — simula 20 professores simultâneos
 * Uso: node load-tests/concurrent.js [url]
 * Ex:  node load-tests/concurrent.js http://localhost:3001/api
 */

const BASE_URL = process.argv[2] || 'http://localhost:3001/api';
const CONCURRENCY = 20;
const UNIDADES = ['bela-vista', 'sao-matheus', 'vila', 'parque'];
const PROFESSORES = [
  'Jefferson', 'Daniela', 'Carlos', 'Ana', 'Bruno', 'Cintia', 'Diego', 'Eduarda',
  'Fabio', 'Gabriela', 'Heitor', 'Isabela', 'Joao', 'Karina', 'Lucas', 'Mariana',
  'Nelson', 'Patricia', 'Rafael', 'Silvia',
];

interface Result {
  label: string;
  status: number;
  durationMs: number;
  ok: boolean;
}

function randomUnidade(): string {
  return UNIDADES[Math.floor(Math.random() * UNIDADES.length)];
}

function randomProfessor(): string {
  return PROFESSORES[Math.floor(Math.random() * PROFESSORES.length)];
}

async function request(label: string, url: string, options: RequestInit): Promise<Result> {
  const start = performance.now();
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    const duration = performance.now() - start;
    return { label, status: res.status, durationMs: Math.round(duration), ok: res.ok };
  } catch (err: any) {
    const duration = performance.now() - start;
    return { label, status: 0, durationMs: Math.round(duration), ok: false };
  }
}

async function simulateProfessor(id: number): Promise<Result[]> {
  const unidade = randomUnidade();
  const nome = randomProfessor();
  const results: Result[] = [];

  // 1. Login
  results.push(await request(
    `[${id}] login`,
    `${BASE_URL}/auth/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': unidade },
      body: JSON.stringify({ nome, unidade }),
    }
  ));

  // 2. Chamadas
  results.push(await request(
    `[${id}] chamadas`,
    `${BASE_URL}/chamadas/2026-06-29`,
    { headers: { 'X-Tenant-ID': unidade } }
  ));

  // 3. Turmas
  results.push(await request(
    `[${id}] turmas`,
    `${BASE_URL}/turmas`,
    { headers: { 'X-Tenant-ID': unidade } }
  ));

  // 4. Alunos
  results.push(await request(
    `[${id}] alunos`,
    `${BASE_URL}/alunos`,
    { headers: { 'X-Tenant-ID': unidade } }
  ));

  // 5. Vagas
  results.push(await request(
    `[${id}] vagas`,
    `${BASE_URL}/vagas`,
    { headers: { 'X-Tenant-ID': unidade } }
  ));

  return results;
}

function printResults(allResults: Result[], totalDurationMs: number): void {
  const byLabel = new Map<string, Result[]>();
  for (const r of allResults) {
    const key = r.label.split('] ')[1];
    if (!byLabel.has(key)) byLabel.set(key, []);
    byLabel.get(key)!.push(r);
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Load Test — CONCORRÊNCIA: ${CONCURRENCY}`);
  console.log(`  URL: ${BASE_URL}`);
  console.log(`  Duração total: ${(totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Total de requisições: ${allResults.length}`);
  console.log(`═══════════════════════════════════════\n`);

  for (const [label, results] of byLabel) {
    const ok = results.filter(r => r.ok).length;
    const durations = results.map(r => r.durationMs).sort((a, b) => a - b);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    console.log(`  ${label}`);
    console.log(`    OK: ${ok}/${results.length} | Média: ${avg.toFixed(0)}ms | P95: ${p95}ms | P99: ${p99}ms`);
  }

  const allOk = allResults.filter(r => r.ok).length;
  const failRate = ((allResults.length - allOk) / allResults.length * 100).toFixed(1);
  console.log(`\n  ✅ Taxa de sucesso: ${allOk}/${allResults.length} (${failRate}% falha)`);
  console.log(`  ${failRate === '0.0' ? '✓ APROVADO' : '⚠ ATENÇÃO'}\n`);
}

async function main() {
  console.log(`\n🚀 Iniciando load test com ${CONCURRENCY} professores simultâneos...\n`);

  const start = performance.now();
  const promises: Promise<Result[]>[] = [];
  for (let i = 1; i <= CONCURRENCY; i++) {
    promises.push(simulateProfessor(i));
  }

  const allNested = await Promise.all(promises);
  const allResults = allNested.flat();
  const totalDuration = performance.now() - start;

  printResults(allResults, totalDuration);
}

main().catch(console.error);
