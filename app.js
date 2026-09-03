"use strict";

const FIREBASE_URL = "https://johou7-275be-default-rtdb.firebaseio.com/timetable.json";
const STORAGE_KEY = "pixelHomeStateV1";
const TIMETABLE_CACHE_KEY = "pixelHomeTimetableCacheV1";

const CLASS_LIST = [
  "101", "102", "103", "104", "105", "106", "107", "108", "109", "110",
  "201", "202", "203", "204", "205/6文", "205理", "206理", "207", "208", "209", "210",
  "301", "302", "303", "304", "305", "306", "307", "308", "309", "310"
];

const DEFAULT_SHORTCUTS = [
  { id: "google", name: "Google", url: "https://www.google.com/", color: "#4285f4" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/", color: "#d93025" },
  { id: "classroom", name: "Classroom", url: "https://classroom.google.com/", color: "#1e8e3e" },
  { id: "drive", name: "Drive", url: "https://drive.google.com/", color: "#f9ab00" }
];

const defaultState = () => ({
  theme: "blue",
  clock: { enabled: true, type: "digital", is24Hour: true },
  timetable: { enabled: true, className: "101", switchTime: "16:00" },
  shortcuts: DEFAULT_SHORTCUTS.map((shortcut) => ({ ...shortcut })),
  order: ["clock", "timetable", ...DEFAULT_SHORTCUTS.map((item) => `shortcut:${item.id}`)]
});

let state = loadState();
let isEditing = false;
let timetableData = null;
let selectedDayOffset = getInitialDayOffset();
let timetableDayManuallySelected = false;
let searchSuggestions = [];
let activeSuggestionIndex = -1;
let suggestionTimer = 0;
let suggestionRequest = null;
let clockTimer = 0;
let toastTimer = 0;
let draggedItem = null;
let dragGhost = null;
let dragPointerId = null;

const elements = {
  body: document.body,
  todayLabel: document.getElementById("todayLabel"),
  editButton: document.getElementById("editButton"),
  settingsButton: document.getElementById("settingsButton"),
  homeGrid: document.getElementById("homeGrid"),
  editHint: document.getElementById("editHint"),
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  suggestions: document.getElementById("suggestions"),
  digitalClock: document.getElementById("digitalClock"),
  analogClock: document.getElementById("analogClock"),
  clockTime: document.getElementById("clockTime"),
  clockDate: document.getElementById("clockDate"),
  hourHand: document.getElementById("hourHand"),
  minuteHand: document.getElementById("minuteHand"),
  secondHand: document.getElementById("secondHand"),
  timetableMeta: document.getElementById("timetableMeta"),
  timetableContent: document.getElementById("timetableContent"),
  refreshTimetable: document.getElementById("refreshTimetable"),
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
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

initialize();

function initialize() {
  populateClassSelect();
  bindEvents();
  applyState();
  updateClock();
  startClock();
  fetchTimetable();
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") return defaultState();

    const defaults = defaultState();
    const shortcuts = Array.isArray(stored.shortcuts)
      ? stored.shortcuts.filter(isValidStoredShortcut).map((item) => ({ ...item }))
      : defaults.shortcuts;
    const validTokens = new Set(["clock", "timetable", ...shortcuts.map((item) => `shortcut:${item.id}`)]);
    const savedOrder = Array.isArray(stored.order) ? stored.order.filter((token) => validTokens.has(token)) : [];
    validTokens.forEach((token) => { if (!savedOrder.includes(token)) savedOrder.push(token); });

    return {
      theme: ["blue", "green", "violet", "coral", "dark"].includes(stored.theme) ? stored.theme : defaults.theme,
      clock: { ...defaults.clock, ...(stored.clock || {}) },
      timetable: { ...defaults.timetable, ...(stored.timetable || {}) },
      shortcuts,
      order: savedOrder
    };
  } catch (error) {
    console.warn("設定を読み込めなかったため、初期設定を使用します。", error);
    return defaultState();
  }
}

function isValidStoredShortcut(item) {
  return item && typeof item.id === "string" && typeof item.name === "string" && typeof item.url === "string";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyState() {
  elements.body.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.body).getPropertyValue("--bg").trim();

  const clockWidget = elements.homeGrid.querySelector('[data-key="clock"]');
  const timetableWidget = elements.homeGrid.querySelector('[data-key="timetable"]');
  clockWidget.hidden = !state.clock.enabled;
  timetableWidget.hidden = !state.timetable.enabled;

  elements.digitalClock.hidden = state.clock.type !== "digital";
  elements.analogClock.hidden = state.clock.type !== "analog";
  renderShortcuts();
  applySavedOrder();
  syncSettingsControls();
  updateClock();
  renderTimetable();
}

function bindEvents() {
  elements.editButton.addEventListener("click", toggleEditMode);
  elements.settingsButton.addEventListener("click", () => elements.settingsDialog.showModal());
  elements.searchForm.addEventListener("submit", handleSearchSubmit);
  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.searchInput.addEventListener("keydown", handleSearchKeys);
  elements.searchInput.addEventListener("focus", () => {
    if (searchSuggestions.length) showSuggestions();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!elements.searchForm.contains(event.target) && !elements.suggestions.contains(event.target)) hideSuggestions();
  });

  elements.refreshTimetable.addEventListener("click", () => fetchTimetable(true));
  document.querySelectorAll("[data-day-offset]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDayOffset = Number(button.dataset.dayOffset);
      timetableDayManuallySelected = true;
      renderTimetable();
    });
  });

  document.querySelectorAll(".hide-widget").forEach((button) => {
    button.addEventListener("click", () => {
      const widgetName = button.dataset.widget;
      state[widgetName].enabled = false;
      saveState();
      applyState();
      showToast(`${widgetName === "clock" ? "時計" : "時間割"}を非表示にしました。設定から戻せます。`);
    });
  });

  elements.settingsForm.addEventListener("change", handleSettingsChange);
  elements.resetButton.addEventListener("click", resetAllSettings);
  elements.shortcutForm.addEventListener("submit", saveShortcutFromDialog);
  elements.closeShortcutDialog.addEventListener("click", closeShortcutDialog);
  elements.cancelShortcut.addEventListener("click", closeShortcutDialog);
  elements.deleteShortcut.addEventListener("click", deleteSelectedShortcut);

  elements.homeGrid.addEventListener("pointerdown", beginPointerDrag);
  document.addEventListener("pointermove", movePointerDrag);
  document.addEventListener("pointerup", endPointerDrag);
  document.addEventListener("pointercancel", endPointerDrag);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopClock(); else { updateClock(); startClock(); }
  });
}

function toggleEditMode() {
  isEditing = !isEditing;
  elements.body.classList.toggle("editing", isEditing);
  elements.editButton.setAttribute("aria-pressed", String(isEditing));
  elements.editButton.setAttribute("aria-label", isEditing ? "編集を完了" : "ホーム画面を編集");
  elements.editHint.hidden = !isEditing;
  renderShortcuts();
  applySavedOrder();
  showToast(isEditing ? "編集モードを開始しました" : "配置を保存しました");
}

function renderShortcuts() {
  elements.homeGrid.querySelectorAll(".shortcut-item").forEach((element) => element.remove());

  state.shortcuts.forEach((shortcut) => {
    const item = document.createElement("article");
    item.className = "home-item shortcut-item span-two";
    item.dataset.key = `shortcut:${shortcut.id}`;
    item.tabIndex = 0;
    item.setAttribute("role", "link");
    item.setAttribute("aria-label", shortcut.name);
    item.innerHTML = `
      <div class="shortcut-controls">
        <button class="shortcut-edit" type="button" aria-label="${escapeHtml(shortcut.name)}を編集">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15.5V20h4.5L19.8 8.7l-4.5-4.5L4 15.5Z"/></svg>
        </button>
      </div>
      <div class="shortcut-icon" style="--shortcut-color:${safeColor(shortcut.color)}">
        <span class="shortcut-initial">${escapeHtml(firstCharacter(shortcut.name))}</span>
        <img alt="" src="${faviconUrl(shortcut.url)}">
      </div>
      <div class="shortcut-name">${escapeHtml(shortcut.name)}</div>`;

    const image = item.querySelector("img");
    image.addEventListener("error", () => image.remove(), { once: true });
    item.querySelector(".shortcut-edit").addEventListener("click", (event) => {
      event.stopPropagation();
      openShortcutDialog(shortcut.id);
    });
    item.addEventListener("click", () => {
      if (!isEditing) window.location.href = shortcut.url;
    });
    item.addEventListener("keydown", (event) => {
      if (!isEditing && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        window.location.href = shortcut.url;
      }
    });
    elements.homeGrid.appendChild(item);
  });

  const addItem = document.createElement("button");
  addItem.className = "home-item shortcut-item add-shortcut span-two";
  addItem.type = "button";
  addItem.dataset.key = "add-shortcut";
  addItem.innerHTML = '<span class="shortcut-icon" aria-hidden="true">+</span><span class="shortcut-name">追加</span>';
  addItem.addEventListener("click", () => openShortcutDialog());
  elements.homeGrid.appendChild(addItem);
}

function applySavedOrder() {
  const items = new Map([...elements.homeGrid.querySelectorAll(".home-item[data-key]")].map((item) => [item.dataset.key, item]));
  state.order.forEach((key) => {
    const item = items.get(key);
    if (item) elements.homeGrid.appendChild(item);
  });
  const addItem = items.get("add-shortcut");
  if (addItem) elements.homeGrid.appendChild(addItem);
}

function saveCurrentOrder() {
  state.order = [...elements.homeGrid.querySelectorAll(".home-item[data-key]")]
    .map((item) => item.dataset.key)
    .filter((key) => key && key !== "add-shortcut");
  saveState();
}

function beginPointerDrag(event) {
  if (!isEditing || event.button !== 0) return;
  if (event.target.closest("button") || event.target.closest("input") || event.target.closest("select")) return;

  const item = event.target.closest(".home-item:not(.add-shortcut)");
  if (!item) return;
  if (item.classList.contains("widget") && !event.target.closest(".drag-handle")) return;

  draggedItem = item;
  dragPointerId = event.pointerId;
  const rect = item.getBoundingClientRect();
  dragGhost = item.cloneNode(true);
  dragGhost.classList.add("drag-ghost");
  dragGhost.style.left = `${rect.left}px`;
  dragGhost.style.top = `${rect.top}px`;
  dragGhost.style.width = `${rect.width}px`;
  dragGhost.style.height = `${rect.height}px`;
  dragGhost.dataset.offsetX = String(event.clientX - rect.left);
  dragGhost.dataset.offsetY = String(event.clientY - rect.top);
  document.body.appendChild(dragGhost);
  item.classList.add("is-dragging");
  item.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function movePointerDrag(event) {
  if (!draggedItem || event.pointerId !== dragPointerId || !dragGhost) return;
  const offsetX = Number(dragGhost.dataset.offsetX);
  const offsetY = Number(dragGhost.dataset.offsetY);
  dragGhost.style.left = `${event.clientX - offsetX}px`;
  dragGhost.style.top = `${event.clientY - offsetY}px`;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".home-item:not(.add-shortcut):not(.is-dragging)");
  if (!target || target.parentElement !== elements.homeGrid) return;
  const targetRect = target.getBoundingClientRect();
  const insertAfter = event.clientY > targetRect.top + targetRect.height / 2 ||
    (Math.abs(event.clientY - (targetRect.top + targetRect.height / 2)) < targetRect.height / 3 && event.clientX > targetRect.left + targetRect.width / 2);
  elements.homeGrid.insertBefore(draggedItem, insertAfter ? target.nextSibling : target);
}

function endPointerDrag(event) {
  if (!draggedItem || (event.pointerId !== undefined && event.pointerId !== dragPointerId)) return;
  draggedItem.classList.remove("is-dragging");
  dragGhost?.remove();
  draggedItem = null;
  dragGhost = null;
  dragPointerId = null;
  saveCurrentOrder();
}

function openShortcutDialog(shortcutId = "") {
  const shortcut = state.shortcuts.find((item) => item.id === shortcutId);
  elements.shortcutForm.dataset.editId = shortcut?.id || "";
  elements.shortcutDialogTitle.textContent = shortcut ? "ショートカットを編集" : "ショートカットを追加";
  elements.shortcutName.value = shortcut?.name || "";
  elements.shortcutUrl.value = shortcut?.url || "";
  elements.shortcutColor.value = safeColor(shortcut?.color || "#0b57d0");
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
  const normalizedUrl = normalizeUrl(elements.shortcutUrl.value);
  const color = safeColor(elements.shortcutColor.value);
  if (!name || !normalizedUrl) {
    showToast("名前と正しいURLを入力してください");
    return;
  }

  const editId = elements.shortcutForm.dataset.editId;
  if (editId) {
    const shortcut = state.shortcuts.find((item) => item.id === editId);
    if (shortcut) Object.assign(shortcut, { name, url: normalizedUrl, color });
  } else {
    const id = `sc-${Date.now().toString(36)}`;
    state.shortcuts.push({ id, name, url: normalizedUrl, color });
    state.order.push(`shortcut:${id}`);
  }
  saveState();
  closeShortcutDialog();
  applyState();
  showToast(editId ? "ショートカットを更新しました" : "ショートカットを追加しました");
}

function deleteSelectedShortcut() {
  const id = elements.shortcutForm.dataset.editId;
  const shortcut = state.shortcuts.find((item) => item.id === id);
  if (!shortcut || !window.confirm(`「${shortcut.name}」を削除しますか？`)) return;
  state.shortcuts = state.shortcuts.filter((item) => item.id !== id);
  state.order = state.order.filter((token) => token !== `shortcut:${id}`);
  saveState();
  closeShortcutDialog();
  applyState();
  showToast("ショートカットを削除しました");
}

function normalizeUrl(input) {
  const candidate = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function faviconUrl(url) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`;
}

function firstCharacter(value) {
  return [...(value.trim() || "?")][0].toLocaleUpperCase("ja-JP");
}

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#0b57d0";
}

function handleSearchSubmit(event) {
  event.preventDefault();
  const selected = searchSuggestions[activeSuggestionIndex];
  performGoogleSearch(selected || elements.searchInput.value);
}

function performGoogleSearch(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return;
  window.location.href = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
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
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, { signal: suggestionRequest.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (elements.searchInput.value.trim() !== query) return;
    searchSuggestions = Array.isArray(data?.[1]) ? data[1].slice(0, 7) : [];
    renderSuggestions();
  } catch (error) {
    if (error.name !== "AbortError") {
      searchSuggestions = [];
      hideSuggestions();
    }
  }
}

function renderSuggestions() {
  elements.suggestions.replaceChildren();
  searchSuggestions.forEach((suggestion, index) => {
    const button = document.createElement("button");
    button.className = "suggestion-item";
    button.type = "button";
    button.role = "option";
    button.textContent = suggestion;
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => performGoogleSearch(suggestion));
    button.addEventListener("mouseenter", () => setActiveSuggestion(index, false));
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
  if (event.key === "Escape") {
    hideSuggestions();
    return;
  }
  if (!searchSuggestions.length || elements.suggestions.hidden) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const next = (activeSuggestionIndex + direction + searchSuggestions.length) % searchSuggestions.length;
    setActiveSuggestion(next, true);
  }
}

function setActiveSuggestion(index, copyToInput) {
  activeSuggestionIndex = index;
  [...elements.suggestions.children].forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex === index);
    item.setAttribute("aria-selected", String(itemIndex === index));
  });
  if (copyToInput && searchSuggestions[index]) elements.searchInput.value = searchSuggestions[index];
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
  const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: !state.clock.is24Hour };
  elements.clockTime.textContent = new Intl.DateTimeFormat("ja-JP", timeOptions).format(now);
  elements.clockDate.textContent = new Intl.DateTimeFormat("ja-JP", { month: "long", day: "numeric", weekday: "long" }).format(now);
  elements.todayLabel.textContent = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(now);

  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  elements.secondHand.style.transform = `rotate(${seconds * 6}deg)`;
  elements.minuteHand.style.transform = `rotate(${minutes * 6}deg)`;
  elements.hourHand.style.transform = `rotate(${hours * 30}deg)`;

  if (!timetableDayManuallySelected) {
    const automaticDayOffset = getInitialDayOffset();
    if (automaticDayOffset !== selectedDayOffset) {
      selectedDayOffset = automaticDayOffset;
      renderTimetable();
    }
  }
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

function getInitialDayOffset() {
  const now = new Date();
  const [hours, minutes] = (state?.timetable?.switchTime || "16:00").split(":").map(Number);
  return now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes) ? 1 : 0;
}

async function fetchTimetable(forceRefresh = false) {
  if (!state.timetable.enabled && !forceRefresh) return;
  elements.timetableMeta.textContent = "最新の時間割を取得中...";
  elements.timetableContent.innerHTML = '<div class="timetable-loading"><span></span><span></span><span></span></div>';
  elements.refreshTimetable.disabled = true;

  try {
    const response = await fetch(FIREBASE_URL, { cache: forceRefresh ? "reload" : "default" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || typeof data.schedules !== "object") throw new Error("時間割データの形式が正しくありません");
    timetableData = data;
    localStorage.setItem(TIMETABLE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
    renderTimetable();
    if (forceRefresh) showToast("時間割を更新しました");
  } catch (error) {
    const cached = readTimetableCache();
    if (cached) {
      timetableData = cached.data;
      renderTimetable(`オフライン表示・${formatCacheTime(cached.savedAt)}取得`);
    } else {
      elements.timetableMeta.textContent = "取得できませんでした";
      elements.timetableContent.innerHTML = '<div class="timetable-message">時間割の取得に失敗しました。右上の更新ボタンでもう一度お試しください。</div>';
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
  if (!elements.timetableContent || !state.timetable.enabled) return;
  document.querySelectorAll("[data-day-offset]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.dayOffset) === selectedDayOffset);
  });
  if (!timetableData?.schedules) return;

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

function syncSettingsControls() {
  const themeInput = elements.settingsForm.querySelector(`input[name="theme"][value="${state.theme}"]`);
  if (themeInput) themeInput.checked = true;
  elements.clockEnabled.checked = state.clock.enabled;
  elements.clockType.value = state.clock.type;
  elements.clock24Hour.checked = state.clock.is24Hour;
  elements.timetableEnabled.checked = state.timetable.enabled;
  elements.classSelect.value = state.timetable.className;
  elements.switchTime.value = state.timetable.switchTime;
}

function handleSettingsChange(event) {
  const target = event.target;
  if (target.name === "theme") state.theme = target.value;
  if (target.id === "clockEnabled") state.clock.enabled = target.checked;
  if (target.id === "clockType") state.clock.type = target.value;
  if (target.id === "clock24Hour") state.clock.is24Hour = target.checked;
  if (target.id === "timetableEnabled") state.timetable.enabled = target.checked;
  if (target.id === "classSelect") state.timetable.className = target.value;
  if (target.id === "switchTime") {
    state.timetable.switchTime = target.value || "16:00";
    timetableDayManuallySelected = false;
    selectedDayOffset = getInitialDayOffset();
  }
  saveState();
  applyState();
  if (target.id === "timetableEnabled" && target.checked && !timetableData) fetchTimetable();
}

function resetAllSettings() {
  if (!window.confirm("ショートカット、配置、テーマをすべて初期状態に戻しますか？")) return;
  state = defaultState();
  timetableDayManuallySelected = false;
  selectedDayOffset = getInitialDayOffset();
  saveState();
  applyState();
  showToast("初期状態に戻しました");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
