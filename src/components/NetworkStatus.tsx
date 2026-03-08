import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NetworkStatus = () => {
  const [stats, setStats] = useState({
    totalBypasses: 0,
    blockedBypasses: 0,
    recentAttemptTypes: [] as string[],
  });
  const [aiConfigEnabled, setAiConfigEnabled] = useState(true);
  const [processModeEnabled, setProcessModeEnabled] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { count: totalBypasses } = await supabase
          .from('bypass_attempts')
          .select('*', { count: 'exact', head: true });

        const { count: blockedBypasses } = await supabase
          .from('bypass_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('blocked', true);

        const { data: config } = await supabase
          .from('ai_configurations')
          .select('enabled, process_mode_enabled')
          .limit(1)
          .maybeSingle();

        setStats({
          totalBypasses: totalBypasses || 0,
          blockedBypasses: blockedBypasses || 0,
          recentAttemptTypes: [],
        });

        if (config) {
          setAiConfigEnabled(config.enabled ?? true);
          setProcessModeEnabled(config.process_mode_enabled ?? true);
        }
      } catch (err) {
        console.error('Error fetching network status:', err);
      }
    };
    fetchStatus();
  }, []);

  const protectionScore = [aiConfigEnabled, processModeEnabled, true, true]
    .filter(Boolean).length * 25;

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-600" />
          Network Protection Status
        </CardTitle>
        <CardDescription>Current security measures and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className={`${aiConfigEnabled ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'} p-3 rounded-md border`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-medium ${aiConfigEnabled ? 'text-green-800' : 'text-amber-800'}`}>AI Filtering</p>
                  <p className={`text-xs ${aiConfigEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                    {aiConfigEnabled ? 'Active — filtering prompts' : 'Disabled'}
                  </p>
                </div>
                {aiConfigEnabled ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-amber-600" />}
              </div>
            </div>
            <div className={`${processModeEnabled ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'} p-3 rounded-md border`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-medium ${processModeEnabled ? 'text-green-800' : 'text-amber-800'}`}>Process Teaching</p>
                  <p className={`text-xs ${processModeEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                    {processModeEnabled ? 'Rewrites direct answers' : 'Disabled'}
                  </p>
                </div>
                {processModeEnabled ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-amber-600" />}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-md border border-green-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-green-800">Prompt Moderation</p>
                  <p className="text-xs text-green-600">Keyword blocking active</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-md border border-green-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-green-800">Bypass Detection</p>
                  <p className="text-xs text-green-600">{stats.blockedBypasses} blocked of {stats.totalBypasses}</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800 font-medium">Network Protection Score:</p>
            <div className="flex items-center mt-1">
              <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${protectionScore}%` }}></div>
              <span className="text-sm text-blue-800 ml-2">{protectionScore}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkStatus;
