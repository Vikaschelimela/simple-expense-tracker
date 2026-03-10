# 💰 Simple Expense Tracker — SpendWise

A clean, private, and animated expense tracker built with vanilla HTML, CSS, and JavaScript.

---

## 📁 Project Structure

```
expense-tracker/
├── index.html     ← App shell & UI layout
├── styles.css     ← Light pastel theme + animations
├── app.js         ← Auth, expenses, budget logic
└── README.md      ← This file
```

---

## 🚀 Getting Started

Open `index.html` in any modern browser — no build step or server needed.

**Demo credentials:**
- Username: `admin`
- Password: `admin123`

---

## 🔐 Security Changes

### Password Hashing
- Passwords are hashed with **SHA-256** (Web Crypto API) before storage.
- A combined salt (`app salt + username`) is applied — no two users have the same hash for the same password.
- Existing plain-text passwords are **automatically migrated** on first load.

### Secure Logout
- Session is stored in **`sessionStorage`** (cleared on tab/browser close) instead of `localStorage`.
- On logout, all login/register input fields are **wiped immediately**.
- Password toggle buttons are **reset to hidden** state.
- Users are redirected to the login panel with a clean slate.

### Input Hygiene
- Password fields use `autocomplete="new-password"` to prevent browser autofill leakage.
- Username fields use `autocomplete="username"` for correct semantics.
- Passwords are cleared from input fields immediately after reading them.

### User Data Isolation
- Each user's expenses and budgets are stored under **`sw_expenses_{username}`** and **`sw_budgets_{username}`** keys — fully isolated per account.

---

## ✨ UI/Animation Additions

| Feature | Detail |
|---|---|
| Toast notifications | Replace `alert()` — success, error, warn, info variants |
| Auth card entrance | Spring-physics slide-up on load |
| Brand icon pop | Bouncy scale + rotation on auth screen |
| Summary card stagger | Cards animate in with 80ms delay offsets |
| Table row stagger | Rows fade in sequentially as they render |
| Progress bar shimmer | Animated gloss sweep on the budget bar |
| Button ripple | Click ripple effect on all primary buttons |
| Floating orbs | Subtle background depth on auth screen |
| Edit/Delete icon spin | Playful rotate on hover |
| Modal close spin | X button rotates 90° on hover |
| Error shake | Form errors animate with a horizontal shake |
| Empty state float | Inbox icon gently bobs up and down |
| Input lift | Inputs translate up slightly on focus |

---

## 🎨 Color Theme

The palette uses soft pastels over an indigo-tinted background (`#F0F4FF`) with white glass-effect surfaces:

- **Primary:** Indigo-Blue gradient (`#3B82F6 → #6366F1`)
- **Success:** Emerald green
- **Danger:** Soft red
- **Accent:** Violet, Rose

---

## 🌐 Browser Support

Requires a modern browser with support for:
- `crypto.subtle` (SHA-256) — Chrome 37+, Firefox 34+, Safari 11+
- `sessionStorage`
- CSS `backdrop-filter`
