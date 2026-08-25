/**
 * End-to-end smoke against a LIVE Woku stack. Run with a real secret key:
 *
 *   WOKU_API_KEY=sk_... WOKU_BASE_URL=https://clientapi.woku.app \
 *     npx tsx examples/e2e.ts
 *
 * By default it only READS (create tracker + tool, wire, then read back). It
 * sends real invitations ONLY when WOKU_E2E_ALLOW_SEND=true and
 * WOKU_E2E_RECIPIENT is set — sends reach real inboxes, so keep it off unless
 * you point WOKU_BASE_URL at a safe (non-production) environment.
 */
import { Woku } from '../src/index';

async function main(): Promise<void> {
  const woku = new Woku({
    apiKey: process.env.WOKU_API_KEY,
    baseURL: process.env.WOKU_BASE_URL,
  });

  // 1. Company handshake (no side effects).
  const company = await woku.company.me();
  console.log('company:', company);

  // 2. Create a tracker definition (idempotent).
  const tracker = await woku.trackers.create({
    name: `sdk-e2e-${Date.now()}`,
    system: 'sdk-e2e',
  });
  console.log('tracker:', tracker._id);

  // 3. Create an NPS tool.
  const tool = await woku.npsTools.create({
    name: `sdk-e2e-${Date.now()}`,
    npsMessage: 'How likely are you to recommend us?',
  });
  console.log('npsTool:', tool._id);

  // 4. Optionally send (real invitation — off by default).
  const recipient = process.env.WOKU_E2E_RECIPIENT;
  if (process.env.WOKU_E2E_ALLOW_SEND === 'true' && recipient) {
    const result = await woku.nps.sendInvitations({
      npsToolId: tool._id,
      recipients: [{ email: recipient }],
    } as never);
    console.log('sent:', result);
  } else {
    console.log(
      'send skipped (set WOKU_E2E_ALLOW_SEND=true + WOKU_E2E_RECIPIENT)',
    );
  }

  // 5. Read back delivery + response rate.
  const stats = await woku.dispatches.stats();
  console.log('dispatch stats:', stats);

  // 6. Cleanup the tool (delete cascades its responses).
  await woku.npsTools.delete(tool._id);
  await woku.trackers.deactivate(tracker._id);
  console.log('done ✅');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
