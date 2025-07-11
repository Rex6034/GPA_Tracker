import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save } from "lucide-react";

interface GradingCriteria {
  grade_name: string;
  gpa_value: string;
  min_percentage: string;
  max_percentage: string;
}

interface GradingCriteriaSetupProps {
  userId: string;
  onComplete: () => void;
}

const defaultCriteria: GradingCriteria[] = [
  { grade_name: "A+", gpa_value: "4.00", min_percentage: "90", max_percentage: "100" },
  { grade_name: "A", gpa_value: "3.70", min_percentage: "85", max_percentage: "89" },
  { grade_name: "A-", gpa_value: "3.30", min_percentage: "80", max_percentage: "84" },
  { grade_name: "B+", gpa_value: "3.00", min_percentage: "75", max_percentage: "79" },
  { grade_name: "B", gpa_value: "2.70", min_percentage: "70", max_percentage: "74" },
  { grade_name: "B-", gpa_value: "2.30", min_percentage: "65", max_percentage: "69" },
  { grade_name: "C+", gpa_value: "2.00", min_percentage: "60", max_percentage: "64" },
  { grade_name: "C", gpa_value: "1.70", min_percentage: "55", max_percentage: "59" },
  { grade_name: "D", gpa_value: "1.00", min_percentage: "50", max_percentage: "54" },
  { grade_name: "F", gpa_value: "0.00", min_percentage: "0", max_percentage: "49" },
];

export const GradingCriteriaSetup = ({ userId, onComplete }: GradingCriteriaSetupProps) => {
  const [criteria, setCriteria] = useState<GradingCriteria[]>(defaultCriteria);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addCriteria = () => {
    setCriteria([...criteria, { grade_name: "", gpa_value: "", min_percentage: "", max_percentage: "" }]);
  };

  const removeCriteria = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriteria = (index: number, field: keyof GradingCriteria, value: string) => {
    const updated = [...criteria];
    updated[index][field] = value;
    setCriteria(updated);
  };

  const saveCriteria = async () => {
    setLoading(true);
    try {
      // Validate criteria
      const validCriteria = criteria.filter(c => 
        c.grade_name.trim() && 
        c.gpa_value.trim() && 
        !isNaN(parseFloat(c.gpa_value))
      );

      if (validCriteria.length === 0) {
        throw new Error("Please add at least one valid grading criteria");
      }

      // Insert criteria into database
      const { error } = await supabase
        .from("grading_criteria")
        .insert(
          validCriteria.map(c => ({
            user_id: userId,
            grade_name: c.grade_name.trim(),
            gpa_value: parseFloat(c.gpa_value),
            min_percentage: c.min_percentage ? parseFloat(c.min_percentage) : null,
            max_percentage: c.max_percentage ? parseFloat(c.max_percentage) : null,
          }))
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Grading criteria saved successfully!",
      });

      onComplete();
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
    <Card>
      <CardHeader>
        <CardTitle>Setup Your Grading Criteria</CardTitle>
        <CardDescription>
          Define your university's grading system. This will be used to calculate your GPA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {criteria.map((item, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input
                  placeholder="A+"
                  value={item.grade_name}
                  onChange={(e) => updateCriteria(index, "grade_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>GPA Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="4.00"
                  value={item.gpa_value}
                  onChange={(e) => updateCriteria(index, "gpa_value", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Min %</Label>
                <Input
                  type="number"
                  placeholder="90"
                  value={item.min_percentage}
                  onChange={(e) => updateCriteria(index, "min_percentage", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max %</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={item.max_percentage}
                  onChange={(e) => updateCriteria(index, "max_percentage", e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => removeCriteria(index)}
                disabled={criteria.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={addCriteria}>
            <Plus className="mr-2 h-4 w-4" />
            Add Grade
          </Button>
          
          <Button onClick={saveCriteria} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Criteria"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};