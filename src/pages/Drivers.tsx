import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, Phone, Mail, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: ''
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os motoristas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem gerenciar motoristas.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingDriver) {
        const { error } = await supabase
          .from('drivers')
          .update(formData)
          .eq('id', editingDriver.id);
        
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Motorista atualizado com sucesso!",
        });
      } else {
        // Criar motorista primeiro
        const { data: driverData, error: driverError } = await supabase
          .from('drivers')
          .insert([formData])
          .select()
          .single();
        
        if (driverError) throw driverError;

        // Se tem email, criar conta de usuário automaticamente
        if (formData.email) {
          const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
          
          const { error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: tempPassword,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: {
                name: formData.name,
                role: 'driver',
                driver_id: driverData.id
              }
            }
          });

          if (authError) {
            console.warn('Erro ao criar conta de usuário:', authError);
            toast({
              title: "Sucesso",
              description: "Motorista cadastrado! Erro ao criar conta de usuário - pode ser criada posteriormente.",
            });
          } else {
            toast({
              title: "Sucesso",
              description: `Motorista e conta criados com sucesso! Email de confirmação enviado para ${formData.email}`,
            });
          }
        } else {
          toast({
            title: "Sucesso",
            description: "Motorista cadastrado com sucesso! Adicione um email para criar conta de usuário.",
          });
        }
      }

      setIsDialogOpen(false);
      setEditingDriver(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        license_number: ''
      });
      fetchDrivers();
    } catch (error) {
      console.error('Erro ao salvar motorista:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar motorista.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (driver: any) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email || '',
      phone: driver.phone || '',
      license_number: driver.license_number || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir motoristas.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este motorista?')) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Motorista excluído com sucesso!",
      });
      fetchDrivers();
    } catch (error) {
      console.error('Erro ao excluir motorista:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir motorista.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando motoristas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Motoristas</h1>
          <p className="text-muted-foreground">
            Gerencie os motoristas da sua equipe
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingDriver(null);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  license_number: ''
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Motorista
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDriver ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
                <DialogDescription>
                  {editingDriver ? 'Edite as informações do motorista' : 'Cadastre um novo motorista'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="license_number">Número da CNH</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingDriver ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {drivers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum motorista cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece adicionando o primeiro motorista à sua equipe
            </p>
            {isAdmin && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar primeiro motorista
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver: any) => (
            <Card key={driver.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {driver.name}
                </CardTitle>
                <CardDescription>
                  CNH: {driver.license_number || 'Não informada'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {driver.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{driver.email}</span>
                  </div>
                )}
                
                {driver.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{driver.phone}</span>
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  {isAdmin && (
                    <>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(driver)}>
                        <Edit2 className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDelete(driver.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" className="flex-1">
                    Ver Rotas
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}