/**
 * Dynamically resolves a CoinGecko API URL to either go through our backend proxy 
 * (to bypass CORS & handle 429 rate limits safely) or direct queries.
 */
export function resolveCoinGeckoUrl(apiFullUrl: string): string {
  if (typeof window === "undefined") {
    return apiFullUrl;
  }
  
  // Clean the URL to get the endpoint path
  const target = apiFullUrl.replace("https://api.coingecko.com/api/v3/", "");
  
  const isLocalOrContainer = window.location.hostname === "localhost" || 
                             window.location.hostname === "127.0.0.1" || 
                             window.location.hostname.includes(".run.app") ||
                             window.location.port === "3000";
                             
  if (isLocalOrContainer) {
    return `/api/coingecko/${target}`;
  }
  
  return apiFullUrl;
}
