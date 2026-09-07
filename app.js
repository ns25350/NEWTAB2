"use strict";
// NewTab 1.0 — GitHub Pages / Manifest V3. No build or runtime dependencies.
// Based on ns25350/NEWTAB2 v0.5; distributed under GPL-3.0.

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
let storageWarningShown = false;
let timetableRequestId = 0;
let weatherRequestId = 0;
let timetableCacheMeta = "";
let lastClockMinute = "";
let folderPointer = null;
let weatherSearchId = 0;
let responsiveTimer = 0;

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
  bindEnhancedControls();
  registerOfflineShell();
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
    timetable: { enabled: true, className: "101", switchTime: "16:00", autoSwitch: true, lessonPreset: "50", customTimes: clone(LESSON_PRESETS["50"]) },
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

function sanitizeState(persist = true) {
  const d = createDefaultState();
  for (const key of ["grid", "appearance", "search", "clock", "timetable", "weather", "gallery", "widgetStyles"]) {
    if (!isRecord(state[key])) state[key] = clone(d[key]);
  }
  state.version = 3;
  state.grid.columns = Math.round(clampNumber(state.grid.columns, 6, 16, 12));
  state.grid.rowHeight = Math.round(clampNumber(state.grid.rowHeight, 56, 112, 78));
  state.grid.gap = Math.round(clampNumber(state.grid.gap, 8, 24, 14));
  CORE_WIDGETS.forEach(key => { state[key].enabled = typeof state[key].enabled === "boolean" ? state[key].enabled : d[key].enabled; });
  state.search.engine = ["google", "bing", "duckduckgo", "youtube", "maps"].includes(state.search.engine) ? state.search.engine : "google";
  state.search.saveHistory = state.search.saveHistory === true;
  state.search.history = state.search.saveHistory ? cleanHistory(state.search.history, 1000) : [];
  state.clock.type = state.clock.type === "analog" ? "analog" : "digital";
  state.clock.is24Hour = state.clock.is24Hour !== false;
  state.gallery.provider = ["pixiv", "x", "google"].includes(state.gallery.provider) ? state.gallery.provider : "pixiv";
  state.gallery.recent = cleanHistory(state.gallery.recent, 80);
  const a = state.appearance;
  a.manualTheme = ["silver", "ocean", "rose", "graphite"].includes(a.manualTheme) ? a.manualTheme : "silver";
  a.autoTheme = a.autoTheme !== false;
  a.widgetOpacity = clampNumber(a.widgetOpacity, 0, 100, 72);
  a.wallpaperShade = clampNumber(a.wallpaperShade, 0, 55, 18);
  a.motionStrength = clampNumber(a.motionStrength, 0, 100, 70);
  a.hasWallpaper = a.hasWallpaper === true;
  const colors = ["surface", "surfaceStrong", "text", "muted", "accent", "accentContrast"];
  if (!isRecord(a.autoPalette) || !colors.every(key => Array.isArray(a.autoPalette[key]) && a.autoPalette[key].length === 3 && a.autoPalette[key].every(x => Number.isFinite(x) && x >= 0 && x <= 255))) a.autoPalette = null;
  CORE_WIDGETS.forEach(key => {
    const style = isRecord(state.widgetStyles[key]) ? state.widgetStyles[key] : d.widgetStyles[key];
    state.widgetStyles[key] = { enabled: style.enabled === true,
      opacity: clampNumber(style.opacity, 0, 100, 82), blur: clampNumber(style.blur, 0, 48, 28),
      radius: clampNumber(style.radius, 8, 42, 27), shadow: clampNumber(style.shadow, 0, 100, 55),
      text: safeColor(style.text), accent: safeColor(style.accent) };
  });
  state.timetable.className = CLASS_LIST.includes(state.timetable.className) ? state.timetable.className : "101";
  state.timetable.autoSwitch = state.timetable.autoSwitch !== false;
  state.timetable.switchTime = validTime(state.timetable.switchTime, "16:00");
  state.timetable.lessonPreset = ["45", "50", "custom"].includes(state.timetable.lessonPreset) ? state.timetable.lessonPreset : "50";
  if (!validLessonTimes(state.timetable.customTimes)) state.timetable.customTimes = clone(LESSON_PRESETS["50"]);
  state.weather.latitude = clampNumber(state.weather.latitude, -90, 90, 36.5613);
  state.weather.longitude = clampNumber(state.weather.longitude, -180, 180, 136.6562);
  state.weather.locationName = cleanText(state.weather.locationName, 80, "金沢市");
  const seen = new Set();
  state.shortcuts = (Array.isArray(state.shortcuts) ? state.shortcuts : []).filter(isStoredShortcut).slice(0, 300).filter(item => {
    if (!validId(item.id) || seen.has(item.id) || !normalizeUrl(item.url)) return false;
    seen.add(item.id); return true;
  }).map(item => ({ id: item.id, name: cleanText(item.name, 24, "ショートカット"), url: normalizeUrl(item.url), color: safeColor(item.color), folderId: validId(item.folderId) ? item.folderId : "" }));
  const folderIds = new Set();
  state.folders = (Array.isArray(state.folders) ? state.folders : []).filter(f => {
    if (!isRecord(f) || !validId(f.id) || folderIds.has(f.id)) return false;
    folderIds.add(f.id); return true;
  }).slice(0, 150).map(f => ({ id: f.id, name: cleanText(f.name, 24, "フォルダ"), shortcutIds: Array.isArray(f.shortcutIds) ? [...new Set(f.shortcutIds)].filter(id => seen.has(id)) : [] }));
  // Reconcile both sides of membership; a shortcut must have exactly one owner.
  state.shortcuts.forEach(sc => {
    const folder = state.folders.find(f => f.id === sc.folderId) || state.folders.find(f => f.shortcutIds.includes(sc.id));
    sc.folderId = folder?.id || "";
  });
  state.folders.forEach(f => { f.shortcutIds = [...f.shortcutIds.filter(id => state.shortcuts.some(sc => sc.id === id && sc.folderId === f.id)), ...state.shortcuts.filter(sc => sc.folderId === f.id && !f.shortcutIds.includes(sc.id)).map(sc => sc.id)]; });
  state.folders = state.folders.filter(f => f.shortcutIds.length);
  const pageIds = new Set();
  state.pages = (Array.isArray(state.pages) ? state.pages : []).filter(isRecord).slice(0, MAX_PAGES).map((page, index) => {
    let id = validId(page.id) && !pageIds.has(page.id) ? page.id : `page-recovered-${index}`;
    while (pageIds.has(id)) id += "-x";
    pageIds.add(id);
    return { id, name: cleanText(page.name, 18, `ページ${index + 1}`), order: Array.isArray(page.order) ? [...new Set(page.order.filter(isValidItemKey))] : [], layout: cleanLayout(page.layout), ...(isRecord(page.mobileLayout) ? { mobileLayout: cleanLayout(page.mobileLayout) } : {}) };
  });
  if (!state.pages.length) state.pages = [{ id: "page-home", name: "ホーム", order: [], layout: {} }];
  const assigned = new Set();
  state.pages.forEach(page => { page.order = page.order.filter(key => { if (assigned.has(key)) return false; assigned.add(key); return true; }); });
  if (!state.pages.some(p => p.id === state.activePageId)) state.activePageId = state.pages[0].id;
  const keys = [...CORE_WIDGETS, ...state.shortcuts.filter(sc => !sc.folderId).map(sc => shortcutKey(sc.id)), ...state.folders.map(f => folderKey(f.id))];
  keys.forEach(key => { if (!assigned.has(key)) activePage().order.push(key); });
  state.pages.forEach(page => settleLayout(page));
  state.savedLayouts = (Array.isArray(state.savedLayouts) ? state.savedLayouts : []).filter(l => isRecord(l) && validId(l.id) && Array.isArray(l.pages) && isRecord(l.grid)).slice(0, 12).map(l => ({ ...l, name: cleanText(l.name, 24, "保存した配置"), savedAt: clampNumber(l.savedAt, 0, 8640000000000000, Date.now()) }));
  delete state.agenda;
  if (persist) saveState();
}
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validId(value) { return typeof value === "string" && /^[\w-]{1,100}$/.test(value); }
function cleanText(value, max, fallback = "") { return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback; }
function cleanHistory(value, max) { return Array.isArray(value) ? [...new Set(value.filter(v => typeof v === "string" && v.trim()).map(v => v.slice(0, max)))].slice(0, 8) : []; }
function cleanLayout(layout) {
  return Object.fromEntries(Object.entries(isRecord(layout) ? layout : {}).filter(([key, value]) => isValidItemKey(key) && isRecord(value)).map(([key, value]) => [key, { x: clampNumber(value.x, 0, 16, 0), y: clampNumber(value.y, 0, 2000, 0), w: clampNumber(value.w, 1, 16, 2), h: clampNumber(value.h, 1, 8, 2) }]));
}
function validLessonTimes(times) {
  return Array.isArray(times) && times.length === 7 && times.every((pair, i) => Array.isArray(pair) && pair.length === 2 && pair.every(t => validTime(t, "") === t && typeof t === "string") && pair[0] < pair[1] && (!i || times[i - 1][1] <= pair[0]));
}

function isValidItemKey(key) {
  if (CORE_WIDGETS.includes(key)) return true;
  if (typeof key !== "string") return false;
  if (key.startsWith("shortcut:")) return state.shortcuts.some((item) => shortcutKey(item.id) === key && !item.folderId);
  if (key.startsWith("folder:")) return state.folders.some((item) => folderKey(item.id) === key);
  return false;
}

function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); return true; }
  catch {
    if (!storageWarningShown) {
      storageWarningShown = true;
      showToast("設定を保存できません。JSONを書き出して保管してください。");
    }
    return false;
  }
}
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

function limitsFor(key, columns = effectiveColumns()) {
  const kind = itemKind(key);
  if (kind === "search") return { minW: Math.min(4, columns), maxW: columns, minH: 1, maxH: 2 };
  if (["clock", "weather"].includes(kind)) return { minW: Math.min(2, columns), maxW: columns, minH: 2, maxH: 7 };
  if (kind === "gallery") return { minW: Math.min(4, columns), maxW: columns, minH: 2, maxH: 6 };
  if (kind === "timetable") return { minW: Math.min(3, columns), maxW: columns, minH: 2, maxH: 8 };
  return { minW: 1, maxW: Math.min(4, columns), minH: 1, maxH: 4 };
}

function defaultRectFor(key, page = activePage()) {
  const kind = itemKind(key);
  const width = kind === "search" ? Math.min(8, effectiveColumns()) : kind === "timetable" ? Math.min(8, effectiveColumns()) : kind === "gallery" ? Math.min(6, effectiveColumns()) : kind === "shortcut" || kind === "folder" ? Math.min(2, effectiveColumns()) : Math.min(4, effectiveColumns());
  const height = kind === "search" ? 1 : kind === "shortcut" || kind === "folder" ? 2 : 3;
  return findOpenRect(width, height, page);
}

function clampRect(key, input, columns = effectiveColumns()) {
  const limits = limitsFor(key, columns);
  const w = Math.round(clampNumber(input?.w, limits.minW, limits.maxW, limits.minW));
  const h = Math.round(clampNumber(input?.h, limits.minH, limits.maxH, limits.minH));
  return { x: Math.round(clampNumber(input?.x, 0, columns - w, 0)), y: Math.round(clampNumber(input?.y, 0, 2000, 0)), w, h };
}

function overlaps(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function findRectAgainst(width, height, placed, startY = 0, columns = effectiveColumns()) {
  const w = Math.min(width, columns);
  const bottom = Math.max(0, ...placed.map(rect => rect.y + rect.h));
  for (let y = Math.max(0, Math.round(startY)); y <= Math.max(bottom, startY) + 1; y += 1) {
    for (let x = 0; x <= columns - w; x += 1) {
      const candidate = { x, y, w, h: height };
      if (!placed.some(rect => overlaps(candidate, rect))) return candidate;
    }
  }
  return { x: 0, y: bottom + 1, w, h: height };
}

function findOpenRect(width, height, page = activePage(), ignoreKey = "", startY = 0) {
  const placed = visibleKeys(page).filter((key) => key !== ignoreKey && layoutFor(page)[key]).map((key) => layoutFor(page)[key]);
  return findRectAgainst(width, height, placed, startY);
}

function settleLayout(page = activePage(), activeKey = "") {
  const keys = visibleKeys(page);
  keys.forEach((key) => { layoutFor(page)[key] = clampRect(key, layoutFor(page)[key] || defaultRectFor(key, page)); });
  keys.sort((a, b) => {
    if (a === activeKey) return -1;
    if (b === activeKey) return 1;
    return layoutFor(page)[a].y - layoutFor(page)[b].y || layoutFor(page)[a].x - layoutFor(page)[b].x || page.order.indexOf(a) - page.order.indexOf(b);
  });
  const placed = [];
  keys.forEach((key) => {
    let rect = clampRect(key, layoutFor(page)[key]);
    if (placed.some((other) => overlaps(rect, other))) rect = findRectAgainst(rect.w, rect.h, placed, rect.y);
    layoutFor(page)[key] = rect;
    placed.push(rect);
  });
}

function changeColumnCount(nextColumns) {
  const oldColumns = state.grid.columns;
  const columns = Math.round(clampNumber(nextColumns, 6, 16, oldColumns));
  if (columns === oldColumns) return;
  pushUndo();
  state.grid.columns = columns;
  state.pages.forEach(page => {
    Object.entries(page.layout).forEach(([key, rect]) => { page.layout[key] = clampRect(key, { ...rect, x: Math.round(rect.x * columns / oldColumns), w: Math.round(rect.w * columns / oldColumns) }, columns); });
    settleLayout(page);
  });
}

function applyGridSettings() {
  const root = document.documentElement.style;
  root.setProperty("--grid-cols", String(effectiveColumns()));
  root.setProperty("--grid-row", `${state.grid.rowHeight}px`);
  root.setProperty("--grid-gap", `${state.grid.gap}px`);
}
function effectiveColumns() { return window.innerWidth <= 700 ? 6 : state.grid.columns; }
function layoutFor(page) {
  if (window.innerWidth > 700) return page.layout;
  if (!page.mobileLayout) {
    page.mobileLayout = {};
    const placed = [];
    visibleKeys(page).slice().sort((a, b) => (page.layout[a]?.y || 0) - (page.layout[b]?.y || 0) || (page.layout[a]?.x || 0) - (page.layout[b]?.x || 0)).forEach(key => {
      const original = page.layout[key] || { w: 2, h: 2 };
      const kind = itemKind(key);
      const width = ["search", "timetable", "gallery", "weather"].includes(kind) ? 6 : kind === "clock" ? 6 : 2;
      const height = kind === "clock" ? 2 : kind === "timetable" ? Math.max(4, original.h) : original.h;
      const rect = findRectAgainst(width, height, placed, 0, 6);
      page.mobileLayout[key] = rect; placed.push(rect);
    });
  }
  return page.mobileLayout;
}

function renderHome() {
  settleLayout(activePage());
  elements.homeGrid.querySelectorAll(".empty-page").forEach(item => item.remove());
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
    if (item) positionElement(item, key, layoutFor(page)[key]);
  });
  const addItem = elements.homeGrid.querySelector('[data-key="add-shortcut"]');
  if (addItem) positionElement(addItem, "add-shortcut", findOpenRect(Math.min(2, effectiveColumns()), 2, page));
  elements.body.classList.toggle("editing", isEditing);
  elements.editButton.setAttribute("aria-pressed", String(isEditing));
  elements.editButtonLabel.textContent = isEditing ? "完了" : "編集";
  elements.editGuide.hidden = !isEditing;
  elements.editToolbar.hidden = !isEditing;
  elements.undoButton.disabled = !undoStack.length;
  applyWidgetStyles();
  renderGallery();
  renderPageNavigation();
  if (!visibleKeys(page).length && !isEditing) {
    const empty = document.createElement("div");
    empty.className = "empty-page";
    empty.innerHTML = '<p>このページは空です</p><button class="glass-button" type="button">アイテムを追加</button>';
    empty.querySelector("button").addEventListener("click", toggleEditMode);
    elements.homeGrid.appendChild(empty);
  }
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
  elements.gridRowHeight.addEventListener("change", () => { commitMaybe(); renderHome(); });
  elements.gridGap.addEventListener("input", () => { state.grid.gap = Number(elements.gridGap.value); elements.gridGapValue.textContent = `${state.grid.gap} px`; applyGridSettings(); });
  elements.gridGap.addEventListener("change", () => { commitMaybe(); renderHome(); });
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
  saveState();
  showToast("ひとつ前の状態に戻しました");
}

function commitMaybe() { saveState(); }

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
    layoutFor(activePage())[key] = defaultRectFor(key);
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
  if (!layoutFor(page)[key]) return;
  let mode = "";
  if (event.target.closest(".resize-handle")) mode = "resize";
  else if (event.target.closest(".drag-grip")) mode = "move";
  else if (item.matches(".shortcut-item, .folder-item") && !event.target.closest(".shortcut-actions")) mode = "move";
  if (!mode) return;
  event.preventDefault();
  pushUndo();
  item.setPointerCapture?.(event.pointerId);
  dragSession = { pointerId: event.pointerId, key, mode, startX: event.clientX, startY: event.clientY, startScroll: window.scrollY, original: { ...layoutFor(page)[key] }, next: { ...layoutFor(page)[key] }, moved: false, item, folderTarget: "", edgeDirection: 0 };
  positionGhost(dragSession.next, false);
  item.classList.add("drag-active");
  elements.body.classList.add("dragging");
}

function updateGridDrag(event) {
  if (!dragSession || event.pointerId !== dragSession.pointerId) return;
  const page = activePage();
  const gridRect = elements.homeGrid.getBoundingClientRect();
  const columnStep = (gridRect.width + state.grid.gap) / effectiveColumns();
  const rowStep = state.grid.rowHeight + state.grid.gap;
  const dx = Math.round((event.clientX - dragSession.startX) / columnStep);
  const dy = Math.round((event.clientY - dragSession.startY + window.scrollY - dragSession.startScroll) / rowStep);
  const original = dragSession.original;
  const limits = limitsFor(dragSession.key);
  let next = dragSession.mode === "move"
    ? { ...original, x: Math.min(effectiveColumns() - original.w, Math.max(0, original.x + dx)), y: Math.max(0, original.y + dy) }
    : { ...original, w: Math.min(effectiveColumns() - original.x, Math.max(limits.minW, Math.min(limits.maxW, original.w + dx))), h: Math.max(limits.minH, Math.min(limits.maxH, original.h + dy)) };
  next = clampRect(dragSession.key, next);
  dragSession.next = next;
  dragSession.moved ||= Math.hypot(event.clientX - dragSession.startX, event.clientY - dragSession.startY) > 6;
  const edgeInset = Math.max(58, Math.min(92, window.innerWidth * .07));
  const edgeDirection = dragSession.mode === "move" && event.clientX <= edgeInset ? -1 : dragSession.mode === "move" && event.clientX >= window.innerWidth - edgeInset ? 1 : 0;
  dragSession.edgeDirection = edgeDirection;
  elements.leftPageDrop.classList.toggle("active", edgeDirection < 0);
  elements.rightPageDrop.classList.toggle("active", edgeDirection > 0);
  const pageIndex = state.pages.indexOf(page);
  elements.leftPageDrop.querySelector("span").textContent = pageIndex > 0 ? "前のページへ移動" : "最初のページです";
  elements.rightPageDrop.querySelector("span").textContent = pageIndex < state.pages.length - 1 ? "次のページへ移動" : state.pages.length < MAX_PAGES ? "新しいページへ移動" : "最後のページです";
  const collisions = visibleKeys(page).filter((key) => key !== dragSession.key && layoutFor(page)[key] && overlaps(next, layoutFor(page)[key]));
  const sourceKind = itemKind(dragSession.key);
  const folderTarget = collisions.length === 1 && !edgeDirection && dragSession.mode === "move" && sourceKind === "shortcut" ? collisions.find((key) => ["shortcut", "folder"].includes(itemKind(key))) || "" : "";
  document.querySelectorAll(".drop-target").forEach((node) => node.classList.remove("drop-target"));
  if (folderTarget) elements.homeGrid.querySelector(`[data-key="${cssEscape(folderTarget)}"]`)?.classList.add("drop-target");
  dragSession.folderTarget = folderTarget;
  positionElement(dragSession.item, dragSession.key, next);
  positionGhost(next, collisions.length > 0 && !folderTarget);
  if (event.clientY < 80) window.scrollBy({ top: -18, behavior: "auto" });
  if (event.clientY > window.innerHeight - 44) window.scrollBy({ top: 18, behavior: "auto" });
}

function positionGhost(rect, collision) {
  elements.gridGhost.hidden = false;
  elements.gridGhost.style.gridColumn = `${rect.x + 1} / span ${rect.w}`;
  elements.gridGhost.style.gridRow = `${rect.y + 1} / span ${rect.h}`;
  elements.gridGhost.classList.toggle("collision", collision);
  elements.gridGhost.textContent = collision ? "配置できません" : "";
}

function finishGridDrag(event) {
  if (!dragSession || (event.pointerId !== undefined && event.pointerId !== dragSession.pointerId)) return;
  const session = dragSession;
  dragSession = null;
  if (session.item.hasPointerCapture?.(session.pointerId)) session.item.releasePointerCapture(session.pointerId);
  session.item.classList.remove("drag-active");
  elements.body.classList.remove("dragging");
  elements.gridGhost.hidden = true;
  elements.leftPageDrop.classList.remove("active");
  elements.rightPageDrop.classList.remove("active");
  document.querySelectorAll(".drop-target").forEach((node) => node.classList.remove("drop-target"));
  if (event.type === "pointercancel" || !session.moved) {
    undoStack.pop(); renderHome(); return;
  }
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
    const collisions = visibleKeys().filter(key => key !== session.key && overlaps(session.next, layoutFor(activePage())[key]));
    if (collisions.length) {
      undoStack.pop();
      showToast("ここには置けません。空いているマスへ移動してください。");
    } else layoutFor(activePage())[session.key] = session.next;
  }
  renderHome();
  saveState();
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
  delete layoutFor(source)[session.key];
  destination.order.push(session.key);
  layoutFor(destination)[session.key] = findOpenRect(session.next.w, session.next.h, destination, "", Math.max(0, session.next.y));
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
  if (event.button !== 0 || isEditing || event.target.closest("button,input,select,a,.suggestions,.timetable-content,.weather-content,.gallery-recent")) return;
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
  if (event.target.closest(".timetable-content,.weather-content,.gallery-recent")) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
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
  if (["left", "right"].includes(button.dataset.pageAction)) {
    const index = state.pages.indexOf(page), destination = index + (button.dataset.pageAction === "left" ? -1 : 1);
    if (destination >= 0 && destination < state.pages.length) { pushUndo(); state.pages.splice(destination, 0, state.pages.splice(index, 1)[0]); saveState(); renderHome(); syncSettingsControls(); }
  }
  if (button.dataset.pageAction === "delete") deletePage(page.id);
}

function deletePage(pageId) {
  if (state.pages.length <= 1) return showToast("最後のページは削除できません");
  const page = state.pages.find((item) => item.id === pageId);
  if (!page || !window.confirm(`「${page.name}」を削除しますか？ 中身は最初のページへ移動します。`)) return;
  pushUndo();
  const destination = state.pages.find((item) => item.id !== pageId);
  page.order.forEach((key) => { if (!destination.order.includes(key)) { destination.order.push(key); layoutFor(destination)[key] = findOpenRect(layoutFor(page)[key]?.w || 2, layoutFor(page)[key]?.h || 2, destination); } });
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
    delete layoutFor(page)[sourceKey];
    showToast(`「${folder.name}」に追加しました`);
    return;
  }
  const target = state.shortcuts.find((item) => shortcutKey(item.id) === targetKey);
  if (!target || source.id === target.id) return;
  const id = `folder-${Date.now().toString(36)}`;
  const folder = { id, name: "フォルダ", shortcutIds: [target.id, source.id] };
  source.folderId = id;
  target.folderId = id;
  const targetRect = layoutFor(page)[targetKey] || layoutFor(page)[sourceKey] || { x: 0, y: 0, w: 2, h: 2 };
  page.order = page.order.filter((key) => key !== sourceKey && key !== targetKey);
  delete layoutFor(page)[sourceKey];
  delete layoutFor(page)[targetKey];
  page.order.push(folderKey(id));
  layoutFor(page)[folderKey(id)] = clampRect(folderKey(id), targetRect);
  state.folders.push(folder);
  showToast("フォルダを作成しました");
}

function openFolderDialog(id) {
  const folder = state.folders.find((item) => item.id === id);
  if (!folder) return;
  clearTimeout(folderCloseTimer);
  openFolderId = id;
  const origin = elements.homeGrid.querySelector(`[data-key="${cssEscape(folderKey(id))}"]`)?.getBoundingClientRect();
  elements.folderDialog.style.setProperty("--folder-from-x", origin ? `${origin.left + origin.width / 2 - window.innerWidth / 2}px` : "0px");
  elements.folderDialog.style.setProperty("--folder-from-y", origin ? `${origin.top + origin.height / 2 - window.innerHeight / 2}px` : "0px");
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
  pushUndo();
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
  const base = layoutFor(page)[folderKey(id)];
  page.order = page.order.filter((key) => key !== folderKey(id));
  delete layoutFor(page)[folderKey(id)];
  folder.shortcutIds.forEach((shortcutId, index) => {
    const shortcut = state.shortcuts.find((item) => item.id === shortcutId);
    if (!shortcut) return;
    shortcut.folderId = "";
    const key = shortcutKey(shortcutId);
    page.order.push(key);
    layoutFor(page)[key] = findOpenRect(Math.min(2, effectiveColumns()), 2, page, "", (base?.y || 0) + Math.floor(index / 4));
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
  if (from < 0 || to < 0) return;
  pushUndo();
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
  layoutFor(page)[key] = findOpenRect(Math.min(2, effectiveColumns()), 2, page);
  if (!folder.shortcutIds.length) { state.folders = state.folders.filter((item) => item.id !== folder.id); page.order = page.order.filter((item) => item !== folderKey(folder.id)); delete layoutFor(page)[folderKey(folder.id)]; closeFolderDialog(); }
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
  state.pages.forEach((item) => { delete item.mobileLayout; settleLayout(item); });
  applyGridSettings();
  commitMaybe();
  renderHome();
  syncSettingsControls();
}

function moveCoreWidgetsToPage(page, keys) {
  keys.forEach((key) => {
    state.pages.forEach((item) => { if (item !== page) { item.order = item.order.filter((value) => value !== key); delete layoutFor(item)[key]; } });
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
  document.getElementById("autoDaySwitch").checked = state.timetable.autoSwitch;
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
    row.innerHTML = `<div class="manage-row-copy"><strong>${escapeHtml(page.name)}</strong><span>${page.order.length}項目</span></div><div class="manage-row-actions"><button type="button" data-page-action="left" data-page-id="${escapeHtml(page.id)}" aria-label="前へ並べ替え" ${state.pages.indexOf(page) === 0 ? "disabled" : ""}>←</button><button type="button" data-page-action="right" data-page-id="${escapeHtml(page.id)}" aria-label="後ろへ並べ替え" ${state.pages.indexOf(page) === state.pages.length - 1 ? "disabled" : ""}>→</button><button type="button" data-page-action="open" data-page-id="${escapeHtml(page.id)}">表示</button><button type="button" data-page-action="rename" data-page-id="${escapeHtml(page.id)}">名前</button><button type="button" data-page-action="delete" data-page-id="${escapeHtml(page.id)}">削除</button></div>`;
    elements.pageManager.appendChild(row);
  });
}

function applyWidgetStyles() {
  CORE_WIDGETS.forEach((key) => {
    const item = elements.homeGrid.querySelector(`[data-key="${key}"]`);
    const style = state.widgetStyles[key];
    if (!item || !style) return;
    const computed = getComputedStyle(elements.body);
    const text = style.enabled ? hexToRgb(style.text) : computed.getPropertyValue("--text-rgb").trim();
    const accent = style.enabled ? hexToRgb(style.accent) : computed.getPropertyValue("--accent-rgb").trim();
    item.style.setProperty("--item-bg-opacity", String((style.enabled ? style.opacity : state.appearance.widgetOpacity) / 100));
    item.style.setProperty("--item-blur", `${style.enabled ? style.blur : 28}px`);
    item.style.setProperty("--item-radius", `${style.enabled ? style.radius : 27}px`);
    item.style.setProperty("--item-shadow", String((style.enabled ? style.shadow : 55) / 290));
    item.style.setProperty("--item-text-rgb", text);
    item.style.setProperty("--item-accent-rgb", accent);
    const accentChannels = accent.split(/\s+/).map(Number);
    const luminance = relativeLuminance(accentChannels);
    const dark = [18, 22, 28];
    const contrast = (luminance + .05) / (relativeLuminance(dark) + .05) > 1.05 / (luminance + .05) ? dark : [255, 255, 255];
    item.style.setProperty("--item-accent-contrast-rgb", contrast.join(" "));
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
  const snapshot = { id: `layout-${Date.now().toString(36)}`, name: name.slice(0, 24), savedAt: Date.now(), grid: clone(state.grid), pages: clone(state.pages), activePageId: state.activePageId, shortcuts: clone(state.shortcuts), folders: clone(state.folders), widgetVisibility: Object.fromEntries(CORE_WIDGETS.map(key => [key, state[key].enabled])) };
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
    pushUndo();
    state.grid = clone(layout.grid); state.pages = clone(layout.pages); state.activePageId = layout.activePageId;
    if (Array.isArray(layout.shortcuts)) state.shortcuts = clone(layout.shortcuts);
    if (Array.isArray(layout.folders)) state.folders = clone(layout.folders);
    if (isRecord(layout.widgetVisibility)) CORE_WIDGETS.forEach(key => { if (typeof layout.widgetVisibility[key] === "boolean") state[key].enabled = layout.widgetVisibility[key]; });
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
  link.download = `newtab-settings-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function importSettings() {
  const file = elements.importSettings.files?.[0];
  elements.importSettings.value = "";
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return showToast("設定JSONは5MB以下にしてください");
  const previous = clone(state);
  let committed = false;
  try {
    const imported = JSON.parse(await file.text());
    if (!isRecord(imported) || imported.version !== 3 || !Array.isArray(imported.pages) || !imported.pages.length || !imported.pages.every(isRecord)) throw new Error("形式が違います");
    if (!window.confirm("現在の配置・ショートカット・設定をJSONの内容で置き換えますか？ 壁紙画像は現在のものを引き継ぎます。")) return;
    state = mergeV3(imported, createDefaultState());
    state.appearance.hasWallpaper = previous.appearance.hasWallpaper;
    state.appearance.autoPalette = previous.appearance.autoPalette;
    sanitizeState(false);
    if (!saveState()) throw new Error("保存できません");
    committed = true;
    weatherRequestId++; timetableRequestId++;
    selectedDayOffset = getAutomaticDayOffset(); timetableDayWasSelected = false; undoStack = [];
    applyGridSettings(); applyAppearance(); renderHome(); syncSettingsControls(); updateClock();
    renderTimetable(); fetchTimetable(true); fetchWeather(true);
    showToast("設定を読み込みました");
  } catch {
    if (!committed) state = previous;
    showToast("このJSONは読み込めませんでした。形式と保存容量を確認してください。");
  }
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
  pushUndo();
  const editId = elements.shortcutForm.dataset.editId;
  let shortcut = state.shortcuts.find((item) => item.id === editId);
  const oldFolderId = shortcut?.folderId || "";
  if (shortcut) Object.assign(shortcut, { name, url, color });
  else {
    shortcut = { id: `sc-${Date.now().toString(36)}`, name, url, color, folderId: "" };
    state.shortcuts.push(shortcut);
    const key = shortcutKey(shortcut.id);
    activePage().order.push(key);
    layoutFor(activePage())[key] = findOpenRect(Math.min(2, effectiveColumns()), 2);
  }
  if (oldFolderId !== folderId) moveShortcutFolder(shortcut, folderId);
  pruneEmptyFolders();
  saveState(); closeShortcutDialog(); renderHome(); showToast(editId ? "ショートカットを更新しました" : "ショートカットを追加しました");
}

function moveShortcutFolder(shortcut, folderId) {
  state.folders.forEach((folder) => { folder.shortcutIds = folder.shortcutIds.filter((id) => id !== shortcut.id); });
  const key = shortcutKey(shortcut.id);
  state.pages.forEach((page) => { page.order = page.order.filter((item) => item !== key); delete layoutFor(page)[key]; });
  shortcut.folderId = folderId;
  if (folderId) {
    const folder = state.folders.find((item) => item.id === folderId);
    if (folder && !folder.shortcutIds.includes(shortcut.id)) folder.shortcutIds.push(shortcut.id);
  } else {
    activePage().order.push(key);
    layoutFor(activePage())[key] = findOpenRect(Math.min(2, effectiveColumns()), 2);
  }
}

function deleteShortcut(id) {
  const shortcut = state.shortcuts.find((item) => item.id === id);
  if (!shortcut || !window.confirm(`「${shortcut.name}」を削除しますか？`)) return;
  pushUndo();
  const key = shortcutKey(id);
  state.shortcuts = state.shortcuts.filter((item) => item.id !== id);
  state.folders.forEach((folder) => { folder.shortcutIds = folder.shortcutIds.filter((item) => item !== id); });
  state.pages.forEach((page) => { page.order = page.order.filter((item) => item !== key); delete layoutFor(page)[key]; });
  state.folders.filter((folder) => !folder.shortcutIds.length).forEach((folder) => { const fKey = folderKey(folder.id); state.pages.forEach((page) => { page.order = page.order.filter((item) => item !== fKey); delete layoutFor(page)[fKey]; }); });
  state.folders = state.folders.filter((folder) => folder.shortcutIds.length);
  saveState();
  if (elements.shortcutDialog.open) closeShortcutDialog();
  renderHome(); showToast("ショートカットを削除しました");
}

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw || /[\s\u0000-\u001f\u007f]/.test(raw)) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw) && !/^[\w.-]+:\d+(?:\/|$)/.test(raw)) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ["http:", "https:"].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

function faviconUrl(url) { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(url).hostname)}&sz=128`; }
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
  if (selected && !elements.suggestions.hidden) return activateSuggestion(selected);
  performSmartSearch(elements.searchInput.value);
}

function performSmartSearch(input) {
  const value = String(input || "").trim();
  if (!value) return;
  const url = normalizeUrl(value);
  if (url && (/^https?:\/\//i.test(value) || /^[^\s/]+\.[^\s/]+/.test(value) || /^localhost(?::\d+)?(?:\/|$)/.test(value))) { window.location.href = url; return; }
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
  if (normalized) local.push({ type: "search", label: query, detail: "検索", query });
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
    const data = await fetchJson(`https://suggestqueries.google.com/complete/search?client=chrome&hl=ja&q=${encodeURIComponent(query)}`, { signal: AbortSignal.any([suggestionRequest.signal, AbortSignal.timeout(5000)]) });
    if (elements.searchInput.value.trim() !== query) return;
    const remote = (Array.isArray(data?.[1]) ? data[1] : []).filter(label => typeof label === "string").slice(0, 6).map((label) => ({ type: "search", label, detail: "Google", query: label }));
    const shortcuts = suggestionsState.filter((item) => item.type !== "search");
    suggestionsState = [...shortcuts, ...(remote.length ? remote : [{ type: "search", label: query, detail: "Googleで検索", query }])].slice(0, 8);
    activeSuggestionIndex = -1;
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
    button.id = `suggestion-${index}`;
    button.tabIndex = -1;
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
function hideSuggestions() { elements.searchInput.removeAttribute("aria-activedescendant"); elements.suggestions.hidden = true; elements.searchInput.setAttribute("aria-expanded", "false"); activeSuggestionIndex = -1; }
function handleSearchKeys(event) {
  if (event.key === "Escape") return hideSuggestions();
  if (!suggestionsState.length || elements.suggestions.hidden) return;
  if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); const direction = event.key === "ArrowDown" ? 1 : -1; setActiveSuggestion((activeSuggestionIndex + direction + suggestionsState.length) % suggestionsState.length, true); }
}
function setActiveSuggestion(index, copyToInput) {
  activeSuggestionIndex = index;
  elements.searchInput.setAttribute("aria-activedescendant", `suggestion-${index}`);
  [...elements.suggestions.children].forEach((item, itemIndex) => { item.classList.toggle("active", itemIndex === index); item.setAttribute("aria-selected", String(itemIndex === index)); });
  if (copyToInput) elements.suggestions.children[index]?.scrollIntoView({ block: "nearest" });
}

function updateClockMode() { elements.digitalClock.hidden = state.clock.type !== "digital"; elements.analogClock.hidden = state.clock.type !== "analog"; updateClock(); }
function startClock() { stopClock(); clockTimer = setInterval(updateClock, 1000); }
function stopClock() { if (clockTimer) clearInterval(clockTimer); clockTimer = 0; }
function updateClock() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "long" }).format(now);
  elements.clockTime.textContent = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: !state.clock.is24Hour }).format(now);
  elements.clockDate.textContent = date; elements.analogDate.textContent = date;
  elements.clockTime.dataset.format = state.clock.is24Hour ? "24" : "12";
  const seconds = now.getSeconds(); const minutes = now.getMinutes() + seconds / 60; const hours = now.getHours() % 12 + minutes / 60;
  elements.secondHand.style.transform = `rotate(${seconds * 6}deg)`; elements.minuteHand.style.transform = `rotate(${minutes * 6}deg)`; elements.hourHand.style.transform = `rotate(${hours * 30}deg)`;
  elements.digitalClock.hidden = state.clock.type !== "digital"; elements.analogClock.hidden = state.clock.type !== "analog";
  if (!timetableDayWasSelected) { const automatic = getAutomaticDayOffset(); if (automatic !== selectedDayOffset) { selectedDayOffset = automatic; renderTimetable(); } }
  const minuteKey = `${now.toDateString()}-${now.getHours()}-${now.getMinutes()}`;
  if (lastClockMinute !== minuteKey) { lastClockMinute = minuteKey; renderTimetable(); }
}

function getAutomaticDayOffset() {
  if (state?.timetable?.autoSwitch === false) return 0;
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
    row.innerHTML = `<strong>${index + 1}限</strong><input type="time" value="${start}" data-period-index="${index}" data-period-edge="0" aria-label="${index + 1}限の開始" ${state.timetable.lessonPreset === "custom" ? "" : "disabled"}><span>–</span><input type="time" value="${end}" data-period-index="${index}" data-period-edge="1" aria-label="${index + 1}限の終了" ${state.timetable.lessonPreset === "custom" ? "" : "disabled"}>`;
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
  const proposed = clone(state.timetable.customTimes);
  proposed[index] = nextPair;
  if (!validLessonTimes(proposed)) { showToast("前後の授業と時刻が重ならないようにしてください"); renderPeriodEditor(); return; }
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
  const requestId = ++timetableRequestId;
  const cached = readCache(TIMETABLE_CACHE_KEY, item => validTimetable(item?.data) && Number.isFinite(item.savedAt));
  if (cached) {
    timetableData = cached.data;
    timetableCacheMeta = `保存データ・${formatCacheTime(cached.savedAt)}取得`;
    renderTimetable();
  } else if (!timetableData) elements.timetableMeta.textContent = "最新データを取得中…";
  elements.refreshTimetable.disabled = true;
  try {
    const data = await fetchJson(FIREBASE_URL, { cache: force ? "reload" : "default" });
    if (requestId !== timetableRequestId) return;
    if (!validTimetable(data)) throw new Error("時間割データの形式が違います");
    timetableData = data; timetableCacheMeta = "";
    writeCache(TIMETABLE_CACHE_KEY, { savedAt: Date.now(), data });
    renderTimetable();
    if (force) showToast("時間割を更新しました");
  } catch {
    if (requestId !== timetableRequestId) return;
    if (timetableData) {
      timetableCacheMeta = cached ? `保存データ・${formatCacheTime(cached.savedAt)}取得` : "保存データ・更新できませんでした";
      renderTimetable();
    } else {
      elements.timetableMeta.textContent = "取得できませんでした";
      elements.lessonNow.hidden = true;
      elements.timetableContent.innerHTML = '<div class="timetable-message">時間割に接続できませんでした。<button class="inline-retry" type="button" data-retry-timetable>再試行</button></div>';
    }
  } finally { if (requestId === timetableRequestId) elements.refreshTimetable.disabled = false; }
}
function validTimetable(data) {
  if (!isRecord(data) || !isRecord(data.schedules)) return false;
  return Object.values(data.schedules).every(day => isRecord(day) && Object.values(day).every(schedule => (Array.isArray(schedule) || isRecord(schedule)) && Object.values(schedule).every(subject => subject === null || typeof subject === "string")));
}

function scheduleForDate(date) {
  const dayNames = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];
  const dayName = dayNames[date.getDay()];
  const classKey = state.timetable.className.replaceAll("/", "_");
  const source = timetableData?.schedules?.[dayName]?.[classKey];
  const schedule = Array.from({ length: 7 }, (_, i) => typeof source?.[i] === "string" ? source[i].trim().slice(0, 120) : "");
  return { dayName, schedule };
}

function renderTimetable(customMeta = "") {
  document.querySelectorAll("[data-day-offset]").forEach((button) => button.classList.toggle("active", Number(button.dataset.dayOffset) === selectedDayOffset));
  if (!timetableData?.schedules || !state.timetable.enabled) return;
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + selectedDayOffset);
  const { dayName, schedule } = scheduleForDate(date);
  const dateText = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "short" }).format(date);
  elements.timetableMeta.textContent = `${dateText}・${state.timetable.className}${customMeta || timetableCacheMeta ? ` / ${customMeta || timetableCacheMeta}` : ""}`;
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
  const next = status.mode === "current" && status.nextIndex >= 0 ? `<div class="next-lesson"><span>次</span><strong>${escapeHtml(`${status.nextIndex + 1}限 ${scheduleForDate(new Date()).schedule[status.nextIndex]}`)}</strong><span>${activeLessonTimes()[status.nextIndex][0]}から</span></div>` : "";
  elements.lessonNow.innerHTML = `<div class="current-lesson"><span class="lesson-chip">${escapeHtml(chip)}</span><strong>${escapeHtml(subject)}</strong><span>${escapeHtml(detail)}</span></div>${next}`;
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
  const requestId = ++weatherRequestId;
  const locationSnapshot = { ...state.weather };
  const key = weatherLocationKey(locationSnapshot);
  const cached = readCache(WEATHER_CACHE_KEY, item => validWeather(item?.data) && item.locationKey === key && Number.isFinite(item.savedAt));
  elements.weatherLocation.textContent = locationSnapshot.locationName;
  if (cached) {
    weatherData = cached.data;
    renderWeather(cached.savedAt, Date.now() - cached.savedAt > 30 * 60 * 1000);
    if (!force && Date.now() - cached.savedAt < 30 * 60 * 1000 && Date.now() >= cached.savedAt) return;
  } else {
    weatherData = null;
    elements.weatherContent.innerHTML = '<div class="timetable-loading"><span></span><span></span><span></span></div>';
  }
  elements.refreshWeather.disabled = true;
  try {
    const params = new URLSearchParams({ latitude: String(locationSnapshot.latitude), longitude: String(locationSnapshot.longitude), timezone: "auto", forecast_days: "5", current: "temperature_2m,apparent_temperature,weather_code,is_day", hourly: "temperature_2m,precipitation_probability,weather_code", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" });
    const data = await fetchJson(`${WEATHER_URL}?${params}`);
    if (requestId !== weatherRequestId || weatherLocationKey(state.weather) !== key) return;
    if (!validWeather(data)) throw new Error("天気データの形式が違います");
    weatherData = data;
    const savedAt = Date.now();
    writeCache(WEATHER_CACHE_KEY, { savedAt, locationKey: key, locationName: locationSnapshot.locationName, data });
    renderWeather(savedAt);
    if (force) showToast("天気を更新しました");
  } catch {
    if (requestId !== weatherRequestId) return;
    if (cached) { weatherData = cached.data; renderWeather(cached.savedAt, true); }
    else elements.weatherContent.innerHTML = '<div class="weather-message">天気に接続できませんでした。<button class="inline-retry" type="button" data-retry-weather>再試行</button></div>';
  } finally { if (requestId === weatherRequestId) elements.refreshWeather.disabled = false; }
}
function weatherLocationKey(place) { return `${Number(place.latitude).toFixed(4)},${Number(place.longitude).toFixed(4)}`; }
function validWeather(data) {
  return isRecord(data) && isRecord(data.current) && Number.isFinite(data.current.temperature_2m) && Number.isFinite(data.current.weather_code) && Array.isArray(data.hourly?.time) && data.hourly.time.every(t => typeof t === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) && Array.isArray(data.daily?.time) && data.daily.time.every(t => typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t));
}
function weatherHourIndex(data, now = Date.now()) {
  const offset = Number(data.utc_offset_seconds) || 0;
  const times = data.hourly?.time || [];
  const firstFuture = times.findIndex(time => Date.parse(`${time}Z`) - offset * 1000 > now);
  return Math.max(0, firstFuture < 0 ? times.length - 1 : firstFuture - 1);
}
function weatherNumber(value, suffix = "") { return Number.isFinite(value) ? `${Math.round(value)}${suffix}` : "—"; }

function renderWeather(savedAt, isCached = false) {
  if (!weatherData?.current) return;
  elements.weatherLocation.textContent = state.weather.locationName;
  const current = weatherData.current;
  const [label, originalSymbol] = weatherInfo(current.weather_code);
  const symbol = current.is_day === 0 && [0, 1].includes(current.weather_code) ? "☾" : originalSymbol;
  const daily = weatherData.daily || {};
  const currentHour = weatherHourIndex(weatherData);
  const hour = weatherData.hourly || {};
  const nearRain = Math.max(...(hour.precipitation_probability || []).slice(currentHour, currentHour + 4).filter(Number.isFinite), 0);
  const snowSoon = (hour.weather_code || []).slice(currentHour, currentHour + 4).some(code => [71, 73, 75, 77, 85, 86].includes(code));
  const alert = !isCached && (nearRain >= 50 || snowSoon) ? `<div class="weather-alert">${snowSoon ? "数時間以内に雪の予報" : `数時間以内の降水確率 ${Math.round(nearRain)}%`}</div>` : "";
  const hourlyCells = [0, 1, 2, 3].filter(offset => hour.time?.[currentHour + offset]).map(offset => {
    const i = currentHour + offset;
    return `<div class="forecast-cell"><strong>${Number(hour.time[i].slice(11, 13))}時</strong><span class="forecast-icon" aria-label="${weatherInfo(hour.weather_code?.[i])[0]}">${weatherInfo(hour.weather_code?.[i])[1]}</span><span>${weatherNumber(hour.temperature_2m?.[i], "°")} / ${weatherNumber(hour.precipitation_probability?.[i], "%")}</span></div>`;
  }).join("");
  const dailyCells = (daily.time || []).slice(0, 5).map((date, i) => `<div class="forecast-cell"><strong>${i === 0 && !isCached ? "今日" : new Intl.DateTimeFormat("ja-JP", { weekday: "short" }).format(new Date(`${date}T12:00`))}</strong><span class="forecast-icon" aria-label="${weatherInfo(daily.weather_code?.[i])[0]}">${weatherInfo(daily.weather_code?.[i])[1]}</span><span>${weatherNumber(daily.temperature_2m_max?.[i], "°")} / ${weatherNumber(daily.temperature_2m_min?.[i], "°")}</span><span>${weatherNumber(daily.precipitation_probability_max?.[i], "%")}</span></div>`).join("");
  elements.weatherContent.innerHTML = `<div class="weather-current"><div class="weather-symbol" aria-hidden="true">${symbol}</div><div><div class="weather-temperature">${weatherNumber(current.temperature_2m, "°")}</div><div class="weather-summary">${escapeHtml(label)}</div><div class="weather-metrics"><span>体感 ${weatherNumber(current.apparent_temperature, "°")}</span><span>最高 ${weatherNumber(daily.temperature_2m_max?.[0], "°")}</span><span>最低 ${weatherNumber(daily.temperature_2m_min?.[0], "°")}</span><span>降水 ${weatherNumber(daily.precipitation_probability_max?.[0], "%")}</span></div>${alert}</div></div><div class="weather-forecasts"><div class="hourly-forecast">${hourlyCells}</div><div class="daily-forecast">${dailyCells}</div></div><div class="weather-cache-note">${isCached ? "保存データ / " : "更新 "}${formatCacheTime(savedAt)}</div>`;
}

function weatherInfo(code) { return WEATHER_CODES[Number(code)] || ["不明", "🌡️"]; }

async function setWeatherLocationFromName() {
  const name = elements.weatherLocationInput.value.trim();
  if (!name) return;
  const requestId = ++weatherSearchId;
  const results = document.getElementById("weatherLocationResults");
  results.replaceChildren();
  elements.weatherSettingStatus.textContent = "地域を検索しています…";
  try {
    const params = new URLSearchParams({ name, count: "5", language: "ja", format: "json" });
    const data = await fetchJson(`${GEOCODING_URL}?${params}`);
    if (requestId !== weatherSearchId) return;
    const places = (data.results || []).filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    if (!places.length) { elements.weatherSettingStatus.textContent = "見つかりませんでした。「金沢」「Kanazawa」のように入力してください。"; return; }
    elements.weatherSettingStatus.textContent = "表示する地域を選んでください。";
    places.forEach(place => {
      const button = document.createElement("button");
      button.type = "button";
      const name = [...new Set([place.name, place.admin1, place.country].filter(Boolean))].join("・");
      button.textContent = name;
      button.addEventListener("click", () => {
        state.weather.locationName = name;
        state.weather.latitude = place.latitude; state.weather.longitude = place.longitude;
        saveState(); elements.weatherLocationInput.value = name;
        results.replaceChildren(); elements.weatherSettingStatus.textContent = `${name}に設定しました`;
        fetchWeather(true);
      });
      results.appendChild(button);
    });
  } catch { if (requestId === weatherSearchId) elements.weatherSettingStatus.textContent = "地域検索に接続できませんでした。もう一度お試しください。"; }
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
  const accent = getComputedStyle(elements.body).getPropertyValue("--accent-rgb").trim();
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
  elements.body.dataset.reduceMotion = String(scale === 0);
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
    let result;
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = transaction.onabort = () => { database.close(); reject(transaction.error || new Error("壁紙を保存できません")); };
  });
}

async function loadWallpaper() {
  try {
    const blob = await wallpaperDatabaseAction("get");
    if (blob instanceof Blob) { setWallpaperBlob(blob); state.appearance.hasWallpaper = true; if (!state.appearance.autoPalette) state.appearance.autoPalette = await extractPalette(blob); }
    else state.appearance.hasWallpaper = false;
  } catch (error) { state.appearance.hasWallpaper = false; console.warn("壁紙を読み込めませんでした。", error); }
  saveState(); applyAppearance(); syncSettingsControls();
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
    const prepared = await prepareWallpaper(file);
    const palette = await extractPalette(prepared);
    await wallpaperDatabaseAction("put", prepared);
    state.appearance.hasWallpaper = true; state.appearance.autoPalette = palette;
    setWallpaperBlob(prepared); saveState(); applyAppearance(); syncSettingsControls(); showToast("壁紙とテーマを更新しました");
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


// Progressive enhancements shared by the hosted page and the extension.
function pruneEmptyFolders() {
  const empty = new Set(state.folders.filter(f => !f.shortcutIds.length).map(f => folderKey(f.id)));
  state.folders = state.folders.filter(f => f.shortcutIds.length);
  state.pages.forEach(page => { page.order = page.order.filter(key => !empty.has(key)); empty.forEach(key => { delete page.layout[key]; if (page.mobileLayout) delete page.mobileLayout[key]; }); });
}
function bindEnhancedControls() {
  document.querySelectorAll('.setting-row input[type="checkbox"]').forEach(input => {
    input.setAttribute("aria-label", input.closest(".setting-row")?.querySelector("h4")?.textContent || "切り替え");
  });
  document.getElementById("chooseWallpaper").addEventListener("click", () => elements.wallpaperInput.click());
  document.getElementById("chooseImport").addEventListener("click", () => elements.importSettings.click());
  document.getElementById("autoDaySwitch").addEventListener("change", event => {
    state.timetable.autoSwitch = event.target.checked;
    timetableDayWasSelected = false; selectedDayOffset = getAutomaticDayOffset(); saveState(); renderTimetable();
  });
  elements.timetableContent.addEventListener("click", event => { if (event.target.closest("[data-retry-timetable]")) fetchTimetable(true); });
  elements.weatherContent.addEventListener("click", event => { if (event.target.closest("[data-retry-weather]")) fetchWeather(true); });
  document.addEventListener("keydown", handleHomeKeyboard);
  document.addEventListener("pointerup", finishFolderPointer);
  document.addEventListener("pointercancel", () => { folderPointer = null; });
  elements.folderDialogItems.addEventListener("pointerdown", beginFolderPointer);
  document.addEventListener("pointermove", updateFolderPointer);
  elements.folderDialog.addEventListener("cancel", event => { event.preventDefault(); closeFolderDialog(); });
  elements.shortcutDialog.addEventListener("cancel", event => { event.preventDefault(); closeShortcutDialog(); });
  elements.folderDialog.addEventListener("close", () => { folderPointer = null; folderDragId = ""; });
  window.addEventListener("resize", () => {
    clearTimeout(responsiveTimer);
    responsiveTimer = setTimeout(() => {
      if (dragSession) finishGridDrag({ type: "pointercancel" });
      applyGridSettings(); renderHome();
    }, 120);
  });
  window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener("change", applyMotionSettings);
  // Capture undo snapshots before range input changes its value.
  [elements.gridRowHeight, elements.gridGap].forEach(input => {
    input.addEventListener("pointerdown", pushUndo);
    input.addEventListener("keydown", event => { if (event.key.startsWith("Arrow")) pushUndo(); });
  });
}
function handleHomeKeyboard(event) {
  const typing = event.target.matches?.("input,textarea,select,[contenteditable=true]");
  if (event.key === "Escape" && dragSession) { finishGridDrag({ type: "pointercancel" }); return; }
  if (document.querySelector("dialog[open]")) return;
  if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && isEditing) { event.preventDefault(); undoLastChange(); return; }
  if (!typing && event.key === "/" && state.search.enabled) { event.preventDefault(); const page = findItemPage("search"); if (page && page !== activePage()) { state.activePageId = page.id; renderHome(); } elements.searchInput.focus(); return; }
  if (!isEditing && !typing && event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); switchPageBy(event.key === "ArrowRight" ? 1 : -1); return; }
  if (!isEditing || typing || !event.key.startsWith("Arrow")) return;
  const item = event.target.closest(".grid-item[data-key]");
  if (!item || !layoutFor(activePage())[item.dataset.key]) return;
  event.preventDefault();
  const key = item.dataset.key;
  const rect = { ...layoutFor(activePage())[key] };
  const resize = event.target.closest(".resize-handle") || event.shiftKey;
  const axis = ["ArrowLeft", "ArrowRight"].includes(event.key) ? (resize ? "w" : "x") : (resize ? "h" : "y");
  rect[axis] += ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
  const next = clampRect(key, rect);
  if (visibleKeys().some(other => other !== key && overlaps(next, layoutFor(activePage())[other]))) return showToast("他の項目と重なるため移動できません");
  pushUndo(); layoutFor(activePage())[key] = next; saveState(); renderHome();
  elements.homeGrid.querySelector(`[data-key="${cssEscape(key)}"] ${resize ? ".resize-handle" : ".drag-grip,.shortcut-link"}`)?.focus();
}
function beginFolderPointer(event) {
  if (!isEditing || event.button !== 0 || event.target.closest(".folder-app-remove")) return;
  const app = event.target.closest("[data-shortcut-id]");
  if (!app) return;
  folderPointer = { id: app.dataset.shortcutId, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, target: "" };
  // Pointer events handle both mouse and touch; disable native HTML drag in this flow.
  app.draggable = false;
}
function updateFolderPointer(event) {
  if (!folderPointer || event.pointerId !== folderPointer.pointerId) return;
  if (Math.hypot(event.clientX - folderPointer.x, event.clientY - folderPointer.y) < 8) return;
  folderPointer.moved = true;
  event.preventDefault();
  const app = document.elementFromPoint(event.clientX, event.clientY)?.closest(".folder-app");
  folderPointer.target = app?.dataset.shortcutId || "";
  elements.folderDialogItems.querySelectorAll(".folder-app").forEach(row => row.classList.toggle("drag-over", row === app));
}
function finishFolderPointer(event) {
  if (!folderPointer || event.pointerId !== folderPointer.pointerId) return;
  const pointer = folderPointer; folderPointer = null;
  elements.folderDialogItems.querySelectorAll(".drag-over").forEach(row => row.classList.remove("drag-over"));
  const folder = state.folders.find(f => f.id === openFolderId);
  if (!pointer.moved || !folder) return;
  const from = folder.shortcutIds.indexOf(pointer.id), to = folder.shortcutIds.indexOf(pointer.target);
  if (from < 0 || to < 0 || from === to) return;
  pushUndo(); folder.shortcutIds.splice(to, 0, folder.shortcutIds.splice(from, 1)[0]);
  saveState(); renderFolderDialogItems(); renderHome();
}
async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(12000), credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
function writeCache(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Live data stays usable when storage is full. */ } }
function registerOfflineShell() {
  if (["https:", "http:"].includes(location.protocol) && "serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

async function prepareWallpaper(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("画像を変換できません")), "image/webp", .88));
  } finally { bitmap.close(); }
}
