/* --- CONSTANTS --- */
const API = "/api";
const LS_TOKEN = "notes-token";

/* --- PWA registration --- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

/* --- ELEMENTS --- */
const authSection = qs("#auth");
const loginForm = qs("#loginForm");
const regForm = qs("#regForm");
const appSection = qs("#app");
const logoutBtn = qs("#logoutBtn");
const noteForm = qs("#noteForm");
const notesList = qs("#notesList");
const searchInput = qs("#search");

/* --- HELPER --- */
function qs(sel) {
  return document.querySelector(sel);
}
function fetchJSON(url, opts = {}) {
  const token = localStorage.getItem(LS_TOKEN);
  opts.headers = { ...opts.headers, "Content-Type": "application/json" };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  return fetch(url, opts).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });
}

/* --- UI SWITCH --- */
document.querySelectorAll(".switcher").forEach((el) => {
  el.onclick = (e) => {
    const target = e.currentTarget.dataset.target;
    loginForm.classList.toggle("hidden", target !== "login");
    regForm.classList.toggle("hidden", target !== "register");
  };
});

/* --- AUTH --- */
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    const body = {
      email: qs("#loginEmail").value,
      password: qs("#loginPassword").value,
    };
    const res = await fetchJSON(`${API}/auth/login`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    localStorage.setItem(LS_TOKEN, res.data.token);
    initApp();
  } catch (err) {
    alert(err.message);
  }
};

regForm.onsubmit = async (e) => {
  e.preventDefault();
  try {
    const body = {
      username: qs("#regUsername").value,
      email: qs("#regEmail").value,
      password: qs("#regPassword").value,
    };
    const res = await fetchJSON(`${API}/auth/register`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    localStorage.setItem(LS_TOKEN, res.data.token);
    initApp();
  } catch (err) {
    alert(err.message);
  }
};

logoutBtn.onclick = () => {
  localStorage.removeItem(LS_TOKEN);
  location.reload();
};

/* --- NOTES --- */
noteForm.onsubmit = async (e) => {
  e.preventDefault();

  try {
    const body = {
      title: document.getElementById("noteTitle").value,
      content: document.getElementById("noteContent").value,
      tags: document
        .getElementById("noteTags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (window.editingNoteId) {
      // Update existing note
      await fetchJSON(`${API}/notes/${window.editingNoteId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      // Reset editing state
      window.editingNoteId = null;
      document.querySelector('#noteForm button[type="submit"]').textContent =
        "Save";
    } else {
      // Create new note
      await fetchJSON(`${API}/notes`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    noteForm.reset();
    loadNotes();
  } catch (err) {
    alert("Error saving note: " + err.message);
  }
};

searchInput.oninput = () => loadNotes();

/* --- RENDERERS --- */
function renderNotes(data) {
  notesList.innerHTML = "";
  if (!data.length) {
    notesList.innerHTML = "<p>No notes.</p>";
    return;
  }
  data.forEach((n) => {
    const li = document.createElement("li");
    li.className = "note";
    li.innerHTML = `
      <span class="note-pin" data-id="${n._id}">${
      n.isPinned ? "📌" : "📍"
    }</span>
      <span class="edit-btn" data-id="${n._id}">✏️</span>
      <span class="del-btn" data-id="${n._id}">🗑️</span>
      <h3>${n.title}</h3>
      <p>${n.content.slice(0, 140)}${n.content.length > 140 ? "…" : ""}</p>
      <div class="tags">${n.tags.join(", ")}</div>
      <time>${new Date(n.updatedAt).toLocaleString()}</time>
    `;

    li.querySelector(".note-pin").onclick = () => togglePin(n._id);
    li.querySelector(".edit-btn").onclick = () => editNote(n); // Opens modal
    li.querySelector(".del-btn").onclick = () => delNote(n._id);

    notesList.appendChild(li);
  });
}

let currentEditingNote = null;

// Open edit modal
function editNote(note) {
  currentEditingNote = note;

  // Fill modal form with note data
  document.getElementById("editNoteTitle").value = note.title;
  document.getElementById("editNoteContent").value = note.content;
  document.getElementById("editNoteTags").value = note.tags.join(", ");

  // Show modal
  const modal = document.getElementById("editModal");
  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("show"), 10);

  // Focus on title field
  document.getElementById("editNoteTitle").focus();
}

// Close edit modal
function closeEditModal() {
  const modal = document.getElementById("editModal");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.classList.add("hidden");
    currentEditingNote = null;
  }, 300);
}

// Handle edit form submission
document.getElementById("editNoteForm").onsubmit = async (e) => {
  e.preventDefault();

  if (!currentEditingNote) return;

  try {
    const body = {
      title: document.getElementById("editNoteTitle").value,
      content: document.getElementById("editNoteContent").value,
      tags: document
        .getElementById("editNoteTags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    await fetchJSON(`${API}/notes/${currentEditingNote._id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });

    closeEditModal();
    loadNotes();
  } catch (err) {
    alert("Error updating note: " + err.message);
  }
};

// Close modal when clicking outside
document.getElementById("editModal").onclick = (e) => {
  if (e.target.id === "editModal") {
    closeEditModal();
  }
};

// Close modal with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeEditModal();
  }
});

async function loadNotes() {
  try {
    const q = searchInput.value.trim();
    const res = await fetchJSON(
      `${API}/notes${q ? `?search=${encodeURIComponent(q)}` : ""}`
    );
    renderNotes(res.data);
  } catch (err) {
    console.error(err);
  }
}

async function togglePin(id) {
  await fetchJSON(`${API}/notes/${id}/pin`, { method: "PATCH" });
  loadNotes();
}

async function delNote(id) {
  if (!confirm("Delete this note?")) return;
  await fetchJSON(`${API}/notes/${id}`, { method: "DELETE" });
  loadNotes();
}

/* --- APP INITIALISATION --- */
async function initApp() {
  // verify token
  try {
    await fetchJSON(`${API}/auth/profile`);
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    loadNotes();
  } catch {
    localStorage.removeItem(LS_TOKEN);
  }
}
initApp();
