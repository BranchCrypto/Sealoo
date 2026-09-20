import { getCurrentWindow } from "@tauri-apps/api/window";
import { getPrefs, markSetupComplete } from "./prefs";

type ViewId = "welcome" | "name" | "about" | "done" | "home";

const win = getCurrentWindow();
const views: Record<ViewId, HTMLElement> = {
  welcome: must("#view-welcome"),
  name: must("#view-name"),
  about: must("#view-about"),
  done: must("#view-done"),
  home: must("#view-home"),
};
const nameInput = must<HTMLInputElement>("#pet-name");
const doneName = must("#done-name");
const homeTitle = must("#home-title");
const finishBtn = must<HTMLButtonElement>("#finish-setup");
const closeBtn = must<HTMLButtonElement>("#win-close");

let current: ViewId | null = null;
let petName = "Sealoo";

function must<T extends HTMLElement = HTMLElement>(sel: string): T {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`${sel} missing`);
  return el;
}

function readName(): string {
  return nameInput.value.trim() || "Sealoo";
}

function show(id: ViewId) {
  if (id === "done") {
    doneName.textContent = petName;
  }
  if (id === "home") {
    homeTitle.textContent = petName;
  }
  if (id === "name" && !nameInput.value && petName !== "Sealoo") {
    nameInput.value = petName;
  }

  for (const [key, el] of Object.entries(views) as [ViewId, HTMLElement][]) {
    el.hidden = key !== id;
  }
  current = id;

  if (id === "name") {
    requestAnimationFrame(() => nameInput.focus());
  }
}

function go(id: ViewId) {
  if (current === "name") {
    petName = readName();
  }
  show(id);
}

async function finishSetup() {
  petName = readName();
  await markSetupComplete(petName);
  show("home");
  await win.hide();
}

void win.onCloseRequested(async (event) => {
  event.preventDefault();
  await win.hide();
});

closeBtn.addEventListener("click", () => {
  void win.hide();
});

document.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-go") as ViewId | null;
    if (!target) return;
    go(target);
  });
});

finishBtn.addEventListener("click", () => {
  void finishSetup();
});

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    go("about");
  }
});

async function boot() {
  const prefs = await getPrefs();
  petName = prefs.petName || "Sealoo";
  if (prefs.setupComplete) {
    show("home");
  } else {
    show("welcome");
  }
  document.documentElement.classList.add("ready");
}

void boot();
