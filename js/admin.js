(function () {
  const auth = Auth.require("ADMIN");
  if (!auth) return;

  const $ = (id) => document.getElementById(id);
  $("userName").textContent = auth.username;
  $("logoutBtn").addEventListener("click", () => Auth.logout());

  let students = [];
  let editingId = null;      // student being edited (null = adding)
  let currentStudent = null; // student whose records are open

  /* ---------------- Dashboard numbers ---------------- */
  async function loadStats() {
    try {
      const s = await apiFetch("/admin/stats");
      $("statStudents").textContent = s.totalStudents;
      $("statDepartments").textContent = s.totalDepartments;
      $("statAttendance").textContent = s.attendanceRecords;
      $("statMarks").textContent = s.markRecords;
    } catch (e) { toast(e.message, "error"); }
  }

  /* ---------------- Student list ---------------- */
  async function loadStudents() {
    const keyword = $("searchInput").value.trim();
    const query = keyword ? "?keyword=" + encodeURIComponent(keyword) : "";
    try {
      students = await apiFetch("/admin/students" + query);
      renderStudents(keyword);
    } catch (e) {
      $("studentRows").innerHTML = '<tr><td colspan="6" class="empty">' + escapeHtml(e.message) + "</td></tr>";
    }
  }

  function renderStudents(keyword) {
    const body = $("studentRows");
    if (!students.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">' +
        (keyword ? "No students match “" + escapeHtml(keyword) + "”." : "No students yet. Use “Add student” to create the first record.") +
        "</td></tr>";
      return;
    }
    body.innerHTML = students.map((s) => `
      <tr>
        <td class="name-cell"><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.email)}</span></td>
        <td>${escapeHtml(s.rollNumber)}</td>
        <td>${escapeHtml(s.department)}${s.course ? "<br><span style='color:var(--muted);font-size:13px'>" + escapeHtml(s.course) + "</span>" : ""}</td>
        <td>${s.academicYear ? escapeHtml(s.academicYear) : "—"}</td>
        <td>${s.phone ? escapeHtml(s.phone) : "—"}</td>
        <td class="actions">
          <button class="btn btn-sm btn-ghost" data-action="records" data-id="${s.id}">Attendance &amp; marks</button>
          <button class="btn btn-sm btn-ghost" data-action="edit" data-id="${s.id}">Edit</button>
          <button class="btn btn-sm btn-danger" data-action="delete" data-id="${s.id}">Delete</button>
        </td>
      </tr>`).join("");
  }

  $("studentRows").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));
    const action = btn.getAttribute("data-action");
    if (action === "edit") openStudentForm(id);
    else if (action === "delete") deleteStudent(id);
    else if (action === "records") openRecords(id);
  });

  let searchTimer = null;
  $("searchInput").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadStudents, 300);
  });

  /* ---------------- Add / edit student ---------------- */
  const fields = ["rollNumber", "name", "email", "phone", "department", "course", "academicYear", "dateOfBirth", "address", "password"];

  function openStudentForm(id) {
    editingId = id || null;
    $("studentFormError").classList.add("hidden");
    fields.forEach((f) => { $("sf_" + f).value = ""; });

    if (editingId) {
      const s = students.find((x) => x.id === editingId);
      if (!s) return;
      $("studentModalTitle").textContent = "Edit student";
      fields.forEach((f) => {
        if (f !== "password") $("sf_" + f).value = s[f] === null || s[f] === undefined ? "" : s[f];
      });
      $("sf_rollNumber").readOnly = true;
      $("sf_passwordLabel").textContent = "New password";
      $("sf_passwordHelp").textContent = "Leave blank to keep the current password.";
    } else {
      $("studentModalTitle").textContent = "Add student";
      $("sf_rollNumber").readOnly = false;
      $("sf_passwordLabel").textContent = "Password";
      $("sf_passwordHelp").textContent = "Optional. If left blank, the roll number is the first password.";
    }
    openModal("studentModal");
    (editingId ? $("sf_name") : $("sf_rollNumber")).focus();
  }

  $("addStudentBtn").addEventListener("click", () => openStudentForm(null));

  function showFormError(message) {
    const box = $("studentFormError");
    box.textContent = message;
    box.classList.remove("hidden");
  }

  $("studentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = (f) => $("sf_" + f).value.trim();

    if (!val("rollNumber") || !val("name") || !val("email") || !val("department")) {
      showFormError("Roll number, name, email and department are required.");
      return;
    }

    const payload = {
      rollNumber: val("rollNumber"),
      name: val("name"),
      email: val("email"),
      phone: val("phone"),
      department: val("department"),
      course: val("course"),
      academicYear: val("academicYear") ? Number(val("academicYear")) : null,
      dateOfBirth: val("dateOfBirth") ? val("dateOfBirth") : null,
      address: val("address"),
      password: $("sf_password").value
    };

    const btn = $("studentSaveBtn");
    btn.disabled = true;
    try {
      if (editingId) {
        await apiFetch("/admin/students/" + editingId, { method: "PUT", body: JSON.stringify(payload) });
        toast("Student updated");
      } else {
        await apiFetch("/admin/students", { method: "POST", body: JSON.stringify(payload) });
        toast("Student added");
      }
      closeModal("studentModal");
      await Promise.all([loadStudents(), loadStats()]);
    } catch (err) {
      showFormError(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  async function deleteStudent(id) {
    const s = students.find((x) => x.id === id);
    if (!s) return;
    if (!confirm("Delete " + s.name + " (" + s.rollNumber + ")?\nTheir attendance, marks and login will also be removed.")) return;
    try {
      await apiFetch("/admin/students/" + id, { method: "DELETE" });
      toast("Student deleted");
      await Promise.all([loadStudents(), loadStats()]);
    } catch (e) { toast(e.message, "error"); }
  }

  /* ---------------- Attendance & marks ---------------- */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".tab-pane").forEach((p) => {
        p.classList.toggle("active", p.id === tab.getAttribute("data-tab"));
      });
    });
  });

  async function openRecords(id) {
    currentStudent = students.find((x) => x.id === id);
    if (!currentStudent) return;
    $("recordsTitle").textContent = currentStudent.name + " (" + currentStudent.rollNumber + ")";
    $("att_date").value = todayISO();
    $("att_subject").value = "";
    $("mk_subject").value = "";
    $("mk_obtained").value = "";
    $("attRows").innerHTML = '<tr><td colspan="4" class="empty">Loading…</td></tr>';
    $("markRows").innerHTML = '<tr><td colspan="6" class="empty">Loading…</td></tr>';
    openModal("recordsModal");
    await Promise.all([loadAttendance(), loadMarks()]);
  }

  async function loadAttendance() {
    try {
      const list = await apiFetch("/admin/students/" + currentStudent.id + "/attendance");
      const present = list.filter((a) => a.status === "PRESENT").length;
      const pct = percent(present, list.length);
      $("attPercent").textContent = pct + "%";
      $("attBar").className = "progress " + progressClass(pct);
      $("attBar").firstElementChild.style.width = pct + "%";
      $("attCount").textContent = present + " of " + list.length + " classes attended";

      $("attRows").innerHTML = list.length ? list.map((a) => `
        <tr>
          <td>${fmtDate(a.attendanceDate)}</td>
          <td>${escapeHtml(a.subject)}</td>
          <td><span class="badge ${a.status === "PRESENT" ? "badge-ok" : "badge-bad"}">${a.status === "PRESENT" ? "Present" : "Absent"}</span></td>
          <td class="actions"><button class="btn btn-sm btn-ghost" data-del-att="${a.id}">Remove</button></td>
        </tr>`).join("")
        : '<tr><td colspan="4" class="empty">No attendance recorded yet. Add the first entry above.</td></tr>';
    } catch (e) { toast(e.message, "error"); }
  }

  async function loadMarks() {
    try {
      const list = await apiFetch("/admin/students/" + currentStudent.id + "/marks");
      $("markRows").innerHTML = list.length ? list.map((m) => {
        const pct = percent(m.marksObtained, m.maxMarks);
        return `
        <tr>
          <td>${escapeHtml(m.subject)}</td>
          <td>${escapeHtml(m.examType)}</td>
          <td>${m.marksObtained} / ${m.maxMarks}</td>
          <td>${pct}%</td>
          <td><span class="badge ${pct >= 50 ? "badge-ok" : "badge-bad"}">${gradeFor(pct)}</span></td>
          <td class="actions"><button class="btn btn-sm btn-ghost" data-del-mark="${m.id}">Remove</button></td>
        </tr>`;
      }).join("")
        : '<tr><td colspan="6" class="empty">No marks recorded yet. Add the first entry above.</td></tr>';
    } catch (e) { toast(e.message, "error"); }
  }

  $("attForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = $("att_subject").value.trim();
    const date = $("att_date").value;
    if (!subject || !date) { toast("Enter a subject and a date", "error"); return; }
    try {
      await apiFetch("/admin/students/" + currentStudent.id + "/attendance", {
        method: "POST",
        body: JSON.stringify({ subject, attendanceDate: date, status: $("att_status").value })
      });
      toast("Attendance added");
      $("att_subject").value = "";
      await Promise.all([loadAttendance(), loadStats()]);
    } catch (err) { toast(err.message, "error"); }
  });

  $("markForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = $("mk_subject").value.trim();
    const obtained = $("mk_obtained").value;
    const max = $("mk_max").value;
    if (!subject || obtained === "" || max === "") { toast("Enter the subject and both mark values", "error"); return; }
    try {
      await apiFetch("/admin/students/" + currentStudent.id + "/marks", {
        method: "POST",
        body: JSON.stringify({
          subject,
          examType: $("mk_exam").value,
          marksObtained: Number(obtained),
          maxMarks: Number(max)
        })
      });
      toast("Marks added");
      $("mk_subject").value = "";
      $("mk_obtained").value = "";
      await Promise.all([loadMarks(), loadStats()]);
    } catch (err) { toast(err.message, "error"); }
  });

  $("attRows").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-att]");
    if (!btn) return;
    try {
      await apiFetch("/admin/attendance/" + btn.getAttribute("data-del-att"), { method: "DELETE" });
      toast("Attendance entry removed");
      await Promise.all([loadAttendance(), loadStats()]);
    } catch (err) { toast(err.message, "error"); }
  });

  $("markRows").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-mark]");
    if (!btn) return;
    try {
      await apiFetch("/admin/marks/" + btn.getAttribute("data-del-mark"), { method: "DELETE" });
      toast("Marks entry removed");
      await Promise.all([loadMarks(), loadStats()]);
    } catch (err) { toast(err.message, "error"); }
  });

  /* ---------------- Start ---------------- */
  loadStats();
  loadStudents();
})();
