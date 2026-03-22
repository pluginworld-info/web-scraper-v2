import LoginForm from './LoginForm';

export default function AdminLoginPage() {
  // ⚡ Because it doesn't say NEXT_PUBLIC_, Cloud Run reads this fresh at runtime!
  const siteKey = process.env.TURNSTILE_SITE_KEY || '';

  return <LoginForm siteKey={siteKey} />;
}