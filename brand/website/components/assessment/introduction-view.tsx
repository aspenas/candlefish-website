import { motion } from 'framer-motion'

interface IntroductionViewProps {
  onBegin: () => void
}

export const IntroductionView = ({ onBegin }: IntroductionViewProps) => (
  <motion.section
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="max-w-4xl mx-auto px-6 pt-32"
  >
    <header className="mb-16">
      <h1 className="text-6xl md:text-7xl font-light text-[#F8F8F2] mb-8 leading-[0.9]">
        Operational Maturity
        <span className="block text-[#3FD3C6]">Assessment</span>
      </h1>

      <p className="text-xl text-[#E0E1DD] font-light leading-relaxed max-w-3xl">
        A 14-dimension diagnostic that reveals where your operations truly stand.
        Not where you hope they are. Where they are.
      </p>
    </header>

    <div className="grid md:grid-cols-2 gap-12 mb-16">
      <div>
        <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">
          What This Reveals
        </h2>
        <ul className="space-y-3 text-xl text-[#415A77]">
          <li className="flex items-start">
            <span className="text-[#3FD3C6] mr-3">→</span>
            <span>Your operational maturity across 14 critical dimensions</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#3FD3C6] mr-3">→</span>
            <span>Specific intervention points for maximum impact</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#3FD3C6] mr-3">→</span>
            <span>How you compare to similar operations</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#3FD3C6] mr-3">→</span>
            <span>Your readiness for systematic transformation</span>
          </li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">
          How This Works
        </h2>
        <ul className="space-y-3 text-xl text-[#415A77]">
          <li className="flex items-start">
            <span className="text-[#3FD3C6] mr-3">1.</span>
            <span>Answer 14 situational questions (10 minutes)</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#3FD3C6] mr-3">2.</span>
            <span>Receive your Operational Portrait</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#3FD3C6] mr-3">3.</span>
            <span>Get specific intervention recommendations</span>
          </li>
          <li className="flex items-start">
            <span className="text-[#3FD3C6] mr-3">4.</span>
            <span>Download detailed analysis (PDF)</span>
          </li>
        </ul>
      </div>
    </div>

    <div className="bg-[#1C1C1C] p-8 mb-12">
      <p className="text-sm text-[#415A77] leading-relaxed">
        <span className="text-[#3FD3C6] font-medium">Note:</span> This assessment provides
        genuine diagnostic value regardless of whether you engage Candlefish. We believe
        in demonstrating competence through utility, not promises.
      </p>
    </div>

    <button
      onClick={onBegin}
      className="group relative overflow-hidden bg-[#1B263B] border border-[#415A77]
               px-12 py-6 text-[#E0E1DD] hover:border-[#3FD3C6] transition-all duration-500"
    >
      <span className="relative z-10 text-lg">Begin Assessment</span>
      <div className="absolute inset-0 bg-gradient-to-r from-[#3FD3C6]/0 to-[#3FD3C6]/10
                    translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
    </button>

    <p className="mt-6 text-xs text-[#415A77]">
      Your responses are stored securely and never shared.
      Assessment ID will be generated for your reference.
    </p>
  </motion.section>
)
