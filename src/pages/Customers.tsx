import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building, MapPin, Phone, Mail, Upload, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import ImportExcel from '@/components/ImportExcel';
import CustomerDeliveries from '@/components/CustomerDeliveries';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedCustomerDeliveries, setSelectedCustomerDeliveries] = useState<{id: string, name: string} | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    is_transporter: false,
    transporter_id: null,
    delivery_notes: ''
  });
  const { toast } = useToast();
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          transporter:transporter_id(
            id,
            name,
            address
          )
        `)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
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
        description: "Apenas administradores podem gerenciar clientes.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);
        
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([formData]);
        
        if (error) throw error;
        toast({
          title: "Sucesso",
          description: "Cliente cadastrado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingCustomer(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
        email: '',
        is_transporter: false,
        transporter_id: null,
        delivery_notes: ''
      });
      fetchCustomers();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar cliente.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      address: customer.address,
      city: customer.city || '',
      state: customer.state || '',
      zip_code: customer.zip_code || '',
      phone: customer.phone || '',
      email: customer.email || '',
      is_transporter: customer.is_transporter || false,
      transporter_id: customer.transporter_id || null,
      delivery_notes: customer.delivery_notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir clientes.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso!",
      });
      fetchCustomers();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir cliente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando clientes...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie seus clientes e pontos de entrega
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingCustomer(null);
                    setFormData({
                      name: '',
                      address: '',
                      city: '',
                      state: '',
                      zip_code: '',
                      phone: '',
                      email: '',
                      is_transporter: false,
                      transporter_id: null,
                      delivery_notes: ''
                    });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                    <DialogDescription>
                      {editingCustomer ? 'Edite as informações do cliente' : 'Cadastre um novo cliente'}
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
                      <Label htmlFor="address">Endereço *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">Estado</Label>
                        <select
                          id="state"
                          value={formData.state}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                          className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        >
                          <option value="">Selecione o estado</option>
                          <option value="AC">Acre</option>
                          <option value="AL">Alagoas</option>
                          <option value="AP">Amapá</option>
                          <option value="AM">Amazonas</option>
                          <option value="BA">Bahia</option>
                          <option value="CE">Ceará</option>
                          <option value="DF">Distrito Federal</option>
                          <option value="ES">Espírito Santo</option>
                          <option value="GO">Goiás</option>
                          <option value="MA">Maranhão</option>
                          <option value="MT">Mato Grosso</option>
                          <option value="MS">Mato Grosso do Sul</option>
                          <option value="MG">Minas Gerais</option>
                          <option value="PA">Pará</option>
                          <option value="PB">Paraíba</option>
                          <option value="PR">Paraná</option>
                          <option value="PE">Pernambuco</option>
                          <option value="PI">Piauí</option>
                          <option value="RJ">Rio de Janeiro</option>
                          <option value="RN">Rio Grande do Norte</option>
                          <option value="RS">Rio Grande do Sul</option>
                          <option value="RO">Rondônia</option>
                          <option value="RR">Roraima</option>
                          <option value="SC">Santa Catarina</option>
                          <option value="SP">São Paulo</option>
                          <option value="SE">Sergipe</option>
                          <option value="TO">Tocantins</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="zip_code">CEP</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
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
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_transporter"
                        checked={formData.is_transporter}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_transporter: checked })}
                      />
                      <Label htmlFor="is_transporter">É transportadora</Label>
                    </div>
                    {!formData.is_transporter && (
                      <div>
                        <Label htmlFor="transporter_id">Transportadora (opcional)</Label>
                        <select
                          id="transporter_id"
                          value={formData.transporter_id || ''}
                          onChange={(e) => setFormData({ ...formData, transporter_id: e.target.value || null })}
                          className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        >
                          <option value="">Sem transportadora</option>
                          {customers.filter((c: any) => c.is_transporter).map((transporter: any) => (
                            <option key={transporter.id} value={transporter.id}>
                              {transporter.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Se selecionado, a entrega será feita no endereço da transportadora
                        </p>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="delivery_notes">Observações de Entrega</Label>
                      <Textarea
                        id="delivery_notes"
                        value={formData.delivery_notes}
                        onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                        placeholder="Ex: Horário de recebimento das 08:00 até as 15:00, portão azul..."
                        rows={3}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingCustomer ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {customers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente cadastrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Comece adicionando seus primeiros clientes ou importe de uma planilha
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Excel
                </Button>
                {isAdmin && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar primeiro cliente
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer: any) => (
              <Card key={customer.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    {customer.name}
                    {customer.is_transporter && (
                      <Badge variant="secondary">Transportadora</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {customer.city}, {customer.state}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customer.address}</span>
                  </div>

                  {customer.transporter && (
                    <div className="text-sm p-2 bg-muted rounded">
                      <span className="font-medium">Entrega via: </span>
                      {customer.transporter.name}
                    </div>
                  )}

                  {customer.delivery_notes && (
                    <div className="text-sm p-2 bg-blue-50 dark:bg-blue-950 rounded">
                      <span className="font-medium">Observações: </span>
                      {customer.delivery_notes}
                    </div>
                  )}
                  
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                  )}
                  
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{customer.email}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    {isAdmin && (
                      <>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(customer)}>
                          <Edit2 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDelete(customer.id)}>
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setSelectedCustomerDeliveries({id: customer.id, name: customer.name})}
                    >
                      Ver Entregas
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <ImportExcel
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={fetchCustomers}
        type="customers"
      />
      
      {selectedCustomerDeliveries && (
        <CustomerDeliveries
          isOpen={!!selectedCustomerDeliveries}
          onClose={() => setSelectedCustomerDeliveries(null)}
          customerId={selectedCustomerDeliveries.id}
          customerName={selectedCustomerDeliveries.name}
        />
      )}
    </>
  );
}