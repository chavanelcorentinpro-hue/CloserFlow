export type ActivityCategory = 'general' | 'mission' | 'client' | 'stock' | 'urgent';
export interface ActivityItem {
  id: string;
  workspaceId: string;
  authorId: string;
  authorName: string;
  category: ActivityCategory;
  message: string;
  createdAt: string;
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Le serveur CloserFlow ne répond pas.');
  return body;
}

export async function listActivity(apiUrl: string, token: string): Promise<ActivityItem[]> {
  const response = await fetch(`${apiUrl}/api/activity`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await parseResponse(response);
  return body.items || [];
}

export async function createActivity(apiUrl: string, token: string, input: { message: string; category: ActivityCategory }): Promise<ActivityItem> {
  const response = await fetch(`${apiUrl}/api/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await parseResponse(response);
  return body.item;
}

export async function deleteActivity(apiUrl: string, token: string, id: string): Promise<void> {
  const response = await fetch(`${apiUrl}/api/activity/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  await parseResponse(response);
}
