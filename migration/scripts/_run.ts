import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function runMigrationCommand(command: string, extraArgs: string[]): void {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const child = spawn('npx', ['tsx', 'src/migration/cli.ts', command, ...extraArgs], {
    cwd: path.join(root, 'backend'),
    stdio: 'inherit',
    shell: true
  });
  child.on('exit', (code) => process.exit(code ?? 1));
}
