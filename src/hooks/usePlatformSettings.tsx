import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePaymentsEnabled() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "payments_enabled")
      .maybeSingle();
    // value is jsonb -> boolean true/false; default true if missing
    const v = (data as any)?.value;
    setEnabled(v === false ? false : true);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("platform_settings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { paymentsEnabled: enabled, loading, refresh };
}

export async function setPaymentsEnabled(enabled: boolean, userId?: string) {
  const { error } = await supabase
    .from("platform_settings")
    .upsert(
      {
        key: "payments_enabled",
        value: enabled as any,
        updated_at: new Date().toISOString(),
        updated_by: userId ?? null,
      },
      { onConflict: "key" }
    );
  if (error) throw error;
}
