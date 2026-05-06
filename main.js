const LOCATION_DATA_PATH = "./data/world/location.json";
const BEING_DATA_PATH = "./data/world/being.json";
const DEFAULT_LOCATION_KEY = "luxona";

let worldData = [];
let beingData = [];
let currentRoute = { mode: "home" };

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw) {
    return { mode: "home" };
  }
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "location") {
    return { mode: "location", key: parts[1] ?? DEFAULT_LOCATION_KEY };
  }
  if (parts[0] === "being") {
    if (parts.length < 2) {
      return { mode: "being", key: null };
    }
    return { mode: "being", key: parts[1] };
  }
  return { mode: "home" };
}

function applyRoute(route) {
  currentRoute = route;
  if (route.mode === "home") {
    const base = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", base);
  } else if (route.mode === "location") {
    window.location.hash = `#location/${route.key}`;
  } else if (route.mode === "being") {
    if (route.key == null || route.key === "") {
      window.location.hash = "#being";
    } else {
      window.location.hash = `#being/${route.key}`;
    }
  }
}

function getLocationTextPath(lookup) {
  const key = lookup.selected?.key ?? "";
  const chainPath = lookup.pathKeys.join("/");
  return `./text/world/location/${chainPath}/${key}.txt`;
}

function getLocationImagePath(lookup) {
  const key = lookup.selected?.key ?? "";
  const chainPath = lookup.pathKeys.join("/");
  return `./img/world/location/${chainPath}/${key}.png`;
}

function getBeingTextCandidates(lookup) {
  const { level, category, race, subrace, pathKeys } = lookup;
  const chain = pathKeys.join("/");
  const base = "./text/world/being";
  if (level === "category") {
    return [
      `${base}/${category.key}.txt`,
      `${base}/${category.key}/${category.key}.txt`,
    ];
  }
  if (level === "subrace" && race && subrace) {
    return [
      `${base}/${category.key}/${race.key}/${subrace.key}.txt`,
      `${base}/${category.key}/${race.key}/${subrace.key}/${subrace.key}.txt`,
    ];
  }
  if (race) {
    return [
      `${base}/${category.key}/${race.key}.txt`,
      `${base}/${category.key}/${race.key}/${race.key}.txt`,
    ];
  }
  return [`${base}/${chain}.txt`];
}

function getBeingImageCandidates(lookup) {
  const { level, category, race, subrace, pathKeys } = lookup;
  const chain = pathKeys.join("/");
  const base = "./img/world/being";
  if (level === "category") {
    return [
      `${base}/${category.key}.png`,
      `${base}/${category.key}/${category.key}.png`,
    ];
  }
  if (level === "subrace" && race && subrace) {
    return [
      `${base}/${category.key}/${race.key}/${subrace.key}.png`,
      `${base}/${category.key}/${race.key}/${subrace.key}/${subrace.key}.png`,
    ];
  }
  if (race) {
    return [
      `${base}/${category.key}/${race.key}.png`,
      `${base}/${category.key}/${race.key}/${race.key}.png`,
    ];
  }
  return [`${base}/${chain}.png`];
}

async function loadBeingArticleText(lookup) {
  for (const path of getBeingTextCandidates(lookup)) {
    const text = await loadArticleText(path);
    if (text) {
      return text;
    }
  }
  return "";
}

async function loadBeingArticleImage(lookup) {
  for (const path of getBeingImageCandidates(lookup)) {
    const resolved = await loadArticleImagePath(path);
    if (resolved) {
      return resolved;
    }
  }
  return "";
}

async function loadArticleText(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return "";
    }
    const text = await response.text();
    return text.trim();
  } catch (_error) {
    return "";
  }
}

async function loadArticleImagePath(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return "";
    }
    return path;
  } catch (_error) {
    return "";
  }
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** When no .txt article exists, same placeholder for location and being pages. */
function articleBodyOrPlaceholder(articleText, displayName, routeKey) {
  const trimmed = String(articleText ?? "").trim();
  if (trimmed) {
    return trimmed;
  }
  const name = displayName || "Unknown";
  const key = routeKey ?? "";
  return `${name} is loaded by key: ${key}`;
}

function findLocationByKey(data, targetKey) {
  for (const world of data) {
    if (world.key === targetKey) {
      const footerItems = world.continent ?? [];
      return {
        selected: world,
        level: "world",
        parent: null,
        footerItems,
        pathKeys: [world.key],
      };
    }
    for (const continent of world.continent ?? []) {
      if (continent.key === targetKey) {
        const footerItems = continent.region ?? [];
        return {
          selected: continent,
          level: "continent",
          parent: world,
          footerItems,
          pathKeys: [world.key, continent.key],
        };
      }
      for (const region of continent.region ?? []) {
        if (region.key === targetKey) {
          const footerItems = region.zone ?? [];
          return {
            selected: region,
            level: "region",
            parent: continent,
            footerItems,
            pathKeys: [world.key, continent.key, region.key],
          };
        }
        for (const zone of region.zone ?? []) {
          if (zone.key === targetKey) {
            return {
              selected: zone,
              level: "zone",
              parent: region,
              footerItems: [],
              pathKeys: [world.key, continent.key, region.key, zone.key],
            };
          }
        }
      }
    }
  }
  return null;
}

function findBeingByKey(data, targetKey) {
  for (const category of data) {
    if (category.key === targetKey) {
      return {
        selected: category,
        level: "category",
        category,
        race: null,
        subrace: undefined,
        footerItems: category.race,
        pathKeys: [category.key],
      };
    }
    for (const race of category.race) {
      if (race.key === targetKey) {
        return {
          selected: race,
          level: "race",
          category,
          race,
          subrace: undefined,
          footerItems: category.race,
          pathKeys: [category.key, race.key],
        };
      }
      for (const subrace of race.subraces ?? []) {
        if (subrace.key === targetKey) {
          return {
            selected: subrace,
            level: "subrace",
            category,
            race,
            subrace,
            footerItems: category.race,
            pathKeys: [category.key, race.key, subrace.key],
          };
        }
      }
    }
  }
  return null;
}

function locationFooterLabel(level) {
  const map = {
    world: "Continents",
    continent: "Regions",
    region: "Zones",
    zone: "Sub-locations",
  };
  return map[level] || "Locations";
}

function homeCastleLinkHtml() {
  /* Tabler Icons MIT — building-castle: towers, gate arch, battlements line */
  return `<a href="#" class="wiki-top-home wiki-top-home--castle" data-go-home="1" aria-label="Home menu" title="Home menu"><span class="wiki-top-home-icon" aria-hidden="true"><svg class="wiki-top-castle-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M0 0h24v24H0z" fill="none" stroke="none"/><path d="M15 19v-2a3 3 0 0 0-6 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5h4v3h3V5h4v3h3V5h4v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M3 11h18"/></svg></span></a>`;
}

function buildLocationHeader(worlds, activeWorldKey) {
  const links = worlds
    .map((w) => {
      const active = w.key === activeWorldKey ? " is-active" : "";
      return `<a href="#" class="top-nav-link${active}" data-mode="location" data-key="${escapeHtml(w.key)}">${escapeHtml(w.name)}</a>`;
    })
    .join("");
  return `<header class="wiki-top-header"><div class="wiki-top-inner">${homeCastleLinkHtml()}<nav class="wiki-top-nav" aria-label="Worlds">${links}</nav></div></header>`;
}

function buildBeingHeader(categories, activeCategoryKey) {
  const links = categories
    .map((c) => {
      const active =
        activeCategoryKey != null &&
        activeCategoryKey !== "" &&
        c.key === activeCategoryKey
          ? " is-active"
          : "";
      return `<a href="#" class="top-nav-link${active}" data-mode="being" data-key="${escapeHtml(c.key)}">${escapeHtml(c.name)}</a>`;
    })
    .join("");
  return `<header class="wiki-top-header"><div class="wiki-top-inner">${homeCastleLinkHtml()}<nav class="wiki-top-nav" aria-label="Being categories">${links}</nav></div></header>`;
}

function getLocationTemplate(lookup, articleText, articleImagePath, headerHtml) {
  const selected = lookup.selected;
  const title = selected?.name ?? "Unknown";

  const locatedLine = lookup.parent
    ? `<span class="located-line"><a href="#" data-mode="location" data-key="${escapeHtml(lookup.parent.key)}">${escapeHtml(lookup.parent.name)}</a></span>`
    : lookup.level === "world"
      ? '<span class="located-line located-static">Universe</span>'
      : "-";

  const footerLinks = (lookup.footerItems ?? [])
    .map((item) => {
      const active = item.key === selected?.key ? ' class="active-link"' : "";
      return `<a${active} href="#" data-mode="location" data-key="${escapeHtml(item.key)}">${escapeHtml(item.name)}</a>`;
    })
    .join(" · ");
  const hasFooterItems = (lookup.footerItems ?? []).length > 0;
  const footerLevelLabel = locationFooterLabel(lookup.level);
  const introRaw = articleBodyOrPlaceholder(articleText, title, selected?.key ?? "");
  const introHtml = escapeHtml(introRaw).replaceAll("\n", "<br>");
  const imageHtml = articleImagePath
    ? `<img class="infobox-image" src="${escapeHtml(articleImagePath)}" alt="${escapeHtml(title)}" />`
    : "Image";

  return `
    ${headerHtml}
    <main class="page-wrap">
      <section class="article">
        <h1 id="location-title">${escapeHtml(title)}</h1>
        <div class="divider"></div>
        <p id="location-intro" class="intro">
          ${introHtml}
        </p>
      </section>

      <aside class="infobox" aria-label="Location information">
        <div class="infobox-title">${escapeHtml(title)}</div>
        <div class="infobox-image-placeholder">${imageHtml}</div>
        <dl class="infobox-list">
          <div class="info-row">
            <dt>Located</dt>
            <dd id="located-chain">${locatedLine}</dd>
          </div>
        </dl>
      </aside>
    </main>

    ${
      hasFooterItems
        ? `
      <footer class="zone-footer">
        <div class="footer-level">${escapeHtml(footerLevelLabel)}</div>
        <nav id="footer-nav">${footerLinks}</nav>
      </footer>
    `
        : ""
    }
  `;
}

function subraceInfoboxLinksHtml(subraces, activeKey) {
  return `<div class="subrace-stack">${subraces
    .map((s) => {
      const active = s.key === activeKey ? " subrace-stack-link--active" : "";
      return `<a class="subrace-stack-link${active}" href="#" data-mode="being" data-key="${escapeHtml(s.key)}">${escapeHtml(s.name)}</a>`;
    })
    .join("")}</div>`;
}

function getBeingTemplate(lookup, articleText, articleImagePath, headerHtml) {
  const selected = lookup.selected;
  const title = selected?.name ?? "Unknown";
  const categoryName = lookup.category.name;
  const categoryKey = lookup.category.key;

  const introRaw = articleBodyOrPlaceholder(articleText, title, selected?.key ?? "");
  const introHtml = escapeHtml(introRaw).replaceAll("\n", "<br>");
  const imageHtml = articleImagePath
    ? `<img class="infobox-image" src="${escapeHtml(articleImagePath)}" alt="${escapeHtml(title)}" />`
    : "Image";

  let infoboxRows = "";

  if (lookup.level === "category") {
    infoboxRows = `
          <div class="info-row">
            <dt>Type</dt>
            <dd><a href="#" data-mode="being" data-key="${escapeHtml(categoryKey)}">${escapeHtml(categoryName)}</a></dd>
          </div>`;
  } else {
    infoboxRows = `
          <div class="info-row">
            <dt>Type</dt>
            <dd><a href="#" data-mode="being" data-key="${escapeHtml(categoryKey)}">${escapeHtml(categoryName)}</a></dd>
          </div>`;

    if (lookup.level === "subrace" && lookup.race) {
      infoboxRows += `
          <div class="info-row">
            <dt>Race</dt>
            <dd><a href="#" data-mode="being" data-key="${escapeHtml(lookup.race.key)}">${escapeHtml(lookup.race.name)}</a></dd>
          </div>`;
    }

    const subraces = lookup.race?.subraces;
    if (subraces?.length && lookup.level === "race") {
      infoboxRows += `
          <div class="info-row">
            <dt>Subraces</dt>
            <dd class="subrace-dd">${subraceInfoboxLinksHtml(subraces, "")}</dd>
          </div>`;
    }
  }

  let footerTitle = categoryName;
  let footerLinks = "";

  if (lookup.level === "subrace" && lookup.race?.subraces?.length) {
    footerTitle = lookup.race.name;
    footerLinks = lookup.race.subraces
      .map((s) => {
        const active = lookup.subrace?.key === s.key ? ' class="active-link"' : "";
        return `<a${active} href="#" data-mode="being" data-key="${escapeHtml(s.key)}">${escapeHtml(s.name)}</a>`;
      })
      .join(" · ");
  } else {
    footerLinks = lookup.footerItems
      .map((race) => {
        const active = race.key === selected?.key ? ' class="active-link"' : "";
        return `<a${active} href="#" data-mode="being" data-key="${escapeHtml(race.key)}">${escapeHtml(race.name)}</a>`;
      })
      .join(" · ");
  }

  const hasFooter =
    lookup.level === "subrace" && lookup.race?.subraces?.length
      ? true
      : lookup.footerItems.length > 0;

  return `
    ${headerHtml}
    <main class="page-wrap">
      <section class="article">
        <h1 id="being-title">${escapeHtml(title)}</h1>
        <div class="divider"></div>
        <p id="being-intro" class="intro">
          ${introHtml}
        </p>
      </section>

      <aside class="infobox" aria-label="Being information">
        <div class="infobox-title">${escapeHtml(title)}</div>
        <div class="infobox-image-placeholder">${imageHtml}</div>
        <dl class="infobox-list">
          ${infoboxRows}
        </dl>
      </aside>
    </main>

    ${
      hasFooter
        ? `
      <footer class="zone-footer">
        <div class="footer-level">${escapeHtml(footerTitle)}</div>
        <nav id="footer-nav">${footerLinks}</nav>
      </footer>
    `
        : ""
    }
  `;
}

function getHomeTemplate() {
  return `
    <div class="game-menu-screen">
      <div class="game-menu-frame">
        <div class="game-menu-ornament game-menu-ornament--tl"></div>
        <div class="game-menu-ornament game-menu-ornament--tr"></div>
        <div class="game-menu-ornament game-menu-ornament--bl"></div>
        <div class="game-menu-ornament game-menu-ornament--br"></div>
        <nav class="game-menu-nav" aria-label="Menu">
          <button type="button" class="game-menu-btn" data-open="location">Locations</button>
          <button type="button" class="game-menu-btn" data-open="being">Beings</button>
        </nav>
      </div>
    </div>
  `;
}

async function render() {
  const root = document.getElementById("content");
  if (!root) {
    return;
  }

  currentRoute = parseHash();

  if (currentRoute.mode === "home") {
    root.innerHTML = getHomeTemplate();
    return;
  }

  if (currentRoute.mode === "location") {
    const lookup =
      findLocationByKey(worldData, currentRoute.key) ??
      findLocationByKey(worldData, DEFAULT_LOCATION_KEY);
    if (!lookup) {
      root.innerHTML = "<p>Failed to load locations.</p>";
      return;
    }
    const activeWorldKey = lookup.pathKeys[0] ?? DEFAULT_LOCATION_KEY;
    const headerHtml = buildLocationHeader(worldData, activeWorldKey);
    const textPath = getLocationTextPath(lookup);
    const imagePath = getLocationImagePath(lookup);
    const articleText = await loadArticleText(textPath);
    const articleImagePath = await loadArticleImagePath(imagePath);
    root.innerHTML = getLocationTemplate(lookup, articleText, articleImagePath, headerHtml);
    return;
  }

  if (currentRoute.mode === "being") {
    if (currentRoute.key == null || currentRoute.key === "") {
      const headerHtml = buildBeingHeader(beingData, null);
      root.innerHTML = `${headerHtml}<main class="being-menu-only"></main>`;
      return;
    }

    const beingLookup = findBeingByKey(beingData, currentRoute.key);
    if (!beingLookup) {
      root.innerHTML = "<p>Unknown being.</p>";
      return;
    }
    const headerHtml = buildBeingHeader(beingData, beingLookup.category.key);
    const articleText = await loadBeingArticleText(beingLookup);
    const articleImagePath = await loadBeingArticleImage(beingLookup);
    root.innerHTML = getBeingTemplate(beingLookup, articleText, articleImagePath, headerHtml);
    return;
  }

  root.innerHTML = "<p>Invalid page.</p>";
}

function bindNavigation() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.closest && target.closest("[data-go-home]")) {
      event.preventDefault();
      applyRoute({ mode: "home" });
      void render();
      return;
    }

    const menuBtn = target && target.closest ? target.closest("[data-open]") : null;
    if (menuBtn) {
      const open = menuBtn.getAttribute("data-open");
      event.preventDefault();
      if (open === "location") {
        applyRoute({ mode: "location", key: DEFAULT_LOCATION_KEY });
      } else if (open === "being") {
        applyRoute({ mode: "being", key: null });
      }
      void render();
      return;
    }

    const link = target && target.closest ? target.closest("[data-mode][data-key]") : null;
    if (link) {
      const mode = link.getAttribute("data-mode");
      const key = link.getAttribute("data-key");
      if (!mode || !key) {
        return;
      }
      event.preventDefault();
      if (mode === "location") {
        applyRoute({ mode: "location", key });
      } else {
        applyRoute({ mode: "being", key });
      }
      void render();
    }
  });

  window.addEventListener("hashchange", () => {
    void render();
  });
}

async function init() {
  const [locRes, beingRes] = await Promise.all([
    fetch(LOCATION_DATA_PATH),
    fetch(BEING_DATA_PATH),
  ]);
  worldData = await locRes.json();
  beingData = await beingRes.json();

  bindNavigation();
  await render();
}

init().catch((error) => {
  const root = document.getElementById("content");
  if (root) {
    root.innerHTML = "<p>Failed to load data.</p>";
  }
  console.error(error);
});
