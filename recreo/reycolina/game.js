/*
  REY DE LA COLINA — FASE 1
  Proyecto nacido de una idea de Pipe.
*/

"use strict";

const state = {
  mode: null,
  playerOne: null,
  playerTwo: null,
  ally: null
};

const screens = {
  cover: document.querySelector("#coverScreen"),
  mode: document.querySelector("#modeScreen"),
  character: document.querySelector("#characterScreen"),
  ally: document.querySelector("#allyScreen"),
  ready: document.querySelector("#readyScreen")
};

const characterData = {
  tina: { name: "Tina", icon: "🐒" },
  nito: { name: "Nito", icon: "🐵" }
};

const allyData = {
  loro: { name: "Loro", icon: "🦜" },
  perezoso: { name: "Perezoso", icon: "🦥" },
  cocodrilo: { name: "Cocodrilo", icon: "🐊" }
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
  screens[name].classList.add("is-active");

  const firstButton = screens[name].querySelector("button:not(.cover-hotspot)");
  if (firstButton) window.setTimeout(() => firstButton.focus({ preventScroll: true }), 360);
}

function leaveCover() {
  const frame = document.querySelector(".cover-frame");
  frame.classList.add("is-leaving");
  window.setTimeout(() => {
    showScreen("mode");
    frame.classList.remove("is-leaving");
  }, 390);
}

function chooseMode(mode) {
  state.mode = mode;
  state.playerOne = null;
  state.playerTwo = null;
  state.ally = null;

  const eyebrow = document.querySelector("#characterEyebrow");
  eyebrow.textContent = mode === "coop" ? "JUGADOR 1" : "UN JUGADOR";
  showScreen("character");
}

function chooseCharacter(character) {
  state.playerOne = character;
  state.playerTwo = state.mode === "coop" ? (character === "tina" ? "nito" : "tina") : null;
  showScreen("ally");
}

function chooseAlly(ally) {
  state.ally = ally;
  renderSummary();
  showScreen("ready");
}

function renderSummary() {
  const summary = document.querySelector("#teamSummary");
  const playerOne = characterData[state.playerOne];
  const ally = allyData[state.ally];

  const chips = [
    `<div class="summary-chip"><span>${playerOne.icon}</span>${state.mode === "coop" ? "JUGADOR 1 · " : ""}${playerOne.name}</div>`
  ];

  if (state.playerTwo) {
    const playerTwo = characterData[state.playerTwo];
    chips.push(`<div class="summary-chip"><span>${playerTwo.icon}</span>JUGADOR 2 · ${playerTwo.name}</div>`);
  }

  chips.push(`<div class="summary-chip"><span>${ally.icon}</span>${ally.name}</div>`);
  summary.innerHTML = chips.join("");
}

function resetFlow() {
  state.mode = null;
  state.playerOne = null;
  state.playerTwo = null;
  state.ally = null;
  showScreen("mode");
}

document.querySelector("#coverStart").addEventListener("click", leaveCover);

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => chooseMode(button.dataset.mode));
});

document.querySelectorAll("[data-character]").forEach((button) => {
  button.addEventListener("click", () => chooseCharacter(button.dataset.character));
});

document.querySelectorAll("[data-ally]").forEach((button) => {
  button.addEventListener("click", () => chooseAlly(button.dataset.ally));
});

document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.back));
});

document.querySelector("#restartFlow").addEventListener("click", resetFlow);

document.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && screens.cover.classList.contains("is-active")) {
    event.preventDefault();
    leaveCover();
  }
});
