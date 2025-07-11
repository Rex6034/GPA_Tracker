import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AddModuleDialog } from "@/components/AddModuleDialog";
import { ModuleList } from "@/components/ModuleList";
import { Plus, Calendar, BookOpen, Calculator, Trash2 } from "lucide-react";

interface Semester {
  id: string;
  semester_name: string;
  academic_year: string;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
}

interface Module {
  id: string;
  module_code: string;
  module_name: string;
  credit_hours: number;
  grade: string;
  module_type: string;
  attempt_type: string;
}

interface SemesterCardProps {
  semester: Semester;
  userId: string;
  onUpdate: () => void;
  onDelete?: (semester: Semester) => void;
}

export const SemesterCard = ({ semester, userId, onUpdate, onDelete }: SemesterCardProps) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [semesterGPA, setSemesterGPA] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [showAddModule, setShowAddModule] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadModules();
    calculateSemesterGPA();
  }, [semester.id]);

  const loadModules = async () => {
    try {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("semester_id", semester.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setModules(data || []);
      
      // Calculate total credits
      const credits = data?.reduce((sum, module) => 
        module.attempt_type !== 'dropped' ? sum + module.credit_hours : sum, 0
      ) || 0;
      setTotalCredits(credits);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load modules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSemesterGPA = async () => {
    try {
      const { data } = await supabase
        .rpc("calculate_gpa", { 
          p_user_id: userId, 
          p_semester_id: semester.id 
        });
      
      if (data !== null) {
        setSemesterGPA(parseFloat(data.toString()));
      }
    } catch (error: any) {
      console.error("Error calculating semester GPA:", error);
    }
  };

  const handleModuleAdded = () => {
    loadModules();
    calculateSemesterGPA();
    onUpdate();
    setShowAddModule(false);
  };

  const handleModuleUpdated = () => {
    loadModules();
    calculateSemesterGPA();
    onUpdate();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{semester.semester_name}</CardTitle>
              {semester.is_current && (
                <Badge variant="secondary">Current</Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-4">
              <span>{semester.academic_year}</span>
              {semester.start_date && semester.end_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(semester.start_date)} - {formatDate(semester.end_date)}
                </span>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold">{semesterGPA.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">GPA</div>
            </div>
            
            {onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(semester)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {modules.length} modules
            </span>
            <span className="flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              {totalCredits} credits
            </span>
          </div>
          
          <Button size="sm" onClick={() => setShowAddModule(true)}>
            <Plus className="mr-2 h-3 w-3" />
            Add Module
          </Button>
        </div>

        <ModuleList 
          modules={modules} 
          semesterId={semester.id}
          userId={userId}
          onUpdate={handleModuleUpdated}
        />

        <AddModuleDialog
          userId={userId}
          semesterId={semester.id}
          open={showAddModule}
          onOpenChange={setShowAddModule}
          onModuleAdded={handleModuleAdded}
        />
      </CardContent>
    </Card>
  );
};