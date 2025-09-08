import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Clock, Package, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ImageViewer from './ImageViewer';

interface CustomerDeliveriesProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
}

export default function CustomerDeliveries({ isOpen, onClose, customerId, customerName }: CustomerDeliveriesProps) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string, title: string} | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchDeliveries();
    }
  }, [isOpen, customerId]);

  const fetchDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('route_stops')
        .select(`
          *,
          routes(
            id,
            route_date,
            status,
            drivers(name),
            vehicles(plate, brand, model)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Erro ao buscar entregas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as entregas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (completed: boolean) => {
    return (
      <Badge variant={completed ? "default" : "outline"}>
        {completed ? 'Entregue' : 'Pendente'}
      </Badge>
    );
  };

  const openImageViewer = (src: string, alt: string, title: string = '') => {
    setSelectedImage({ src, alt, title });
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center p-8">Carregando entregas...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Entregas - {customerName}</DialogTitle>
            <DialogDescription>
              Visualize todas as entregas realizadas para este cliente
            </DialogDescription>
          </DialogHeader>

          {deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma entrega encontrada</h3>
              <p className="text-muted-foreground text-center">
                Este cliente ainda não possui entregas registradas no sistema
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deliveries.map((delivery: any) => (
                <Card key={delivery.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Entrega #{delivery.stop_number}
                          {getStatusBadge(delivery.completed)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(delivery.routes.route_date).toLocaleDateString('pt-BR')}
                          </span>
                          <span>
                            Motorista: {delivery.routes.drivers?.name || 'Não definido'}
                          </span>
                          <span>
                            Veículo: {delivery.routes.vehicles?.plate || 'Não definido'}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Material Info */}
                    {delivery.material_description && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Material:</h4>
                        <p className="text-sm text-muted-foreground">{delivery.material_description}</p>
                        {(delivery.weight_kg > 0 || delivery.volume_m3 > 0) && (
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            {delivery.weight_kg > 0 && <span>Peso: {delivery.weight_kg}kg</span>}
                            {delivery.volume_m3 > 0 && <span>Volume: {delivery.volume_m3}m³</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Times */}
                    {(delivery.arrival_time || delivery.departure_time) && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Horários:</h4>
                        <div className="flex gap-4 text-sm">
                          {delivery.arrival_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Chegada: {delivery.arrival_time}
                            </span>
                          )}
                          {delivery.departure_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Saída: {delivery.departure_time}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Receiver */}
                    {delivery.receiver_name && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Recebedor:</h4>
                        <p className="text-sm">{delivery.receiver_name}</p>
                        {delivery.receiver_email && (
                          <p className="text-xs text-muted-foreground">{delivery.receiver_email}</p>
                        )}
                        {delivery.receiver_department && (
                          <p className="text-xs text-muted-foreground">Depto: {delivery.receiver_department}</p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {delivery.notes && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Observações:</h4>
                        <p className="text-sm text-muted-foreground">{delivery.notes}</p>
                      </div>
                    )}

                    {/* Photos */}
                    {delivery.photos && delivery.photos.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Fotos da Entrega:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {delivery.photos.map((photo: string, index: number) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => openImageViewer(photo, `Foto ${index + 1}`, `Entrega ${delivery.stop_number}`)}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                                onClick={() => openImageViewer(photo, `Foto ${index + 1}`, `Entrega ${delivery.stop_number}`)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signature */}
                    {delivery.signature_url && (
                      <div>
                        <h4 className="font-medium text-sm mb-2">Assinatura:</h4>
                        <img
                          src={delivery.signature_url}
                          alt="Assinatura"
                          className="max-h-20 border rounded cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => openImageViewer(delivery.signature_url, 'Assinatura', `Entrega ${delivery.stop_number}`)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedImage && (
        <ImageViewer
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          src={selectedImage.src}
          alt={selectedImage.alt}
          title={selectedImage.title}
        />
      )}
    </>
  );
}