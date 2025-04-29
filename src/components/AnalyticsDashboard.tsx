
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  Calendar,
  Download,
  RefreshCw,
  ChevronDown,
  Filter
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Recharts components
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
} from "recharts";

// Sample data for charts
const weeklyData = [
  { name: "Mon", blocked: 65, allowed: 120 },
  { name: "Tue", blocked: 59, allowed: 110 },
  { name: "Wed", blocked: 80, allowed: 130 },
  { name: "Thu", blocked: 81, allowed: 145 },
  { name: "Fri", blocked: 56, allowed: 105 },
];

const monthlyData = [
  { name: "Week 1", blocked: 240, allowed: 450 },
  { name: "Week 2", blocked: 300, allowed: 520 },
  { name: "Week 3", blocked: 270, allowed: 480 },
  { name: "Week 4", blocked: 310, allowed: 510 },
];

const promptTypeData = [
  { name: "Homework Questions", value: 35 },
  { name: "Answer Requests", value: 25 },
  { name: "Code Solutions", value: 15 },
  { name: "Essay Writing", value: 20 },
  { name: "Other Violations", value: 5 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState("weekly");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold">Analytics & Reporting</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {timeRange === "weekly" ? "Last 7 Days" : "Last 30 Days"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTimeRange("weekly")}>Last 7 Days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeRange("monthly")}>Last 30 Days</DropdownMenuItem>
              <DropdownMenuItem>Last Quarter</DropdownMenuItem>
              <DropdownMenuItem>Custom Range</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={handleRefreshData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Prompts Filtered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">5,284</div>
              <div className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                <span className="mr-1">↑</span>
                12% from last period
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
                <span className="mr-1">↑</span>
                5% from last period
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Education Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">1,942</div>
              <div className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                <span className="mr-1">↑</span>
                18% from last period
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Analysis</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2" />
                Prompt Volume Over Time
              </CardTitle>
              <CardDescription>Tracking of AI prompts processed by the system</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ReLineChart data={timeRange === "weekly" ? weeklyData : monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="blocked" stroke="#f43f5e" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="allowed" stroke="#3b82f6" strokeWidth={2} />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Blocked Prompt Types
                </CardTitle>
                <CardDescription>Distribution of violations by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={promptTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {promptTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  AI Service Usage
                </CardTitle>
                <CardDescription>Distribution across different AI platforms</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "ChatGPT", value: 45 },
                      { name: "Claude", value: 25 },
                      { name: "Gemini", value: 15 },
                      { name: "Other", value: 15 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Pattern Analysis</CardTitle>
              <CardDescription>Insights into prompt patterns and common bypass attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Common Bypass Techniques</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Instruction manipulation</span>
                        <span className="text-sm">35%</span>
                      </div>
                      <Progress value={35} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Character substitution</span>
                        <span className="text-sm">28%</span>
                      </div>
                      <Progress value={28} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Context shifting</span>
                        <span className="text-sm">21%</span>
                      </div>
                      <Progress value={21} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Multi-prompt sequences</span>
                        <span className="text-sm">16%</span>
                      </div>
                      <Progress value={16} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Top Blocked Prompt Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">write my essay</div>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">do my homework</div>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">answer this question</div>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">solve this problem</div>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">give me the answer</div>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">write code for</div>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">tell me what</div>
                    <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">complete this assignment</div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <h4 className="font-medium mb-2">Recent Learning Improvements</h4>
                  <div className="space-y-3 text-sm">
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                      <div className="font-medium text-blue-800">Math Problem Detection</div>
                      <div className="text-blue-700 mt-1">Improved detection of math problems being asked without showing work</div>
                      <div className="text-blue-500 text-xs mt-1">Updated 2 days ago</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                      <div className="font-medium text-blue-800">Essay Request Rephrasing</div>
                      <div className="text-blue-700 mt-1">Enhanced ability to turn essay requests into outline assistance</div>
                      <div className="text-blue-500 text-xs mt-1">Updated 5 days ago</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                      <div className="font-medium text-blue-800">Multi-step Question Detection</div>
                      <div className="text-blue-700 mt-1">Better identification of attempts to break complex tasks into smaller steps</div>
                      <div className="text-blue-500 text-xs mt-1">Updated 1 week ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Analysis</CardTitle>
              <CardDescription>Insights into student and teacher AI usage patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Activity by User Type</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Students", value: 68 },
                              { name: "Teachers", value: 24 },
                              { name: "Administrators", value: 8 },
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#8b5cf6" />
                            <Cell fill="#f59e0b" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Peak Usage Hours</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { hour: "8-10 AM", value: 45 },
                          { hour: "10-12 PM", value: 65 },
                          { hour: "12-2 PM", value: 40 },
                          { hour: "2-4 PM", value: 80 },
                          { hour: "4-6 PM", value: 55 },
                          { hour: "6-8 PM", value: 30 },
                          { hour: "8-10 PM", value: 20 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Most Active Users</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-start p-2 text-sm font-medium text-slate-500">Name</th>
                          <th className="text-start p-2 text-sm font-medium text-slate-500">Role</th>
                          <th className="text-start p-2 text-sm font-medium text-slate-500">Prompts</th>
                          <th className="text-start p-2 text-sm font-medium text-slate-500">Block Rate</th>
                          <th className="text-start p-2 text-sm font-medium text-slate-500">Last Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 whitespace-nowrap">Michael Wilson</td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Student</span>
                          </td>
                          <td className="p-2 whitespace-nowrap">124</td>
                          <td className="p-2 whitespace-nowrap">15%</td>
                          <td className="p-2 whitespace-nowrap text-slate-500 text-sm">30 mins ago</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 whitespace-nowrap">Emily Davis</td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">Teacher</span>
                          </td>
                          <td className="p-2 whitespace-nowrap">97</td>
                          <td className="p-2 whitespace-nowrap">3%</td>
                          <td className="p-2 whitespace-nowrap text-slate-500 text-sm">2 hours ago</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 whitespace-nowrap">David Thompson</td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Student</span>
                          </td>
                          <td className="p-2 whitespace-nowrap">89</td>
                          <td className="p-2 whitespace-nowrap">22%</td>
                          <td className="p-2 whitespace-nowrap text-slate-500 text-sm">1 hour ago</td>
                        </tr>
                        <tr>
                          <td className="p-2 whitespace-nowrap">Sarah Johnson</td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Student</span>
                          </td>
                          <td className="p-2 whitespace-nowrap">76</td>
                          <td className="p-2 whitespace-nowrap">18%</td>
                          <td className="p-2 whitespace-nowrap text-slate-500 text-sm">45 mins ago</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
