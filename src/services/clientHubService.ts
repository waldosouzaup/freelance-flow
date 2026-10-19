import { supabase } from "@/integrations/supabase/client";

export interface ClientHubTokenData {
  id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  last_accessed_at: string | null;
  project_id?: string | null;
  budget_id?: string | null;
}

export interface ClientHubPayload {
  success: boolean;
  error?: string;
  token?: string;
  allow_client_approval?: boolean;
  provider?: {
    display_name: string;
    company_name: string | null;
    phone: string | null;
    website: string | null;
    avatar_url: string | null;
    cnpj: string | null;
    address: string | null;
    pix_key: string | null;
    pix_key_type: string | null;
  };
  project?: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    deadline: string | null;
    value: number | null;
    general_notes: string | null;
    stages: {
      id: string;
      title: string;
      completed: boolean;
      sort_order: number;
    }[];
  };
  budget?: {
    id: string;
    budget_number: string;
    status: string;
    client_name: string;
    project_name: string;
    total_value: number;
    created_at: string;
    budget_data: Record<string, unknown>;
  };
}

/**
 * Obtém ou gera um token de acesso para o Portal do Cliente vinculado a um orçamento ou projeto.
 */
export async function getOrCreateHubToken(params: {
  userId: string;
  budgetId?: string;
  projectId?: string;
}): Promise<ClientHubTokenData | null> {
  const { userId, budgetId, projectId } = params;

  try {
    let query = supabase
      .from("client_hub_tokens")
      .select("*")
      .eq("user_id", userId);

    if (budgetId) {
      query = query.eq("budget_id", budgetId);
    } else if (projectId) {
      query = query.eq("project_id", projectId);
    } else {
      return null;
    }

    const { data: existing, error: selectError } = await query.maybeSingle();

    if (selectError) {
      console.error("Erro ao buscar token existente do hub:", selectError);
    }

    if (existing) {
      return existing as ClientHubTokenData;
    }

    // Criar novo token
    const { data: created, error: insertError } = await supabase
      .from("client_hub_tokens")
      .insert({
        user_id: userId,
        budget_id: budgetId || null,
        project_id: projectId || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao criar token do hub:", insertError);
      return null;
    }

    return created as ClientHubTokenData;
  } catch (err) {
    console.error("Falha ao gerar link do portal do cliente:", err);
    return null;
  }
}

/**
 * Altera o status de ativação do link (ativar / desativar).
 */
export async function toggleHubTokenActive(tokenId: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("client_hub_tokens")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", tokenId);

  return !error;
}

/**
 * Busca dados públicos higienizados do Portal do Cliente via token.
 * Usa a RPC get_client_hub_data com fallback de leitura direta caso a RPC não tenha sido aplicada localmente.
 */
export async function fetchClientHubData(token: string): Promise<ClientHubPayload> {
  try {
    // 1. Tentar via RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_client_hub_data", {
      p_token: token,
    });

    if (!rpcError && rpcData) {
      return rpcData as unknown as ClientHubPayload;
    }

    // 2. Fallback resiliente via queries diretas públicas
    const { data: tokenRecord, error: tokenErr } = await supabase
      .from("client_hub_tokens")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .single();

    if (tokenErr || !tokenRecord) {
      return { success: false, error: "Link do cliente não encontrado ou desativado." };
    }

    // Atualiza last_accessed_at
    await supabase
      .from("client_hub_tokens")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    // Profile do prestador
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, company_name, phone, website, avatar_url, cnpj, address, pix_key, pix_key_type")
      .eq("user_id", tokenRecord.user_id)
      .maybeSingle();

    // Projeto
    let project = null;
    if (tokenRecord.project_id) {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, name, description, status, deadline, value, general_notes")
        .eq("id", tokenRecord.project_id)
        .maybeSingle();

      if (proj) {
        const { data: stages } = await supabase
          .from("project_stages")
          .select("id, title, completed, sort_order")
          .eq("project_id", proj.id)
          .order("sort_order", { ascending: true });

        project = { ...proj, stages: stages || [] };
      }
    }

    // Orçamento
    let budget = null;
    if (tokenRecord.budget_id) {
      const { data: bg } = await supabase
        .from("budgets")
        .select("id, budget_number, status, client_name, project_name, total_value, created_at, budget_data")
        .eq("id", tokenRecord.budget_id)
        .maybeSingle();

      budget = bg;
    }

    return {
      success: true,
      token: tokenRecord.token,
      allow_client_approval: tokenRecord.allow_client_approval,
      provider: profile || undefined,
      project: project || undefined,
      budget: budget || undefined,
    };
  } catch (err: unknown) {
    console.error("Erro ao carregar dados do hub do cliente:", err);
    const msg = err instanceof Error ? err.message : "Erro inesperado ao carregar portal.";
    return { success: false, error: msg };
  }
}
