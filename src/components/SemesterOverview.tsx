import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AddSemesterDialog } from "@/components/AddSemesterDialog";
import { SemesterCard } from "@/components/SemesterCard";
import { Plus, GraduationCap, Calculator } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Semester {
  id: string;
  semester_name: string;
  academic_year: string;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
}

interface SemesterOverviewProps {
  userId: string;
}

export const SemesterOverview = ({ userId }: SemesterOverviewProps) => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentGPA, setCurrentGPA] = useState<number>(0);
  const [cumulativeGPA, setCumulativeGPA] = useState<number>(0);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingSemesterId, setDeletingSemesterId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [semesterToDelete, setSemesterToDelete] = useState<Semester | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSemesters();
    calculateGPAs();
  }, [userId]);

  const loadSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from("semesters")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load semesters",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateGPAs = async () => {
    try {
      // Get current semester GPA
      const currentSemester = semesters.find(s => s.is_current);
      if (currentSemester) {
        const { data: currentGPAData } = await supabase
          .rpc("calculate_gpa", { 
            p_user_id: userId, 
            p_semester_id: currentSemester.id 
          });
        
        if (currentGPAData !== null) {
          setCurrentGPA(parseFloat(currentGPAData.toString()));
        }
      }

      // Get cumulative GPA
      const { data: cumulativeGPAData } = await supabase
        .rpc("calculate_gpa", { p_user_id: userId });
      
      if (cumulativeGPAData !== null) {
        setCumulativeGPA(parseFloat(cumulativeGPAData.toString()));
      }
    } catch (error: any) {
      console.error("Error calculating GPA:", error);
    }
  };

  const handleSemesterAdded = () => {
    loadSemesters();
    calculateGPAs();
    setShowAddDialog(false);
  };

  const handleSemesterUpdated = () => {
    loadSemesters();
    calculateGPAs();
  };

  const handleDeleteSemester = (semester: Semester) => {
    setSemesterToDelete(semester);
    setShowDeleteDialog(true);
  };

  const confirmDeleteSemester = async () => {
    if (!semesterToDelete) return;
    
    setDeletingSemesterId(semesterToDelete.id);
    try {
      // First delete all modules associated with this semester
      const { error: modulesError } = await supabase
        .from("modules")
        .delete()
        .eq("semester_id", semesterToDelete.id);

      if (modulesError) throw modulesError;

      // Then delete the semester
      const { error: semesterError } = await supabase
        .from("semesters")
        .delete()
        .eq("id", semesterToDelete.id);

      if (semesterError) throw semesterError;

      toast({
        title: "Success",
        description: "Semester and its modules deleted successfully!",
      });

      loadSemesters();
      calculateGPAs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingSemesterId(null);
      setShowDeleteDialog(false);
      setSemesterToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* GPA Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Semester GPA</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentGPA.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Based on current semester modules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumulative GPA</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cumulativeGPA.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Overall academic performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Semesters Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Academic Semesters</CardTitle>
              <CardDescription>
                Manage your academic semesters and track your progress
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Semester
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {semesters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No semesters added yet. Add your first semester to start tracking your GPA.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Semester
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {semesters.map((semester) => (
                <SemesterCard 
                  key={semester.id} 
                  semester={semester} 
                  userId={userId}
                  onUpdate={handleSemesterUpdated}
                  onDelete={handleDeleteSemester}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddSemesterDialog
        userId={userId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSemesterAdded={handleSemesterAdded}
      />

      {/* Delete Semester Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Semester</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {semesterToDelete?.semester_name}? This action will also delete all modules associated with this semester and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSemester}
              disabled={deletingSemesterId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingSemesterId === semesterToDelete?.id ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};