(function () {
  // Already logged in? Go straight to the right page.
  const existing = Auth.get();
  if (existing && existing.token) {
    window.location.href = existing.role === "ADMIN" ? "admin.html" : "student.html";
    return;
  }

  let selectedRole = "ADMIN";
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const btn = document.getElementById("loginBtn");
  const hint = document.getElementById("demoHint");
  const usernameLabel = document.getElementById("usernameLabel");

  function refreshRoleUI() {
    document.querySelectorAll(".role-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.getAttribute("data-role") === selectedRole);
    });
    if (selectedRole === "ADMIN") {
      usernameLabel.textContent = "Username";
      hint.innerHTML = "First-time setup: <code>admin</code> / <code>admin123</code>";
    } else {
      usernameLabel.textContent = "Roll number";
      hint.innerHTML = "Your roll number is your username. Demo student: <code>CS2024001</code> / <code>student123</code>";
    }
    errorBox.classList.add("hidden");
  }

  document.querySelectorAll(".role-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      selectedRole = tab.getAttribute("data-role");
      refreshRoleUI();
    });
  });

  function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      showError("Enter your username and password.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Signing in…";
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      if (data.role !== selectedRole) {
        showError(selectedRole === "ADMIN"
          ? "This account is a student account. Choose the Student tab."
          : "This account is an administrator account. Choose the Administrator tab.");
        return;
      }

      Auth.save(data);
      window.location.href = data.role === "ADMIN" ? "admin.html" : "student.html";
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });

  refreshRoleUI();
})();
