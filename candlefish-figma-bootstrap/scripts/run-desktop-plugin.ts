import { execSync, spawnSync } from 'child_process';

function runAppleScript(script: string) {
  const res = spawnSync('osascript', ['-e', script], { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error('osascript failed');
  }
}

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Bring Figma to front
  runAppleScript('tell application "Figma" to activate');
  await pause(1000);

  // Click Plugins > Development > Candlefish Brand Bootstrap
  const jxa = `
    tell application "System Events"
      tell process "Figma"
        try
          click menu bar item "Plugins" of menu bar 1
          delay 0.2
          click menu item "Development" of menu 1 of menu bar item "Plugins" of menu bar 1
          delay 0.2
          click menu item "Candlefish Brand Bootstrap" of menu 1 of menu item "Development" of menu 1 of menu bar item "Plugins" of menu bar 1
        on error
          return 1
        end try
      end tell
    end tell`;
  runAppleScript(jxa);

  // Give plugin time to finish
  await pause(2500);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
