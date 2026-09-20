import { invoke } from "@tauri-apps/api/core";

export type Prefs = {
  setupComplete: boolean;
  petName: string;
};

const DEFAULT_PREFS: Prefs = {
  setupComplete: false,
  petName: "Sealoo",
};

export async function getPrefs(): Promise<Prefs> {
  try {
    return await invoke<Prefs>("get_prefs");
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setPrefs(prefs: Prefs): Promise<void> {
  const petName = prefs.petName.trim() || "Sealoo";
  await invoke("set_prefs", {
    prefs: {
      setupComplete: prefs.setupComplete,
      petName,
    },
  });
}

export async function isSetupComplete(): Promise<boolean> {
  const prefs = await getPrefs();
  return prefs.setupComplete;
}

export async function markSetupComplete(petName: string): Promise<void> {
  await setPrefs({
    setupComplete: true,
    petName: petName.trim() || "Sealoo",
  });
}
