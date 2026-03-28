
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authStatus = document.getElementById("authStatus");
const loginMsg = document.getElementById("loginMsg");
const formMsg = document.getElementById("formMsg");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const resetBtn = document.getElementById("resetBtn");

const titoloInput = document.getElementById("titolo");
const prezzoInput = document.getElementById("prezzo");
const ubicazioneInput = document.getElementById("ubicazione");
const categoriaInput = document.getElementById("categoria");
const taglineInput = document.getElementById("tagline");
const descrizioneInput = document.getElementById("descrizione");
const immaginiInput = document.getElementById("immagini");
const inEvidenzaInput = document.getElementById("inEvidenza");
const immobileForm = document.getElementById("immobileForm");

const previewImage = document.getElementById("previewImage");
const previewTitolo = document.getElementById("previewTitolo");
const previewPrezzo = document.getElementById("previewPrezzo");
const previewTagline = document.getElementById("previewTagline");
const previewDescrizione = document.getElementById("previewDescrizione");
const previewUbicazione = document.getElementById("previewUbicazione");
const previewCount = document.getElementById("previewCount");
const thumbStrip = document.getElementById("thumbStrip");

function slugify(text) {
  return (text || "immobile")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function setAuthLabel(isLogged) {
  authStatus.textContent = isLogged ? "Autenticata" : "Non autenticata";
}

async function refreshSessionUI() {
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error(error);
    setAuthLabel(false);
    return;
  }
  setAuthLabel(!!data.session);
}

function updatePreview() {
  previewTitolo.textContent = titoloInput.value.trim() || "Titolo immobile";
  previewPrezzo.textContent = prezzoInput.value.trim() || "€ 0";
  previewTagline.textContent = taglineInput.value.trim() || "Parola ad effetto";
  previewDescrizione.textContent = descrizioneInput.value.trim() || "La descrizione dell’immobile comparirà qui in anteprima prima della pubblicazione.";
  previewUbicazione.textContent = "📍 " + (ubicazioneInput.value.trim() || "Ubicazione immobile");
}

function renderThumbs(files = []) {
  thumbStrip.innerHTML = "";
  previewCount.textContent = `${files.length} foto selezionate`;
  if (!files.length) return;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement("img");
      img.src = e.target.result;
      img.alt = `Foto ${index + 1}`;
      thumbStrip.appendChild(img);
      if (index === 0) previewImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

[titoloInput, prezzoInput, ubicazioneInput, taglineInput, descrizioneInput].forEach(el => {
  el.addEventListener("input", updatePreview);
});

immaginiInput.addEventListener("change", () => {
  renderThumbs(Array.from(immaginiInput.files || []));
});

loginBtn.addEventListener("click", async () => {
  loginMsg.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    loginMsg.textContent = "Inserisci email e password.";
    return;
  }

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(error);
    loginMsg.textContent = error.message;
    return;
  }

  loginMsg.textContent = "Login effettuato con successo.";
  await refreshSessionUI();
});

logoutBtn.addEventListener("click", async () => {
  loginMsg.textContent = "";
  const { error } = await client.auth.signOut();
  if (error) {
    console.error(error);
    loginMsg.textContent = error.message;
    return;
  }
  loginMsg.textContent = "Logout effettuato.";
  await refreshSessionUI();
});

resetBtn.addEventListener("click", () => {
  immobileForm.reset();
  previewImage.src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80";
  thumbStrip.innerHTML = "";
  previewCount.textContent = "0 foto selezionate";
  updatePreview();
  formMsg.textContent = "";
});

immobileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMsg.textContent = "";

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    formMsg.textContent = sessionError.message;
    return;
  }
  if (!sessionData.session) {
    formMsg.textContent = "Devi prima effettuare il login admin.";
    return;
  }

  const files = Array.from(immaginiInput.files || []);
  if (!files.length) {
    formMsg.textContent = "Seleziona almeno una foto.";
    return;
  }

  const slugBase = `${slugify(titoloInput.value)}-${Date.now()}`;
  const galleryUrls = [];

  for (const file of files) {
    const safeName = file.name.toLowerCase().replace(/\s+/g, "-");
    const filePath = `annunci/${slugBase}/${safeName}`;
    const { error: uploadError } = await client.storage.from("immobili").upload(filePath, file, { upsert: false });
    if (uploadError) {
      console.error(uploadError);
      formMsg.textContent = uploadError.message;
      return;
    }
    const { data } = client.storage.from("immobili").getPublicUrl(filePath);
    galleryUrls.push(data.publicUrl);
  }

  const payload = {
    slug: slugBase,
    titolo: titoloInput.value.trim(),
    prezzo: prezzoInput.value.trim(),
    ubicazione: ubicazioneInput.value.trim(),
    categoria: categoriaInput.value,
    tagline: taglineInput.value.trim(),
    descrizione: descrizioneInput.value.trim(),
    immagine_url: galleryUrls[0],
    galleria: galleryUrls,
    in_evidenza: inEvidenzaInput.checked
  };

  const { error: insertError } = await client.from("immobili").insert([payload]);
  if (insertError) {
    console.error(insertError);
    formMsg.textContent = insertError.message;
    return;
  }

  formMsg.textContent = "Immobile pubblicato con successo.";
  immobileForm.reset();
  previewImage.src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80";
  thumbStrip.innerHTML = "";
  previewCount.textContent = "0 foto selezionate";
  updatePreview();
});

client.auth.onAuthStateChange((_event, session) => {
  setAuthLabel(!!session);
});

updatePreview();
refreshSessionUI();
