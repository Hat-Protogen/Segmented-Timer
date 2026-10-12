<script lang="ts">
  import { onMount } from "svelte";

  // QUICK CONFIG VARIABLES:
  let darkMode = $state(true);
  let currentTimerColor = $state("#1447e6");
  let totalTimerColor = $state("#458fff");
  let backgroundColor = $state("#101828");
  let accentColor = $state("#1e2939");
  let textColor = $state("#ffffff");
  // const totalTimerColor = "#ffffff";

  let colorPresets: Preset[] = $state([
    {
      presetName: "Default Dark",
      darkMode: true,
      currentTimerColor: "#1447e6",
      totalTimerColor: "#458fff",
      backgroundColor: "#101828",
      accentColor: "#1e2939",
      textColor: "#ffffff",
    },
    {
      presetName: "Default Light",
      darkMode: false,
      currentTimerColor: "#1447e6",
      totalTimerColor: "#458fff",
      backgroundColor: "#ffffff",
      accentColor: "#e5e7eb",
      textColor: "#000000",
    },
    {
      presetName: "Another Dark",
      darkMode: true,
      currentTimerColor: "#1447e6",
      totalTimerColor: "#458fff",
      backgroundColor: "#101828",
      accentColor: "#1e2939",
      textColor: "#ffffff",
    },
  ]);

  type Preset = {
    presetName: string;
    darkMode: boolean;
    currentTimerColor: string;
    totalTimerColor: string;
    backgroundColor: string;
    accentColor: string;
    textColor: string;
  };

  // General states for the window
  let timerActive = $state(false);
  let repeatMode = $state(true);
  let windowSmall = $state(false);
  let showRDrawer = $state(false);
  let showLDrawer = $state(false);

  let modeBox = $state(false);

  // #region Electron stuff
  // Function that sends the instruction to resize the window to the renderer
  function changeWindowSize(width: number, height: number) {
    if (window.electron) {
      window.electron.send("resize-window", { width, height });
    } else {
      console.warn("IPC renderer not available. Not running in Electron.");
    }
  }

  function minimizeWindow() {
    if (window.electron) {
      window.electron.send("minimize-window", undefined);
    } else {
      console.warn("IPC renderer not available. Not running in Electron.");
    }
  }

  function closeWindow() {
    if (window.electron) {
      window.electron.send("close-window", undefined);
    } else {
      console.warn("IPC renderer not available. Not running in Electron.");
    }
  }

  function toggleResize() {
    if (window.electron) {
      windowSmall = !windowSmall;
      window.electron.send("toggle-resize", undefined);
    } else {
      console.warn("IPC renderer not available. Not running in Electron.");
    }
  }

  // #endregion
  const wait = async (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Values for the aggregated timer
  let totalTimerMax = $state(0);
  let totalTimerCurrent = $state(0);
  let totalTimerPercent = $state(100);

  // Values for the current timer
  let progressBarPercent = $state(100);
  let currentTimerSec = $state(0);
  let currentTimerName = $state("");
  let currentTimerMax = $state(0);

  let timerIndex = $state(0);

  type Timer = {
    timeInSeconds: number;
    name: string;
    repeatTimes?: number;
  };

  type TimerEdit = {
    timerMinutes: number;
    timerSeconds: number;
  };

  let timers: Timer[] = $state([
    {
      timeInSeconds: 60,
      name: "timer 1",
    },
    // {
    //   timeInSeconds: 60,
    //   name: "timer 2",
    // },
    // {
    //   timeInSeconds: 100,
    //   name: "timer 3",
    // },
  ]);

  let timerEdits: TimerEdit[] = $state([
    {
      timerMinutes: 1,
      timerSeconds: 0,
    },
  ]);

  let repeatingTimer: Timer = $state({
    timeInSeconds: 60,
    name: "timer",
    repeatTimes: 1,
  });

  let repeatingTimerEdits: TimerEdit = $state({
    timerMinutes: 1,
    timerSeconds: 0,
  });

  let soundPlayed = false;

  resetTimers();

  onMount(async () => {
    // Have to define the audio here, as it needs to be mounted as an HTML element
    const dingSound = new Audio("timerDing.mp3");
    async function playTone() {
      let dings = 0;

      await dingSound.play().catch((error) => {
        console.error("Audio playback failed:", error);
      });

      dingSound.addEventListener("ended", () => {
        if (dings < 2) {
          dings++;
          dingSound.currentTime = 0;
          dingSound.play();
        }
      });
    }
    updateColorMode();

    while (true) {
      if (timerActive) {
        progressBarPercent = Math.round(
          (currentTimerSec / currentTimerMax) * 100,
        );
        totalTimerPercent = Math.round(
          (totalTimerCurrent / totalTimerMax) * 100,
        );
        if (progressBarPercent > 0) {
          // Continue current timer
          currentTimerSec--;
          totalTimerCurrent--;
        } else {
          // Cycle to next timer
          if (!soundPlayed) {
            await playTone();
            soundPlayed = true;
          }
          if (timers[timerIndex + 1]) {
            timerIndex++;
            currentTimerSec = timers[timerIndex].timeInSeconds;
            currentTimerName = timers[timerIndex].name;
            currentTimerMax = currentTimerSec;
            soundPlayed = false;
          }
        }
        await wait(1000);
      } else {
        await wait(100);
      }
    }
  });

  function resetTimers() {
    if (timers.length > 0) {
      totalTimerMax = 0;
      for (var i = 0; i < timers.length; i++) {
        totalTimerMax += timers[i].timeInSeconds;
      }

      timerIndex = 0;
      totalTimerCurrent = totalTimerMax;

      currentTimerSec = timers[timerIndex].timeInSeconds;
      currentTimerName = timers[timerIndex].name;
      currentTimerMax = currentTimerSec;

      progressBarPercent = Math.round(
        (currentTimerSec / currentTimerMax) * 100,
      );
      totalTimerPercent = Math.round((totalTimerCurrent / totalTimerMax) * 100);

      soundPlayed = false;
    } else {
      console.warn("No timers");
      timerActive = false;
      totalTimerMax = 0;
      totalTimerCurrent = 0;
      currentTimerSec = 0;
      currentTimerName = "";
      currentTimerMax = 0;
      progressBarPercent = 0;
      totalTimerPercent = 0;
    }
  }

  function recalculateSeconds(min: number, seconds: number) {
    seconds = parseInt(`${seconds}`);
    console.log("time = " + (min * 60 + seconds) + " seconds");
    return min * 60 + seconds;
  }

  function calcRepeatTimers() {
    if (repeatingTimer.repeatTimes != undefined) {
      timers = [];
      timerEdits = [];
      repeatingTimer.timeInSeconds = recalculateSeconds(
        repeatingTimerEdits.timerMinutes,
        repeatingTimerEdits.timerSeconds,
      );
      for (var i = 0; i < repeatingTimer.repeatTimes; i++) {
        timers[i] = { timeInSeconds: 0, name: "" };
        timers[i].timeInSeconds = repeatingTimer.timeInSeconds;
        timers[i].name = repeatingTimer.name + ` ${i + 1}`;
        timerEdits[i] = { timerMinutes: 0, timerSeconds: 0 };
        timerEdits[i].timerMinutes = Math.floor(timers[i].timeInSeconds / 60);
        timerEdits[i].timerSeconds = timers[i].timeInSeconds % 60;
      }
      resetTimers();
    }
  }

  function swapColorMode() {
    if (darkMode) {
      darkMode = false;
      backgroundColor = "#ffffff";
      accentColor = "#e5e7eb";
      textColor = "#000000";
      updateColorMode();
    } else {
      darkMode = true;
      backgroundColor = "#101828";
      accentColor = "#1e2939";
      textColor = "#ffffff";
      updateColorMode();
    }
  }

  function updateColorMode() {
    document.documentElement.style.setProperty(
      "--background-color",
      backgroundColor,
    );
    document.documentElement.style.setProperty("--accent-color", accentColor);
    document.documentElement.style.setProperty("--text-color", textColor);
  }

  function loadPreset(presetList: Preset[], index: number) {
    let presetObj = presetList[index];

    darkMode = presetObj.darkMode;
    currentTimerColor = presetObj.currentTimerColor;
    totalTimerColor = presetObj.totalTimerColor;
    backgroundColor = presetObj.backgroundColor;
    accentColor = presetObj.accentColor;
    textColor = presetObj.textColor;

    document.documentElement.style.setProperty(
      "--background-color",
      backgroundColor,
    );
    document.documentElement.style.setProperty("--accent-color", accentColor);
    document.documentElement.style.setProperty("--text-color", textColor);
  }

  function savePreset(presetList: Preset[], index: number) {
    let presetObj = presetList[index];

    presetObj.darkMode = darkMode;
    presetObj.currentTimerColor = currentTimerColor;
    presetObj.totalTimerColor = totalTimerColor;
    presetObj.backgroundColor = backgroundColor;
    presetObj.accentColor = accentColor;
    presetObj.textColor = textColor;
  }

  let timerRadius = 70;

  let pageDiv: HTMLDivElement;
</script>

<meta name="color-scheme" content={darkMode ? "dark" : "light"} />
<div
  bind:this={pageDiv}
  class="h-dvh w-dvw rounded-sm px-4 flex flex-col items-center overflow-clip"
  style="background-color:{backgroundColor}; color: {textColor};"
>
  <!-- TOP BAR (ELECTRON)-->
  <div
    class="w-full flex h-fit rounded-sm p-1 px-2 sticky top-2 z-10 text-black opacity-80 items-center"
    style="background-color:{accentColor};"
  >
    <!-- WINDOW DRAG BAR -->
    <div class="w-full h-6 windowdragbar flex items-center justify-center">
      <div class="bg-black rounded-xl w-16 h-1 opacity-80"></div>
    </div>
    <div class="outline h-full m-3"></div>
    <!-- WINDOW MINIMIZE/CLOSE BUTTONS -->
    <div class="w-20 h-4 flex items-center justify-center gap-2 select-none">
      <button
        onclick={() => {
          minimizeWindow();
        }}
        class="w-4 h-4 rounded-xl bg-gray-400 text-sm outline"><p>-</p></button
      >
      <button
        onclick={() => {
          pageDiv.scrollTo({ top: 0 });
          toggleResize();
          showRDrawer = false;
          showLDrawer = false;
        }}
        class="w-4 h-4 rounded-xl bg-yellow-300 align-middle text-sm outline"
        ><p>🖈</p></button
      >
      <button
        onclick={() => {
          closeWindow();
        }}
        class="w-4 h-4 rounded-xl bg-red-400 align-middle text-sm outline"
        ><p>X</p></button
      >
    </div>
  </div>

  <!-- DRAWER OPENING BUTTONS -->
  <div
    class="flex mt-3 justify-between w-full {windowSmall ? 'hidden' : 'block'}"
  >
    <button
      class="outline w-5 h-5 rounded-sm font-mono"
      onclick={() => {
        showLDrawer = !showLDrawer;
      }}
    >
      <p>⛭</p>
    </button>
    <button
      class="outline w-5 h-5 rounded-sm flex justify-center"
      onclick={() => {
        showRDrawer = !showRDrawer;
      }}
    >
      {#if showRDrawer}
        <p>&gt</p>
      {:else}
        <p>&lt</p>
      {/if}
    </button>
  </div>

  <!-- ACTUAL TIMER -->
  <div class="svg-container flex items-center justify-center w-full mt-5">
    <svg width="150" height="150">
      <!-- Background track circle -->
      <circle
        class="track"
        cx="75"
        cy="75"
        r={timerRadius}
        style="--radius: {timerRadius}"
      ></circle>
      <!-- Animated indicator circle -->
      <circle
        class="indicator"
        cx="75"
        cy="75"
        r={timerRadius}
        style="--value: {progressBarPercent}; --radius: {timerRadius}; stroke: {currentTimerColor};"
      ></circle>

      <!-- Inner total timer circle -->
      <circle
        class="track"
        cx="75"
        cy="75"
        r={timerRadius - 5}
        style="--radius: {timerRadius - 5}"
      ></circle>
      <!-- Animated indicator circle -->
      <circle
        class="indicator"
        cx="75"
        cy="75"
        r={timerRadius - 5}
        style="--value: {totalTimerPercent}; --radius: {timerRadius -
          5}; stroke: {totalTimerColor};"
      ></circle>
    </svg>
    <div class="percentage" style="color: {currentTimerColor}">
      {String(Math.floor(currentTimerSec / 60)).padStart(2, "0")}:{String(
        currentTimerSec % 60,
      ).padStart(2, "0")}
    </div>
    <div
      class="percentage mt-5 w-20 h-6 text-center text-ellipsis overflow-clip text-nowrap px-2 rounded-sm overflow {darkMode
        ? 'hover:bg-gray-800'
        : 'hover:bg-gray-200'}"
      style="color: {textColor}"
      title={currentTimerName}
    >
      {currentTimerName}
    </div>
    <div class="percentage text-sm mt-10" style="color: {totalTimerColor}">
      {String(Math.floor(totalTimerCurrent / 60)).padStart(2, "0")}:{String(
        totalTimerCurrent % 60,
      ).padStart(2, "0")}
    </div>
  </div>
  {#if windowSmall}
    <div class="flex self-start gap-1">
      <button
        onclick={() => {
          resetTimers();
        }}
        class="flex w-6 h-6 outline rounded-sm text-xl"
      >
        <p class="w-full">⟳</p>
      </button>
      <button
        onclick={() => {
          timerActive = !timerActive;
        }}
        class="flex w-6 h-6 outline rounded-sm text-xl font-mono"
      >
        {#if timerActive}
          <p class="w-full">⏸</p>
        {:else if !timerActive}
          <p class="w-full">▶</p>
        {/if}
      </button>
    </div>
  {/if}

  <!-- BUTTONS FOR REPEAT, RESET, AND START/PAUSE -->
  <div class="flex gap-2 justify-between items-center mt-10">
    <div class="flex justify-between">
      <button
        onclick={() => {
          resetTimers();
        }}
        class="w-20 h-10 outline px-4 rounded-sm text-2xl">⟳</button
      >
      <button
        onclick={() => {
          timerActive = !timerActive;
        }}
        class="w-20 h-10 outline px-4 rounded-sm text-2xl font-mono"
      >
        {#if timerActive}
          <p class="mt-1">⏸</p>
        {:else if !timerActive}
          <p>▶</p>
        {/if}
      </button>
    </div>
  </div>

  <!-- DRAWER -->
  <div
    class="drawer {showRDrawer ? 'block' : 'hidden'} {repeatMode
      ? 'max-h-75'
      : ''} mt-25 p-5 h-70 rounded-sm self-end flex-col float-right overflow-y-auto"
    style="background-color: {accentColor};"
  >
    <div
      class="flex gap-2 items-center outline justify-between rounded-sm h-10 px-2 mb-4"
    >
      <label for="repeatBox">Repeat</label>
      <input
        type="checkbox"
        class="outline"
        bind:checked={repeatMode}
        id="repeatBox"
      />
    </div>
    <p class="font-bold text-sm text-red-400">
      WARNING: TIMER DOES NOT CHANGE LIVE, WILL RESET
    </p>
    {#if !repeatMode}
      <div class="flex flex-row mr-5">
        <label for="timerName" class="min-w-25 w-full">Name:</label>
        <label for="timerMin" class="min-w-15 max-w-30 w-full">Min:</label>
        <label for="timerSec" class="min-w-15 max-w-30 w-full">Sec:</label>
      </div>
      {#each timers as timer, i}
        <div class="flex flex-row">
          <!-- Name of the timer -->
          <input
            placeholder={timer.name}
            bind:value={timer.name}
            id="timerName"
            oninput={() => {
              resetTimers();
            }}
            class="min-w-25 w-full"
          />

          <!-- Minutes of the timer -->
          <input
            type="number"
            min="0"
            placeholder={String(Math.floor(timer.timeInSeconds / 60)).padStart(
              2,
              "0",
            )}
            class="min-w-15 max-w-30"
            bind:value={timerEdits[i].timerMinutes}
            oninput={() => {
              timer.timeInSeconds = recalculateSeconds(
                timerEdits[i].timerMinutes,
                timerEdits[i].timerSeconds,
              );
              resetTimers();
            }}
            id="timerMin"
          />

          <!-- Seconds of the timer -->
          <input
            type="number"
            min="0"
            placeholder={String(Math.floor(timer.timeInSeconds % 60)).padStart(
              2,
              "0",
            )}
            class="min-w-15 max-w-30"
            bind:value={timerEdits[i].timerSeconds}
            oninput={() => {
              timer.timeInSeconds = recalculateSeconds(
                timerEdits[i].timerMinutes,
                timerEdits[i].timerSeconds,
              );
              resetTimers();
            }}
            id="timerSec"
          />

          <button
            class="min-w-5 outline bg-red-400 text-black"
            onclick={() => {
              timers.splice(i, 1);
              timerEdits.splice(i, 1);
              resetTimers();
            }}>-</button
          >
        </div>
      {/each}
      <button
        onclick={() => {
          timers.push({ timeInSeconds: 0, name: "" });
          timerEdits.push({ timerMinutes: 0, timerSeconds: 0 });
        }}
        class="w-10 h-10 bg-green-300 outline text-black">+</button
      >
    {:else if repeatMode}
      <p>Repeat Times</p>
      <div class="max-w-dvw grid grid-cols-4 place-items-center grid-flow-row">
        <label for="timerName" class="justify-self-start">Name:</label>
        <input
          placeholder={repeatingTimer.name}
          bind:value={repeatingTimer.name}
          id="timerName"
          class="col-span-3 max-w-40 justify-self-end"
          oninput={() => {
            calcRepeatTimers();
          }}
        />

        <div class="col-span-2 gap-2 flex w-full items-center justify-between">
          <label for="timerMin" class="justify-self-start">Min:</label>
          <!-- Minutes of the timer -->
          <input
            type="number"
            min="0"
            placeholder={String(
              Math.floor(repeatingTimer.timeInSeconds / 60),
            ).padStart(2, "0")}
            class="min-w-15 max-w-30 w-auto justify-self-end"
            bind:value={repeatingTimerEdits.timerMinutes}
            oninput={() => {
              calcRepeatTimers();
            }}
            id="timerMin"
          />
        </div>

        <div class="col-span-2 gap-2 flex w-full items-center justify-between">
          <label for="timerSec" class="text-center ml-4">Sec:</label>
          <!-- Seconds of the timer -->
          <input
            type="number"
            min="0"
            max="59"
            placeholder={String(
              Math.floor(repeatingTimer.timeInSeconds % 60),
            ).padStart(2, "0")}
            class="min-w-15 max-w-30 w-auto justify-self-end"
            bind:value={repeatingTimerEdits.timerSeconds}
            oninput={() => {
              calcRepeatTimers();
            }}
            id="timerSec"
          />
        </div>

        <!-- Repeats -->
        <label for="timerRepeats" class="justify-self-start">Repeats: </label>
        <input
          type="number"
          min="1"
          class="col-span-3 max-w-40 justify-self-end"
          bind:value={repeatingTimer.repeatTimes}
          oninput={() => {
            calcRepeatTimers();
          }}
          id="timerRepeats"
        />
      </div>
    {/if}
  </div>

  <!-- CONFIGS -->
  <div
    class="drawer {showLDrawer
      ? 'block'
      : 'hidden'} flex flex-col justify-between self-start rounded-sm p-5 mt-25 float-left overflow-y-auto"
    style="background-color: {accentColor};"
  >
    <div class="flex justify-between items-center p-2 rounded-sm">
      <label for="colorMode" class="text-center">Light/Dark</label>
      {#if darkMode}
        <button
          class="flex items-center font-mono outline p-2 w-fit h-6 rounded-sm"
          id="colorMode"
          onclick={swapColorMode}><p class="mt-1">☾</p></button
        >
      {:else}
        <button
          class="flex items-center font-mono outline p-2 w-fit h-6 rounded-sm"
          id="colorMode"
          onclick={swapColorMode}><p class="mt-1">☀</p></button
        >
      {/if}
      <!-- <input type="checkbox" name="colorMode" id="colorMode" class="outline" onchange={swapColorMode}> -->
    </div>
    <div class="flex justify-between items-center p-2 rounded-sm">
      <label for="currentColor" class="text-center">Current Timer Color</label>
      <input
        type="color"
        name="currentColor"
        id="currentColor"
        bind:value={currentTimerColor}
      />
    </div>
    <div class="flex justify-between items-center p-2 rounded-sm">
      <label for="totalColor" class="text-center">Total Timer Color</label>
      <input
        type="color"
        name="totalColor"
        id="totalColor"
        bind:value={totalTimerColor}
      />
    </div>
    <div class="flex justify-between items-center p-2 rounded-sm">
      <label for="bgColor" class="text-center">Bg Color</label>
      <input
        type="color"
        name="bgColor"
        id="bgColor"
        bind:value={backgroundColor}
        onchange={updateColorMode}
      />
    </div>
    <div class="flex justify-between items-center p-2 rounded-sm">
      <label for="accentColor" class="text-center">Accent Color</label>
      <input
        type="color"
        name="accentColor"
        id="accentColor"
        bind:value={accentColor}
        onchange={updateColorMode}
      />
    </div>
    <div class="flex justify-between items-center p-2 rounded-sm">
      <label for="textColor" class="text-center">Text Color</label>
      <input
        type="color"
        name="textColor"
        id="textColor"
        bind:value={textColor}
        onchange={updateColorMode}
      />
    </div>

    <!-- PRESETS -->
    <p class="text-center font-mono">PRESETS:</p>
    <div class="flex flex-col gap-1 overflow-y-auto overflow-x-clip h-65 w-full">
      {#each colorPresets as preset, index}
        <div class="flex justify-between items-center p-2 mx-1 gap-1 rounded-sm outline mt-1">
          <button
            onclick={() => {
              colorPresets.splice(index, 1);
            }}
            class="outline rounded-sm px-1 bg-red-400 flex items-center justify-center"
            >X</button
          >
          <input
            type="text"
            class="rounded-sm min-w-10"
            bind:value={preset.presetName}
            title={preset.presetName}
          />
          <div class="flex gap-2">
            <button
              id="save-{index}"
              class="outline p-1 rounded-sm"
              onclick={() => savePreset(colorPresets, index)}>Save</button
            >
            <button
              id="preset-{index}"
              class="outline p-1 rounded-sm"
              onclick={() => loadPreset(colorPresets, index)}>Load</button
            >
          </div>
        </div>
      {/each}
      <button
        class="outline bg-green-300 rounded-sm"
        onclick={() => {
          colorPresets.push({
            presetName: "",
            darkMode: darkMode,
            currentTimerColor: currentTimerColor,
            totalTimerColor: totalTimerColor,
            backgroundColor: backgroundColor,
            accentColor: accentColor,
            textColor: textColor,
          });
          savePreset(colorPresets, colorPresets.length - 1);
        }}>+</button
      >
    </div>
  </div>
</div>

<style>
  :root {
    --viewport-w: calc(100vw / 100);
    --background-color: #101828;
    --accent-color: #1e2939;
    --text-color: #ffffff;
  }

  .windowdragbar {
    /* user-select: none; */
    -webkit-app-region: drag; /* Property that allows the whole window to be dragged */
  }

  .svg-container {
    width: fit-content;
    height: fit-content;
    transition: transform 0.2s ease-in-out;
    --s: clamp(1.5, calc(100vh / 200px), calc(100vw / 400px));
    scale: var(--s);
    transform-origin: top center;
    margin-bottom: calc(140px * (var(--s) - 1));
  }

  .drawer {
    position: absolute;
    --ds: clamp(1, calc(100vh / 400px), calc(100vw / 800px));

    --maxw: clamp(280px, calc(100vw / 2), 450px);
    --maxh: clamp(280px, calc(100vh / 1.5), 475);
    /* scale: var(--ds); */
    width: var(--maxw);
    height: var(--maxh);
    transform-origin: top right;
  }

  circle {
    fill: none;
    stroke-width: 5px;
    /* Circumference = 2 * pi * radius */
    --c: calc(2 * pi * var(--radius));
    stroke-dasharray: calc(var(--c) * 5 / 6) calc(var(--c) * 1 / 6);
    transform-origin: center;
    transform: rotate(-240deg);
  }

  .track {
    stroke: #e5e7eb;
  }

  .indicator {
    stroke-linecap: square;
    stroke-dasharray: var(--c);
    /* Offset math: c - (c (with gap) * % filled) */
    stroke-dashoffset: calc(
      var(--c) - (calc(var(--c) * 5 / 6) * (var(--value)) / 100)
    );
    /* What happens between each step */
    transition: stroke-dashoffset 0.2s ease-in-out;
  }

  .percentage {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-weight: bold;
  }

  input {
    background-color: var(--background-color);
    color: var(--text-color);
  }
</style>
