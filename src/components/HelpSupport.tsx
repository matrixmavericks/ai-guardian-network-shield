
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  HelpCircle,
  FileText, 
  MessageCircle, 
  ExternalLink,
  Search,
  CheckCircle,
  BookOpen,
  Video,
  Lightbulb
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

const HelpSupport = () => {
  const { toast } = useToast();
  
  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Support ticket submitted",
      description: "Our team will respond to your inquiry soon.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Help & Support</h2>
        <p className="text-slate-500">Find answers and get assistance with AI Conditioner</p>
      </div>
      
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          className="pl-10 py-6 text-lg" 
          placeholder="Search for help topics..." 
        />
      </div>
      
      <Tabs defaultValue="faq">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="faq" className="flex items-center">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center">
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Support
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find answers to common questions about AI Conditioner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    How does AI Conditioner prevent VPN and proxy bypass attempts?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      AI Conditioner uses multiple layers of protection to prevent VPN and proxy bypass attempts:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Deep Packet Inspection (DPI) to detect VPN protocols</li>
                      <li>DNS filtering to block custom DNS servers and DoH/DoT</li>
                      <li>IP blocklists for known VPNs and proxies</li>
                      <li>Traffic pattern analysis to detect tunneling and proxy usage</li>
                    </ul>
                    <p className="mt-2">
                      These technologies work together to create a comprehensive security layer that's extremely difficult to bypass.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    How do I set up AI Conditioner on our school network?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      Setting up AI Conditioner is a straightforward process:
                    </p>
                    <ol className="list-decimal pl-6 space-y-2">
                      <li>
                        <span className="font-medium">Network Gateway Setup:</span> Configure your network gateway to route traffic through AI Conditioner.
                      </li>
                      <li>
                        <span className="font-medium">DNS Configuration:</span> Set up your DNS settings to use AI Conditioner's filtering.
                      </li>
                      <li>
                        <span className="font-medium">Certificate Installation:</span> Install the AI Conditioner certificate on network devices.
                      </li>
                      <li>
                        <span className="font-medium">User Management:</span> Add your users and set appropriate permissions.
                      </li>
                    </ol>
                    <p className="mt-2">
                      Our detailed setup guide provides step-by-step instructions, or you can contact our support team for assistance.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    How does AI Conditioner handle math homework questions?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      AI Conditioner uses advanced pattern recognition to distinguish between appropriate and inappropriate math help requests:
                    </p>
                    <div className="space-y-3 mt-3">
                      <div className="bg-red-50 p-3 rounded-md border border-red-100">
                        <p className="font-medium text-red-800">Blocked:</p>
                        <p className="text-red-700">"What is 7x + 39x?"</p>
                        <p className="text-sm text-red-600 mt-1">This asks for a direct answer without showing work.</p>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-md border border-green-100">
                        <p className="font-medium text-green-800">Allowed:</p>
                        <p className="text-green-700">"Can you explain how to solve 7x + 39x step by step?"</p>
                        <p className="text-sm text-green-600 mt-1">This asks for the process and learning approach.</p>
                      </div>
                    </div>
                    <p className="mt-2">
                      The system is trained to detect and rewrite direct answer requests into process-oriented learning opportunities.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger>
                    Can AI Conditioner work with our existing security tools?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p>
                      Yes, AI Conditioner is designed to integrate seamlessly with existing school security infrastructure. It works alongside content filters, firewalls, MDM solutions, and other educational security tools. Our system can be deployed as a complementary layer focused specifically on AI interactions, while your existing tools continue to handle general internet security.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5">
                  <AccordionTrigger>
                    How does AI training work in AI Conditioner?
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2">
                      AI Conditioner's training system allows administrators to:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Create custom examples of problematic prompts and preferred responses</li>
                      <li>Upload datasets of approved educational interactions</li>
                      <li>Specify subject-specific guidelines (e.g., math vs. language arts)</li>
                      <li>Train the system to recognize your school's specific assignment patterns</li>
                    </ul>
                    <p className="mt-2">
                      As the system processes more interactions, it continuously improves its ability to distinguish between appropriate learning assistance and inappropriate academic shortcuts.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="ml-2">Getting Started Guides</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Quick Start Guide
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Network Configuration
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      User Management Basics
                    </a>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="bg-purple-100 p-2 rounded-full">
                    <Video className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="ml-2">Video Tutorials</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Installation Walkthrough
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      AI Training Demo
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Managing School Networks
                    </a>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                  </div>
                  <CardTitle className="ml-2">Tips & Best Practices</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Optimizing Filter Accuracy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preventing VPN Bypasses
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-blue-600 hover:underline flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Educational AI Policy Templates
                    </a>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Documentation & Resources</CardTitle>
              <CardDescription>Comprehensive guides and technical documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Technical Documentation</h3>
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <h4 className="ml-2 font-medium">Administrator Guide</h4>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Complete documentation for system administrators</p>
                      <div className="flex items-center mt-2">
                        <Badge variant="outline">v3.2.1</Badge>
                        <span className="text-xs text-slate-500 ml-2">Updated 2 days ago</span>
                      </div>
                      <Button variant="outline" className="w-full mt-3">View Documentation</Button>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <h4 className="ml-2 font-medium">Network Integration Guide</h4>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">How to integrate with school networks</p>
                      <div className="flex items-center mt-2">
                        <Badge variant="outline">v2.1.4</Badge>
                        <span className="text-xs text-slate-500 ml-2">Updated 1 week ago</span>
                      </div>
                      <Button variant="outline" className="w-full mt-3">View Documentation</Button>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <h4 className="ml-2 font-medium">API Reference</h4>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Complete API documentation for developers</p>
                      <div className="flex items-center mt-2">
                        <Badge variant="outline">v1.5.0</Badge>
                        <span className="text-xs text-slate-500 ml-2">Updated 3 days ago</span>
                      </div>
                      <Button variant="outline" className="w-full mt-3">View Documentation</Button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Educational Resources</h3>
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <BookOpen className="h-5 w-5 text-green-600" />
                        <h4 className="ml-2 font-medium">Teacher Resources</h4>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Materials for teaching responsible AI use</p>
                      <Button variant="outline" className="w-full mt-3">Access Resources</Button>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <h4 className="ml-2 font-medium">Student Guidelines</h4>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">How to use AI ethically for learning</p>
                      <Button variant="outline" className="w-full mt-3">Access Resources</Button>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Video className="h-5 w-5 text-purple-600" />
                        <h4 className="ml-2 font-medium">Video Training Library</h4>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">Complete collection of training videos</p>
                      <Button variant="outline" className="w-full mt-3">Access Library</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contact" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Get in touch with our support team for assistance</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input id="name" placeholder="Your name" required />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                    <Input id="email" type="email" placeholder="Your email address" required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                  <Input id="subject" placeholder="Brief description of your issue" required />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">Issue Category</label>
                  <select 
                    id="category" 
                    className="w-full p-2 border border-slate-300 rounded-md"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="installation">Installation & Setup</option>
                    <option value="network">Network Configuration</option>
                    <option value="filtering">AI Filtering Issues</option>
                    <option value="bypass">VPN/Bypass Protection</option>
                    <option value="account">Account & Billing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">Message</label>
                  <Textarea 
                    id="message" 
                    placeholder="Please describe your issue in detail" 
                    rows={5}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="attachment" className="text-sm font-medium">Attachment (Optional)</label>
                  <Input id="attachment" type="file" />
                  <p className="text-xs text-slate-500">Max file size: 10MB</p>
                </div>
                
                <Button type="submit" className="w-full md:w-auto">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Submit Support Ticket
                </Button>
              </form>
              
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-medium mb-4">Other Ways to Reach Us</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      <h4 className="ml-2 font-medium">Live Chat</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">Chat with our support team in real-time</p>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-green-600">Available now</span>
                      <span className="text-xs text-slate-500 ml-2">(8AM - 6PM EST)</span>
                    </div>
                    <Button className="mt-3 w-full">Start Chat</Button>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-md">
                    <div className="flex items-center mb-2">
                      <HelpCircle className="h-5 w-5 text-blue-600" />
                      <h4 className="ml-2 font-medium">Schedule a Call</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">Book a call with a technical specialist</p>
                    <Button variant="outline" className="mt-3 w-full">Schedule Call</Button>
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

export default HelpSupport;
