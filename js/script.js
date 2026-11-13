
const API = "http://localhost:3000";
const page = document.body.dataset.page;

// Generate sequential note IDs: text1, text2, text3...
function getNextNoteId(notes) {
  const numbers = notes.map(note => {
    const match = String(note.id).match(/^text(\d+)$/);
    return match ? Number(match[1]) : 0;
  });

  return `text${Math.max(0, ...numbers) + 1}`;
}

// API helper
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API}/${endpoint}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    throw new Error("Something went wrong!");
  }

  if (response.status === 204) return null;

  return response.json();
}

// =============================
// LOGIN & REGISTER
// =============================

if (page === "auth") {
  const flipCard = document.getElementById("flipCard");

  const loginForm = document.getElementById("loginForm");
  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const loginMessage = document.getElementById("loginMessage");

  const registerForm = document.getElementById("registerForm");
  const registerUsername = document.getElementById("registerUsername");
  const registerPassword = document.getElementById("registerPassword");
  const registerMessage = document.getElementById("registerMessage");

  // FLIP TO REGISTER
  document.getElementById("showRegister")?.addEventListener("click", e => {
    e.preventDefault();
    flipCard?.classList.add("flipped");
  });

  // FLIP TO LOGIN
  document.getElementById("showLogin")?.addEventListener("click", e => {
    e.preventDefault();
    flipCard?.classList.remove("flipped");
  });

  // REGISTER
  registerForm?.addEventListener("submit", async e => {
    e.preventDefault();
    registerMessage.textContent = "";

    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();

    if (!username || !password) {
      registerMessage.textContent = "Please fill all fields.";
      return;
    }

    try {
      const users = await apiRequest("users");

      const exists = users.some(
        user => user.username.toLowerCase() === username.toLowerCase()
      );

      if (exists) {
        registerMessage.textContent = "Username already exists.";
        return;
      }

      // Generate sequential user IDs: 1, 2, 3...
      const nextId = String(
        Math.max(0, ...users.map(user => Number(user.id) || 0)) + 1
      );

      await apiRequest("users", {
        method: "POST",
        body: JSON.stringify({
          id: nextId,
          username,
          password
        })
      });

      registerMessage.textContent = "Registration successful!";
      registerForm.reset();

      setTimeout(() => {
        flipCard?.classList.remove("flipped");
        registerMessage.textContent = "";
      }, 1200);

    } catch (error) {
      registerMessage.textContent = error.message;
    }
  });

  // LOGIN
  loginForm?.addEventListener("submit", async e => {
    e.preventDefault();
    loginMessage.textContent = "";

    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    try {
      const users = await apiRequest("users");

      const user = users.find(
        item =>
          item.username.toLowerCase() === username.toLowerCase() &&
          item.password === password
      );

      if (!user) {
        loginMessage.textContent = "Invalid username or password.";
        return;
      }

      // Combined userId: arun_1, ajay_2, pooja_3...
      localStorage.setItem("loggedInUser", JSON.stringify({
        id: String(user.id),
        username: user.username,
        userId: `${user.username}_${user.id}`
      }));

      window.location.href = "notes.html";

    } catch (error) {
      loginMessage.textContent = error.message;
    }
  });
}

// =============================
// NOTES PAGE
// =============================

if (page === "notes") {
  const noteInput = document.getElementById("noteInput");
  const addNoteBtn = document.getElementById("addNoteBtn");
  const noteMessage = document.getElementById("noteMessage");
  const notesList = document.getElementById("notesList");
  const logoutBtn = document.getElementById("logoutBtn");

  const user = JSON.parse(
    localStorage.getItem("loggedInUser") || "null"
  );

  if (!user) {
    window.location.href = "index.html";
  } else {
    startNotesPage();
  }

  function startNotesPage() {

    // LOGOUT
    logoutBtn?.addEventListener("click", () => {
      localStorage.removeItem("loggedInUser");
      window.location.href = "index.html";
    });

    // LOAD NOTES
    async function loadNotes() {
      try {
        const notes = await apiRequest("notes");

        // Show only logged-in user's notes
        const userNotes = notes.filter(
          note => note.userId === user.userId
        );

        renderNotes(userNotes);

      } catch (error) {
        noteMessage.textContent = error.message;
      }
    }

    // DISPLAY NOTES
    function renderNotes(notes) {
      notesList.innerHTML = "";

      if (notes.length === 0) {
        notesList.textContent = "No notes available.";
        return;
      }

      notes.forEach(note => {
        const card = document.createElement("div");
        card.className = "note-item";

        const paragraph = document.createElement("p");
        paragraph.className = "note-text";
        paragraph.textContent = note.text;

        const actions = document.createElement("div");
        actions.className = "note-actions";

        // EDIT BUTTON
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.type = "button";

        editBtn.addEventListener("click", () => editNote(note));

        // DELETE BUTTON
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.type = "button";

        deleteBtn.addEventListener("click", () => deleteNote(note));

        actions.append(editBtn, deleteBtn);
        card.append(paragraph, actions);
        notesList.appendChild(card);
      });
    }

    // ADD NOTE
    async function addNote() {
      const text = noteInput.value.trim();

      if (!text) {
        noteMessage.textContent = "Please enter a note.";
        return;
      }

      try {
        const notes = await apiRequest("notes");

        const newNote = {
          id: getNextNoteId(notes),
          userId: user.userId,
          text: text
        };

        await apiRequest("notes", {
          method: "POST",
          body: JSON.stringify(newNote)
        });

        noteInput.value = "";
        noteMessage.textContent = "";

        await loadNotes();

      } catch (error) {
        noteMessage.textContent = error.message;
      }
    }

    addNoteBtn?.addEventListener("click", addNote);

    // EDIT NOTE
    async function editNote(note) {
      const updatedText = prompt("Edit your note:", note.text);

      if (updatedText === null) return;

      if (!updatedText.trim()) {
        alert("Note cannot be empty.");
        return;
      }

      try {
        await apiRequest(`notes/${encodeURIComponent(note.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            text: updatedText.trim()
          })
        });

        await loadNotes();

      } catch (error) {
        alert(error.message);
      }
    }

    // DELETE NOTE
    async function deleteNote(note) {
      if (!confirm("Are you sure you want to delete this note?")) {
        return;
      }

      try {
        await apiRequest(`notes/${encodeURIComponent(note.id)}`, {
          method: "DELETE"
        });

        await loadNotes();

      } catch (error) {
        alert(error.message);
      }
    }

    // INITIAL LOAD
    loadNotes();
  }
}
