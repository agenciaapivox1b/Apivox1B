import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kezewdivrkmrvvbzocfl.supabase.co'
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('=== INÍCIO EDGE FUNCTION ===')
    console.log('URL:', req.url)
    console.log('Método:', req.method)
    
    // Log de TODOS os headers recebidos
    const allHeaders: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      allHeaders[key] = value.substring(0, 50) // Limita para não logar tokens completos
    })
    console.log('Headers recebidos:', allHeaders)

    if (!anonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Chaves não configuradas', details: { anonKey: !!anonKey, serviceRoleKey: !!serviceRoleKey } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // OBTER AUTH HEADER - tenta todas as variações
    let authHeader = req.headers.get('authorization') || 
                     req.headers.get('Authorization') || 
                     req.headers.get('x-authorization') ||
                     ''

    console.log('Auth header encontrado:', authHeader ? 'SIM' : 'NÃO')
    console.log('Auth header valor (primeiros 30 chars):', authHeader.substring(0, 30))

    if (!authHeader) {
      console.log('ERRO: Nenhum Authorization header encontrado!')
      return new Response(
        JSON.stringify({ error: 'Não autorizado', details: 'Authorization header ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente com o token do usuário
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    // Validar usuário
    console.log('Validando usuário com token...')
    const { data: { user }, error: userError } = await userClient.auth.getUser()

    console.log('Resultado validação:', {
      userEncontrado: !!user,
      userId: user?.id || null,
      email: user?.email || null,
      erro: userError?.message || null
    })

    if (userError || !user) {
      console.log('ERRO: Usuário não autenticado:', userError?.message)
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado', 
          details: userError?.message || 'Token inválido ou expirado' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Usuário autenticado:', user.id)
    return await processTenant(user, serviceClient, corsHeaders)

  } catch (error: any) {
    console.error('ERRO FATAL:', error)
    return new Response(
      JSON.stringify({
        error: 'Erro interno',
        details: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processTenant(user: any, serviceClient: any, corsHeaders: any) {
  console.log('=== PROCESSANDO TENANT ===')
  console.log('Usuário autenticado:', { id: user.id, email: user.email })

  // Buscar tenant existente
  console.log('Buscando tenant existente para owner_id:', user.id)
  const { data: existingTenant, error: fetchError } = await serviceClient
    .from('tenants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  console.log('Resultado busca tenant:', { existingTenant: !!existingTenant, fetchError: fetchError?.message || null })

  if (fetchError) {
    console.error('ERRO ao buscar tenant:', fetchError)
    return new Response(
      JSON.stringify({
        error: 'Erro ao buscar tenant',
        details: fetchError.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (existingTenant) {
    console.log('✅ TENANT EXISTENTE ENCONTRADO:', existingTenant.id)
    return new Response(
      JSON.stringify({ 
        tenant: existingTenant,
        tenant_id: existingTenant.id,
        message: 'Tenant existente retornado'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Criando NOVO tenant para usuário:', user.id)

  // Criar novo tenant com permissão de serviço
  const tenantName = user.email ? `${user.email} - Tenant` : 'Novo Tenant'

  const { data: newTenant, error: createError } = await serviceClient
    .from('tenants')
    .insert({
      name: tenantName,
      owner_id: user.id,
      plan: 'basic',
      status: 'active',
      settings: {},
    })
    .select()
    .single()

  console.log('Resultado criação tenant:', { 
    success: !!newTenant, 
    error: createError?.message || null,
    tenantId: newTenant?.id || null 
  })

  if (createError) {
    console.error('ERRO ao criar tenant:', createError)
    return new Response(
      JSON.stringify({
        error: 'Erro ao criar tenant',
        details: createError.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('✅ NOVO TENANT CRIADO COM SUCESSO:', newTenant.id)

  return new Response(
    JSON.stringify({ 
      tenant: newTenant,
      tenant_id: newTenant.id,
      message: 'Tenant criado com sucesso'
    }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}