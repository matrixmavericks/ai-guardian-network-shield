
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, XCircle } from "lucide-react";

const NetworkStatus = () => {
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
            <div className="bg-green-50 p-3 rounded-md border border-green-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-green-800">VPN Protection</p>
                  <p className="text-xs text-green-600">Blocks unauthorized VPN connections</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-md border border-green-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-green-800">DNS Protection</p>
                  <p className="text-xs text-green-600">Prevents DNS manipulation</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-md border border-green-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-green-800">Proxy Detection</p>
                  <p className="text-xs text-green-600">Identifies proxy server usage</p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-amber-800">Deep Packet Inspection</p>
                  <p className="text-xs text-amber-600">Needs router configuration</p>
                </div>
                <XCircle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800 font-medium">Network Protection Score:</p>
            <div className="flex items-center mt-1">
              <div className="h-2.5 rounded-full bg-blue-600 w-4/5"></div>
              <span className="text-sm text-blue-800 ml-2">80%</span>
            </div>
            <p className="text-xs text-blue-600 mt-2">Configure Deep Packet Inspection to reach 100% protection</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkStatus;
