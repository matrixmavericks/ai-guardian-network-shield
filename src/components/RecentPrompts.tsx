import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface PromptLog {
  id: string;
  original_prompt: string;
  modified_prompt: string | null;
  status: string;
  severity: string | null;
  subject: string | null;
  grade_level: string | null;
  created_at: string;
  user_id: string;
  flagged_keywords: string[] | null;
}

const RecentPrompts = () => {
  const [prompts, setPrompts] = useState<PromptLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPrompts(data || []);
    } catch (err) {
      console.error('Error fetching prompts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rewritten":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "blocked":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "flagged":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Approved</span>;
      case "rewritten":
        return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">Rewritten</span>;
      case "blocked":
        return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">Blocked</span>;
      case "flagged":
        return <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">Flagged</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">Unknown</span>;
    }
  };

  const getSeverityBadge = (severity: string | null) => {
    switch (severity) {
      case "critical":
        return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">Critical</span>;
      case "high":
        return <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded">High</span>;
      case "medium":
        return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">Medium</span>;
      case "low":
        return <span className="bg-green-50 text-green-600 text-xs px-2 py-1 rounded">Low</span>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Prompts</CardTitle>
            <CardDescription>Live AI interactions and their moderation outcomes</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPrompts} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {prompts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {isLoading ? 'Loading prompt logs...' : 'No prompt logs yet. Student AI interactions will appear here.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-start p-3 text-sm font-medium text-slate-500">Original Prompt</th>
                  <th className="text-start p-3 text-sm font-medium text-slate-500">Response/Action</th>
                  <th className="text-start p-3 text-sm font-medium text-slate-500">Subject</th>
                  <th className="text-start p-3 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-start p-3 text-sm font-medium text-slate-500">Severity</th>
                  <th className="text-start p-3 text-sm font-medium text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {prompts.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3">
                      <div className="max-w-xs truncate text-sm">{item.original_prompt}</div>
                      {item.flagged_keywords && item.flagged_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.flagged_keywords.map((kw, i) => (
                            <span key={i} className="bg-red-50 text-red-600 text-xs px-1.5 py-0.5 rounded">{kw}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs truncate text-sm">
                        {item.status === "blocked" ? (
                          <span className="text-red-600">Blocked — violates ethical use policy</span>
                        ) : item.modified_prompt ? (
                          <span className="text-amber-700">{item.modified_prompt}</span>
                        ) : (
                          <span className="text-green-700">Approved — follows guidelines</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-sm text-slate-600">
                      {item.subject || '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(item.status)}
                        <span className="ml-2">{getStatusBadge(item.status)}</span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {getSeverityBadge(item.severity)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-500 text-sm">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentPrompts;
