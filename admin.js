const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authStatus = document.getElementById("authStatus");
const loginMsg = document.getElementById("loginMsg");
const formMsg = document.getElementById("formMsg");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const resetBtn = document.getElementById("resetBtn");

const immobileForm = document.getElementById("immobileForm");

const titoloInput = document.getElementById("titolo");
const prezzoInput = document.getElementById("prezzo");
const ubicazioneInput = document.getElementById("ubicazione");
const categoriaInput = document.getElementById("categoria");
const taglineInput = document.getElementById("tagline");
const descrizioneInput = document.getElementById("descrizione");
const immagineInput = document.getElementById("immagine");
const inEvidenzaInput = document.getElementById("inEvidenza");

const previewImage = document.getElementById("previewImage");
const previewTitolo = document.getElementById("previewTitolo");
const previewPrezzo = document.getElementById("previewPrezzo");
const previewTagline = document.getElementById("previewTagline");
const previewDescrizione = document.getElementById("previewDescrizione");
const previewUbicazione = document.getElementById("previewUbicazione");

function updatePreview() {
  if (previewTitolo) {
    previewTitolo.textContent = titoloInput.value.trim() || "Titolo immobile";
  }

  if (previewPrezzo) {
    previewPrezzo.textContent = prezzoInput.value.trim() || "€ 0";
  }

  if (previewTagline) {
    previewTagline.textContent = taglineInput.value.trim() || "PAROLA AD EFFETTO";
  }

  if (previewDescrizione) {
    previewDescrizione.textContent =
      descrizioneInput.value.trim() ||
      "La descrizione dell’immobile comparirà qui in anteprima prima della pubblicazione.";
  }

  if (previewUbicazione) {
    previewUbicazione.textContent =
      "📍 " + (ubicazioneInput.value.trim() || "Ubicazione immobile");
  }
}

function setAuthLabel(isLogged) {
  if (!authStatus) return;
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

if (titoloInput) titoloInput.addEventListener("input", updatePreview);
if (prezzoInput) prezzoInput.addEventListener("input", updatePreview);
if (ubicazioneInput) ubicazioneInput.addEventListener("input", updatePreview);
if (taglineInput) taglineInput.addEventListener("input", updatePreview);
if (descrizioneInput) descrizioneInput.addEventListener("input", updatePreview);

if (immagineInput) {
  immagineInput.addEventListener("change", () => {
    const file = immagineInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImage) previewImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    loginMsg.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      loginMsg.textContent = "Inserisci email e password.";
      return;
    }

    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Errore login:", error);
      loginMsg.textContent = error.message;
      return;
    }

    loginMsg.textContent = "Login effettuato con successo.";
    await refreshSessionUI();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    loginMsg.textContent = "";

    const { error } = await client.auth.signOut();

    if (error) {
      console.error("Errore logout:", error);
      loginMsg.textContent = error.message;
      return;
    }

    loginMsg.textContent = "Logout effettuato.";
    await refreshSessionUI();
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (immobileForm) immobileForm.reset();

    if (previewImage) {
      previewImage.src =
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80";
    }

    updatePreview();

    if (formMsg) formMsg.textContent = "";
  });
}

if (immobileForm) {
  immobileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formMsg.textContent = "";

    const { data: sessionData, error: sessionError } = await client.auth.getSession();

    if (sessionError) {
      console.error(sessionError);
      formMsg.textContent = sessionError.message;
      return;
    }

    if (!sessionData.session) {
      formMsg.textContent = "Devi prima effettuare il login admin.";
      return;
    }

    const file = immagineInput.files[0];
    if (!file) {
      formMsg.textContent = "Seleziona una foto dell’immobile.";
      return;
    }

    const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
    const filePath = `annunci/${Date.now()}-${safeName}`;

    const { error: uploadError } = await client.storage
      .from("immobili")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error(uploadError);
      formMsg.textContent = uploadError.message;
      return;
    }

    const { data: publicUrlData } = client.storage
      .from("immobili")
      .getPublicUrl(filePath);

    const payload = {
      titolo: titoloInput.value.trim(),
      prezzo: prezzoInput.value.trim(),
      ubicazione: ubicazioneInput.value.trim(),
      categoria: categoriaInput.value,
      tagline: taglineInput.value.trim(),
      descrizione: descrizioneInput.value.trim(),
      immagine_url: publicUrlData.publicUrl,
      in_evidenza: inEvidenzaInput.checked
    };

    const { error: insertError } = await client
      .from("immobili")
      .insert([payload]);

    if (insertError) {
      console.error(insertError);
      formMsg.textContent = insertError.message;
      return;
    }

    formMsg.textContent = "Immobile pubblicato con successo.";
    immobileForm.reset();

    if (previewImage) {
      previewImage.src =
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80";
    }

    updatePreview();
  });
}

client.auth.onAuthStateChange(() => {
  refreshSessionUI();
});

updatePreview();
refreshSessionUI();
