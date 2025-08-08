import React from 'react'

const AIAnimation: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Glow Effect */}
      <div
        className="absolute inset-0 bg-gradient-radial from-teal-400/50 via-teal-400/20 to-transparent blur-3xl opacity-50"
        style={{
          animation: 'glow 4s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate'
        }}
      ></div>

      {/* AI Brain Container */}
      <div className="relative w-80 h-80">
        {/* Neural Nodes */}
        <div
          className="neural-node absolute w-5 h-5 bg-teal-400 rounded-full shadow-lg shadow-teal-400/40 top-1/5 left-1/2 transform -translate-x-1/2"
          style={{
            animation: 'pulse-node 2s ease-in-out infinite 0s'
          }}
        ></div>

        <div
          className="neural-node absolute w-5 h-5 bg-teal-400 rounded-full shadow-lg shadow-teal-400/40 top-1/2 left-1/5 transform -translate-y-1/2"
          style={{
            animation: 'pulse-node-left 2s ease-in-out infinite 0.4s'
          }}
        ></div>

        <div
          className="neural-node absolute w-5 h-5 bg-teal-400 rounded-full shadow-lg shadow-teal-400/40 top-1/2 right-1/5 transform -translate-y-1/2"
          style={{
            animation: 'pulse-node-right 2s ease-in-out infinite 0.8s'
          }}
        ></div>

        <div
          className="neural-node absolute w-5 h-5 bg-teal-400 rounded-full shadow-lg shadow-teal-400/40 bottom-[30%] left-[30%]"
          style={{
            animation: 'pulse-node 2s ease-in-out infinite 1.2s'
          }}
        ></div>

        <div
          className="neural-node absolute w-5 h-5 bg-teal-400 rounded-full shadow-lg shadow-teal-400/40 bottom-[30%] right-[30%]"
          style={{
            animation: 'pulse-node 2s ease-in-out infinite 1.6s'
          }}
        ></div>

        {/* Neural Connections */}
        <div
          className="neural-connection absolute h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-60 top-[35%] left-[30%] w-2/5 transform rotate-[15deg]"
          style={{
            animation: 'pulse-connection 3s ease-in-out infinite 0.5s'
          }}
        ></div>

        <div
          className="neural-connection absolute h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-60 top-[55%] left-1/4 w-1/2 transform -rotate-[20deg]"
          style={{
            animation: 'pulse-connection 3s ease-in-out infinite 1s'
          }}
        ></div>

        <div
          className="neural-connection absolute h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-60 bottom-[40%] left-[35%] w-[30%] transform rotate-45"
          style={{
            animation: 'pulse-connection 3s ease-in-out infinite 1.5s'
          }}
        ></div>
      </div>

    </div>
  )
}

export default AIAnimation
