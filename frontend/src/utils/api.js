const API_BASE = "/api";

export async function apiFetch(path, options = {}) {
    const token = sessionStorage.getItem("access_token");

    const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (response.status === 401) {
        sessionStorage.clear();
        window.location.href = "/login";
        throw new Error("Session expired. Please log in again.");
    }

    return response;
}