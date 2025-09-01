import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Truck, Users, Map, BarChart, Settings, Receipt } from 'lucide-react';

const getNavigation = (userRole: string) => {
  const adminNav = [
    { name: 'Painel', href: '/', icon: BarChart },
    { name: 'Rotas', href: '/routes', icon: Map },
    { name: 'Motoristas', href: '/drivers', icon: Truck },
    { name: 'Gerenciar Motoristas', href: '/manage-drivers', icon: Users },
    { name: 'Clientes', href: '/customers', icon: Users },
    { name: 'Veículos', href: '/vehicles', icon: Truck },
    { name: 'Despesas', href: '/expenses', icon: Settings },
    { name: 'Relatórios', href: '/reports', icon: BarChart },
  ];

  const driverNav = [
    { name: 'Minhas Rotas', href: '/my-routes', icon: Map },
    { name: 'Minhas Despesas', href: '/my-expenses', icon: Receipt },
    { name: 'Painel', href: '/', icon: BarChart },
  ];

  return userRole === 'admin' ? adminNav : driverNav;
};

export default function Layout() {
  const { user, profile, loading, signOut } = useAuth();
  const navigation = getNavigation(profile?.role || 'driver');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">Sistema de Entregas</h1>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {profile?.name || user.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="w-64 min-h-screen border-r bg-card">
          <div className="p-4">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </nav>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}