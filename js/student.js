(function () {
  const auth = Auth.require("STUDENT");
  if (!auth) return;

  const $ = (id) => document.getElementById(id);
  $("userName").textContent = auth.name || auth.username;
  $("logoutBtn").addEventListener("click", () => Auth.logout());

  function setText(id, value) {
    $(id).textContent = value === null || value === undefined || value === "" ? "—" : value;
  }

  function renderProfile(s) {
    $("avatar").textContent = (s.name || "S").trim().charAt(0).toUpperCase();
    $("pName").textContent = s.name;
    $("pSub").textContent = s.department + (s.course ? " · " + s.course : "");
    setText("pRoll", s.rollNumber);
    setText("pDept", s.department);
    setText("pCourse", s.course);
    setText("pYear", s.academicYear);
    setText("pEmail", s.email);
    setText("pPhone", s.phone);
    $("pDob").textContent = s.dateOfBirth ? fmtDate(s.dateOfBirth) : "—";
    setText("pAddress", s.address);
  }

  function renderAttendance(list) {
    const present = list.filter((a) => a.status === "PRESENT").length;
    const pct = percent(present, list.length);
    $("attPercent").textContent = pct + "%";
    $("attBar").className = "progress " + progressClass(pct);
    $("attBar").firstElementChild.style.width = pct + "%";
    $("attCount").textContent = list.length
      ? "You attended " + present + " of " + list.length + " classes."
      : "No attendance has been recorded yet.";

    // Per-subject breakdown
    const bySubject = {};
    list.forEach((a) => {
      if (!bySubject[a.subject]) bySubject[a.subject] = { present: 0, total: 0 };
      bySubject[a.subject].total++;
      if (a.status === "PRESENT") bySubject[a.subject].present++;
    });
    $("subjectBreakdown").innerHTML = Object.keys(bySubject).sort().map((name) => {
      const d = bySubject[name];
      const p = percent(d.present, d.total);
      return `
        <div class="subject-row">
          <div class="top"><span>${escapeHtml(name)}</span><span>${p}% (${d.present}/${d.total})</span></div>
          <div class="progress ${progressClass(p)}"><div style="width:${p}%"></div></div>
        </div>`;
    }).join("");

    $("attRows").innerHTML = list.length ? list.map((a) => `
      <tr>
        <td>${fmtDate(a.attendanceDate)}</td>
        <td>${escapeHtml(a.subject)}</td>
        <td><span class="badge ${a.status === "PRESENT" ? "badge-ok" : "badge-bad"}">${a.status === "PRESENT" ? "Present" : "Absent"}</span></td>
      </tr>`).join("")
      : '<tr><td colspan="3" class="empty">Nothing to show yet.</td></tr>';
  }

  function renderMarks(list) {
    let obtained = 0, max = 0;
    list.forEach((m) => { obtained += m.marksObtained; max += m.maxMarks; });
    const pct = percent(obtained, max);
    $("markPercent").textContent = list.length ? pct + "%" : "—";
    $("markBar").className = "progress " + (pct < 50 ? "low" : pct < 65 ? "mid" : "");
    $("markBar").firstElementChild.style.width = (list.length ? pct : 0) + "%";
    $("markCount").textContent = list.length
      ? "Overall grade " + gradeFor(pct) + " across " + list.length + " exam" + (list.length === 1 ? "" : "s") + "."
      : "No marks have been published yet.";

    $("markRows").innerHTML = list.length ? list.map((m) => {
      const p = percent(m.marksObtained, m.maxMarks);
      return `
        <tr>
          <td>${escapeHtml(m.subject)}</td>
          <td>${escapeHtml(m.examType)}</td>
          <td>${m.marksObtained} / ${m.maxMarks}</td>
          <td>${p}%</td>
          <td><span class="badge ${p >= 50 ? "badge-ok" : "badge-bad"}">${gradeFor(p)}</span></td>
        </tr>`;
    }).join("")
      : '<tr><td colspan="5" class="empty">Nothing to show yet.</td></tr>';
  }

  async function init() {
    try {
      const [profile, attendance, marks] = await Promise.all([
        apiFetch("/student/me"),
        apiFetch("/student/attendance"),
        apiFetch("/student/marks")
      ]);
      renderProfile(profile);
      renderAttendance(attendance);
      renderMarks(marks);
    } catch (e) {
      const box = $("loadError");
      box.textContent = e.message;
      box.classList.remove("hidden");
      $("pName").textContent = "Could not load your records";
    }
  }

  init();
})();
