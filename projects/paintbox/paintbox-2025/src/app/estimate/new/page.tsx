"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StepKey = "details" | "interior" | "exterior" | "review" | "success";
const steps: StepKey[] = ["details", "interior", "exterior", "review", "success"];

export default function NewEstimate() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  return (
    <main className="min-h-screen mx-auto max-w-4xl px-6 py-12">
      <nav className="mb-6 text-sm text-[--color-muted]" aria-label="Breadcrumb">
        <ol className="flex gap-2 flex-wrap">
          {steps.map((s, i) => (
            <li key={s} className={i === stepIndex ? "text-[--color-foreground]" : undefined}>
              {s}
              {i < steps.length - 1 && <span className="mx-2 opacity-50">/</span>}
            </li>
          ))}
        </ol>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 230, damping: 22 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{step}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-[--color-muted]">Stub content for {step} step.</p>
              <div className="flex gap-3">
                <Button
                  variant="subtle"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                >
                  Back
                </Button>
                <Button onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}>
                  {stepIndex === steps.length - 1 ? "Finish" : "Next"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
