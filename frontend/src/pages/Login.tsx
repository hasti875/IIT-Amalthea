import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, role } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Password change form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");

  useEffect(() => {
    if (user && role) {
      navigate("/");
    }
  }, [user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error, requirePasswordChange } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast({
        title: "Login Failed",
        description: error,
        variant: "destructive",
      });
      setIsLoading(false);
    } else if (requirePasswordChange) {
      toast({
        title: "Password Change Required",
        description: "You must change your temporary password before continuing.",
        variant: "default",
      });
      // Navigate to change password page or show inline form
      setShowPasswordChange(true);
      setIsLoading(false);
    } else {
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Validate required fields
    if (!firstName || !lastName || !signupEmail || !signupPassword || !companyName || !country || !baseCurrency) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        title: "Validation Error", 
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const signUpData = {
      firstName,
      lastName,
      email: signupEmail,
      password: signupPassword,
      companyName,
      country,
      baseCurrency
    };
    
    const { error } = await signUp(signUpData);
    
    if (error) {
      toast({
        title: "Signup Failed",
        description: error,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in both password fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          currentPassword: loginPassword,
          newPassword: newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully!",
        });
        setShowPasswordChange(false);
        // Navigate to dashboard
        navigate("/");
      } else {
        toast({
          title: "Password Change Failed",
          description: data.message || "Failed to change password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-elevated mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ExpenseFlow</h1>
          <p className="text-white/80">Smart Expense Management</p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>{showPasswordChange ? "Change Password" : "Welcome to ExpenseFlow"}</CardTitle>
            <CardDescription>
              {showPasswordChange 
                ? "Please change your temporary password to continue" 
                : "Sign in to your account or create your company"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showPasswordChange ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Changing..." : "Change Password"}
                </Button>
              </form>
            ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@company.com" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input 
                        id="first-name" 
                        placeholder="John" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input 
                        id="last-name" 
                        placeholder="Doe" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="john@company.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required 
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input 
                      id="company-name" 
                      placeholder="Your Company Ltd."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="Singapore">Singapore</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Base Currency</Label>
                    <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                        <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                        <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Company..." : "Create Company & Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
