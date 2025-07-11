import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface AddSemesterDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSemesterAdded: () => void;
}

export const AddSemesterDialog = ({ 
  userId, 
  open, 
  onOpenChange, 
  onSemesterAdded 
}: AddSemesterDialogProps) => {
  const [formData, setFormData] = useState({
    semester_name: "",
    academic_year: "",
    start_date: "",
    end_date: "",
    is_current: false,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If this is set as current, unset all other current semesters
      if (formData.is_current) {
        await supabase
          .from("semesters")
          .update({ is_current: false })
          .eq("user_id", userId);
      }

      const { error } = await supabase
        .from("semesters")
        .insert({
          user_id: userId,
          semester_name: formData.semester_name,
          academic_year: formData.academic_year,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          is_current: formData.is_current,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Semester added successfully!",
      });

      // Reset form
      setFormData({
        semester_name: "",
        academic_year: "",
        start_date: "",
        end_date: "",
        is_current: false,
      });

      onSemesterAdded();
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Semester</DialogTitle>
          <DialogDescription>
            Add a new academic semester to track your modules and GPA.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="semester_name">Semester Name</Label>
              <Input
                id="semester_name"
                placeholder="Fall 2024, Spring 2024, etc."
                value={formData.semester_name}
                onChange={(e) => setFormData({ ...formData, semester_name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input
                id="academic_year"
                placeholder="2023-2024"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="is_current">Current Semester</Label>
              <Switch
                id="is_current"
                checked={formData.is_current}
                onCheckedChange={(checked) => setFormData({ ...formData, is_current: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Semester
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};