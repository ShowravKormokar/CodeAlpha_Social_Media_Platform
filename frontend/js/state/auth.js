const API_BASE_URL =
  'http://localhost:3000/api/v1';

export const auth = {

  async login(credentials) {
    const response = await fetch(
      `${API_BASE_URL}/auth/login`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        credentials: 'include',

        body: JSON.stringify(credentials)
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || {
          message: 'Login failed'
        }
      };
    }

    return {
      success: true,
      data
    };
  }

};