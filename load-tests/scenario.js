import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api';

const myRate = new Rate('failed_requests');
const loginTrend = new Trend('login_duration');
const chamadasTrend = new Trend('chamadas_duration');
const relatoriosTrend = new Trend('relatorios_duration');

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    failed_requests: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

const UNIDADES = ['bela-vista', 'sao-matheus', 'vila', 'parque'];

export default function () {
  const unidade = UNIDADES[Math.floor(Math.random() * UNIDADES.length)];

  group('login', () => {
    const payload = JSON.stringify({
      nome: 'Professor Teste',
      unidade,
    });
    const res = http.post(`${BASE_URL}/auth/login`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': unidade,
      },
    });
    loginTrend.add(res.timings.duration);
    myRate.add(res.status !== 200);
    check(res, {
      'login status 200 ou 400': (r) => r.status === 200 || r.status === 400,
    });
  });

  sleep(Math.random() * 2);

  group('chamadas', () => {
    const res = http.get(`${BASE_URL}/chamadas/2026-06-29`, {
      headers: { 'X-Tenant-ID': unidade },
    });
    chamadasTrend.add(res.timings.duration);
    myRate.add(res.status !== 200);
    check(res, { 'chamadas status 200': (r) => r.status === 200 });
  });

  sleep(Math.random());

  group('relatorios', () => {
    const res = http.get(`${BASE_URL}/relatorios/frequencia?mes=06&ano=2026`, {
      headers: { 'X-Tenant-ID': unidade },
    });
    relatoriosTrend.add(res.timings.duration);
    myRate.add(res.status !== 200);
    check(res, { 'relatorios status 200': (r) => r.status === 200 });
  });

  group('vagas', () => {
    const res = http.get(`${BASE_URL}/vagas`, {
      headers: { 'X-Tenant-ID': unidade },
    });
    myRate.add(res.status !== 200);
    check(res, { 'vagas status 200': (r) => r.status === 200 });
  });

  sleep(Math.random());
}
