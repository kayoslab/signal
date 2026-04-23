import { describe, it, expect, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';

const ROOT = resolve(__dirname, '../..');

describe('US-001: Dev server', () => {
  let serverProcess: ChildProcess | null = null;

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }
  });

  it('npm run dev starts a local server that responds', async () => {
    const port = 5173;

    const serverReady = await new Promise<boolean>((resolvePromise) => {
      const timeout = setTimeout(() => {
        resolvePromise(false);
      }, 15_000);

      serverProcess = spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
        cwd: ROOT,
        stdio: 'pipe',
        env: { ...process.env, BROWSER: 'none' },
      });

      let output = '';
      serverProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
        if (output.includes('Local:') || output.includes(`localhost:${port}`)) {
          clearTimeout(timeout);
          resolvePromise(true);
        }
      });

      serverProcess.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
        if (output.includes('Local:') || output.includes(`localhost:${port}`)) {
          clearTimeout(timeout);
          resolvePromise(true);
        }
      });

      serverProcess.on('error', () => {
        clearTimeout(timeout);
        resolvePromise(false);
      });

      serverProcess.on('exit', () => {
        clearTimeout(timeout);
        resolvePromise(false);
      });
    });

    expect(serverReady).toBe(true);

    // Verify the server responds with HTML
    const response = await fetch(`http://localhost:${port}/`);
    expect(response.ok).toBe(true);

    const html = await response.text();
    expect(html).toContain('id="app"');
  }, 20_000);
});
