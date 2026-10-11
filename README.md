# Student Management System – Frontend (HTML, CSS, JavaScript)

No build step and no libraries.

## Run
1. Start the backend first (it runs on http://localhost:8080).
2. Serve this folder with any static server, for example:
   - VS Code: right-click `index.html` → **Open with Live Server**, or
   - Terminal: `python -m http.server 5500` and open http://localhost:5500
3. Sign in with `admin` / `admin123` (Administrator tab) or `CS2024001` / `student123` (Student tab).

If the backend is on a different address, change `API_BASE` in `js/config.js`.

## Files
- `index.html` + `js/login.js` – sign-in page
- `admin.html` + `js/admin.js` – add, edit, delete, search students; manage attendance and marks
- `student.html` + `js/student.js` – student's own profile, attendance and marks
- `js/common.js` – session, API calls, helpers · `css/style.css` – styling
