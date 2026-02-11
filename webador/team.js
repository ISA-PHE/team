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

  function setStatus(root, msg) {
    const box = root.querySelector("#hbeTeamGrid");
    if (box) box.innerHTML = '<div class="hbe-team__loading">' + esc(msg) + "</div>";
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
    if (!res.ok) throw new Error("HTTP " + res.status + " for " + DATA_URL);
    const data = await res.json();
    if (!data || !Array.isArray(data.items)) throw new Error("JSON missing items[]");
    return data.items;
  }

  function mount(root) {
    const grid = root.querySelector("#hbeTeamGrid");
    const foot = root.querySelector("#hbeTeamFoot");
    const pills = Array.from(root.querySelectorAll(".hbe-team__pill"));
    if (!grid) throw new Error("Missing #hbeTeamGrid");
    if (!foot) throw new Error("Missing #hbeTeamFoot");
    return { root, grid, foot, pills };
  }

  function render(m, allItems) {
    const items = sortItems(allItems);

    if (!items.length) {
      m.grid.innerHTML = '<div class="hbe-team__loading">No team members in JSON.</div>';
      m.foot.textContent = "";
      return;
    }

    m.grid.innerHTML = items.map(item => {
      const name = esc(item.name || "");
      const category = esc(item.category || "");
      const roles = Array.isArray(item.roles) ? item.roles.map(esc) : [];
      const purpose = esc(item.purpose || "");
      const img = item.image ? esc(item.image) : "";

      const url = esc(item.url || "");
      const cta = esc(item.cta || "Profile");
      const target = (() => {
        try {
          return url && new URL(url, location.href).hostname !== location.hostname
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
          (url ? '<a class="hbe-team__cta" href="' + url + '"' + target + '>' + cta + '</a>' : '') +
        '</div>'
      );
    }).join("");

    m.foot.textContent = "Showing " + items.length + " member" + (items.length === 1 ? "" : "s") + ".";
  }

  async function initWhenReady() {
    const start = Date.now();

    while (Date.now() - start < MAX_WAIT_MS) {
      const root = document.getElementById(ROOT_ID);
      if (root) {
        try {
          setStatus(root, "Found component. Loading data…");
          const m = mount(root);

          let items = [];
          try {
            items = await loadItems();
          } catch (e) {
            setStatus(root, "Data error: " + (e && e.message ? e.message : e));
            return;
          }

          setStatus(root, "Rendering " + items.length + " members…");
          render(m, items);
          return;

        } catch (e) {
          setStatus(root, "Mount error: " + (e && e.message ? e.message : e));
          return;
        }
      }
      await new Promise(r => setTimeout(r, POLL_MS));
    }

    // Timed out waiting for root
    const fallback = document.querySelector("#" + ROOT_ID + " #hbeTeamGrid");
    if (fallback) {
      fallback.innerHTML = '<div class="hbe-team__loading">Timeout: cannot find #' + esc(ROOT_ID) + '.</div>';
    }
  }

  initWhenReady();
})();
