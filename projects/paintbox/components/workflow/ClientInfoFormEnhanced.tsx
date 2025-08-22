"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  useSpring,
  useTrail,
  animated,
  config,
  useSpringRef,
  useChain,
  useTransition,
} from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import {
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Check,
  X,
  AlertCircle,
  Building,
  Home,
  Sparkles,
} from "lucide-react";
import { CustomerSearch } from "@/components/ui/CustomerSearchFull";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { EstimatorDropdown } from "@/components/ui/EstimatorDropdown";
import { Button } from "@/components/ui/Button";
import { useEstimateStore } from "@/stores/useEstimateStore";
import { trackFormInteraction } from "@/lib/monitoring/logrocket";
import { cn } from "@/lib/utils/cn";

interface ClientInfoFormEnhancedProps {
  onNext: () => void;
}

export const ClientInfoFormEnhanced: React.FC<ClientInfoFormEnhancedProps> = ({
  onNext,
}) => {
  const { estimate, updateClientInfo, markStepCompleted } = useEstimateStore();
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({
    clientName: estimate.clientInfo?.clientName || "",
    bestPhone: estimate.clientInfo?.bestPhone || "",
    bestEmail: estimate.clientInfo?.bestEmail || "",
    address: estimate.clientInfo?.address || "",
    city: estimate.clientInfo?.city || "",
    state: estimate.clientInfo?.state || "",
    zipCode: estimate.clientInfo?.zipCode || "",
    estimator: estimate.clientInfo?.estimator || "",
    estimatorPhone: estimate.clientInfo?.estimatorPhone || "",
    estimatorEmail: estimate.clientInfo?.estimatorEmail || "",
    salesforceId: estimate.clientInfo?.salesforceId || "",
    salesforceType: estimate.clientInfo?.salesforceType || "",
  });

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [currentSection, setCurrentSection] = useState<
    "client" | "address" | "estimator"
  >("client");
  const [showSuccess, setShowSuccess] = useState(false);

  // Animation refs
  const headerRef = useSpringRef();
  const searchRef = useSpringRef();
  const sectionTabsRef = useSpringRef();
  const formFieldsRef = useSpringRef();
  const actionsRef = useSpringRef();

  // Check if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Demo estimators
  const ESTIMATOR_OPTIONS = [
    {
      value: "john-martinez",
      label: "John Martinez",
      description: "john.martinez@paintbox.com • 555-0101",
    },
    {
      value: "sarah-johnson",
      label: "Sarah Johnson",
      description: "sarah.johnson@paintbox.com • 555-0102",
    },
    {
      value: "michael-chen",
      label: "Michael Chen",
      description: "michael.chen@paintbox.com • 555-0103",
    },
    {
      value: "emily-rodriguez",
      label: "Emily Rodriguez",
      description: "emily.rodriguez@paintbox.com • 555-0104",
    },
    {
      value: "david-thompson",
      label: "David Thompson",
      description: "david.thompson@paintbox.com • 555-0105",
    },
    {
      value: "jessica-lee",
      label: "Jessica Lee",
      description: "jessica.lee@paintbox.com • 555-0106",
    },
    {
      value: "robert-anderson",
      label: "Robert Anderson",
      description: "robert.anderson@paintbox.com • 555-0107",
    },
    {
      value: "maria-garcia",
      label: "Maria Garcia",
      description: "maria.garcia@paintbox.com • 555-0108",
    },
    {
      value: "james-wilson",
      label: "James Wilson",
      description: "james.wilson@paintbox.com • 555-0109",
    },
    {
      value: "ashley-davis",
      label: "Ashley Davis",
      description: "ashley.davis@paintbox.com • 555-0110",
    },
  ];

  const estimatorData = {
    "john-martinez": { email: "john.martinez@paintbox.com", phone: "555-0101" },
    "sarah-johnson": { email: "sarah.johnson@paintbox.com", phone: "555-0102" },
    "michael-chen": { email: "michael.chen@paintbox.com", phone: "555-0103" },
    "emily-rodriguez": {
      email: "emily.rodriguez@paintbox.com",
      phone: "555-0104",
    },
    "david-thompson": {
      email: "david.thompson@paintbox.com",
      phone: "555-0105",
    },
    "jessica-lee": { email: "jessica.lee@paintbox.com", phone: "555-0106" },
    "robert-anderson": {
      email: "robert.anderson@paintbox.com",
      phone: "555-0107",
    },
    "maria-garcia": { email: "maria.garcia@paintbox.com", phone: "555-0108" },
    "james-wilson": { email: "james.wilson@paintbox.com", phone: "555-0109" },
    "ashley-davis": { email: "ashley.davis@paintbox.com", phone: "555-0110" },
  };

  // Handle customer selection from search
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setIsNewCustomer(false);

    // Auto-populate form with customer data
    const updatedData = {
      ...formData, // Keep existing data (especially estimator info)
      // Override with customer data
      clientName: customer.name || "",
      bestPhone: customer.phone || customer.mobile || "",
      bestEmail: customer.email || "",
      address: customer.address?.street || "",
      city: customer.address?.city || "",
      state: customer.address?.state || "",
      zipCode: customer.address?.zip || "",
      salesforceId: customer.id,
      salesforceType: customer.type,
    };

    setFormData(updatedData);
    updateClientInfo(updatedData);

    // Clear any validation errors since we have new data
    setErrors({});
    setTouched({});

    trackFormInteraction("client-info-form", "customer-selected", {
      customerId: customer.id,
      customerType: customer.type,
    });
  };

  // Handle clearing customer selection
  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setIsNewCustomer(true);

    // Clear Salesforce-specific fields but keep other data
    const updatedData = {
      ...formData,
      salesforceId: "",
      salesforceType: "",
    };

    setFormData(updatedData);
    updateClientInfo(updatedData);

    trackFormInteraction("client-info-form", "customer-cleared");
  };

  // Handle form field changes
  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Handle field blur for validation
  const handleFieldBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData]);
  };

  // Field validation with shake animation
  const validateField = (field: string, value: string) => {
    let error = "";

    switch (field) {
      case "clientName":
        if (!value.trim()) error = "Client name is required";
        break;
      case "bestPhone":
        if (!value.trim()) error = "Phone number is required";
        else if (!/^\d{3}-?\d{3}-?\d{4}$/.test(value.replace(/\s/g, ""))) {
          error = "Invalid phone format";
        }
        break;
      case "bestEmail":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Invalid email format";
        }
        break;
      case "address":
        if (!value.trim()) error = "Address is required";
        break;
      case "estimator":
        if (!value.trim()) error = "Estimator name is required";
        break;
    }

    if (error && !prefersReducedMotion) {
      // Trigger shake animation for error
      shakeApi.start({
        x: 0,
        from: { x: -10 },
        reset: true,
        loop: { times: 2 },
      });
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  // Validate entire form
  const validateForm = () => {
    const requiredFields = ["clientName", "bestPhone", "address", "estimator"];
    let isValid = true;

    requiredFields.forEach((field) => {
      const value = formData[field as keyof typeof formData];
      if (!validateField(field, value)) {
        isValid = false;
        setTouched((prev) => ({ ...prev, [field]: true }));
      }
    });

    return isValid;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) {
      trackFormInteraction("client-info-form", "validation-failed");
      return;
    }

    updateClientInfo(formData);
    markStepCompleted("client-info");
    trackFormInteraction("client-info-form", "complete", formData);
    onNext();
  };

  // Header animation
  const headerSpring = useSpring({
    ref: headerRef,
    from: { opacity: 0, transform: "translateY(-30px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: prefersReducedMotion ? { duration: 0 } : config.gentle,
  });

  // Search box animation
  const searchSpring = useSpring({
    ref: searchRef,
    from: { opacity: 0, transform: "scale(0.95)" },
    to: { opacity: 1, transform: "scale(1)" },
    config: prefersReducedMotion ? { duration: 0 } : config.wobbly,
  });

  // Progress calculation
  const requiredFields = ["clientName", "bestPhone", "address", "estimator"];
  const filledRequiredFields = requiredFields.filter(
    (field) => formData[field as keyof typeof formData]?.trim(),
  );
  const progress = (filledRequiredFields.length / requiredFields.length) * 100;

  // Progress bar animation
  const progressSpring = useSpring({
    width: `${progress}%`,
    backgroundColor:
      progress === 100 ? "rgb(34, 197, 94)" : "rgb(168, 85, 247)",
    config: prefersReducedMotion ? { duration: 0 } : config.molasses,
  });

  // Section tabs animation
  const sectionTabsSpring = useSpring({
    ref: sectionTabsRef,
    from: { opacity: 0, transform: "translateX(-20px)" },
    to: { opacity: 1, transform: "translateX(0px)" },
    config: prefersReducedMotion ? { duration: 0 } : config.gentle,
  });

  // Form fields animation based on current section
  const getFieldsForSection = () => {
    switch (currentSection) {
      case "client":
        return ["clientName", "bestPhone", "bestEmail"];
      case "address":
        return ["address", "city", "state", "zipCode"];
      case "estimator":
        return ["estimator", "estimatorPhone", "estimatorEmail"];
      default:
        return [];
    }
  };

  const sectionFields = getFieldsForSection();
  const fieldTrail = useTrail(sectionFields.length, {
    ref: formFieldsRef,
    from: { opacity: 0, transform: "translateX(-40px)" },
    to: { opacity: 1, transform: "translateX(0px)" },
    config: prefersReducedMotion
      ? { duration: 0 }
      : { ...config.gentle, tension: 300, friction: 25 },
  });

  // Actions animation
  const actionsSpring = useSpring({
    ref: actionsRef,
    from: { opacity: 0, transform: "translateY(20px)" },
    to: { opacity: 1, transform: "translateY(0px)" },
    config: prefersReducedMotion ? { duration: 0 } : config.gentle,
  });

  // Chain animations for smooth orchestration
  useChain(
    [headerRef, searchRef, sectionTabsRef, formFieldsRef, actionsRef],
    [0, 0.1, 0.2, 0.3, 0.6],
  );

  // Success animation
  const successSpring = useSpring({
    opacity: showSuccess ? 1 : 0,
    transform: showSuccess
      ? "scale(1) rotate(0deg)"
      : "scale(0.3) rotate(-180deg)",
    config: prefersReducedMotion ? { duration: 0 } : config.wobbly,
  });

  // Field shake animation for errors
  const [shakeX, shakeApi] = useSpring(() => ({
    x: 0,
    config: { tension: 300, friction: 10 },
  }));

  // Selected customer card animation
  const customerSelectedSpring = useSpring({
    opacity: selectedCustomer ? 1 : 0,
    transform: selectedCustomer
      ? "translateY(0px) scale(1)"
      : "translateY(-10px) scale(0.95)",
    config: prefersReducedMotion ? { duration: 0 } : config.gentle,
  });

  // Gesture handling for tablet swipe navigation
  const bind = useDrag(
    ({ direction: [dx], velocity: [vx], cancel }) => {
      if (Math.abs(vx) > 0.2) {
        const sections: Array<"client" | "address" | "estimator"> = [
          "client",
          "address",
          "estimator",
        ];
        const currentIndex = sections.indexOf(currentSection);

        if (dx > 0 && currentIndex > 0) {
          setCurrentSection(sections[currentIndex - 1]);
          cancel();
        } else if (dx < 0 && currentIndex < sections.length - 1) {
          setCurrentSection(sections[currentIndex + 1]);
          cancel();
        }
      }
    },
    {
      axis: "x",
      filterTaps: true,
      enabled: !prefersReducedMotion,
    },
  );

  // Selected customer card
  const SelectedCustomerCard = () => {
    if (!selectedCustomer) return null;

    return (
      <animated.div
        style={customerSelectedSpring}
        className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
              {selectedCustomer.type === "account" ? (
                <Briefcase className="w-5 h-5 text-purple-600" />
              ) : (
                <User className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {selectedCustomer.name}
              </p>
              <p className="text-sm text-gray-600">
                Salesforce {selectedCustomer.type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
            <button
              onClick={handleClearCustomer}
              className="text-gray-500 hover:text-red-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </animated.div>
    );
  };

  // Section Tab Component
  const SectionTab = ({
    section,
    label,
    icon: Icon,
    isActive,
  }: {
    section: "client" | "address" | "estimator";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
  }) => {
    const tabSpring = useSpring({
      backgroundColor: isActive ? "rgb(168, 85, 247)" : "transparent",
      color: isActive ? "white" : "rgb(107, 114, 128)",
      transform: isActive ? "scale(1.05)" : "scale(1)",
      config: prefersReducedMotion ? { duration: 0 } : config.gentle,
    });

    return (
      <animated.button
        type="button"
        onClick={() => setCurrentSection(section)}
        style={tabSpring}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
      >
        <Icon className="w-4 h-4" />
        {label}
      </animated.button>
    );
  };

  return (
    <div {...bind()}>
      <div className="max-w-4xl mx-auto">
        {/* Animated Header */}
        <animated.div style={headerSpring}>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Client Information
          </h2>
          <p className="text-gray-600 mb-4">
            Search for an existing customer or create a new one
          </p>
        </animated.div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <animated.div
              style={progressSpring}
              className="h-full rounded-full transition-colors"
            />
          </div>
          <animated.p
            style={useSpring({
              opacity: progress > 0 ? 1 : 0,
              config: prefersReducedMotion ? { duration: 0 } : config.gentle,
            })}
            className="text-xs text-gray-500 mt-1"
          >
            {Math.round(progress)}% complete
          </animated.p>
        </div>

        {/* Customer Search with Animation */}
        <animated.div style={searchSpring} className="mb-8">
          <CustomerSearch
            onSelectCustomer={handleCustomerSelect}
            onCreateNew={() => {
              setIsNewCustomer(true);
              setSelectedCustomer(null);
              trackFormInteraction("client-info-form", "create-new-customer");
            }}
          />
        </animated.div>

        {/* Selected Customer Card */}
        <SelectedCustomerCard />

        {/* Section Tabs */}
        <animated.div
          style={sectionTabsSpring}
          className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6"
        >
          <SectionTab
            section="client"
            label="Client Details"
            icon={User}
            isActive={currentSection === "client"}
          />
          <SectionTab
            section="address"
            label="Property Address"
            icon={Home}
            isActive={currentSection === "address"}
          />
          <SectionTab
            section="estimator"
            label="Estimator Info"
            icon={Briefcase}
            isActive={currentSection === "estimator"}
          />
        </animated.div>

        {/* Form Fields with Dynamic Animations */}
        <animated.div style={shakeX} className="space-y-6">
          {/* Client Details Section */}
          {currentSection === "client" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />
                Client Details
                <animated.div style={successSpring}>
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </animated.div>
              </h3>
              <div className="space-y-4">
                {fieldTrail.map((style, index) => {
                  const fieldName = sectionFields[index];
                  const fieldConfig = {
                    clientName: {
                      label: "Client Name",
                      type: "text",
                      icon: User,
                      required: true,
                    },
                    bestPhone: {
                      label: "Best Phone",
                      type: "tel",
                      icon: Phone,
                      required: true,
                      placeholder: "555-555-5555",
                    },
                    bestEmail: {
                      label: "Best Email",
                      type: "email",
                      icon: Mail,
                      required: false,
                      placeholder: "client@example.com",
                    },
                  }[fieldName];

                  if (!fieldConfig) return null;

                  return (
                    <animated.div key={fieldName} style={style}>
                      <FloatingInput
                        label={fieldConfig.label}
                        type={fieldConfig.type}
                        value={formData[fieldName as keyof typeof formData]}
                        onChange={(e) =>
                          handleFieldChange(fieldName, e.target.value)
                        }
                        onBlur={() => handleFieldBlur(fieldName)}
                        error={
                          touched[fieldName] ? errors[fieldName] : undefined
                        }
                        icon={<fieldConfig.icon className="w-5 h-5" />}
                        placeholder={fieldConfig.placeholder}
                        required={fieldConfig.required}
                      />
                    </animated.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Address Section */}
          {currentSection === "address" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Property Address
                <animated.div style={successSpring}>
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </animated.div>
              </h3>
              <div className="space-y-4">
                {fieldTrail.map((style, index) => {
                  const fieldName = sectionFields[index];

                  if (fieldName === "address") {
                    return (
                      <animated.div key={fieldName} style={style}>
                        <FloatingInput
                          label="Street Address"
                          value={formData.address}
                          onChange={(e) =>
                            handleFieldChange("address", e.target.value)
                          }
                          onBlur={() => handleFieldBlur("address")}
                          error={touched.address ? errors.address : undefined}
                          icon={<MapPin className="w-5 h-5" />}
                          required
                        />
                      </animated.div>
                    );
                  }

                  if (["city", "state", "zipCode"].includes(fieldName)) {
                    const fieldConfig = {
                      city: { label: "City", icon: Building },
                      state: {
                        label: "State",
                        icon: Building,
                        placeholder: "CA",
                      },
                      zipCode: {
                        label: "ZIP Code",
                        icon: MapPin,
                        placeholder: "12345",
                      },
                    }[fieldName];

                    return (
                      <animated.div
                        key={fieldName}
                        style={style}
                        className={fieldName === "city" ? "md:col-span-2" : ""}
                      >
                        <FloatingInput
                          label={fieldConfig!.label}
                          value={formData[fieldName as keyof typeof formData]}
                          onChange={(e) =>
                            handleFieldChange(fieldName, e.target.value)
                          }
                          icon={
                            fieldConfig ? (
                              <fieldConfig.icon className="w-5 h-5" />
                            ) : undefined
                          }
                          placeholder={fieldConfig!.placeholder}
                        />
                      </animated.div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}

          {/* Estimator Section */}
          {currentSection === "estimator" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                Estimator Information
                <animated.div style={successSpring}>
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </animated.div>
              </h3>
              <div className="space-y-4">
                {fieldTrail.map((style, index) => {
                  const fieldName = sectionFields[index];

                  if (fieldName === "estimator") {
                    return (
                      <animated.div key={fieldName} style={style}>
                        <EstimatorDropdown
                          value={{
                            name: formData.estimator,
                            email: formData.estimatorEmail,
                            phone: formData.estimatorPhone,
                          }}
                          onChange={(estimator) => {
                            setFormData((prev) => ({
                              ...prev,
                              estimator: estimator.name,
                              estimatorEmail: estimator.email,
                              estimatorPhone: estimator.phone,
                            }));
                            updateClientInfo({
                              estimator: estimator.name,
                              estimatorEmail: estimator.email,
                              estimatorPhone: estimator.phone,
                            });
                            if (errors.estimator) {
                              setErrors((prev) => ({ ...prev, estimator: "" }));
                            }
                          }}
                          error={
                            touched.estimator ? errors.estimator : undefined
                          }
                          required
                        />
                      </animated.div>
                    );
                  }

                  return null;
                })}

                {/* Show selected estimator details with animation */}
                {formData.estimator && (
                  <animated.div
                    style={useSpring({
                      from: { opacity: 0, height: 0 },
                      to: { opacity: 1, height: "auto" },
                      config: prefersReducedMotion
                        ? { duration: 0 }
                        : config.gentle,
                    })}
                    className="mt-2 p-3 bg-gray-50 rounded-lg"
                  >
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span>{" "}
                      {formData.estimatorPhone}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span>{" "}
                      {formData.estimatorEmail}
                    </p>
                  </animated.div>
                )}
              </div>
            </div>
          )}
        </animated.div>

        {/* Form Actions with Animation */}
        <animated.div
          style={actionsSpring}
          className="flex justify-end mt-8 pt-6 border-t border-gray-200"
        >
          <Button
            variant="aurora"
            size="lg"
            onClick={handleSubmit}
            icon={<ChevronRight className="w-5 h-5" />}
            iconPosition="right"
          >
            Continue to Exterior
          </Button>
        </animated.div>
      </div>
    </div>
  );
};
