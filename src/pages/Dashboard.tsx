import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  Settings, 
  Users, 
  Shield, 
  Server, 
  Brain, 
  Network, 
  AlertTriangle, 
  BarChart3,
  ListFilter,
  HelpCircle,
  Bell
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import DashboardNav from "@/components/DashboardNav";
import DashboardSidebar from "@/components/DashboardSidebar";
import NetworkStatus from "@/components/NetworkStatus";
import RecentPrompts from "@/components/RecentPrompts";
import NetworkSettings from "@/components/NetworkSettings";
import UserManagement from "@/components/UserManagement";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AlertSettings from "@/components/AlertSettings";
import HelpSupport from "@/components/HelpSupport";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen flex bg-slate-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Total Prompts Filtered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">5,284</div>
                    <div className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      12% from last week
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Bypass Attempts Blocked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">217</div>
                    <div className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      5% from last week
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">Network Protection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-lg font-medium">Active</div>
                    <div className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      Protected
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">All entry points secured</div>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
                <TabsTrigger value="training">AI Training</TabsTrigger>
                <TabsTrigger value="help">Help & Support</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Network Status */}
                  <NetworkStatus />
                  
                  {/* Recent Activity */}
                  <Card className="col-span-1">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                        Alert Activity
                      </CardTitle>
                      <CardDescription>Recent system alerts and warnings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-red-50 p-3 rounded-md border border-red-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-red-800">VPN Bypass Attempt</p>
                              <p className="text-sm text-red-600">User attempted to use Cloudflare Warp</p>
                            </div>
                            <span className="text-xs text-slate-500">2h ago</span>
                          </div>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-amber-800">Custom DNS Detected</p>
                              <p className="text-sm text-amber-600">DNS settings changed to 8.8.8.8</p>
                            </div>
                            <span className="text-xs text-slate-500">5h ago</span>
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-blue-800">System Update</p>
                              <p className="text-sm text-blue-600">AI filtering rules were updated</p>
                            </div>
                            <span className="text-xs text-slate-500">1d ago</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Recent Prompts */}
                <RecentPrompts />
              </TabsContent>

              <TabsContent value="network" className="space-y-6">
                <NetworkSettings />
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <UserManagement />
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsDashboard />
              </TabsContent>
              
              <TabsContent value="alerts" className="space-y-6">
                <AlertSettings />
              </TabsContent>

              <TabsContent value="training" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>AI Model Training</CardTitle>
                        <CardDescription>Customize how the AI responds to student prompts</CardDescription>
                      </div>
                      <Button>Create New Model</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Current Models</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <CardTitle>Math Helper</CardTitle>
                                <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Active</div>
                              </div>
                              <CardDescription>Guides students through mathematical problem-solving</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-slate-600 mb-4">
                                <strong>Examples:</strong> 176 | <strong>Last Updated:</strong> 2 days ago
                              </div>
                              <div className="bg-slate-100 p-3 rounded-md mb-4 text-sm">
                                <p className="font-medium mb-1">Sample Input:</p>
                                <p className="text-slate-700">What is 7x + 39x?</p>
                                <p className="font-medium mb-1 mt-3">Sample Output:</p>
                                <p className="text-slate-700">
                                  Let me help you solve this step by step:
                                  <br />
                                  1. We have 7x + 39x
                                  <br />
                                  2. We can combine like terms by adding the coefficients: 7 + 39 = 46
                                  <br />
                                  3. So 7x + 39x = 46x
                                  <br />
                                  Try using this approach for similar problems!
                                </p>
                              </div>
                              <div className="flex justify-end">
                                <Button variant="outline" size="sm">Edit Model</Button>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <CardTitle>Essay Helper</CardTitle>
                                <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Active</div>
                              </div>
                              <CardDescription>Provides essay structure and planning guidance</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-slate-600 mb-4">
                                <strong>Examples:</strong> 104 | <strong>Last Updated:</strong> 5 days ago
                              </div>
                              <div className="bg-slate-100 p-3 rounded-md mb-4 text-sm">
                                <p className="font-medium mb-1">Sample Input:</p>
                                <p className="text-slate-700">Write an essay about climate change</p>
                                <p className="font-medium mb-1 mt-3">Sample Output:</p>
                                <p className="text-slate-700">
                                  I can help you plan an essay on climate change. Here's a suggested structure:
                                  <br /><br />
                                  1. Introduction: Define climate change and its significance
                                  <br />
                                  2. Body paragraphs:
                                  <br />
                                  - Causes of climate change
                                  <br />
                                  - Effects on ecosystems
                                  <br />
                                  - Mitigation strategies
                                  <br />
                                  3. Conclusion: Summary and call to action
                                  <br /><br />
                                  Would you like help developing any particular section?
                                </p>
                              </div>
                              <div className="flex justify-end">
                                <Button variant="outline" size="sm">Edit Model</Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium mb-4">Train New Responses</h3>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Problem Category</label>
                                <select className="w-full p-2 border border-slate-300 rounded-md">
                                  <option>Mathematics</option>
                                  <option>Science</option>
                                  <option>Language Arts</option>
                                  <option>Social Studies</option>
                                  <option>Computer Science</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sample Request (What students might ask)</label>
                                <textarea 
                                  className="w-full p-3 border border-slate-300 rounded-md min-h-[100px]" 
                                  placeholder="E.g., Solve 3x + 5 = 20"
                                ></textarea>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Desired Process-Focused Response</label>
                                <textarea 
                                  className="w-full p-3 border border-slate-300 rounded-md min-h-[150px]" 
                                  placeholder="E.g., Let me guide you through solving this equation step by step..."
                                ></textarea>
                              </div>
                              
                              <div className="flex justify-end">
                                <Button className="bg-blue-600 hover:bg-blue-700">Add Training Example</Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="help" className="space-y-6">
                <HelpSupport />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
