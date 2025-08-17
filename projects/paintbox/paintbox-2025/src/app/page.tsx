"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <Header />
      <div className="absolute inset-0 opacity-30">
        <div className="brand-stripe h-1" />
      </div>

      <section className="relative mx-auto max-w-6xl px-6 md:px-8 pt-24 pb-16">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="text-4xl md:text-6xl font-semibold tracking-tight text-[--color-foreground]"
        >
          Paintbox 2025
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 220, damping: 24 }}
          className="mt-4 max-w-2xl text-[--color-muted]"
        >
          Calm, durable, human‑in‑loop estimation. Temporal‑backed workflows, buttery motion, and brand‑first UI.
        </motion.p>
        <div className="mt-8 flex gap-3">
          <Button>New Estimate</Button>
          <Button variant="subtle">Learn more</Button>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 md:px-8 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {["Measure", "Price", "Sync"].map((title, idx) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * idx, type: "spring", stiffness: 230, damping: 22 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                Durable steps with retries, visibility in Temporal Web, and human approvals.
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>
      <Footer />
    </main>
  );
}
