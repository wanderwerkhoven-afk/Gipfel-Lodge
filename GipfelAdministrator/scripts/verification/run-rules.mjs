import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { connect } from 'node:net';

const jar = process.env.FIRESTORE_EMULATOR_JAR || join(homedir(), '.cache/firebase/emulators/cloud-firestore-emulator-v1.22.0.jar');
const java = process.env.FIRESTORE_EMULATOR_JAVA || 'java';
if (!existsSync(jar)) {
  console.error(`Firestore emulator ontbreekt: ${jar}\nInstalleer hem eenmalig met: npx firebase setup:emulators:firestore`);
  process.exit(1);
}
const emulator = spawn(java, ['-jar', jar, '--host', '127.0.0.1', '--port', '8080', '--project_id', 'demo-gipfel-saas', '--rules', 'firebase/firestore.rules', '--single_project_mode', 'true', '--single_project_mode_error', 'true'], { stdio: ['ignore', 'pipe', 'pipe'] });
let emulatorOutput = '';
emulator.stdout.on('data', value => { emulatorOutput += value; });
emulator.stderr.on('data', value => { emulatorOutput += value; });

async function waitForPort() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const open = await new Promise(resolve => {
      const socket = connect({ host: '127.0.0.1', port: 8080 });
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
    });
    if (open) return;
    if (emulator.exitCode !== null) throw new Error(`Firestore emulator stopte vroeg.\n${emulatorOutput}`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Firestore emulator startte niet binnen 20 seconden.\n${emulatorOutput}`);
}

try {
  await waitForPort();
  const result = await new Promise(resolve => {
    const tests = spawn(process.execPath, ['--import', 'tsx', '--test', 'tests/firestore-rules.test.ts'], { stdio: 'inherit', env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' } });
    tests.once('exit', code => resolve(code ?? 1));
  });
  process.exitCode = result;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  emulator.kill('SIGTERM');
}
