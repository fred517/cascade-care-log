import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSupabaseResetSession() {
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) PKCE/code flow
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Clean URL so refresh doesn't re-exchange
          url.searchParams.delete("code");
          window.history.replaceState({}, "", url.toString());

          if (!cancelled) setReady(true);
          return;
        }

        // 2) Implicit/hash flow fallback
        const hash = new URLSearchParams(window.location.hash.replace("#", ""));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;

          // Clean hash so refresh doesn't re-set
          window.history.replaceState({}, "", window.location.pathname);

          if (!cancelled) setReady(true);
          return;
        }

        // If neither exists, you landed here without a valid link
        throw new Error("Missing reset token (code/access_token).");
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e?.message ?? "Reset link error");
          setReady(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, errorMsg };
}
