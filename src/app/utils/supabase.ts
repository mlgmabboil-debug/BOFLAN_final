import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../../../utils/supabase/info'

const createDummyProxy = (): any => {
  const dummy: any = () => {};
  return new Proxy(dummy, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: any) => resolve({
          data: new Proxy({}, { get: (t, p) => p === 'session' ? null : (p === 'publicUrl' ? "" : {}) }),
          error: null
        });
      }
      return createDummyProxy();
    },
    apply() {
      return createDummyProxy();
    }
  });
};

function createLazySupabaseClient(urlFunc: () => string, keyFunc: () => string, options?: any) {
  let client: any = null;
  return new Proxy({}, {
    get(target, prop) {
      if (!client) {
        const url = urlFunc();
        const key = keyFunc();
        if (!url || url.includes('undefined') || !url.replace('https://', '').replace('.supabase.co', '') || !key) {
          console.warn("Supabase keys are missing! Returning a dummy client to prevent crashes.");
          client = createDummyProxy();
        } else {
          client = createClient(url, key, options);
        }
      }
      const val = client[prop];
      if (typeof val === 'function') {
        return val.bind(client);
      }
      return val;
    }
  }) as any;
}

export const supabase = createLazySupabaseClient(
  () => `https://${projectId}.supabase.co`,
  () => publicAnonKey
);

