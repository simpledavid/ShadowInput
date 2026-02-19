type FetchInput = Parameters<typeof fetch>[0];

let cachedProxyAgent: unknown | null = null;
let cachedProxyUrl: string | null = null;
let undiciLoader: Promise<typeof import("undici")> | null = null;

async function getUndici() {
  if (!undiciLoader) {
    undiciLoader = import("undici");
  }
  return undiciLoader;
}

async function getProxyAgent(proxyUrl: string) {
  if (!cachedProxyAgent || cachedProxyUrl !== proxyUrl) {
    const { ProxyAgent } = await getUndici();
    cachedProxyAgent = new ProxyAgent(proxyUrl);
    cachedProxyUrl = proxyUrl;
  }
  return cachedProxyAgent;
}

export async function fetchWithProxy(
  input: FetchInput,
  init?: Parameters<typeof fetch>[1]
) {
  const proxyUrl =
    process.env.OUTBOUND_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY;

  try {
    return await fetch(input, init);
  } catch (originalError) {
    if (!proxyUrl) throw originalError;

    const dispatcher = await getProxyAgent(proxyUrl);
    const { fetch: undiciFetch } = await getUndici();
    return (undiciFetch as any)(input, {
      ...(init ?? {}),
      dispatcher,
    });
  }
}
