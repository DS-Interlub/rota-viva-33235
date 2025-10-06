import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to build Directions API URL
function buildDirectionsUrl(origin: string, destination: string, waypoints: string[], apiKey: string) {
  const waypointsParam = waypoints.length > 0
    ? `&waypoints=optimize:true|${waypoints.map(w => encodeURIComponent(w)).join('|')}`
    : '';
  return `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointsParam}&key=${apiKey}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_MAPS_API_KEY) throw new Error('GOOGLE_MAPS_API_KEY não configurada');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { route_id, number_of_splits } = await req.json();
    if (!route_id) throw new Error('route_id é obrigatório');
    const splits = Math.max(2, Math.min(Number(number_of_splits) || 2, 10));

    // Endereço da base (origem e destino)
    const BASE_ADDRESS = 'Av. Humberto de Alencar Castelo Branco, 1260 - Jardim Santo Ignacio, São Bernardo do Campo - SP, 09850-300';

    // Buscar paradas da rota (na ordem atual - espera-se que já esteja otimizada)
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .select(`
        id,
        route_stops(
          id,
          stop_number,
          customers(name, address, city, state)
        )
      `)
      .eq('id', route_id)
      .single();

    if (routeError) throw routeError;
    const stops = (route?.route_stops || []).sort((a: any, b: any) => (a.stop_number ?? 0) - (b.stop_number ?? 0));

    if (!stops.length) {
      return new Response(JSON.stringify({ error: 'A rota não possui paradas' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Montar endereços
    const customerAddresses = stops.map((s: any) => {
      const c = s.customers;
      return `${c.address}, ${c.city || ''}, ${c.state || ''}`.trim();
    });

    // Obter rota otimizada completa com base -> paradas -> base
    const directionsUrl = buildDirectionsUrl(BASE_ADDRESS, BASE_ADDRESS, customerAddresses, GOOGLE_MAPS_API_KEY);
    console.log('Chamando Google Directions para split inteligente...');
    const resp = await fetch(directionsUrl);
    const data = await resp.json();

    if (data.status !== 'OK') {
      console.error('Erro Google Directions:', data);
      return new Response(JSON.stringify({ error: `Erro Google: ${data.status}`, details: data.error_message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const route0 = data.routes?.[0];
    const waypointOrder: number[] = route0?.waypoint_order || stops.map((_, i: number) => i);
    const legs: any[] = route0?.legs || [];

    // legs: [base->s1, s1->s2, ..., sN->base]
    // Distâncias em km por perna
    const legKm: number[] = legs.map((leg) => (leg.distance?.value || 0) / 1000);
    const totalKm = legKm.reduce((a, b) => a + b, 0);

    // Cumulativo por perna
    const cumKm: number[] = [];
    legKm.reduce((acc, cur, i) => { cumKm[i] = acc + cur; return cumKm[i]; }, 0);

    // Definir cortes para dividir a rota em segmentos de quilometragem aproximada
    const cuts: number[] = []; // quantidade de paradas no primeiro, segundo, ... segmentos
    let lastLegIndex = 0;
    const stopCount = stops.length;

    for (let s = 1; s < splits; s++) {
      const target = (totalKm * s) / splits;
      // Encontrar o menor índice de perna >= target e > lastLegIndex
      let cutLeg = lastLegIndex + 1; // ao menos após a próxima perna
      while (cutLeg < cumKm.length - 1 && cumKm[cutLeg] < target) cutLeg++;
      // Converter índice de perna para quantidade de paradas
      const stopsInFirstSegment = Math.min(Math.max(cutLeg, 1), stopCount - (splits - s));
      cuts.push(stopsInFirstSegment);
      lastLegIndex = cutLeg;
    }

    // Garantir cortes estritamente crescentes
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] <= cuts[i - 1]) cuts[i] = cuts[i - 1] + 1;
    }

    // Mapear ordem otimizada para IDs de paradas
    const orderedStops = waypointOrder.map((idx) => stops[idx]);

    const groups: string[][] = [];
    let start = 0;
    for (const cut of cuts) {
      const groupStops = orderedStops.slice(start, cut);
      groups.push(groupStops.map((s: any) => s.id));
      start = cut;
    }
    groups.push(orderedStops.slice(start).map((s: any) => s.id));

    // Distância aproximada por grupo (opcional)
    const groupKm: number[] = [];
    if (groups.length > 0) {
      let legIdx = 0; // percorre legs baseados na rota completa
      for (let g = 0; g < groups.length; g++) {
        const groupStopsCount = groups[g].length;
        if (groupStopsCount === 0) { groupKm.push(0); continue; }
        // Distância do grupo corresponde às pernas: base->primeira, entre paradas do grupo e última->base
        // Como usamos a rota completa, aproximamos somando as pernas correspondentes
        let km = 0;
        // base -> primeira do grupo
        km += legKm[legIdx++];
        // entre paradas do grupo (groupStopsCount - 1) pernas
        for (let i = 1; i < groupStopsCount; i++) km += legKm[legIdx++];
        // última -> base (se for o último grupo, essa perna está no final)
        // Se não for o último grupo, a perna seguinte levará ao início do próximo grupo; então só somamos a perna final no último grupo
        if (g === groups.length - 1) km += legKm[legIdx++];
        groupKm.push(km);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_km: Math.round(totalKm * 10) / 10,
        groups, // arrays de IDs de route_stops em ordem
        groups_km: groupKm.map(k => Math.round(k * 10) / 10),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro no split-route:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro desconhecido' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});