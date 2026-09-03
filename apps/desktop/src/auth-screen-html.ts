export const AUTH_SCREEN_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Haraka Property</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: ui-sans-serif, system-ui, sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
    main {
      width: min(26rem, calc(100vw - 2rem));
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 1.5rem;
      padding: 2rem 1.75rem;
      box-shadow: 0 24px 48px rgb(15 23 42 / 0.08);
      text-align: center;
    }
    .mark {
      width: 3rem;
      height: 3rem;
      margin: 0 auto 1rem;
      border-radius: 0.9rem;
      background: #0063fe;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.15rem;
    }
    h1 { margin: 0; font-size: 1.35rem; letter-spacing: -0.03em; }
    p { margin: 0.5rem 0 1.5rem; color: #64748b; font-size: 0.95rem; }
    button {
      width: 100%;
      min-height: 2.85rem;
      border-radius: 0.8rem;
      border: 0;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    #login { background: #0063fe; color: #fff; }
    #signup, #cancel { margin-top: 0.7rem; background: #fff; color: #0f172a; border: 1px solid #dbe3ee; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    #status { min-height: 1.25rem; margin: 0 0 1.1rem; font-size: 0.85rem; color: #475569; }
    #status[data-kind="error"] { color: #b91c1c; }
    #cancel { display: none; }
  </style>
</head>
<body>
  <main>
    <div class="mark" aria-hidden="true">H</div>
    <h1>Haraka Property</h1>
    <p>Connectez-vous pour ouvrir le tableau de bord.</p>
    <p id="status"></p>
    <button id="login" type="button">Se connecter</button>
    <button id="signup" type="button">Créer un compte</button>
    <button id="cancel" type="button">Annuler</button>
  </main>
  <script>
    const statusEl = document.getElementById("status");
    const loginBtn = document.getElementById("login");
    const signupBtn = document.getElementById("signup");
    const cancelBtn = document.getElementById("cancel");

    function setBusy(busy) {
      loginBtn.disabled = busy;
      signupBtn.disabled = busy;
      cancelBtn.style.display = busy ? "block" : "none";
    }

    function renderStatus(payload) {
      if (!payload || payload.status === "idle") {
        statusEl.textContent = "";
        statusEl.removeAttribute("data-kind");
        setBusy(false);
        return;
      }
      if (payload.status === "waiting") {
        statusEl.textContent = "Confirmez la connexion dans votre navigateur…";
        statusEl.removeAttribute("data-kind");
        setBusy(true);
        return;
      }
      if (payload.status === "exchanging") {
        statusEl.textContent = "Finalisation de la session…";
        statusEl.removeAttribute("data-kind");
        setBusy(true);
        return;
      }
      statusEl.textContent = payload.message || "La connexion a échoué.";
      statusEl.setAttribute("data-kind", "error");
      setBusy(false);
    }

    if (!window.desktop || !window.desktop.auth) {
      renderStatus({ status: "error", message: "Le pont d'authentification est indisponible." });
    } else {
      window.desktop.auth.subscribe(renderStatus);
      loginBtn.addEventListener("click", function () { window.desktop.auth.startLogin(); });
      signupBtn.addEventListener("click", function () { window.desktop.auth.startSignup(); });
      cancelBtn.addEventListener("click", function () { window.desktop.auth.cancel(); });
    }
  </script>
</body>
</html>
`;
