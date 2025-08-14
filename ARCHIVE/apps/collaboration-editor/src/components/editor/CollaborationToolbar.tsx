'use client';

import { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Link,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Type,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCollaborationStore } from '@/stores/collaboration-store';
import { cn } from '@/lib/utils';

export function CollaborationToolbar() {
  const { isConnected, connectionQuality } = useCollaborationStore();
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  const handleFormatToggle = (format: string) => {
    const newFormats = new Set(activeFormats);
    if (newFormats.has(format)) {
      newFormats.delete(format);
    } else {
      newFormats.add(format);
    }
    setActiveFormats(newFormats);

    // In a real implementation, this would apply formatting to the editor
    console.log('Format toggled:', format);
  };

  const handleHeadingChange = (level: number) => {
    console.log('Heading level:', level);
  };

  return (
    <div className="flex items-center space-x-1 p-2 border-b bg-card">
      {/* Connection Status */}
      <div className="flex items-center space-x-2 mr-4">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-red-500'
        )} />
        <span className="text-xs text-muted-foreground">
          {isConnected ? `Connected (${connectionQuality})` : 'Disconnected'}
        </span>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => console.log('Undo')}
        disabled={!isConnected}
      >
        <Undo className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => console.log('Redo')}
        disabled={!isConnected}
      >
        <Redo className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Text Formatting */}
      <Button
        variant={activeFormats.has('bold') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleFormatToggle('bold')}
        disabled={!isConnected}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant={activeFormats.has('italic') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleFormatToggle('italic')}
        disabled={!isConnected}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant={activeFormats.has('underline') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleFormatToggle('underline')}
        disabled={!isConnected}
      >
        <Underline className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Headings */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={!isConnected}>
            <Type className="w-4 h-4 mr-1" />
            <span className="text-xs">Style</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleHeadingChange(0)}>
            Normal Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleHeadingChange(1)}>
            <span className="text-lg font-semibold">Heading 1</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleHeadingChange(2)}>
            <span className="text-base font-semibold">Heading 2</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleHeadingChange(3)}>
            <span className="text-sm font-semibold">Heading 3</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6" />

      {/* Lists */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => console.log('Bullet list')}
        disabled={!isConnected}
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => console.log('Numbered list')}
        disabled={!isConnected}
      >
        <ListOrdered className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Block Formatting */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => console.log('Quote')}
        disabled={!isConnected}
      >
        <Quote className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => console.log('Code block')}
        disabled={!isConnected}
      >
        <Code className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => console.log('Insert link')}
        disabled={!isConnected}
      >
        <Link className="w-4 h-4" />
      </Button>

      {/* Text Color */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={!isConnected}>
            <Palette className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="p-2">
            <div className="grid grid-cols-6 gap-1">
              {[
                '#000000', '#374151', '#DC2626', '#EA580C',
                '#D97706', '#65A30D', '#059669', '#0891B2',
                '#2563EB', '#7C3AED', '#DB2777', '#E11D48'
              ].map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => console.log('Color:', color)}
                />
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
