import { mountQuickbar } from "./quickbar";

const qb = mountQuickbar({
  openDetails: () => {
    alert("详情页（demo）");
  },
  onChromeChange: () => {},
});

const pet = document.querySelector<HTMLElement>("#pet-hit");
if (!pet) throw new Error("#pet-hit missing");

pet.addEventListener("click", () => {
  if (qb.isBusy()) qb.focusStrip();
  else qb.openPrompt();
});
