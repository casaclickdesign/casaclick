
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function euroValue(prezzo) {
  return prezzo || "Prezzo su richiesta";
}

function safeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
  }
  return [];
}

function getMainImage(item) {
  const gallery = safeArray(item.galleria);
  return item.immagine_url || gallery[0] || "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80";
}

function favoriteSlugs() {
  try {
    return JSON.parse(localStorage.getItem("casaclick_favorites") || "[]");
  } catch {
    return [];
  }
}

function saveFavoriteSlugs(slugs) {
  localStorage.setItem("casaclick_favorites", JSON.stringify(slugs));
}

function isFavorite(slug) {
  return favoriteSlugs().includes(slug);
}

function toggleFavorite(slug) {
  const favorites = favoriteSlugs();
  const next = favorites.includes(slug)
    ? favorites.filter(x => x !== slug)
    : [...favorites, slug];
  saveFavoriteSlugs(next);
  return next.includes(slug);
}

function propertyCard(item, {detailHref = `immobile.html?slug=${encodeURIComponent(item.slug)}`, showFavorite = true, mapMode = false} = {}) {
  const favActive = isFavorite(item.slug);
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.ubicazione || "")}`;
  return `
    <article class="card property-card">
      <img src="${getMainImage(item)}" alt="${item.titolo || "Immobile"}">
      <div class="property-body">
        <div class="property-top">
          <h3 class="property-title">${item.titolo || "Immobile"}</h3>
          <div class="property-price">${euroValue(item.prezzo)}</div>
        </div>
        <div class="property-tag">${item.tagline || (item.categoria === "affitto" ? "Affitto" : "Vendita")}</div>
        <p class="property-desc">${item.descrizione || ""}</p>
        <p class="property-location">📍 ${item.ubicazione || "Ubicazione non disponibile"}</p>
        <div class="property-actions">
          <a class="btn" href="${detailHref}">Guarda altre foto</a>
          ${mapMode ? `<a class="ghost-btn" href="${mapLink}" target="_blank" rel="noopener">Apri mappa</a>` : ""}
          ${showFavorite ? `<button class="fav-btn" type="button" data-favorite="${item.slug}">${favActive ? "★ Salvato" : "☆ Preferiti"}</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

async function fetchProperties({ category, featuredOnly = false, slug, page = 1, pageSize = 9 } = {}) {
  let query = supabaseClient
    .from("immobili")
    .select("titolo, prezzo, ubicazione, categoria, tagline, descrizione, immagine_url, galleria, in_evidenza, slug, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (category) query = query.eq("categoria", category);
  if (featuredOnly) query = query.eq("in_evidenza", true);
  if (slug) query = query.eq("slug", slug);
  if (!slug) query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
}

function attachFavoriteEvents(scope = document) {
  scope.querySelectorAll("[data-favorite]").forEach(btn => {
    btn.onclick = () => {
      const active = toggleFavorite(btn.dataset.favorite);
      btn.textContent = active ? "★ Salvato" : "☆ Preferiti";
    };
  });
}

function highlightNav() {
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav a[data-page]").forEach(link => {
    if (link.dataset.page === page) link.classList.add("active");
  });
}

async function renderFeaturedHome() {
  const grid = document.getElementById("featuredGrid");
  if (!grid) return;
  try {
    let { data } = await fetchProperties({ featuredOnly: true, pageSize: 3 });
    if (!data.length) {
      const latest = await fetchProperties({ pageSize: 3 });
      data = latest.data;
    }
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state">Nessun immobile pubblicato. Usa la pagina admin per aggiungere i primi annunci.</div>`;
      return;
    }
    grid.innerHTML = data.slice(0, 3).map(item => propertyCard(item)).join("");
    attachFavoriteEvents(grid);
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">Errore nel caricamento degli immobili: ${error.message}</div>`;
  }
}

function categoryLabel(value) {
  if (value === "affitto") return "Immobili in affitto";
  if (value === "vendita") return "Immobili in vendita";
  return "Tutti gli immobili";
}

async function renderListPage() {
  const grid = document.getElementById("listGrid");
  if (!grid) return;
  const pagination = document.getElementById("pagination");
  const title = document.getElementById("listTitle");
  const intro = document.getElementById("listIntro");
  const params = new URLSearchParams(location.search);
  const category = params.get("categoria") || "";
  const q = (params.get("q") || "").trim().toLowerCase();
  const page = Number(params.get("page") || "1");
  const pageSize = 9;

  if (title) title.textContent = categoryLabel(category);
  if (intro) intro.textContent = category ? `Stai guardando solo gli annunci della categoria ${category}.` : "Sfoglia tutti gli immobili pubblicati, con paginazione e dettaglio completo.";

  try {
    const { data, count } = await fetchProperties({ category, page, pageSize });
    let rows = data;
    if (q) {
      rows = rows.filter(item =>
        [item.titolo, item.ubicazione, item.descrizione, item.tagline].join(" ").toLowerCase().includes(q)
      );
    }

    if (!rows.length) {
      grid.innerHTML = `<div class="empty-state">Nessun immobile trovato per questa pagina o filtro.</div>`;
      if (pagination) pagination.innerHTML = "";
      return;
    }

    grid.innerHTML = rows.map(item => propertyCard(item)).join("");
    attachFavoriteEvents(grid);

    if (pagination) {
      const totalPages = Math.max(1, Math.ceil(count / pageSize));
      const prevPage = Math.max(1, page - 1);
      const nextPage = Math.min(totalPages, page + 1);
      const base = `immobili.html?${new URLSearchParams({ ...(category ? { categoria: category } : {}), ...(q ? { q } : {}) }).toString()}`;
      pagination.innerHTML = `
        <button ${page <= 1 ? "disabled" : ""} onclick="location.href='${base}${base.includes('?') && base.length > 14 ? '&' : '?'}page=${prevPage}'">← Pagina precedente</button>
        <span class="badge">Pagina ${page} di ${totalPages}</span>
        <button ${page >= totalPages ? "disabled" : ""} onclick="location.href='${base}${base.includes('?') && base.length > 14 ? '&' : '?'}page=${nextPage}'">Pagina successiva →</button>
      `;
    }
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">Errore nel caricamento degli immobili: ${error.message}</div>`;
  }
}

async function renderDetailPage() {
  const box = document.getElementById("detailPage");
  if (!box) return;
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) {
    box.innerHTML = `<div class="empty-state">Immobile non trovato: manca lo slug.</div>`;
    return;
  }

  try {
    const { data } = await fetchProperties({ slug });
    const item = data[0];
    if (!item) {
      box.innerHTML = `<div class="empty-state">Immobile non trovato.</div>`;
      return;
    }

    const gallery = [getMainImage(item), ...safeArray(item.galleria).filter(url => url !== item.immagine_url)];
    box.innerHTML = `
      <div class="detail-layout">
        <div class="panel">
          <div class="gallery-main"><img id="detailMainImage" src="${gallery[0]}" alt="${item.titolo}"></div>
          <div class="gallery-thumbs">
            ${gallery.map((url, index) => `
              <button type="button" data-gallery-src="${url}">
                <img src="${url}" alt="Foto ${index + 1}" class="${index === 0 ? "active" : ""}">
              </button>
            `).join("")}
          </div>
        </div>

        <div class="panel">
          <span class="badge">${item.categoria === "affitto" ? "Affitto" : "Vendita"}</span>
          <h1 style="color:#24486b;margin:14px 0 10px;">${item.titolo}</h1>
          <div style="font-size:32px;font-weight:700;color:#0f172a;margin-bottom:10px;">${euroValue(item.prezzo)}</div>
          <div class="property-tag">${item.tagline || ""}</div>
          <p style="color:#334155;line-height:1.65;">${item.descrizione || ""}</p>
          <div class="meta-list">
            <div class="meta-item"><strong>Ubicazione:</strong> ${item.ubicazione || "-"}</div>
            <div class="meta-item"><strong>Categoria:</strong> ${item.categoria || "-"}</div>
            <div class="meta-item"><strong>Numero foto:</strong> ${gallery.length}</div>
          </div>
          <div class="property-actions" style="margin-top:16px;">
            <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.ubicazione || "")}" target="_blank" rel="noopener">Apri in mappa</a>
            <button class="fav-btn" type="button" data-favorite="${item.slug}">${isFavorite(item.slug) ? "★ Salvato" : "☆ Preferiti"}</button>
            <a class="ghost-btn" href="immobili.html?categoria=${encodeURIComponent(item.categoria || "")}">Torna agli immobili</a>
          </div>
        </div>
      </div>
    `;

    box.querySelectorAll("[data-gallery-src]").forEach(btn => {
      btn.addEventListener("click", () => {
        box.querySelector("#detailMainImage").src = btn.dataset.gallerySrc;
        box.querySelectorAll(".gallery-thumbs img").forEach(img => img.classList.remove("active"));
        btn.querySelector("img").classList.add("active");
      });
    });
    attachFavoriteEvents(box);
  } catch (error) {
    box.innerHTML = `<div class="empty-state">Errore nel caricamento del dettaglio: ${error.message}</div>`;
  }
}

async function renderFavoritesPage() {
  const grid = document.getElementById("favoritesGrid");
  if (!grid) return;
  const slugs = favoriteSlugs();
  if (!slugs.length) {
    grid.innerHTML = `<div class="empty-state">Non hai ancora salvato immobili nei preferiti.</div>`;
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("immobili")
      .select("titolo, prezzo, ubicazione, categoria, tagline, descrizione, immagine_url, galleria, in_evidenza, slug, created_at")
      .in("slug", slugs)
      .order("created_at", { ascending: false });

    if (error) throw error;
    grid.innerHTML = (data || []).map(item => propertyCard(item)).join("");
    attachFavoriteEvents(grid);
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">Errore nel caricamento dei preferiti: ${error.message}</div>`;
  }
}

async function renderMapPage() {
  const grid = document.getElementById("mapGrid");
  if (!grid) return;
  try {
    const { data } = await fetchProperties({ page: 1, pageSize: 50 });
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state">Non ci sono immobili da mostrare nella mappa.</div>`;
      return;
    }
    grid.innerHTML = data.map(item => propertyCard(item, { mapMode: true })).join("");
    attachFavoriteEvents(grid);
  } catch (error) {
    grid.innerHTML = `<div class="empty-state">Errore nel caricamento della mappa: ${error.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  highlightNav();
  renderFeaturedHome();
  renderListPage();
  renderDetailPage();
  renderFavoritesPage();
  renderMapPage();
});
