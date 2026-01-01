export interface UploadStreamEvent {
  type: string;
  data: unknown;
}

export async function readUploadStream(
  response: Response,
  onEvent: (event: UploadStreamEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('stream_unavailable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEventType: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEventType = line.slice(7).trim();
        continue;
      }

      if (line.startsWith('data: ') && currentEventType) {
        const payload = line.slice(6);
        const data = payload ? JSON.parse(payload) : null;
        onEvent({ type: currentEventType, data });
        continue;
      }
    }
  }
}
