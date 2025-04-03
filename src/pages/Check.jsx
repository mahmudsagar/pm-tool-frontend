import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/AuthContext";

const Check = () => {
  const { logout, user } = useAuth();
  const [email, setEmail] = useState("");
  const [daysLeft, setDaysLeft] = useState(30);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Simple countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setDaysLeft(prev => prev > 0 ? prev - 1 : 30);
    }, 86400000); // Update every day
    
    return () => clearInterval(timer);
  }, []);
  
  const handleNotifyMe = () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Thank you!",
      description: "We'll notify you when our calendar is ready!"
    });
    setEmail("");
  };
  
  const handleDateClick = (day) => {
    setSelectedDate(day);
    toast({
      title: `Date ${day} selected`,
      description: "Calendar functionality coming soon!"
    });
  };
  
  // Generate a simple preview calendar grid
  const renderCalendarPreview = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    
    return (
      <div className="grid grid-cols-7 gap-2 mt-6 max-w-md mx-auto">
        {["S", "M", "T", "W", "T", "F", "S"].map(day => (
          <div key={day} className="text-center font-medium text-sm text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map(day => (
          <Button
            key={day}
            variant={selectedDate === day ? "default" : "outline"}
            size="sm"
            className="h-10 w-10 p-0 font-normal"
            onClick={() => handleDateClick(day)}
          >
            {day}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <section className="w-full flex flex-col items-center justify-center gap-4 text-center py-12 px-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex justify-center mb-4">
            <Calendar size={48} className="text-primary animate-pulse" />
          </div>
          <CardTitle className="text-4xl font-bold">Calendar Coming Soon</CardTitle>
          <CardDescription className="text-lg">
            We're building a powerful calendar system to help you organize your workflow
          </CardDescription>
          <Badge variant="outline" className="mx-auto mt-2">
            Launching in {daysLeft} days
          </Badge>
        </CardHeader>
        
        <CardContent>
          {renderCalendarPreview()}
          
          <div className="flex items-center gap-2 mt-8">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleNotifyMe}>
              Notify Me
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-4">
          <Button variant="outline" asChild>
            <a href='/'>{'← Back to Home'}</a>
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Logged in as {user?.email}
            </span>
            <Button variant="destructive" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </CardFooter>
      </Card>
      <Toaster />
    </section>
  );
};

export default Check;