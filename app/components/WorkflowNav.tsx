'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { name: 'Upload', path: '/upload', number: 1 },
  { name: 'Procedure', path: '/procedure', number: 2 },
  { name: 'Questions', path: '/questions', number: 3 },
];

export default function WorkflowNav() {
  const pathname = usePathname();
  const router = useRouter();

  const currentStepIndex = steps.findIndex(step => step.path === pathname);
  const currentStep = steps[currentStepIndex];
  const prevStep = steps[currentStepIndex - 1];
  const nextStep = steps[currentStepIndex + 1];

  // Don't show on non-workflow pages
  if (currentStepIndex === -1) return null;

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 py-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.path} className="flex items-center flex-1">
                <button
                  onClick={() => router.push(step.path)}
                  className={cn(
                    "flex items-center gap-2 transition-all",
                    pathname === step.path
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all",
                      pathname === step.path
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step.number}
                  </div>
                  <span className="hidden sm:inline">{step.name}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-2 rounded-full transition-all",
                      index < currentStepIndex ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <div>
            {prevStep ? (
              <Button
                onClick={() => router.push(prevStep.path)}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {prevStep.name}
              </Button>
            ) : (
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Home
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Step {currentStep.number} of {steps.length}
          </div>

          <div>
            {nextStep ? (
              <Button
                onClick={() => router.push(nextStep.path)}
                variant="default"
                size="sm"
              >
                {nextStep.name}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                size="sm"
              >
                Home
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
