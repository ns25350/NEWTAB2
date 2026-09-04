"use strict";

const FIREBASE_URL = "https://johou7-275be-default-rtdb.firebaseio.com/timetable.json";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const STATE_KEY = "homeGridStateV3";
const V2_STATE_KEY = "homeGridStateV2";
const LEGACY_STATE_KEY = "pixelHomeStateV1";
const TIMETABLE_CACHE_KEY = "homeGridTimetableCacheV3";
const WEATHER_CACHE_KEY = "homeGridWeatherCacheV3";
const WALLPAPER_DB = "home-grid-assets";
const WALLPAPER_STORE = "wallpaper";
const CORE_WIDGETS = ["search", "clock", "timetable", "weather", "gallery"];
const MAX_PAGES = 6;

const CLASS_LIST = [
  "101", "102", "103", "104", "105", "106", "107", "108", "109", "110",
  "201", "202", "203", "204", "205/6文", "205理", "206理", "207", "208", "209", "210",
  "301", "302", "303", "304", "305", "306", "307", "308", "309", "310"
];

const DEFAULT_SHORTCUTS = [
  { id: "google", name: "Google", url: "https://www.google.com/", color: "#4285f4", folderId: "" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/", color: "#e23b32", folderId: "" },
  { id: "classroom", name: "Classroom", url: "https://classroom.google.com/", color: "#28a15b", folderId: "" },
  { id: "drive", name: "Drive", url: "https://drive.google.com/", color: "#f2aa18", folderId: "" }
];

const GRID_PRESETS = {
  large: { columns: 8, rowHeight: 96, gap: 16 },
  standard: { columns: 12, rowHeight: 78, gap: 14 },
  compact: { columns: 16, rowHeight: 62, gap: 10 }
};

const LESSON_PRESETS = {
  "50": [
    ["08:40", "09:30"], ["09:40", "10:30"], ["10:40", "11:30"], ["11:40", "12:30"],
    ["13:15", "14:05"], ["14:15", "15:05"], ["15:15", "16:05"]
  ],
  "45": [
    ["08:40", "09:25"], ["09:35", "10:20"], ["10:30", "11:15"], ["11:25", "12:10"],
    ["12:55", "13:40"], ["13:50", "14:35"], ["14:45", "15:30"]
  ]
};

const WEATHER_CODES = {
  0: ["快晴", "☀️"], 1: ["晴れ", "🌤️"], 2: ["一部くもり", "⛅"], 3: ["くもり", "☁️"],
  45: ["霧", "🌫️"], 48: ["霧氷", "🌫️"], 51: ["弱い霧雨", "🌦️"], 53: ["霧雨", "🌦️"], 55: ["強い霧雨", "🌧️"],
  61: ["弱い雨", "🌦️"], 63: ["雨", "🌧️"], 65: ["強い雨", "🌧️"], 66: ["凍る雨", "🌧️"], 67: ["強い凍雨", "🌧️"],
  71: ["弱い雪", "🌨️"], 73: ["雪", "🌨️"], 75: ["強い雪", "❄️"], 77: ["雪粒", "🌨️"],
  80: ["にわか雨", "🌦️"], 81: ["にわか雨", "🌧️"], 82: ["激しい雨", "⛈️"], 85: ["にわか雪", "🌨️"], 86: ["激しい雪", "❄️"],
  95: ["雷雨", "⛈️"], 96: ["雷雨・ひょう", "⛈️"], 99: ["激しい雷雨", "⛈️"]
};

const elements = Object.fromEntries([
  "wallpaperLayer", "editButton", "editButtonLabel", "settingsButton", "editGuide", "editToolbar", "undoButton",
  "homeStage", "homeGrid", "gridGhost", "searchForm", "searchInput", "suggestions", "digitalClock", "analogClock",
  "clockTime", "clockDate", "analogDate", "hourHand", "minuteHand", "secondHand", "timetableMeta", "timetableContent",
  "lessonNow", "refreshTimetable", "weatherLocation", "weatherContent", "refreshWeather",
  "gallerySearchForm", "galleryProvider", "galleryQuery", "openPixivRanking", "openXIllustrations", "galleryRecent",
  "pageNavigation", "previousPage", "nextPage", "pageDots", "leftPageDrop", "rightPageDrop", "settingsDialog", "settingsForm", "closeSettings", "gridPresets",
  "gridColumns", "gridColumnsValue", "gridRowHeight", "gridRowHeightValue", "gridGap", "gridGapValue", "layoutTemplates",
  "newPageName", "addPageButton", "pageManager", "wallpaperInput", "removeWallpaper", "autoTheme", "manualThemes",
  "widgetOpacity", "widgetOpacityValue", "wallpaperShade", "wallpaperShadeValue", "motionStrength", "motionStrengthValue", "searchEnabled", "clockEnabled",
  "timetableEnabled", "weatherEnabled", "galleryEnabled", "clockType", "clock24Hour", "classSelect", "switchTime",
  "lessonPreset", "periodEditor", "copyPresetToCustom", "weatherLocationInput", "searchWeatherLocation", "useCurrentLocation",
  "weatherSettingStatus", "searchEngine", "saveSearchHistory", "clearSearchHistory", "styleTarget", "customStyleEnabled", "customStyleControls", "customOpacity",
  "customOpacityValue", "customBlur", "customBlurValue", "customRadius", "customRadiusValue", "customShadow",
  "customShadowValue", "customTextColor", "customAccentColor", "resetCustomStyle", "layoutName", "saveNamedLayout",
  "savedLayoutManager", "exportSettings", "importSettings", "resetButton", "shortcutDialog", "shortcutForm",
  "shortcutDialogTitle", "shortcutName", "shortcutUrl", "shortcutColor", "shortcutFolder", "deleteShortcut",
  "closeShortcutDialog", "cancelShortcut", "folderDialog", "folderForm", "closeFolderDialog", "folderName",
  "folderDialogItems", "folderHint", "deleteFolder", "saveFolder", "toast"
].map((id) => [id, document.getElementById(id)]));
elements.body = document.body;

let state = loadState();
let isEditing = false;
let preEditSnapshot = null;
let undoStack = [];
let dragSession = null;
let swipeSession = null;
let wheelLockUntil = 0;
let suppressShortcutClickUntil = 0;
let wallpaperObjectUrl = "";
let timetableData = null;
let weatherData = null;
let selectedDayOffset = getAutomaticDayOffset();
let timetableDayWasSelected = false;
let clockTimer = 0;
let toastTimer = 0;
let folderCloseTimer = 0;
let suggestionsState = [];
let activeSuggestionIndex = -1;
let suggestionTimer = 0;
let suggestionRequest = null;
let openFolderId = "";
let folderDragId = "";
let pageAnimation = null;

initialize();

async function initialize() {
  populateClassSelect();
  sanitizeState();
  bindEvents();
  applyGridSettings();
  applyAppearance();
  renderHome();
  syncSettingsControls();
  updateClock();
  startClock();
  renderPeriodEditor();
  await Promise.allSettled([loadWallpaper(), fetchTimetable(), fetchWeather()]);
}

function createDefaultState() {
  const pageId = "page-home";
  return {
    version: 3,
    grid: { ...GRID_PRESETS.standard },
    appearance: { autoTheme: true, manualTheme: "silver", widgetOpacity: 72, wallpaperShade: 18, motionStrength: 70, autoPalette: null, hasWallpaper: false },
    widgetStyles: Object.fromEntries(CORE_WIDGETS.map((key) => [key, { enabled: false, opacity: 82, blur: 28, radius: 27, shadow: 55, text: "#141820", accent: "#3478f6" }])),
    search: { enabled: true, engine: "google", saveHistory: false, history: [] },
    clock: { enabled: true, type: "digital", is24Hour: true },
    timetable: { enabled: true, className: "101", switchTime: "16:00", lessonPreset: "50", customTimes: clone(LESSON_PRESETS["50"]) },
    weather: { enabled: true, locationName: "金沢市", latitude: 36.5613, longitude: 136.6562 },
    gallery: { enabled: false, provider: "pixiv", recent: [] },
    shortcuts: DEFAULT_SHORTCUTS.map((item) => ({ ...item })),
    folders: [],
    pages: [{
      id: pageId,
      name: "ホーム",
      order: ["clock", "search", "timetable", "weather", ...DEFAULT_SHORTCUTS.map((item) => shortcutKey(item.id))],
      layout: {
        clock: { x: 0, y: 0, w: 4, h: 3 }, search: { x: 4, y: 0, w: 8, h: 1 }, timetable: { x: 4, y: 1, w: 8, h: 3 },
        weather: { x: 0, y: 3, w: 4, h: 3 },
        [shortcutKey("google")]: { x: 4, y: 4, w: 2, h: 2 }, [shortcutKey("youtube")]: { x: 6, y: 4, w: 2, h: 2 },
        [shortcutKey("classroom")]: { x: 8, y: 4, w: 2, h: 2 }, [shortcutKey("drive")]: { x: 10, y: 4, w: 2, h: 2 }
      }
    }],
    activePageId: pageId,
    savedLayouts: []
  };
}

function loadState() {
  const defaults = createDefaultState();
  try {
    const stored = JSON.parse(localStorage.getItem(STATE_KEY));
    if (stored?.version === 3) return mergeV3(stored, defaults);
    const v2 = JSON.parse(localStorage.getItem(V2_STATE_KEY));
    if (v2?.version === 2) return migrateV2(v2, defaults);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STATE_KEY));
    if (legacy && typeof legacy === "object") {
      defaults.appearance.manualTheme = ({ blue: "silver", green: "ocean", violet: "rose", coral: "rose", dark: "graphite" })[legacy.theme] || "silver";
      defaults.appearance.autoTheme = false;
      defaults.clock = { ...defaults.clock, ...(legacy.clock || {}) };
      defaults.timetable = { ...defaults.timetable, ...(legacy.timetable || {}) };
      if (Array.isArray(legacy.shortcuts)) defaults.shortcuts = legacy.shortcuts.filter(isStoredShortcut).map((item) => ({ ...item, folderId: "" }));
    }
  } catch (error) { console.warn("設定の読み込みに失敗しました。", error); }
  return defaults;
}

function mergeV3(stored, defaults) {
  const merged = {
    ...defaults, ...stored,
    grid: { ...defaults.grid, ...(stored.grid || {}) },
    appearance: { ...defaults.appearance, ...(stored.appearance || {}) },
    search: { ...defaults.search, ...(stored.search || {}) },
    clock: { ...defaults.clock, ...(stored.clock || {}) },
    timetable: { ...defaults.timetable, ...(stored.timetable || {}) },
    weather: { ...defaults.weather, ...(stored.weather || {}) },
    gallery: { ...defaults.gallery, ...(stored.gallery || {}) },
    widgetStyles: Object.fromEntries(CORE_WIDGETS.map((key) => [key, { ...defaults.widgetStyles[key], ...(stored.widgetStyles?.[key] || {}) }]))
  };
  merged.shortcuts = Array.isArray(stored.shortcuts) ? stored.shortcuts.filter(isStoredShortcut).map((item) => ({ ...item, folderId: item.folderId || "" })) : defaults.shortcuts;
  merged.folders = Array.isArray(stored.folders) ? stored.folders : [];
  merged.pages = Array.isArray(stored.pages) && stored.pages.length ? stored.pages : defaults.pages;
  merged.savedLayouts = Array.isArray(stored.savedLayouts) ? stored.savedLayouts.slice(0, 12) : [];
  return merged;
}

function migrateV2(v2, defaults) {
  defaults.grid = { ...defaults.grid, ...(v2.grid || {}) };
  defaults.appearance = { ...defaults.appearance, ...(v2.appearance || {}) };
  defaults.search = { ...defaults.search, ...(v2.search || {}) };
  defaults.clock = { ...defaults.clock, ...(v2.clock || {}) };
  defaults.timetable = { ...defaults.timetable, ...(v2.timetable || {}) };
  defaults.shortcuts = Array.isArray(v2.shortcuts) ? v2.shortcuts.filter(isStoredShortcut).map((item) => ({ ...item, folderId: "" })) : defaults.shortcuts;
  const page = defaults.pages[0];
  const oldOrder = Array.isArray(v2.order) ? v2.order : [];
  page.order = [...oldOrder.filter((key) => !["weather", "agenda"].includes(key)), "weather"];
  page.layout = { ...(v2.layout || {}), weather: { x: 0, y: 7, w: 4, h: 3 } };
  delete page.layout.agenda;
  defaults.shortcuts.forEach((item) => { const key = shortcutKey(item.id); if (!page.order.includes(key)) page.order.push(key); });
  return defaults;
}

function sanitizeState() {
  state.grid.columns = clampNumber(state.grid.columns, 6, 16, 12);
  state.grid.rowHeight = clampNumber(state.grid.rowHeight, 56, 112, 78);
  state.grid.gap = clampNumber(state.grid.gap, 8, 24, 14);
  state.search.history = Array.isArray(state.search.history) ? state.search.history.filter((item) => typeof item === "string").slice(0, 8) : [];
  state.gallery.provider = ["pixiv", "x", "google"].includes(state.gallery.provider) ? state.gallery.provider : "pixiv";
  state.gallery.recent = Array.isArray(state.gallery.recent) ? state.gallery.recent.filter((item) => typeof item === "string" && item.trim()).slice(0, 8) : [];
  state.appearance.motionStrength = clampNumber(state.appearance.motionStrength, 0, 100, 70);
  delete state.agenda;
  state.timetable.lessonPreset = ["45", "50", "custom"].includes(state.timetable.lessonPreset) ? state.timetable.lessonPreset : "50";
  state.timetable.customTimes = Array.isArray(state.timetable.customTimes) && state.timetable.customTimes.length === 7 ? state.timetable.customTimes : clone(LESSON_PRESETS["50"]);
  state.folders = Array.isArray(state.folders) ? state.folders.filter((folder) => folder && typeof folder.id === "string").map((folder) => ({ id: folder.id, name: typeof folder.name === "string" && folder.name.trim() ? folder.name.slice(0, 24) : "フォルダ", shortcutIds: Array.isArray(folder.shortcutIds) ? [...new Set(folder.shortcutIds)] : [] })) : [];
  const folderIds = new Set(state.folders.map((folder) => folder.id));
  state.shortcuts.forEach((shortcut) => { if (!folderIds.has(shortcut.folderId)) shortcut.folderId = ""; });
  state.pages = state.pages.slice(0, MAX_PAGES).map((page, index) => ({
    id: typeof page.id === "string" ? page.id : `page-${index + 1}`,
    name: typeof page.name === "string" && page.name.trim() ? page.name.slice(0, 18) : `ページ${index + 1}`,
    order: Array.isArray(page.order) ? [...new Set(page.order.filter(isValidItemKey))] : [],
    layout: page.layout && typeof page.layout === "object" ? clone(page.layout) : {}
  }));
  if (!state.pages.length) state.pages = createDefaultState().pages;
  const assigned = new Set();
  state.pages.forEach((page) => { page.order = page.order.filter((key) => { if (assigned.has(key)) return false; assigned.add(key); return true; }); });
  if (!state.pages.some((page) => page.id === state.activePageId)) state.activePageId = state.pages[0].id;
  CORE_WIDGETS.forEach((key) => {
    if (state[key]?.enabled && !findItemPage(key)) activePage().order.push(key);
  });
  state.shortcuts.forEach((shortcut) => {
    if (!shortcut.folderId && !findItemPage(shortcutKey(shortcut.id))) activePage().order.push(shortcutKey(shortcut.id));
  });
  state.folders.forEach((folder) => {
    folder.shortcutIds = Array.isArray(folder.shortcutIds) ? folder.shortcutIds.filter((id) => state.shortcuts.some((item) => item.id === id)) : [];
    if (folder.shortcutIds.length && !findItemPage(folderKey(folder.id))) activePage().order.push(folderKey(folder.id));
  });
  state.pages.forEach((page) => settleLayout(page));
  saveState();
}

function isValidItemKey(key) {
  if (CORE_WIDGETS.includes(key)) return true;
  if (typeof key !== "string") return false;
  if (key.startsWith("shortcut:")) return state.shortcuts.some((item) => shortcutKey(item.id) === key && !item.folderId);
  if (key.startsWith("folder:")) return state.folders.some((item) => folderKey(item.id) === key);
  return false;
}

function saveState() { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
function clone(value) { return structuredClone(value); }
function shortcutKey(id) { return `shortcut:${id}`; }
function folderKey(id) { return `folder:${id}`; }
function idFromKey(key) { return String(key).slice(String(key).indexOf(":") + 1); }
function isStoredShortcut(item) { return item && typeof item.id === "string" && typeof item.name === "string" && typeof item.url === "string"; }
function clampNumber(value, min, max, fallback) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback; }
function activePage() { return state.pages.find((page) => page.id === state.activePageId) || state.pages[0]; }
function findItemPage(key) { return state.pages.find((page) => page.order.includes(key)); }

function itemKind(key) {
  if (key.startsWith("shortcut:")) return "shortcut";
  if (key.startsWith("folder:")) return "folder";
  return key;
}

function visibleKeys(page = activePage()) {
  return page.order.filter((key) => {
    if (CORE_WIDGETS.includes(key)) return Boolean(state[key]?.enabled);
    if (key.startsWith("shortcut:")) return state.shortcuts.some((item) => shortcutKey(item.id) === key && !item.folderId);
    if (key.startsWith("folder:")) return state.folders.some((item) => folderKey(item.id) === key && item.shortcutIds.length);
    return false;
  });
}

function limitsFor(key) {
  const columns = state.grid.columns;
  const kind = itemKind(key);
  if (kind === "search") return { minW: Math.min(4, columns), maxW: columns, minH: 1, maxH: 2 };
  if (["clock", "weather"].includes(kind)) return { minW: Math.min(2, columns), maxW: columns, minH: 2, maxH: 7 };
  if (kind === "gallery") return { minW: Math.min(4, columns), maxW: columns, minH: 2, maxH: 6 };
  if (kind === "timetable") return { minW: Math.min(3, columns), maxW: columns, minH: 2, maxH: 8 };
  return { minW: 1, maxW: Math.min(4, columns), minH: 1, maxH: 4 };
}

function defaultRectFor(key, page = activePage()) {
  const kind = itemKind(key);
  const width = kind === "search" ? Math.min(8, state.grid.columns) : kind === "timetable" ? Math.min(8, state.grid.columns) : kind === "gallery" ? Math.min(6, state.grid.columns) : kind === "shortcut" || kind === "folder" ? Math.min(2, state.grid.columns) : Math.min(4, state.grid.columns);
  const height = kind === "search" ? 1 : kind === "shortcut" || kind === "folder" ? 2 : 3;
  return findOpenRect(width, height, page);
}

function clampRect(key, input) {
  const limits = limitsFor(key);
  const w = Math.round(Math.min(state.grid.columns, clampNumber(input?.w, limits.minW, limits.maxW, limits.minW)));
  const h = Math.round(clampNumber(input?.h, limits.minH, limits.maxH, limits.minH));
  return { x: Math.round(clampNumber(input?.x, 0, Math.max(0, state.grid.columns - w), 0)), y: Math.max(0, Math.round(Number(input?.y) || 0)), w, h };
}

function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function findRectAgainst(width, height, placed, startY = 0) {
  const w = Math.min(width, state.grid.columns);
  for (let y = Math.max(0, startY); y < 160; y += 1) {
    for (let x = 0; x <= state.grid.columns - w; x += 1) {
      const candidate = { x, y, w, h: height };
      if (!placed.some((rect) => overlaps(candidate, rect))) return candidate;
    }
  }
  return { x: 0, y: 160, w, h: height };
}

function findOpenRect(width, height, page = activePage(), ignoreKey = "", startY = 0) {
  const placed = visibleKeys(page).filter((key) => key !== ignoreKey && page.layout[key]).map((key) => page.layout[key]);
  return findRectAgainst(width, height, placed, startY);
}

function settleLayout(page = activePage(), activeKey = "") {
  const keys = visibleKeys(page);
  keys.forEach((key) => { page.layout[key] = clampRect(key, page.layout[key] || defaultRectFor(key, page)); });
  keys.sort((a, b) => {
    if (a === activeKey) return -1;
    if (b === activeKey) return 1;
    return page.layout[a].y - page.layout[b].y || page.layout[a].x - page.layout[b].x || page.order.indexOf(a) - page.order.indexOf(b);
  });
  const placed = [];
  keys.forEach((key) => {
    let rect = clampRect(key, page.layout[key]);
    if (placed.some((other) => overlaps(rect, other))) rect = findRectAgainst(rect.w, rect.h, placed, rect.y);
    page.layout[key] = rect;
    placed.push(rect);
  });
}

function changeColumnCount(nextColumns) {
  const oldColumns = state.grid.columns;
  const columns = clampNumber(nextColumns, 6, 16, oldColumns);
  if (columns === oldColumns) return;
  pushUndo();
  const ratio = columns / oldColumns;
  state.grid.columns = columns;
  state.pages.forEach((page) => {
    Object.entries(page.layout).forEach(([key, rect]) => { page.layout[key] = clampRect(key, { ...rect, x: Math.round(rect.x * ratio), w: Math.max(1, Math.round(rect.w * ratio)) }); });
    settleLayout(page);
  });
}

function applyGridSettings() {
  const root = document.documentElement.style;
  root.setProperty("--grid-cols", String(state.grid.columns));
  root.setProperty("--grid-row", `${state.grid.rowHeight}px`);
  root.setProperty("--grid-gap", `${state.grid.gap}px`);
}

function renderHome() {
  elements.homeGrid.querySelectorAll(".shortcut-item, .folder-item").forEach((item) => item.remove());
  const page = activePage();
  CORE_WIDGETS.forEach((key) => {
    const item = elements.homeGrid.querySelector(`[data-key="${key}"]`);
    if (item) item.hidden = !(state[key]?.enabled && page.order.includes(key));
  });
  page.order.forEach((key) => {
    if (key.startsWith("shortcut:")) {
      const shortcut = state.shortcuts.find((item) => shortcutKey(item.id) === key && !item.folderId);
      if (shortcut) elements.homeGrid.appendChild(createShortcutElement(shortcut));
    } else if (key.startsWith("folder:")) {
      const folder = state.folders.find((item) => folderKey(item.id) === key);
      if (folder?.shortcutIds.length) elements.homeGrid.appendChild(createFolderElement(folder));
    }
  });
  if (isEditing) elements.homeGrid.appendChild(createAddShortcutElement());
  visibleKeys(page).forEach((key) => {
    const item = elements.homeGrid.querySelector(`[data-key="${cssEscape(key)}"]`);
    if (item) positionElement(item, key, page.layout[key]);
  });
  const addItem = elements.homeGrid.querySelector('[data-key="add-shortcut"]');
  if (addItem) positionElement(addItem, "add-shortcut", findOpenRect(Math.min(2, state.grid.columns), 2, page));
  elements.body.classList.toggle("editing", isEditing);
  elements.editButton.setAttribute("aria-pressed", String(isEditing));
  elements.editButtonLabel.textContent = isEditing ? "完了" : "編集";
  elements.editGuide.hidden = !isEditing;
  elements.editToolbar.hidden = !isEditing;
  elements.undoButton.disabled = !undoStack.length;
  applyWidgetStyles();
  renderGallery();
  renderPageNavigation();
}

function createShortcutElement(shortcut) {
  const item = document.createElement("article");
  item.className = "grid-item shortcut-item";
  item.dataset.key = shortcutKey(shortcut.id);
  item.innerHTML = `<div class="shortcut-actions"><button class="shortcut-delete" type="button" aria-label="${escapeHtml(shortcut.name)}を削除">×</button><button class="shortcut-edit" type="button" aria-label="${escapeHtml(shortcut.name)}を編集"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5V20h4.5L19.8 8.7l-4.5-4.5L4 15.5Z"/></svg></button></div><button class="shortcut-link" type="button" aria-label="${escapeHtml(shortcut.name)}を開く"><span class="shortcut-icon" style="--shortcut-color:${safeColor(shortcut.color)}"><span class="shortcut-initial">${escapeHtml(firstCharacter(shortcut.name))}</span><img src="${faviconUrl(shortcut.url)}" alt=""></span><span class="shortcut-name">${escapeHtml(shortcut.name)}</span></button><button class="resize-handle" type="button" aria-label="${escapeHtml(shortcut.name)}の大きさを変更"><span></span></button>`;
  const image = item.querySelector("img");
  image.addEventListener("error", () => image.remove(), { once: true });
  item.querySelector(".shortcut-link").addEventListener("click", () => { if (!isEditing && Date.now() > suppressShortcutClickUntil) window.location.href = shortcut.url; });
  item.querySelector(".shortcut-edit").addEventListener("click", () => openShortcutDialog(shortcut.id));
  item.querySelector(".shortcut-delete").addEventListener("click", () => deleteShortcut(shortcut.id));
  return item;
}

function createFolderElement(folder) {
  const item = document.createElement("article");
  item.className = "grid-item shortcut-item folder-item";
  item.dataset.key = folderKey(folder.id);
  const icons = folder.shortcutIds.slice(0, 4).map((id) => state.shortcuts.find((shortcut) => shortcut.id === id)).filter(Boolean);
  item.innerHTML = `<div class="shortcut-actions"><button class="shortcut-delete" type="button" aria-label="フォルダを解除">×</button><button class="shortcut-edit" type="button" aria-label="フォルダを編集">•••</button></div><button class="shortcut-link" type="button" aria-label="${escapeHtml(folder.name)}を開く"><span class="shortcut-icon">${icons.map((shortcut) => `<span class="folder-mini-icon" style="--mini-color:${safeColor(shortcut.color)}"><span>${escapeHtml(firstCharacter(shortcut.name))}</span><img src="${faviconUrl(shortcut.url)}" alt=""></span>`).join("")}</span><span class="shortcut-name">${escapeHtml(folder.name)}</span></button><button class="resize-handle" type="button" aria-label="フォルダの大きさを変更"><span></span></button>`;
  item.querySelectorAll(".folder-mini-icon img").forEach((image) => image.addEventListener("error", () => image.remove(), { once: true }));
  item.querySelector(".shortcut-link").addEventListener("click", () => { if (!isEditing && Date.now() > suppressShortcutClickUntil) openFolderDialog(folder.id); });
  item.querySelector(".shortcut-edit").addEventListener("click", () => openFolderDialog(folder.id));
  item.querySelector(".shortcut-delete").addEventListener("click", () => dissolveFolder(folder.id));
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

function positionElement(item, key, rect) {
  if (!rect) return;
  item.style.gridColumn = `${rect.x + 1} / span ${rect.w}`;
  item.style.gridRow = `${rect.y + 1} / span ${rect.h}`;
  item.dataset.gridWidth = String(rect.w);
  item.dataset.gridHeight = String(rect.h);
  const badge = item.querySelector(".size-badge");
  if (badge) badge.textContent = `${rect.w} × ${rect.h}`;
}

function cssEscape(value) { return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replaceAll(":", "\\:"); }

function bindEvents() {
  elements.settingsForm.addEventListener("submit", (event) => event.preventDefault());
  elements.editButton.addEventListener("click", toggleEditMode);
  elements.settingsButton.addEventListener("click", () => { syncSettingsControls(); elements.settingsDialog.showModal(); });
  elements.closeSettings.addEventListener("click", () => elements.settingsDialog.close());
  bindBackdropClose(elements.settingsDialog);
  bindBackdropClose(elements.shortcutDialog);
  bindBackdropClose(elements.folderDialog);

  elements.homeGrid.addEventListener("pointerdown", beginGridDrag);
  document.addEventListener("pointermove", updateGridDrag);
  document.addEventListener("pointerup", finishGridDrag);
  document.addEventListener("pointercancel", finishGridDrag);
  document.querySelectorAll("[data-hide-widget]").forEach((button) => button.addEventListener("click", () => hideWidget(button.dataset.hideWidget)));
  elements.undoButton.addEventListener("click", undoLastChange);

  elements.previousPage.addEventListener("click", () => switchPageBy(-1));
  elements.nextPage.addEventListener("click", () => switchPageBy(1));
  elements.homeStage.addEventListener("pointerdown", beginPageSwipe);
  elements.homeStage.addEventListener("pointermove", updatePageSwipe);
  elements.homeStage.addEventListener("pointerup", finishPageSwipe);
  elements.homeStage.addEventListener("pointercancel", cancelPageSwipe);
  elements.homeStage.addEventListener("wheel", handlePageWheel, { passive: false });

  elements.gridPresets.addEventListener("click", (event) => { const button = event.target.closest("[data-grid-preset]"); if (button) applyGridPreset(button.dataset.gridPreset); });
  elements.gridColumns.addEventListener("change", () => { changeColumnCount(elements.gridColumns.value); applyGridSettings(); renderHome(); syncSettingsControls(); commitMaybe(); });
  elements.gridColumns.addEventListener("input", () => { elements.gridColumnsValue.textContent = elements.gridColumns.value; });
  elements.gridRowHeight.addEventListener("input", () => { state.grid.rowHeight = Number(elements.gridRowHeight.value); elements.gridRowHeightValue.textContent = `${state.grid.rowHeight} px`; applyGridSettings(); });
  elements.gridRowHeight.addEventListener("change", () => { pushUndo(); commitMaybe(); renderHome(); });
  elements.gridGap.addEventListener("input", () => { state.grid.gap = Number(elements.gridGap.value); elements.gridGapValue.textContent = `${state.grid.gap} px`; applyGridSettings(); });
  elements.gridGap.addEventListener("change", () => { pushUndo(); commitMaybe(); renderHome(); });
  elements.layoutTemplates.addEventListener("click", (event) => { const button = event.target.closest("[data-layout-template]"); if (button) applyLayoutTemplate(button.dataset.layoutTemplate); });

  elements.addPageButton.addEventListener("click", addPage);
  elements.pageManager.addEventListener("click", handlePageManagerClick);
  elements.wallpaperInput.addEventListener("change", handleWallpaperUpload);
  elements.removeWallpaper.addEventListener("click", removeWallpaper);
  elements.autoTheme.addEventListener("change", () => { state.appearance.autoTheme = elements.autoTheme.checked; saveState(); applyAppearance(); syncSettingsControls(); });
  elements.manualThemes.addEventListener("change", (event) => { if (event.target.name === "manualTheme") { state.appearance.manualTheme = event.target.value; state.appearance.autoTheme = false; saveState(); applyAppearance(); syncSettingsControls(); } });
  elements.widgetOpacity.addEventListener("input", () => { state.appearance.widgetOpacity = Number(elements.widgetOpacity.value); elements.widgetOpacityValue.textContent = `${state.appearance.widgetOpacity}%`; applyAppearance(); });
  elements.widgetOpacity.addEventListener("change", saveState);
  elements.wallpaperShade.addEventListener("input", () => { state.appearance.wallpaperShade = Number(elements.wallpaperShade.value); elements.wallpaperShadeValue.textContent = `${state.appearance.wallpaperShade}%`; applyAppearance(); });
  elements.wallpaperShade.addEventListener("change", saveState);
  elements.motionStrength.addEventListener("input", () => { state.appearance.motionStrength = Number(elements.motionStrength.value); elements.motionStrengthValue.textContent = `${state.appearance.motionStrength}%`; applyMotionSettings(); });
  elements.motionStrength.addEventListener("change", saveState);

  [["search", elements.searchEnabled], ["clock", elements.clockEnabled], ["timetable", elements.timetableEnabled], ["weather", elements.weatherEnabled], ["gallery", elements.galleryEnabled]].forEach(([key, input]) => input.addEventListener("change", () => setWidgetEnabled(key, input.checked)));
  elements.clockType.addEventListener("change", () => { state.clock.type = elements.clockType.value; saveState(); updateClockMode(); });
  elements.clock24Hour.addEventListener("change", () => { state.clock.is24Hour = elements.clock24Hour.checked; saveState(); updateClock(); });
  elements.classSelect.addEventListener("change", () => { state.timetable.className = elements.classSelect.value; saveState(); renderTimetable(); });
  elements.switchTime.addEventListener("change", () => { state.timetable.switchTime = elements.switchTime.value || "16:00"; timetableDayWasSelected = false; selectedDayOffset = getAutomaticDayOffset(); saveState(); renderTimetable(); });
  elements.lessonPreset.addEventListener("change", () => { state.timetable.lessonPreset = elements.lessonPreset.value; saveState(); renderPeriodEditor(); renderTimetable(); });
  elements.periodEditor.addEventListener("change", handlePeriodTimeChange);
  elements.copyPresetToCustom.addEventListener("click", copyLessonPresetToCustom);

  elements.searchWeatherLocation.addEventListener("click", setWeatherLocationFromName);
  elements.weatherLocationInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); setWeatherLocationFromName(); } });
  elements.useCurrentLocation.addEventListener("click", setWeatherFromCurrentLocation);
  elements.refreshWeather.addEventListener("click", () => fetchWeather(true));

  elements.gallerySearchForm.addEventListener("submit", performGallerySearch);
  elements.galleryProvider.addEventListener("change", () => { state.gallery.provider = elements.galleryProvider.value; saveState(); });
  elements.openPixivRanking.addEventListener("click", () => openGalleryDestination("pixiv-ranking"));
  elements.openXIllustrations.addEventListener("click", () => openGalleryDestination("x-popular"));
  elements.galleryRecent.addEventListener("click", handleGalleryRecentClick);

  elements.searchEngine.addEventListener("change", () => { state.search.engine = elements.searchEngine.value; saveState(); });
  elements.saveSearchHistory.addEventListener("change", () => { state.search.saveHistory = elements.saveSearchHistory.checked; if (!state.search.saveHistory) state.search.history = []; saveState(); });
  elements.clearSearchHistory.addEventListener("click", () => { state.search.history = []; saveState(); showToast("検索履歴を消去しました"); });
  elements.searchForm.addEventListener("submit", handleSearchSubmit);
  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.searchInput.addEventListener("keydown", handleSearchKeys);
  elements.searchInput.addEventListener("focus", () => renderLocalSuggestions(elements.searchInput.value.trim()));
  document.addEventListener("pointerdown", (event) => { if (!event.target.closest(".search-item")) hideSuggestions(); });

  elements.styleTarget.addEventListener("change", syncCustomStyleControls);
  elements.customStyleEnabled.addEventListener("change", updateCustomStyleFromControls);
  [elements.customOpacity, elements.customBlur, elements.customRadius, elements.customShadow, elements.customTextColor, elements.customAccentColor].forEach((input) => input.addEventListener("input", updateCustomStyleFromControls));
  elements.resetCustomStyle.addEventListener("click", resetSelectedCustomStyle);

  elements.saveNamedLayout.addEventListener("click", saveNamedLayout);
  elements.savedLayoutManager.addEventListener("click", handleSavedLayoutClick);
  elements.exportSettings.addEventListener("click", exportSettings);
  elements.importSettings.addEventListener("change", importSettings);
  elements.resetButton.addEventListener("click", resetHome);

  elements.refreshTimetable.addEventListener("click", () => fetchTimetable(true));
  document.querySelectorAll("[data-day-offset]").forEach((button) => button.addEventListener("click", () => { selectedDayOffset = Number(button.dataset.dayOffset); timetableDayWasSelected = true; renderTimetable(); }));

  elements.shortcutForm.addEventListener("submit", saveShortcutFromDialog);
  elements.closeShortcutDialog.addEventListener("click", closeShortcutDialog);
  elements.cancelShortcut.addEventListener("click", closeShortcutDialog);
  elements.deleteShortcut.addEventListener("click", () => deleteShortcut(elements.shortcutForm.dataset.editId));
  elements.folderForm.addEventListener("submit", saveFolderDialog);
  elements.closeFolderDialog.addEventListener("click", closeFolderDialog);
  elements.deleteFolder.addEventListener("click", () => dissolveFolder(openFolderId));
  elements.folderDialogItems.addEventListener("dragstart", handleFolderDragStart);
  elements.folderDialogItems.addEventListener("dragover", handleFolderDragOver);
  elements.folderDialogItems.addEventListener("drop", handleFolderDrop);
  elements.folderDialogItems.addEventListener("click", handleFolderItemsClick);

  document.addEventListener("visibilitychange", () => { if (document.hidden) stopClock(); else { updateClock(); startClock(); fetchWeather(); } });
}

function bindBackdropClose(dialog) {
  dialog.addEventListener("click", (event) => {
    const panel = dialog.querySelector(".sheet-panel, .folder-glass");
    if (!panel || panel.contains(event.target)) return;
    if (dialog === elements.shortcutDialog) closeShortcutDialog();
    else if (dialog === elements.folderDialog) closeFolderDialog();
    else dialog.close();
  });
}

function toggleEditMode() {
  if (!isEditing) {
    preEditSnapshot = clone(state);
    undoStack = [];
    isEditing = true;
    showToast("移動、サイズ変更、重ねてフォルダ作成ができます");
  } else {
    isEditing = false;
    saveState();
    preEditSnapshot = null;
    undoStack = [];
    showToast("配置を保存しました");
  }
  renderHome();
}

function pushUndo() {
  if (!isEditing) return;
  undoStack.push(clone(state));
  if (undoStack.length > 20) undoStack.shift();
  elements.undoButton.disabled = false;
}

function undoLastChange() {
  const snapshot = undoStack.pop();
  if (!snapshot) return;
  state = snapshot;
  applyGridSettings();
  applyAppearance();
  renderHome();
  syncSettingsControls();
  renderTimetable();
  showToast("ひとつ前の状態に戻しました");
}

function commitMaybe() { if (!isEditing) saveState(); }

function hideWidget(key) {
  if (!state[key]) return;
  pushUndo();
  state[key].enabled = false;
  commitMaybe();
  renderHome();
  syncSettingsControls();
  showToast("設定からもう一度表示できます");
}

function setWidgetEnabled(key, enabled) {
  pushUndo();
  state[key].enabled = enabled;
  const page = findItemPage(key);
  if (enabled && !page) {
    activePage().order.push(key);
    activePage().layout[key] = defaultRectFor(key);
    settleLayout(activePage(), key);
  }
  commitMaybe();
  renderHome();
  if (key === "timetable" && enabled && !timetableData) fetchTimetable();
  if (key === "weather" && enabled && !weatherData) fetchWeather();
}

function beginGridDrag(event) {
  if (!isEditing || event.button !== 0) return;
  const item = event.target.closest(".grid-item");
  if (!item || item.dataset.key === "add-shortcut") return;
  const key = item.dataset.key;
  const page = activePage();
  if (!page.layout[key]) return;
  let mode = "";
  if (event.target.closest(".resize-handle")) mode = "resize";
  else if (event.target.closest(".drag-grip")) mode = "move";
  else if (item.matches(".shortcut-item, .folder-item") && !event.target.closest(".shortcut-actions")) mode = "move";
  if (!mode) return;
  event.preventDefault();
  pushUndo();
  item.setPointerCapture?.(event.pointerId);
  dragSession = { pointerId: event.pointerId, key, mode, startX: event.clientX, startY: event.clientY, original: { ...page.layout[key] }, next: { ...page.layout[key] }, moved: false, item, folderTarget: "", edgeDirection: 0 };
  positionGhost(dragSession.next, false);
  item.classList.add("drag-active");
  elements.body.classList.add("dragging");
}

function updateGridDrag(event) {
  if (!dragSession || event.pointerId !== dragSession.pointerId) return;
  const page = activePage();
  const gridRect = elements.homeGrid.getBoundingClientRect();
  const columnStep = (gridRect.width + state.grid.gap) / state.grid.columns;
  const rowStep = state.grid.rowHeight + state.grid.gap;
  const dx = Math.round((event.clientX - dragSession.startX) / columnStep);
  const dy = Math.round((event.clientY - dragSession.startY) / rowStep);
  const original = dragSession.original;
  const limits = limitsFor(dragSession.key);
  let next = dragSession.mode === "move"
    ? { ...original, x: Math.min(state.grid.columns - original.w, Math.max(0, original.x + dx)), y: Math.max(0, original.y + dy) }
    : { ...original, w: Math.min(state.grid.columns - original.x, Math.max(limits.minW, Math.min(limits.maxW, original.w + dx))), h: Math.max(limits.minH, Math.min(limits.maxH, original.h + dy)) };
  next = clampRect(dragSession.key, next);
  dragSession.next = next;
  dragSession.moved ||= JSON.stringify(next) !== JSON.stringify(original);
  const edgeInset = Math.max(58, Math.min(92, window.innerWidth * .07));
  const edgeDirection = dragSession.mode === "move" && event.clientX <= edgeInset ? -1 : dragSession.mode === "move" && event.clientX >= window.innerWidth - edgeInset ? 1 : 0;
  dragSession.edgeDirection = edgeDirection;
  elements.leftPageDrop.classList.toggle("active", edgeDirection < 0);
  elements.rightPageDrop.classList.toggle("active", edgeDirection > 0);
  const pageIndex = state.pages.indexOf(page);
  elements.leftPageDrop.querySelector("span").textContent = pageIndex > 0 ? "前のページへ移動" : "最初のページです";
  elements.rightPageDrop.querySelector("span").textContent = pageIndex < state.pages.length - 1 ? "次のページへ移動" : state.pages.length < MAX_PAGES ? "新しいページへ移動" : "最後のページです";
  const collisions = visibleKeys(page).filter((key) => key !== dragSession.key && page.layout[key] && overlaps(next, page.layout[key]));
  const sourceKind = itemKind(dragSession.key);
  const folderTarget = !edgeDirection && dragSession.mode === "move" && sourceKind === "shortcut" ? collisions.find((key) => ["shortcut", "folder"].includes(itemKind(key))) || "" : "";
  document.querySelectorAll(".drop-target").forEach((node) => node.classList.remove("drop-target"));
  if (folderTarget) elements.homeGrid.querySelector(`[data-key="${cssEscape(folderTarget)}"]`)?.classList.add("drop-target");
  dragSession.folderTarget = folderTarget;
  positionElement(dragSession.item, dragSession.key, next);
  positionGhost(next, collisions.length > 0 && !folderTarget);
  if (event.clientY > window.innerHeight - 44) window.scrollBy({ top: 18, behavior: "auto" });
}

function positionGhost(rect, collision) {
  elements.gridGhost.hidden = false;
  elements.gridGhost.style.gridColumn = `${rect.x + 1} / span ${rect.w}`;
  elements.gridGhost.style.gridRow = `${rect.y + 1} / span ${rect.h}`;
  elements.gridGhost.classList.toggle("collision", collision);
}

function finishGridDrag(event) {
  if (!dragSession || (event.pointerId !== undefined && event.pointerId !== dragSession.pointerId)) return;
  const session = dragSession;
  dragSession = null;
  session.item.classList.remove("drag-active");
  elements.body.classList.remove("dragging");
  elements.gridGhost.hidden = true;
  elements.leftPageDrop.classList.remove("active");
  elements.rightPageDrop.classList.remove("active");
  document.querySelectorAll(".drop-target").forEach((node) => node.classList.remove("drop-target"));
  if (session.moved) suppressShortcutClickUntil = Date.now() + 350;
  const before = captureItemPositions();
  const movedAcrossPage = session.edgeDirection ? moveDraggedItemAcrossPage(session, session.edgeDirection) : false;
  if (movedAcrossPage) {
    renderHome();
    renderPageManager();
    requestAnimationFrame(() => animateCurrentPageIn(session.edgeDirection));
    return;
  }
  if (session.folderTarget) createFolderFromDrop(session.key, session.folderTarget);
  else {
    activePage().layout[session.key] = session.next;
    settleLayout(activePage(), session.key);
  }
  renderHome();
  requestAnimationFrame(() => animateFromPositions(before));
}

function captureItemPositions() {
  return new Map([...elements.homeGrid.querySelectorAll(".grid-item[data-key]")].map((item) => [item.dataset.key, item.getBoundingClientRect()]));
}

function animateFromPositions(before) {
  elements.homeGrid.querySelectorAll(".grid-item[data-key]").forEach((item) => {
    const previous = before.get(item.dataset.key);
    if (!previous || typeof item.animate !== "function") return;
    const current = item.getBoundingClientRect();
    const dx = previous.left - current.left;
    const dy = previous.top - current.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: motionDuration(230), easing: "cubic-bezier(.2,.8,.2,1)" });
  });
}

function moveDraggedItemAcrossPage(session, direction) {
  const source = activePage();
  const sourceIndex = state.pages.indexOf(source);
  let destination = state.pages[sourceIndex + direction];
  if (!destination && direction > 0 && state.pages.length < MAX_PAGES) {
    destination = { id: `page-${Date.now().toString(36)}`, name: `ページ${state.pages.length + 1}`, order: [], layout: {} };
    state.pages.push(destination);
  }
  if (!destination) {
    showToast(direction < 0 ? "これより前のページはありません" : `ページは${MAX_PAGES}個までです`);
    return false;
  }
  source.order = source.order.filter((key) => key !== session.key);
  delete source.layout[session.key];
  destination.order.push(session.key);
  destination.layout[session.key] = findOpenRect(session.next.w, session.next.h, destination, "", Math.max(0, session.next.y));
  settleLayout(source);
  settleLayout(destination, session.key);
  state.activePageId = destination.id;
  commitMaybe();
  showToast(`「${destination.name}」へ移動しました`);
  return true;
}

function renderPageNavigation() {
  elements.pageDots.replaceChildren();
  state.pages.forEach((page) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-dot${page.id === state.activePageId ? " active" : ""}`;
    button.setAttribute("aria-label", page.name);
    button.setAttribute("aria-current", page.id === state.activePageId ? "page" : "false");
    button.addEventListener("click", () => {
      const currentIndex = state.pages.findIndex((item) => item.id === state.activePageId);
      const targetIndex = state.pages.findIndex((item) => item.id === page.id);
      switchPage(page.id, Math.sign(targetIndex - currentIndex));
    });
    elements.pageDots.appendChild(button);
  });
  const index = state.pages.findIndex((page) => page.id === state.activePageId);
  elements.previousPage.disabled = index <= 0;
  elements.nextPage.disabled = index >= state.pages.length - 1;
  elements.pageNavigation.hidden = state.pages.length <= 1 && !isEditing;
}

function switchPageBy(delta, startOffset = 0) {
  const index = state.pages.findIndex((page) => page.id === state.activePageId);
  const target = state.pages[index + delta];
  if (target) switchPage(target.id, delta, startOffset);
  else resetSwipeStage(startOffset);
}

async function switchPage(id, direction = 0, startOffset = 0) {
  if (id === state.activePageId || !state.pages.some((page) => page.id === id)) return;
  const currentIndex = state.pages.findIndex((page) => page.id === state.activePageId);
  const targetIndex = state.pages.findIndex((page) => page.id === id);
  direction ||= Math.sign(targetIndex - currentIndex) || 1;
  pageAnimation?.cancel();
  pageAnimation = null;
  elements.body.classList.remove("page-swiping");
  elements.homeStage.style.transform = "";
  elements.homeStage.style.opacity = "";
  if (motionDuration(240) > 1 && typeof elements.homeStage.animate === "function") {
    const distance = motionDistance(Math.min(window.innerWidth * .3, 340));
    pageAnimation = elements.homeStage.animate([
      { transform: `translate3d(${startOffset}px,0,0)`, opacity: Math.max(.5, 1 - Math.abs(startOffset) / Math.max(window.innerWidth, 1) * .55) },
      { transform: `translate3d(${-direction * distance}px,0,0)`, opacity: .08 }
    ], { duration: motionDuration(210), easing: "cubic-bezier(.32,.72,0,1)", fill: "forwards" });
    try { await pageAnimation.finished; } catch { return; }
  }
  state.activePageId = id;
  saveState();
  renderHome();
  renderPageManager();
  pageAnimation?.cancel();
  pageAnimation = null;
  animateCurrentPageIn(direction);
}

function beginPageSwipe(event) {
  if (isEditing || event.target.closest("button,input,select,.suggestions")) return;
  pageAnimation?.cancel();
  pageAnimation = null;
  swipeSession = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, horizontal: false, startedAt: performance.now() };
}

function updatePageSwipe(event) {
  if (!swipeSession || event.pointerId !== swipeSession.id) return;
  const dx = event.clientX - swipeSession.x;
  const dy = event.clientY - swipeSession.y;
  if (!swipeSession.horizontal) {
    if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy) * 1.12) return;
    swipeSession.horizontal = true;
    elements.homeStage.setPointerCapture?.(event.pointerId);
    elements.body.classList.add("page-swiping");
  }
  event.preventDefault();
  const index = state.pages.findIndex((page) => page.id === state.activePageId);
  const atBoundary = (dx > 0 && index === 0) || (dx < 0 && index === state.pages.length - 1);
  swipeSession.dx = atBoundary ? dx * .28 : dx;
  elements.homeStage.style.transform = `translate3d(${swipeSession.dx}px,0,0)`;
  elements.homeStage.style.opacity = String(Math.max(.5, 1 - Math.abs(swipeSession.dx) / Math.max(window.innerWidth, 1) * .55));
}

function finishPageSwipe(event) {
  if (!swipeSession || event.pointerId !== swipeSession.id) return;
  const session = swipeSession;
  swipeSession = null;
  if (!session.horizontal) return;
  const elapsed = Math.max(1, performance.now() - session.startedAt);
  const velocity = Math.abs(session.dx) / elapsed;
  const threshold = Math.min(116, window.innerWidth * .15);
  const direction = session.dx < 0 ? 1 : -1;
  const index = state.pages.findIndex((page) => page.id === state.activePageId);
  const hasTarget = Boolean(state.pages[index + direction]);
  if (hasTarget && (Math.abs(session.dx) >= threshold || velocity > .48)) switchPageBy(direction, session.dx);
  else resetSwipeStage(session.dx);
}

function cancelPageSwipe() {
  const offset = swipeSession?.dx || 0;
  swipeSession = null;
  resetSwipeStage(offset);
}

function resetSwipeStage(offset = 0) {
  elements.body.classList.remove("page-swiping");
  elements.homeStage.style.transform = "";
  elements.homeStage.style.opacity = "";
  if (!offset || motionDuration(220) <= 1 || typeof elements.homeStage.animate !== "function") return;
  pageAnimation?.cancel();
  pageAnimation = elements.homeStage.animate([
    { transform: `translate3d(${offset}px,0,0)`, opacity: Math.max(.5, 1 - Math.abs(offset) / Math.max(window.innerWidth, 1) * .55) },
    { transform: "translate3d(0,0,0)", opacity: 1 }
  ], { duration: motionDuration(260), easing: "cubic-bezier(.32,.72,0,1)" });
}

function animateCurrentPageIn(direction) {
  if (motionDuration(320) <= 1 || typeof elements.homeStage.animate !== "function") return;
  pageAnimation?.cancel();
  const distance = motionDistance(Math.min(window.innerWidth * .22, 270));
  pageAnimation = elements.homeStage.animate([
    { transform: `translate3d(${direction * distance}px,0,0) scale(.985)`, opacity: .12 },
    { transform: "translate3d(0,0,0) scale(1)", opacity: 1 }
  ], { duration: motionDuration(350), easing: "cubic-bezier(.2,.84,.18,1)" });
}

function handlePageWheel(event) {
  if (Date.now() < wheelLockUntil || isEditing) return;
  const pageDoesNotScroll = document.documentElement.scrollHeight <= window.innerHeight + 4;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey || pageDoesNotScroll ? event.deltaY : 0;
  if (Math.abs(delta) < 24) return;
  event.preventDefault();
  wheelLockUntil = Date.now() + 420;
  switchPageBy(delta > 0 ? 1 : -1);
}

function addPage() {
  if (state.pages.length >= MAX_PAGES) return showToast(`ページは${MAX_PAGES}個までです`);
  const name = elements.newPageName.value.trim() || `ページ${state.pages.length + 1}`;
  pushUndo();
  const page = { id: `page-${Date.now().toString(36)}`, name: name.slice(0, 18), order: [], layout: {} };
  state.pages.push(page);
  state.activePageId = page.id;
  elements.newPageName.value = "";
  commitMaybe();
  renderHome();
  syncSettingsControls();
}

function handlePageManagerClick(event) {
  const button = event.target.closest("button[data-page-action]");
  if (!button) return;
  const page = state.pages.find((item) => item.id === button.dataset.pageId);
  if (!page) return;
  if (button.dataset.pageAction === "open") switchPage(page.id);
  if (button.dataset.pageAction === "rename") {
    const name = window.prompt("ページ名", page.name)?.trim();
    if (name) { pushUndo(); page.name = name.slice(0, 18); commitMaybe(); renderHome(); syncSettingsControls(); }
  }
  if (button.dataset.pageAction === "delete") deletePage(page.id);
}

function deletePage(pageId) {
  if (state.pages.length <= 1) return showToast("最後のページは削除できません");
  const page = state.pages.find((item) => item.id === pageId);
  if (!page || !window.confirm(`「${page.name}」を削除しますか？ 中身は最初のページへ移動します。`)) return;
  pushUndo();
  const destination = state.pages.find((item) => item.id !== pageId);
  page.order.forEach((key) => { if (!destination.order.includes(key)) { destination.order.push(key); destination.layout[key] = findOpenRect(page.layout[key]?.w || 2, page.layout[key]?.h || 2, destination); } });
  state.pages = state.pages.filter((item) => item.id !== pageId);
  if (state.activePageId === pageId) state.activePageId = destination.id;
  settleLayout(destination);
  commitMaybe();
  renderHome();
  syncSettingsControls();
}

function createFolderFromDrop(sourceKey, targetKey) {
  const source = state.shortcuts.find((item) => shortcutKey(item.id) === sourceKey);
  const page = activePage();
  if (!source) return;
  if (targetKey.startsWith("folder:")) {
    const folder = state.folders.find((item) => folderKey(item.id) === targetKey);
    if (!folder) return;
    source.folderId = folder.id;
    if (!folder.shortcutIds.includes(source.id)) folder.shortcutIds.push(source.id);
    page.order = page.order.filter((key) => key !== sourceKey);
    delete page.layout[sourceKey];
    showToast(`「${folder.name}」に追加しました`);
    return;
  }
  const target = state.shortcuts.find((item) => shortcutKey(item.id) === targetKey);
  if (!target || source.id === target.id) return;
  const id = `folder-${Date.now().toString(36)}`;
  const folder = { id, name: "フォルダ", shortcutIds: [target.id, source.id] };
  source.folderId = id;
  target.folderId = id;
  const targetRect = page.layout[targetKey] || page.layout[sourceKey] || { x: 0, y: 0, w: 2, h: 2 };
  page.order = page.order.filter((key) => key !== sourceKey && key !== targetKey);
  delete page.layout[sourceKey];
  delete page.layout[targetKey];
  page.order.push(folderKey(id));
  page.layout[folderKey(id)] = clampRect(folderKey(id), targetRect);
  state.folders.push(folder);
  showToast("フォルダを作成しました");
}

function openFolderDialog(id) {
  const folder = state.folders.find((item) => item.id === id);
  if (!folder) return;
  clearTimeout(folderCloseTimer);
  openFolderId = id;
  elements.folderName.value = folder.name;
  elements.folderName.readOnly = !isEditing;
  elements.folderDialog.dataset.editing = String(isEditing);
  elements.folderHint.textContent = isEditing ? "ドラッグで並べ替え、×でホーム画面へ戻せます" : "アイコンを押すとすぐに開きます";
  renderFolderDialogItems();
  if (!elements.folderDialog.open) elements.folderDialog.showModal();
  requestAnimationFrame(() => elements.folderDialog.classList.add("folder-visible"));
}

function closeFolderDialog() {
  clearTimeout(folderCloseTimer);
  elements.folderDialog.classList.remove("folder-visible");
  openFolderId = "";
  folderDragId = "";
  if (!elements.folderDialog.open) return;
  if (motionDuration(324) <= 1) elements.folderDialog.close();
  else folderCloseTimer = setTimeout(() => { if (elements.folderDialog.open) elements.folderDialog.close(); }, motionDuration(324));
}

function renderFolderDialogItems() {
  const folder = state.folders.find((item) => item.id === openFolderId);
  elements.folderDialogItems.replaceChildren();
  folder?.shortcutIds.forEach((id) => {
    const shortcut = state.shortcuts.find((item) => item.id === id);
    if (!shortcut) return;
    const app = document.createElement("div");
    app.className = "folder-app";
    app.draggable = isEditing;
    app.dataset.shortcutId = id;
    app.innerHTML = `<button class="folder-app-link" type="button" data-folder-open="${escapeHtml(id)}" aria-label="${escapeHtml(shortcut.name)}を開く"><span class="folder-app-icon" style="--shortcut-color:${safeColor(shortcut.color)}"><span>${escapeHtml(firstCharacter(shortcut.name))}</span><img src="${faviconUrl(shortcut.url)}" alt=""></span><strong>${escapeHtml(shortcut.name)}</strong></button>${isEditing ? `<button class="folder-app-remove" type="button" data-folder-remove="${escapeHtml(id)}" aria-label="${escapeHtml(shortcut.name)}をフォルダから外す">×</button>` : ""}`;
    const image = app.querySelector("img");
    image.addEventListener("error", () => image.remove(), { once: true });
    elements.folderDialogItems.appendChild(app);
  });
}

function saveFolderDialog(event) {
  event.preventDefault();
  const folder = state.folders.find((item) => item.id === openFolderId);
  if (!folder) return;
  folder.name = elements.folderName.value.trim().slice(0, 24) || "フォルダ";
  saveState();
  closeFolderDialog();
  renderHome();
}

function dissolveFolder(id) {
  const folder = state.folders.find((item) => item.id === id);
  const page = findItemPage(folderKey(id));
  if (!folder || !page || !window.confirm(`「${folder.name}」を解除しますか？`)) return;
  pushUndo();
  const base = page.layout[folderKey(id)];
  page.order = page.order.filter((key) => key !== folderKey(id));
  delete page.layout[folderKey(id)];
  folder.shortcutIds.forEach((shortcutId, index) => {
    const shortcut = state.shortcuts.find((item) => item.id === shortcutId);
    if (!shortcut) return;
    shortcut.folderId = "";
    const key = shortcutKey(shortcutId);
    page.order.push(key);
    page.layout[key] = findOpenRect(Math.min(2, state.grid.columns), 2, page, "", (base?.y || 0) + Math.floor(index / 4));
  });
  state.folders = state.folders.filter((item) => item.id !== id);
  settleLayout(page);
  commitMaybe();
  closeFolderDialog();
  renderHome();
}

function handleFolderDragStart(event) { const row = event.target.closest("[data-shortcut-id]"); if (row) { folderDragId = row.dataset.shortcutId; event.dataTransfer.effectAllowed = "move"; } }
function handleFolderDragOver(event) { const row = event.target.closest("[data-shortcut-id]"); if (row) { event.preventDefault(); elements.folderDialogItems.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over")); row.classList.add("drag-over"); } }
function handleFolderDrop(event) {
  event.preventDefault();
  const targetId = event.target.closest("[data-shortcut-id]")?.dataset.shortcutId;
  const folder = state.folders.find((item) => item.id === openFolderId);
  if (!folder || !folderDragId || !targetId || folderDragId === targetId) return;
  const from = folder.shortcutIds.indexOf(folderDragId);
  const to = folder.shortcutIds.indexOf(targetId);
  folder.shortcutIds.splice(to, 0, folder.shortcutIds.splice(from, 1)[0]);
  saveState();
  renderFolderDialogItems();
  renderHome();
}

function handleFolderItemsClick(event) {
  const openButton = event.target.closest("[data-folder-open]");
  if (openButton && !isEditing) {
    const shortcut = state.shortcuts.find((item) => item.id === openButton.dataset.folderOpen);
    if (shortcut) {
      closeFolderDialog();
      window.location.href = shortcut.url;
    }
    return;
  }
  const id = event.target.closest("[data-folder-remove]")?.dataset.folderRemove;
  if (!id) return;
  const folder = state.folders.find((item) => item.id === openFolderId);
  const page = findItemPage(folderKey(openFolderId));
  const shortcut = state.shortcuts.find((item) => item.id === id);
  if (!folder || !page || !shortcut) return;
  pushUndo();
  folder.shortcutIds = folder.shortcutIds.filter((item) => item !== id);
  shortcut.folderId = "";
  const key = shortcutKey(id);
  page.order.push(key);
  page.layout[key] = findOpenRect(Math.min(2, state.grid.columns), 2, page);
  if (!folder.shortcutIds.length) { state.folders = state.folders.filter((item) => item.id !== folder.id); page.order = page.order.filter((item) => item !== folderKey(folder.id)); delete page.layout[folderKey(folder.id)]; closeFolderDialog(); }
  else renderFolderDialogItems();
  saveState();
  renderHome();
}

function applyGridPreset(name) {
  const preset = GRID_PRESETS[name];
  if (!preset) return;
  changeColumnCount(preset.columns);
  state.grid.rowHeight = preset.rowHeight;
  state.grid.gap = preset.gap;
  state.pages.forEach((page) => settleLayout(page));
  applyGridSettings();
  commitMaybe();
  renderHome();
  syncSettingsControls();
  showToast(`グリッドを「${name === "large" ? "大きめ" : name === "compact" ? "細かめ" : "標準"}」に変更しました`);
}

function applyLayoutTemplate(name) {
  if (!window.confirm("現在の配置をテンプレートに置き換えますか？")) return;
  pushUndo();
  const page = activePage();
  if (name === "study") {
    Object.assign(state.grid, GRID_PRESETS.standard);
    Object.assign(state.search, { enabled: true }); Object.assign(state.clock, { enabled: true }); Object.assign(state.timetable, { enabled: true }); Object.assign(state.weather, { enabled: true });
    moveCoreWidgetsToPage(page, ["search", "clock", "timetable", "weather"]);
    page.layout.search = { x: 0, y: 0, w: 12, h: 1 };
    page.layout.timetable = { x: 0, y: 1, w: 8, h: 4 };
    page.layout.weather = { x: 8, y: 1, w: 4, h: 3 };
    page.layout.clock = { x: 8, y: 4, w: 4, h: 2 };
  } else if (name === "shortcuts") {
    Object.assign(state.grid, GRID_PRESETS.compact);
    state.search.enabled = true; state.clock.enabled = true; state.weather.enabled = false; state.timetable.enabled = false;
    moveCoreWidgetsToPage(page, ["search", "clock"]);
    page.layout.search = { x: 0, y: 0, w: 12, h: 1 };
    page.layout.clock = { x: 12, y: 0, w: 4, h: 2 };
    let index = 0;
    page.order.filter((key) => ["shortcut", "folder"].includes(itemKind(key))).forEach((key) => { page.layout[key] = { x: (index * 2) % 16, y: 2 + Math.floor(index / 8) * 2, w: 2, h: 2 }; index += 1; });
  } else if (name === "simple") {
    Object.assign(state.grid, GRID_PRESETS.large);
    state.search.enabled = true; state.clock.enabled = true; state.weather.enabled = true; state.timetable.enabled = false;
    moveCoreWidgetsToPage(page, ["search", "clock", "weather"]);
    page.layout.search = { x: 0, y: 0, w: 8, h: 1 };
    page.layout.clock = { x: 0, y: 1, w: 4, h: 3 };
    page.layout.weather = { x: 4, y: 1, w: 4, h: 3 };
  }
  state.pages.forEach((item) => settleLayout(item));
  applyGridSettings();
  commitMaybe();
  renderHome();
  syncSettingsControls();
}

function moveCoreWidgetsToPage(page, keys) {
  keys.forEach((key) => {
    state.pages.forEach((item) => { if (item !== page) { item.order = item.order.filter((value) => value !== key); delete item.layout[key]; } });
    if (!page.order.includes(key)) page.order.unshift(key);
  });
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
  elements.motionStrength.value = String(state.appearance.motionStrength);
  elements.motionStrengthValue.textContent = `${state.appearance.motionStrength}%`;
  elements.autoTheme.checked = state.appearance.autoTheme;
  elements.manualThemes.disabled = state.appearance.autoTheme;
  const theme = elements.manualThemes.querySelector(`[name="manualTheme"][value="${state.appearance.manualTheme}"]`);
  if (theme) theme.checked = true;
  elements.searchEnabled.checked = state.search.enabled;
  elements.clockEnabled.checked = state.clock.enabled;
  elements.timetableEnabled.checked = state.timetable.enabled;
  elements.weatherEnabled.checked = state.weather.enabled;
  elements.galleryEnabled.checked = state.gallery.enabled;
  elements.clockType.value = state.clock.type;
  elements.clock24Hour.checked = state.clock.is24Hour;
  elements.classSelect.value = state.timetable.className;
  elements.switchTime.value = state.timetable.switchTime;
  elements.lessonPreset.value = state.timetable.lessonPreset;
  elements.weatherLocationInput.value = state.weather.locationName;
  elements.searchEngine.value = state.search.engine;
  elements.saveSearchHistory.checked = state.search.saveHistory;
  elements.removeWallpaper.disabled = !state.appearance.hasWallpaper;
  elements.gridPresets.querySelectorAll("[data-grid-preset]").forEach((button) => { const preset = GRID_PRESETS[button.dataset.gridPreset]; button.classList.toggle("active", preset.columns === state.grid.columns && preset.rowHeight === state.grid.rowHeight && preset.gap === state.grid.gap); });
  renderPageManager();
  renderSavedLayoutManager();
  populateFolderSelect();
  syncCustomStyleControls();
  renderPeriodEditor();
}

function renderPageManager() {
  elements.pageManager.replaceChildren();
  state.pages.forEach((page) => {
    const row = document.createElement("div");
    row.className = `manage-row${page.id === state.activePageId ? " active" : ""}`;
    row.innerHTML = `<div class="manage-row-copy"><strong>${escapeHtml(page.name)}</strong><span>${page.order.length}項目</span></div><div class="manage-row-actions"><button type="button" data-page-action="open" data-page-id="${escapeHtml(page.id)}">表示</button><button type="button" data-page-action="rename" data-page-id="${escapeHtml(page.id)}">名前</button><button type="button" data-page-action="delete" data-page-id="${escapeHtml(page.id)}">削除</button></div>`;
    elements.pageManager.appendChild(row);
  });
}

function applyWidgetStyles() {
  CORE_WIDGETS.forEach((key) => {
    const item = elements.homeGrid.querySelector(`[data-key="${key}"]`);
    const style = state.widgetStyles[key];
    if (!item || !style) return;
    const computed = getComputedStyle(document.documentElement);
    const text = style.enabled ? hexToRgb(style.text) : computed.getPropertyValue("--text-rgb").trim();
    const accent = style.enabled ? hexToRgb(style.accent) : computed.getPropertyValue("--accent-rgb").trim();
    item.style.setProperty("--item-bg-opacity", String((style.enabled ? style.opacity : state.appearance.widgetOpacity) / 100));
    item.style.setProperty("--item-blur", `${style.enabled ? style.blur : 28}px`);
    item.style.setProperty("--item-radius", `${style.enabled ? style.radius : 27}px`);
    item.style.setProperty("--item-shadow", String((style.enabled ? style.shadow : 55) / 290));
    item.style.setProperty("--item-text-rgb", text);
    item.style.setProperty("--item-accent-rgb", accent);
  });
}

function syncCustomStyleControls() {
  const key = elements.styleTarget.value || "search";
  const style = state.widgetStyles[key] || createDefaultState().widgetStyles[key];
  elements.customStyleEnabled.checked = style.enabled;
  elements.customStyleControls.disabled = !style.enabled;
  elements.customOpacity.value = style.opacity; elements.customOpacityValue.textContent = `${style.opacity}%`;
  elements.customBlur.value = style.blur; elements.customBlurValue.textContent = `${style.blur} px`;
  elements.customRadius.value = style.radius; elements.customRadiusValue.textContent = `${style.radius} px`;
  elements.customShadow.value = style.shadow; elements.customShadowValue.textContent = `${style.shadow}%`;
  elements.customTextColor.value = safeColor(style.text);
  elements.customAccentColor.value = safeColor(style.accent);
}

function updateCustomStyleFromControls() {
  const key = elements.styleTarget.value;
  const style = state.widgetStyles[key];
  style.enabled = elements.customStyleEnabled.checked;
  style.opacity = Number(elements.customOpacity.value);
  style.blur = Number(elements.customBlur.value);
  style.radius = Number(elements.customRadius.value);
  style.shadow = Number(elements.customShadow.value);
  style.text = safeColor(elements.customTextColor.value);
  style.accent = safeColor(elements.customAccentColor.value);
  saveState();
  applyWidgetStyles();
  syncCustomStyleControls();
}

function resetSelectedCustomStyle() {
  const key = elements.styleTarget.value;
  state.widgetStyles[key] = clone(createDefaultState().widgetStyles[key]);
  saveState();
  applyWidgetStyles();
  syncCustomStyleControls();
}

function saveNamedLayout() {
  const name = elements.layoutName.value.trim();
  if (!name) return showToast("配置名を入力してください");
  const snapshot = { id: `layout-${Date.now().toString(36)}`, name: name.slice(0, 24), savedAt: Date.now(), grid: clone(state.grid), pages: clone(state.pages), activePageId: state.activePageId };
  state.savedLayouts.unshift(snapshot);
  state.savedLayouts = state.savedLayouts.slice(0, 12);
  elements.layoutName.value = "";
  saveState();
  renderSavedLayoutManager();
  showToast("配置を保存しました");
}

function renderSavedLayoutManager() {
  elements.savedLayoutManager.replaceChildren();
  state.savedLayouts.forEach((layout) => {
    const row = document.createElement("div");
    row.className = "manage-row";
    row.innerHTML = `<div class="manage-row-copy"><strong>${escapeHtml(layout.name)}</strong><span>${new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(layout.savedAt)}</span></div><div class="manage-row-actions"><button type="button" data-layout-action="restore" data-layout-id="${escapeHtml(layout.id)}">復元</button><button type="button" data-layout-action="delete" data-layout-id="${escapeHtml(layout.id)}">削除</button></div>`;
    elements.savedLayoutManager.appendChild(row);
  });
}

function handleSavedLayoutClick(event) {
  const button = event.target.closest("[data-layout-action]");
  if (!button) return;
  const layout = state.savedLayouts.find((item) => item.id === button.dataset.layoutId);
  if (!layout) return;
  if (button.dataset.layoutAction === "restore") {
    if (!window.confirm(`「${layout.name}」の配置を復元しますか？`)) return;
    state.grid = clone(layout.grid); state.pages = clone(layout.pages); state.activePageId = layout.activePageId;
    sanitizeState(); applyGridSettings(); renderHome(); syncSettingsControls(); showToast("配置を復元しました");
  } else {
    state.savedLayouts = state.savedLayouts.filter((item) => item.id !== layout.id); saveState(); renderSavedLayoutManager();
  }
}

function exportSettings() {
  const payload = { ...clone(state), appearance: { ...state.appearance, hasWallpaper: false, autoPalette: null }, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `home-grid-settings-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function importSettings() {
  const file = elements.importSettings.files?.[0];
  elements.importSettings.value = "";
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (imported?.version !== 3 || !Array.isArray(imported.pages)) throw new Error("形式が違います");
    if (!window.confirm("現在の設定を読み込んだ内容で置き換えますか？")) return;
    state = mergeV3(imported, createDefaultState());
    sanitizeState();
    applyGridSettings(); applyAppearance(); renderHome(); syncSettingsControls(); renderTimetable(); fetchWeather(true);
    showToast("設定を読み込みました");
  } catch (error) { console.warn(error); showToast("このJSONは読み込めませんでした"); }
}

function openShortcutDialog(id = "") {
  populateFolderSelect();
  const shortcut = state.shortcuts.find((item) => item.id === id);
  elements.shortcutForm.dataset.editId = shortcut?.id || "";
  elements.shortcutDialogTitle.textContent = shortcut ? "ショートカットを編集" : "ショートカットを追加";
  elements.shortcutName.value = shortcut?.name || "";
  elements.shortcutUrl.value = shortcut?.url || "";
  elements.shortcutColor.value = safeColor(shortcut?.color || "#3478f6");
  elements.shortcutFolder.value = shortcut?.folderId || "";
  elements.deleteShortcut.hidden = !shortcut;
  elements.shortcutDialog.showModal();
  requestAnimationFrame(() => elements.shortcutName.focus());
}

function populateFolderSelect() {
  const selected = elements.shortcutFolder.value;
  elements.shortcutFolder.innerHTML = '<option value="">ホーム画面</option>';
  state.folders.forEach((folder) => { const option = document.createElement("option"); option.value = folder.id; option.textContent = folder.name; elements.shortcutFolder.appendChild(option); });
  if ([...elements.shortcutFolder.options].some((option) => option.value === selected)) elements.shortcutFolder.value = selected;
}

function closeShortcutDialog() { if (elements.shortcutDialog.open) elements.shortcutDialog.close(); elements.shortcutForm.reset(); elements.shortcutForm.dataset.editId = ""; }

function saveShortcutFromDialog(event) {
  event.preventDefault();
  const name = elements.shortcutName.value.trim();
  const url = normalizeUrl(elements.shortcutUrl.value);
  const color = safeColor(elements.shortcutColor.value);
  const folderId = elements.shortcutFolder.value;
  if (!name || !url) return showToast("名前と正しいURLを入力してください");
  const editId = elements.shortcutForm.dataset.editId;
  let shortcut = state.shortcuts.find((item) => item.id === editId);
  const oldFolderId = shortcut?.folderId || "";
  if (shortcut) Object.assign(shortcut, { name, url, color });
  else {
    shortcut = { id: `sc-${Date.now().toString(36)}`, name, url, color, folderId: "" };
    state.shortcuts.push(shortcut);
    const key = shortcutKey(shortcut.id);
    activePage().order.push(key);
    activePage().layout[key] = findOpenRect(Math.min(2, state.grid.columns), 2);
  }
  if (oldFolderId !== folderId) moveShortcutFolder(shortcut, folderId);
  saveState(); closeShortcutDialog(); renderHome(); showToast(editId ? "ショートカットを更新しました" : "ショートカットを追加しました");
}

function moveShortcutFolder(shortcut, folderId) {
  state.folders.forEach((folder) => { folder.shortcutIds = folder.shortcutIds.filter((id) => id !== shortcut.id); });
  const key = shortcutKey(shortcut.id);
  state.pages.forEach((page) => { page.order = page.order.filter((item) => item !== key); delete page.layout[key]; });
  shortcut.folderId = folderId;
  if (folderId) {
    const folder = state.folders.find((item) => item.id === folderId);
    if (folder && !folder.shortcutIds.includes(shortcut.id)) folder.shortcutIds.push(shortcut.id);
  } else {
    activePage().order.push(key);
    activePage().layout[key] = findOpenRect(Math.min(2, state.grid.columns), 2);
  }
}

function deleteShortcut(id) {
  const shortcut = state.shortcuts.find((item) => item.id === id);
  if (!shortcut || !window.confirm(`「${shortcut.name}」を削除しますか？`)) return;
  const key = shortcutKey(id);
  state.shortcuts = state.shortcuts.filter((item) => item.id !== id);
  state.folders.forEach((folder) => { folder.shortcutIds = folder.shortcutIds.filter((item) => item !== id); });
  state.pages.forEach((page) => { page.order = page.order.filter((item) => item !== key); delete page.layout[key]; });
  state.folders.filter((folder) => !folder.shortcutIds.length).forEach((folder) => { const fKey = folderKey(folder.id); state.pages.forEach((page) => { page.order = page.order.filter((item) => item !== fKey); delete page.layout[fKey]; }); });
  state.folders = state.folders.filter((folder) => folder.shortcutIds.length);
  saveState();
  if (elements.shortcutDialog.open) closeShortcutDialog();
  renderHome(); showToast("ショートカットを削除しました");
}

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try { const url = new URL(candidate); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
}
function faviconUrl(url) { return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`; }
function safeColor(value) { return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#3478f6"; }
function firstCharacter(value) { return [...(value.trim() || "?")][0].toLocaleUpperCase("ja-JP"); }

function gallerySearchUrl(provider, query) {
  const value = String(query || "").trim();
  if (provider === "x") {
    const xQuery = `${value} filter:images filter:safe -filter:replies`;
    return `https://x.com/search?q=${encodeURIComponent(xQuery)}&src=typed_query&f=top`;
  }
  if (provider === "google") return `https://www.google.com/search?tbm=isch&safe=active&q=${encodeURIComponent(`${value} イラスト`)}`;
  return `https://www.pixiv.net/tags/${encodeURIComponent(value)}/artworks`;
}

function performGallerySearch(event) {
  event?.preventDefault();
  const query = elements.galleryQuery.value.trim();
  if (!query) return showToast("検索するタグや作家名を入力してください");
  state.gallery.provider = elements.galleryProvider.value;
  state.gallery.recent = [query, ...state.gallery.recent.filter((item) => item !== query)].slice(0, 8);
  saveState();
  renderGallery();
  window.location.href = gallerySearchUrl(state.gallery.provider, query);
}

function openGalleryDestination(destination) {
  const urls = {
    "pixiv-ranking": "https://www.pixiv.net/ranking.php?mode=daily&content=illust",
    "x-popular": `https://x.com/search?q=${encodeURIComponent("#イラスト filter:images filter:safe -filter:replies")}&src=typed_query&f=top`
  };
  if (urls[destination]) window.location.href = urls[destination];
}

function renderGallery() {
  if (!elements.galleryRecent) return;
  elements.galleryProvider.value = state.gallery.provider;
  const queries = state.gallery.recent.length ? state.gallery.recent : ["オリジナル", "風景", "ファンタジー", "キャラクターデザイン"];
  const label = state.gallery.recent.length ? "最近" : "おすすめ";
  elements.galleryRecent.innerHTML = `<span>${label}</span>${queries.slice(0, 6).map((query) => `<button type="button" data-gallery-query="${escapeHtml(query)}">${escapeHtml(query)}</button>`).join("")}`;
}

function handleGalleryRecentClick(event) {
  const button = event.target.closest("[data-gallery-query]");
  if (!button) return;
  elements.galleryQuery.value = button.dataset.galleryQuery;
  performGallerySearch();
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const selected = suggestionsState[activeSuggestionIndex];
  if (selected) return activateSuggestion(selected);
  performSmartSearch(elements.searchInput.value);
}

function performSmartSearch(input) {
  const value = String(input || "").trim();
  if (!value) return;
  if (/^https?:\/\//i.test(value) || /^[\w-]+(?:\.[\w-]+)+(?:\/.*)?$/i.test(value)) { window.location.href = normalizeUrl(value); return; }
  const exactShortcut = state.shortcuts.find((item) => item.name.toLocaleLowerCase("ja-JP") === value.toLocaleLowerCase("ja-JP"));
  if (exactShortcut) { window.location.href = exactShortcut.url; return; }
  const command = value.match(/^(yt|map|ddg|b|g)\s+(.+)$/i);
  const query = command ? command[2] : value;
  const engine = command ? ({ yt: "youtube", map: "maps", ddg: "duckduckgo", b: "bing", g: "google" })[command[1].toLowerCase()] : state.search.engine;
  if (state.search.saveHistory) {
    state.search.history = [query, ...state.search.history.filter((item) => item !== query)].slice(0, 8);
    saveState();
  }
  const urls = {
    google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    maps: `https://www.google.com/maps/search/${encodeURIComponent(query)}`
  };
  window.location.href = urls[engine] || urls.google;
}

function handleSearchInput() {
  activeSuggestionIndex = -1;
  clearTimeout(suggestionTimer);
  suggestionRequest?.abort();
  const query = elements.searchInput.value.trim();
  renderLocalSuggestions(query);
  if (!query || state.search.engine !== "google") return;
  suggestionTimer = setTimeout(() => fetchGoogleSuggestions(query), 170);
}

function renderLocalSuggestions(query) {
  const normalized = query.toLocaleLowerCase("ja-JP");
  const local = [];
  if (normalized) {
    state.shortcuts.filter((item) => item.name.toLocaleLowerCase("ja-JP").includes(normalized) || item.url.toLowerCase().includes(normalized)).slice(0, 4).forEach((item) => local.push({ type: "shortcut", label: item.name, detail: "ショートカット", url: item.url }));
  } else if (state.search.saveHistory) {
    state.search.history.slice(0, 6).forEach((item) => local.push({ type: "history", label: item, detail: "履歴", query: item }));
  }
  suggestionsState = local;
  renderSuggestions();
}

async function fetchGoogleSuggestions(query) {
  suggestionRequest = new AbortController();
  try {
    const response = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`, { signal: suggestionRequest.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (elements.searchInput.value.trim() !== query) return;
    const remote = (Array.isArray(data?.[1]) ? data[1] : []).slice(0, 6).map((label) => ({ type: "search", label, detail: "Google", query: label }));
    const shortcuts = suggestionsState.filter((item) => item.type === "shortcut");
    suggestionsState = [...shortcuts, ...remote].slice(0, 8);
    renderSuggestions();
  } catch (error) { if (error.name !== "AbortError") renderSuggestions(); }
}

function renderSuggestions() {
  elements.suggestions.replaceChildren();
  suggestionsState.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-item";
    button.setAttribute("role", "option");
    button.innerHTML = `<span>${escapeHtml(suggestion.type === "shortcut" ? "↗" : suggestion.type === "history" ? "↶" : "⌕")}</span><span><strong>${escapeHtml(suggestion.label)}</strong><small>${escapeHtml(suggestion.detail)}</small></span>`;
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("mouseenter", () => setActiveSuggestion(index, false));
    button.addEventListener("click", () => activateSuggestion(suggestion));
    elements.suggestions.appendChild(button);
  });
  if (suggestionsState.length) showSuggestions(); else hideSuggestions();
}

function activateSuggestion(item) { if (item.type === "shortcut") window.location.href = item.url; else performSmartSearch(item.query || item.label); }
function showSuggestions() { elements.suggestions.hidden = false; elements.searchInput.setAttribute("aria-expanded", "true"); }
function hideSuggestions() { elements.suggestions.hidden = true; elements.searchInput.setAttribute("aria-expanded", "false"); activeSuggestionIndex = -1; }
function handleSearchKeys(event) {
  if (event.key === "Escape") return hideSuggestions();
  if (!suggestionsState.length || elements.suggestions.hidden) return;
  if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); const direction = event.key === "ArrowDown" ? 1 : -1; setActiveSuggestion((activeSuggestionIndex + direction + suggestionsState.length) % suggestionsState.length, true); }
}
function setActiveSuggestion(index, copyToInput) {
  activeSuggestionIndex = index;
  [...elements.suggestions.children].forEach((item, itemIndex) => { item.classList.toggle("active", itemIndex === index); item.setAttribute("aria-selected", String(itemIndex === index)); });
  if (copyToInput) elements.searchInput.value = suggestionsState[index].label;
}

function updateClockMode() { elements.digitalClock.hidden = state.clock.type !== "digital"; elements.analogClock.hidden = state.clock.type !== "analog"; updateClock(); }
function startClock() { stopClock(); clockTimer = setInterval(updateClock, 1000); }
function stopClock() { if (clockTimer) clearInterval(clockTimer); clockTimer = 0; }
function updateClock() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "long" }).format(now);
  elements.clockTime.textContent = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: !state.clock.is24Hour }).format(now);
  elements.clockDate.textContent = date; elements.analogDate.textContent = date;
  const seconds = now.getSeconds(); const minutes = now.getMinutes() + seconds / 60; const hours = now.getHours() % 12 + minutes / 60;
  elements.secondHand.style.transform = `rotate(${seconds * 6}deg)`; elements.minuteHand.style.transform = `rotate(${minutes * 6}deg)`; elements.hourHand.style.transform = `rotate(${hours * 30}deg)`;
  elements.digitalClock.hidden = state.clock.type !== "digital"; elements.analogClock.hidden = state.clock.type !== "analog";
  if (!timetableDayWasSelected) { const automatic = getAutomaticDayOffset(); if (automatic !== selectedDayOffset) { selectedDayOffset = automatic; renderTimetable(); } }
  renderLessonNowForCurrentData();
}

function getAutomaticDayOffset() {
  const now = new Date();
  const [hour, minute] = (state?.timetable?.switchTime || "16:00").split(":").map(Number);
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute) ? 1 : 0;
}

function activeLessonTimes() {
  const source = state.timetable.lessonPreset === "custom" ? state.timetable.customTimes : LESSON_PRESETS[state.timetable.lessonPreset] || LESSON_PRESETS["50"];
  return source.map((pair, index) => [validTime(pair?.[0], LESSON_PRESETS["50"][index][0]), validTime(pair?.[1], LESSON_PRESETS["50"][index][1])]);
}

function validTime(value, fallback) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "") ? value : fallback; }
function minutesFromTime(value) { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }

function renderPeriodEditor() {
  const times = activeLessonTimes();
  elements.periodEditor.replaceChildren();
  times.forEach(([start, end], index) => {
    const row = document.createElement("label");
    row.className = "period-time-row";
    row.innerHTML = `<strong>${index + 1}限</strong><input type="time" value="${start}" data-period-index="${index}" data-period-edge="0" ${state.timetable.lessonPreset === "custom" ? "" : "disabled"}><span>–</span><input type="time" value="${end}" data-period-index="${index}" data-period-edge="1" ${state.timetable.lessonPreset === "custom" ? "" : "disabled"}>`;
    elements.periodEditor.appendChild(row);
  });
  elements.copyPresetToCustom.hidden = state.timetable.lessonPreset === "custom";
}

function handlePeriodTimeChange(event) {
  const input = event.target.closest("input[data-period-index]");
  if (!input || state.timetable.lessonPreset !== "custom") return;
  const index = Number(input.dataset.periodIndex);
  const edge = Number(input.dataset.periodEdge);
  const nextPair = [...state.timetable.customTimes[index]];
  nextPair[edge] = validTime(input.value, LESSON_PRESETS["50"][index][edge]);
  if (minutesFromTime(nextPair[0]) >= minutesFromTime(nextPair[1])) {
    showToast("終了時刻は開始時刻より後にしてください");
    renderPeriodEditor();
    return;
  }
  state.timetable.customTimes[index] = nextPair;
  saveState();
  renderTimetable();
}

function copyLessonPresetToCustom() {
  const preset = state.timetable.lessonPreset === "45" ? "45" : "50";
  state.timetable.customTimes = clone(LESSON_PRESETS[preset]);
  state.timetable.lessonPreset = "custom";
  elements.lessonPreset.value = "custom";
  saveState();
  renderPeriodEditor();
  renderTimetable();
  showToast("時刻を自由設定へコピーしました");
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
    const cached = readCache(TIMETABLE_CACHE_KEY, (item) => item?.data?.schedules);
    if (cached) { timetableData = cached.data; renderTimetable(`保存データ・${formatCacheTime(cached.savedAt)}取得`); }
    else { elements.timetableMeta.textContent = "取得できませんでした"; elements.lessonNow.hidden = true; elements.timetableContent.innerHTML = '<div class="timetable-message">時間割を取得できませんでした。更新ボタンから再試行できます。</div>'; }
    console.warn("時間割取得エラー", error);
  } finally { elements.refreshTimetable.disabled = false; }
}

function scheduleForDate(date) {
  const dayNames = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];
  const dayName = dayNames[date.getDay()];
  const classKey = state.timetable.className.replace("/", "_");
  return { dayName, schedule: timetableData?.schedules?.[dayName]?.[classKey] || [] };
}

function renderTimetable(customMeta = "") {
  document.querySelectorAll("[data-day-offset]").forEach((button) => button.classList.toggle("active", Number(button.dataset.dayOffset) === selectedDayOffset));
  if (!timetableData?.schedules || !state.timetable.enabled) return;
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + selectedDayOffset);
  const { dayName, schedule } = scheduleForDate(date);
  const dateText = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(date);
  elements.timetableMeta.textContent = customMeta || `${dateText}・${state.timetable.className}`;
  if (!Array.isArray(schedule) || !schedule.some(Boolean)) {
    elements.lessonNow.hidden = true;
    elements.timetableContent.innerHTML = `<div class="timetable-message">${escapeHtml(dayName)}の時間割データはありません</div>`;
    return;
  }
  const status = getLessonStatus(schedule, date);
  renderLessonNow(status);
  const list = document.createElement("div");
  list.className = "period-list";
  const times = activeLessonTimes();
  for (let index = 0; index < 7; index += 1) {
    const period = document.createElement("div");
    period.className = `period${status.currentIndex === index ? " current" : ""}${status.nextIndex === index && status.dayOffset === selectedDayOffset ? " next" : ""}`;
    const number = document.createElement("span"); number.className = "period-number"; number.textContent = `${index + 1}限`;
    const subject = document.createElement("span"); subject.className = "period-subject"; subject.textContent = schedule[index] || "—";
    const time = document.createElement("span"); time.className = "period-time"; time.textContent = `${times[index][0]}–${times[index][1]}`;
    period.append(number, subject, time); list.appendChild(period);
  }
  elements.timetableContent.replaceChildren(list);
}

function getLessonStatus(schedule, displayedDate) {
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const dayOffset = Math.round((displayedDate - today) / 86400000);
  const times = activeLessonTimes();
  if (dayOffset !== 0) return { mode: "future", currentIndex: -1, nextIndex: schedule.findIndex(Boolean), dayOffset, label: dayOffset === 1 ? "明日の最初" : "最初の授業" };
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (let index = 0; index < times.length; index += 1) {
    const start = minutesFromTime(times[index][0]);
    const end = minutesFromTime(times[index][1]);
    if (minutes >= start && minutes < end && schedule[index]) return { mode: "current", currentIndex: index, nextIndex: nextSubjectIndex(schedule, index + 1), dayOffset: 0, remaining: end - minutes };
    if (minutes < start && schedule[index]) return { mode: "next", currentIndex: -1, nextIndex: index, dayOffset: 0, remaining: start - minutes };
  }
  const future = findNextSchoolSchedule(1);
  return { mode: "after", currentIndex: -1, nextIndex: future.index, dayOffset: future.offset, nextSchedule: future.schedule, label: future.offset === 1 ? "明日の最初" : `${future.offset}日後の最初` };
}

function nextSubjectIndex(schedule, from) { for (let index = from; index < 7; index += 1) if (schedule[index]) return index; return -1; }
function findNextSchoolSchedule(startOffset) {
  const date = new Date(); date.setHours(12, 0, 0, 0);
  for (let offset = startOffset; offset <= 7; offset += 1) {
    const target = new Date(date); target.setDate(target.getDate() + offset);
    const { schedule } = scheduleForDate(target);
    const index = schedule.findIndex(Boolean);
    if (index >= 0) return { offset, schedule, index };
  }
  return { offset: 1, schedule: [], index: -1 };
}

function renderLessonNow(status) {
  let subject = "予定なし";
  let chip = "次";
  let detail = "";
  if (status.mode === "current") {
    const date = new Date(); date.setHours(12, 0, 0, 0);
    const schedule = scheduleForDate(date).schedule;
    subject = `${status.currentIndex + 1}限 ${schedule[status.currentIndex] || "—"}`;
    chip = "現在"; detail = `終了まで${status.remaining}分`;
  } else {
    const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + (status.dayOffset || 0));
    const schedule = status.nextSchedule || scheduleForDate(date).schedule;
    if (status.nextIndex >= 0) subject = `${status.nextIndex + 1}限 ${schedule[status.nextIndex] || "—"}`;
    chip = status.label || "次";
    if (status.remaining) detail = `開始まで${status.remaining}分`;
  }
  elements.lessonNow.innerHTML = `<span class="lesson-chip">${escapeHtml(chip)}</span><strong>${escapeHtml(subject)}</strong><span>${escapeHtml(detail)}</span>`;
  elements.lessonNow.hidden = false;
}

function renderLessonNowForCurrentData() {
  if (!timetableData?.schedules || !state.timetable.enabled) return;
  const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + selectedDayOffset);
  const { schedule } = scheduleForDate(date);
  if (schedule.some(Boolean)) renderLessonNow(getLessonStatus(schedule, date));
}

async function fetchWeather(force = false) {
  if (!state.weather.enabled && !force) return;
  if (!force) {
    const cached = readCache(WEATHER_CACHE_KEY, (item) => item?.data?.current && Date.now() - item.savedAt < 30 * 60 * 1000);
    if (cached && cached.locationName === state.weather.locationName) { weatherData = cached.data; renderWeather(cached.savedAt); return; }
  }
  elements.weatherContent.innerHTML = '<div class="timetable-loading"><span></span><span></span><span></span></div>';
  elements.refreshWeather.disabled = true;
  try {
    const params = new URLSearchParams({
      latitude: String(state.weather.latitude), longitude: String(state.weather.longitude), timezone: "auto", forecast_days: "5",
      current: "temperature_2m,apparent_temperature,weather_code,is_day",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    });
    const response = await fetch(`${WEATHER_URL}?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    weatherData = await response.json();
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), locationName: state.weather.locationName, data: weatherData }));
    renderWeather(Date.now());
    if (force) showToast("天気を更新しました");
  } catch (error) {
    const cached = readCache(WEATHER_CACHE_KEY, (item) => item?.data?.current);
    if (cached) { weatherData = cached.data; renderWeather(cached.savedAt, true); }
    else elements.weatherContent.innerHTML = '<div class="weather-message">天気を取得できませんでした。<br>設定から地域を確認してください。</div>';
    console.warn("天気取得エラー", error);
  } finally { elements.refreshWeather.disabled = false; }
}

function renderWeather(savedAt, isCached = false) {
  if (!weatherData?.current) return;
  elements.weatherLocation.textContent = state.weather.locationName;
  const current = weatherData.current;
  const [label, symbol] = weatherInfo(current.weather_code);
  const daily = weatherData.daily || {};
  const currentHour = Math.max(0, weatherData.hourly?.time?.findIndex((time) => new Date(time).getTime() >= Date.now()) ?? 0);
  const nearRain = Math.max(...(weatherData.hourly?.precipitation_probability || []).slice(currentHour, currentHour + 4), 0);
  const nearCodes = (weatherData.hourly?.weather_code || []).slice(currentHour, currentHour + 4);
  const snowSoon = nearCodes.some((code) => code >= 71 && code <= 86);
  const alert = nearRain >= 50 || snowSoon ? `<div class="weather-alert"><span class="weather-alert-dot"></span>${snowSoon ? "まもなく雪の予報" : `まもなく雨 ${Math.round(nearRain)}%`}</div>` : "";
  const hourlyCells = [0, 1, 2, 3].map((offset) => {
    const index = currentHour + offset;
    const time = weatherData.hourly?.time?.[index];
    const temp = weatherData.hourly?.temperature_2m?.[index];
    const rain = weatherData.hourly?.precipitation_probability?.[index];
    const icon = weatherInfo(weatherData.hourly?.weather_code?.[index])[1];
    return `<div class="forecast-cell"><strong>${time ? new Intl.DateTimeFormat("ja-JP", { hour: "numeric" }).format(new Date(time)) : "--"}</strong><span class="forecast-icon">${icon}</span><span>${Math.round(temp ?? 0)}°・${Math.round(rain ?? 0)}%</span></div>`;
  }).join("");
  const dailyCells = (daily.time || []).slice(0, 5).map((date, index) => `<div class="forecast-cell"><strong>${index === 0 ? "今日" : new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(new Date(`${date}T12:00`))}</strong><span class="forecast-icon">${weatherInfo(daily.weather_code?.[index])[1]}</span><span>${Math.round(daily.temperature_2m_max?.[index] ?? 0)}°/${Math.round(daily.temperature_2m_min?.[index] ?? 0)}°</span><span>雨 ${Math.round(daily.precipitation_probability_max?.[index] ?? 0)}%</span></div>`).join("");
  elements.weatherContent.innerHTML = `<div class="weather-current"><div class="weather-symbol">${symbol}</div><div><div class="weather-temperature">${Math.round(current.temperature_2m)}°</div><div class="weather-summary">${escapeHtml(label)}${isCached ? "・保存データ" : ""}</div><div class="weather-metrics"><span>体感 ${Math.round(current.apparent_temperature)}°</span><span>最高 ${Math.round(daily.temperature_2m_max?.[0] ?? current.temperature_2m)}°</span><span>最低 ${Math.round(daily.temperature_2m_min?.[0] ?? current.temperature_2m)}°</span><span>雨 ${Math.round(daily.precipitation_probability_max?.[0] ?? 0)}%</span></div>${alert}</div></div><div><div class="hourly-forecast">${hourlyCells}</div><div class="daily-forecast">${dailyCells}</div></div>`;
  elements.weatherContent.title = `更新 ${formatCacheTime(savedAt)}`;
}

function weatherInfo(code) { return WEATHER_CODES[Number(code)] || ["不明", "🌡️"]; }

async function setWeatherLocationFromName() {
  const name = elements.weatherLocationInput.value.trim();
  if (!name) return;
  elements.weatherSettingStatus.textContent = "地域を検索しています...";
  try {
    const params = new URLSearchParams({ name, count: "1", language: "ja", format: "json" });
    const response = await fetch(`${GEOCODING_URL}?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const place = (await response.json()).results?.[0];
    if (!place) throw new Error("地域が見つかりません");
    state.weather.locationName = [place.name, place.admin1].filter(Boolean).join("・");
    state.weather.latitude = place.latitude; state.weather.longitude = place.longitude;
    saveState();
    elements.weatherLocationInput.value = state.weather.locationName;
    elements.weatherSettingStatus.textContent = `${state.weather.locationName}に設定しました`;
    await fetchWeather(true);
  } catch (error) { console.warn(error); elements.weatherSettingStatus.textContent = "地域が見つかりませんでした。市区町村名で試してください。"; }
}

function setWeatherFromCurrentLocation() {
  if (!navigator.geolocation) { elements.weatherSettingStatus.textContent = "この端末では現在地を利用できません。"; return; }
  elements.weatherSettingStatus.textContent = "現在地を確認しています...";
  navigator.geolocation.getCurrentPosition(async (position) => {
    state.weather.latitude = position.coords.latitude; state.weather.longitude = position.coords.longitude; state.weather.locationName = "現在地";
    saveState(); elements.weatherLocationInput.value = "現在地"; elements.weatherSettingStatus.textContent = "現在地に設定しました"; await fetchWeather(true);
  }, () => { elements.weatherSettingStatus.textContent = "現在地を取得できませんでした。ブラウザの許可を確認してください。"; }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 });
}

function readCache(key, validator) { try { const item = JSON.parse(localStorage.getItem(key)); return validator(item) ? item : null; } catch { return null; } }
function formatCacheTime(timestamp) { return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)); }

function applyAppearance() {
  const style = document.documentElement.style;
  style.setProperty("--widget-opacity", String(state.appearance.widgetOpacity / 100));
  style.setProperty("--wallpaper-shade", String(state.appearance.wallpaperShade / 100));
  style.setProperty("--wallpaper-shade-top", String(state.appearance.wallpaperShade / 100 * .48));
  style.setProperty("--wallpaper-shade-bottom", String(state.appearance.wallpaperShade / 100 * .28));
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
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
  document.querySelector('meta[name="theme-color"]').content = rgbStringToHex(accent);
  applyMotionSettings();
  applyWidgetStyles();
}

function prefersReducedMotion() { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; }
function motionScale() { return prefersReducedMotion() ? 0 : state.appearance.motionStrength / 100; }
function motionDuration(base) { const scale = motionScale(); return scale <= 0 ? 1 : Math.round(base * (.48 + scale * .72)); }
function motionDistance(base) { return Math.round(base * (.32 + motionScale() * .68)); }
function applyMotionSettings() {
  const scale = motionScale();
  const style = document.documentElement.style;
  style.setProperty("--motion-strength", String(scale));
  style.setProperty("--motion-duration", `${motionDuration(300)}ms`);
  style.setProperty("--motion-fast", `${motionDuration(174)}ms`);
  style.setProperty("--motion-slow", `${motionDuration(324)}ms`);
  style.setProperty("--motion-distance", `${motionDistance(24)}px`);
  style.setProperty("--motion-wiggle", `${(scale * .78).toFixed(2)}deg`);
  style.setProperty("--motion-wiggle-neg", `${(-scale * .78).toFixed(2)}deg`);
  style.setProperty("--wiggle-duration", `${Math.round(350 - scale * 180)}ms`);
  style.setProperty("--press-scale", String((1 - scale * .045).toFixed(3)));
}

async function openWallpaperDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(WALLPAPER_DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(WALLPAPER_STORE)) request.result.createObjectStore(WALLPAPER_STORE); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}

async function wallpaperDatabaseAction(mode, value) {
  const database = await openWallpaperDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(WALLPAPER_STORE, mode === "get" ? "readonly" : "readwrite");
    const store = transaction.objectStore(WALLPAPER_STORE);
    const request = mode === "get" ? store.get("current") : mode === "put" ? store.put(value, "current") : store.delete("current");
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); transaction.oncomplete = () => database.close();
  });
}

async function loadWallpaper() {
  try {
    const blob = await wallpaperDatabaseAction("get");
    if (blob instanceof Blob) { setWallpaperBlob(blob); state.appearance.hasWallpaper = true; }
    else state.appearance.hasWallpaper = false;
  } catch (error) { state.appearance.hasWallpaper = false; console.warn("壁紙を読み込めませんでした。", error); }
  saveState(); syncSettingsControls();
}

function setWallpaperBlob(blob) {
  if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
  wallpaperObjectUrl = URL.createObjectURL(blob);
  elements.wallpaperLayer.style.backgroundImage = `url("${wallpaperObjectUrl}")`;
}

async function handleWallpaperUpload() {
  const file = elements.wallpaperInput.files?.[0]; elements.wallpaperInput.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) return showToast("画像ファイルを選んでください");
  if (file.size > 20 * 1024 * 1024) return showToast("壁紙は20MB以下にしてください");
  try {
    const palette = await extractPalette(file);
    await wallpaperDatabaseAction("put", file);
    state.appearance.hasWallpaper = true; state.appearance.autoPalette = palette;
    setWallpaperBlob(file); saveState(); applyAppearance(); syncSettingsControls(); showToast("壁紙とテーマを更新しました");
  } catch (error) { console.error(error); showToast("この画像を壁紙に設定できませんでした"); }
}

async function removeWallpaper() {
  try { await wallpaperDatabaseAction("delete"); } catch (error) { console.warn(error); }
  if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
  wallpaperObjectUrl = ""; elements.wallpaperLayer.style.backgroundImage = "";
  state.appearance.hasWallpaper = false; state.appearance.autoPalette = null;
  saveState(); applyAppearance(); syncSettingsControls(); showToast("壁紙を削除しました");
}

async function extractPalette(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas"); canvas.width = 56; canvas.height = 56;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const crop = Math.min(bitmap.width, bitmap.height); const sx = (bitmap.width - crop) / 2; const sy = (bitmap.height - crop) / 2;
  context.drawImage(bitmap, sx, sy, crop, crop, 0, 0, 56, 56); bitmap.close?.();
  const pixels = context.getImageData(0, 0, 56, 56).data;
  let red = 0, green = 0, blue = 0, samples = 0, bestColor = [52, 120, 246], bestScore = -1;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 180) continue;
    const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2]; red += r; green += g; blue += b; samples += 1;
    const [h, s, l] = rgbToHsl(r, g, b); const score = s * (1 - Math.abs(l - .52)) * (l > .15 && l < .9 ? 1 : .2);
    if (score > bestScore) { bestScore = score; bestColor = hslToRgb(h, Math.max(.5, s), Math.min(.64, Math.max(.43, l))); }
  }
  const average = samples ? [red / samples, green / samples, blue / samples] : [160, 180, 200];
  const dark = relativeLuminance(average) < .36;
  return { dark, accent: bestColor.map(Math.round), accentContrast: relativeLuminance(bestColor) > .55 ? [18, 22, 28] : [255, 255, 255], surface: dark ? [29, 32, 39] : [255, 255, 255], surfaceStrong: dark ? [45, 49, 58] : [242, 245, 250], text: dark ? [248, 249, 252] : [20, 24, 32], muted: dark ? [190, 196, 207] : [78, 87, 101] };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) { const delta = max - min; s = l > .5 ? delta / (2 - max - min) : delta / (max + min); if (max === r) h = (g - b) / delta + (g < b ? 6 : 0); else if (max === g) h = (b - r) / delta + 2; else h = (r - g) / delta + 4; h /= 6; }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  const q = l < .5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

function relativeLuminance([r, g, b]) {
  const values = [r, g, b].map((value) => { const channel = value / 255; return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}

function hexToRgb(hex) { const value = safeColor(hex).slice(1); return `${parseInt(value.slice(0, 2), 16)} ${parseInt(value.slice(2, 4), 16)} ${parseInt(value.slice(4, 6), 16)}`; }
function rgbStringToHex(value) { const rgb = value.split(/\s+/).map(Number); return rgb.length === 3 && rgb.every(Number.isFinite) ? `#${rgb.map((number) => Math.max(0, Math.min(255, Math.round(number))).toString(16).padStart(2, "0")).join("")}` : "#3478f6"; }

function populateClassSelect() {
  const fragment = document.createDocumentFragment();
  CLASS_LIST.forEach((className) => { const option = document.createElement("option"); option.value = className; option.textContent = className; fragment.appendChild(option); });
  elements.classSelect.appendChild(fragment);
}

async function resetHome() {
  if (!window.confirm("壁紙、ショートカット、配置、設定をすべて初期状態に戻しますか？")) return;
  try { await wallpaperDatabaseAction("delete"); } catch (error) { console.warn(error); }
  if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
  wallpaperObjectUrl = ""; elements.wallpaperLayer.style.backgroundImage = "";
  state = createDefaultState(); selectedDayOffset = getAutomaticDayOffset(); timetableDayWasSelected = false; undoStack = [];
  sanitizeState(); applyGridSettings(); applyAppearance(); renderHome(); syncSettingsControls(); renderTimetable(); fetchWeather(true); showToast("ホーム画面を初期状態に戻しました");
}

function showToast(message) {
  clearTimeout(toastTimer); elements.toast.textContent = message; elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2300);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
