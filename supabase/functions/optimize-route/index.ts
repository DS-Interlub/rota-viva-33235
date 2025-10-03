import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { route_id, priorities } = await req.json();

    if (!route_id) {
      throw new Error('route_id é obrigatório');
    }

    // Se priorities foi passado, atualizar antes de otimizar
    if (priorities && typeof priorities === 'object') {
      for (const [stopId, priority] of Object.entries(priorities)) {
        await supabase
          .from('route_stops')
          .update({ priority: priority as number })
          .eq('id', stopId);
      }
      console.log('Prioridades atualizadas:', priorities);
    }

    console.log('Otimizando rota:', route_id);

    // Buscar rota e paradas
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select(`
        *,
        route_stops(
          id,
          stop_number,
          priority,
          customers(
            id,
            name,
            address,
            city,
            state
          )
        )
      `)
      .eq('id', route_id)
      .single();

    if (routeError) throw routeError;

    if (!route.route_stops || route.route_stops.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'A rota não possui paradas',
          optimized: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Endereço da base
    const BASE_ADDRESS = 'Av. Humberto de Alencar Castelo Branco, 1260 - Jardim Santo Ignacio, São Bernardo do Campo - SP, 09850-300';
    
    // Separar paradas por prioridade (3=Urgente, 2=Alta, 1=Baixa, 0=Normal)
    const urgentStops = route.route_stops.filter((s: any) => s.priority === 3);
    const highStops = route.route_stops.filter((s: any) => s.priority === 2);
    const normalStops = route.route_stops.filter((s: any) => s.priority === 0 || s.priority === 1);

    // Concatenar na ordem de prioridade
    const orderedStops = [...urgentStops, ...highStops, ...normalStops];
    
    // Preparar endereços dos clientes para otimização
    const customerAddresses = orderedStops.map((stop: any) => {
      const customer = stop.customers;
      return `${customer.address}, ${customer.city || ''}, ${customer.state || ''}`.trim();
    });

    console.log('Paradas por prioridade - Urgente:', urgentStops.length, 'Alta:', highStops.length, 'Normal:', normalStops.length);
    console.log('Endereços dos clientes para otimização:', customerAddresses);

    // A rota sempre começa e termina na base
    const origin = BASE_ADDRESS;
    const destination = BASE_ADDRESS;
    const waypoints = customerAddresses;

    const waypointsParam = waypoints.length > 0 
      ? `&waypoints=optimize:true|${waypoints.join('|')}` 
      : '';

    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointsParam}&key=${GOOGLE_MAPS_API_KEY}`;

    console.log('Chamando Google Maps API...');
    
    const response = await fetch(directionsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Erro na API do Google Maps:', data);
      return new Response(
        JSON.stringify({ 
          error: `Erro ao otimizar rota: ${data.status}`,
          details: data.error_message || 'Erro desconhecido',
          optimized: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Extrair a ordem otimizada dos waypoints
    const optimizedOrder = data.routes[0]?.waypoint_order || [];
    
    console.log('Ordem otimizada:', optimizedOrder);

    // Reorganizar as paradas de acordo com a ordem otimizada
    // A ordem otimizada agora reflete todos os clientes (sem a base no início/fim)
    const optimizedStops = optimizedOrder.map((waypointIndex: number) => {
      return orderedStops[waypointIndex];
    });

    // Atualizar os números das paradas no banco de dados
    const updatePromises = optimizedStops.map((stop: any, index: number) => {
      return supabase
        .from('route_stops')
        .update({ stop_number: index + 1 })
        .eq('id', stop.id);
    });

    await Promise.all(updatePromises);

    // Calcular distância e tempo total
    const leg = data.routes[0]?.legs[0];
    const totalDistance = data.routes[0]?.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0) / 1000; // em km
    const totalDuration = data.routes[0]?.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0) / 60; // em minutos

    console.log('Rota otimizada com sucesso');
    console.log('Distância total:', totalDistance, 'km');
    console.log('Tempo total:', totalDuration, 'min');

    return new Response(
      JSON.stringify({
        success: true,
        optimized: true,
        total_distance_km: Math.round(totalDistance * 10) / 10,
        total_duration_min: Math.round(totalDuration),
        optimized_order: optimizedOrder,
        google_maps_url: `https://www.google.com/maps/dir/${encodeURIComponent(BASE_ADDRESS)}/${customerAddresses.join('/')}/${encodeURIComponent(BASE_ADDRESS)}`,
        waze_url: `https://waze.com/ul?ll=${leg?.start_location.lat},${leg?.start_location.lng}&navigate=yes`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao otimizar rota:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        optimized: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
