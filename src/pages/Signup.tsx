
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ArrowLeft, Building, School, GraduationCap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Signup = () => {
  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState("school");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else {
      toast({
        title: "Account created successfully!",
        description: "Welcome to AI Conditioner. Your account has been created.",
      });
      // Would navigate to dashboard in a real application
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm py-4 px-6 md:px-10 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <Shield className="h-7 w-7 text-blue-600 mr-2" />
          <span className="text-lg font-bold text-slate-800">AI Conditioner</span>
        </Link>
        <div>
          <span className="text-slate-500 mr-2">Already have an account?</span>
          <Link to="/login">
            <Button variant="outline">Log In</Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Choose your organization type</h1>
                <p className="text-slate-600">Let's get started with the right setup for your needs</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={`cursor-pointer overflow-hidden ${orgType === 'school' ? 'ring-2 ring-blue-600' : ''}`} onClick={() => setOrgType('school')}>
                  <CardHeader className="bg-blue-50 pb-6">
                    <div className="bg-blue-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                      <School className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 text-center">
                    <CardTitle className="mb-2">K-12 School</CardTitle>
                    <CardDescription>Primary and secondary educational institutions</CardDescription>
                  </CardContent>
                </Card>
                
                <Card className={`cursor-pointer overflow-hidden ${orgType === 'university' ? 'ring-2 ring-blue-600' : ''}`} onClick={() => setOrgType('university')}>
                  <CardHeader className="bg-blue-50 pb-6">
                    <div className="bg-blue-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                      <GraduationCap className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 text-center">
                    <CardTitle className="mb-2">University</CardTitle>
                    <CardDescription>Higher education and research institutions</CardDescription>
                  </CardContent>
                </Card>
                
                <Card className={`cursor-pointer overflow-hidden ${orgType === 'business' ? 'ring-2 ring-blue-600' : ''}`} onClick={() => setOrgType('business')}>
                  <CardHeader className="bg-blue-50 pb-6">
                    <div className="bg-blue-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                      <Building className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 text-center">
                    <CardTitle className="mb-2">Business</CardTitle>
                    <CardDescription>Corporate training and development</CardDescription>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-8 text-center">
                <Button size="lg" onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <Card className="shadow-lg">
              <CardHeader>
                <Button variant="ghost" className="w-fit p-0 mb-4" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <CardTitle className="text-2xl">Create your account</CardTitle>
                <CardDescription>
                  {orgType === 'school' && "Set up AI Conditioner for your school"}
                  {orgType === 'university' && "Set up AI Conditioner for your university"}
                  {orgType === 'business' && "Set up AI Conditioner for your business"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-6">
                    {/* Organization Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Organization Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="orgName">Organization Name</Label>
                          <Input id="orgName" placeholder="Enter your organization name" required />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="orgSize">Organization Size</Label>
                          <Select>
                            <SelectTrigger id="orgSize">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small (less than 500 users)</SelectItem>
                              <SelectItem value="medium">Medium (500-2000 users)</SelectItem>
                              <SelectItem value="large">Large (more than 2000 users)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="orgAddress">Address</Label>
                        <Input id="orgAddress" placeholder="Enter organization address" />
                      </div>
                    </div>
                    
                    {/* Administrator Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Administrator Details</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" placeholder="Enter your first name" required />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" placeholder="Enter your last name" required />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="Enter your email address" required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="Create a secure password" required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input id="jobTitle" placeholder="Enter your job title" />
                      </div>
                    </div>
                    
                    {/* Network Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Network Information</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="networkType">Network Type</Label>
                        <Select>
                          <SelectTrigger id="networkType">
                            <SelectValue placeholder="Select network type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">Local Network (LAN)</SelectItem>
                            <SelectItem value="cloud">Cloud-Based Infrastructure</SelectItem>
                            <SelectItem value="hybrid">Hybrid Environment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ipRange">IP Range (Optional)</Label>
                          <Input id="ipRange" placeholder="e.g., 192.168.1.0/24" />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="firewallType">Firewall/Router Type (Optional)</Label>
                          <Input id="firewallType" placeholder="e.g., pfSense, Fortinet" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Create Account</Button>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col text-center text-sm text-slate-500 pt-4">
                <p>By creating an account, you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.</p>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
