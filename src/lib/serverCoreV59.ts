export type CapabilityV59 =
  | 'ai'
  | 'pricing'
  | 'cloud'
  | 'team'
  | 'advancedMargin';

async function api<T>(
  apiUrl: string,
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const baseUrl = apiUrl.replace(/\/$/, '');

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as any;

  if (!response.ok) {
    throw new Error(body.error || `Erreur serveur (${response.status})`);
  }

  return body as T;
}

export async function issueCapabilityV59(
  apiUrl: string,
  token: string,
  capability: CapabilityV59
) {
  return api<{
    capability: CapabilityV59;
    token: string;
    expiresAt: string;
  }>(
    apiUrl,
    token,
    '/api/capabilities/issue',
    {
      method: 'POST',
      body: JSON.stringify({ capability }),
    }
  );
}

export async function securePricingCheckV59(
  apiUrl: string,
  token: string,
  input: {
    materialCost: number;
    laborHours: number;
    hourlyCost: number;
    overhead: number;
    targetMargin: number;
  }
) {
  const capability = await issueCapabilityV59(apiUrl, token, 'pricing');

  return api<{
    baseCost: number;
    suggestedHt: number;
    targetMargin: number;
    serverCalculated: true;
  }>(
    apiUrl,
    token,
    '/api/protected/pricing/check',
    {
      method: 'POST',
      headers: {
        'x-closerflow-capability': capability.token,
      },
      body: JSON.stringify(input),
    }
  );
}

export async function secureMarginCheckV59(
  apiUrl: string,
  token: string,
  input: {
    revenue: number;
    costs: number;
  }
) {
  const capability = await issueCapabilityV59(
    apiUrl,
    token,
    'advancedMargin'
  );

  return api<{
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
    serverCalculated: true;
  }>(
    apiUrl,
    token,
    '/api/protected/margin/check',
    {
      method: 'POST',
      headers: {
        'x-closerflow-capability': capability.token,
      },
      body: JSON.stringify(input),
    }
  );
}
