export const API_BASE_URL = '';

export const API = {
  auth: `${API_BASE_URL}/api/auth`,
  items: `${API_BASE_URL}/api/items`,
  market: `${API_BASE_URL}/api/market`,
  users: `${API_BASE_URL}/api/users`,
};

// NB: API gateway internally prefixes "/admin" when forwarding to upstream
// services, so callers must NOT include "/admin" in the URLs below.
export const ADMIN_API = {
  catalog: `${API_BASE_URL}/api/admin/catalog`,
  auth: `${API_BASE_URL}/api/admin/auth`,
  userAssets: `${API_BASE_URL}/api/admin/user-assets`,
};
