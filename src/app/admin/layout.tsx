import { cookies } from 'next/headers';
import AdminClientLayout from '@/components/admin/AdminClientLayout';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // ⚡ SERVER-SIDE CHECK: Next.js 15 requires awaiting cookies()
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.has('admin_session');

  // We pass the server-side auth status to the client component
  return (
    <AdminClientLayout isAuthenticated={isAuthenticated}>
      {children}
    </AdminClientLayout>
  );
}