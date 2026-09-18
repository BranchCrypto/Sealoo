import { getCurrentWindow } from "@tauri-apps/api/window";

// ponytail: close → hide so the pet can reopen without recreating the window.
const win = getCurrentWindow();
void win.onCloseRequested(async (event) => {
  event.preventDefault();
  await win.hide();
});
