import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface GradingCriteria {
  grade_name: string;
  gpa_value: number;
}

interface AddModuleDialogProps {
  userId: string;
  semesterId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModuleAdded: () => void;
}

export const AddModuleDialog = ({ 
  userId, 
  semesterId, 
  open, 
  onOpenChange, 
  onModuleAdded 
}: AddModuleDialogProps) => {
  const [formData, setFormData] = useState({
    module_code: "",
    module_name: "",
    credit_hours: "",
    grade: "",
    module_type: "compulsory" as "compulsory" | "elective" | "optional",
    attempt_type: "first_attempt" as "first_attempt" | "repeat" | "dropped",
  });
  const [availableGrades, setAvailableGrades] = useState<GradingCriteria[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadGradingCriteria();
    }
  }, [open, userId]);

  const loadGradingCriteria = async () => {
    try {
      const { data, error } = await supabase
        .from("grading_criteria")
        .select("grade_name, gpa_value")
        .eq("user_id", userId)
        .order("gpa_value", { ascending: false });

      if (error) throw error;
      setAvailableGrades(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load grading criteria",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("modules")
        .insert({
          user_id: userId,
          semester_id: semesterId,
          module_code: formData.module_code,
          module_name: formData.module_name,
          credit_hours: parseInt(formData.credit_hours),
          grade: formData.grade,
          module_type: formData.module_type,
          attempt_type: formData.attempt_type,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Module added successfully!",
      });

      // Reset form
      setFormData({
        module_code: "",
        module_name: "",
        credit_hours: "",
        grade: "",
        module_type: "compulsory",
        attempt_type: "first_attempt",
      });

      onModuleAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Module</DialogTitle>
          <DialogDescription>
            Add a module to track your performance for this semester.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="module_code">Module Code</Label>
                <Input
                  id="module_code"
                  placeholder="CS101"
                  value={formData.module_code}
                  onChange={(e) => setFormData({ ...formData, module_code: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="credit_hours">Credit Hours</Label>
                <Input
                  id="credit_hours"
                  type="number"
                  min="1"
                  placeholder="3"
                  value={formData.credit_hours}
                  onChange={(e) => setFormData({ ...formData, credit_hours: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="module_name">Module Name</Label>
              <Input
                id="module_name"
                placeholder="Introduction to Computer Science"
                value={formData.module_name}
                onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {availableGrades.map((grade) => (
                    <SelectItem key={grade.grade_name} value={grade.grade_name}>
                      {grade.grade_name} ({grade.gpa_value.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="module_type">Module Type</Label>
                <Select 
                  value={formData.module_type} 
                  onValueChange={(value: "compulsory" | "elective" | "optional") => 
                    setFormData({ ...formData, module_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compulsory">Compulsory</SelectItem>
                    <SelectItem value="elective">Elective</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attempt_type">Attempt Type</Label>
                <Select 
                  value={formData.attempt_type} 
                  onValueChange={(value: "first_attempt" | "repeat" | "dropped") => 
                    setFormData({ ...formData, attempt_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_attempt">First Attempt</SelectItem>
                    <SelectItem value="repeat">Repeat</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Module
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};