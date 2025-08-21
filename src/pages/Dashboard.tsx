import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Package, Truck, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import FirstAdminSetup from '@/components/FirstAdminSetup';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalRoutes: 0,
    completedRoutes: 0,
    pendingRoutes: 0,
    totalDrivers: 0,
    totalCustomers: 0,
  });
  const [todayRoutes, setTodayRoutes] = useState([]);
  const [hasAdminUser, setHasAdminUser] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      checkForAdminUser();
      fetchStats();
      fetchTodayRoutes();
    }
  }, [user]);

  const checkForAdminUser = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);
      
      if (error) throw error;
      setHasAdminUser(data.length > 0);
    } catch (error) {
      console.error('Error checking for admin:', error);
      setHasAdminUser(true); // Default to true to avoid showing setup
    }
  };

  const fetchStats = async () => {
    try {
      const [routesRes, driversRes, customersRes] = await Promise.all([
        supabase.from('routes').select('status'),
        supabase.from('drivers').select('id'),
        supabase.from('customers').select('id'),
      ]);

      const routes = routesRes.data || [];
      const completedRoutes = routes.filter(r => r.status === 'completed').length;
      const pendingRoutes = routes.filter(r => r.status === 'pending').length;

      setStats({
        totalRoutes: routes.length,
        completedRoutes,
        pendingRoutes,
        totalDrivers: driversRes.data?.length || 0,
        totalCustomers: customersRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const fetchTodayRoutes = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('routes')
        .select(`
          *,
          drivers(name),
          vehicles(plate)
        `)
        .eq('route_date', today)
        .order('created_at', { ascending: false });

      // If user is a driver, only show their routes
      if (profile?.role === 'driver' && profile?.driver_id) {
        query = query.eq('driver_id', profile.driver_id);
      }

      const { data } = await query;
      setTodayRoutes(data || []);
    } catch (error) {
      console.error('Erro ao buscar rotas de hoje:', error);
    }
  };

  const handleAdminCreated = () => {
    setHasAdminUser(true);
    // Reload the page to update the profile
    window.location.reload();
  };

  // Show admin setup if no admin exists
  if (hasAdminUser === false) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <FirstAdminSetup onAdminCreated={handleAdminCreated} />
      </div>
    );
  }

  if (hasAdminUser === null) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Dashboard - {profile?.role === 'admin' ? 'Administrador' : 'Motorista'}
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo, {profile?.name || user?.email}
        </p>
      </div>

      {/* Cards de estatísticas */}
      {profile?.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Rotas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRoutes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rotas Concluídas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedRoutes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Motoristas</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDrivers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rotas de hoje */}
      <Card>
        <CardHeader>
          <CardTitle>
            {profile?.role === 'admin' ? 'Rotas de Hoje' : 'Minhas Rotas de Hoje'}
          </CardTitle>
          <CardDescription>
            {profile?.role === 'admin' 
              ? 'Rotas programadas para hoje' 
              : 'Suas rotas programadas para hoje'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayRoutes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {profile?.role === 'admin' 
                ? 'Nenhuma rota programada para hoje' 
                : 'Você não tem rotas programadas para hoje'
              }
            </p>
          ) : (
            <div className="space-y-4">
              {todayRoutes.map((route: any) => (
                <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{route.drivers?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Veículo: {route.vehicles?.plate}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {route.status === 'pending' ? 'Pendente' : 
                               route.status === 'in_progress' ? 'Em andamento' : 'Concluída'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions for drivers */}
      {profile?.role === 'driver' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium text-emerald-600">Disponível</p>
              <p className="text-sm text-muted-foreground">
                Aguardando atribuição de rota
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Rotas Concluídas (Mês)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.completedRoutes}</p>
              <p className="text-sm text-muted-foreground">
                Este mês
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}