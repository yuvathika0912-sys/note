
// ========================================
// NOTES APP - LOCAL STORAGE VERSION
// No backend | No JSON Server | No API
// ========================================

const page = document.body.dataset.page;

const USERS_KEY = "notesAppUsers";
const NOTES_KEY = "notesAppNotes";
const SESSION_KEY = "loggedInUser";

// ========================================
// STORAGE HELPERS
// ========================================

function getStorageData(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveStorageData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getUsers() {
  return getStorageData(USERS_KEY);
}

function getNotes() {
  return getStorageData(NOTES_KEY);
}

// Generate sequential note IDs
function getNextNoteId(notes) {
  const numbers = notes.map(note => {
    const match = String(note.id).match(/^text(\d+)$/);
    return match ? Number(match[1]) : 0;
  });

  return `text${Math.max(0, ...numbers) + 1}`;
}

// Generate sequential user IDs
function getNextUserId(users) {
  return String(
    Math.max(0, ...users.map(user => Number(user.id) || 0)) + 1
  );
}

// ========================================
// LOGIN & REGISTER
// ========================================

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
  registerForm?.addEventListener("submit", e => {
    e.preventDefault();

    registerMessage.textContent = "";

    const username = registerUsername.value.trim();
    const password = registerPassword.value.trim();

    if (!username || !password) {
      registerMessage.textContent = "Please fill all fields.";
      return;
    }

    if (username.length < 3) {
      registerMessage.textContent =
        "Username must contain at least 3 characters.";
      return;
    }

    if (password.length < 6) {
      registerMessage.textContent =
        "Password must contain at least 6 characters.";
      return;
    }

    try {
      const users = getUsers();

      const exists = users.some(
        user =>
          user.username.toLowerCase() === username.toLowerCase()
      );

      if (exists) {
        registerMessage.textContent = "Username already exists.";
        return;
      }

      const nextId = getNextUserId(users);

      const newUser = {
        id: nextId,
        username: username,
        password: password,
        userId: `${username}_${nextId}`
      };

      users.push(newUser);

      saveStorageData(USERS_KEY, users);

      registerMessage.textContent = "Registration successful!";

      registerForm.reset();

      setTimeout(() => {
        flipCard?.classList.remove("flipped");
        registerMessage.textContent = "";
      }, 1200);

    } catch (error) {
      registerMessage.textContent =
        "Unable to register. Please try again.";
    }
  });

  // LOGIN
  loginForm?.addEventListener("submit", e => {
    e.preventDefault();

    loginMessage.textContent = "";

    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
      loginMessage.textContent = "Please fill all fields.";
      return;
    }

    try {
      const users = getUsers();

      const user = users.find(
        item =>
          item.username.toLowerCase() === username.toLowerCase() &&
          item.password === password
      );

      if (!user) {
        loginMessage.textContent = "Invalid username or password.";
        return;
      }

      // SAVE LOGIN SESSION
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          id: String(user.id),
          username: user.username,
          userId: user.userId || `${user.username}_${user.id}`
        })
      );

      window.location.href = "notes.html";

    } catch (error) {
      loginMessage.textContent =
        "Unable to login. Please try again.";
    }
  });
}

// ========================================
// NOTES PAGE
// ========================================

if (page === "notes") {

  const noteInput = document.getElementById("noteInput");
  const addNoteBtn = document.getElementById("addNoteBtn");
  const noteMessage = document.getElementById("noteMessage");
  const notesList = document.getElementById("notesList");
  const logoutBtn = document.getElementById("logoutBtn");

  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null"
    );
  } catch {
    user = null;
  }

  // CHECK LOGIN
  if (!user || !user.userId) {
    window.location.href = "index.html";
  } else {
    startNotesPage();
  }

  function startNotesPage() {

    // LOGOUT
    logoutBtn?.addEventListener("click", () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "index.html";
    });

    // LOAD NOTES
    function loadNotes() {

      try {
        const notes = getNotes();

        const userNotes = notes.filter(
          note => note.userId === user.userId
        );

        renderNotes(userNotes);

      } catch (error) {
        noteMessage.textContent = "Unable to load notes.";
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

        editBtn.addEventListener("click", () => {
          editNote(note);
        });

        // DELETE BUTTON
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.type = "button";

        deleteBtn.addEventListener("click", () => {
          deleteNote(note);
        });

        actions.append(editBtn, deleteBtn);

        card.append(paragraph, actions);

        notesList.appendChild(card);
      });
    }

    // ADD NOTE
    function addNote() {

      const text = noteInput.value.trim();

      if (!text) {
        noteMessage.textContent = "Please enter a note.";
        return;
      }

      try {

        const notes = getNotes();

        const newNote = {
          id: getNextNoteId(notes),
          userId: user.userId,
          text: text
        };

        notes.push(newNote);

        saveStorageData(NOTES_KEY, notes);

        noteInput.value = "";
        noteMessage.textContent = "";

        loadNotes();

      } catch (error) {
        noteMessage.textContent =
          "Unable to save note. Please try again.";
      }
    }

    addNoteBtn?.addEventListener("click", addNote);

    // EDIT NOTE
    function editNote(note) {

      const updatedText = prompt(
        "Edit your note:",
        note.text
      );

      if (updatedText === null) return;

      if (!updatedText.trim()) {
        alert("Note cannot be empty.");
        return;
      }

      try {

        const notes = getNotes();

        const index = notes.findIndex(
          item =>
            item.id === note.id &&
            item.userId === user.userId
        );

        if (index === -1) {
          alert("Note not found.");
          return;
        }

        notes[index].text = updatedText.trim();

        saveStorageData(NOTES_KEY, notes);

        loadNotes();

      } catch (error) {
        alert("Unable to update note.");
      }
    }

    // DELETE NOTE
    function deleteNote(note) {

      if (!confirm("Are you sure you want to delete this note?")) {
        return;
      }

      try {

        const notes = getNotes();

        const updatedNotes = notes.filter(
          item =>
            !(item.id === note.id && item.userId === user.userId)
        );

        saveStorageData(NOTES_KEY, updatedNotes);

        loadNotes();

      } catch (error) {
        alert("Unable to delete note.");
      }
    }

    // INITIAL LOAD
    loadNotes();
  }
}
