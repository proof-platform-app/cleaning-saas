import { useState } from "react";
import { Check, Camera, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Sample job data for a cleaner
const sampleJob = {
  id: "job-001",
  location: "Marina Heights Tower",
  address: "Dubai Marina, Tower A, Floor 12, Unit 1205",
  scheduledTime: "09:00 AM - 12:00 PM",
  scheduledDate: "Today, January 15",
  checklist: [
    { id: "1", task: "Vacuum all floors and carpets" },
    { id: "2", task: "Mop hard floor surfaces" },
    { id: "3", task: "Clean and sanitize bathrooms" },
    { id: "4", task: "Wipe down kitchen surfaces" },
    { id: "5", task: "Empty all trash bins" },
    { id: "6", task: "Dust furniture and fixtures" },
  ],
};

type JobStatus = "not_started" | "in_progress" | "completed";

interface StepState {
  checkIn: { completed: boolean; time?: string };
  beforePhoto: { completed: boolean; photoUrl?: string };
  checklist: { completed: boolean; items: Record<string, boolean> };
  afterPhoto: { completed: boolean; photoUrl?: string };
  checkOut: { completed: boolean; time?: string };
}

const CleanerJob = () => {
  const [steps, setSteps] = useState<StepState>({
    checkIn: { completed: false },
    beforePhoto: { completed: false },
    checklist: { 
      completed: false, 
      items: Object.fromEntries(sampleJob.checklist.map(item => [item.id, false]))
    },
    afterPhoto: { completed: false },
    checkOut: { completed: false },
  });

  const getJobStatus = (): JobStatus => {
    if (steps.checkOut.completed) return "completed";
    if (steps.checkIn.completed) return "in_progress";
    return "not_started";
  };

  const handleCheckIn = () => {
    setSteps(prev => ({
      ...prev,
      checkIn: { completed: true, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) }
    }));
  };

  const handleBeforePhoto = () => {
    // Simulate photo capture
    setSteps(prev => ({
      ...prev,
      beforePhoto: { completed: true, photoUrl: "/placeholder.svg" }
    }));
  };

  const handleChecklistItem = (itemId: string, checked: boolean) => {
    setSteps(prev => {
      const newItems = { ...prev.checklist.items, [itemId]: checked };
      const allCompleted = Object.values(newItems).every(v => v);
      return {
        ...prev,
        checklist: { completed: allCompleted, items: newItems }
      };
    });
  };

  const handleAfterPhoto = () => {
    // Simulate photo capture
    setSteps(prev => ({
      ...prev,
      afterPhoto: { completed: true, photoUrl: "/placeholder.svg" }
    }));
  };

  const handleCheckOut = () => {
    setSteps(prev => ({
      ...prev,
      checkOut: { completed: true, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) }
    }));
  };

  const jobStatus = getJobStatus();

  const StatusBadge = () => {
    const statusConfig = {
      not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
      in_progress: { label: "In Progress", className: "bg-status-progress/10 text-status-progress" },
      completed: { label: "Completed", className: "bg-status-completed/10 text-status-completed" },
    };
    const config = statusConfig[jobStatus];
    return (
      <span className={cn("px-3 py-1.5 rounded-full text-sm font-medium", config.className)}>
        {config.label}
      </span>
    );
  };

  const StepIndicator = ({ completed, active }: { completed: boolean; active: boolean }) => (
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
      completed ? "bg-status-completed text-white" : 
      active ? "bg-primary text-white" : 
      "bg-muted text-muted-foreground"
    )}>
      {completed ? <Check className="w-5 h-5" /> : null}
    </div>
  );

  const StepCard = ({ 
    stepNumber, 
    title, 
    completed, 
    active, 
    disabled, 
    children 
  }: { 
    stepNumber: number;
    title: string;
    completed: boolean;
    active: boolean;
    disabled: boolean;
    children: React.ReactNode;
  }) => (
    <div className={cn(
      "bg-white rounded-2xl p-5 shadow-soft transition-all",
      disabled && "opacity-50",
      completed && "border-2 border-status-completed/30"
    )}>
      <div className="flex items-center gap-4 mb-4">
        <StepIndicator completed={completed} active={active} />
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Step {stepNumber}</p>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        {completed && (
          <CheckCircle2 className="w-6 h-6 text-status-completed ml-auto" />
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Job Header */}
      <header className="bg-white border-b border-border/50 sticky top-0 z-10">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-foreground">Your Job</h1>
            <StatusBadge />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">{sampleJob.location}</p>
                <p className="text-sm text-muted-foreground">{sampleJob.address}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-foreground">{sampleJob.scheduledTime}</p>
                <p className="text-sm text-muted-foreground">{sampleJob.scheduledDate}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Steps */}
      <main className="p-5 space-y-4 pb-8">
        {/* Step 1: Check-in */}
        <StepCard
          stepNumber={1}
          title="Check In"
          completed={steps.checkIn.completed}
          active={!steps.checkIn.completed}
          disabled={false}
        >
          {steps.checkIn.completed ? (
            <div className="bg-status-completed/5 rounded-xl p-4">
              <p className="text-status-completed font-medium">Checked in at {steps.checkIn.time}</p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">Tap when you arrive at the location</p>
              <Button 
                onClick={handleCheckIn}
                className="w-full h-14 text-lg font-semibold rounded-xl"
              >
                Check In
              </Button>
            </>
          )}
        </StepCard>

        {/* Step 2: Before Photo */}
        <StepCard
          stepNumber={2}
          title="Before Photo"
          completed={steps.beforePhoto.completed}
          active={steps.checkIn.completed && !steps.beforePhoto.completed}
          disabled={!steps.checkIn.completed}
        >
          {steps.beforePhoto.completed ? (
            <div className="bg-status-completed/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-status-completed font-medium">Photo captured</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">Take a photo of the space before you start cleaning</p>
              <Button 
                onClick={handleBeforePhoto}
                disabled={!steps.checkIn.completed}
                className="w-full h-14 text-lg font-semibold rounded-xl"
              >
                <Camera className="w-6 h-6 mr-2" />
                Take Before Photo
              </Button>
            </>
          )}
        </StepCard>

        {/* Step 3: Checklist */}
        <StepCard
          stepNumber={3}
          title="Cleaning Checklist"
          completed={steps.checklist.completed}
          active={steps.beforePhoto.completed && !steps.checklist.completed}
          disabled={!steps.beforePhoto.completed}
        >
          <p className="text-muted-foreground mb-4">Complete all tasks before continuing</p>
          <div className="space-y-3">
            {sampleJob.checklist.map((item) => (
              <label
                key={item.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer",
                  steps.checklist.items[item.id] 
                    ? "border-status-completed/30 bg-status-completed/5" 
                    : "border-border bg-white",
                  !steps.beforePhoto.completed && "pointer-events-none opacity-50"
                )}
              >
                <Checkbox
                  checked={steps.checklist.items[item.id]}
                  onCheckedChange={(checked) => handleChecklistItem(item.id, checked as boolean)}
                  disabled={!steps.beforePhoto.completed}
                  className="w-6 h-6 rounded-md"
                />
                <span className={cn(
                  "text-base font-medium flex-1",
                  steps.checklist.items[item.id] && "text-muted-foreground line-through"
                )}>
                  {item.task}
                </span>
                {steps.checklist.items[item.id] && (
                  <Check className="w-5 h-5 text-status-completed" />
                )}
              </label>
            ))}
          </div>
        </StepCard>

        {/* Step 4: After Photo */}
        <StepCard
          stepNumber={4}
          title="After Photo"
          completed={steps.afterPhoto.completed}
          active={steps.checklist.completed && !steps.afterPhoto.completed}
          disabled={!steps.checklist.completed}
        >
          {steps.afterPhoto.completed ? (
            <div className="bg-status-completed/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-status-completed font-medium">Photo captured</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">Take a photo of the space after cleaning</p>
              <Button 
                onClick={handleAfterPhoto}
                disabled={!steps.checklist.completed}
                className="w-full h-14 text-lg font-semibold rounded-xl"
              >
                <Camera className="w-6 h-6 mr-2" />
                Take After Photo
              </Button>
            </>
          )}
        </StepCard>

        {/* Step 5: Check-out */}
        <StepCard
          stepNumber={5}
          title="Check Out"
          completed={steps.checkOut.completed}
          active={steps.afterPhoto.completed && !steps.checkOut.completed}
          disabled={!steps.afterPhoto.completed}
        >
          {steps.checkOut.completed ? (
            <div className="bg-status-completed/5 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-status-completed mx-auto mb-3" />
              <p className="text-status-completed font-semibold text-lg">Job Completed!</p>
              <p className="text-muted-foreground mt-1">Checked out at {steps.checkOut.time}</p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">Tap when you finish the job</p>
              <Button 
                onClick={handleCheckOut}
                disabled={!steps.afterPhoto.completed}
                className="w-full h-14 text-lg font-semibold rounded-xl"
              >
                Check Out
              </Button>
            </>
          )}
        </StepCard>
      </main>
    </div>
  );
};

export default CleanerJob;
