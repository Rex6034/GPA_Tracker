/*
 * Academic Transcript Component
 * 
 * This component displays a student's academic transcript with options to print, download as PDF,
 * and send via email.
 * 
 * IMPORTANT: Email Functionality Setup
 * This component uses EmailJS for sending emails directly from the frontend.
 * To enable the email functionality, you need to:
 * 
 * 1. Go to https://www.emailjs.com/ and create an account
 * 2. Create an Email Service (Gmail, Outlook, etc.)
 * 3. Create an Email Template with the following template parameters:
 *    - user_name: Student's name
 *    - user_email: Recipient's email
 *    - message: Email body with transcript details
 *    - attachment: PDF attachment (base64 encoded)
 * 4. Replace the placeholder values in the code:
 *    - YOUR_SERVICE_ID: Your EmailJS service ID
 *    - YOUR_TEMPLATE_ID: Your EmailJS template ID
 *    - YOUR_PUBLIC_KEY: Your EmailJS public key
 * 
 * If you're having issues with the email functionality:
 * - Make sure your service ID, template ID, and public key are correct
 * - Check that your email template is properly configured
 * - Note that file attachments require a paid EmailJS plan
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { LogOut, ArrowLeft, Printer, Mail, Download, GraduationCap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useReactToPrint } from "react-to-print";
import html2pdf from "html2pdf.js";
import emailjs from "@emailjs/browser";
// EmailJS is used for sending emails with attachments
// See https://www.emailjs.com/ for more information

// Initialize EmailJS
emailjs.init("R5AMPSOC9S4U9At_j"); // Replace with your EmailJS public key

interface Profile {
  id: string;
  full_name: string;
  university_name: string;
  course_name: string;
  registration_number: string;
  phone_number?: string;
  university_start_year: number;
  university_end_year: number;
}

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
  semester_id: string;
  module_code: string;
  module_name: string;
  credit_hours: number;
  grade: string;
  module_type: string;
  attempt_type: string;
}

interface GradingCriteria {
  id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_point: number;
}

const Transcript = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [gradingCriteria, setGradingCriteria] = useState<GradingCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [cumulativeGPA, setCumulativeGPA] = useState<number>(0);
  const [semesterGPAs, setSemesterGPAs] = useState<{[key: string]: number}>({});
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadProfile(session.user.id);
      await loadGradingCriteria(session.user.id);
      await loadSemesters(session.user.id);
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

  useEffect(() => {
    if (semesters.length > 0 && user) {
      loadModules(user.id);
      calculateGPAs(user.id);
    }
  }, [semesters, user]);

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

  const loadGradingCriteria = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("grading_criteria")
        .select("*")
        .eq("user_id", userId)
        .order("grade_point", { ascending: false });

      if (error) throw error;
      setGradingCriteria(data?.map(item => ({
        id: item.id,
        grade: item.grade_name,
        min_percentage: item.min_percentage,
        max_percentage: item.max_percentage,
        grade_point: item.gpa_value
      })) || []);
    } catch (error: any) {
      console.error("Error loading grading criteria:", error);
    }
  };

  const loadSemesters = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("semesters")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setSemesters(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load semesters",
        variant: "destructive",
      });
    }
  };

  const loadModules = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      setModules(data || []);
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

  const calculateGPAs = async (userId: string) => {
    try {
      // Get cumulative GPA
      const { data: cumulativeGPAData } = await supabase
        .rpc("calculate_gpa", { p_user_id: userId });
      
      if (cumulativeGPAData !== null) {
        setCumulativeGPA(parseFloat(cumulativeGPAData.toString()));
      }

      // Get semester GPAs
      const semesterGPAResults: {[key: string]: number} = {};
      
      for (const semester of semesters) {
        const { data: semesterGPAData } = await supabase
          .rpc("calculate_gpa", { 
            p_user_id: userId, 
            p_semester_id: semester.id 
          });
        
        if (semesterGPAData !== null) {
          semesterGPAResults[semester.id] = parseFloat(semesterGPAData.toString());
        }
      }
      
      setSemesterGPAs(semesterGPAResults);
    } catch (error: any) {
      console.error("Error calculating GPA:", error);
    }
  };

  const getGradePoint = (grade: string): number => {
    const criteria = gradingCriteria.find(c => c.grade === grade);
    return criteria ? criteria.grade_point : 0;
  };

  const handlePrint = useReactToPrint({
    //content: () => printRef.current,
    documentTitle: `${profile?.full_name}_Transcript`,
    onAfterPrint: () => {
      toast({
        title: "Success",
        description: "Transcript printed successfully",
      });
    },
  });

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    
    // Show loading toast
    toast({
      title: "Processing",
      description: "Generating PDF, please wait...",
    });
    
    // Configure html2pdf options
    const options = {
      margin: 10,
      filename: `${profile?.full_name}_Transcript.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: true,
        letterRendering: true,
        allowTaint: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Add a small delay to ensure UI updates before PDF generation starts
    setTimeout(() => {
      // Generate PDF using html2pdf
      html2pdf()
        .set(options)
        .from(printRef.current)
        .save()
        .then(() => {
          toast({
            title: "Success",
            description: "Transcript downloaded as PDF successfully",
          });
        })
        .catch((error) => {
          console.error("Error generating PDF:", error);
          toast({
            title: "Error",
            description: "Failed to generate PDF. Please try again.",
            variant: "destructive",
          });
        });
    }, 100);
  };

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleSendEmail = async () => {
    if (!emailAddress || !printRef.current) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    if (!isValidEmail(emailAddress)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingEmail(true);
      toast({
        title: "Processing",
        description: "Generating PDF and sending email...",
      });
      
      // Generate PDF as base64 for attachment
      const options = {
        margin: 10,
        filename: `${profile?.full_name}_Transcript.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Create PDF as base64 string
      const pdfBase64 = await html2pdf()
        .set(options)
        .from(printRef.current)
        .outputPdf('datauristring');
      
      // Create HTML email body
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Academic Transcript</h2>
          <p>Dear recipient,</p>
          <p>${profile?.full_name} has shared their academic transcript with you.</p>
          <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #0070f3; background-color: #f0f7ff;">
            <p><strong>Student:</strong> ${profile?.full_name}</p>
            <p><strong>University:</strong> ${profile?.university_name}</p>
            <p><strong>Program:</strong> ${profile?.course_name}</p>
            <p><strong>Registration Number:</strong> ${profile?.registration_number}</p>
            <p><strong>Cumulative GPA:</strong> ${cumulativeGPA.toFixed(2)}</p>
          </div>
          <p>Please find the complete transcript attached to this email.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      `;
      
      // Prepare template parameters for EmailJS
      const templateParams = {
        user_name: profile?.full_name,
        user_email: emailAddress,
        message: emailBody,
        attachment: pdfBase64,
        subject: `Academic Transcript - ${profile?.full_name}`,
        from_name: 'UniTrack System',
        pdf_name: `${profile?.full_name}_Transcript.pdf`
      };
      
      // Send the email using EmailJS
      const response = await emailjs.send(
        'service_5vmx7ss', // Replace with your EmailJS service ID
        'template_bfrww34', // Replace with your EmailJS template ID
        templateParams,
        'R5AMPSOC9S4U9At_j' // Public key as the fourth parameter
      );
      
      console.log('SUCCESS!', response.status, response.text);
      
      // If we reach here, the email was sent successfully
      toast({
        title: "Success",
        description: "Transcript sent to " + emailAddress,
      });
      
      setEmailDialogOpen(false);
      setEmailAddress("");
    } catch (error) {
      console.error("Error sending email:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Provide more helpful error message based on common issues
      let errorMessage = "Failed to send email. ";
      
      // Handle different error types properly to avoid [object Object] error
      if (error instanceof Error) {
        // If it's a standard Error object
        const errorStr = error.message || String(error);
        
        if (errorStr.includes("service_id") || errorStr.includes("template_id") || errorStr.includes("public_key")) {
          errorMessage += "You need to set up your EmailJS credentials. Visit https://www.emailjs.com/ to get your service ID, template ID, and public key.";
        } else if (errorStr.includes("Network Error") || errorStr.includes("Failed to fetch")) {
          errorMessage += "Network error. Please check your internet connection.";
        } else if (errorStr.includes("limit") || errorStr.includes("quota") || errorStr.includes("plan")) {
          errorMessage += "You may have reached your EmailJS usage limit. Note that file attachments require a paid EmailJS plan.";
        } else {
          errorMessage += errorStr;
        }
      } else if (typeof error === 'object' && error !== null) {
        // If it's a non-Error object, try to extract meaningful information
        const errorObj = error as Record<string, any>;
        if (errorObj.text) {
          errorMessage += errorObj.text;
        } else if (errorObj.message) {
          errorMessage += errorObj.message;
        } else {
          // Safely stringify the object
          try {
            errorMessage += JSON.stringify(error);
          } catch {
            errorMessage += "Unknown error occurred.";
          }
        }
      } else {
        // For primitive error types or null/undefined
        errorMessage += String(error);
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
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
  
  // Empty state when no semesters or modules
  if (semesters.length === 0 || modules.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Academic Transcript</h1>
          <div className="ml-auto">
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="bg-muted rounded-full p-6 mb-6">
            <GraduationCap className="h-16 w-16 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Academic Data Available</h2>
          <p className="text-center text-muted-foreground mb-6 max-w-md">
            You haven't added any semesters or modules yet. Start by adding your academic information to generate your transcript.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="min-w-[200px]">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Academic Transcript</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-end mb-4 space-x-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Email Transcript</DialogTitle>
                  <DialogDescription>
                    Enter the email address where you want to send your transcript.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={emailAddress} 
                    onChange={(e) => setEmailAddress(e.target.value)} 
                    placeholder="example@email.com"
                  />
                </div>
                <DialogFooter>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={sendingEmail}
                  className="relative"
                >
                  {sendingEmail ? (
                    <>
                      <span className="opacity-0">Send</span>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div ref={printRef}>
            <Card className="mb-8">
              <CardHeader className="text-center border-b pb-6">
                <div className="mb-2">
                  <h2 className="text-3xl font-bold uppercase">{profile?.university_name}</h2>
                  <p className="text-lg">OFFICIAL ACADEMIC TRANSCRIPT</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 text-left">
                  <div>
                    <p><strong>Student Name:</strong> {profile?.full_name}</p>
                    <p><strong>Registration Number:</strong> {profile?.registration_number}</p>
                    <p><strong>Program:</strong> {profile?.course_name}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Academic Period:</strong> {profile?.university_start_year} - {profile?.university_end_year}</p>
                    <p><strong>Cumulative GPA:</strong> {cumulativeGPA.toFixed(2)}</p>
                    <p><strong>Date Issued:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-6">
                {semesters.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <GraduationCap className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Academic Records</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                      You haven't added any semesters or modules yet. Go to the Dashboard to add your academic records.
                    </p>
                    <Button onClick={() => navigate("/dashboard")}>
                      Go to Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {semesters.map((semester) => {
                      const semesterModules = modules.filter(m => m.semester_id === semester.id);
                      const semesterGPA = semesterGPAs[semester.id] || 0;
                      
                      return (
                        <div key={semester.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted p-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-semibold">{semester.semester_name} - {semester.academic_year}</h3>
                              <p><strong>Semester GPA:</strong> {semesterGPA.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead className="text-center">Credits</TableHead>
                                <TableHead className="text-center">Grade</TableHead>
                                <TableHead className="text-center">Grade Points</TableHead>
                                <TableHead className="text-center">Type</TableHead>
                                <TableHead className="text-center">Attempt</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {semesterModules.map((module) => (
                                <TableRow key={module.id}>
                                  <TableCell className="font-medium">{module.module_code}</TableCell>
                                  <TableCell>{module.module_name}</TableCell>
                                  <TableCell className="text-center">{module.credit_hours}</TableCell>
                                  <TableCell className="text-center">{module.grade}</TableCell>
                                  <TableCell className="text-center">{getGradePoint(module.grade).toFixed(1)}</TableCell>
                                  <TableCell className="text-center capitalize">{module.module_type.replace('_', ' ')}</TableCell>
                                  <TableCell className="text-center capitalize">{module.attempt_type.replace('_', ' ')}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="border-t pt-6 flex flex-col items-start">
                <div className="w-full">
                  <h4 className="font-semibold mb-2">Grading System</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {gradingCriteria.map((criteria) => (
                      <div key={criteria.id} className="text-sm">
                        <strong>{criteria.grade}:</strong> {criteria.min_percentage}-{criteria.max_percentage}% ({criteria.grade_point.toFixed(1)})
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-8 pt-8 border-t w-full">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">This transcript is official only with the university seal and signature of the registrar.</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Registrar</p>
                      <div className="h-10 mt-2 border-b border-dashed"></div>
                    </div>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Transcript;