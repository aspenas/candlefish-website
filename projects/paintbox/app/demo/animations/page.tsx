"use client";

import React from "react";
import { InteractiveButton, RippleEffect } from "@/components/ui/MicroInteractions";
import {
  ValidationMessage,
  ValidatedField,
  ValidationSteps,
  SuccessOverlay,
  InlineValidation
} from "@/components/ui/FormValidationAnimations";
import { PerformanceOverlay } from "@/components/ui/PerformanceMonitor";
import { useSwipeNavigation, useLongPress, useDoubleTap } from "@/hooks/useTabletGestures";
import { usePrefersReducedMotion } from "@/lib/utils/accessibility";
import { Card } from "@/components/ui/card";

export default function AnimationsDemo() {
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [isValidating, setIsValidating] = React.useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Demo sections
  const sections = [
    { title: "Micro Interactions", id: "micro" },
    { title: "Form Validation", id: "validation" },
    { title: "Touch Gestures", id: "gestures" },
    { title: "Performance", id: "performance" },
  ];

  // Swipe navigation demo
  const [currentSection, setCurrentSection] = React.useState(0);
  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => setCurrentSection((prev) => Math.min(prev + 1, sections.length - 1)),
    onSwipeRight: () => setCurrentSection((prev) => Math.max(prev - 1, 0)),
  });

  // Long press demo
  const longPressHandlers = useLongPress(() => {
    alert("Long press detected!");
  });

  // Double tap demo
  const doubleTapHandlers = useDoubleTap(() => {
    setShowSuccess(true);
  });

  // Email validation
  const validateEmail = (value: string) => {
    setEmail(value);
    setEmailError("");

    if (value) {
      setIsValidating(true);
      setTimeout(() => {
        if (!value.includes("@")) {
          setEmailError("Please enter a valid email address");
        }
        setIsValidating(false);
      }, 1000);
    }
  };

  const validationSteps = [
    { label: "Basic Info", completed: true },
    { label: "Measurements", completed: true, current: true },
    { label: "Pricing", completed: false },
    { label: "Review", completed: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PerformanceOverlay show={true} />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Eggshell Animation Showcase
        </h1>

        <div className="grid gap-8">
          {sections.map((section) => (
            <Card key={section.id} className="p-8">
              <h2 className="text-2xl font-semibold mb-6">{section.title}</h2>

              {section.id === "micro" && (
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-4">
                    <InteractiveButton>
                      Primary Button
                    </InteractiveButton>
                    <InteractiveButton className="bg-gray-600 hover:bg-gray-700">
                      Secondary Button
                    </InteractiveButton>
                    <InteractiveButton className="bg-transparent text-gray-700 hover:bg-gray-100">
                      Ghost Button
                    </InteractiveButton>
                  </div>

                  <div className="grid gap-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border rounded-md"
                        value={email}
                        onChange={(e) => validateEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                      {emailError && <InlineValidation error={emailError} />}
                    </div>
                  </div>

                  <div className="relative inline-block">
                    <InteractiveButton className="text-lg px-6 py-3">
                      Button with Ripple
                    </InteractiveButton>
                    <RippleEffect />
                  </div>
                </div>
              )}

              {section.id === "validation" && (
                <div className="space-y-6">
                  <ValidatedField
                    isValid={email.includes("@") && !emailError}
                  >
                    <input
                      type="email"
                      className="w-full p-3 outline-none"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => validateEmail(e.target.value)}
                    />
                  </ValidatedField>

                  <ValidationSteps steps={validationSteps} />

                  {isValidating && (
                    <ValidationMessage type="warning" message="Validating email..." />
                  )}
                  {emailError && (
                    <ValidationMessage type="error" message={emailError} />
                  )}
                  {email.includes("@") && !emailError && !isValidating && (
                    <ValidationMessage type="success" message="Email is valid!" />
                  )}
                </div>
              )}

              {section.id === "gestures" && (
                <div className="space-y-6">
                  <div
                    className="bg-purple-100 p-8 rounded-lg text-center cursor-move"
                    {...swipeHandlers.bind()}
                  >
                    <p className="text-lg font-medium">
                      Swipe left or right to navigate sections
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Current section: {currentSection + 1} / {sections.length}
                    </p>
                  </div>

                  <div
                    className="bg-blue-100 p-8 rounded-lg text-center cursor-pointer"
                    {...longPressHandlers}
                  >
                    <p className="text-lg font-medium">
                      Long press this area
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Hold for 500ms to trigger action
                    </p>
                  </div>

                  <div
                    className="bg-green-100 p-8 rounded-lg text-center cursor-pointer"
                    {...doubleTapHandlers}
                  >
                    <p className="text-lg font-medium">
                      Double tap for success
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Tap twice quickly
                    </p>
                  </div>
                </div>
              )}

              {section.id === "performance" && (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Check the performance monitor in the top right corner.
                    All animations are optimized for 60fps on tablets.
                  </p>
                  <p className="text-gray-600">
                    Features:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>CSS transitions for smooth animations</li>
                    <li>Touch-optimized gestures</li>
                    <li>Respects prefers-reduced-motion</li>
                    <li>Performance monitoring overlay</li>
                  </ul>
                  {prefersReducedMotion && (
                    <p className="text-amber-600 font-medium">
                      ⚠️ Reduced motion is enabled - animations are simplified
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <SuccessOverlay show={showSuccess} />
      {showSuccess && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuccess(false)}
        />
      )}
    </div>
  );
}
