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

    const { route_id } = await req.json();

    if (!route_id) {
      throw new Error('route_id é obrigatório');
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

    // Preparar endereços para otimização
    const addresses = route.route_stops.map((stop: any) => {
      const customer = stop.customers;
      return `${customer.address}, ${customer.city || ''}, ${customer.state || ''}`.trim();
    });

    console.log('Endereços para otimização:', addresses);

    // Usar Google Maps Directions API para otimizar a rota
    // Pegamos o primeiro endereço como origem e o último como destino
    const origin = addresses[0];
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(1, -1);

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
    const optimizedStops = [route.route_stops[0]]; // Primeiro sempre é o início
    
    optimizedOrder.forEach((waypointIndex: number) => {
      optimizedStops.push(route.route_stops[waypointIndex + 1]); // +1 porque removemos o primeiro
    });
    
    if (route.route_stops.length > 1) {
      optimizedStops.push(route.route_stops[route.route_stops.length - 1]); // Último sempre é o fim
    }

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
        google_maps_url: `https://www.google.com/maps/dir/${addresses.join('/')}`,
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
