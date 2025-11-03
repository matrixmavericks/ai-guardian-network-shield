import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Brain, Plus, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

export default function ModelTrainingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trainingData, setTrainingData] = useState<any[]>([]);
  const [newData, setNewData] = useState({
    subject: '',
    gradeLevel: '',
    inputPrompt: '',
    idealResponse: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainingData();
  }, []);

  const fetchTrainingData = async () => {
    try {
      const { data, error } = await supabase
        .from('model_training_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainingData(data || []);
    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrainingData = async () => {
    if (!newData.subject || !newData.inputPrompt || !newData.idealResponse) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('model_training_data').insert({
        created_by: user?.id,
        subject: newData.subject,
        grade_level: newData.gradeLevel,
        input_prompt: newData.inputPrompt,
        ideal_response: newData.idealResponse,
        approved: false,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Training data added successfully',
      });

      setNewData({
        subject: '',
        gradeLevel: '',
        inputPrompt: '',
        idealResponse: '',
      });

      fetchTrainingData();
    } catch (error) {
      console.error('Error adding training data:', error);
      toast({
        title: 'Error',
        description: 'Failed to add training data',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('model_training_data')
        .update({ approved: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Training data approved',
      });

      fetchTrainingData();
    } catch (error) {
      console.error('Error approving data:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve data',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('model_training_data')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Training data deleted',
      });

      fetchTrainingData();
    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete data',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading training data...</div>;
  }

  const subjects = ['Math', 'Science', 'English', 'History', 'Programming', 'Other'];
  const gradeLevels = ['K-5', '6-8', '9-12', 'College', 'Professional'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Model Training</h1>
        <p className="text-muted-foreground">
          Train custom AI models with ethical prompt-response pairs
        </p>
      </div>

      {/* Add New Training Data */}
      <Card>
        <CardHeader>
          <CardTitle>Add Training Example</CardTitle>
          <CardDescription>
            Provide examples of ethical prompts and ideal AI responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select
                value={newData.subject}
                onValueChange={(value) => setNewData({ ...newData, subject: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject.toLowerCase()}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grade Level</Label>
              <Select
                value={newData.gradeLevel}
                onValueChange={(value) => setNewData({ ...newData, gradeLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Input Prompt *</Label>
            <Textarea
              placeholder="Example: 'Can you help me understand photosynthesis?'"
              value={newData.inputPrompt}
              onChange={(e) => setNewData({ ...newData, inputPrompt: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Ideal Response *</Label>
            <Textarea
              placeholder="Example: 'Let's explore photosynthesis together! First, what do you already know about how plants make food?'"
              value={newData.idealResponse}
              onChange={(e) => setNewData({ ...newData, idealResponse: e.target.value })}
              rows={4}
            />
          </div>

          <Button onClick={handleAddTrainingData} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Training Example
          </Button>
        </CardContent>
      </Card>

      {/* Existing Training Data */}
      <Card>
        <CardHeader>
          <CardTitle>Training Dataset</CardTitle>
          <CardDescription>
            {trainingData.length} examples • {trainingData.filter(d => d.approved).length} approved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trainingData.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No training data yet. Add your first example above.</p>
              </div>
            ) : (
              trainingData.map((data) => (
                <div key={data.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{data.subject}</Badge>
                      {data.grade_level && <Badge variant="outline">{data.grade_level}</Badge>}
                      {data.approved ? (
                        <Badge className="bg-success text-success-foreground">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending Review</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!data.approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApprove(data.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(data.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Input Prompt:</p>
                      <p className="text-sm text-muted-foreground">{data.input_prompt}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ideal Response:</p>
                      <p className="text-sm text-muted-foreground">{data.ideal_response}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Added {new Date(data.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
