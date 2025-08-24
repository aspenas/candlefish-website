import * as React from 'react'
import { useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  showLineNumbers?: boolean
  highlightLines?: number[]
  className?: string
}

export function CodeBlock({
  code,
  language = 'javascript',
  title,
  showLineNumbers = true,
  highlightLines = [],
  className
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  return (
    <div className={cn('relative group', className)}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white text-sm font-medium border-b border-slate-700 rounded-t-lg">
          <span>{title}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-6 px-2 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      )}
      
      {/* Code */}
      <div className="relative">
        <Highlight
          theme={themes.oneDark}
          code={code.trim()}
          language={language}
        >
          {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn(
                highlightClassName,
                'p-4 overflow-x-auto text-sm',
                title ? 'rounded-b-lg' : 'rounded-lg',
                'bg-slate-900'
              )}
              style={style}
            >
              {tokens.map((line, i) => {
                const lineNumber = i + 1
                const isHighlighted = highlightLines.includes(lineNumber)
                
                return (
                  <div
                    key={i}
                    {...getLineProps({ line, key: i })}
                    className={cn(
                      'flex',
                      isHighlighted && 'bg-amber-500/10 border-l-2 border-amber-500 pl-2 ml-[-1rem] pr-2 mr-[-1rem]'
                    )}
                  >
                    {showLineNumbers && (
                      <span className="inline-block w-8 text-right text-slate-500 select-none mr-4 flex-shrink-0">
                        {lineNumber}
                      </span>
                    )}
                    <span className="flex-1">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token, key })} />
                      ))}
                    </span>
                  </div>
                )
              })}
            </pre>
          )}
        </Highlight>
        
        {/* Copy button */}
        {!title && (
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="absolute top-2 right-2 h-8 px-2 bg-slate-800/80 backdrop-blur-sm text-slate-300 hover:text-white hover:bg-slate-700/80 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}