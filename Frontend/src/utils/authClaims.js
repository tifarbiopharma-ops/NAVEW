import { jwtDecode } from 'jwt-decode';

export const getAuthClaims = (token) => {
  if (!token) return null;

  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error decodificando token:', error);
    return null;
  }
};

export const isTokenValid = (token) => {
  const claims = getAuthClaims(token);
  if (!claims || typeof claims.exp !== 'number') return false;
  const now = Math.floor(Date.now() / 1000);
  return now < claims.exp;
};