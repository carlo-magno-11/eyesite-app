/**
 * Sondeo real de `public.profiles` contra Supabase (solo anon key).
 * Regla del proyecto: NUNCA usar service_role.
 *
 * Uso: pnpm tsx scripts/check-profiles.ts
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xhvpvpvtkdgnnxdwdrkn.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodnB2cHZ0a2Rnbm54ZHdkcmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODk5MTEsImV4cCI6MjEwMjY2NTkxMX0.zsEMmjhbln24S25FnbKvlkic2djzON8QoXNLO8CtXA0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Columnas candidatas que la app necesita para el onboarding.
const CANDIDATES = [
  'id',
  'email',
  'estado',
  'status',
  'role',
  'nombre',
  'full_name',
  'telefono',
  'phone',
  'ciudad',
  'presupuesto',
  'terminos_aceptados',
  'terminos_fecha',
  'created_at',
  'updated_at',
  'last_login_at',
];

async function main() {
  // 1. ¿Existe la tabla public.profiles?
  const table = await supabase.from('profiles').select('id').limit(1);
  console.log('TABLA public.profiles:', table.error ? `ERROR ${table.error.code} — ${table.error.message}` : 'OK');

  // 2. Sondeo columna a columna (PostgREST: error si el campo no existe)
  const missing: string[] = [];
  const present: string[] = [];
  for (const col of CANDIDATES) {
    const { error } = await supabase.from('profiles').select(col).limit(1);
    if (error && (error.code === 'PGRST116' || /column|field|Could not find/i.test(error.message))) {
      missing.push(col);
    } else if (error && error.code !== 'PGRST116') {
      console.warn(`  [${col}] respuesta inesperada: ${error.code} — ${error.message}`);
    } else {
      present.push(col);
    }
  }

  console.log('\nCOLUMNAS PRESENTES (' + present.length + '):', present.join(', '));
  console.log('\nCOLUMNAS FALTANTES (' + missing.length + '):', missing.join(', ') || 'ninguna');

  // 3. Valores reales de estado (si RLS permite leer la propia fila)
  const { data: rows, error: rowsErr } = await supabase
    .from('profiles')
    .select('id,email,estado,role,nombre,ciudad,presupuesto,status')
    .limit(5);
  if (rowsErr) {
    console.log('\nLectura de filas: ', rowsErr.code, rowsErr.message);
  } else {
    console.log('\nMUESTRA profiles (anónimo, RLS):');
    console.log(JSON.stringify(rows ?? [], null, 2));
    const valores = [
      ...new Set((rows ?? []).map((r: any) => r.estado).filter(Boolean)),
    ];
    console.log('VALORES DISTINTOS de `estado` en la muestra:', valores.join(', ') || '(sin filas/estado null)');
  }
}

main().finally(() => process.exit(0));