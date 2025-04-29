
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

const RecentPrompts = () => {
  const promptData = [
    {
      id: 1,
      prompt: "What is 7x + 39x?",
      modified: "Let me guide you through solving 7x + 39x step-by-step...",
      student: "Alex Johnson",
      time: "10 minutes ago",
      status: "modified",
    },
    {
      id: 2,
      prompt: "Explain how photosynthesis works",
      modified: "",
      student: "Emma Thompson",
      time: "15 minutes ago",
      status: "allowed",
    },
    {
      id: 3,
      prompt: "Write a 500 word essay about World War II",
      modified: "I can help you plan an essay about World War II. Let's start with an outline...",
      student: "Michael Brown",
      time: "30 minutes ago",
      status: "modified",
    },
    {
      id: 4,
      prompt: "Give me the answers to the math quiz",
      modified: "",
      student: "Sarah Wilson",
      time: "1 hour ago",
      status: "blocked",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "allowed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "modified":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "blocked":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "allowed":
        return <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Allowed</span>;
      case "modified":
        return <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">Modified</span>;
      case "blocked":
        return <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">Blocked</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">Processing</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Prompts</CardTitle>
        <CardDescription>View recent AI interactions and their outcomes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-start p-3 text-sm font-medium text-slate-500">Student</th>
                <th className="text-start p-3 text-sm font-medium text-slate-500">Original Prompt</th>
                <th className="text-start p-3 text-sm font-medium text-slate-500">Response/Action</th>
                <th className="text-start p-3 text-sm font-medium text-slate-500">Status</th>
                <th className="text-start p-3 text-sm font-medium text-slate-500">Time</th>
              </tr>
            </thead>
            <tbody>
              {promptData.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="font-medium">{item.student}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="max-w-md truncate">{item.prompt}</div>
                  </td>
                  <td className="p-3">
                    <div className="max-w-md truncate">
                      {item.status === "blocked" ? (
                        <span className="text-red-600">Access blocked - request violates ethical use policy</span>
                      ) : item.status === "modified" ? (
                        item.modified
                      ) : (
                        "Allowed - prompt follows ethical guidelines"
                      )}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(item.status)}
                      <span className="ml-2">{getStatusBadge(item.status)}</span>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap text-slate-500 text-sm">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentPrompts;
