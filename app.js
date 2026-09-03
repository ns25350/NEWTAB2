"use strict";

const FIREBASE_URL = "https://johou7-275be-default-rtdb.firebaseio.com/timetable.json";
const STATE_KEY = "homeGridStateV2";
const LEGACY_STATE_KEY = "pixelHomeStateV1";
const TIMETABLE_CACHE_KEY = "homeGridTimetableCacheV2";
const WALLPAPER_DB = "home-grid-assets";
const WALLPAPER_STORE = "wallpaper";

const CLASS_LIST = [
  "101", "102", "103", "104", "105", "106", "107", "108", "109", "110",
  "201", "202", "203", "204", "205/6文", "205理", "206理", "207", "208", "209", "210",
  "301", "302", "303", "304", "305", "306", "307", "308", "309", "310"
];

const DEFAULT_SHORTCUTS = [
  { id: "google", name: "Google", url: "https://www.google.com/", color: "#4285f4" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/", color: "#e23b32" },
  { id: "classroom", name: "Classroom", url: "https://classroom.google.com/", color: "#28a15b" },
  { id: "drive", name: "Drive", url: "https://drive.google.com/", color: "#f2aa18" }
];

const GRID_PRESETS = {
  large: { columns: 8, rowHeight: 96, gap: 16 },
  standard: { columns: 12, rowHeight: 78, gap: 14 },
  compact: { columns: 16, rowHeight: 62, gap: 10 }
};

const elements = {
  body: document.body,
  wallpaperLayer: document.getElementById("wallpaperLayer"),
  editButton: document.getElementById("editButton"),
  editButtonLabel: document.getElementById("editButtonLabel"),
  settingsButton: document.getElementById("settingsButton"),
  editGuide: document.getElementById("editGuide"),
  homeGrid: document.getElementById("homeGrid"),
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  suggestions: document.getElementById("suggestions"),
  digitalClock: document.getElementById("digitalClock"),
  analogClock: document.getElementById("analogClock"),
  clockTime: document.getElementById("clockTime"),
  clockDate: document.getElementById("clockDate"),
  analogDate: document.getElementById("analogDate"),
  hourHand: document.getElementById("hourHand"),
  minuteHand: document.getElementById("minuteHand"),
  secondHand: document.getElementById("secondHand"),
  timetableMeta: document.getElementById("timetableMeta"),
  timetableContent: document.getElementById("timetableContent"),
  refreshTimetable: document.getElementById("refreshTimetable"),
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  closeSettings: document.getElementById("closeSettings"),
  gridPresets: document.getElementById("gridPresets"),
  gridColumns: document.getElementById("gridColumns"),
  gridColumnsValue: document.getElementById("gridColumnsValue"),
  gridRowHeight: document.getElementById("gridRowHeight"),
  gridRowHeightValue: document.getElementById("gridRowHeightValue"),
  gridGap: document.getElementById("gridGap"),
  gridGapValue: document.getElementById("gridGapValue"),
  wallpaperInput: document.getElementById("wallpaperInput"),
  removeWallpaper: document.getElementById("removeWallpaper"),
  autoTheme: document.getElementById("autoTheme"),
  manualThemes: document.getElementById("manualThemes"),
  widgetOpacity: document.getElementById("widgetOpacity"),
  widgetOpacityValue: document.getElementById("widgetOpacityValue"),
  wallpaperShade: document.getElementById("wallpaperShade"),
  wallpaperShadeValue: document.getElementById("wallpaperShadeValue"),
  searchEnabled: document.getElementById("searchEnabled"),
  clockEnabled: document.getElementById("clockEnabled"),
  clockType: document.getElementById("clockType"),
  clock24Hour: document.getElementById("clock24Hour"),
  timetableEnabled: document.getElementById("timetableEnabled"),
  classSelect: document.getElementById("classSelect"),
  switchTime: document.getElementById("switchTime"),
  resetButton: document.getElementById("resetButton"),
  shortcutDialog: document.getElementById("shortcutDialog"),
  shortcutForm: document.getElementById("shortcutForm"),
  shortcutDialogTitle: document.getElementById("shortcutDialogTitle"),
  shortcutName: document.getElementById("shortcutName"),
  shortcutUrl: document.getElementById("shortcutUrl"),
  shortcutColor: document.getElementById("shortcutColor"),
  deleteShortcut: document.getElementById("deleteShortcut"),
  closeShortcutDialog: document.getElementById("closeShortcutDialog"),
  cancelShortcut: document.getElementById("cancelShortcut"),
  toast: document.getElementById("toast")
};

let state = loadState();
let isEditing = false;
let dragSession = null;
let suppressShortcutClickUntil = 0;
let wallpaperObjectUrl = "";
let timetableData = null;
let selectedDayOffset = getAutomaticDayOffset();
let timetableDayWasSelected = false;
let clockTimer = 0;
let toastTimer = 0;
let searchSuggestions = [];
let activeSuggestionIndex = -1;
let suggestionTimer = 0;
let suggestionRequest = null;

initialize();

async function initialize() {
  populateClassSelect();
  ensureLayoutEntries();
  settleLayout();
  bindEvents();
  applyGridSettings();
  applyAppearance();
  renderHome();
  syncSettingsControls();
  updateClock();
  startClock();
  fetchTimetable();
  await loadWallpaper();
}

function createDefaultState() {
  return {
    version: 2,
    grid: { ...GRID_PRESETS.standard },
    appearance: {
      autoTheme: true,
      manualTheme: "silver",
      widgetOpacity: 82,
      wallpaperShade: 18,
      autoPalette: null,
      hasWallpaper: false
    },
    search: { enabled: true },
    clock: { enabled: true, type: "digital", is24Hour: true },
    timetable: { enabled: true, className: "101", switchTime: "16:00" },
    shortcuts: DEFAULT_SHORTCUTS.map((item) => ({ ...item })),
    order: ["clock", "search", "timetable", ...DEFAULT_SHORTCUTS.map((item) => shortcutKey(item.id))],
    layout: {
      clock: { x: 0, y: 0, w: 4, h: 3 },
      search: { x: 4, y: 0, w: 8, h: 1 },
      timetable: { x: 4, y: 1, w: 8, h: 3 },
      [shortcutKey("google")]: { x: 0, y: 3, w: 2, h: 2 },
      [shortcutKey("youtube")]: { x: 2, y: 3, w: 2, h: 2 },
      [shortcutKey("classroom")]: { x: 0, y: 5, w: 2, h: 2 },
      [shortcutKey("drive")]: { x: 2, y: 5, w: 2, h: 2 }
    }
  };
}

function loadState() {
  const defaults = createDefaultState();
  try {
    const stored = JSON.parse(localStorage.getItem(STATE_KEY));
    if (stored?.version === 2) return mergeWithDefaults(stored, defaults);

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STATE_KEY));
    if (legacy && typeof legacy === "object") {
      defaults.appearance.manualTheme = mapLegacyTheme(legacy.theme);
      defaults.appearance.autoTheme = false;
      defaults.clock = { ...defaults.clock, ...(legacy.clock || {}) };
      defaults.timetable = { ...defaults.timetable, ...(legacy.timetable || {}) };
      if (Array.isArray(legacy.shortcuts)) {
        defaults.shortcuts = legacy.shortcuts.filter(isStoredShortcut).map((item) => ({ ...item }));
        defaults.order = ["clock", "search", "timetable", ...defaults.shortcuts.map((item) => shortcutKey(item.id))];
      }
      return defaults;
    }
  } catch (error) {
    console.warn("設定の読み込みに失敗しました。", error);
  }
  return defaults;
}

function mergeWithDefaults(stored, defaults) {
  const shortcuts = Array.isArray(stored.shortcuts)
    ? stored.shortcuts.filter(isStoredShortcut).map((item) => ({ ...item }))
    : defaults.shortcuts;
  const validKeys = new Set(["search", "clock", "timetable", ...shortcuts.map((item) => shortcutKey(item.id))]);
  const order = Array.isArray(stored.order) ? stored.order.filter((key) => validKeys.has(key)) : [];
  validKeys.forEach((key) => { if (!order.includes(key)) order.push(key); });

  return {
    version: 2,
    grid: {
      columns: clampNumber(stored.grid?.columns, 6, 16, defaults.grid.columns),
      rowHeight: clampNumber(stored.grid?.rowHeight, 56, 112, defaults.grid.rowHeight),
      gap: clampNumber(stored.grid?.gap, 8, 24, defaults.grid.gap)
    },
    appearance: { ...defaults.appearance, ...(stored.appearance || {}) },
    search: { ...defaults.search, ...(stored.search || {}) },
    clock: { ...defaults.clock, ...(stored.clock || {}) },
    timetable: { ...defaults.timetable, ...(stored.timetable || {}) },
    shortcuts,
    order,
    layout: stored.layout && typeof stored.layout === "object" ? structuredClone(stored.layout) : structuredClone(defaults.layout)
  };
}

function mapLegacyTheme(theme) {
  return ({ blue: "silver", green: "ocean", violet: "rose", coral: "rose", dark: "graphite" })[theme] || "silver";
}

function isStoredShortcut(item) {
  return item && typeof item.id === "string" && typeof item.name === "string" && typeof item.url === "string";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function shortcutKey(id) {
  return `shortcut:${id}`;
}

function itemKind(key) {
  return key.startsWith("shortcut:") ? "shortcut" : key;
}

function visibleKeys() {
  return state.order.filter((key) => {
    if (key === "search") return state.search.enabled;
    if (key === "clock") return state.clock.enabled;
    if (key === "timetable") return state.timetable.enabled;
    return key.startsWith("shortcut:") && state.shortcuts.some((item) => shortcutKey(item.id) === key);
  });
}

function limitsFor(key) {
  const columns = state.grid.columns;
  const kind = itemKind(key);
  if (kind === "search") return { minW: Math.min(4, columns), maxW: columns, minH: 1, maxH: 2 };
  if (kind === "clock") return { minW: Math.min(2, columns), maxW: columns, minH: 2, maxH: 6 };
  if (kind === "timetable") return { minW: Math.min(4, columns), maxW: columns, minH: 2, maxH: 6 };
  return { minW: 1, maxW: Math.min(4, columns), minH: 1, maxH: 4 };
}

function defaultRectFor(key) {
  const columns = state.grid.columns;
  const kind = itemKind(key);
  if (kind === "clock") return { x: 0, y: 0, w: Math.max(2, Math.round(columns / 3)), h: 3 };
  if (kind === "search") {
    const clockWidth = Math.max(2, Math.round(columns / 3));
    return { x: clockWidth, y: 0, w: columns - clockWidth, h: 1 };
  }
  if (kind === "timetable") {
    const clockWidth = Math.max(2, Math.round(columns / 3));
    return { x: clockWidth, y: 1, w: columns - clockWidth, h: 3 };
  }
  return findOpenRect(Math.min(2, columns), 2);
}

function ensureLayoutEntries() {
  state.order.forEach((key) => {
    if (!state.layout[key]) state.layout[key] = defaultRectFor(key);
    state.layout[key] = clampRect(key, state.layout[key]);
  });
}

function clampRect(key, input) {
  const limits = limitsFor(key);
  const w = Math.min(state.grid.columns, clampNumber(input?.w, limits.minW, limits.maxW, limits.minW));
  const h = clampNumber(input?.h, limits.minH, limits.maxH, limits.minH);
  return {
    x: clampNumber(input?.x, 0, Math.max(0, state.grid.columns - w), 0),
    y: Math.max(0, Math.round(Number(input?.y) || 0)),
    w: Math.round(w),
    h: Math.round(h)
  };
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findRectAgainst(width, height, placed, startY = 0) {
  const w = Math.min(width, state.grid.columns);
  for (let y = Math.max(0, startY); y < 120; y += 1) {
    for (let x = 0; x <= state.grid.columns - w; x += 1) {
      const candidate = { x, y, w, h: height };
      if (!placed.some((rect) => overlaps(candidate, rect))) return candidate;
    }
  }
  return { x: 0, y: 120, w, h: height };
}

function findOpenRect(width, height, ignoreKey = "", startY = 0) {
  const placed = visibleKeys()
    .filter((key) => key !== ignoreKey && state.layout[key])
    .map((key) => state.layout[key]);
  return findRectAgainst(width, height, placed, startY);
}

function settleLayout(activeKey = "") {
  ensureLayoutEntries();
  const keys = visibleKeys();
  keys.sort((a, b) => {
    if (a === activeKey) return -1;
    if (b === activeKey) return 1;
    const first = state.layout[a];
    const second = state.layout[b];
    return first.y - second.y || first.x - second.x || state.order.indexOf(a) - state.order.indexOf(b);
  });

  const placed = [];
  keys.forEach((key) => {
    let rect = clampRect(key, state.layout[key]);
    if (placed.some((other) => overlaps(rect, other))) rect = findRectAgainst(rect.w, rect.h, placed, rect.y);
    state.layout[key] = rect;
    placed.push(rect);
  });
}

function changeColumnCount(nextColumns) {
  const oldColumns = state.grid.columns;
  const columns = clampNumber(nextColumns, 6, 16, oldColumns);
  if (columns === oldColumns) return;
  const ratio = columns / oldColumns;
  state.grid.columns = columns;
  Object.entries(state.layout).forEach(([key, rect]) => {
    state.layout[key] = clampRect(key, {
      ...rect,
      x: Math.round(rect.x * ratio),
      w: Math.max(1, Math.round(rect.w * ratio))
    });
  });
  ensureLayoutEntries();
  settleLayout();
}

function applyGridPreset(name) {
  const preset = GRID_PRESETS[name];
  if (!preset) return;
  changeColumnCount(preset.columns);
  state.grid.rowHeight = preset.rowHeight;
  state.grid.gap = preset.gap;
  settleLayout();
  saveState();
  applyGridSettings();
  renderHome();
  syncSettingsControls();
  showToast(`グリッドを「${name === "large" ? "大きめ" : name === "compact" ? "細かめ" : "標準"}」に変更しました`);
}

function applyGridSettings() {
  const root = document.documentElement.style;
  root.setProperty("--grid-cols", String(state.grid.columns));
  root.setProperty("--grid-row", `${state.grid.rowHeight}px`);
  root.setProperty("--grid-gap", `${state.grid.gap}px`);
}

function renderHome() {
  elements.homeGrid.querySelectorAll(".shortcut-item").forEach((item) => item.remove());
  const coreVisibility = { search: state.search.enabled, clock: state.clock.enabled, timetable: state.timetable.enabled };
  Object.entries(coreVisibility).forEach(([key, visible]) => {
    const item = elements.homeGrid.querySelector(`[data-key="${key}"]`);
    if (item) item.hidden = !visible;
  });

  state.shortcuts.forEach((shortcut) => elements.homeGrid.appendChild(createShortcutElement(shortcut)));
  if (isEditing) elements.homeGrid.appendChild(createAddShortcutElement());
  applyAllPositions();
  elements.body.classList.toggle("editing", isEditing);
  elements.editButton.setAttribute("aria-pressed", String(isEditing));
  elements.editButtonLabel.textContent = isEditing ? "完了" : "編集";
  elements.editGuide.hidden = !isEditing;
}

function createShortcutElement(shortcut) {
  const item = document.createElement("article");
  item.className = "grid-item shortcut-item";
  item.dataset.key = shortcutKey(shortcut.id);
  item.innerHTML = `
    <div class="shortcut-actions">
      <button class="shortcut-delete" type="button" aria-label="${escapeHtml(shortcut.name)}を削除">−</button>
      <button class="shortcut-edit" type="button" aria-label="${escapeHtml(shortcut.name)}を編集">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5V20h4.5L19.8 8.7l-4.5-4.5L4 15.5Z"/></svg>
      </button>
    </div>
    <button class="shortcut-link" type="button" aria-label="${escapeHtml(shortcut.name)}を開く">
      <span class="shortcut-icon" style="--shortcut-color:${safeColor(shortcut.color)}">
        <span class="shortcut-initial">${escapeHtml(firstCharacter(shortcut.name))}</span>
        <img src="${faviconUrl(shortcut.url)}" alt="">
      </span>
      <span class="shortcut-name">${escapeHtml(shortcut.name)}</span>
    </button>
    <button class="resize-handle" type="button" aria-label="${escapeHtml(shortcut.name)}の大きさを変更"><span></span></button>`;

  const image = item.querySelector("img");
  image.addEventListener("error", () => image.remove(), { once: true });
  item.querySelector(".shortcut-link").addEventListener("click", () => {
    if (!isEditing && Date.now() > suppressShortcutClickUntil) window.location.href = shortcut.url;
  });
  item.querySelector(".shortcut-edit").addEventListener("click", () => openShortcutDialog(shortcut.id));
  item.querySelector(".shortcut-delete").addEventListener("click", () => deleteShortcut(shortcut.id));
  return item;
}

function createAddShortcutElement() {
  const item = document.createElement("article");
  item.className = "grid-item shortcut-item add-shortcut";
  item.dataset.key = "add-shortcut";
  item.innerHTML = '<button class="shortcut-link" type="button" aria-label="ショートカットを追加"><span class="shortcut-icon"><span class="plus">＋</span></span><span class="shortcut-name">追加</span></button>';
  item.querySelector("button").addEventListener("click", () => openShortcutDialog());
  return item;
}

function applyAllPositions() {
  visibleKeys().forEach((key) => {
    const item = elements.homeGrid.querySelector(`[data-key="${cssEscape(key)}"]`);
    if (item) positionElement(item, key, state.layout[key]);
  });

  const addItem = elements.homeGrid.querySelector('[data-key="add-shortcut"]');
  if (addItem) positionElement(addItem, "add-shortcut", findOpenRect(Math.min(2, state.grid.columns), 2));
}

function positionElement(item, key, rect) {
  if (!rect) return;
  item.style.gridColumn = `${rect.x + 1} / span ${rect.w}`;
  item.style.gridRow = `${rect.y + 1} / span ${rect.h}`;
  item.dataset.gridWidth = String(rect.w);
  item.dataset.gridHeight = String(rect.h);
  const badge = item.querySelector(".size-badge");
  if (badge) badge.textContent = `${rect.w} × ${rect.h}`;
}

function cssEscape(value) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replaceAll(":", "\\:");
}

function bindEvents() {
  elements.editButton.addEventListener("click", toggleEditMode);
  elements.settingsButton.addEventListener("click", () => {
    syncSettingsControls();
    elements.settingsDialog.showModal();
  });
  elements.closeSettings.addEventListener("click", () => elements.settingsDialog.close());
  bindBackdropClose(elements.settingsDialog);
  bindBackdropClose(elements.shortcutDialog);

  elements.homeGrid.addEventListener("pointerdown", beginGridDrag);
  document.addEventListener("pointermove", updateGridDrag);
  document.addEventListener("pointerup", finishGridDrag);
  document.addEventListener("pointercancel", finishGridDrag);
  document.querySelectorAll("[data-hide-widget]").forEach((button) => {
    button.addEventListener("click", () => hideWidget(button.dataset.hideWidget));
  });

  elements.gridPresets.addEventListener("click", (event) => {
    const button = event.target.closest("[data-grid-preset]");
    if (button) applyGridPreset(button.dataset.gridPreset);
  });
  elements.gridColumns.addEventListener("input", () => {
    changeColumnCount(elements.gridColumns.value);
    saveState();
    applyGridSettings();
    renderHome();
    syncSettingsControls();
  });
  elements.gridRowHeight.addEventListener("input", () => {
    state.grid.rowHeight = Number(elements.gridRowHeight.value);
    saveState(); applyGridSettings(); syncSettingsControls();
  });
  elements.gridGap.addEventListener("input", () => {
    state.grid.gap = Number(elements.gridGap.value);
    saveState(); applyGridSettings(); syncSettingsControls();
  });

  elements.wallpaperInput.addEventListener("change", handleWallpaperUpload);
  elements.removeWallpaper.addEventListener("click", removeWallpaper);
  elements.autoTheme.addEventListener("change", () => {
    state.appearance.autoTheme = elements.autoTheme.checked;
    saveState(); applyAppearance(); syncSettingsControls();
  });
  elements.manualThemes.addEventListener("change", (event) => {
    if (event.target.name !== "manualTheme") return;
    state.appearance.manualTheme = event.target.value;
    state.appearance.autoTheme = false;
    saveState(); applyAppearance(); syncSettingsControls();
  });
  elements.widgetOpacity.addEventListener("input", () => {
    state.appearance.widgetOpacity = Number(elements.widgetOpacity.value);
    saveState(); applyAppearance(); syncSettingsControls();
  });
  elements.wallpaperShade.addEventListener("input", () => {
    state.appearance.wallpaperShade = Number(elements.wallpaperShade.value);
    saveState(); applyAppearance(); syncSettingsControls();
  });

  elements.searchEnabled.addEventListener("change", () => setWidgetEnabled("search", elements.searchEnabled.checked));
  elements.clockEnabled.addEventListener("change", () => setWidgetEnabled("clock", elements.clockEnabled.checked));
  elements.timetableEnabled.addEventListener("change", () => setWidgetEnabled("timetable", elements.timetableEnabled.checked));
  elements.clockType.addEventListener("change", () => {
    state.clock.type = elements.clockType.value;
    saveState(); updateClockMode();
  });
  elements.clock24Hour.addEventListener("change", () => {
    state.clock.is24Hour = elements.clock24Hour.checked;
    saveState(); updateClock();
  });
  elements.classSelect.addEventListener("change", () => {
    state.timetable.className = elements.classSelect.value;
    saveState(); renderTimetable();
  });
  elements.switchTime.addEventListener("change", () => {
    state.timetable.switchTime = elements.switchTime.value || "16:00";
    timetableDayWasSelected = false;
    selectedDayOffset = getAutomaticDayOffset();
    saveState(); renderTimetable();
  });
  elements.resetButton.addEventListener("click", resetHome);

  elements.searchForm.addEventListener("submit", handleSearchSubmit);
  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.searchInput.addEventListener("keydown", handleSearchKeys);
  elements.searchInput.addEventListener("focus", () => { if (searchSuggestions.length) showSuggestions(); });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".search-item")) hideSuggestions();
  });

  elements.refreshTimetable.addEventListener("click", () => fetchTimetable(true));
  document.querySelectorAll("[data-day-offset]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDayOffset = Number(button.dataset.dayOffset);
      timetableDayWasSelected = true;
      renderTimetable();
    });
  });

  elements.shortcutForm.addEventListener("submit", saveShortcutFromDialog);
  elements.closeShortcutDialog.addEventListener("click", closeShortcutDialog);
  elements.cancelShortcut.addEventListener("click", closeShortcutDialog);
  elements.deleteShortcut.addEventListener("click", () => deleteShortcut(elements.shortcutForm.dataset.editId));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopClock(); else { updateClock(); startClock(); }
  });
}

function bindBackdropClose(dialog) {
  dialog.addEventListener("click", (event) => {
    const panel = dialog.querySelector(".sheet-panel");
    if (!panel.contains(event.target)) dialog.close();
  });
}

function toggleEditMode() {
  isEditing = !isEditing;
  renderHome();
  showToast(isEditing ? "アイコンとウィジェットを編集できます" : "配置を保存しました");
}

function hideWidget(key) {
  if (!state[key]) return;
  state[key].enabled = false;
  saveState();
  renderHome();
  syncSettingsControls();
  showToast("設定からもう一度表示できます");
}

function setWidgetEnabled(key, enabled) {
  state[key].enabled = enabled;
  if (enabled) {
    if (!state.layout[key]) state.layout[key] = defaultRectFor(key);
    settleLayout(key);
  }
  saveState();
  renderHome();
  if (key === "timetable" && enabled && !timetableData) fetchTimetable();
}

function beginGridDrag(event) {
  if (!isEditing || event.button !== 0) return;
  const item = event.target.closest(".grid-item");
  if (!item || item.dataset.key === "add-shortcut") return;
  const key = item.dataset.key;
  if (!state.layout[key]) return;

  let mode = "";
  if (event.target.closest(".resize-handle")) mode = "resize";
  else if (event.target.closest(".drag-grip")) mode = "move";
  else if (item.classList.contains("shortcut-item") && !event.target.closest(".shortcut-actions")) mode = "move";
  if (!mode) return;

  event.preventDefault();
  item.setPointerCapture?.(event.pointerId);
  dragSession = {
    pointerId: event.pointerId,
    key,
    mode,
    startX: event.clientX,
    startY: event.clientY,
    original: { ...state.layout[key] },
    moved: false,
    item
  };
  item.classList.add("drag-active");
  elements.body.classList.add("dragging");
}

function updateGridDrag(event) {
  if (!dragSession || event.pointerId !== dragSession.pointerId) return;
  const gridRect = elements.homeGrid.getBoundingClientRect();
  const columnStep = (gridRect.width + state.grid.gap) / state.grid.columns;
  const rowStep = state.grid.rowHeight + state.grid.gap;
  const dx = Math.round((event.clientX - dragSession.startX) / columnStep);
  const dy = Math.round((event.clientY - dragSession.startY) / rowStep);
  const original = dragSession.original;
  const limits = limitsFor(dragSession.key);
  let next;

  if (dragSession.mode === "move") {
    next = {
      ...original,
      x: Math.min(state.grid.columns - original.w, Math.max(0, original.x + dx)),
      y: Math.max(0, original.y + dy)
    };
  } else {
    next = {
      ...original,
      w: Math.min(state.grid.columns - original.x, Math.max(limits.minW, Math.min(limits.maxW, original.w + dx))),
      h: Math.max(limits.minH, Math.min(limits.maxH, original.h + dy))
    };
  }

  next = clampRect(dragSession.key, next);
  dragSession.moved ||= next.x !== original.x || next.y !== original.y || next.w !== original.w || next.h !== original.h;
  state.layout[dragSession.key] = next;
  positionElement(dragSession.item, dragSession.key, next);
  if (event.clientY > window.innerHeight - 42) window.scrollBy({ top: 18, behavior: "auto" });
}

function finishGridDrag(event) {
  if (!dragSession || (event.pointerId !== undefined && event.pointerId !== dragSession.pointerId)) return;
  dragSession.item.classList.remove("drag-active");
  if (dragSession.moved) suppressShortcutClickUntil = Date.now() + 350;
  const activeKey = dragSession.key;
  dragSession = null;
  elements.body.classList.remove("dragging");
  settleLayout(activeKey);
  saveState();
  renderHome();
}

function syncSettingsControls() {
  elements.gridColumns.value = String(state.grid.columns);
  elements.gridColumnsValue.textContent = String(state.grid.columns);
  elements.gridRowHeight.value = String(state.grid.rowHeight);
  elements.gridRowHeightValue.textContent = `${state.grid.rowHeight} px`;
  elements.gridGap.value = String(state.grid.gap);
  elements.gridGapValue.textContent = `${state.grid.gap} px`;
  elements.widgetOpacity.value = String(state.appearance.widgetOpacity);
  elements.widgetOpacityValue.textContent = `${state.appearance.widgetOpacity}%`;
  elements.wallpaperShade.value = String(state.appearance.wallpaperShade);
  elements.wallpaperShadeValue.textContent = `${state.appearance.wallpaperShade}%`;
  elements.autoTheme.checked = state.appearance.autoTheme;
  elements.manualThemes.disabled = state.appearance.autoTheme;
  const theme = elements.manualThemes.querySelector(`[name="manualTheme"][value="${state.appearance.manualTheme}"]`);
  if (theme) theme.checked = true;
  elements.searchEnabled.checked = state.search.enabled;
  elements.clockEnabled.checked = state.clock.enabled;
  elements.clockType.value = state.clock.type;
  elements.clock24Hour.checked = state.clock.is24Hour;
  elements.timetableEnabled.checked = state.timetable.enabled;
  elements.classSelect.value = state.timetable.className;
  elements.switchTime.value = state.timetable.switchTime;
  elements.removeWallpaper.disabled = !state.appearance.hasWallpaper;

  elements.gridPresets.querySelectorAll("[data-grid-preset]").forEach((button) => {
    const preset = GRID_PRESETS[button.dataset.gridPreset];
    button.classList.toggle("active", preset.columns === state.grid.columns && preset.rowHeight === state.grid.rowHeight && preset.gap === state.grid.gap);
  });
}

function applyAppearance() {
  const style = document.documentElement.style;
  style.setProperty("--widget-opacity", String(state.appearance.widgetOpacity / 100));
  style.setProperty("--wallpaper-shade", String(state.appearance.wallpaperShade / 100));

  const palette = state.appearance.autoTheme ? state.appearance.autoPalette : null;
  if (palette) {
    elements.body.dataset.theme = "auto";
    style.setProperty("--surface-rgb", palette.surface.join(" "));
    style.setProperty("--surface-strong-rgb", palette.surfaceStrong.join(" "));
    style.setProperty("--text-rgb", palette.text.join(" "));
    style.setProperty("--muted-rgb", palette.muted.join(" "));
    style.setProperty("--accent-rgb", palette.accent.join(" "));
    style.setProperty("--accent-contrast-rgb", palette.accentContrast.join(" "));
    document.documentElement.style.colorScheme = palette.dark ? "dark" : "light";
  } else {
    elements.body.dataset.theme = state.appearance.autoTheme ? "silver" : state.appearance.manualTheme;
    ["--surface-rgb", "--surface-strong-rgb", "--text-rgb", "--muted-rgb", "--accent-rgb", "--accent-contrast-rgb"].forEach((property) => style.removeProperty(property));
    document.documentElement.style.colorScheme = elements.body.dataset.theme === "graphite" ? "dark" : "light";
  }
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim().split(/\s+/).map(Number);
  document.querySelector('meta[name="theme-color"]').content = rgbToHex(accent);
}

async function openWallpaperDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(WALLPAPER_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(WALLPAPER_STORE)) request.result.createObjectStore(WALLPAPER_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function wallpaperDatabaseAction(mode, value) {
  const database = await openWallpaperDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(WALLPAPER_STORE, mode === "get" ? "readonly" : "readwrite");
    const store = transaction.objectStore(WALLPAPER_STORE);
    const request = mode === "get" ? store.get("current") : mode === "put" ? store.put(value, "current") : store.delete("current");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function loadWallpaper() {
  try {
    const blob = await wallpaperDatabaseAction("get");
    if (blob instanceof Blob) {
      setWallpaperBlob(blob);
      state.appearance.hasWallpaper = true;
    } else {
      state.appearance.hasWallpaper = false;
    }
  } catch (error) {
    state.appearance.hasWallpaper = false;
    console.warn("壁紙を読み込めませんでした。", error);
  }
  saveState();
  syncSettingsControls();
}

function setWallpaperBlob(blob) {
  if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
  wallpaperObjectUrl = URL.createObjectURL(blob);
  elements.wallpaperLayer.style.backgroundImage = `url("${wallpaperObjectUrl}")`;
}

async function handleWallpaperUpload() {
  const file = elements.wallpaperInput.files?.[0];
  elements.wallpaperInput.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("画像ファイルを選んでください");
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    showToast("壁紙は20MB以下の画像にしてください");
    return;
  }

  try {
    const palette = await extractPalette(file);
    await wallpaperDatabaseAction("put", file);
    state.appearance.hasWallpaper = true;
    state.appearance.autoPalette = palette;
    setWallpaperBlob(file);
    saveState();
    applyAppearance();
    syncSettingsControls();
    showToast("壁紙とウィジェットの色を更新しました");
  } catch (error) {
    console.error("壁紙の設定に失敗しました。", error);
    showToast("この画像を壁紙に設定できませんでした");
  }
}

async function removeWallpaper() {
  try { await wallpaperDatabaseAction("delete"); } catch (error) { console.warn(error); }
  if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
  wallpaperObjectUrl = "";
  elements.wallpaperLayer.style.backgroundImage = "";
  state.appearance.hasWallpaper = false;
  state.appearance.autoPalette = null;
  saveState();
  applyAppearance();
  syncSettingsControls();
  showToast("壁紙を削除しました");
}

async function extractPalette(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 56;
  canvas.height = 56;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const crop = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - crop) / 2;
  const sy = (bitmap.height - crop) / 2;
  context.drawImage(bitmap, sx, sy, crop, crop, 0, 0, 56, 56);
  bitmap.close?.();
  const pixels = context.getImageData(0, 0, 56, 56).data;
  let red = 0, green = 0, blue = 0, samples = 0;
  let bestColor = [52, 120, 246];
  let bestScore = -1;

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 180) continue;
    const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
    red += r; green += g; blue += b; samples += 1;
    const [h, s, l] = rgbToHsl(r, g, b);
    const score = s * (1 - Math.abs(l - .52)) * (l > .15 && l < .9 ? 1 : .2);
    if (score > bestScore) {
      bestScore = score;
      bestColor = hslToRgb(h, Math.max(.5, s), Math.min(.64, Math.max(.43, l)));
    }
  }

  const average = samples ? [red / samples, green / samples, blue / samples] : [160, 180, 200];
  const averageLight = relativeLuminance(average);
  const dark = averageLight < .36;
  const accentContrast = relativeLuminance(bestColor) > .55 ? [18, 22, 28] : [255, 255, 255];
  return {
    dark,
    accent: bestColor.map(Math.round),
    accentContrast,
    surface: dark ? [29, 32, 39] : [255, 255, 255],
    surfaceStrong: dark ? [45, 49, 58] : [242, 245, 250],
    text: dark ? [248, 249, 252] : [20, 24, 32],
    muted: dark ? [190, 196, 207] : [78, 87, 101]
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const delta = max - min;
    s = l > .5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hueToRgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < .5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToRgb(p, q, h + 1 / 3) * 255, hueToRgb(p, q, h) * 255, hueToRgb(p, q, h - 1 / 3) * 255];
}

function relativeLuminance([r, g, b]) {
  const values = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}

function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.some((value) => !Number.isFinite(value))) return "#3478f6";
  return `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function populateClassSelect() {
  const fragment = document.createDocumentFragment();
  CLASS_LIST.forEach((className) => {
    const option = document.createElement("option");
    option.value = className;
    option.textContent = className;
    fragment.appendChild(option);
  });
  elements.classSelect.appendChild(fragment);
}

function openShortcutDialog(id = "") {
  const shortcut = state.shortcuts.find((item) => item.id === id);
  elements.shortcutForm.dataset.editId = shortcut?.id || "";
  elements.shortcutDialogTitle.textContent = shortcut ? "ショートカットを編集" : "ショートカットを追加";
  elements.shortcutName.value = shortcut?.name || "";
  elements.shortcutUrl.value = shortcut?.url || "";
  elements.shortcutColor.value = safeColor(shortcut?.color || "#3478f6");
  elements.deleteShortcut.hidden = !shortcut;
  elements.shortcutDialog.showModal();
  requestAnimationFrame(() => elements.shortcutName.focus());
}

function closeShortcutDialog() {
  elements.shortcutDialog.close();
  elements.shortcutForm.reset();
  elements.shortcutForm.dataset.editId = "";
}

function saveShortcutFromDialog(event) {
  event.preventDefault();
  const name = elements.shortcutName.value.trim();
  const url = normalizeUrl(elements.shortcutUrl.value);
  const color = safeColor(elements.shortcutColor.value);
  if (!name || !url) {
    showToast("名前と正しいURLを入力してください");
    return;
  }

  const editId = elements.shortcutForm.dataset.editId;
  if (editId) {
    const shortcut = state.shortcuts.find((item) => item.id === editId);
    if (shortcut) Object.assign(shortcut, { name, url, color });
  } else {
    const id = `sc-${Date.now().toString(36)}`;
    const key = shortcutKey(id);
    state.shortcuts.push({ id, name, url, color });
    state.order.push(key);
    state.layout[key] = findOpenRect(Math.min(2, state.grid.columns), 2);
  }
  saveState();
  closeShortcutDialog();
  renderHome();
  showToast(editId ? "ショートカットを更新しました" : "ショートカットを追加しました");
}

function deleteShortcut(id) {
  const shortcut = state.shortcuts.find((item) => item.id === id);
  if (!shortcut || !window.confirm(`「${shortcut.name}」を削除しますか？`)) return;
  const key = shortcutKey(id);
  state.shortcuts = state.shortcuts.filter((item) => item.id !== id);
  state.order = state.order.filter((itemKey) => itemKey !== key);
  delete state.layout[key];
  saveState();
  if (elements.shortcutDialog.open) closeShortcutDialog();
  renderHome();
  showToast("ショートカットを削除しました");
}

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function faviconUrl(url) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`;
}

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#3478f6";
}

function firstCharacter(value) {
  return [...(value.trim() || "?")][0].toLocaleUpperCase("ja-JP");
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const selected = searchSuggestions[activeSuggestionIndex];
  performGoogleSearch(selected || elements.searchInput.value);
}

function performGoogleSearch(query) {
  const value = String(query || "").trim();
  if (value) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

function handleSearchInput() {
  activeSuggestionIndex = -1;
  window.clearTimeout(suggestionTimer);
  suggestionRequest?.abort();
  const query = elements.searchInput.value.trim();
  if (!query) {
    searchSuggestions = [];
    hideSuggestions();
    return;
  }
  suggestionTimer = window.setTimeout(() => fetchSuggestions(query), 170);
}

async function fetchSuggestions(query) {
  suggestionRequest = new AbortController();
  try {
    const response = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`, { signal: suggestionRequest.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (elements.searchInput.value.trim() !== query) return;
    searchSuggestions = Array.isArray(data?.[1]) ? data[1].slice(0, 7) : [];
    renderSuggestions();
  } catch (error) {
    if (error.name !== "AbortError") hideSuggestions();
  }
}

function renderSuggestions() {
  elements.suggestions.replaceChildren();
  searchSuggestions.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-item";
    button.setAttribute("role", "option");
    button.textContent = suggestion;
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("mouseenter", () => setActiveSuggestion(index, false));
    button.addEventListener("click", () => performGoogleSearch(suggestion));
    elements.suggestions.appendChild(button);
  });
  if (searchSuggestions.length) showSuggestions(); else hideSuggestions();
}

function showSuggestions() {
  elements.suggestions.hidden = false;
  elements.searchInput.setAttribute("aria-expanded", "true");
}

function hideSuggestions() {
  elements.suggestions.hidden = true;
  elements.searchInput.setAttribute("aria-expanded", "false");
  activeSuggestionIndex = -1;
}

function handleSearchKeys(event) {
  if (event.key === "Escape") return hideSuggestions();
  if (!searchSuggestions.length || elements.suggestions.hidden) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    setActiveSuggestion((activeSuggestionIndex + direction + searchSuggestions.length) % searchSuggestions.length, true);
  }
}

function setActiveSuggestion(index, copyToInput) {
  activeSuggestionIndex = index;
  [...elements.suggestions.children].forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex === index);
    item.setAttribute("aria-selected", String(itemIndex === index));
  });
  if (copyToInput) elements.searchInput.value = searchSuggestions[index];
}

function updateClockMode() {
  elements.digitalClock.hidden = state.clock.type !== "digital";
  elements.analogClock.hidden = state.clock.type !== "analog";
  updateClock();
}

function startClock() {
  stopClock();
  clockTimer = window.setInterval(updateClock, 1000);
}

function stopClock() {
  if (clockTimer) window.clearInterval(clockTimer);
  clockTimer = 0;
}

function updateClock() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "long" }).format(now);
  elements.clockTime.textContent = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: !state.clock.is24Hour }).format(now);
  elements.clockDate.textContent = date;
  elements.analogDate.textContent = date;
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;
  elements.secondHand.style.transform = `rotate(${seconds * 6}deg)`;
  elements.minuteHand.style.transform = `rotate(${minutes * 6}deg)`;
  elements.hourHand.style.transform = `rotate(${hours * 30}deg)`;
  updateClockModeVisibilityOnly();

  if (!timetableDayWasSelected) {
    const automatic = getAutomaticDayOffset();
    if (automatic !== selectedDayOffset) {
      selectedDayOffset = automatic;
      renderTimetable();
    }
  }
}

function updateClockModeVisibilityOnly() {
  elements.digitalClock.hidden = state.clock.type !== "digital";
  elements.analogClock.hidden = state.clock.type !== "analog";
}

function getAutomaticDayOffset() {
  const now = new Date();
  const [hour, minute] = (state?.timetable?.switchTime || "16:00").split(":").map(Number);
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute) ? 1 : 0;
}

async function fetchTimetable(force = false) {
  if (!state.timetable.enabled && !force) return;
  elements.timetableMeta.textContent = "最新データを取得中...";
  elements.timetableContent.innerHTML = '<div class="timetable-loading"><span></span><span></span><span></span></div>';
  elements.refreshTimetable.disabled = true;
  try {
    const response = await fetch(FIREBASE_URL, { cache: force ? "reload" : "default" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data?.schedules) throw new Error("時間割データの形式が正しくありません");
    timetableData = data;
    localStorage.setItem(TIMETABLE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    renderTimetable();
    if (force) showToast("時間割を更新しました");
  } catch (error) {
    const cached = readTimetableCache();
    if (cached) {
      timetableData = cached.data;
      renderTimetable(`保存データ・${formatCacheTime(cached.savedAt)}取得`);
    } else {
      elements.timetableMeta.textContent = "取得できませんでした";
      elements.timetableContent.innerHTML = '<div class="timetable-message">時間割を取得できませんでした。更新ボタンから再試行できます。</div>';
    }
    console.warn("時間割取得エラー", error);
  } finally {
    elements.refreshTimetable.disabled = false;
  }
}

function readTimetableCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(TIMETABLE_CACHE_KEY));
    return cached?.data?.schedules ? cached : null;
  } catch { return null; }
}

function renderTimetable(customMeta = "") {
  document.querySelectorAll("[data-day-offset]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.dayOffset) === selectedDayOffset);
  });
  if (!timetableData?.schedules || !state.timetable.enabled) return;

  const date = new Date();
  date.setDate(date.getDate() + selectedDayOffset);
  const dayNames = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];
  const dayName = dayNames[date.getDay()];
  const classKey = state.timetable.className.replace("/", "_");
  const schedule = timetableData.schedules?.[dayName]?.[classKey] || [];
  const dateText = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(date);
  elements.timetableMeta.textContent = customMeta || `${dateText}・${state.timetable.className}`;

  if (!Array.isArray(schedule) || !schedule.some(Boolean)) {
    elements.timetableContent.innerHTML = `<div class="timetable-message">${escapeHtml(dayName)}の時間割データはありません</div>`;
    return;
  }

  const list = document.createElement("div");
  list.className = "period-list";
  for (let index = 0; index < 7; index += 1) {
    const period = document.createElement("div");
    period.className = "period";
    const number = document.createElement("span");
    number.className = "period-number";
    number.textContent = `${index + 1}限`;
    const subject = document.createElement("span");
    subject.className = "period-subject";
    subject.textContent = schedule[index] || "—";
    period.append(number, subject);
    list.appendChild(period);
  }
  elements.timetableContent.replaceChildren(list);
}

function formatCacheTime(timestamp) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

async function resetHome() {
  if (!window.confirm("壁紙、ショートカット、配置、設定をすべて初期状態に戻しますか？")) return;
  try { await wallpaperDatabaseAction("delete"); } catch (error) { console.warn(error); }
  if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
  wallpaperObjectUrl = "";
  elements.wallpaperLayer.style.backgroundImage = "";
  state = createDefaultState();
  selectedDayOffset = getAutomaticDayOffset();
  timetableDayWasSelected = false;
  ensureLayoutEntries();
  settleLayout();
  saveState();
  applyGridSettings();
  applyAppearance();
  renderHome();
  syncSettingsControls();
  showToast("ホーム画面を初期状態に戻しました");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2300);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
