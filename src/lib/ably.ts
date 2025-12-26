import Ably from 'ably';

// Use the token endpoint from our backend
// VITE_API_URL must be defined in .env
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.warn('VITE_API_URL is missing in environment variables. Realtime features may fail.');
}

export const ably = new Ably.Realtime({
  authUrl: `${API_URL}/api/ably-token`,
  // If we want to pass userId, we can append it securely to the authUrl query params
  // But usually the auth callback handles it or we pass it in authParams if needed
  authCallback: async (tokenParams, callback) => {
    try {
      // Get user ID from local auth store if needed, or rely on cookie/header
      const userStr = localStorage.getItem('sb-kvk...-auth-token'); // Example logic if needed
      // Ideally pass user ID so backend can gen private token

      // Basic implementation:
      const response = await fetch(`${API_URL}/api/ably-token${tokenParams.clientId ? `?userId=${tokenParams.clientId}` : ''}`);
      const tokenRequest = await response.json();
      callback(null, tokenRequest);
    } catch (err: any) {
      callback(err, null);
    }
  },
  autoConnect: false // We connect manually when needed or component mounts
});
