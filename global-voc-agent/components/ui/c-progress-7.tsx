import { Progress } from "@/components/ui/progress";
import { CircleCheckIcon, CircleIcon } from "lucide-react";

export interface VocProgressStep {
  label: string;
  completed: boolean;
  active?: boolean;
}

const defaultSteps: VocProgressStep[] = [
  { label: "출처 서버 연결 및 세션 초기화", completed: true },
  { label: "선택 출처 리뷰 본문 및 댓글 추출", completed: true },
  { label: "AI 한국어 핵심 요약 및 감성 분석", completed: false, active: true },
  { label: "데이터 정제 및 14개 스키마 매핑", completed: false },
];

interface PatternProps {
  steps?: VocProgressStep[];
  progressValue?: number;
}

export default function Pattern({ steps = defaultSteps, progressValue }: PatternProps) {
  const completedSteps = steps.filter((s) => s.completed).length;
  const calculatedProgress = progressValue ?? (completedSteps / steps.length) * 100;

  return (
    <div className="mx-auto w-full max-w-sm space-y-4 p-5 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">수집 및 AI 분석 진행</span>
        <span className="text-muted-foreground text-xs font-medium">
          {completedSteps} of {steps.length} steps ({Math.round(calculatedProgress)}%)
        </span>
      </div>
      <Progress value={calculatedProgress} className="h-2.5" />
      <div className="flex flex-col gap-2.5 pt-1">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2.5 text-sm">
            {step.completed ? (
              <CircleCheckIcon
                className="text-emerald-500 size-4 shrink-0"
                aria-hidden="true"
              />
            ) : step.active ? (
              <div className="size-4 shrink-0 flex items-center justify-center">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                </span>
              </div>
            ) : (
              <CircleIcon
                className="text-muted-foreground/40 size-4 shrink-0"
                aria-hidden="true"
              />
            )}
            <span
              className={
                step.completed 
                  ? "text-foreground font-medium" 
                  : step.active 
                  ? "text-primary font-semibold" 
                  : "text-muted-foreground/60"
              }
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
