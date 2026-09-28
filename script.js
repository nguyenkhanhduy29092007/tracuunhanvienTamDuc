const API_URL = "https://script.google.com/macros/s/AKfycby1dMeCHwmOownJZIONESISGpFtt-NNvtczMtHJFLgpjnZCCdbSjyGzYoP7z8zAupGE/exec";

const $ = (id) => document.getElementById(id);

$("searchBtn").addEventListener("click", searchEmployee);
$("employeeId").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("pin").focus();
});
$("pin").addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchEmployee();
});
$("togglePin").addEventListener("click", () => {
  const input = $("pin");
  input.type = input.type === "password" ? "text" : "password";
  $("togglePin").textContent = input.type === "password" ? "◉" : "◎";
});
$("backBtn").addEventListener("click", logout);

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
    window.scrollTo({ top: 220, behavior: "smooth" });
  });
});

async function searchEmployee() {
  const id = $("employeeId").value.trim().toUpperCase();
  const pin = $("pin").value.trim();
  const button = $("searchBtn");

  $("error").textContent = "";

  if (!id || !pin) {
    $("error").textContent = "Vui lòng nhập đầy đủ Mã nhân viên và PIN.";
    return;
  }
  if (!/^S\d{6}$/i.test(id)) {
    $("error").textContent = "Mã nhân viên có dạng S001178.";
    return;
  }
  if (!/^\d{6}$/.test(pin)) {
    $("error").textContent = "PIN phải gồm 6 số.";
    return;
  }

  button.disabled = true;
  button.querySelector("span:first-child").textContent = "Đang xác thực...";

  try {
    const response = await fetch(`${API_URL}?id=${encodeURIComponent(id)}&pin=${encodeURIComponent(pin)}`, {
      method: "GET",
      cache: "no-store"
    });
    const data = await response.json();

    if (!data.ok) throw new Error(data.message || "Mã nhân viên hoặc PIN không đúng.");

    renderDashboard(data);
    $("loginBox").classList.add("hidden");
    $("resultBox").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    $("error").textContent = error.message || "Không thể kết nối tới hệ thống.";
  } finally {
    button.disabled = false;
    button.querySelector("span:first-child").textContent = "Đăng nhập";
  }
}

function logout() {
  $("resultBox").classList.add("hidden");
  $("loginBox").classList.remove("hidden");
  $("employeeId").value = "";
  $("pin").value = "";
  $("error").textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderDashboard(data) {
  const employee = data.employee || {};
  const name = employee.name || "Nhân viên";
  const id = employee.id || "";

  $("welcome").textContent = `Xin chào, ${name}`;
  $("employeeIdText").textContent = `Mã nhân viên: ${id}`;
  $("profileId").textContent = id;
  $("name").textContent = name;
  $("contract").textContent = employee.contract || "—";
  $("team").textContent = employee.team || "—";
  $("agency").textContent = employee.agency || "—";
  $("avatar").textContent = initials(name);

  $("overviewId").textContent = id || "—";
  $("overviewName").textContent = name || "—";
  $("overviewContract").textContent = employee.contract || "—";
  $("overviewTeam").textContent = employee.team || "—";
  $("overviewAgency").textContent = employee.agency || "—";

  $("attendanceCount").textContent = (data.attendance || []).length;
  $("leaveCount").textContent = (data.leave || []).length;
  $("advanceTotal").textContent = formatNumber(sumAdvance(data.advance || []));
  $("salaryCount").textContent = (data.salary || []).length;

  $("attendance").innerHTML = createTableCard("Chấm công", data.attendance || [], "Dữ liệu chấm công");
  $("leave").innerHTML = createTableCard("Phép năm", data.leave || [], "Dữ liệu nghỉ phép");
  $("advance").innerHTML = createTableCard("Tạm ứng", data.advance || [], "Các khoản tạm ứng theo sheet");
  $("salary").innerHTML = createTableCard("Bảng lương", data.salary || [], "Dữ liệu bảng lương hiện có");
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

function sumAdvance(rows) {
  let total = 0;
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (/tổng ứng/i.test(key)) {
        const cleaned = String(value ?? "").replace(/\./g, "").replace(/[^\d-]/g, "");
        const number = Number(cleaned);
        if (Number.isFinite(number)) total += number;
      }
    }
  }
  return total;
}

function createTableCard(title, rows, note) {
  if (!rows.length) {
    return `<div class="table-card"><div class="table-head"><div><span class="section-kicker">DỮ LIỆU</span><h2>${escapeHtml(title)}</h2></div></div><div class="empty-state"><strong>Chưa có dữ liệu</strong>Hệ thống chưa trả về bản ghi cho mục này.</div></div>`;
  }

  const headers = Object.keys(rows[0]);
  let html = `<div class="table-card"><div class="table-head"><div><span class="section-kicker">DỮ LIỆU</span><h2>${escapeHtml(title)}</h2></div><div class="table-note">${escapeHtml(note)} • ${rows.length} bản ghi</div></div><div class="table-wrap"><table class="data-table"><thead><tr>`;
  for (const header of headers) html += `<th>${escapeHtml(header)}</th>`;
  html += `</tr></thead><tbody>`;

  for (const row of rows) {
    html += "<tr>";
    for (const header of headers) html += `<td>${escapeHtml(row[header])}</td>`;
    html += "</tr>";
  }
  html += "</tbody></table></div></div>";
  return html;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}
