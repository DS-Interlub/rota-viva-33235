import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Truck, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    plate: '',
    brand: '',
    model: '',
    year: '',
    km_current: ''
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('plate');

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os veículos.",
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
        description: "Apenas administradores podem gerenciar veículos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const vehicleData = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        km_current: formData.km_current ? parseInt(formData.km_current) : 0
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id);
        
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Veículo atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('vehicles')
          .insert([vehicleData]);
        
        if (error) throw error;
        toast({
          title: "Sucesso", 
          description: "Veículo cadastrado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingVehicle(null);
      setFormData({ plate: '', brand: '', model: '', year: '', km_current: '' });
      fetchVehicles();
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar veículo.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate: vehicle.plate,
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      year: vehicle.year?.toString() || '',
      km_current: vehicle.km_current?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir veículos.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Veículo excluído com sucesso!",
      });
      fetchVehicles();
    } catch (error) {
      console.error('Erro ao excluir veículo:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir veículo.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando veículos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Veículos</h1>
          <p className="text-muted-foreground">
            Gerencie a frota de veículos da empresa
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingVehicle(null);
                setFormData({ plate: '', brand: '', model: '', year: '', km_current: '' });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Veículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
                <DialogDescription>
                  {editingVehicle ? 'Edite as informações do veículo' : 'Adicione um novo veículo à frota'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="plate">Placa *</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="year">Ano</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="km_current">Quilometragem Atual</Label>
                  <Input
                    id="km_current"
                    type="number"
                    value={formData.km_current}
                    onChange={(e) => setFormData({ ...formData, km_current: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingVehicle ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum veículo encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              {isAdmin ? 'Comece adicionando o primeiro veículo à frota' : 'Nenhum veículo cadastrado no sistema'}
            </p>
            {isAdmin && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar veículo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle: any) => (
            <Card key={vehicle.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    {vehicle.plate}
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(vehicle)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(vehicle.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
                <CardDescription>
                  {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Quilometragem: {vehicle.km_current || 0} km
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}