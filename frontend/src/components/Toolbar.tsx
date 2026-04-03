import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import type { UndoState } from '@/hooks/useEditorWithCollaboration'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Table as TableIcon,
  CheckSquare,
  Highlighter,
} from 'lucide-react'

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  tooltip?: string
}

function ToolbarButton({ onClick, isActive, disabled, children, tooltip }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return <div className="mx-1 h-6 w-px bg-border" />
}

export function Toolbar({ editor, undoState }: { editor: Editor | null; undoState?: UndoState }) {
  if (!editor) return null

  const actions = [
    {
      icon: <Heading1 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
      tooltip: 'Heading 1',
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
      tooltip: 'Heading 2',
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive('heading', { level: 3 }),
      tooltip: 'Heading 3',
    },
  ]

  const formatActions = [
    {
      icon: <Bold className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
      tooltip: 'Bold (⌘B)',
    },
    {
      icon: <Italic className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
      tooltip: 'Italic (⌘I)',
    },
    {
      icon: <UnderlineIcon className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive('underline'),
      tooltip: 'Underline (⌘U)',
    },
    {
      icon: <Strikethrough className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive('strike'),
      tooltip: 'Strikethrough',
    },
    {
      icon: <Highlighter className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleHighlight().run(),
      active: editor.isActive('highlight'),
      tooltip: 'Highlight',
    },
  ]

  const listActions = [
    {
      icon: <List className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
      tooltip: 'Bullet List',
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
      tooltip: 'Numbered List',
    },
    {
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleTaskList().run(),
      active: editor.isActive('taskList'),
      tooltip: 'Task List',
    },
  ]

  const blockActions = [
    {
      icon: <Quote className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
      tooltip: 'Blockquote',
    },
    {
      icon: <Code className="h-4 w-4" />,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: editor.isActive('codeBlock'),
      tooltip: 'Code Block',
    },
    {
      icon: <TableIcon className="h-4 w-4" />,
      action: () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      active: editor.isActive('table'),
      tooltip: 'Insert Table',
    },
  ]

  return (
    <div className="sticky top-0 z-40 flex items-center gap-0.5 border-b bg-background/80 px-2 py-1 backdrop-blur-sm">
      <div className="flex items-center gap-0.5">
        {actions.map((a, i) => (
          <ToolbarButton key={i} onClick={a.action} isActive={a.active} tooltip={a.tooltip}>
            {a.icon}
          </ToolbarButton>
        ))}
      </div>

      <ToolbarSeparator />

      <div className="flex items-center gap-0.5">
        {formatActions.map((a, i) => (
          <ToolbarButton key={i} onClick={a.action} isActive={a.active} tooltip={a.tooltip}>
            {a.icon}
          </ToolbarButton>
        ))}
      </div>

      <ToolbarSeparator />

      <div className="flex items-center gap-0.5">
        {listActions.map((a, i) => (
          <ToolbarButton key={i} onClick={a.action} isActive={a.active} tooltip={a.tooltip}>
            {a.icon}
          </ToolbarButton>
        ))}
      </div>

      <ToolbarSeparator />

      <div className="flex items-center gap-0.5">
        {blockActions.map((a, i) => (
          <ToolbarButton key={i} onClick={a.action} isActive={a.active} tooltip={a.tooltip}>
            {a.icon}
          </ToolbarButton>
        ))}
      </div>

      <ToolbarSeparator />

      <div className="flex items-center gap-0.5">
        <div className="relative">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={undoState ? undoState.undoCount === 0 : !editor.can().undo()}
            tooltip="Undo my changes (⌘Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          {undoState && undoState.undoCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-medium text-primary-foreground">
              {undoState.undoCount}
            </span>
          )}
        </div>
        <div className="relative">
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={undoState ? undoState.redoCount === 0 : !editor.can().redo()}
            tooltip="Redo my changes (⌘⇧Z)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
          {undoState && undoState.redoCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-medium text-primary-foreground">
              {undoState.redoCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
