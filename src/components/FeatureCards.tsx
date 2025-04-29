
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Lock, Network, Settings, Shield, Users } from "lucide-react";

const FeatureCards = () => {
  return (
    <section className="py-16 px-6 md:px-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-800">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Ethical AI Filter</CardTitle>
              <CardDescription>Transforms problematic prompts into learning opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Our intelligent system detects when students are asking for direct answers and redirects them toward understanding the process instead.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <Network className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Network-Level Integration</CardTitle>
              <CardDescription>Works across your entire network infrastructure</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Deploy at the network level to ensure all AI interactions are monitored and filtered, regardless of device or connection method.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Bypass Prevention</CardTitle>
              <CardDescription>Blocks VPN, DNS, and proxy bypass attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Advanced security measures prevent students from circumventing the system through VPNs, DNS changes, or proxy services.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Customizable Policies</CardTitle>
              <CardDescription>Tailor filtering policies to your educational needs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Set custom rules for different grade levels, subject areas, or specific AI platforms to match your institution's educational philosophy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Administer different permission levels for staff</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Create admin, teacher, and staff accounts with appropriate permission levels to manage the system and review student interactions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>AI Model Training</CardTitle>
              <CardDescription>Train the system with your own examples</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Customize how the AI responds by providing your own examples of acceptable prompts and preferred process-oriented responses.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;
