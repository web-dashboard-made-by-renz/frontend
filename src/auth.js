const API = "http://localhost:8080/api/v1";

// Token management
export function getToken() {
  return localStorage.getItem("auth_token");
}

export function setToken(token) {
  localStorage.setItem("auth_token", token);
}

export function removeToken() {
  localStorage.removeItem("auth_token");
}

export function getUser() {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

export function setUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function removeUser() {
  localStorage.removeItem("user");
}

// Check if user is authenticated
export async function isAuthenticated() {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API}/auth/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return true;
    } else {
      // Token invalid, remove it
      removeToken();
      removeUser();
      return false;
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    return false;
  }
}

// Login function
export async function login(username, password) {
  try {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Save token and user info
    setToken(data.data.token);
    setUser(data.data.user);

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Logout function
export function logout() {
  removeToken();
  removeUser();
  window.location.href = "/login.html";
}

// Redirect to login if not authenticated
export async function requireAuth() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    window.location.href = "/login.html";
  }
}

// Login page logic
if (window.location.pathname.includes("login.html")) {
  // Check if already logged in
  isAuthenticated().then((authenticated) => {
    if (authenticated) {
      window.location.href = "/";
    }
  });

  const loginForm = document.getElementById("loginForm");
  const errorMessage = document.getElementById("errorMessage");
  const btnLogin = document.getElementById("btnLogin");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Disable button during login
    btnLogin.disabled = true;
    btnLogin.textContent = "Loading...";
    errorMessage.classList.remove("show");

    const result = await login(username, password);

    if (result.success) {
      // Redirect to dashboard
      window.location.href = "/";
    } else {
      // Show error
      errorMessage.textContent = result.error;
      errorMessage.classList.add("show");
      btnLogin.disabled = false;
      btnLogin.textContent = "Login";
    }
  });
}
