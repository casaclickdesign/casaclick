const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authStatus = document.getElementById("authStatus");
const loginMsg = document.getElementById("loginMsg");
const formMsg = document.getElementById("formMsg");

const loginForm = document.getElementById("loginForm");
const immobileForm = document.getElementById("immobileForm");
const logoutBtn = document.getElementById("logoutBtn");
const resetBtn = document.getElementById("resetBtn");

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
  previewTitolo.textContent = titoloInput.value.trim() || "Titolo immobile";
  previewPrezzo.textContent = prezzoInput.value.trim() || "€ 0";
  previewTagline.textContent = taglineInput.value.trim() || "Parola ad effetto";
  previewDescrizione.textContent =
    descrizioneInput.value.trim() ||
    "La descrizione dell’immobile comparirà qui in anteprima prima della pubblicazione.";
  previewUbicazione.textContent =
    "📍 " + (ubicazioneInput.value.trim() || "Ubicazione immobile");
}

[titoloInput, prezzoInput, ubicazioneInput, taglineInput, descrizioneInput]
  .forEach(input => input.addEventListener("input", updatePreview));

immagineInput.addEventListener("change", () => {
  const file = immagineInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

async function refreshSessionUI() {
  const { data } = await client.auth.getSession();
  if (data.session) {
    authStatus.textContent = "Autenticata";
  } else {
    authStatus.textContent = "Non autenticata";
  }
}

loginForm.addEventListener("submit", async (e) => {
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const { error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMsg.textContent = "Login non riuscito. Controlla email e password.";
    return;
  }

  loginMsg.textContent = "Login effettuato con successo.";
  refreshSessionUI();
});

  loginMsg.textContent = "Controlla la tua email e clicca il link di accesso.";
});
  loginMsg.textContent = "Controlla la tua email e clicca il link di accesso.";
});

logoutBtn.addEventListener("click", async () => {
  await client.auth.signOut();
  loginMsg.textContent = "Logout effettuato.";
  refreshSessionUI();
});

resetBtn.addEventListener("click", () => {
  immobileForm.reset();
  previewImage.src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80";
  updatePreview();
  formMsg.textContent = "";
});

immobileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMsg.textContent = "";

  const { data: sessionData } = await client.auth.getSession();
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
    formMsg.textContent = "Errore durante il caricamento della foto.";
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
    formMsg.textContent = "Errore durante il salvataggio dell’immobile.";
    return;
  }
formMsg.textContent = "Immobile pubblicato con successo.";
immobileForm.reset();
previewImage.src = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80";
updatePreview();
});

client.auth.onAuthStateChange(() => {
  refreshSessionUI();
});

updatePreview();
refreshSessionUI();
