import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit3 } from "lucide-react";

interface Module {
  id: string;
  module_code: string;
  module_name: string;
  credit_hours: number;
  grade: string;
  module_type: string;
  attempt_type: string;
}

interface ModuleListProps {
  modules: Module[];
  semesterId: string;
  userId: string;
  onUpdate: () => void;
}

export const ModuleList = ({ modules, onUpdate }: ModuleListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDelete = async (moduleId: string) => {
    setDeletingId(moduleId);
    try {
      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Module deleted successfully!",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getModuleTypeVariant = (type: string) => {
    switch (type) {
      case "compulsory":
        return "default";
      case "elective":
        return "secondary";
      case "optional":
        return "outline";
      default:
        return "default";
    }
  };

  const getAttemptTypeVariant = (type: string) => {
    switch (type) {
      case "first_attempt":
        return "default";
      case "repeat":
        return "destructive";
      case "dropped":
        return "outline";
      default:
        return "default";
    }
  };

  if (modules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No modules added yet. Add your first module to start tracking your performance.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module Code</TableHead>
            <TableHead>Module Name</TableHead>
            <TableHead className="text-center">Credits</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead className="text-center">Attempt</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((module) => (
            <TableRow key={module.id}>
              <TableCell className="font-medium">{module.module_code}</TableCell>
              <TableCell>{module.module_name}</TableCell>
              <TableCell className="text-center">{module.credit_hours}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">{module.grade}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={getModuleTypeVariant(module.module_type)}>
                  {module.module_type.charAt(0).toUpperCase() + module.module_type.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={getAttemptTypeVariant(module.attempt_type)}>
                  {module.attempt_type === "first_attempt" 
                    ? "First" 
                    : module.attempt_type.charAt(0).toUpperCase() + module.attempt_type.slice(1)
                  }
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" variant="outline">
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Module</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {module.module_code}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(module.id)}
                          disabled={deletingId === module.id}
                        >
                          {deletingId === module.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};