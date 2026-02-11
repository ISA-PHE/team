(function () {
  const DATA_URL = "https://isa-phe.github.io/team/team.json";
  const ROOT_ID = "hbe-team";
  const MAX_WAIT_MS = 15000;
  const POLL_MS = 150;

  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function sortItems(items) {
    return items.slice().sort((a, b) => {
      const af = a.featured ? 1 : 0;
      const bf = b.featured ? 1 : 0;
      if (af !== bf) return bf - af;

      const ao = typeof a.order === "number" ? a.order : 999999;
      const bo = typeof b.order === "number" ? b.order : 999999;
      if (ao !== bo) return ao - bo;

      const an = String(a.name || "").toLowerCase();
      const bn = String(b.name || "").toLowerCase();
      return an.localeCompare(bn);
    });
  }

  async function loadItems() {
    const bust = (DATA_URL.includes("?") ? "&" : "?") + "v=" + Date.now();
    const res = await fetch(DATA_URL + bust, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  }

  function mount(root) {
    const grid = root.querySelector("#hbeTeamGrid");
    const foot = root.querySelector("#hbeTeamFoot");
    const pills = Array.from(root.querySelectorAll(".hbe-team__pill"));
    if (!grid || !foot) return null;
    return { root, grid, foot, pills };
  }

  function uniqueCategories(items) {
    const s = new Set();
    items.forEach(it => { if (it.category) s.add(String(it.category)); });
    return Array.from(s);
  }

  function ensureFilterUI(m, allItems) {
    const cats = uniqueCategories(allItems);

    const filters = m.root.querySelector(".hbe-team__filters");
    if (!filters) return;

    if (!cats.length) {
      filters.style.display = "none";
      return;
    }

    // If pills are already present in HTML, do nothing.
    if (m.pills && m.pills.length) return;

    filters.innerHTML =
      '<button class="hbe-team__pill is-active" type="button" data-cat="__all" role="tab" aria-selected="true">All</button>' +
      cats.map(c => '<button class="hbe-team__pill" type="button" data-cat="' + esc(c) + '" role="tab" aria-selected="false">' + esc(c) + '</button>').join("");

    m.pills = Array.from(m.root.querySelectorAll(".hbe-team__pill"));
  }

  function render(m, allItems, activeCat) {
    const filtered = activeCat === "__all"
      ? allItems
      : allItems.filter(x => String(x.category || "") === String(activeCat));

    const items = sortItems(filtered);

    if (!items.length) {
      m.grid.innerHTML = '<div class="hbe-team__loading">No team members found.</div>';
      m.foot.textContent = "";
      return;
    }

    m.grid.innerHTML = items.map(item => {
      const name = esc(item.name || "");
      const category = esc(item.category || "");
      const roles = Array.isArray(item.roles) ? item.roles.map(esc) : [];
      const purpose = esc(item.purpose || "");
      const img = item.image ? esc(item.image) : "";

      const url = esc(item.url || "#");
      const cta = esc(item.cta || "Profile");
      const target = (() => {
        try {
          return new URL(item.url || "", location.href).hostname !== location.hostname
            ? ' target="_blank" rel="noopener noreferrer"'
            : '';
        } catch {
          return '';
        }
      })();

      const rolesHtml = roles.length
        ? (
            '<div class="hbe-team__chips">' +
              roles.map(r => '<span class="hbe-team__chip">' + r + '</span>').join("") +
            '</div>'
          )
        : "";

      return (
        '<div class="hbe-team__card">' +
          (category ? '<div class="hbe-team__meta"><div class="hbe-team__cat">' + category + '</div></div>' : '') +

          '<div class="hbe-team__row">' +
            (img ? '<img class="hbe-team__img" src="' + img + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' : '') +
            '<div class="hbe-team__body">' +
              '<div class="hbe-team__name">' + name + '</div>' +
              rolesHtml +
            '</div>' +
          '</div>' +

          (purpose ? '<div class="hbe-team__purpose">' + purpose + '</div>' : '') +

          (item.url ? '<a class="hbe-team__cta" href="' + url + '"' + target + '>' + cta + '</a>' : '') +
        '</div>'
      );
    }).join("");

    m.foot.textContent = "Showing " + items.length + " member" + (items.length === 1 ? "" : "s") + ".";
  }

  function setActive(m, allItems, cat) {
    if (!m.pills || !m.pills.length) {
      render(m, allItems, "__all");
      return;
    }

    m.pills.forEach(btn => {
      const on = btn.dataset.cat === cat;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });

    render(m, allItems, cat);
  }

  async function initWhenReady() {
    const start = Date.now();

    while (Date.now() - start < MAX_WAIT_MS) {
      const root = document.getElementById(ROOT_ID);
      if (root) {
        const m = mount(root);
        if (!m) return;

        m.grid.innerHTML = '<div class="hbe-team__loading">Loading…</div>';
        m.foot.textContent = "";

        let allItems = [];
        try {
          allItems = await loadItems();
        } catch (e) {
          m.grid.innerHTML = '<div class="hbe-team__loading">Data unavailable. Please refresh.</div>';
          return;
        }

        ensureFilterUI(m, allItems);

        if (m.pills && m.pills.length) {
          m.pills.forEach(btn => {
            btn.addEventListener("click", function () {
              setActive(m, allItems, btn.dataset.cat);
            });
          });
        }

        setActive(m, allItems, "__all");
        return;
      }
      await new Promise(r => setTimeout(r, POLL_MS));
    }
  }

  initWhenReady();
})();
