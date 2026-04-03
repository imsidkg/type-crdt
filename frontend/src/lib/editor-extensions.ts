import { StarterKit } from '@tiptap/starter-kit'
import { Collaboration } from '@tiptap/extension-collaboration'
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Underline } from '@tiptap/extension-underline'
import { Typography } from '@tiptap/extension-typography'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Highlight } from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import type { AnyExtension } from '@tiptap/core'
import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
import type { HocuspocusProvider } from '@hocuspocus/provider'

export interface EditorExtensionsOptions {
  ydoc: Y.Doc
  placeholder?: string
}

export interface SharedProviderRef {
  current: HocuspocusProvider | null
}

export function getEditorExtensions(
  {
    ydoc,
    placeholder = 'Start writing or type / for AI commands...',
  }: EditorExtensionsOptions,
  providerRef?: SharedProviderRef
): AnyExtension[] {
  const awareness = new Awareness(ydoc)
  awareness.setLocalStateField('user', { name: 'You', color: '#000000' })

  const stubProvider = {
    get awareness() {
      return providerRef?.current?.awareness ?? awareness
    },
    document: ydoc,
    setAwarenessField: (key: string, value: unknown) => {
      awareness.setLocalStateField(key, value)
    },
    on: () => {},
    off: () => {},
  }

  return [
    StarterKit.configure({
      underline: false,
      link: false,
      undoRedo: false,
    }),
    Collaboration.configure({
      document: ydoc,
    }),
    CollaborationCaret.configure({
      provider: stubProvider as any,
      user: {
        name: 'You',
        color: '#000000',
      },
    }),
    Placeholder.configure({
      placeholder,
    }),
    Underline,
    Typography,
    Link.configure({
      openOnClick: true,
      linkOnPaste: true,
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Highlight.configure({
      multicolor: true,
    }),
    TextStyle,
    Color,
  ]
}
