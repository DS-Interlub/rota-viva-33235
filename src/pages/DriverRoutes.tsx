import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Clock, CheckCircle, Camera, PenTool, Play, Square, Eye, ArrowUp, ArrowDown, ListOrdered, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import PhotoCapture from '@/components/PhotoCapture';
import SignatureCapture from '@/components/SignatureCapture';
import DateFilters from '@/components/DateFilters';
import ImageViewer from '@/components/ImageViewer';

export default function DriverRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false);
  const [stopFormData, setStopFormData] = useState({
    notes: '',
    photos: [],
    signature_url: '',
    arrival_time: '',
    departure_time: '',
    receiver_name: '',
    receiver_email: '',
    receiver_department: ''
  });
  const [isKmDialogOpen, setIsKmDialogOpen] = useState(false);
  const [kmFormData, setKmFormData] = useState({
    initial_km: '',
    final_km: '',
    base_departure_time: '',
    base_arrival_time: ''
  });
  const [isPhotoCaptureOpen, setIsPhotoCaptureOpen] = useState(false);
  const [isSignatureCaptureOpen, setIsSignatureCaptureOpen] = useState(false);
  const [dateFilters, setDateFilters] = useState<{startDate?: string, endDate?: string}>({});
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string, title: string} | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [signedUrls, setSignedUrls] = useState<{[key: string]: string}>({});
  const [reorderMode, setReorderMode] = useState<{routeId: string, stops: any[]} | null>(null);
  const { toast } = useToast();
  const { profile, user } = useAuth();

  const isDriver = profile?.role === 'driver';


  const fetchDriverRoutes = useCallback(async () => {
    if (!profile?.driver_id) return;

    try {
      let routesQuery = supabase
        .from('routes')
        .select(`
          *,
          vehicles(plate, brand, model),
          route_stops(
            *,
            customers(
              name, 
              address,
              delivery_notes,
              transporter_id,
              transporter:transporter_id(
                name,
                address
              )
            )
          )
        `)
        .eq('driver_id', profile.driver_id);

      // Apply date filters
      if (dateFilters.startDate && dateFilters.endDate) {
        routesQuery = routesQuery
          .gte('route_date', dateFilters.startDate)
          .lte('route_date', dateFilters.endDate);
      }

      const { data, error } = await routesQuery.order('route_date', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
      
      // Generate signed URLs for private images
      await generateSignedUrls(data || []);
    } catch (error) {
      console.error('Erro ao buscar rotas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas rotas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.driver_id, dateFilters, toast]);

  const generateSignedUrls = async (routesData: any[]) => {
    const urlsToSign: {[key: string]: string} = {};
    
    for (const route of routesData) {
      if (route.route_stops) {
        for (const stop of route.route_stops) {
          // Handle photos
          if (stop.photos && Array.isArray(stop.photos)) {
            for (let i = 0; i < stop.photos.length; i++) {
              const photoUrl = stop.photos[i];
              if (photoUrl && !photoUrl.includes('signed')) {
                try {
                  // Extract the path from the full URL
                  const urlParts = photoUrl.split('/storage/v1/object/public/');
                  if (urlParts.length > 1) {
                    const path = urlParts[1];
                    const { data: signedData } = await supabase.storage
                      .from('delivery-photos')
                      .createSignedUrl(path.replace('delivery-photos/', ''), 3600); // 1 hour expiry
                    
                    if (signedData?.signedUrl) {
                      urlsToSign[photoUrl] = signedData.signedUrl;
                    }
                  }
                } catch (error) {
                  console.error('Error generating signed URL for photo:', error);
                }
              }
            }
          }
          
          // Handle signature
          if (stop.signature_url && !stop.signature_url.includes('signed')) {
            try {
              const urlParts = stop.signature_url.split('/storage/v1/object/public/');
              if (urlParts.length > 1) {
                const path = urlParts[1];
                const { data: signedData } = await supabase.storage
                  .from('signatures')
                  .createSignedUrl(path.replace('signatures/', ''), 3600); // 1 hour expiry
                
                if (signedData?.signedUrl) {
                  urlsToSign[stop.signature_url] = signedData.signedUrl;
                }
              }
            } catch (error) {
              console.error('Error generating signed URL for signature:', error);
            }
          }
        }
      }
    }
    
    setSignedUrls(urlsToSign);
  };

  const getSignedUrl = (originalUrl: string) => {
    return signedUrls[originalUrl] || originalUrl;
  };

  const toggleRouteExpansion = (routeId: string) => {
    const newExpanded = new Set(expandedRoutes);
    if (newExpanded.has(routeId)) {
      newExpanded.delete(routeId);
    } else {
      newExpanded.add(routeId);
    }
    setExpandedRoutes(newExpanded);
  };

  useEffect(() => {
    if (isDriver) {
      fetchDriverRoutes();
    }
  }, [isDriver, fetchDriverRoutes]);

  const openKmDialog = (route: any, action: 'start' | 'complete') => {
    setSelectedRoute(route);
    setKmFormData({
      initial_km: route.initial_km?.toString() || '',
      final_km: route.final_km?.toString() || '',
      base_departure_time: route.base_departure_time || '',
      base_arrival_time: route.base_arrival_time || ''
    });
    setIsKmDialogOpen(true);
  };

  const startRoute = async () => {
    if (!selectedRoute || !kmFormData.initial_km || !kmFormData.base_departure_time) {
      toast({
        title: "Erro",
        description: "Por favor, informe o KM inicial e horário de saída da base.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('routes')
        .update({ 
          status: 'in_progress',
          initial_km: parseInt(kmFormData.initial_km),
          base_departure_time: kmFormData.base_departure_time
        })
        .eq('id', selectedRoute.id);

      if (error) throw error;
      
      toast({
        title: "Rota iniciada",
        description: "Boa viagem! Lembre-se de marcar as entregas conforme forem sendo concluídas.",
      });
      setIsKmDialogOpen(false);
      fetchDriverRoutes();
    } catch (error) {
      console.error('Erro ao iniciar rota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a rota.",
        variant: "destructive",
      });
    }
  };

  const completeRoute = async () => {
    if (!selectedRoute || !kmFormData.final_km || !kmFormData.base_arrival_time) {
      toast({
        title: "Erro",
        description: "Por favor, informe o KM final e horário de chegada na base.",
        variant: "destructive",
      });
      return;
    }

    try {
      const finalKm = parseInt(kmFormData.final_km);
      const initialKm = parseInt(kmFormData.initial_km) || selectedRoute.initial_km || 0;
      const totalKm = finalKm - initialKm;

      const { error } = await supabase
        .from('routes')
        .update({ 
          status: 'completed',
          final_km: finalKm,
          base_arrival_time: kmFormData.base_arrival_time
        })
        .eq('id', selectedRoute.id);

      if (error) throw error;
      
      toast({
        title: "Rota concluída",
        description: "Parabéns! Rota finalizada com sucesso.",
      });
      setIsKmDialogOpen(false);
      fetchDriverRoutes();
    } catch (error) {
      console.error('Erro ao concluir rota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível concluir a rota.",
        variant: "destructive",
      });
    }
  };

  const openStopDialog = (route: any, stop: any) => {
    setSelectedRoute(route);
    setSelectedStop(stop);
    setStopFormData({
      notes: stop.notes || '',
      photos: stop.photos || [],
      signature_url: stop.signature_url || '',
      arrival_time: stop.arrival_time || '',
      departure_time: stop.departure_time || '',
      receiver_name: stop.receiver_name || '',
      receiver_email: stop.receiver_email || '',
      receiver_department: stop.receiver_department || ''
    });
    setIsStopDialogOpen(true);
  };

  const completeStop = async () => {
    if (!selectedStop || !selectedRoute || !stopFormData.arrival_time || !stopFormData.departure_time || !stopFormData.receiver_name) {
      toast({
        title: "Erro",
        description: "Por favor, preencha horário de chegada, saída e nome do responsável.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('route_stops')
        .update({
          completed: true,
          notes: stopFormData.notes,
          photos: stopFormData.photos,
          signature_url: stopFormData.signature_url,
          arrival_time: stopFormData.arrival_time,
          departure_time: stopFormData.departure_time,
          receiver_name: stopFormData.receiver_name,
          receiver_email: stopFormData.receiver_email,
          receiver_department: stopFormData.receiver_department,
          delivery_time: stopFormData.departure_time
        })
        .eq('id', selectedStop.id);

      if (error) throw error;

      toast({
        title: "Entrega concluída",
        description: "Entrega marcada como realizada com sucesso!",
      });

      setIsStopDialogOpen(false);
      fetchDriverRoutes();
    } catch (error) {
      console.error('Erro ao completar entrega:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a entrega como concluída.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = useCallback((status: string) => {
    const statusMap = {
      pending: { label: 'Pendente', variant: 'outline' as const, color: 'text-yellow-600' },
      in_progress: { label: 'Em andamento', variant: 'default' as const, color: 'text-blue-600' },
      completed: { label: 'Concluída', variant: 'secondary' as const, color: 'text-green-600' },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={statusInfo.variant} className={statusInfo.color}>{statusInfo.label}</Badge>;
  }, []);

  const openImageViewer = (src: string, alt: string, title: string = '') => {
    const signedUrl = getSignedUrl(src);
    setSelectedImage({ src: signedUrl, alt, title });
  };

  const startReorderMode = (route: any) => {
    const sortedStops = [...route.route_stops].sort((a, b) => a.stop_number - b.stop_number);
    setReorderMode({ routeId: route.id, stops: sortedStops });
  };

  const moveStop = (fromIndex: number, toIndex: number) => {
    if (!reorderMode) return;
    
    const newStops = [...reorderMode.stops];
    const [movedStop] = newStops.splice(fromIndex, 1);
    newStops.splice(toIndex, 0, movedStop);
    
    // Atualizar stop_number de todas as paradas
    const updatedStops = newStops.map((stop, index) => ({
      ...stop,
      stop_number: index + 1
    }));
    
    setReorderMode({ ...reorderMode, stops: updatedStops });
  };

  const saveReorderedRoute = async () => {
    if (!reorderMode) return;

    try {
      // Atualizar ordem das paradas no banco
      for (const stop of reorderMode.stops) {
        const { error } = await supabase
          .from('route_stops')
          .update({ stop_number: stop.stop_number })
          .eq('id', stop.id);
        
        if (error) throw error;
      }

      toast({
        title: "Rota reordenada",
        description: "A ordem das paradas foi atualizada com sucesso!",
      });

      setReorderMode(null);
      fetchDriverRoutes();
    } catch (error) {
      console.error('Erro ao reordenar rota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reordenar a rota.",
        variant: "destructive",
      });
    }
  };

  const filteredRoutes = useMemo(() => {
    return routes;
  }, [routes]);

  if (!isDriver) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground">Esta área é exclusiva para motoristas.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Carregando suas rotas...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minhas Rotas</h1>
        <p className="text-muted-foreground">
          Gerencie suas entregas e marque as conclusões
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <DateFilters onFilterChange={setDateFilters} />
        </div>
        
        <div className="lg:col-span-3">
          {filteredRoutes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma rota encontrada</h3>
                <p className="text-muted-foreground text-center">
                  Você não possui rotas atribuídas no momento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRoutes.map((route: any) => (
            <Card key={route.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      {new Date(route.route_date).toLocaleDateString('pt-BR')}
                      {getStatusBadge(route.status)}
                    </CardTitle>
                    <CardDescription>
                      Veículo: {route.vehicles?.brand} {route.vehicles?.model} - {route.vehicles?.plate}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {route.status === 'pending' && (
                      <Button size="sm" onClick={() => openKmDialog(route, 'start')}>
                        <Play className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    {route.status === 'in_progress' && (
                      <>
                        {reorderMode?.routeId === route.id ? (
                          <>
                            <Button size="sm" variant="default" onClick={saveReorderedRoute}>
                              <Save className="h-4 w-4 mr-1" />
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setReorderMode(null)}>
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => startReorderMode(route)}>
                              <ListOrdered className="h-4 w-4 mr-1" />
                              Reordenar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openKmDialog(route, 'complete')}>
                              <Square className="h-4 w-4 mr-1" />
                              Finalizar
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => toggleRouteExpansion(route.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {expandedRoutes.has(route.id) ? 'Ocultar' : 'Detalhes'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <strong>Saída da Base:</strong> {route.base_departure_time || 'Não definido'}
                    </div>
                    <div>
                      <strong>Retorno à Base:</strong> {route.base_arrival_time || 'Não definido'}
                    </div>
                    <div>
                      <strong>KM:</strong> {route.initial_km || 'Não definido'} - {route.final_km || 'Não definido'} 
                      {route.total_km && ` (${route.total_km} km)`}
                    </div>
                    <div>
                      <strong>Entregas:</strong> {route.route_stops?.filter((stop: any) => stop.completed).length || 0} de {route.route_stops?.length || 0}
                    </div>
                  </div>

                      {route.route_stops && route.route_stops.length > 0 && expandedRoutes.has(route.id) && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">Entregas:</h4>
                            {reorderMode?.routeId === route.id && (
                              <Badge variant="secondary">Modo de Reordenação Ativo</Badge>
                            )}
                          </div>
                          <div className="space-y-3">
                            {(reorderMode?.routeId === route.id ? reorderMode.stops : route.route_stops.sort((a: any, b: any) => a.stop_number - b.stop_number))
                              .map((stop: any, index: number) => (
                              <div
                                key={stop.id}
                                className={`rounded-lg border ${
                                  stop.completed 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between p-3">
                                   <div className="flex-1">
                                     <div className="flex items-center gap-2">
                                       <span className="font-medium">#{stop.stop_number}</span>
                                       <span>{stop.customers?.name}</span>
                                       {stop.completed && <CheckCircle className="h-4 w-4 text-green-600" />}
                                     </div>
                                     <p className="text-sm text-muted-foreground mt-1">
                                       {stop.customers?.address}
                                     </p>
                                     {stop.customers?.transporter_id && stop.customers?.transporter && (
                                       <p className="text-sm text-blue-600 mt-1">
                                         🚚 Entrega via: {stop.customers.transporter.name}
                                       </p>
                                     )}
                                     {stop.customers?.delivery_notes && (
                                       <p className="text-sm bg-yellow-50 dark:bg-yellow-950 p-2 rounded mt-2">
                                         ℹ️ {stop.customers.delivery_notes}
                                       </p>
                                     )}
                                   </div>
                                   <div className="flex items-center gap-2">
                                     {reorderMode?.routeId === route.id && !stop.completed && (
                                       <div className="flex flex-col gap-1">
                                         <Button
                                           size="sm"
                                           variant="outline"
                                           disabled={index === 0}
                                           onClick={() => moveStop(index, index - 1)}
                                         >
                                           <ArrowUp className="h-3 w-3" />
                                         </Button>
                                         <Button
                                           size="sm"
                                           variant="outline"
                                           disabled={index === (reorderMode?.stops.length || 0) - 1}
                                           onClick={() => moveStop(index, index + 1)}
                                         >
                                           <ArrowDown className="h-3 w-3" />
                                         </Button>
                                       </div>
                                     )}
                                     {route.status === 'in_progress' && !stop.completed && !reorderMode && (
                                       <Button
                                         size="sm"
                                         onClick={() => openStopDialog(route, stop)}
                                       >
                                         <CheckCircle className="h-4 w-4 mr-1" />
                                         Entregar
                                       </Button>
                                     )}
                                   </div>
                                 </div>
                                
                                {/* Detalhes da entrega quando completada */}
                                {stop.completed && (
                                  <div className="px-3 pb-3 border-t border-green-200 mt-2 pt-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                      <div className="text-sm">
                                        <strong>Horários:</strong> {stop.arrival_time || 'N/A'} - {stop.departure_time || 'N/A'}
                                      </div>
                                      <div className="text-sm">
                                        <strong>Recebido por:</strong> {stop.receiver_name || 'N/A'}
                                      </div>
                                      {stop.receiver_email && (
                                        <div className="text-sm">
                                          <strong>E-mail:</strong> {stop.receiver_email}
                                        </div>
                                      )}
                                      {stop.receiver_department && (
                                        <div className="text-sm">
                                          <strong>Setor:</strong> {stop.receiver_department}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {stop.notes && (
                                      <div className="mb-3">
                                        <strong className="text-sm">Observações:</strong>
                                        <p className="text-sm text-muted-foreground mt-1">{stop.notes}</p>
                                      </div>
                                    )}
                                    
                                    {/* Fotos da entrega */}
                                    {stop.photos && stop.photos.length > 0 && (
                                      <div className="mb-3">
                                        <strong className="text-sm">Fotos da Entrega:</strong>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                          {stop.photos.map((photoUrl: string, index: number) => (
                                            <div key={index} className="relative group">
                                            <img
                                               src={getSignedUrl(photoUrl)}
                                               alt={`Foto da entrega ${index + 1}`}
                                               className="w-full h-24 object-cover rounded-lg border-2 border-border cursor-pointer hover:opacity-80 transition-all shadow-md bg-white"
                                               onClick={() => openImageViewer(photoUrl, `Foto da entrega ${index + 1}`, `${stop.customers?.name} - Entrega #${stop.stop_number}`)}
                                               onError={(e) => {
                                                 console.error('Failed to load photo:', photoUrl);
                                                 e.currentTarget.src = '/placeholder.svg';
                                                 e.currentTarget.classList.add('opacity-50');
                                               }}
                                             />
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 hover:bg-black/30"
                                              onClick={() => openImageViewer(photoUrl, `Foto da entrega ${index + 1}`, `${stop.customers?.name} - Entrega #${stop.stop_number}`)}
                                            >
                                              <Eye className="h-4 w-4 text-white" />
                                           </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Assinatura */}
                                    {stop.signature_url && (
                                      <div>
                                        <strong className="text-sm">Assinatura:</strong>
                                         <div className="mt-2">
                                             <img
                                               src={getSignedUrl(stop.signature_url)}
                                               alt="Assinatura do responsável"
                                               className="max-w-sm h-24 object-contain border-2 border-border rounded-lg bg-white cursor-pointer hover:opacity-80 transition-all shadow-md"
                                               onClick={() => openImageViewer(stop.signature_url, 'Assinatura do responsável', `${stop.customers?.name} - Assinatura #${stop.stop_number}`)}
                                               onError={(e) => {
                                                 console.error('Failed to load signature:', stop.signature_url);
                                                 e.currentTarget.src = '/placeholder.svg';
                                                 e.currentTarget.classList.add('opacity-50');
                                               }}
                                             />
                                         </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                </div>
              </CardContent>
            </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          src={selectedImage.src}
          alt={selectedImage.alt}
          title={selectedImage.title}
          isOpen={true}
          onClose={() => setSelectedImage(null)}
        />
      )}

      {/* Stop Completion Dialog */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Entrega</DialogTitle>
            <DialogDescription>
              {selectedStop && `Entrega #${selectedStop.stop_number} - ${selectedStop.customers?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="arrival_time">Horário de Chegada *</Label>
                <Input
                  id="arrival_time"
                  type="time"
                  value={stopFormData.arrival_time}
                  onChange={(e) => setStopFormData({ ...stopFormData, arrival_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="departure_time">Horário de Saída *</Label>
                <Input
                  id="departure_time"
                  type="time"
                  value={stopFormData.departure_time}
                  onChange={(e) => setStopFormData({ ...stopFormData, departure_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="receiver_name">Responsável *</Label>
                <Input
                  id="receiver_name"
                  value={stopFormData.receiver_name}
                  onChange={(e) => setStopFormData({ ...stopFormData, receiver_name: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <Label htmlFor="receiver_email">E-mail</Label>
                <Input
                  id="receiver_email"
                  type="email"
                  value={stopFormData.receiver_email}
                  onChange={(e) => setStopFormData({ ...stopFormData, receiver_email: e.target.value })}
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="receiver_department">Setor</Label>
                <Input
                  id="receiver_department"
                  value={stopFormData.receiver_department}
                  onChange={(e) => setStopFormData({ ...stopFormData, receiver_department: e.target.value })}
                  placeholder="Setor da empresa"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações da Entrega</Label>
              <Textarea
                id="notes"
                value={stopFormData.notes}
                onChange={(e) => setStopFormData({ ...stopFormData, notes: e.target.value })}
                placeholder="Adicione observações sobre a entrega..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsPhotoCaptureOpen(true)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Fotos ({stopFormData.photos.length})
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsSignatureCaptureOpen(true)}
              >
                <PenTool className="h-4 w-4 mr-2" />
                {stopFormData.signature_url ? 'Editar Assinatura' : 'Coletar Assinatura'}
              </Button>
            </div>

            <Button onClick={completeStop} className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Entrega
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Capture Dialog */}
      {selectedRoute && selectedStop && (
        <PhotoCapture
          isOpen={isPhotoCaptureOpen}
          onClose={() => setIsPhotoCaptureOpen(false)}
          onPhotosChange={(photos) => setStopFormData({ ...stopFormData, photos })}
          currentPhotos={stopFormData.photos}
          routeId={selectedRoute.id}
          stopId={selectedStop.id}
        />
      )}

      {/* Signature Capture Dialog */}
      {selectedRoute && selectedStop && (
        <SignatureCapture
          isOpen={isSignatureCaptureOpen}
          onClose={() => setIsSignatureCaptureOpen(false)}
          onSignatureChange={(signature_url) => setStopFormData({ ...stopFormData, signature_url })}
          currentSignature={stopFormData.signature_url}
          routeId={selectedRoute.id}
          stopId={selectedStop.id}
        />
      )}

      {/* KM Input Dialog */}
      <Dialog open={isKmDialogOpen} onOpenChange={setIsKmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRoute?.status === 'pending' ? 'Iniciar Rota' : 'Finalizar Rota'}
            </DialogTitle>
            <DialogDescription>
              {selectedRoute?.status === 'pending' 
                ? 'Informe o KM inicial do veículo para iniciar a rota'
                : 'Informe o KM final do veículo para finalizar a rota'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRoute?.status === 'pending' && (
              <>
                <div>
                  <Label htmlFor="initial_km">KM Inicial *</Label>
                  <Input
                    id="initial_km"
                    type="number"
                    value={kmFormData.initial_km}
                    onChange={(e) => setKmFormData({ ...kmFormData, initial_km: e.target.value })}
                    placeholder="Digite o KM inicial do veículo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="base_departure_time">Horário de Saída da Base *</Label>
                  <Input
                    id="base_departure_time"
                    type="time"
                    value={kmFormData.base_departure_time}
                    onChange={(e) => setKmFormData({ ...kmFormData, base_departure_time: e.target.value })}
                    required
                  />
                </div>
              </>
            )}
            
            {selectedRoute?.status === 'in_progress' && (
              <>
                <div>
                  <Label htmlFor="initial_km_display">KM Inicial</Label>
                  <Input
                    id="initial_km_display"
                    type="number"
                    value={selectedRoute?.initial_km || ''}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="final_km">KM Final *</Label>
                  <Input
                    id="final_km"
                    type="number"
                    value={kmFormData.final_km}
                    onChange={(e) => setKmFormData({ ...kmFormData, final_km: e.target.value })}
                    placeholder="Digite o KM final do veículo"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="base_arrival_time">Horário de Chegada na Base *</Label>
                  <Input
                    id="base_arrival_time"
                    type="time"
                    value={kmFormData.base_arrival_time}
                    onChange={(e) => setKmFormData({ ...kmFormData, base_arrival_time: e.target.value })}
                    required
                  />
                </div>
              </>
            )}

            <Button 
              onClick={selectedRoute?.status === 'pending' ? startRoute : completeRoute} 
              className="w-full"
            >
              {selectedRoute?.status === 'pending' ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Rota
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Finalizar Rota
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}