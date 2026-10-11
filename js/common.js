/* Shared helpers: login session, API calls, toasts, formatting */

const Auth = {
  KEY: "sms_auth",
  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { return null; }
  },
  clear() { localStorage.removeItem(this.KEY); },
  logout() { this.clear(); window.location.href = "index.html"; },
  // Returns the session if the logged-in user has the given role, else sends them to the login page.
  require(role) {
    const auth = this.get();
    if (!auth || !auth.token || auth.role !== role) {
      this.clear();
      window.location.href = "index.html";
      return null;
    }
    return auth;
  }
};

async function apiFetch(path, options = {}) {
  const auth = Auth.get();
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (auth && auth.token) headers["Authorization"] = "Bearer " + auth.token;

  let response;
  try {
    response = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
  } catch (e) {
    throw new Error("Cannot reach the server. Make sure the backend is running on " + API_BASE);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = text; }
  }

  if (response.status === 401 && !path.startsWith("/auth/")) {
    Auth.logout();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!response.ok) {
    const message = data && data.message ? data.message : "Request failed (" + response.status + ")";
    throw new Error(message);
  }
  return data;
}

function toast(message, type) {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = "toast" + (type === "error" ? " error" : "");
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtDate(iso) {
  if (!iso) return "—";
  const parts = String(iso).split("-");
  if (parts.length !== 3) return escapeHtml(iso);
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function percent(part, total) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function progressClass(pct) {
  if (pct < 60) return "low";
  if (pct < 75) return "mid";
  return "";
}

function gradeFor(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

// Any element with data-close="modalId" closes that modal
document.addEventListener("click", (e) => {
  const closer = e.target.closest("[data-close]");
  if (closer) closeModal(closer.getAttribute("data-close"));
});
