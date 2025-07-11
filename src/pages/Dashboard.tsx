import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { GradingCriteriaSetup } from "@/components/GradingCriteriaSetup";
import { SemesterOverview } from "@/components/SemesterOverview";
import { LogOut, Settings, Award, FileText } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  university_name: string;
  course_name: string;
  registration_number: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasGradingCriteria, setHasGradingCriteria] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadProfile(session.user.id);
      await checkGradingCriteria(session.user.id);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const checkGradingCriteria = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("grading_criteria")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (error) throw error;
      setHasGradingCriteria(data && data.length > 0);
    } catch (error: any) {
      console.error("Error checking grading criteria:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasGradingCriteria) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">GPA Tracker</h1>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Welcome, {profile?.full_name}!</CardTitle>
                <CardDescription>
                  {profile?.course_name} at {profile?.university_name}
                </CardDescription>
              </CardHeader>
            </Card>
            
            <GradingCriteriaSetup 
              userId={user?.id!} 
              onComplete={() => setHasGradingCriteria(true)} 
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">GPA Tracker</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/leaderboard")}
            >
              <Award className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/transcript")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Transcript
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Welcome back, {profile?.full_name}!</CardTitle>
              <CardDescription>
                {profile?.course_name} at {profile?.university_name} • Registration: {profile?.registration_number}
              </CardDescription>
            </CardHeader>
          </Card>
          
          <SemesterOverview userId={user?.id!} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;