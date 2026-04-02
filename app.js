import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBKXrJ9BvbfavpRJ5De21MMwgrPr9-QLSo",
  authDomain: "duck-db-dff83.firebaseapp.com",
  projectId: "duck-db-dff83",
  storageBucket: "duck-db-dff83.firebasestorage.app",
  messagingSenderId: "452096771596",
  appId: "1:452096771596:web:e4ab5b8bf477e0f4779029",
  databaseURL: "https://duck-db-dff83-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const todosRef = ref(db, "todos");

function sanitizeText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

const els = {
  form: document.getElementById("todoForm"),
  input: document.getElementById("todoInput"),
  list: document.getElementById("todoList"),
  empty: document.getElementById("emptyState"),
  count: document.getElementById("countText"),
  clearAll: document.getElementById("clearAllBtn"),
  template: document.getElementById("todoItemTemplate"),
};

let todos = [];

function setEmptyStateVisible(isVisible) {
  els.empty.style.display = isVisible ? "block" : "none";
}

function updateCount() {
  els.count.textContent = `${todos.length}개`;
}

function render() {
  els.list.replaceChildren();

  for (const todo of todos) {
    const node = els.template.content.firstElementChild.cloneNode(true);

    const li = node;
    li.dataset.id = todo.id;
    li.classList.toggle("todo-item--done", todo.done);

    const checkbox = li.querySelector(".todo-item__checkbox");
    const textEl = li.querySelector(".todo-item__text");
    const editBtn = li.querySelector(".todo-item__edit");
    const deleteBtn = li.querySelector(".todo-item__delete");

    checkbox.checked = todo.done;
    checkbox.addEventListener("change", async () => {
      checkbox.disabled = true;
      try {
        await update(ref(db, `todos/${todo.id}`), {
          done: checkbox.checked,
          updatedAt: serverTimestamp(),
          updatedAtMs: Date.now(),
        });
      } catch (err) {
        checkbox.checked = !checkbox.checked;
        alert(`업데이트에 실패했어요.\n${err?.message ?? err}`);
      } finally {
        checkbox.disabled = false;
      }
    });

    textEl.textContent = todo.text;

    editBtn.addEventListener("click", () => {
      const next = prompt("할 일을 수정하세요", todo.text);
      if (next === null) return;
      const cleaned = sanitizeText(next);
      if (!cleaned) return;
      update(ref(db, `todos/${todo.id}`), {
        text: cleaned,
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      }).catch((err) => alert(`수정에 실패했어요.\n${err?.message ?? err}`));
    });

    deleteBtn.addEventListener("click", async () => {
      const ok = confirm("정말 삭제할까요?");
      if (!ok) return;
      deleteBtn.disabled = true;
      try {
        await remove(ref(db, `todos/${todo.id}`));
      } catch (err) {
        alert(`삭제에 실패했어요.\n${err?.message ?? err}`);
      } finally {
        deleteBtn.disabled = false;
      }
    });

    els.list.appendChild(li);
  }

  setEmptyStateVisible(todos.length === 0);
  updateCount();
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = sanitizeText(els.input.value);
  if (!text) return;

  els.input.disabled = true;
  const submitBtn = els.form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  const nowMs = Date.now();
  const newTodoRef = push(todosRef);
  set(newTodoRef, {
    text,
    done: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  })
    .then(() => {
      els.input.value = "";
      els.input.focus();
    })
    .catch((err) => {
      alert(`추가에 실패했어요.\n${err?.message ?? err}`);
    })
    .finally(() => {
      els.input.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
    });
});

els.clearAll.addEventListener("click", async () => {
  if (todos.length === 0) return;
  const ok = confirm("모든 할 일을 삭제할까요?");
  if (!ok) return;
  els.clearAll.disabled = true;
  try {
    await remove(todosRef);
  } catch (err) {
    alert(`전체 삭제에 실패했어요.\n${err?.message ?? err}`);
  } finally {
    els.clearAll.disabled = false;
  }
});

onValue(
  todosRef,
  (snap) => {
    const next = [];
    snap.forEach((child) => {
      const v = child.val() ?? {};
      next.push({
        id: child.key,
        text: v.text == null ? "" : String(v.text),
        done: Boolean(v.done),
        createdAt: v.createdAt ?? null,
        updatedAt: v.updatedAt ?? null,
        createdAtMs: typeof v.createdAtMs === "number" ? v.createdAtMs : 0,
        updatedAtMs: typeof v.updatedAtMs === "number" ? v.updatedAtMs : 0,
      });
    });
    next.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    todos = next;
    render();
  },
  (err) => {
    alert(`Realtime Database 연결에 실패했어요.\n${err?.message ?? err}`);
  },
);
