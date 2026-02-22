import { ReactNode } from 'react';

const STEPS = [
  { label: 'Clínica', path: '/onboarding/clinic' },
  { label: 'Médico', path: '/onboarding/doctor' },
  { label: 'Horario', path: '/onboarding/schedule' },
  { label: 'Confirmación', path: '/onboarding/summary' },
];

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number; // 1-4
}

export default function OnboardingLayout({ children, currentStep }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-xl font-bold text-foreground">Agenda Médica</span>
          <span className="text-muted-foreground text-sm">— Configuración inicial</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isDone = stepNumber < currentStep;

              return (
                <div key={step.label} className="flex items-center gap-2">
                  {index > 0 && (
                    <div className={`h-px w-6 ${isDone ? 'bg-primary' : 'bg-border'}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isDone
                          ? 'bg-primary text-primary-foreground'
                          : isActive
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isDone ? '✓' : stepNumber}
                    </div>
                    <span
                      className={`text-sm hidden sm:block ${
                        isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
