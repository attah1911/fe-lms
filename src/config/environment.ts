const environment = {
  API_URL: process.env.NEXT_PUBLIC_API_URL,
  AUTH_SECRET: process.env.NEXTAUTH_SECRET,
  FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001',
};

export default environment;
