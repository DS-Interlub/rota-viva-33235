import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Ensure profile exists and has valid role
  if (!profile || !profile.role) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-destructive">Erro de Perfil</h2>
        <p className="text-muted-foreground mt-2">
          Perfil de usuário inválido. Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  if (requiredRole && profile.role !== requiredRole) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-destructive">Acesso Negado</h2>
        <p className="text-muted-foreground mt-2">
          Você não tem permissão para acessar esta página.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Seu perfil: {profile.role} | Requerido: {requiredRole}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}