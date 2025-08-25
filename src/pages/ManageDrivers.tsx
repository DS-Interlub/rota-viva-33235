import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Mail, User, Phone, IdCard } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  has_user_account: boolean;
}

export default function ManageDrivers() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  // Form states
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverLicense, setDriverLicense] = useState('');

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDrivers();
    }
  }, [profile]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          profiles!inner(user_id)
        `);

      if (error) throw error;

      const driversWithUserStatus = data?.map(driver => ({
        ...driver,
        has_user_account: driver.profiles?.length > 0
      })) || [];

      setDrivers(driversWithUserStatus);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar motoristas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createDriver = async () => {
    if (!driverName || !driverEmail) {
      toast({
        title: 'Erro',
        description: 'Nome e email são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      // Create driver first
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .insert([{
          name: driverName,
          email: driverEmail,
          phone: driverPhone,
          license_number: driverLicense
        }])
        .select()
        .single();

      if (driverError) throw driverError;

      // Create user account
      const { error: authError } = await supabase.auth.signUp({
        email: driverEmail,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: driverName,
            role: 'driver',
            driver_id: driverData.id
          }
        }
      });

      if (authError) throw authError;

      toast({
        title: 'Sucesso',
        description: `Motorista e conta criados com sucesso! Email de confirmação enviado para ${driverEmail}`,
      });

      setDriverName('');
      setDriverEmail('');
      setDriverPhone('');
      setDriverLicense('');
      setIsDialogOpen(false);
      fetchDrivers();
    } catch (error: any) {
      console.error('Error creating driver:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar motorista',
        variant: 'destructive',
      });
    }
  };

  const createUserAccount = async (driver: Driver) => {
    if (!driver.email) {
      toast({
        title: 'Erro',
        description: 'Email é obrigatório para criar conta de usuário',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingAccount(true);
    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

      const { error } = await supabase.auth.signUp({
        email: driver.email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: driver.name,
            role: 'driver'
          }
        }
      });

      if (error) throw error;

      // Update driver with user link
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ email: driver.email })
        .eq('id', driver.id);

      if (updateError) throw updateError;

      toast({
        title: 'Sucesso',
        description: `Conta criada para ${driver.name}. Um email de confirmação foi enviado.`,
      });

      fetchDrivers();
    } catch (error: any) {
      console.error('Error creating user account:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar conta de usuário',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-destructive">Acesso Negado</h2>
        <p className="text-muted-foreground mt-2">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Motoristas</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Motorista</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nome completo do motorista"
                />
              </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="license">CNH</Label>
                <Input
                  id="license"
                  value={driverLicense}
                  onChange={(e) => setDriverLicense(e.target.value)}
                  placeholder="Número da CNH"
                />
              </div>
              <Button 
                onClick={createDriver} 
                className="w-full"
                disabled={!driverName || !driverEmail}
              >
                Criar Motorista com Conta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhum motorista encontrado</h3>
            <p className="text-muted-foreground mb-4">Comece criando o primeiro motorista.</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Motorista
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => (
            <Card key={driver.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {driver.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {driver.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" />
                    {driver.email}
                  </div>
                )}
                {driver.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4" />
                    {driver.phone}
                  </div>
                )}
                {driver.license_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <IdCard className="h-4 w-4" />
                    CNH: {driver.license_number}
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  {driver.has_user_account ? (
                    <div className="text-sm text-emerald-600 font-medium">
                      ✓ Conta de usuário ativa
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createUserAccount(driver)}
                      disabled={isCreatingAccount || !driver.email}
                      className="w-full"
                    >
                      {isCreatingAccount ? 'Criando...' : 'Criar Conta de Usuário'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}